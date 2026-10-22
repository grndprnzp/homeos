import { Injectable, effect, inject, signal } from '@angular/core';
import {
  Timestamp,
  Unsubscribe,
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { AuthService } from '../../../core/services/auth.service';
import { FirebaseService } from '../../../core/services/firebase.service';
import { DataTypeTemplate, FieldDefinition } from '../models/list.models';

@Injectable({
  providedIn: 'root',
})
export class DataTypeService {
  private readonly firebase = inject(FirebaseService);
  private readonly authService = inject(AuthService);

  private unsubscribeSnapshot: Unsubscribe | null = null;

  readonly dataTypes = signal<DataTypeTemplate[]>([]);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      const user = this.authService.user();
      this.cleanupListener();

      if (!this.firebase.firestore || !user) {
        this.dataTypes.set([]);
        this.loading.set(false);
        return;
      }

      this.loading.set(true);
      const q = query(
        collection(this.firebase.firestore, 'dataTypes'),
        where('ownerId', '==', user.uid)
      );

      this.unsubscribeSnapshot = onSnapshot(
        q,
        (snapshot) => {
          const items: DataTypeTemplate[] = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              ownerId: String(data['ownerId'] ?? user.uid),
              name: String(data['name'] ?? ''),
              description: data['description'] ? String(data['description']) : '',
              fields: Array.isArray(data['fields'])
                ? (data['fields'] as FieldDefinition[])
                : [],
              createdAt: this.toDate(data['createdAt']),
              updatedAt: this.toDate(data['updatedAt']),
            };
          });
          items.sort((a, b) => a.name.localeCompare(b.name, 'de'));
          this.dataTypes.set(items);
          this.loading.set(false);
        },
        (err) => {
          this.error.set(err.message || 'Fehler beim Laden der Datentypen.');
          this.loading.set(false);
        }
      );
    });
  }

  getById(id: string | null | undefined): DataTypeTemplate | undefined {
    if (!id) return undefined;
    return this.dataTypes().find((dt) => dt.id === id);
  }

  async createDataType(input: {
    name: string;
    description?: string;
    fields: FieldDefinition[];
  }): Promise<string> {
    const user = this.authService.user();
    if (!this.firebase.firestore || !user) {
      throw new Error('Bitte melde dich an, um Datentypen zu speichern.');
    }

    this.error.set(null);
    const sanitizedFields = this.sanitizeFields(input.fields);
    const payload = {
      ownerId: user.uid,
      name: input.name.trim(),
      description: (input.description ?? '').trim(),
      fields: sanitizedFields,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(
      collection(this.firebase.firestore, 'dataTypes'),
      payload
    );
    return docRef.id;
  }

  async updateDataType(
    id: string,
    input: {
      name: string;
      description?: string;
      fields: FieldDefinition[];
    }
  ): Promise<void> {
    const user = this.authService.user();
    if (!this.firebase.firestore || !user) {
      throw new Error('Bitte melde dich an, um Datentypen zu bearbeiten.');
    }

    this.error.set(null);
    const sanitizedFields = this.sanitizeFields(input.fields);
    const docRef = doc(this.firebase.firestore, 'dataTypes', id);
    await updateDoc(docRef, {
      name: input.name.trim(),
      description: (input.description ?? '').trim(),
      fields: sanitizedFields,
      updatedAt: serverTimestamp(),
    });
  }

  async deleteDataType(id: string): Promise<void> {
    if (!this.firebase.firestore) return;
    this.error.set(null);
    await deleteDoc(doc(this.firebase.firestore, 'dataTypes', id));
  }

  private sanitizeFields(fields: FieldDefinition[]): Record<string, unknown>[] {
    return fields.map((f) => ({
      id: f.id,
      label: f.label.trim(),
      type: f.type,
      required: Boolean(f.required),
      autocomplete: Boolean(f.autocomplete),
      autocompleteSourceListId: f.autocompleteSourceListId ?? null,
      autocompleteSourceFieldId: f.autocompleteSourceFieldId ?? null,
      options: Array.isArray(f.options) ? f.options : [],
      numericOptions: Array.isArray(f.numericOptions) ? f.numericOptions : [],
      multiple: Boolean(f.multiple),
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

  private cleanupListener(): void {
    if (this.unsubscribeSnapshot) {
      this.unsubscribeSnapshot();
      this.unsubscribeSnapshot = null;
    }
  }
}
