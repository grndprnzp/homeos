import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home';
import { MyListsPage } from './features/lists/my-lists-page/my-lists-page';
import { ListDetailPage } from './features/lists/list-detail-page/list-detail-page';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'my-lists', component: MyListsPage },
  { path: 'my-lists/:id', component: ListDetailPage },
];
