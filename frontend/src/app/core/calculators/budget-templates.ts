import type { Bezirk } from '../models/cost.model';

export function getBezirkTips(bezirk: Bezirk, displayName: string): string[] {
  switch (bezirk) {
    case 'friedrichshain-kreuzberg': return [
      `**${displayName} tip:** Join the Kreuzberg community groups on nebenan.de for furniture swaps, neighborhood events, and local recommendations.`,
      `**Rent competition:** This is one of Berlin's most competitive rental markets. Prepare a complete Bewerbungsmappe (application folder) with Schufa, pay slips, and a personal cover letter.`,
    ];
    case 'mitte': return [
      `**${displayName} tip:** Avoid tourist-trap restaurants near Alexanderplatz. Walk 10 minutes in any direction for better food at half the price.`,
      `**Coworking:** If you work remotely, ${displayName} has Berlin's highest density of coworking spaces — many offer free trial days.`,
    ];
    case 'pankow': return [
      `**${displayName} tip:** Sunday mornings at Mauerpark (flea market + karaoke) are a Prenzlauer Berg institution. Get there before 11 for the best finds.`,
      `**Family-friendly:** If you have kids, Pankow's playgrounds and Kindercafés are among Berlin's best.`,
    ];
    case 'charlottenburg-wilmersdorf': return [
      `**${displayName} tip:** Explore beyond Ku'damm — the side streets of Charlottenburg have excellent independent restaurants and hidden courtyards (Hinterhöfe).`,
      `**Expat hub:** Large English-speaking community and many international services, making the transition easier.`,
    ];
    case 'spandau': return [
      `**${displayName} tip:** Spandau's old town (Altstadt) has charm that most Berliners never discover. The Christmas market is also one of Berlin's best.`,
      `**Commute planning:** Factor in the longer commute. The RE1 regional train can be faster than the S-Bahn for reaching central Berlin.`,
    ];
    case 'steglitz-zehlendorf': return [
      `**${displayName} tip:** Schlachtensee and Krumme Lanke are perfect for summer swimming — a major quality-of-life perk.`,
      `**University area:** If you're in academia or tech, the Freie Universität ecosystem includes meetups, lectures, and networking events open to the public.`,
    ];
    case 'tempelhof-schoeneberg': return [
      `**${displayName} tip:** Tempelhofer Feld is one of the world's most unique parks — a former airport with 2 km runways for skating, cycling, and kiteboarding.`,
      `**Winterfeldtplatz market:** The Saturday market in Schöneberg is one of Berlin's best for fresh produce, cheese, and street food.`,
    ];
    case 'neukoelln': return [
      `**${displayName} tip:** The 48 Stunden Neukölln art festival (June) is free and showcases the neighborhood's incredible creative scene.`,
      `**Food scene:** Sonnenallee ("Arab Street") has some of Berlin's best Middle Eastern food at unbeatable prices.`,
    ];
    case 'treptow-koepenick': return [
      `**${displayName} tip:** Rent a kayak or paddleboard on the Dahme or Spree — water sports access is a unique Köpenick advantage.`,
      `**Adlershof:** If you work in tech or science, the Adlershof science and technology park is a growing employment hub right in the Bezirk.`,
    ];
    case 'marzahn-hellersdorf': return [
      `**${displayName} tip:** Gärten der Welt (Gardens of the World) is a hidden gem — beautifully landscaped themed gardens and a cable car with city views.`,
      `**Space for less:** The Plattenbau apartments here offer significantly more square meters per euro than anywhere else in Berlin.`,
    ];
    case 'lichtenberg': return [
      `**${displayName} tip:** Dong Xuan Center is Berlin's Vietnamese market — incredible Phở, fresh ingredients, and unique finds you won't get anywhere else.`,
      `**Tierpark:** Europe's largest zoo by area is in Lichtenberg and offers annual passes — great value for families or regular visitors.`,
    ];
    case 'reinickendorf': return [
      `**${displayName} tip:** The Greenwich Promenade along Tegeler See is one of Berlin's most underrated waterfront walks.`,
      `**Tegel redevelopment:** The former airport area is being transformed into a tech and research hub — property values and amenities are expected to improve significantly.`,
    ];
    default: return [];
  }
}

export const RUNDFUNKBEITRAG = 18.36;
export const BVG_AB_PASS = 58.0;
export const BVG_ABC_PASS = 107.0;
