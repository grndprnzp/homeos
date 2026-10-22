export type FieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'time'
  | 'datetime'
  | 'checkbox'
  | 'select_text'
  | 'select_number'
  | 'images';

export interface FieldDefinition {
  id: string;
  label: string;
  type: FieldType;
  required?: boolean;
  /** Optional autocomplete for 'text' fields */
  autocomplete?: boolean;
  /** Optional reference list ID for autocomplete suggestions (empty/null = current list) */
  autocompleteSourceListId?: string | null;
  /** Optional reference field ID in the source list */
  autocompleteSourceFieldId?: string | null;
  /** Options for 'select_text' */
  options?: string[];
  /** Options for 'select_number' */
  numericOptions?: number[];
  /** Multi-select support for select_text / select_number / images */
  multiple?: boolean;
}

export interface DataTypeTemplate {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  fields: FieldDefinition[];
  createdAt: Date;
  updatedAt: Date;
}

export type AggregationType = 'sum' | 'avg' | 'count' | 'min' | 'max';

export interface StatisticConfig {
  id: string;
  name: string;
  /** Field ID from the DataType, or '__entry_count__' for pure row counts */
  valueFieldId: string;
  aggregation: AggregationType;
  /** 0..N dimension field IDs (can include DataType field IDs or system fields like '__createdAt_date__', '__createdBy__', '__assignee__') */
  dimensionFieldIds: string[];
  /** Whether hidden entries are included in the statistic calculation (defaults to true) */
  includeHidden?: boolean;
}

export type ListMode = 'fixed' | 'mixed';

export interface ListDefinition {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  category?: string;
  tags: string[];
  mode: ListMode;
  dataTypeId?: string | null;
  statistics: StatisticConfig[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AttachmentMeta {
  id: string;
  fieldId: string;
  fileName: string;
  storagePath: string;
  downloadUrl: string;
  contentType: string;
  size: number;
  uploadedAt: string;
}

export interface ListEntry {
  id: string;
  listId: string;
  ownerId: string;
  dataTypeId?: string | null;
  /** Optional quick-entry title/text (especially useful in mixed lists) */
  title?: string | null;
  createdBy: string;
  assignee?: string | null;
  /** Controls entry visibility in the default list view (e.g. for shopping / todo lists) */
  hidden: boolean;
  /** Dynamic values keyed by FieldDefinition.id */
  values: Record<string, unknown>;
  /** Uploaded attachments metadata for Firebase Storage & Cloud Functions cleanup */
  attachments: AttachmentMeta[];
  createdAt: Date;
  updatedAt: Date;
}

export interface StatisticRowResult {
  /** Dimension values in the order of StatisticConfig.dimensionFieldIds */
  dimensionValues: string[];
  /** Key joining all dimension values */
  dimensionKey: string;
  /** Computed aggregated value */
  value: number;
  /** Number of entries contributing to this group */
  count: number;
  /** Relative share (0..100) relative to the maximum group value for visual MatProgressBar rendering */
  percentageOfMax: number;
}

export interface StatisticEvaluation {
  config: StatisticConfig;
  dimensionLabels: string[];
  valueLabel: string;
  /** Overall aggregated value (used when 0 dimensions, or as summary for 1+ dimensions) */
  totalValue: number;
  totalCount: number;
  /** Grouped rows when dimensionFieldIds.length > 0 */
  rows: StatisticRowResult[];
}

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: 'Einfaches Textfeld',
  number: 'Numerisches Feld',
  date: 'Datum',
  time: 'Uhrzeit',
  datetime: 'Datum und Uhrzeit',
  checkbox: 'Checkbox',
  select_text: 'Auswahl (Text)',
  select_number: 'Auswahl (Numerisch)',
  images: 'Bilder',
};

export const AGGREGATION_LABELS: Record<AggregationType, string> = {
  sum: 'Summe',
  avg: 'Durchschnitt',
  count: 'Anzahl',
  min: 'Minimum',
  max: 'Maximum',
};
