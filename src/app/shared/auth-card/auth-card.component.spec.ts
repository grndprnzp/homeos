import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { AuthCardComponent } from './auth-card.component';
import { AuthService } from '../../core/services/auth.service';

describe('AuthCardComponent', () => {
  let component: AuthCardComponent;
  let fixture: ComponentFixture<AuthCardComponent>;

  const mockAuthService = {
    user: signal(null),
    loading: signal(false),
    authError: signal<string | null>(null),
    signInWithGoogle: vi.fn(),
    signInWithEmail: vi.fn(),
    registerWithEmail: vi.fn(),
    signInAsGuest: vi.fn(),
    logout: vi.fn(),
    clearError: vi.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthCardComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AuthCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle between signin and signup modes', () => {
    expect(component.mode()).toBe('signin');
    component.setMode('signup');
    expect(component.mode()).toBe('signup');
    expect(mockAuthService.clearError).toHaveBeenCalled();
  });

  it('should toggle password visibility', () => {
    expect(component.showPassword()).toBe(false);
    component.togglePasswordVisibility();
    expect(component.showPassword()).toBe(true);
  });

  it('should trigger Google sign-in', async () => {
    await component.handleGoogleSignIn();
    expect(mockAuthService.signInWithGoogle).toHaveBeenCalled();
  });
});
