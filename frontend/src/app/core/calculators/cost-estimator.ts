import type { Bezirk, CostEstimate, NeighborhoodProfile, RentRange } from '../models/cost.model';
import { AVG_SQM_BY_ROOMS, BVG_MONTHLY, GROCERIES_SINGLE, NEBENKOSTEN_PER_SQM, PROFILES, RENT_PER_SQM } from './bezirk-data';

const roundTwo = (v: number) => Math.round(v * 100) / 100;

export function estimateCosts(bezirk: Bezirk, rooms: number): CostEstimate {
  const profile = PROFILES.get(bezirk);
  if (!profile) throw new Error(`Unknown Bezirk: ${bezirk}`);
  const perSqm = RENT_PER_SQM.get(bezirk);
  if (!perSqm) throw new Error(`Missing rent data for Bezirk: ${bezirk}`);
  const clampedRooms = Math.min(5, Math.max(1, rooms));
  const sqm = AVG_SQM_BY_ROOMS[clampedRooms];

  const rentRange: RentRange = {
    min: roundTwo(perSqm.min * sqm),
    max: roundTwo(perSqm.max * sqm),
    median: roundTwo(perSqm.median * sqm),
  };
  const utilities = roundTwo(NEBENKOSTEN_PER_SQM * sqm);
  const totalEstimated = roundTwo(rentRange.median + utilities + BVG_MONTHLY + GROCERIES_SINGLE);

  return {
    bezirk, displayName: profile.displayName, rooms: clampedRooms,
    rentRange, utilities, transport: BVG_MONTHLY, groceries: GROCERIES_SINGLE, totalEstimated,
  };
}

export function getNeighborhoodProfile(bezirk: Bezirk): NeighborhoodProfile {
  const p = PROFILES.get(bezirk);
  if (!p) throw new Error(`Unknown Bezirk: ${bezirk}`);
  return p;
}

export function getAllProfiles(): NeighborhoodProfile[] {
  return Array.from(PROFILES.values());
}
