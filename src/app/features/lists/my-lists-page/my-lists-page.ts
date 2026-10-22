import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../../core/services/auth.service';
import { AuthCardComponent } from '../../../shared/auth-card/auth-card.component';
import { ListDefinition } from '../models/list.models';
import { DataTypeService } from '../services/data-type.service';
import { ListService } from '../services/list.service';
import {
  DataTypeDialogComponent,
  DataTypeDialogData,
} from '../dialogs/data-type-dialog/data-type-dialog.component';
import {
  ListFormDialogComponent,
  ListFormDialogData,
} from '../dialogs/list-form-dialog/list-form-dialog.component';

export interface CategoryGroup {
  category: string;
  lists: ListDefinition[];
}

@Component({
  selector: 'app-my-lists-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatSlideToggleModule,
    MatProgressBarModule,
    MatDialogModule,
    MatTooltipModule,
    MatDividerModule,
    AuthCardComponent,
  ],
  templateUrl: './my-lists-page.html',
  styleUrl: './my-lists-page.css',
})
export class MyListsPage {
  readonly authService = inject(AuthService);
  readonly listService = inject(ListService);
  readonly dataTypeService = inject(DataTypeService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  readonly searchQuery = signal<string>('');
  readonly selectedCategory = signal<string>('');
  readonly selectedTag = signal<string>('');
  readonly groupByCategory = signal<boolean>(true);

  readonly filteredLists = computed<ListDefinition[]>(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const cat = this.selectedCategory();
    const tag = this.selectedTag();

    return this.listService.lists().filter((list) => {
      if (cat && (list.category || '') !== cat) {
        return false;
      }
      if (tag && !(list.tags ?? []).includes(tag)) {
        return false;
      }
      if (query) {
        const hay = [
          list.name,
          list.description ?? '',
          list.category ?? '',
          ...(list.tags ?? []),
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(query)) {
          return false;
        }
      }
      return true;
    });
  });

  readonly groupedLists = computed<CategoryGroup[]>(() => {
    const lists = this.filteredLists();
    if (!this.groupByCategory()) {
      return [{ category: 'Alle Listen', lists }];
    }

    const groupsMap = new Map<string, ListDefinition[]>();
    for (const list of lists) {
      const cat = list.category?.trim() || 'Ohne Kategorie';
      const existing = groupsMap.get(cat) ?? [];
      existing.push(list);
      groupsMap.set(cat, existing);
    }

    return Array.from(groupsMap.entries())
      .sort(([a], [b]) => a.localeCompare(b, 'de'))
      .map(([category, groupLists]) => ({
        category,
        lists: groupLists,
      }));
  });

  openManageDataTypes(): void {
    this.dialog.open<DataTypeDialogComponent, DataTypeDialogData>(
      DataTypeDialogComponent,
      {
        width: '740px',
        maxWidth: '95vw',
        data: { mode: 'manage' },
      }
    );
  }

  openCreateList(): void {
    const ref = this.dialog.open<
      ListFormDialogComponent,
      ListFormDialogData,
      string | null
    >(ListFormDialogComponent, {
      width: '680px',
      maxWidth: '95vw',
      data: {},
    });

    ref.afterClosed().subscribe((createdListId) => {
      if (createdListId) {
        void this.router.navigate(['/my-lists', createdListId]);
      }
    });
  }

  openEditList(list: ListDefinition, event: Event): void {
    event.stopPropagation();
    this.dialog.open<ListFormDialogComponent, ListFormDialogData>(
      ListFormDialogComponent,
      {
        width: '680px',
        maxWidth: '95vw',
        data: { list },
      }
    );
  }

  async deleteList(list: ListDefinition, event: Event): Promise<void> {
    event.stopPropagation();
    await this.listService.deleteList(list.id);
  }

  getDataTypeName(dataTypeId: string | null | undefined): string {
    if (!dataTypeId) return 'Kein Datentyp';
    return (
      this.dataTypeService.getById(dataTypeId)?.name ?? 'Gelöschte Vorlage'
    );
  }

  toggleTagFilter(tag: string): void {
    this.selectedTag.update((current) => (current === tag ? '' : tag));
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.selectedCategory.set('');
    this.selectedTag.set('');
  }
}
