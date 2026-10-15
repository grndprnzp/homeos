import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { HomeComponent } from './home';
import { AuthService } from '../../core/services/auth.service';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;

  const mockAuthService = {
    user: signal(null),
    loading: signal(false),
    authError: signal(null),
    signInWithGoogle: vi.fn(),
    signInWithEmail: vi.fn(),
    registerWithEmail: vi.fn(),
    signInAsGuest: vi.fn(),
    logout: vi.fn(),
    clearError: vi.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the landing page headline', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.hero-title')?.textContent).toContain('Everyday Harmony');
  });

  it('should enlist all 3 upcoming features', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const text = compiled.textContent?.toLowerCase() || '';
    expect(text).toContain('simple but effective, collaborative list management');
    expect(text).toContain('collaborative task management');
    expect(text).toContain('shared reminders');
  });

  it('should toggle interactive demo list item on click', () => {
    const initialItem = component.demoListItems()[1];
    expect(initialItem.checked).toBe(false);
    component.toggleDemoItem(initialItem.id);
    expect(component.demoListItems()[1].checked).toBe(true);
  });
});
