import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

  // Portal público del cliente — sin auth guard
  {
    path: 'p/:token',
    loadComponent: () => import('./features/portal/portal.component')
      .then(m => m.PortalComponent)
  },

  {
    path: 'auth/login',
    loadComponent: () => import('./features/auth/login.component')
      .then(m => m.LoginComponent)
  },

  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./shared/components/layout/layout.component')
      .then(m => m.LayoutComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component')
          .then(m => m.DashboardComponent)
      },
      {
        path: 'clientes',
        loadComponent: () => import('./features/clientes/clientes.component')
          .then(m => m.ClientesComponent)
      },
      {
        path: 'proyectos',
        loadComponent: () => import('./features/proyectos/proyectos.component')
          .then(m => m.ProyectosComponent)
      },
      {
        path: 'proyectos/:id',
        loadComponent: () => import('./features/proyectos/proyecto-detail.component')
          .then(m => m.ProyectoDetailComponent)
      },
    ]
  },

  { path: '**', redirectTo: 'dashboard' }
];
