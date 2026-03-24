export type Bezirk =
  | 'mitte'
  | 'friedrichshain-kreuzberg'
  | 'pankow'
  | 'charlottenburg-wilmersdorf'
  | 'spandau'
  | 'steglitz-zehlendorf'
  | 'tempelhof-schoeneberg'
  | 'neukoelln'
  | 'treptow-koepenick'
  | 'marzahn-hellersdorf'
  | 'lichtenberg'
  | 'reinickendorf';

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

export interface RentRange {
  min: number;
  max: number;
  median: number;
}

export interface CostEstimate {
  bezirk: Bezirk;
  displayName: string;
  rooms: number;
  rentRange: RentRange;
  utilities: number;
  transport: number;
  groceries: number;
  totalEstimated: number;
}

export interface NeighborhoodProfile {
  bezirk: Bezirk;
  displayName: string;
  vibe: string;
  commuteMinutes: number;
  highlights: string[];
}

export interface ApiError {
  status: number;
  message: string;
  timestamp: string;
}
