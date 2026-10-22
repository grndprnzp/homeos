import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MyListsPage } from './my-lists-page';

describe('MyListsPage', () => {
  let component: MyListsPage;
  let fixture: ComponentFixture<MyListsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyListsPage],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(MyListsPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
