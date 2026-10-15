import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';

import { AppshellComponent } from './appshell.component';

describe('AppshellComponent', () => {
  let component: AppshellComponent;
  let fixture: ComponentFixture<AppshellComponent>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AppshellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should compile', () => {
    expect(component).toBeTruthy();
  });
});
