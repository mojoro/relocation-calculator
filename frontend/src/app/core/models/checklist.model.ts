export type VisaType = 'eu-blue-card' | 'freelance' | 'job-seeker';

export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  category: string;
  visaTypes: VisaType[];
  completed: boolean;
}

export interface VisaTypeOption {
  value: VisaType;
  label: string;
  description: string;
}

export const VISA_TYPE_OPTIONS: VisaTypeOption[] = [
  {
    value: 'eu-blue-card',
    label: 'EU Blue Card',
    description: 'For skilled workers with a job offer paying above the threshold.',
  },
  {
    value: 'freelance',
    label: 'Freelance Visa',
    description: 'For self-employed professionals with clients in Germany.',
  },
  {
    value: 'job-seeker',
    label: 'Job Seeker Visa',
    description: 'For qualified professionals looking for employment (6-month visa).',
  },
];

export function getDefaultChecklist(): ChecklistItem[] {
  return [
    // Pre-Arrival
    {
      id: 'visa-application',
      title: 'Apply for visa at German embassy',
      description: 'Submit your visa application with all required documents. Processing takes 4-12 weeks.',
      category: 'Pre-Arrival',
      visaTypes: ['eu-blue-card', 'freelance', 'job-seeker'],
      completed: false,
    },
    {
      id: 'health-insurance',
      title: 'Arrange health insurance',
      description: 'Public (gesetzliche) or private (private) Krankenversicherung. Required for visa and Anmeldung.',
      category: 'Pre-Arrival',
      visaTypes: ['eu-blue-card', 'freelance', 'job-seeker'],
      completed: false,
    },
    {
      id: 'job-contract',
      title: 'Sign employment contract',
      description: 'Your contract must meet the salary threshold and be with a German employer.',
      category: 'Pre-Arrival',
      visaTypes: ['eu-blue-card'],
      completed: false,
    },
    {
      id: 'client-contracts',
      title: 'Prepare client contracts or letters of intent',
      description: 'You need proof of clients or business viability for the freelance visa.',
      category: 'Pre-Arrival',
      visaTypes: ['freelance'],
      completed: false,
    },
    {
      id: 'qualification-proof',
      title: 'Get degree recognized (Anerkennung)',
      description: 'Your university degree must be recognized in Germany. Check anabin database.',
      category: 'Pre-Arrival',
      visaTypes: ['eu-blue-card', 'job-seeker'],
      completed: false,
    },
    {
      id: 'find-housing',
      title: 'Find temporary or permanent housing',
      description: 'You need an address for Anmeldung. A Wohnungsgeberbestätigung from your landlord is required.',
      category: 'Pre-Arrival',
      visaTypes: ['eu-blue-card', 'freelance', 'job-seeker'],
      completed: false,
    },
    // First Week
    {
      id: 'anmeldung',
      title: 'Register address (Anmeldung)',
      description: 'Must be done within 14 days of moving in. Book appointment at Bürgeramt online.',
      category: 'First Week',
      visaTypes: ['eu-blue-card', 'freelance', 'job-seeker'],
      completed: false,
    },
    {
      id: 'bank-account',
      title: 'Open a German bank account',
      description: 'N26, Deutsche Bank, or Sparkasse. You need your Anmeldung confirmation and passport.',
      category: 'First Week',
      visaTypes: ['eu-blue-card', 'freelance', 'job-seeker'],
      completed: false,
    },
    {
      id: 'tax-id',
      title: 'Receive tax ID (Steueridentifikationsnummer)',
      description: 'Sent automatically by mail 2-4 weeks after Anmeldung. Needed for salary payments.',
      category: 'First Week',
      visaTypes: ['eu-blue-card', 'freelance', 'job-seeker'],
      completed: false,
    },
    {
      id: 'bvg-pass',
      title: 'Get a BVG transport pass',
      description: 'Monthly AB zone pass or Deutschland-Ticket (€58/month nationwide).',
      category: 'First Week',
      visaTypes: ['eu-blue-card', 'freelance', 'job-seeker'],
      completed: false,
    },
    // First Month
    {
      id: 'auslaenderbehorde',
      title: 'Apply for residence permit (Ausländerbehörde)',
      description: 'Book appointment early — wait times can be 2-3 months. Bring all documents.',
      category: 'First Month',
      visaTypes: ['eu-blue-card', 'freelance', 'job-seeker'],
      completed: false,
    },
    {
      id: 'finanzamt-registration',
      title: 'Register with tax office (Finanzamt)',
      description: 'Required for freelancers. Submit Fragebogen zur steuerlichen Erfassung.',
      category: 'First Month',
      visaTypes: ['freelance'],
      completed: false,
    },
    {
      id: 'liability-insurance',
      title: 'Get liability insurance (Haftpflichtversicherung)',
      description: 'Covers accidental damage to others. €50-80/year. Nearly universal in Germany.',
      category: 'First Month',
      visaTypes: ['eu-blue-card', 'freelance', 'job-seeker'],
      completed: false,
    },
    {
      id: 'phone-contract',
      title: 'Get a German phone number',
      description: 'Prepaid SIM (Aldi Talk, Lebara) or contract (O2, Telekom). Need passport and Anmeldung.',
      category: 'First Month',
      visaTypes: ['eu-blue-card', 'freelance', 'job-seeker'],
      completed: false,
    },
    // Settling In
    {
      id: 'german-classes',
      title: 'Enroll in German language classes',
      description: 'VHS (Volkshochschule) offers affordable courses. A1-B1 is enough for daily life.',
      category: 'Settling In',
      visaTypes: ['eu-blue-card', 'freelance', 'job-seeker'],
      completed: false,
    },
    {
      id: 'rundfunkbeitrag',
      title: 'Register for broadcasting fee (Rundfunkbeitrag)',
      description: '€18.36/month per household. Mandatory. Register at rundfunkbeitrag.de.',
      category: 'Settling In',
      visaTypes: ['eu-blue-card', 'freelance', 'job-seeker'],
      completed: false,
    },
    {
      id: 'find-doctor',
      title: 'Find a Hausarzt (family doctor)',
      description: 'Register with a general practitioner near your home. Jameda.de for reviews.',
      category: 'Settling In',
      visaTypes: ['eu-blue-card', 'freelance', 'job-seeker'],
      completed: false,
    },
  ];
}
