import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { calculateNetSalary } from '../calculators/tax-calculator';
import { SalaryRequest, SalaryResponse } from '../models/salary.model';

@Injectable({ providedIn: 'root' })
export class SalaryCalculationService {
  calculate(request: SalaryRequest): Observable<SalaryResponse> {
    return of(calculateNetSalary(request));
  }
}
