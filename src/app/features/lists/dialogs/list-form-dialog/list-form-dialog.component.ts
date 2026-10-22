import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatChipsModule, MatChipInputEvent } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { ListDefinition, ListMode } from '../../models/list.models';
import { DataTypeService } from '../../services/data-type.service';
import { ListService } from '../../services/list.service';
import {
  DataTypeDialogComponent,
  DataTypeDialogData,
} from '../data-type-dialog/data-type-dialog.component';

export interface ListFormDialogData {
  list?: ListDefinition;
}

@Component({
  selector: 'app-list-form-dialog',
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
    MatRadioModule,
    MatAutocompleteModule,
    MatChipsModule,
    MatCardModule,
  ],
  templateUrl: './list-form-dialog.component.html',
  styleUrl: './list-form-dialog.component.css',
})
export class ListFormDialogComponent {
  readonly dialogRef = inject(MatDialogRef<ListFormDialogComponent>);
  readonly data = inject<ListFormDialogData | null>(MAT_DIALOG_DATA, {
    optional: true,
  });
  private readonly dialog = inject(MatDialog);
  readonly listService = inject(ListService);
  readonly dataTypeService = inject(DataTypeService);

  readonly separatorKeysCodes = [ENTER, COMMA] as const;

  readonly isEdit = computed<boolean>(() => Boolean(this.data?.list));

  readonly name = signal<string>(this.data?.list?.name ?? '');
  readonly description = signal<string>(this.data?.list?.description ?? '');
  readonly category = signal<string>(this.data?.list?.category ?? '');
  readonly tags = signal<string[]>([...(this.data?.list?.tags ?? [])]);
  readonly mode = signal<ListMode>(this.data?.list?.mode ?? 'fixed');
  readonly dataTypeId = signal<string | null>(
    this.data?.list?.dataTypeId ?? null
  );

  readonly saving = signal<boolean>(false);
  readonly errorMsg = signal<string | null>(null);

  readonly filteredCategories = computed<string[]>(() => {
    const query = this.category().trim().toLowerCase();
    const all = this.listService.existingCategories();
    if (!query) return all;
    return all.filter((c) => c.toLowerCase().includes(query));
  });

  readonly isValid = computed<boolean>(() => {
    if (!this.name().trim()) return false;
    if (this.mode() === 'fixed' && !this.dataTypeId()) return false;
    return true;
  });

  addTag(event: MatChipInputEvent): void {
    const val = (event.value || '').trim();
    if (val && !this.tags().includes(val)) {
      this.tags.update((t) => [...t, val]);
    }
    event.chipInput.clear();
  }

  removeTag(index: number): void {
    this.tags.update((t) => t.filter((_, i) => i !== index));
  }

  openCreateDataTypeDialog(): void {
    const ref = this.dialog.open<
      DataTypeDialogComponent,
      DataTypeDialogData,
      string | null
    >(DataTypeDialogComponent, {
      width: '740px',
      maxWidth: '95vw',
      data: { mode: 'create' },
    });

    ref.afterClosed().subscribe((createdId) => {
      if (createdId) {
        this.dataTypeId.set(createdId);
      }
    });
  }

  async save(): Promise<void> {
    if (!this.isValid() || this.saving()) return;
    this.saving.set(true);
    this.errorMsg.set(null);

    try {
      const existing = this.data?.list;
      if (existing) {
        await this.listService.updateList(existing.id, {
          name: this.name(),
          description: this.description(),
          category: this.category(),
          tags: this.tags(),
          dataTypeId:
            this.mode() === 'fixed' ? this.dataTypeId() : null,
        });
        this.dialogRef.close(existing.id);
      } else {
        const newId = await this.listService.createList({
          name: this.name(),
          description: this.description(),
          category: this.category(),
          tags: this.tags(),
          mode: this.mode(),
          dataTypeId:
            this.mode() === 'fixed' ? this.dataTypeId() : null,
          statistics: [],
        });
        this.dialogRef.close(newId);
      }
    } catch (err: unknown) {
      this.errorMsg.set(
        err instanceof Error ? err.message : 'Fehler beim Speichern der Liste.'
      );
    } finally {
      this.saving.set(false);
    }
  }
}
