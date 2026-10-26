import { Routes, provideRoutes } from '@angular/router';
import { AuthGuard } from './auth.guard';

export const adminRoutes: Routes = [
  {
    path: 'admin',
    canActivate: [AuthGuard],
    loadComponent: () => import('./admin').then((m) => m.AdminComponent),
  },
];

export const adminProviders = [provideRoutes(adminRoutes)];
