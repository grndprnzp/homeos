import { TestBed } from '@angular/core/testing';
import { StatisticsService } from './statistics.service';
import {
  DataTypeTemplate,
  ListEntry,
  StatisticConfig,
} from '../models/list.models';

describe('StatisticsService', () => {
  let service: StatisticsService;

  const bookDataType: DataTypeTemplate = {
    id: 'dt_books',
    ownerId: 'u1',
    name: 'Lesetagebuch',
    fields: [
      { id: 'f_date', label: 'Datum', type: 'date' },
      { id: 'f_book', label: 'Buchtitel', type: 'text', autocomplete: true },
      { id: 'f_page', label: 'Zuletzt gelesene Seite', type: 'number' },
    ],
    createdAt: new Date('2026-10-15T10:00:00Z'),
    updatedAt: new Date('2026-10-15T10:00:00Z'),
  };

  const sampleEntries: ListEntry[] = [
    {
      id: 'e1',
      listId: 'l1',
      ownerId: 'u1',
      dataTypeId: 'dt_books',
      createdBy: 'Max',
      hidden: false,
      values: {
        f_date: '2026-10-15',
        f_book: 'Der Prozess der Softwareentwicklung',
        f_page: 123,
      },
      attachments: [],
      createdAt: new Date('2026-10-15T12:00:00Z'),
      updatedAt: new Date('2026-10-15T12:00:00Z'),
    },
    {
      id: 'e2',
      listId: 'l1',
      ownerId: 'u1',
      dataTypeId: 'dt_books',
      createdBy: 'Max',
      hidden: false,
      values: {
        f_date: '2026-10-16',
        f_book: 'Der Prozess der Softwareentwicklung',
        f_page: 150,
      },
      attachments: [],
      createdAt: new Date('2026-10-16T12:00:00Z'),
      updatedAt: new Date('2026-10-16T12:00:00Z'),
    },
    {
      id: 'e3',
      listId: 'l1',
      ownerId: 'u1',
      dataTypeId: 'dt_books',
      createdBy: 'Max',
      hidden: false,
      values: {
        f_date: '2026-10-18',
        f_book: 'Faust',
        f_page: 120,
      },
      attachments: [],
      createdAt: new Date('2026-10-18T12:00:00Z'),
      updatedAt: new Date('2026-10-18T12:00:00Z'),
    },
    {
      id: 'e4',
      listId: 'l1',
      ownerId: 'u1',
      dataTypeId: 'dt_books',
      createdBy: 'Max',
      hidden: true,
      values: {
        f_date: '2026-10-19',
        f_book: 'Faust',
        f_page: 150,
      },
      attachments: [],
      createdAt: new Date('2026-10-19T12:00:00Z'),
      updatedAt: new Date('2026-10-19T12:00:00Z'),
    },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StatisticsService);
  });

  it('computes 0-dimension sum (Anzahl gelesener Seiten insgesamt)', () => {
    const config: StatisticConfig = {
      id: 's1',
      name: 'Anzahl gelesener Seiten',
      valueFieldId: 'f_page',
      aggregation: 'sum',
      dimensionFieldIds: [],
      includeHidden: true,
    };

    const result = service.evaluateStatistic(config, sampleEntries, bookDataType);
    expect(result.totalValue).toBe(543);
    expect(result.totalCount).toBe(4);
    expect(result.rows.length).toBe(0);
  });

  it('computes 1-dimension sum per book (Anzahl gelesener Seiten pro Buch)', () => {
    const config: StatisticConfig = {
      id: 's2',
      name: 'Anzahl gelesener Seiten pro Buch',
      valueFieldId: 'f_page',
      aggregation: 'sum',
      dimensionFieldIds: ['f_book'],
      includeHidden: true,
    };

    const result = service.evaluateStatistic(config, sampleEntries, bookDataType);
    expect(result.rows.length).toBe(2);
    expect(result.rows[0].dimensionValues).toEqual([
      'Der Prozess der Softwareentwicklung',
    ]);
    expect(result.rows[0].value).toBe(273);
    expect(result.rows[0].percentageOfMax).toBe(100);

    expect(result.rows[1].dimensionValues).toEqual(['Faust']);
    expect(result.rows[1].value).toBe(270);
  });

  it('computes multi-dimension statistics across Datum, Buchtitel, and Zuletzt gelesene Seite', () => {
    const config: StatisticConfig = {
      id: 's3',
      name: 'Seiten pro Tag, Buch und Seite',
      valueFieldId: 'f_page',
      aggregation: 'sum',
      dimensionFieldIds: ['f_date', 'f_book', 'f_page'],
      includeHidden: true,
    };

    const result = service.evaluateStatistic(config, sampleEntries, bookDataType);
    expect(result.dimensionLabels).toEqual([
      'Datum',
      'Buchtitel',
      'Zuletzt gelesene Seite',
    ]);
    expect(result.rows.length).toBe(4);
    expect(result.rows[0].dimensionValues).toEqual([
      '2026-10-15',
      'Der Prozess der Softwareentwicklung',
      '123',
    ]);
    expect(result.rows[0].value).toBe(123);
  });

  it('excludes hidden entries when includeHidden is false', () => {
    const config: StatisticConfig = {
      id: 's4',
      name: 'Sichtbare Seiten',
      valueFieldId: 'f_page',
      aggregation: 'sum',
      dimensionFieldIds: ['f_book'],
      includeHidden: false,
    };

    const result = service.evaluateStatistic(config, sampleEntries, bookDataType);
    const faustRow = result.rows.find((r) => r.dimensionValues[0] === 'Faust');
    expect(faustRow?.value).toBe(120);
    expect(result.totalValue).toBe(393);
  });
});
