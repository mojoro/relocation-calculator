// Generated from shared/api-contracts/openapi.yaml
// Run `npm run generate:api` to regenerate after spec changes.
import type { components } from '../api/generated-types';

export type Bezirk = components['schemas']['Bezirk'];
export type CostEstimate = components['schemas']['CostEstimate'];
export type NeighborhoodProfile = components['schemas']['NeighborhoodProfile'];
export type RentRange = components['schemas']['RentRange'];

export type { ApiError } from './api-error.model';

// Angular-specific display helpers — not part of the API contract

export interface CostEstimateQuery {
  bezirk: Bezirk;
  rooms: number;
}

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
