import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Firestore, getFirestore } from 'firebase/firestore';
import { FirebaseStorage, getStorage } from 'firebase/storage';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class FirebaseService {
  private readonly platformId = inject(PLATFORM_ID);
  readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly app: FirebaseApp | null = null;
  readonly firestore: Firestore | null = null;
  readonly storage: FirebaseStorage | null = null;

  constructor() {
    if (this.isBrowser) {
      this.app = getApps().length === 0 ? initializeApp(environment.firebase) : getApp();
      this.firestore = getFirestore(this.app);
      this.storage = getStorage(this.app);
    }
  }
}
