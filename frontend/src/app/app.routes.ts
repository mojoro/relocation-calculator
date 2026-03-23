import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'salary',
    pathMatch: 'full',
  },
  {
    path: 'salary',
    loadComponent: () =>
      import('./features/salary-calculator/salary-calculator.component').then(
        (m) => m.SalaryCalculatorComponent
      ),
  },
  {
    path: 'costs',
    loadComponent: () =>
      import('./features/cost-estimator/cost-estimator.component').then(
        (m) => m.CostEstimatorComponent
      ),
  },
  {
    path: 'neighborhoods',
    loadComponent: () =>
      import('./features/neighborhood-explorer/neighborhood-explorer.component').then(
        (m) => m.NeighborhoodExplorerComponent
      ),
  },
  {
    path: 'checklist',
    loadComponent: () =>
      import('./features/visa-checklist/visa-checklist.component').then(
        (m) => m.VisaChecklistComponent
      ),
  },
];
