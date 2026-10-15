import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-auth-card',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './auth-card.component.html',
  styleUrl: './auth-card.component.css',
})
export class AuthCardComponent {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly mode = signal<'signin' | 'signup'>('signin');
  readonly isSubmitting = signal<boolean>(false);
  readonly showPassword = signal<boolean>(false);

  email = '';
  password = '';

  setMode(newMode: 'signin' | 'signup'): void {
    this.mode.set(newMode);
    this.authService.clearError();
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((visible) => !visible);
  }

  async handleGoogleSignIn(): Promise<void> {
    this.isSubmitting.set(true);
    const user = await this.authService.signInWithGoogle();
    this.isSubmitting.set(false);
    if (user) {
      // successfully logged in
    }
  }

  async handleEmailSubmit(): Promise<void> {
    if (!this.email || !this.password) return;

    this.isSubmitting.set(true);
    let user = null;
    if (this.mode() === 'signin') {
      user = await this.authService.signInWithEmail(this.email, this.password);
    } else {
      user = await this.authService.registerWithEmail(this.email, this.password);
    }
    this.isSubmitting.set(false);
    if (user) {
      this.email = '';
      this.password = '';
    }
  }

  async handleGuestSignIn(): Promise<void> {
    this.isSubmitting.set(true);
    await this.authService.signInAsGuest();
    this.isSubmitting.set(false);
  }

  async handleLogout(): Promise<void> {
    await this.authService.logout();
  }

  navigateToLists(): void {
    this.router.navigate(['/my-lists']);
  }
}
