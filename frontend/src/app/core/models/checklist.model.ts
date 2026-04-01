export type VisaType = 'eu-blue-card' | 'freelance' | 'job-seeker';

export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  category: string;
  visaTypes: VisaType[];
  completed: boolean;
  link?: string;
}

export interface VisaTypeOption {
  value: VisaType;
  label: string;
  description: string;
  link: string;
}

export const VISA_TYPE_OPTIONS: VisaTypeOption[] = [
  {
    value: 'eu-blue-card',
    label: 'EU Blue Card',
    description:
      'For skilled workers with a recognized degree and a job offer meeting the salary threshold (EUR 4,225/month or EUR 3,828/month for shortage occupations).',
    link: 'https://service.berlin.de/dienstleistung/324659/en/',
  },
  {
    value: 'freelance',
    label: 'Freelance Visa',
    description:
      'For self-employed professionals (Freiberufler) under §18 EStG — artists, writers, engineers, consultants, and similar independent professions.',
    link: 'https://service.berlin.de/dienstleistung/328332/en/',
  },
  {
    value: 'job-seeker',
    label: 'Job Seeker Visa',
    description:
      'Up to 18 months to find qualified employment in Germany. Requires a recognized degree and proof of sufficient funds.',
    link: 'https://service.berlin.de/dienstleistung/324661/en/',
  },
];

export function getDefaultChecklist(): ChecklistItem[] {
  return [
    // ── Pre-Arrival ──
    {
      id: 'visa-application',
      title: 'Apply for visa at German embassy',
      description:
        'Submit your visa application with all required documents at the German embassy in your home country. Processing typically takes 4-12 weeks. Apply via the LEA online portal if eligible.',
      category: 'Pre-Arrival',
      visaTypes: ['eu-blue-card', 'freelance', 'job-seeker'],
      completed: false,
      link: 'https://www.berlin.de/einwanderung/en/',
    },
    {
      id: 'health-insurance',
      title: 'Arrange German health insurance',
      description:
        'Mandatory for all residents. Public insurance (GKV) is required for employees earning under EUR 73,800/year — TK (Techniker Krankenkasse) is the most expat-friendly. Freelancers and high earners may opt for private insurance (PKV). Foreign coverage is not accepted.',
      category: 'Pre-Arrival',
      visaTypes: ['eu-blue-card', 'freelance', 'job-seeker'],
      completed: false,
    },
    {
      id: 'job-contract',
      title: 'Sign employment contract',
      description:
        'Your contract must be with a German employer for at least 6 months. Salary threshold: EUR 4,225/month (standard) or EUR 3,828/month (shortage occupations / recent graduates within 3 years). Bonuses and variable pay are excluded from the calculation.',
      category: 'Pre-Arrival',
      visaTypes: ['eu-blue-card'],
      completed: false,
    },
    {
      id: 'client-contracts',
      title: 'Prepare client contracts or letters of intent',
      description:
        'You need 2+ letters of intent or signed contracts demonstrating business viability. Also prepare a revenue forecast, CV with qualifications, and proof of professional license if your field requires one.',
      category: 'Pre-Arrival',
      visaTypes: ['freelance'],
      completed: false,
    },
    {
      id: 'business-plan',
      title: 'Write business plan and financing plan',
      description:
        'Required for self-employed (Selbständige) applicants. Include a detailed business concept, company profile, and financing plan. LEA provides a financing plan template.',
      category: 'Pre-Arrival',
      visaTypes: ['freelance'],
      completed: false,
    },
    {
      id: 'qualification-proof',
      title: 'Get degree recognized (Anerkennung)',
      description:
        'Your university degree must be recognized as equivalent to a German degree. Check the anabin database for your institution. For Blue Card, the degree must qualify under §18g AufenthG. IT professionals with 3+ years experience may qualify without a degree.',
      category: 'Pre-Arrival',
      visaTypes: ['eu-blue-card', 'job-seeker'],
      completed: false,
      link: 'https://anabin.kmk.org/anabin.html',
    },
    {
      id: 'find-housing',
      title: 'Find temporary or permanent housing',
      description:
        'You need a registered address for Anmeldung. Your landlord must provide a Wohnungsgeberbestätigung (move-in confirmation) within 2 weeks. Temporary housing (wunderflats.com, housinganywhere.com) works for initial registration.',
      category: 'Pre-Arrival',
      visaTypes: ['eu-blue-card', 'freelance', 'job-seeker'],
      completed: false,
    },
    // ── First Week ──
    {
      id: 'anmeldung',
      title: 'Register your address (Anmeldung)',
      description:
        'Legally required within 14 days of moving in. Book an appointment at any Bürgeramt online. Bring your passport, the completed registration form, and the Wohnungsgeberbestätigung from your landlord. Free of charge. You will receive a Meldebescheinigung — this document is required for almost everything else.',
      category: 'First Week',
      visaTypes: ['eu-blue-card', 'freelance', 'job-seeker'],
      completed: false,
      link: 'https://service.berlin.de/dienstleistung/120686/',
    },
    {
      id: 'bank-account',
      title: 'Open a German bank account',
      description:
        'N26 or Bunq can be opened before Anmeldung (digital banks, English support, free basic account). Traditional banks (Commerzbank, Deutsche Bank) require Anmeldung first. You will need a German IBAN for salary, rent, and Rundfunkbeitrag.',
      category: 'First Week',
      visaTypes: ['eu-blue-card', 'freelance', 'job-seeker'],
      completed: false,
    },
    {
      id: 'tax-id',
      title: 'Receive tax ID (Steueridentifikationsnummer)',
      description:
        'An 11-digit permanent ID sent automatically by mail 2-6 weeks after Anmeldung. Your employer needs this to withhold the correct income tax — without it, the highest tax class is applied. If urgent, visit your local Finanzamt with your passport to get it same-day.',
      category: 'First Week',
      visaTypes: ['eu-blue-card', 'freelance', 'job-seeker'],
      completed: false,
      link: 'https://www.bzst.de/EN/Private_individuals/Tax_identification_number/tax_identification_number_node.html',
    },
    {
      id: 'deutschlandticket',
      title: 'Get a Deutschlandticket',
      description:
        'EUR 63/month for unlimited access to all local and regional public transit nationwide — U-Bahn, S-Bahn, buses, trams, and regional trains. Available via the BVG app, DB Navigator, or at ticket machines. This is the standard choice for Berlin residents.',
      category: 'First Week',
      visaTypes: ['eu-blue-card', 'freelance', 'job-seeker'],
      completed: false,
      link: 'https://www.bvg.de/en/subscriptions-and-tickets/all-subscriptions/deutschland-ticket',
    },
    // ── First Month ──
    {
      id: 'auslaenderbehorde',
      title: 'Apply for residence permit at LEA',
      description:
        'Apply online via the Landesamt für Einwanderung (LEA) portal. Upload color passport copies, employment/client contracts, degree credentials, health insurance proof, Meldebescheinigung, and lease. Pay the fee (EUR 100 for eAT card) by credit card. The eAT card takes 4-6 weeks after your appointment.',
      category: 'First Month',
      visaTypes: ['eu-blue-card', 'freelance', 'job-seeker'],
      completed: false,
      link: 'https://www.berlin.de/einwanderung/en/',
    },
    {
      id: 'finanzamt-registration',
      title: 'Register with tax office (Finanzamt)',
      description:
        'Submit the Fragebogen zur steuerlichen Erfassung to your local Finanzamt. This registers you for income tax and VAT (if applicable). You will receive a Steuernummer (tax number) within 2-6 weeks — required on all invoices and your website Impressum.',
      category: 'First Month',
      visaTypes: ['freelance'],
      completed: false,
    },
    {
      id: 'liability-insurance',
      title: 'Get liability insurance (Haftpflichtversicherung)',
      description:
        'Covers accidental damage to others\' property or persons. EUR 50-80/year. Nearly universal in Germany — landlords and employers often expect it. Providers: Getsafe (English, digital), Haftpflichthelden, or check24.de.',
      category: 'First Month',
      visaTypes: ['eu-blue-card', 'freelance', 'job-seeker'],
      completed: false,
    },
    {
      id: 'phone-contract',
      title: 'Get a German phone number',
      description:
        'Prepaid SIM: Aldi Talk, Lidl Connect, or Lebara (no contract, buy at supermarket). Postpaid: O2, Telekom, or Vodafone (better coverage, requires Anmeldung and German bank account). Video-ident verification required for all SIM activations.',
      category: 'First Month',
      visaTypes: ['eu-blue-card', 'freelance', 'job-seeker'],
      completed: false,
    },
    {
      id: 'schufa',
      title: 'Build your Schufa credit history',
      description:
        'Germany\'s credit scoring system (0-100). Starts automatically when you register your address, open a bank account, and get phone/utility contracts. Pay all bills on time. Request your free annual report (Datenkopie) at meineschufa.de. Landlords often require a paid Bonitätsauskunft.',
      category: 'First Month',
      visaTypes: ['eu-blue-card', 'freelance', 'job-seeker'],
      completed: false,
      link: 'https://www.meineschufa.de',
    },
    // ── Settling In ──
    {
      id: 'german-classes',
      title: 'Enroll in German language classes',
      description:
        'VHS (Volkshochschule) offers affordable courses at all levels. Goethe-Institut for intensive courses. A1-B1 is enough for daily life; B2 significantly improves job prospects. Many employers offer subsidized German courses.',
      category: 'Settling In',
      visaTypes: ['eu-blue-card', 'freelance', 'job-seeker'],
      completed: false,
    },
    {
      id: 'rundfunkbeitrag',
      title: 'Register for broadcasting fee (Rundfunkbeitrag)',
      description:
        'EUR 18.36/month per household (not per person). Mandatory regardless of whether you own a TV or radio. Register at rundfunkbeitrag.de. In a shared flat (WG), only one person pays — others file exemption forms. Pay via SEPA direct debit.',
      category: 'Settling In',
      visaTypes: ['eu-blue-card', 'freelance', 'job-seeker'],
      completed: false,
      link: 'https://www.rundfunkbeitrag.de',
    },
    {
      id: 'find-doctor',
      title: 'Find a Hausarzt (family doctor)',
      description:
        'Register with a general practitioner near your home. Use jameda.de or doctolib.de for English-speaking doctors and reviews. Referrals to specialists (Facharzt) usually go through your Hausarzt. Bring your insurance card (Gesundheitskarte) to appointments.',
      category: 'Settling In',
      visaTypes: ['eu-blue-card', 'freelance', 'job-seeker'],
      completed: false,
    },
  ];
}
