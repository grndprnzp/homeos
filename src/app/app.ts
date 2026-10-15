import { Component, signal } from '@angular/core';
import { AppshellComponent } from './shared/appshell/appshell.component';

@Component({
  imports: [AppshellComponent],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('homeos');
}
