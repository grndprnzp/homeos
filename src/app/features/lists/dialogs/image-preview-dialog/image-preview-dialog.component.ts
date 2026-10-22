import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AttachmentMeta } from '../../models/list.models';

export interface ImagePreviewDialogData {
  attachments: AttachmentMeta[];
  initialIndex?: number;
}

@Component({
  selector: 'app-image-preview-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title class="preview-header">
      <span>{{ current()?.fileName || 'Bildvorschau' }}</span>
      <span class="counter"
        >{{ index() + 1 }} / {{ data.attachments.length }}</span
      >
    </h2>
    <mat-dialog-content class="preview-body">
      @if (current(); as att) {
        <img
          [src]="att.downloadUrl"
          [alt]="att.fileName"
          class="preview-image"
        />
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      @if (data.attachments.length > 1) {
        <button mat-stroked-button type="button" (click)="prev()">
          <mat-icon>chevron_left</mat-icon>
          <span>Vorheriges</span>
        </button>
        <button mat-stroked-button type="button" (click)="next()">
          <span>Nächstes</span>
          <mat-icon>chevron_right</mat-icon>
        </button>
      }
      <button mat-flat-button color="primary" mat-dialog-close>
        Schließen
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .preview-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
      }
      .counter {
        font-size: 0.875rem;
        color: var(--mat-sys-on-surface-variant);
      }
      .preview-body {
        display: flex;
        justify-content: center;
        align-items: center;
        max-height: 75vh;
      }
      .preview-image {
        max-width: 100%;
        max-height: 68vh;
        object-fit: contain;
        border-radius: 8px;
      }
    `,
  ],
})
export class ImagePreviewDialogComponent {
  readonly data = inject<ImagePreviewDialogData>(MAT_DIALOG_DATA);
  readonly index = signal<number>(this.data.initialIndex ?? 0);

  current(): AttachmentMeta | undefined {
    return this.data.attachments[this.index()];
  }

  prev(): void {
    const len = this.data.attachments.length;
    this.index.update((i) => (i - 1 + len) % len);
  }

  next(): void {
    const len = this.data.attachments.length;
    this.index.update((i) => (i + 1) % len);
  }
}
