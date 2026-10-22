import { Component, computed, inject, signal } from '@angular/core';
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
import { MatChipsModule, MatChipInputEvent } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import {
  DataTypeTemplate,
  FIELD_TYPE_LABELS,
  FieldDefinition,
  FieldType,
} from '../../models/list.models';
import { DataTypeService } from '../../services/data-type.service';
import { ListService } from '../../services/list.service';

export interface DataTypeDialogData {
  /** 'manage' shows all templates with create/edit/delete; 'create' or 'edit' opens the editor directly */
  mode: 'manage' | 'create' | 'edit';
  dataType?: DataTypeTemplate;
}

@Component({
  selector: 'app-data-type-dialog',
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
    MatChipsModule,
    MatDividerModule,
    MatListModule,
    MatCardModule,
    MatTooltipModule,
  ],
  templateUrl: './data-type-dialog.component.html',
  styleUrl: './data-type-dialog.component.css',
})
export class DataTypeDialogComponent {
  readonly dialogRef = inject(MatDialogRef<DataTypeDialogComponent>);
  readonly data = inject<DataTypeDialogData>(MAT_DIALOG_DATA);
  readonly dataTypeService = inject(DataTypeService);
  readonly listService = inject(ListService);

  readonly separatorKeysCodes = [ENTER, COMMA] as const;
  readonly fieldTypes: { value: FieldType; label: string }[] = (
    Object.keys(FIELD_TYPE_LABELS) as FieldType[]
  ).map((key) => ({
    value: key,
    label: FIELD_TYPE_LABELS[key],
  }));

  readonly viewMode = signal<'list' | 'form'>(
    this.data.mode === 'manage' ? 'list' : 'form'
  );
  readonly editingId = signal<string | null>(
    this.data.dataType?.id ?? null
  );

  readonly name = signal<string>(this.data.dataType?.name ?? '');
  readonly description = signal<string>(this.data.dataType?.description ?? '');
  readonly fields = signal<FieldDefinition[]>(
    this.data.dataType?.fields
      ? this.data.dataType.fields.map((f) => ({
          ...f,
          options: [...(f.options ?? [])],
          numericOptions: [...(f.numericOptions ?? [])],
        }))
      : [this.createEmptyField()]
  );

  readonly saving = signal<boolean>(false);
  readonly errorMsg = signal<string | null>(null);

  readonly isValid = computed<boolean>(() => {
    if (!this.name().trim()) return false;
    const currentFields = this.fields();
    if (currentFields.length === 0) return false;
    return currentFields.every((f) => f.label.trim().length > 0);
  });

  startCreateNew(): void {
    this.editingId.set(null);
    this.name.set('');
    this.description.set('');
    this.fields.set([this.createEmptyField()]);
    this.errorMsg.set(null);
    this.viewMode.set('form');
  }

  startEdit(dt: DataTypeTemplate): void {
    this.editingId.set(dt.id);
    this.name.set(dt.name);
    this.description.set(dt.description ?? '');
    this.fields.set(
      dt.fields.map((f) => ({
        ...f,
        options: [...(f.options ?? [])],
        numericOptions: [...(f.numericOptions ?? [])],
      }))
    );
    this.errorMsg.set(null);
    this.viewMode.set('form');
  }

  async deleteTemplate(dt: DataTypeTemplate): Promise<void> {
    try {
      await this.dataTypeService.deleteDataType(dt.id);
    } catch (err: unknown) {
      this.errorMsg.set(
        err instanceof Error ? err.message : 'Fehler beim Löschen.'
      );
    }
  }

  addField(): void {
    this.fields.update((list) => [...list, this.createEmptyField()]);
  }

  removeField(index: number): void {
    this.fields.update((list) => list.filter((_, i) => i !== index));
  }

  moveField(index: number, direction: -1 | 1): void {
    this.fields.update((list) => {
      const target = index + direction;
      if (target < 0 || target >= list.length) return list;
      const copy = [...list];
      const [item] = copy.splice(index, 1);
      copy.splice(target, 0, item);
      return copy;
    });
  }

  onFieldTypeChange(field: FieldDefinition, newType: FieldType): void {
    field.type = newType;
    if (newType === 'select_text' && !field.options) {
      field.options = [];
    }
    if (newType === 'select_number' && !field.numericOptions) {
      field.numericOptions = [];
    }
    if (newType === 'images' && field.multiple === undefined) {
      field.multiple = true;
    }
    this.fields.update((list) => [...list]);
  }

  addTextOption(field: FieldDefinition, event: MatChipInputEvent): void {
    const val = (event.value || '').trim();
    if (val) {
      field.options = [...(field.options ?? []), val];
      this.fields.update((list) => [...list]);
    }
    event.chipInput.clear();
  }

  removeTextOption(field: FieldDefinition, optIndex: number): void {
    field.options = (field.options ?? []).filter((_, i) => i !== optIndex);
    this.fields.update((list) => [...list]);
  }

  addNumericOption(field: FieldDefinition, event: MatChipInputEvent): void {
    const raw = (event.value || '').trim();
    const num = Number(raw);
    if (raw !== '' && !Number.isNaN(num)) {
      field.numericOptions = [...(field.numericOptions ?? []), num];
      this.fields.update((list) => [...list]);
    }
    event.chipInput.clear();
  }

  removeNumericOption(field: FieldDefinition, optIndex: number): void {
    field.numericOptions = (field.numericOptions ?? []).filter(
      (_, i) => i !== optIndex
    );
    this.fields.update((list) => [...list]);
  }

  getSourceListFields(sourceListId: string | null | undefined): FieldDefinition[] {
    if (!sourceListId) return [];
    const list = this.listService.lists().find((l) => l.id === sourceListId);
    if (!list?.dataTypeId) return [];
    const dt = this.dataTypeService.getById(list.dataTypeId);
    return dt?.fields ?? [];
  }

  async save(): Promise<void> {
    if (!this.isValid() || this.saving()) return;
    this.saving.set(true);
    this.errorMsg.set(null);

    try {
      const id = this.editingId();
      if (id) {
        await this.dataTypeService.updateDataType(id, {
          name: this.name(),
          description: this.description(),
          fields: this.fields(),
        });
        if (this.data.mode === 'manage') {
          this.viewMode.set('list');
        } else {
          this.dialogRef.close(id);
        }
      } else {
        const createdId = await this.dataTypeService.createDataType({
          name: this.name(),
          description: this.description(),
          fields: this.fields(),
        });
        if (this.data.mode === 'manage') {
          this.viewMode.set('list');
        } else {
          this.dialogRef.close(createdId);
        }
      }
    } catch (err: unknown) {
      this.errorMsg.set(
        err instanceof Error ? err.message : 'Fehler beim Speichern.'
      );
    } finally {
      this.saving.set(false);
    }
  }

  cancelForm(): void {
    if (this.data.mode === 'manage') {
      this.viewMode.set('list');
    } else {
      this.dialogRef.close(null);
    }
  }

  getFieldTypeLabel(type: FieldType): string {
    return FIELD_TYPE_LABELS[type] || type;
  }

  private createEmptyField(): FieldDefinition {
    return {
      id: `fld_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      label: '',
      type: 'text',
      required: false,
      autocomplete: false,
      autocompleteSourceListId: null,
      autocompleteSourceFieldId: null,
      options: [],
      numericOptions: [],
      multiple: false,
    };
  }
}
