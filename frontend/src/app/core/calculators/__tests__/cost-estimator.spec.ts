import { describe, it, expect } from 'vitest';
import { estimateCosts, getAllProfiles } from '../cost-estimator';
import { COST_MITTE, COST_SPANDAU, COST_FHXBG, NEIGHBORHOODS } from './fixtures';

describe('cost-estimator parity vs Kotlin', () => {
  it('matches Mitte 2-room', () => expect(estimateCosts('mitte', 2)).toEqual(COST_MITTE));
  it('matches Spandau 3-room', () => expect(estimateCosts('spandau', 3)).toEqual(COST_SPANDAU));
  it('matches Friedrichshain-Kreuzberg 1-room', () => expect(estimateCosts('friedrichshain-kreuzberg', 1)).toEqual(COST_FHXBG));
  it('returns all 12 neighborhoods in expected order', () => expect(getAllProfiles()).toEqual(NEIGHBORHOODS));
});
