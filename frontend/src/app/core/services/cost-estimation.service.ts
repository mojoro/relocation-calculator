import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { CostEstimate, NeighborhoodProfile, Bezirk } from '../models/cost.model';
import {
  BudgetAllocationRequest,
  BudgetAllocation,
  AnalysisContext,
  BudgetAnalysis,
} from '../models/budget.model';
import {
  estimateCosts as calcEstimate,
  getAllProfiles,
  getNeighborhoodProfile,
} from '../calculators/cost-estimator';
import { allocateBudget as calcAllocate } from '../calculators/budget-allocator';

@Injectable({ providedIn: 'root' })
export class CostEstimationService {
  private readonly http = inject(HttpClient);

  estimateCosts(bezirk: string, rooms: number): Observable<CostEstimate> {
    return of(calcEstimate(bezirk as Bezirk, rooms));
  }

  getAllNeighborhoods(): Observable<NeighborhoodProfile[]> {
    return of(getAllProfiles());
  }

  getNeighborhood(bezirk: string): Observable<NeighborhoodProfile> {
    return of(getNeighborhoodProfile(bezirk as Bezirk));
  }

  allocateBudget(request: BudgetAllocationRequest): Observable<BudgetAllocation> {
    return of(calcAllocate(request));
  }

  analyzeBudget(context: AnalysisContext): Observable<BudgetAnalysis> {
    return this.http.post<BudgetAnalysis>('/api/analyze', context);
  }
}
