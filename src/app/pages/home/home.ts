import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { AuthCardComponent } from '../../shared/auth-card/auth-card.component';
import { AuthService } from '../../core/services/auth.service';

interface DemoListItem {
  id: number;
  text: string;
  author: string;
  checked: boolean;
  category: string;
}

interface DemoTaskItem {
  id: number;
  title: string;
  assignee: string;
  status: 'done' | 'in-progress' | 'pending';
  tag: string;
}

interface DemoReminderItem {
  id: number;
  title: string;
  time: string;
  type: string;
  active: boolean;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    AuthCardComponent,
  ],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class HomeComponent {
  readonly authService = inject(AuthService);

  // Interactive demo states to make the upcoming feature previews tactile & engaging
  readonly demoListItems = signal<DemoListItem[]>([
    { id: 1, text: 'Oat milk (Barista Edition)', author: 'Sarah', checked: true, category: 'Groceries' },
    { id: 2, text: 'Organic sourdough loaf', author: 'Max', checked: false, category: 'Bakery' },
    { id: 3, text: 'Fresh basil & vine tomatoes', author: 'Sarah', checked: false, category: 'Produce' },
    { id: 4, text: 'Dishwasher tablets', author: 'Leo', checked: false, category: 'Household' },
  ]);

  readonly demoTasks = signal<DemoTaskItem[]>([
    { id: 1, title: 'Deep clean kitchen counter & stove', assignee: 'Max', status: 'in-progress', tag: 'Chore' },
    { id: 2, title: 'Sort recycling & empty paper bin', assignee: 'Sarah', status: 'done', tag: 'Routine' },
    { id: 3, title: 'Water balcony plants and herbs', assignee: 'Leo', status: 'pending', tag: 'Garden' },
  ]);

  readonly demoReminders = signal<DemoReminderItem[]>([
    { id: 1, title: 'Trash & Organic Bin Pickup', time: 'Tomorrow, 07:00 AM', type: 'Family Alert', active: true },
    { id: 2, title: 'Package Delivery Arrival', time: 'Today, 02:30 PM', type: 'Household Ping', active: true },
    { id: 3, title: 'Annual Boiler Checkup Inspection', time: 'Saturday, 10:00 AM', type: 'Maintenance', active: true },
  ]);

  toggleDemoItem(id: number): void {
    this.demoListItems.update((items) =>
      items.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  }

  toggleDemoTask(id: number): void {
    this.demoTasks.update((tasks) =>
      tasks.map((task) => {
        if (task.id === id) {
          const nextStatus = task.status === 'done' ? 'pending' : task.status === 'pending' ? 'in-progress' : 'done';
          return { ...task, status: nextStatus };
        }
        return task;
      })
    );
  }

  toggleDemoReminder(id: number): void {
    this.demoReminders.update((reminders) =>
      reminders.map((r) => (r.id === id ? { ...r, active: !r.active } : r))
    );
  }

  scrollToSection(id: string): void {
    if (typeof document !== 'undefined') {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }
}
