import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SalaryRequest, SalaryResponse } from '../models/salary.model';
import { environment } from '../../../environments/environment';

/**
 * Service for calculating net salary via the backend API.
 * Calls POST /api/v1/salary/calculate.
 */
@Injectable({ providedIn: 'root' })
export class SalaryCalculationService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/salary/calculate`;

  calculate(request: SalaryRequest): Observable<SalaryResponse> {
    return this.http.post<SalaryResponse>(this.apiUrl, request);
  }
}
