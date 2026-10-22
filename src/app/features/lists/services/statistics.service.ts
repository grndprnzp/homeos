import { Injectable } from '@angular/core';
import {
  AggregationType,
  DataTypeTemplate,
  FieldDefinition,
  ListEntry,
  StatisticConfig,
  StatisticEvaluation,
  StatisticRowResult,
} from '../models/list.models';

export const SYSTEM_DIMENSION_FIELDS: { id: string; label: string }[] = [
  { id: '__createdAt_date__', label: 'Erstellungsdatum (Tag)' },
  { id: '__createdBy__', label: 'Ersteller' },
  { id: '__assignee__', label: 'Zuständige Person' },
];

export const ENTRY_COUNT_FIELD_ID = '__entry_count__';

@Injectable({
  providedIn: 'root',
})
export class StatisticsService {
  /**
   * Evaluates a single StatisticConfig against the provided list entries.
   */
  evaluateStatistic(
    config: StatisticConfig,
    entries: ListEntry[],
    dataType?: DataTypeTemplate | null
  ): StatisticEvaluation {
    const includeHidden = config.includeHidden ?? true;
    const filteredEntries = includeHidden
      ? entries
      : entries.filter((entry) => !entry.hidden);

    const fieldMap = new Map<string, FieldDefinition>();
    if (dataType?.fields) {
      for (const f of dataType.fields) {
        fieldMap.set(f.id, f);
      }
    }

    const dimensionLabels = config.dimensionFieldIds.map((dimId) =>
      this.getFieldLabel(dimId, fieldMap)
    );
    const valueLabel = this.getFieldLabel(config.valueFieldId, fieldMap);

    // Extract numeric values for overall total
    const allNumericValues: number[] = [];
    for (const entry of filteredEntries) {
      const val = this.extractNumericValue(entry, config.valueFieldId, config.aggregation);
      if (val !== null) {
        allNumericValues.push(val);
      }
    }

    const totalValue = this.aggregate(allNumericValues, config.aggregation);
    const totalCount = allNumericValues.length;

    if (!config.dimensionFieldIds || config.dimensionFieldIds.length === 0) {
      return {
        config,
        dimensionLabels: [],
        valueLabel,
        totalValue,
        totalCount,
        rows: [],
      };
    }

    // Group by 1..N dimensions
    const groups = new Map<
      string,
      { dimensionValues: string[]; numericValues: number[] }
    >();

    for (const entry of filteredEntries) {
      const numVal = this.extractNumericValue(entry, config.valueFieldId, config.aggregation);
      if (numVal === null) {
        continue;
      }

      const dimValues = config.dimensionFieldIds.map((dimId) =>
        this.extractDimensionLabel(entry, dimId, fieldMap.get(dimId))
      );
      const key = dimValues.join(' ‖ ');

      const existing = groups.get(key);
      if (existing) {
        existing.numericValues.push(numVal);
      } else {
        groups.set(key, {
          dimensionValues: dimValues,
          numericValues: [numVal],
        });
      }
    }

    const rawRows: Omit<StatisticRowResult, 'percentageOfMax'>[] = [];
    let maxAbsValue = 0;

    for (const [dimensionKey, group] of groups.entries()) {
      const value = this.aggregate(group.numericValues, config.aggregation);
      const absVal = Math.abs(value);
      if (absVal > maxAbsValue) {
        maxAbsValue = absVal;
      }
      rawRows.push({
        dimensionValues: group.dimensionValues,
        dimensionKey,
        value,
        count: group.numericValues.length,
      });
    }

    // Sort rows naturally by dimension values
    rawRows.sort((a, b) =>
      a.dimensionKey.localeCompare(b.dimensionKey, 'de', { numeric: true })
    );

    const rows: StatisticRowResult[] = rawRows.map((row) => ({
      ...row,
      percentageOfMax:
        maxAbsValue > 0
          ? Math.min(100, Math.round((Math.abs(row.value) / maxAbsValue) * 100))
          : 0,
    }));

    return {
      config,
      dimensionLabels,
      valueLabel,
      totalValue,
      totalCount,
      rows,
    };
  }

  getFieldLabel(fieldId: string, fieldMap: Map<string, FieldDefinition>): string {
    if (fieldId === ENTRY_COUNT_FIELD_ID) {
      return 'Einträge';
    }
    const sys = SYSTEM_DIMENSION_FIELDS.find((s) => s.id === fieldId);
    if (sys) {
      return sys.label;
    }
    return fieldMap.get(fieldId)?.label || fieldId;
  }

  private extractNumericValue(
    entry: ListEntry,
    valueFieldId: string,
    aggregation: AggregationType
  ): number | null {
    if (valueFieldId === ENTRY_COUNT_FIELD_ID) {
      return 1;
    }

    const raw = entry.values?.[valueFieldId];
    if (aggregation === 'count') {
      if (raw === undefined || raw === null || raw === '') {
        return null;
      }
      if (Array.isArray(raw)) {
        return raw.length > 0 ? 1 : null;
      }
      return 1;
    }

    if (raw === undefined || raw === null || raw === '') {
      return null;
    }

    if (typeof raw === 'number' && !Number.isNaN(raw)) {
      return raw;
    }

    if (typeof raw === 'boolean') {
      return raw ? 1 : 0;
    }

    if (Array.isArray(raw)) {
      const nums = raw
        .map((item) => Number(item))
        .filter((n) => !Number.isNaN(n));
      if (nums.length === 0) return null;
      return nums.reduce((acc, cur) => acc + cur, 0);
    }

    const parsed = Number(raw);
    return Number.isNaN(parsed) ? null : parsed;
  }

  private extractDimensionLabel(
    entry: ListEntry,
    dimensionFieldId: string,
    fieldDef?: FieldDefinition
  ): string {
    if (dimensionFieldId === '__createdAt_date__') {
      return this.formatDateIso(entry.createdAt);
    }
    if (dimensionFieldId === '__createdBy__') {
      return entry.createdBy || 'Unbekannt';
    }
    if (dimensionFieldId === '__assignee__') {
      return entry.assignee || 'Nicht zugewiesen';
    }

    const raw = entry.values?.[dimensionFieldId];
    if (raw === undefined || raw === null || raw === '') {
      return '—';
    }

    if (fieldDef?.type === 'checkbox' || typeof raw === 'boolean') {
      return raw ? 'Ja' : 'Nein';
    }

    if (Array.isArray(raw)) {
      return raw.length > 0 ? raw.map((v) => String(v)).join(', ') : '—';
    }

    if (raw instanceof Date) {
      return this.formatDateIso(raw);
    }

    return String(raw);
  }

  private formatDateIso(date: Date | unknown): string {
    if (date instanceof Date && !Number.isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return String(date ?? '—');
  }

  private aggregate(values: number[], aggregation: AggregationType): number {
    if (values.length === 0) {
      return 0;
    }

    switch (aggregation) {
      case 'count':
        return values.length;
      case 'sum':
        return this.round(values.reduce((acc, v) => acc + v, 0));
      case 'avg':
        return this.round(
          values.reduce((acc, v) => acc + v, 0) / values.length
        );
      case 'min':
        return this.round(Math.min(...values));
      case 'max':
        return this.round(Math.max(...values));
    }
  }

  private round(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
