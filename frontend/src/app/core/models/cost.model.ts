// Re-exported from shared/api-contracts/costs.ts — source of truth
// Kotlin mirror: shared/api-contracts/costs.kt
// Any field changes must be mirrored in both files.
import type { Bezirk } from '../../../../../shared/api-contracts/costs';
export type { Bezirk, CostEstimateQuery, CostEstimate, NeighborhoodProfile } from '../../../../../shared/api-contracts/costs';

export type { ApiError } from './api-error.model';

// Angular-specific display helpers — not part of the API contract

export interface BezirkOption {
  value: Bezirk;
  label: string;
}

export const BEZIRK_OPTIONS: BezirkOption[] = [
  { value: 'mitte', label: 'Mitte' },
  { value: 'friedrichshain-kreuzberg', label: 'Friedrichshain-Kreuzberg' },
  { value: 'pankow', label: 'Pankow' },
  { value: 'charlottenburg-wilmersdorf', label: 'Charlottenburg-Wilmersdorf' },
  { value: 'spandau', label: 'Spandau' },
  { value: 'steglitz-zehlendorf', label: 'Steglitz-Zehlendorf' },
  { value: 'tempelhof-schoeneberg', label: 'Tempelhof-Sch\u00f6neberg' },
  { value: 'neukoelln', label: 'Neuk\u00f6lln' },
  { value: 'treptow-koepenick', label: 'Treptow-K\u00f6penick' },
  { value: 'marzahn-hellersdorf', label: 'Marzahn-Hellersdorf' },
  { value: 'lichtenberg', label: 'Lichtenberg' },
  { value: 'reinickendorf', label: 'Reinickendorf' },
];

// RentRange is named for use in components; structurally identical to
// the inline type in shared/api-contracts/costs.ts CostEstimate.rentRange
export interface RentRange {
  min: number;
  max: number;
  median: number;
}
