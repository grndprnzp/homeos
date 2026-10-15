import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home';
import { MyListsPage } from './features/lists/my-lists-page/my-lists-page';

export const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'my-lists', component: MyListsPage }
];
