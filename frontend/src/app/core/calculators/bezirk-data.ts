import type { Bezirk, NeighborhoodProfile, RentRange } from '../models/cost.model';

export const BVG_MONTHLY = 58.0;
export const GROCERIES_SINGLE = 300.0;
export const NEBENKOSTEN_PER_SQM = 3.5;

export const AVG_SQM_BY_ROOMS: Record<number, number> = {
  1: 35, 2: 55, 3: 80, 4: 105, 5: 130,
};

export const RENT_PER_SQM = new Map<Bezirk, RentRange>([
  ['mitte',                      { min: 14.0, max: 22.0, median: 17.5 }],
  ['friedrichshain-kreuzberg',   { min: 13.0, max: 20.0, median: 16.0 }],
  ['pankow',                     { min: 11.0, max: 17.0, median: 13.5 }],
  ['charlottenburg-wilmersdorf', { min: 12.5, max: 20.0, median: 15.5 }],
  ['spandau',                    { min:  8.5, max: 13.0, median: 10.5 }],
  ['steglitz-zehlendorf',        { min: 10.0, max: 16.0, median: 12.5 }],
  ['tempelhof-schoeneberg',      { min: 11.0, max: 17.5, median: 14.0 }],
  ['neukoelln',                  { min: 10.5, max: 16.5, median: 13.0 }],
  ['treptow-koepenick',          { min: 10.0, max: 15.5, median: 12.0 }],
  ['marzahn-hellersdorf',        { min:  7.5, max: 11.5, median:  9.5 }],
  ['lichtenberg',                { min:  9.0, max: 14.0, median: 11.0 }],
  ['reinickendorf',              { min:  8.5, max: 13.5, median: 10.5 }],
]);

export const PROFILES = new Map<Bezirk, NeighborhoodProfile>([
  ['mitte', {
    bezirk: 'mitte',
    displayName: 'Mitte',
    vibe: 'The historic and governmental heart of Berlin. Tourist-heavy but culturally rich.',
    commuteMinutesMin: 5, commuteMinutesMax: 25,
    highlights: [
      'Museum Island & Brandenburg Gate',
      'Excellent transit connections (U/S-Bahn hub)',
      'International dining scene',
      'High density of coworking spaces',
      'Expensive but central',
    ],
  }],
  ['friedrichshain-kreuzberg', {
    bezirk: 'friedrichshain-kreuzberg',
    displayName: 'Friedrichshain-Kreuzberg',
    vibe: "Berlin's creative and nightlife epicenter. Diverse, vibrant, sometimes chaotic.",
    commuteMinutesMin: 6, commuteMinutesMax: 20,
    highlights: [
      'Best nightlife in Berlin (Berghain, RAW area)',
      'Multicultural food scene (Turkish Market, Markthalle Neun)',
      'Strong startup and tech community',
      'Beautiful Landwehrkanal for walks',
      'Highly competitive rental market',
    ],
  }],
  ['pankow', {
    bezirk: 'pankow',
    displayName: 'Pankow',
    vibe: 'Family-friendly with a village feel. Prenzlauer Berg is the gentrified gem within.',
    commuteMinutesMin: 11, commuteMinutesMax: 35,
    highlights: [
      "Prenzlauer Berg's café culture and boutiques",
      'Mauerpark Sunday flea market and karaoke',
      'Excellent schools and playgrounds',
      'Green spaces (Volkspark Friedrichshain nearby)',
      'More affordable than Mitte with similar quality',
    ],
  }],
  ['charlottenburg-wilmersdorf', {
    bezirk: 'charlottenburg-wilmersdorf',
    displayName: 'Charlottenburg-Wilmersdorf',
    vibe: 'Old West Berlin elegance. Upscale, quiet, with grand architecture.',
    commuteMinutesMin: 12, commuteMinutesMax: 30,
    highlights: [
      'Kurfürstendamm shopping boulevard',
      'Charlottenburg Palace and gardens',
      'Excellent international schools',
      'Quieter, more residential atmosphere',
      'Strong expat community',
    ],
  }],
  ['spandau', {
    bezirk: 'spandau',
    displayName: 'Spandau',
    vibe: 'A city within a city. Affordable, green, and feels separate from Berlin.',
    commuteMinutesMin: 25, commuteMinutesMax: 55,
    highlights: [
      'Most affordable rents in Berlin',
      'Spandau Citadel (medieval fortress)',
      'Surrounded by rivers and forests',
      'Good for families wanting space',
      'Longer commute to central Berlin',
    ],
  }],
  ['steglitz-zehlendorf', {
    bezirk: 'steglitz-zehlendorf',
    displayName: 'Steglitz-Zehlendorf',
    vibe: 'Leafy, suburban, and academic. Home to Freie Universität.',
    commuteMinutesMin: 25, commuteMinutesMax: 45,
    highlights: [
      'Botanical Garden Berlin',
      'Krumme Lanke and Schlachtensee lakes',
      'University district atmosphere',
      'Very safe and family-friendly',
      'Good balance of price and quality',
    ],
  }],
  ['tempelhof-schoeneberg', {
    bezirk: 'tempelhof-schoeneberg',
    displayName: 'Tempelhof-Schöneberg',
    vibe: 'Diverse and welcoming. Historic LGBTQ+ neighborhood with great parks.',
    commuteMinutesMin: 15, commuteMinutesMax: 30,
    highlights: [
      'Tempelhofer Feld (former airport, now massive park)',
      "Schöneberg's vibrant LGBTQ+ scene",
      'Good mix of cultures and cuisines',
      'Reasonable rents for central location',
      'Excellent U-Bahn connections',
    ],
  }],
  ['neukoelln', {
    bezirk: 'neukoelln',
    displayName: 'Neukölln',
    vibe: 'Rapidly gentrifying but still gritty. Art galleries meet döner shops.',
    commuteMinutesMin: 11, commuteMinutesMax: 30,
    highlights: [
      'Thriving art and music scene',
      'Incredible food diversity',
      'Tempelhofer Feld access',
      'More affordable than Kreuzberg (barely)',
      '48-hour Neukölln arts festival',
    ],
  }],
  ['treptow-koepenick', {
    bezirk: 'treptow-koepenick',
    displayName: 'Treptow-Köpenick',
    vibe: "Berlin's green lung. Lakes, forests, and a small-town feel.",
    commuteMinutesMin: 15, commuteMinutesMax: 45,
    highlights: [
      "Müggelsee (Berlin's largest lake)",
      'Treptower Park with Soviet war memorial',
      'Kayaking and outdoor activities',
      'Affordable rents with nature access',
      'Growing tech presence (Adlershof science park)',
    ],
  }],
  ['marzahn-hellersdorf', {
    bezirk: 'marzahn-hellersdorf',
    displayName: 'Marzahn-Hellersdorf',
    vibe: 'East Berlin Plattenbau district being reinvented. Surprisingly green.',
    commuteMinutesMin: 25, commuteMinutesMax: 45,
    highlights: [
      'Gardens of the World (Gärten der Welt)',
      'Lowest rents in Berlin',
      'Large apartments at budget prices',
      'IGA park and green corridors',
      'Improving transit connections',
    ],
  }],
  ['lichtenberg', {
    bezirk: 'lichtenberg',
    displayName: 'Lichtenberg',
    vibe: 'Up-and-coming East Berlin. Vietnamese community hub with great food.',
    commuteMinutesMin: 12, commuteMinutesMax: 25,
    highlights: [
      'Dong Xuan Center (Vietnamese market)',
      "Tierpark Berlin (Europe's largest zoo by area)",
      'Affordable with improving infrastructure',
      'Growing creative scene',
      'Good S-Bahn and tram connections',
    ],
  }],
  ['reinickendorf', {
    bezirk: 'reinickendorf',
    displayName: 'Reinickendorf',
    vibe: 'Quiet northern district. Lakes, forests, and old Berlin charm.',
    commuteMinutesMin: 20, commuteMinutesMax: 45,
    highlights: [
      'Tegeler See (Tegel Lake)',
      'Former Tegel Airport area being redeveloped',
      'French Quarter (Alt-Tegel)',
      'Affordable rents with good amenities',
      'Greenwich Promenade waterfront',
    ],
  }],
]);
