import { Injectable, computed, effect, inject, signal } from '@angular/core';
import {
  Timestamp,
  Unsubscribe,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { AuthService } from '../../../core/services/auth.service';
import { FirebaseService } from '../../../core/services/firebase.service';
import {
  AttachmentMeta,
  ListDefinition,
  ListEntry,
  ListMode,
  StatisticConfig,
} from '../models/list.models';

@Injectable({
  providedIn: 'root',
})
export class ListService {
  private readonly firebase = inject(FirebaseService);
  private readonly authService = inject(AuthService);

  private unsubscribeLists: Unsubscribe | null = null;
  private unsubscribeEntries: Unsubscribe | null = null;

  readonly lists = signal<ListDefinition[]>([]);
  readonly loadingLists = signal<boolean>(false);

  readonly activeListId = signal<string | null>(null);
  readonly activeEntries = signal<ListEntry[]>([]);
  readonly loadingEntries = signal<boolean>(false);

  readonly error = signal<string | null>(null);

  /** Distinct categories across all user lists for autocomplete & filtering */
  readonly existingCategories = computed<string[]>(() => {
    const set = new Set<string>();
    for (const list of this.lists()) {
      const cat = list.category?.trim();
      if (cat) {
        set.add(cat);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'de'));
  });

  /** Distinct tags across all user lists for filtering */
  readonly existingTags = computed<string[]>(() => {
    const set = new Set<string>();
    for (const list of this.lists()) {
      for (const tag of list.tags ?? []) {
        const trimmed = tag.trim();
        if (trimmed) {
          set.add(trimmed);
        }
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'de'));
  });

  constructor() {
    effect(() => {
      const user = this.authService.user();
      this.cleanupListsListener();

      if (!this.firebase.firestore || !user) {
        this.lists.set([]);
        this.loadingLists.set(false);
        return;
      }

      this.loadingLists.set(true);
      const q = query(
        collection(this.firebase.firestore, 'lists'),
        where('ownerId', '==', user.uid)
      );

      this.unsubscribeLists = onSnapshot(
        q,
        (snapshot) => {
          const loaded: ListDefinition[] = snapshot.docs.map((docSnap) =>
            this.mapListDoc(docSnap.id, docSnap.data(), user.uid)
          );
          loaded.sort(
            (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
          );
          this.lists.set(loaded);
          this.loadingLists.set(false);
        },
        (err) => {
          this.error.set(err.message || 'Fehler beim Laden der Listen.');
          this.loadingLists.set(false);
        }
      );
    });
  }

  watchEntriesForList(listId: string | null): void {
    this.cleanupEntriesListener();
    this.activeListId.set(listId);

    const user = this.authService.user();
    if (!this.firebase.firestore || !user || !listId) {
      this.activeEntries.set([]);
      this.loadingEntries.set(false);
      return;
    }

    this.loadingEntries.set(true);
    const entriesCol = collection(
      this.firebase.firestore,
      'lists',
      listId,
      'entries'
    );
    const q = query(entriesCol, where('ownerId', '==', user.uid));

    this.unsubscribeEntries = onSnapshot(
      q,
      (snapshot) => {
        const loaded: ListEntry[] = snapshot.docs.map((docSnap) =>
          this.mapEntryDoc(docSnap.id, listId, docSnap.data(), user.uid)
        );
        loaded.sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
        );
        this.activeEntries.set(loaded);
        this.loadingEntries.set(false);
      },
      (err) => {
        this.error.set(err.message || 'Fehler beim Laden der Einträge.');
        this.loadingEntries.set(false);
      }
    );
  }

  async getEntriesOnce(listId: string): Promise<ListEntry[]> {
    const user = this.authService.user();
    if (!this.firebase.firestore || !user || !listId) {
      return [];
    }

    const entriesCol = collection(
      this.firebase.firestore,
      'lists',
      listId,
      'entries'
    );
    const q = query(entriesCol, where('ownerId', '==', user.uid));
    const snap = await getDocs(q);
    return snap.docs.map((d) =>
      this.mapEntryDoc(d.id, listId, d.data(), user.uid)
    );
  }

  async createList(input: {
    name: string;
    description?: string;
    category?: string;
    tags: string[];
    mode: ListMode;
    dataTypeId?: string | null;
    statistics?: StatisticConfig[];
  }): Promise<string> {
    const user = this.authService.user();
    if (!this.firebase.firestore || !user) {
      throw new Error('Bitte melde dich an, um eine Liste zu erstellen.');
    }

    this.error.set(null);
    const payload = {
      ownerId: user.uid,
      name: input.name.trim(),
      description: (input.description ?? '').trim(),
      category: (input.category ?? '').trim(),
      mode: input.mode,
      dataTypeId:
        input.mode === 'fixed' ? input.dataTypeId ?? null : null,
      tags: (input.tags ?? []).map((t) => t.trim()).filter(Boolean),
      statistics: this.sanitizeStatistics(input.statistics ?? []),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(
      collection(this.firebase.firestore, 'lists'),
      payload
    );
    return docRef.id;
  }

  async updateList(
    listId: string,
    input: {
      name: string;
      description?: string;
      category?: string;
      tags: string[];
      dataTypeId?: string | null;
      statistics?: StatisticConfig[];
    }
  ): Promise<void> {
    if (!this.firebase.firestore) return;
    this.error.set(null);

    const updatePayload: Record<string, unknown> = {
      name: input.name.trim(),
      description: (input.description ?? '').trim(),
      category: (input.category ?? '').trim(),
      tags: (input.tags ?? []).map((t) => t.trim()).filter(Boolean),
      updatedAt: serverTimestamp(),
    };

    if (input.dataTypeId !== undefined) {
      updatePayload['dataTypeId'] = input.dataTypeId;
    }
    if (input.statistics !== undefined) {
      updatePayload['statistics'] = this.sanitizeStatistics(input.statistics);
    }

    await updateDoc(doc(this.firebase.firestore, 'lists', listId), updatePayload);
  }

  async saveListStatistics(
    listId: string,
    statistics: StatisticConfig[]
  ): Promise<void> {
    if (!this.firebase.firestore) return;
    this.error.set(null);

    await updateDoc(doc(this.firebase.firestore, 'lists', listId), {
      statistics: this.sanitizeStatistics(statistics),
      updatedAt: serverTimestamp(),
    });
  }

  async deleteList(listId: string): Promise<void> {
    if (!this.firebase.firestore) return;
    this.error.set(null);
    await deleteDoc(doc(this.firebase.firestore, 'lists', listId));
  }

  /**
   * Generates a new Firestore entry ID in advance so attachments can be uploaded
   * to `users/{uid}/lists/{listId}/entries/{entryId}/...` before saving the entry doc.
   */
  generateEntryId(listId: string): string {
    if (!this.firebase.firestore) {
      return `local_${Date.now()}`;
    }
    return doc(collection(this.firebase.firestore, 'lists', listId, 'entries')).id;
  }

  async uploadEntryAttachments(
    listId: string,
    entryId: string,
    fieldId: string,
    files: File[]
  ): Promise<AttachmentMeta[]> {
    const user = this.authService.user();
    if (!this.firebase.storage || !user) {
      throw new Error('Storage ist nicht verfügbar oder Benutzer nicht angemeldet.');
    }

    const uploaded: AttachmentMeta[] = [];
    for (const file of files) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const uniqueFileName = `${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 7)}_${safeName}`;
      const storagePath = `users/${user.uid}/lists/${listId}/entries/${entryId}/${uniqueFileName}`;
      const storageRef = ref(this.firebase.storage, storagePath);

      const snapshot = await uploadBytes(storageRef, file, {
        contentType: file.type || 'image/jpeg',
      });
      const downloadUrl = await getDownloadURL(snapshot.ref);

      uploaded.push({
        id: uniqueFileName,
        fieldId,
        fileName: file.name,
        storagePath,
        downloadUrl,
        contentType: file.type || 'image/jpeg',
        size: file.size,
        uploadedAt: new Date().toISOString(),
      });
    }

    return uploaded;
  }

  async createEntry(
    listId: string,
    input: {
      id?: string;
      dataTypeId?: string | null;
      title?: string | null;
      assignee?: string | null;
      hidden?: boolean;
      values: Record<string, unknown>;
      attachments: AttachmentMeta[];
    }
  ): Promise<string> {
    const user = this.authService.user();
    if (!this.firebase.firestore || !user) {
      throw new Error('Bitte melde dich an, um Einträge hinzuzufügen.');
    }

    this.error.set(null);
    const entryId = input.id || this.generateEntryId(listId);
    const createdBy =
      user.displayName ||
      (user.isAnonymous ? 'Gast' : user.email?.split('@')[0]) ||
      'Benutzer';

    const payload = {
      ownerId: user.uid,
      listId,
      dataTypeId: input.dataTypeId ?? null,
      title: input.title ? input.title.trim() : null,
      createdBy: createdBy.slice(0, 200),
      assignee: input.assignee ? input.assignee.trim().slice(0, 200) : null,
      hidden: Boolean(input.hidden),
      values: this.sanitizeValues(input.values),
      attachments: this.sanitizeAttachments(input.attachments),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const entryRef = doc(
      this.firebase.firestore,
      'lists',
      listId,
      'entries',
      entryId
    );
    await setDoc(entryRef, payload);

    // Touch parent list updatedAt
    await updateDoc(doc(this.firebase.firestore, 'lists', listId), {
      updatedAt: serverTimestamp(),
    });

    return entryId;
  }

  async updateEntry(
    listId: string,
    entryId: string,
    input: {
      dataTypeId?: string | null;
      title?: string | null;
      assignee?: string | null;
      hidden?: boolean;
      values?: Record<string, unknown>;
      attachments?: AttachmentMeta[];
    }
  ): Promise<void> {
    if (!this.firebase.firestore) return;
    this.error.set(null);

    const updatePayload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };

    if (input.dataTypeId !== undefined) {
      updatePayload['dataTypeId'] = input.dataTypeId ?? null;
    }
    if (input.title !== undefined) {
      updatePayload['title'] = input.title ? input.title.trim() : null;
    }
    if (input.assignee !== undefined) {
      updatePayload['assignee'] = input.assignee
        ? input.assignee.trim().slice(0, 200)
        : null;
    }
    if (input.hidden !== undefined) {
      updatePayload['hidden'] = Boolean(input.hidden);
    }
    if (input.values !== undefined) {
      updatePayload['values'] = this.sanitizeValues(input.values);
    }
    if (input.attachments !== undefined) {
      updatePayload['attachments'] = this.sanitizeAttachments(input.attachments);
    }

    const entryRef = doc(
      this.firebase.firestore,
      'lists',
      listId,
      'entries',
      entryId
    );
    await updateDoc(entryRef, updatePayload);
  }

  async toggleEntryHidden(
    listId: string,
    entryId: string,
    hidden: boolean
  ): Promise<void> {
    await this.updateEntry(listId, entryId, { hidden });
  }

  async deleteEntry(listId: string, entryId: string): Promise<void> {
    if (!this.firebase.firestore) return;
    this.error.set(null);
    await deleteDoc(
      doc(this.firebase.firestore, 'lists', listId, 'entries', entryId)
    );
  }

  private mapListDoc(
    id: string,
    data: Record<string, unknown>,
    fallbackOwnerId: string
  ): ListDefinition {
    return {
      id,
      ownerId: String(data['ownerId'] ?? fallbackOwnerId),
      name: String(data['name'] ?? ''),
      description: data['description'] ? String(data['description']) : '',
      category: data['category'] ? String(data['category']) : '',
      tags: Array.isArray(data['tags'])
        ? data['tags'].map((t) => String(t))
        : [],
      mode: data['mode'] === 'fixed' ? 'fixed' : 'mixed',
      dataTypeId: data['dataTypeId'] ? String(data['dataTypeId']) : null,
      statistics: Array.isArray(data['statistics'])
        ? (data['statistics'] as StatisticConfig[])
        : [],
      createdAt: this.toDate(data['createdAt']),
      updatedAt: this.toDate(data['updatedAt']),
    };
  }

  private mapEntryDoc(
    id: string,
    listId: string,
    data: Record<string, unknown>,
    fallbackOwnerId: string
  ): ListEntry {
    return {
      id,
      listId: String(data['listId'] ?? listId),
      ownerId: String(data['ownerId'] ?? fallbackOwnerId),
      dataTypeId: data['dataTypeId'] ? String(data['dataTypeId']) : null,
      title: data['title'] ? String(data['title']) : null,
      createdBy: String(data['createdBy'] ?? 'Benutzer'),
      assignee: data['assignee'] ? String(data['assignee']) : null,
      hidden: Boolean(data['hidden']),
      values:
        data['values'] && typeof data['values'] === 'object'
          ? (data['values'] as Record<string, unknown>)
          : {},
      attachments: Array.isArray(data['attachments'])
        ? (data['attachments'] as AttachmentMeta[])
        : [],
      createdAt: this.toDate(data['createdAt']),
      updatedAt: this.toDate(data['updatedAt']),
    };
  }

  private sanitizeStatistics(
    statistics: StatisticConfig[]
  ): Record<string, unknown>[] {
    return statistics.map((s) => ({
      id: s.id,
      name: s.name.trim(),
      valueFieldId: s.valueFieldId,
      aggregation: s.aggregation,
      dimensionFieldIds: Array.isArray(s.dimensionFieldIds)
        ? s.dimensionFieldIds
        : [],
      includeHidden: s.includeHidden ?? true,
    }));
  }

  private sanitizeValues(
    values: Record<string, unknown>
  ): Record<string, unknown> {
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(values)) {
      if (v !== undefined) {
        clean[k] = v;
      }
    }
    return clean;
  }

  private sanitizeAttachments(
    attachments: AttachmentMeta[]
  ): Record<string, unknown>[] {
    return attachments.map((a) => ({
      id: a.id,
      fieldId: a.fieldId,
      fileName: a.fileName,
      storagePath: a.storagePath,
      downloadUrl: a.downloadUrl,
      contentType: a.contentType,
      size: a.size,
      uploadedAt: a.uploadedAt,
    }));
  }

  private toDate(val: unknown): Date {
    if (val instanceof Timestamp) {
      return val.toDate();
    }
    if (val instanceof Date) {
      return val;
    }
    return new Date();
  }

  private cleanupListsListener(): void {
    if (this.unsubscribeLists) {
      this.unsubscribeLists();
      this.unsubscribeLists = null;
    }
  }

  private cleanupEntriesListener(): void {
    if (this.unsubscribeEntries) {
      this.unsubscribeEntries();
      this.unsubscribeEntries = null;
    }
  }
}
