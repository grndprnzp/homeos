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
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import {
  AGGREGATION_LABELS,
  AggregationType,
  DataTypeTemplate,
  StatisticConfig,
} from '../../models/list.models';
import {
  ENTRY_COUNT_FIELD_ID,
  SYSTEM_DIMENSION_FIELDS,
} from '../../services/statistics.service';

export interface StatisticFormDialogData {
  dataType?: DataTypeTemplate;
  statistic?: StatisticConfig;
}

@Component({
  selector: 'app-statistic-form-dialog',
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
    MatSlideToggleModule,
    MatChipsModule,
    MatCardModule,
  ],
  templateUrl: './statistic-form-dialog.component.html',
  styleUrl: './statistic-form-dialog.component.css',
})
export class StatisticFormDialogComponent {
  readonly dialogRef = inject(MatDialogRef<StatisticFormDialogComponent>);
  readonly data = inject<StatisticFormDialogData>(MAT_DIALOG_DATA);

  readonly aggregations: { value: AggregationType; label: string }[] = (
    Object.keys(AGGREGATION_LABELS) as AggregationType[]
  ).map((k) => ({
    value: k,
    label: AGGREGATION_LABELS[k],
  }));

  readonly name = signal<string>(this.data.statistic?.name ?? '');
  readonly aggregation = signal<AggregationType>(
    this.data.statistic?.aggregation ?? 'sum'
  );
  readonly valueFieldId = signal<string>(
    this.data.statistic?.valueFieldId ?? this.getDefaultValueFieldId()
  );
  readonly dimensionFieldIds = signal<string[]>([
    ...(this.data.statistic?.dimensionFieldIds ?? []),
  ]);
  readonly includeHidden = signal<boolean>(
    this.data.statistic?.includeHidden ?? true
  );

  readonly availableValueFields = computed<{ id: string; label: string }[]>(
    () => {
      const agg = this.aggregation();
      const dtFields = this.data.dataType?.fields ?? [];
      if (agg === 'count') {
        return [
          { id: ENTRY_COUNT_FIELD_ID, label: 'Alle Einträge (Gesamtanzahl)' },
          ...dtFields.map((f) => ({ id: f.id, label: f.label })),
        ];
      }

      const numericFields = dtFields.filter(
        (f) => f.type === 'number' || f.type === 'select_number'
      );
      if (numericFields.length > 0) {
        return numericFields.map((f) => ({ id: f.id, label: f.label }));
      }
      // Fallback: allow all fields + entry count if no numeric field exists
      return [
        { id: ENTRY_COUNT_FIELD_ID, label: 'Anzahl Einträge' },
        ...dtFields.map((f) => ({ id: f.id, label: f.label })),
      ];
    }
  );

  readonly availableDimensionFields = computed<{ id: string; label: string }[]>(
    () => {
      const dtFields = (this.data.dataType?.fields ?? []).map((f) => ({
        id: f.id,
        label: f.label,
      }));
      return [...dtFields, ...SYSTEM_DIMENSION_FIELDS];
    }
  );

  readonly isValid = computed<boolean>(
    () =>
      this.name().trim().length > 0 &&
      this.valueFieldId().trim().length > 0
  );

  onAggregationChange(newAgg: AggregationType): void {
    this.aggregation.set(newAgg);
    const validIds = this.availableValueFields().map((f) => f.id);
    if (!validIds.includes(this.valueFieldId())) {
      this.valueFieldId.set(validIds[0] ?? ENTRY_COUNT_FIELD_ID);
    }
  }

  addDimension(fieldId: string): void {
    if (!fieldId || this.dimensionFieldIds().includes(fieldId)) return;
    this.dimensionFieldIds.update((list) => [...list, fieldId]);
  }

  removeDimension(index: number): void {
    this.dimensionFieldIds.update((list) => list.filter((_, i) => i !== index));
  }

  moveDimension(index: number, dir: -1 | 1): void {
    this.dimensionFieldIds.update((list) => {
      const target = index + dir;
      if (target < 0 || target >= list.length) return list;
      const copy = [...list];
      const [item] = copy.splice(index, 1);
      copy.splice(target, 0, item);
      return copy;
    });
  }

  getDimensionLabel(id: string): string {
    return (
      this.availableDimensionFields().find((d) => d.id === id)?.label ?? id
    );
  }

  save(): void {
    if (!this.isValid()) return;
    const result: StatisticConfig = {
      id:
        this.data.statistic?.id ??
        `stat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: this.name().trim(),
      aggregation: this.aggregation(),
      valueFieldId: this.valueFieldId(),
      dimensionFieldIds: this.dimensionFieldIds(),
      includeHidden: this.includeHidden(),
    };
    this.dialogRef.close(result);
  }

  private getDefaultValueFieldId(): string {
    const dtFields = this.data.dataType?.fields ?? [];
    const firstNumeric = dtFields.find(
      (f) => f.type === 'number' || f.type === 'select_number'
    );
    return firstNumeric?.id ?? ENTRY_COUNT_FIELD_ID;
  }
}
