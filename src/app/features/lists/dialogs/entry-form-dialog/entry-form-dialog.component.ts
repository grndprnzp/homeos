import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import {
  AttachmentMeta,
  DataTypeTemplate,
  FieldDefinition,
  ListDefinition,
  ListEntry,
} from '../../models/list.models';
import { DataTypeService } from '../../services/data-type.service';
import { ListService } from '../../services/list.service';

export interface EntryFormDialogData {
  list: ListDefinition;
  entry?: ListEntry;
  currentEntries: ListEntry[];
}

@Component({
  selector: 'app-entry-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatSlideToggleModule,
    MatAutocompleteModule,
    MatChipsModule,
    MatCardModule,
    MatProgressBarModule,
  ],
  templateUrl: './entry-form-dialog.component.html',
  styleUrl: './entry-form-dialog.component.css',
})
export class EntryFormDialogComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<EntryFormDialogComponent>);
  readonly data = inject<EntryFormDialogData>(MAT_DIALOG_DATA);
  readonly dataTypeService = inject(DataTypeService);
  readonly listService = inject(ListService);

  readonly isEdit = computed<boolean>(() => Boolean(this.data.entry));

  readonly selectedDataTypeId = signal<string | null>(
    this.data.list.mode === 'fixed'
      ? (this.data.list.dataTypeId ?? null)
      : (this.data.entry?.dataTypeId ?? null)
  );

  readonly activeDataType = computed<DataTypeTemplate | undefined>(() =>
    this.dataTypeService.getById(this.selectedDataTypeId())
  );

  readonly title = signal<string>(this.data.entry?.title ?? '');
  readonly assignee = signal<string>(this.data.entry?.assignee ?? '');
  readonly hidden = signal<boolean>(this.data.entry?.hidden ?? false);

  readonly values = signal<Record<string, unknown>>({
    ...(this.data.entry?.values ?? {}),
  });

  readonly existingAttachments = signal<AttachmentMeta[]>([
    ...(this.data.entry?.attachments ?? []),
  ]);

  /** Pending files selected per image field ID */
  readonly pendingFilesByField = signal<Record<string, File[]>>({});

  /** Cached autocomplete suggestions keyed by field.id */
  readonly autocompleteOptionsMap = signal<Record<string, string[]>>({});

  readonly saving = signal<boolean>(false);
  readonly errorMsg = signal<string | null>(null);

  readonly isValid = computed<boolean>(() => {
    const dt = this.activeDataType();
    if (!dt) {
      // Standard quick entry in mixed list requires a title
      return this.title().trim().length > 0;
    }

    const vals = this.values();
    for (const field of dt.fields) {
      if (field.required) {
        if (field.type === 'images') {
          const hasExisting = this.getAttachmentsForField(field.id).length > 0;
          const hasPending = this.getPendingFilesForField(field.id).length > 0;
          if (!hasExisting && !hasPending) return false;
        } else if (field.type === 'checkbox') {
          // Checkboxes are always valid boolean
          continue;
        } else {
          const v = vals[field.id];
          if (v === undefined || v === null || String(v).trim() === '') {
            return false;
          }
          if (Array.isArray(v) && v.length === 0) {
            return false;
          }
        }
      }
    }
    return true;
  });

  ngOnInit(): void {
    this.initializeDefaultFieldValues();
    void this.loadAutocompleteSuggestions();
  }

  onDataTypeSelectionChange(newId: string | null): void {
    this.selectedDataTypeId.set(newId);
    this.initializeDefaultFieldValues();
    void this.loadAutocompleteSuggestions();
  }

  setFieldValue(fieldId: string, value: unknown): void {
    this.values.update((curr) => ({
      ...curr,
      [fieldId]: value,
    }));
  }

  getFieldValue(fieldId: string): unknown {
    return this.values()[fieldId];
  }

  getFilteredAutocomplete(field: FieldDefinition): string[] {
    const all = this.autocompleteOptionsMap()[field.id] ?? [];
    const currentVal = String(this.values()[field.id] ?? '')
      .trim()
      .toLowerCase();
    if (!currentVal) return all;
    return all.filter((item) => item.toLowerCase().includes(currentVal));
  }

  getAttachmentsForField(fieldId: string): AttachmentMeta[] {
    return this.existingAttachments().filter((a) => a.fieldId === fieldId);
  }

  getPendingFilesForField(fieldId: string): File[] {
    return this.pendingFilesByField()[fieldId] ?? [];
  }

  onFilesSelected(field: FieldDefinition, event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const selected = Array.from(input.files);
    const allowMultiple = field.multiple ?? true;

    this.pendingFilesByField.update((curr) => {
      const prev = curr[field.id] ?? [];
      const next = allowMultiple ? [...prev, ...selected] : [selected[0]];
      return {
        ...curr,
        [field.id]: next,
      };
    });

    input.value = '';
  }

  removeExistingAttachment(attachmentId: string): void {
    this.existingAttachments.update((list) =>
      list.filter((a) => a.id !== attachmentId)
    );
  }

  removePendingFile(fieldId: string, index: number): void {
    this.pendingFilesByField.update((curr) => ({
      ...curr,
      [fieldId]: (curr[fieldId] ?? []).filter((_, i) => i !== index),
    }));
  }

  async save(): Promise<void> {
    if (!this.isValid() || this.saving()) return;
    this.saving.set(true);
    this.errorMsg.set(null);

    try {
      const listId = this.data.list.id;
      const entryId =
        this.data.entry?.id ?? this.listService.generateEntryId(listId);

      // Upload any pending files to Firebase Storage
      const newlyUploaded: AttachmentMeta[] = [];
      const pendingMap = this.pendingFilesByField();

      for (const [fieldId, files] of Object.entries(pendingMap)) {
        if (files && files.length > 0) {
          const uploaded = await this.listService.uploadEntryAttachments(
            listId,
            entryId,
            fieldId,
            files
          );
          newlyUploaded.push(...uploaded);
        }
      }

      const finalAttachments = [
        ...this.existingAttachments(),
        ...newlyUploaded,
      ];

      // Normalize numeric values
      const normalizedValues: Record<string, unknown> = { ...this.values() };
      const dt = this.activeDataType();
      if (dt) {
        for (const field of dt.fields) {
          if (field.type === 'number') {
            const raw = normalizedValues[field.id];
            if (raw !== undefined && raw !== null && raw !== '') {
              const num = Number(raw);
              normalizedValues[field.id] = Number.isNaN(num) ? null : num;
            } else {
              normalizedValues[field.id] = null;
            }
          } else if (field.type === 'images') {
            normalizedValues[field.id] = finalAttachments
              .filter((a) => a.fieldId === field.id)
              .map((a) => a.downloadUrl);
          }
        }
      }

      if (this.data.entry) {
        await this.listService.updateEntry(listId, entryId, {
          dataTypeId: this.selectedDataTypeId(),
          title: this.title() || null,
          assignee: this.assignee() || null,
          hidden: this.hidden(),
          values: normalizedValues,
          attachments: finalAttachments,
        });
      } else {
        await this.listService.createEntry(listId, {
          id: entryId,
          dataTypeId: this.selectedDataTypeId(),
          title: this.title() || null,
          assignee: this.assignee() || null,
          hidden: this.hidden(),
          values: normalizedValues,
          attachments: finalAttachments,
        });
      }

      this.dialogRef.close(entryId);
    } catch (err: unknown) {
      this.errorMsg.set(
        err instanceof Error ? err.message : 'Fehler beim Speichern des Eintrags.'
      );
    } finally {
      this.saving.set(false);
    }
  }

  private initializeDefaultFieldValues(): void {
    const dt = this.activeDataType();
    if (!dt) return;
    const current = { ...this.values() };
    for (const f of dt.fields) {
      if (current[f.id] === undefined) {
        if (f.type === 'checkbox') {
          current[f.id] = false;
        } else if (
          (f.type === 'select_text' || f.type === 'select_number') &&
          f.multiple
        ) {
          current[f.id] = [];
        } else {
          current[f.id] = '';
        }
      }
    }
    this.values.set(current);
  }

  private async loadAutocompleteSuggestions(): Promise<void> {
    const dt = this.activeDataType();
    if (!dt) return;

    const map: Record<string, string[]> = {};
    for (const field of dt.fields) {
      if (field.type !== 'text' || !field.autocomplete) continue;

      let sourceEntries = this.data.currentEntries;
      if (
        field.autocompleteSourceListId &&
        field.autocompleteSourceListId !== this.data.list.id
      ) {
        try {
          sourceEntries = await this.listService.getEntriesOnce(
            field.autocompleteSourceListId
          );
        } catch {
          sourceEntries = this.data.currentEntries;
        }
      }

      const targetFieldId = field.autocompleteSourceFieldId || field.id;
      const suggestions = new Set<string>();

      for (const entry of sourceEntries) {
        const val = entry.values?.[targetFieldId];
        if (typeof val === 'string' && val.trim()) {
          suggestions.add(val.trim());
        } else if (
          !field.autocompleteSourceFieldId &&
          entry.title &&
          entry.title.trim()
        ) {
          suggestions.add(entry.title.trim());
        }
      }

      map[field.id] = Array.from(suggestions).sort((a, b) =>
        a.localeCompare(b, 'de')
      );
    }

    this.autocompleteOptionsMap.set(map);
  }
}
