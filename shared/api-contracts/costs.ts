/**
 * Cost Estimation API Contracts
 *
 * Interfaces for the cost estimation endpoint that provides
 * living cost data for Berlin neighborhoods (Bezirke).
 *
 * @see costs.kt for the Kotlin mirror
 * @see backend/src/.../controller/CostController.kt for the endpoint
 */

/** Berlin districts (Bezirke) */
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

/** Query parameters for GET /api/v1/costs/estimate */
export interface CostEstimateQuery {
  /** District to estimate costs for */
  bezirk: Bezirk;
  /** Number of rooms in the apartment */
  rooms: number;
}

/** Monthly cost breakdown for a neighborhood */
export interface CostEstimate {
  /** The district this estimate is for */
  bezirk: Bezirk;
  /** Display name of the district */
  displayName: string;
  /** Number of rooms requested */
  rooms: number;
  /** Rent range in EUR/month */
  rentRange: {
    min: number;
    max: number;
    median: number;
  };
  /** Estimated monthly utility costs (Nebenkosten) in EUR */
  utilities: number;
  /** Monthly public transport pass (BVG AB zone) in EUR */
  transport: number;
  /** Estimated monthly grocery costs in EUR */
  groceries: number;
  /** Total estimated monthly costs (using median rent) */
  totalEstimated: number;
}

/** Neighborhood profile for the explorer view */
export interface NeighborhoodProfile {
  /** District identifier */
  bezirk: Bezirk;
  /** Display name */
  displayName: string;
  /** Short character description */
  vibe: string;
  /** Average commute time to city center in minutes */
  commuteMinutes: number;
  /** Key highlights (3-5 bullet points) */
  highlights: string[];
}
