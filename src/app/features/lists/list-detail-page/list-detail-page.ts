import {
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import {
  AGGREGATION_LABELS,
  AggregationType,
  AttachmentMeta,
  DataTypeTemplate,
  FieldDefinition,
  ListDefinition,
  ListEntry,
  StatisticConfig,
  StatisticEvaluation,
} from '../models/list.models';
import { DataTypeService } from '../services/data-type.service';
import { ListService } from '../services/list.service';
import { StatisticsService } from '../services/statistics.service';
import {
  EntryFormDialogComponent,
  EntryFormDialogData,
} from '../dialogs/entry-form-dialog/entry-form-dialog.component';
import {
  StatisticFormDialogComponent,
  StatisticFormDialogData,
} from '../dialogs/statistic-form-dialog/statistic-form-dialog.component';
import {
  ListFormDialogComponent,
  ListFormDialogData,
} from '../dialogs/list-form-dialog/list-form-dialog.component';
import {
  ImagePreviewDialogComponent,
  ImagePreviewDialogData,
} from '../dialogs/image-preview-dialog/image-preview-dialog.component';

@Component({
  selector: 'app-list-detail-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatTableModule,
    MatCheckboxModule,
    MatSlideToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule,
    MatProgressBarModule,
    MatDialogModule,
    MatTooltipModule,
    MatDividerModule,
  ],
  templateUrl: './list-detail-page.html',
  styleUrl: './list-detail-page.css',
})
export class ListDetailPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly dialog = inject(MatDialog);

  readonly listService = inject(ListService);
  readonly dataTypeService = inject(DataTypeService);
  readonly statisticsService = inject(StatisticsService);

  private routeSub: Subscription | null = null;

  readonly listId = signal<string | null>(null);
  readonly entrySearchQuery = signal<string>('');
  readonly showHiddenEntries = signal<boolean>(false);
  readonly quickEntryTitle = signal<string>('');
  readonly addingQuickEntry = signal<boolean>(false);

  readonly isHandset = toSignal(
    this.breakpointObserver
      .observe([Breakpoints.Handset, Breakpoints.TabletPortrait])
      .pipe(map((res) => res.matches)),
    { initialValue: false }
  );

  readonly currentList = computed<ListDefinition | undefined>(() => {
    const id = this.listId();
    if (!id) return undefined;
    return this.listService.lists().find((l) => l.id === id);
  });

  readonly currentDataType = computed<DataTypeTemplate | undefined>(() => {
    const list = this.currentList();
    if (!list?.dataTypeId) return undefined;
    return this.dataTypeService.getById(list.dataTypeId);
  });

  readonly hiddenEntriesCount = computed<number>(
    () => this.listService.activeEntries().filter((e) => e.hidden).length
  );

  readonly visibleEntries = computed<ListEntry[]>(() => {
    const all = this.listService.activeEntries();
    const showHidden = this.showHiddenEntries();
    const query = this.entrySearchQuery().trim().toLowerCase();

    return all.filter((entry) => {
      if (!showHidden && entry.hidden) {
        return false;
      }
      if (query) {
        const valuesText = Object.values(entry.values ?? {})
          .map((v) => (Array.isArray(v) ? v.join(' ') : String(v ?? '')))
          .join(' ');
        const haystack = [
          entry.title ?? '',
          entry.createdBy ?? '',
          entry.assignee ?? '',
          valuesText,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(query)) {
          return false;
        }
      }
      return true;
    });
  });

  /** Dynamic columns for MatTable on desktop */
  readonly displayedColumns = computed<string[]>(() => {
    const list = this.currentList();
    const dt = this.currentDataType();
    if (list?.mode === 'fixed' && dt) {
      const fieldCols = dt.fields
        .filter((f) => f.type !== 'images')
        .map((f) => `fld_${f.id}`);
      return [
        'hidden',
        ...fieldCols,
        'attachments',
        'assignee',
        'createdBy',
        'createdAt',
        'actions',
      ];
    }
    return [
      'hidden',
      'title',
      'dataType',
      'dynamicValues',
      'attachments',
      'assignee',
      'createdBy',
      'createdAt',
      'actions',
    ];
  });

  readonly nonImageFields = computed<FieldDefinition[]>(() => {
    const dt = this.currentDataType();
    if (!dt) return [];
    return dt.fields.filter((f) => f.type !== 'images');
  });

  readonly evaluatedStatistics = computed<StatisticEvaluation[]>(() => {
    const list = this.currentList();
    if (!list) return [];
    const entries = this.listService.activeEntries();
    const dt = this.currentDataType();
    return (list.statistics ?? []).map((stat) =>
      this.statisticsService.evaluateStatistic(stat, entries, dt)
    );
  });

  readonly kpiStatistics = computed<StatisticEvaluation[]>(() =>
    this.evaluatedStatistics().filter(
      (ev) => ev.config.dimensionFieldIds.length === 0
    )
  );

  readonly dimensionalStatistics = computed<StatisticEvaluation[]>(() =>
    this.evaluatedStatistics().filter(
      (ev) => ev.config.dimensionFieldIds.length > 0
    )
  );

  ngOnInit(): void {
    this.routeSub = this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      this.listId.set(id);
      this.listService.watchEntriesForList(id);
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    this.listService.watchEntriesForList(null);
  }

  openEditList(): void {
    const list = this.currentList();
    if (!list) return;
    this.dialog.open<ListFormDialogComponent, ListFormDialogData>(
      ListFormDialogComponent,
      {
        width: '680px',
        maxWidth: '95vw',
        data: { list },
      }
    );
  }

  openCreateEntry(): void {
    const list = this.currentList();
    if (!list) return;
    this.dialog.open<EntryFormDialogComponent, EntryFormDialogData>(
      EntryFormDialogComponent,
      {
        width: '640px',
        maxWidth: '95vw',
        data: {
          list,
          currentEntries: this.listService.activeEntries(),
        },
      }
    );
  }

  openEditEntry(entry: ListEntry): void {
    const list = this.currentList();
    if (!list) return;
    this.dialog.open<EntryFormDialogComponent, EntryFormDialogData>(
      EntryFormDialogComponent,
      {
        width: '640px',
        maxWidth: '95vw',
        data: {
          list,
          entry,
          currentEntries: this.listService.activeEntries(),
        },
      }
    );
  }

  async addQuickEntry(): Promise<void> {
    const list = this.currentList();
    const text = this.quickEntryTitle().trim();
    if (!list || !text || this.addingQuickEntry()) return;

    this.addingQuickEntry.set(true);
    try {
      await this.listService.createEntry(list.id, {
        dataTypeId: list.mode === 'fixed' ? (list.dataTypeId ?? null) : null,
        title: text,
        hidden: false,
        values: {},
        attachments: [],
      });
      this.quickEntryTitle.set('');
    } finally {
      this.addingQuickEntry.set(false);
    }
  }

  async toggleHidden(entry: ListEntry): Promise<void> {
    const list = this.currentList();
    if (!list) return;
    await this.listService.toggleEntryHidden(
      list.id,
      entry.id,
      !entry.hidden
    );
  }

  async deleteEntry(entry: ListEntry): Promise<void> {
    const list = this.currentList();
    if (!list) return;
    await this.listService.deleteEntry(list.id, entry.id);
  }

  openImagePreview(attachments: AttachmentMeta[], index: number): void {
    this.dialog.open<ImagePreviewDialogComponent, ImagePreviewDialogData>(
      ImagePreviewDialogComponent,
      {
        width: '760px',
        maxWidth: '95vw',
        data: {
          attachments,
          initialIndex: index,
        },
      }
    );
  }

  openAddStatistic(): void {
    const list = this.currentList();
    if (!list) return;

    const ref = this.dialog.open<
      StatisticFormDialogComponent,
      StatisticFormDialogData,
      StatisticConfig | undefined
    >(StatisticFormDialogComponent, {
      width: '620px',
      maxWidth: '95vw',
      data: {
        dataType: this.currentDataType(),
      },
    });

    ref.afterClosed().subscribe(async (newStat) => {
      if (newStat) {
        const updated = [...(list.statistics ?? []), newStat];
        await this.listService.saveListStatistics(list.id, updated);
      }
    });
  }

  openEditStatistic(stat: StatisticConfig): void {
    const list = this.currentList();
    if (!list) return;

    const ref = this.dialog.open<
      StatisticFormDialogComponent,
      StatisticFormDialogData,
      StatisticConfig | undefined
    >(StatisticFormDialogComponent, {
      width: '620px',
      maxWidth: '95vw',
      data: {
        dataType: this.currentDataType(),
        statistic: stat,
      },
    });

    ref.afterClosed().subscribe(async (editedStat) => {
      if (editedStat) {
        const updated = (list.statistics ?? []).map((s) =>
          s.id === editedStat.id ? editedStat : s
        );
        await this.listService.saveListStatistics(list.id, updated);
      }
    });
  }

  async deleteStatistic(statId: string): Promise<void> {
    const list = this.currentList();
    if (!list) return;
    const updated = (list.statistics ?? []).filter((s) => s.id !== statId);
    await this.listService.saveListStatistics(list.id, updated);
  }

  formatFieldValue(entry: ListEntry, field: FieldDefinition): string {
    const raw = entry.values?.[field.id];
    if (raw === undefined || raw === null || raw === '') {
      return '—';
    }
    if (field.type === 'checkbox' || typeof raw === 'boolean') {
      return raw ? 'Ja' : 'Nein';
    }
    if (Array.isArray(raw)) {
      return raw.length > 0 ? raw.join(', ') : '—';
    }
    return String(raw);
  }

  getEntryFieldPairs(
    entry: ListEntry
  ): { label: string; value: string }[] {
    const dt =
      this.dataTypeService.getById(entry.dataTypeId) ??
      this.currentDataType();
    if (!dt) {
      return [];
    }
    return dt.fields
      .filter((f) => f.type !== 'images')
      .map((f) => ({
        label: f.label,
        value: this.formatFieldValue(entry, f),
      }))
      .filter((pair) => pair.value !== '—');
  }

  getEntryDataTypeName(entry: ListEntry): string {
    if (!entry.dataTypeId) return 'Standard-Eintrag';
    return (
      this.dataTypeService.getById(entry.dataTypeId)?.name ?? 'Datentyp'
    );
  }

  getAggregationLabel(agg: AggregationType): string {
    return AGGREGATION_LABELS[agg] ?? agg;
  }

  getStatTableColumns(ev: StatisticEvaluation): string[] {
    const dimCols = ev.dimensionLabels.map((_, idx) => `dim_${idx}`);
    return [...dimCols, 'value', 'count', 'share'];
  }
}
