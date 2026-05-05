import type {
  AnalysisContext, AnalysisSection, BudgetAnalysis, BudgetCategory,
} from '../models/budget.model';
import type { NeighborhoodProfile } from '../models/cost.model';
import { getBezirkTips, RUNDFUNKBEITRAG, BVG_AB_PASS, BVG_ABC_PASS } from './budget-templates';
import { getNeighborhoodProfile } from './cost-estimator';

export function analyzeFromTemplate(ctx: AnalysisContext): BudgetAnalysis {
  const profile = getNeighborhoodProfile(ctx.bezirk);
  const categoryMap = new Map<string, BudgetCategory>(ctx.categories.map(c => [c.key, c]));
  const totalAllocated = ctx.totalAllocated ?? ctx.categories.reduce((s, c) => s + c.total, 0);
  const remaining = ctx.remainingMonthly ?? (ctx.netMonthlySalary - totalAllocated);

  const sections: AnalysisSection[] = [
    buildDailyLifeSection(ctx, profile, remaining),
    buildHousingSection(ctx, categoryMap, profile),
    buildFoodAndDiningSection(ctx, categoryMap, profile),
    buildTransportSection(ctx, categoryMap, profile),
    buildLeisureSection(ctx, categoryMap, profile),
    buildFinancialHealthSection(ctx, categoryMap, remaining),
    buildTipsSection(ctx, categoryMap, profile, remaining),
  ];

  return { sections, generatedAt: new Date().toISOString() };
}

function buildDailyLifeSection(
  ctx: AnalysisContext,
  profile: NeighborhoodProfile,
  remaining: number,
): AnalysisSection {
  const bezirkName = ctx.bezirkDisplayName ?? profile.displayName;
  const vibe = ctx.neighborhoodVibe;

  let commuteNote: string;
  if (profile.commuteMinutesMin <= 5 && profile.commuteMinutesMax <= 25) {
    commuteNote = `You're in the center — most destinations are ${profile.commuteMinutesMin}-${profile.commuteMinutesMax} minutes away.`;
  } else if (profile.commuteMinutesMin <= 15) {
    commuteNote = `With a ${profile.commuteMinutesMin}-${profile.commuteMinutesMax} minute commute to Mitte, you're close enough to bike on good days.`;
  } else if (profile.commuteMinutesMin <= 25) {
    commuteNote = `The ${profile.commuteMinutesMin}-${profile.commuteMinutesMax} minute commute is typical for Berlin — a podcast episode on the U-Bahn and you're there.`;
  } else {
    commuteNote = `The ${profile.commuteMinutesMin}-${profile.commuteMinutesMax} minute commute is on the longer side, but you gain space and quiet in return.`;
  }

  let budgetTone: string;
  if (remaining > 200) {
    budgetTone = 'Your budget has comfortable breathing room — enough for spontaneous weekend trips or saving for bigger goals.';
  } else if (remaining > 0) {
    budgetTone = "Your budget is tight but balanced. You'll need to be intentional, but that's Berlin — the city rewards the resourceful.";
  } else {
    budgetTone = 'Your budget is stretched beyond your income. Some categories will need trimming before this plan is sustainable.';
  }

  let sentiment: AnalysisSection['sentiment'];
  if (remaining > 200) sentiment = 'positive';
  else if (remaining > 0) sentiment = 'neutral';
  else sentiment = 'caution';

  const body = `**${bezirkName}** — ${vibe}

${commuteNote}

${budgetTone}

With a net monthly income of **${formatEur(ctx.netMonthlySalary)}**, here's how your budget plays out in one of Berlin's most distinctive neighborhoods.`;

  return {
    key: 'daily-life',
    heading: `Your Day in ${bezirkName}`,
    body,
    sentiment,
  };
}

function buildHousingSection(
  ctx: AnalysisContext,
  categoryMap: Map<string, BudgetCategory>,
  profile: NeighborhoodProfile,
): AnalysisSection {
  const rent = categoryMap.get('rent');
  const utilities = categoryMap.get('utilities');
  const rentTotal = rent?.total ?? 0.0;
  const utilitiesTotal = utilities?.total ?? 0.0;
  const warmmiete = rentTotal + utilitiesTotal;
  const rentRange = ctx.rentRange;
  const rentRatio = ctx.netMonthlySalary > 0 ? (rentTotal / ctx.netMonthlySalary) * 100 : 0.0;
  const bezirkName = ctx.bezirkDisplayName ?? profile.displayName;

  let marketPosition: string;
  if (rentTotal < rentRange.min) {
    marketPosition = 'below the lower quartile — an excellent deal if you can find it, though competition will be fierce.';
  } else if (rentTotal <= rentRange.median) {
    marketPosition = 'at or below the median — realistic, especially if you start your search early and have your documents ready (Schufa, proof of income, Mietschuldenfreiheitsbescheinigung).';
  } else if (rentTotal <= rentRange.max) {
    marketPosition = "above the median but within the upper quartile. You'll have more options, but consider whether the extra cost is worth it.";
  } else {
    marketPosition = `above the upper quartile for ${bezirkName}. At this level, you might find better value in a neighboring Bezirk.`;
  }

  let ratioWarning: string;
  if (rentRatio > 40) {
    ratioWarning = `\n\n> **Warning:** Your rent-to-income ratio is **${formatPct(rentRatio)}** — well above the 30% threshold German landlords typically look for. This may also make it harder to get approved.`;
  } else if (rentRatio > 30) {
    ratioWarning = `\n\n> **Note:** At **${formatPct(rentRatio)}**, your rent-to-income ratio exceeds the commonly recommended 30% ceiling. It's manageable, but leaves less room for other expenses.`;
  } else {
    ratioWarning = '';
  }

  let sentiment: AnalysisSection['sentiment'];
  if (rentRatio > 40 || rentTotal > rentRange.max) sentiment = 'caution';
  else if (rentRatio > 30 || rentTotal > rentRange.median) sentiment = 'neutral';
  else sentiment = 'positive';

  const body = `You've allocated **${formatEur(rentTotal)}** for Kaltmiete (cold rent) in **${bezirkName}** for a **${ctx.rooms}-room** apartment.

The current market range is **${formatEur(rentRange.min)}** – **${formatEur(rentRange.max)}** (median **${formatEur(rentRange.median)}**). Your budget lands ${marketPosition}

With Nebenkosten (utilities) at **${formatEur(utilitiesTotal)}**, your total Warmmiete comes to **${formatEur(warmmiete)}** per month.${ratioWarning}`;

  return {
    key: 'housing',
    heading: `Housing in ${bezirkName}`,
    body,
    sentiment,
  };
}

function buildFoodAndDiningSection(
  ctx: AnalysisContext,
  categoryMap: Map<string, BudgetCategory>,
  profile: NeighborhoodProfile,
): AnalysisSection {
  const groceries = categoryMap.get('groceries')?.total ?? 0.0;
  const dining = categoryMap.get('dining')?.total ?? 0.0;
  const combinedFood = groceries + dining;
  const bezirkName = ctx.bezirkDisplayName ?? profile.displayName;

  let groceryContext: string;
  if (groceries >= 350) {
    groceryContext = `At **${formatEur(groceries)}** for groceries, you can comfortably shop at Bio Company or the weekly farmers' markets without constantly checking prices. Mixing in Aldi or Lidl runs will stretch it even further.`;
  } else if (groceries >= 250) {
    groceryContext = `**${formatEur(groceries)}** for groceries is workable if you lean on Aldi, Lidl, and the Turkish supermarkets. Supplement with seasonal produce from the weekly markets — the quality-to-price ratio is unbeatable.`;
  } else {
    groceryContext = `**${formatEur(groceries)}** is tight for groceries. You'll want to plan meals around Aldi/Lidl specials and visit the Turkish Market on Maybachufer (Tuesdays and Fridays) for cheap, fresh produce.`;
  }

  let diningContext: string;
  if (dining >= 150) {
    diningContext = `With **${formatEur(dining)}** for dining out, you can enjoy Berlin's restaurant scene regularly — from a quick Döner (€5–7) to sit-down meals. ${bezirkName} has no shortage of options.`;
  } else if (dining >= 80) {
    diningContext = `**${formatEur(dining)}** for dining allows for occasional restaurant meals and plenty of street food. A tip: many Berlin restaurants have great lunch specials (Mittagstisch) for €8–12.`;
  } else if (dining > 0) {
    diningContext = `At **${formatEur(dining)}**, dining out will be occasional. Focus on Berlin's incredible street food scene — falafel wraps, currywurst, and Vietnamese bánh mì are all under €6.`;
  } else {
    diningContext = "No dining budget allocated. Berlin's street food is famously cheap — even €30–40/month opens up occasional treats.";
  }

  let sentiment: AnalysisSection['sentiment'];
  if (combinedFood >= 400) sentiment = 'positive';
  else if (combinedFood >= 300) sentiment = 'neutral';
  else sentiment = 'caution';

  const body = `${groceryContext}

${diningContext}

**Berlin food tip:** The combination of discount supermarkets, ethnic grocery stores, and weekly markets makes Berlin one of the most affordable cities in Western Europe for food — if you know where to look.`;

  return {
    key: 'food-and-dining',
    heading: 'Food & Dining',
    body,
    sentiment,
  };
}

function buildTransportSection(
  ctx: AnalysisContext,
  categoryMap: Map<string, BudgetCategory>,
  profile: NeighborhoodProfile,
): AnalysisSection {
  const transport = categoryMap.get('transport')?.total ?? 0.0;
  const bezirkName = ctx.bezirkDisplayName ?? profile.displayName;

  let passAnalysis: string;
  if (transport >= BVG_ABC_PASS) {
    passAnalysis = `Your **${formatEur(transport)}** transport budget covers the **ABC-zone pass (€${Math.trunc(BVG_ABC_PASS)}/month)** with room for occasional taxi rides or a bike-sharing subscription. The ABC zone extends to Potsdam and the Brandenburg countryside.`;
  } else if (transport >= BVG_AB_PASS) {
    const surplus = transport - BVG_AB_PASS;
    if (surplus >= 20) {
      passAnalysis = `Your **${formatEur(transport)}** covers the **AB-zone pass (€${Math.trunc(BVG_AB_PASS)}/month)** with **${formatEur(surplus)}** left for occasional Einzelfahrscheine to zone C or a Swapfiets bike subscription (~€20/month).`;
    } else {
      passAnalysis = `Your **${formatEur(transport)}** covers the **BVG AB-zone monthly pass (€${Math.trunc(BVG_AB_PASS)}/month)** — U-Bahn, S-Bahn, bus, tram, and ferry, unlimited.`;
    }
  } else if (transport >= 30) {
    passAnalysis = `At **${formatEur(transport)}**, a monthly pass (€${Math.trunc(BVG_AB_PASS)}) doesn't quite fit. Consider a bicycle as your primary transport and buying 4-trip tickets (4-Fahrten-Karte) for bad weather days.`;
  } else {
    passAnalysis = `**${formatEur(transport)}** is quite low for Berlin transport. A used bike from eBay Kleinanzeigen (€50–100 one-time) could be your best investment — Berlin is flat and bike-friendly.`;
  }

  let commuteContext: string;
  if (profile.commuteMinutesMin > 20) {
    commuteContext = `\n\nFrom **${bezirkName}**, the ${profile.commuteMinutesMin}-${profile.commuteMinutesMax} minute commute to central Berlin makes the Deutschlandticket essential.`;
  } else if (profile.commuteMinutesMin > 5) {
    commuteContext = `\n\n**${bezirkName}** is well-connected — at ${profile.commuteMinutesMin}-${profile.commuteMinutesMax} minutes to Mitte, you might find yourself biking as often as taking the train.`;
  } else {
    commuteContext = '';
  }

  let sentiment: AnalysisSection['sentiment'];
  if (transport >= BVG_AB_PASS) sentiment = 'positive';
  else if (transport >= 30) sentiment = 'neutral';
  else sentiment = 'caution';

  const body = `${passAnalysis}${commuteContext}`;

  return {
    key: 'transport-and-mobility',
    heading: 'Transport & Mobility',
    body,
    sentiment,
  };
}

function buildLeisureSection(
  ctx: AnalysisContext,
  categoryMap: Map<string, BudgetCategory>,
  profile: NeighborhoodProfile,
): AnalysisSection {
  const entertainment = categoryMap.get('entertainment')?.total ?? 0.0;
  const dining = categoryMap.get('dining')?.total ?? 0.0;
  const combined = entertainment + dining;
  const bezirkName = ctx.bezirkDisplayName ?? profile.displayName;

  let cultureContext: string;
  if (entertainment >= 150) {
    cultureContext = `With **${formatEur(entertainment)}** for entertainment, Berlin is your playground. Cinema (~€12), concerts (€15–40), museum days, and spontaneous bar nights are all comfortably in reach.`;
  } else if (entertainment >= 80) {
    cultureContext = `**${formatEur(entertainment)}** gives you a solid cultural budget. Catch free open-air events in summer, visit museums on their free/reduced days, and still have room for a few concerts or cinema trips.`;
  } else if (entertainment >= 30) {
    cultureContext = `At **${formatEur(entertainment)}**, you'll be selective — but Berlin rewards that. Free gallery openings, Mauerpark karaoke, park barbecues, and the city's legendary free open-air scene mean you'll never be bored.`;
  } else {
    cultureContext = "Berlin's secret: you can have an incredible cultural life for almost nothing. Free gallery openings on weekends, Mauerpark Sundays, Tempelhofer Feld sunsets, and community events fill the calendar year-round.";
  }

  const bezirkHighlights = ctx.neighborhoodHighlights;
  let localColor: string;
  if (bezirkHighlights && bezirkHighlights.length > 0) {
    const highlights = bezirkHighlights.slice(0, 3).join(', ');
    localColor = `\n\n**In ${bezirkName} specifically:** ${highlights} — all part of the local character you'll get to know.`;
  } else {
    localColor = '';
  }

  let sentiment: AnalysisSection['sentiment'];
  if (combined >= 200) sentiment = 'positive';
  else if (combined >= 100) sentiment = 'neutral';
  else sentiment = 'caution';

  const body = `${cultureContext}${localColor}`;

  return {
    key: 'leisure-and-culture',
    heading: 'Leisure & Culture',
    body,
    sentiment,
  };
}

function buildFinancialHealthSection(
  ctx: AnalysisContext,
  categoryMap: Map<string, BudgetCategory>,
  remaining: number,
): AnalysisSection {
  const savings = categoryMap.get('savings')?.total ?? 0.0;
  const savingsRate = ctx.netMonthlySalary > 0 ? (savings / ctx.netMonthlySalary) * 100 : 0.0;
  const totalExpenses = ctx.netMonthlySalary - savings;
  const emergencyMonths = savings > 0 ? (totalExpenses * 3) / savings : Number.MAX_VALUE;

  let savingsAnalysis: string;
  if (savingsRate >= 20) {
    savingsAnalysis = `Your savings rate of **${formatPct(savingsRate)}** (${formatEur(savings)}/month) exceeds the commonly recommended 20%. At this pace, you'll build a 3-month emergency fund in **${formatMonths(emergencyMonths)}**.`;
  } else if (savingsRate >= 10) {
    savingsAnalysis = `A **${formatPct(savingsRate)}** savings rate (${formatEur(savings)}/month) is a reasonable start. The standard recommendation is 20%, but in an expensive city like Berlin, 10–15% is pragmatic while you settle in. A 3-month emergency fund would take **${formatMonths(emergencyMonths)}**.`;
  } else if (savingsRate > 0) {
    savingsAnalysis = `At **${formatPct(savingsRate)}** (${formatEur(savings)}/month), your savings rate is below the 10% minimum most financial advisors recommend. Building an emergency fund will take **${formatMonths(emergencyMonths)}** — consider whether any other categories can be trimmed.`;
  } else {
    savingsAnalysis = "You haven't allocated anything to savings. Even €50–100/month creates a safety net over time. In Germany, unexpected costs (Nachzahlung for utilities, appliance repairs) can hit without warning.";
  }

  let remainingNote: string;
  if (remaining > 100) {
    remainingNote = `\n\nYou have **${formatEur(remaining)}** unallocated — consider directing some of this to savings or an investment account (many German banks offer free ETF Sparpläne).`;
  } else if (remaining > 0) {
    remainingNote = `\n\nYour budget leaves **${formatEur(remaining)}** unallocated — a thin but useful buffer for unexpected expenses.`;
  } else if (remaining < -50) {
    remainingNote = `\n\n> **Your budget is ${formatEur(-remaining)} over your net income.** This plan isn't sustainable as-is. Review your largest categories for possible reductions.`;
  } else if (remaining < 0) {
    remainingNote = `\n\nYour budget slightly exceeds your income by **${formatEur(-remaining)}**. Small adjustments to one or two categories should bring it into balance.`;
  } else {
    remainingNote = '';
  }

  let sentiment: AnalysisSection['sentiment'];
  if (savingsRate >= 20) sentiment = 'positive';
  else if (savingsRate >= 10) sentiment = 'neutral';
  else sentiment = 'caution';

  const body = `${savingsAnalysis}${remainingNote}`;

  return {
    key: 'financial-health',
    heading: 'Financial Health',
    body,
    sentiment,
  };
}

function buildTipsSection(
  ctx: AnalysisContext,
  categoryMap: Map<string, BudgetCategory>,
  profile: NeighborhoodProfile,
  remaining: number,
): AnalysisSection {
  const bezirkName = ctx.bezirkDisplayName ?? profile.displayName;
  const tips: string[] = [];

  tips.push("**Anmeldung first:** Register your address at the Bürgeramt within 14 days of moving in. Book the appointment *before* you arrive — slots fill up weeks in advance.");
  tips.push(`**Rundfunkbeitrag:** Budget €${RUNDFUNKBEITRAG.toFixed(2)}/month for the mandatory public broadcasting fee. It's per household, not per person.`);
  tips.push("**Haftpflichtversicherung:** Personal liability insurance (~€5–8/month) is practically mandatory in Germany. It covers accidental damage to rental property, other people's belongings, etc.");

  const savings = categoryMap.get('savings')?.total ?? 0.0;
  const groceries = categoryMap.get('groceries')?.total ?? 0.0;
  const rent = categoryMap.get('rent')?.total ?? 0.0;

  if (savings < ctx.netMonthlySalary * 0.1) {
    tips.push("**Savings boost:** Open a Tagesgeldkonto (instant-access savings) at a German online bank. Set up an automatic Dauerauftrag (standing order) on payday — even €50/month adds up.");
  }

  if (groceries < 300) {
    tips.push("**Grocery savings:** The Tuesday and Friday Turkish Market at Maybachufer (Neukölln) has the best prices for fresh produce in the city. Also check Too Good To Go app for restaurant surplus bags (€3–5).");
  }

  if (rent > ctx.rentRange.max) {
    tips.push(`**Rent negotiation:** Your budget exceeds the upper quartile for ${bezirkName}. Consider looking at neighboring Bezirke or WG (shared apartment) options to bring this down.`);
  }

  const bezirkTips = getBezirkTips(ctx.bezirk, bezirkName);
  for (const tip of bezirkTips) {
    tips.push(tip);
  }

  if (ctx.hasChildren === true && (ctx.childCount ?? 0) > 0) {
    tips.push("**Kindergeld:** Don't forget to apply for Kindergeld (child benefit) — currently €250/month per child. Apply through the Familienkasse as soon as you have your Anmeldung.");
    tips.push("**Kita:** Start looking for daycare (Kita) immediately. Waiting lists can be 6–12 months. The Kita-Gutschein system means childcare is heavily subsidized in Berlin.");
  }

  if (remaining < 0) {
    tips.push(`**Budget gap:** Your allocations exceed your income by ${formatEur(-remaining)}. Before committing to an apartment, revisit your largest expense categories.`);
  }

  const body = tips.map(t => `- ${t}`).join('\n\n');

  return {
    key: 'tips',
    heading: 'Berlin Survival Tips',
    body,
    sentiment: 'neutral',
  };
}

function formatEur(value: number): string {
  return `€${Math.round(value)}`;
}

function formatPct(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatMonths(months: number): string {
  if (months >= 120) return 'over 10 years';
  if (months >= 24) return `about ${(months / 12).toFixed(0)} years`;
  if (months >= 12) return 'about a year';
  return `${months.toFixed(0)} months`;
}
