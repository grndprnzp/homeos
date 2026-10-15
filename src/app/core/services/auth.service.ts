import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  User,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
} from 'firebase/auth';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly platformId = inject(PLATFORM_ID);
  private auth: Auth | null = null;

  readonly user = signal<User | null>(null);
  readonly loading = signal<boolean>(true);
  readonly authError = signal<string | null>(null);
  readonly isBrowser = isPlatformBrowser(this.platformId);

  constructor() {
    if (this.isBrowser) {
      const app: FirebaseApp = getApps().length === 0
        ? initializeApp(environment.firebase)
        : getApp();

      this.auth = getAuth(app);
      onAuthStateChanged(this.auth, (user) => {
        this.user.set(user);
        this.loading.set(false);
      });
    } else {
      this.loading.set(false);
    }
  }

  async signInWithGoogle(): Promise<User | null> {
    if (!this.auth) return null;
    this.authError.set(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const credential = await signInWithPopup(this.auth, provider);
      return credential.user;
    } catch (err: unknown) {
      this.handleError(err);
      return null;
    }
  }

  async signInWithEmail(email: string, password: string): Promise<User | null> {
    if (!this.auth) return null;
    this.authError.set(null);
    try {
      const credential = await signInWithEmailAndPassword(this.auth, email, password);
      return credential.user;
    } catch (err: unknown) {
      this.handleError(err);
      return null;
    }
  }

  async registerWithEmail(email: string, password: string): Promise<User | null> {
    if (!this.auth) return null;
    this.authError.set(null);
    try {
      const credential = await createUserWithEmailAndPassword(this.auth, email, password);
      return credential.user;
    } catch (err: unknown) {
      this.handleError(err);
      return null;
    }
  }

  async signInAsGuest(): Promise<User | null> {
    if (!this.auth) return null;
    this.authError.set(null);
    try {
      const credential = await signInAnonymously(this.auth);
      return credential.user;
    } catch (err: unknown) {
      this.handleError(err);
      return null;
    }
  }

  async logout(): Promise<void> {
    if (!this.auth) return;
    this.authError.set(null);
    try {
      await signOut(this.auth);
    } catch (err: unknown) {
      this.handleError(err);
    }
  }

  clearError(): void {
    this.authError.set(null);
  }

  private handleError(err: unknown): void {
    const error = err as { code?: string; message?: string };
    const code = error?.code || '';
    switch (code) {
      case 'auth/invalid-email':
        this.authError.set('Please enter a valid email address.');
        break;
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        this.authError.set('Invalid email or password.');
        break;
      case 'auth/email-already-in-use':
        this.authError.set('An account with this email address already exists. Try logging in.');
        break;
      case 'auth/weak-password':
        this.authError.set('Password should be at least 6 characters long.');
        break;
      case 'auth/popup-closed-by-user':
        this.authError.set('Sign-in cancelled. The window was closed before completion.');
        break;
      case 'auth/unauthorized-domain':
        this.authError.set('This domain is not authorized for authentication in Firebase.');
        break;
      default:
        this.authError.set(error?.message || 'Authentication error occurred. Please try again.');
        break;
    }
  }
}
