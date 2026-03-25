import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CostEstimate, NeighborhoodProfile } from '../models/cost.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CostEstimationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  estimateCosts(bezirk: string, rooms: number): Observable<CostEstimate> {
    return this.http.get<CostEstimate>(`${this.baseUrl}/costs/estimate`, {
      params: { bezirk, rooms: rooms.toString() },
    });
  }

  getAllNeighborhoods(): Observable<NeighborhoodProfile[]> {
    return this.http.get<NeighborhoodProfile[]>(`${this.baseUrl}/neighborhoods`);
  }

  getNeighborhood(bezirk: string): Observable<NeighborhoodProfile> {
    return this.http.get<NeighborhoodProfile>(`${this.baseUrl}/neighborhoods/${bezirk}`);
  }
}
