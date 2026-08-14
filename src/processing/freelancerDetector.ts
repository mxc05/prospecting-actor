import { NormalizedProfileData, RuleSignals } from '../types/index.js';

const FREELANCER_KEYWORDS = [
  'freelance',
  'freelancer',
  'available for projects',
  'available for clients',
  'dm for work',
  'dm to book',
  'bookings open',
  'taking clients',
  'client work',
  'open for work',
  'hire me',
  'work with me',
];

const BUSINESS_KEYWORDS = [
  'agency',
  'studio',
  'founder',
  'co-founder',
  'business owner',
  'services',
  'bookings',
  'work with brands',
  'official page',
  'company',
  'team',
];

export function detectSignals(profile: NormalizedProfileData, targetProfileType: string = ''): RuleSignals {
  const text = `${profile.name} ${profile.bio} ${profile.website}`.toLowerCase();
  
  const matchedFreelancerSignals: string[] = [];
  const matchedBusinessSignals: string[] = [];

  for (const keyword of FREELANCER_KEYWORDS) {
    if (text.includes(keyword)) {
      matchedFreelancerSignals.push(keyword);
    }
  }

  for (const keyword of BUSINESS_KEYWORDS) {
    if (text.includes(keyword)) {
      matchedBusinessSignals.push(keyword);
    }
  }

  // Calculate scores (0 to 100)
  const freelancer_score = Math.min(100, matchedFreelancerSignals.length * 40);
  const business_score = Math.min(100, matchedBusinessSignals.length * 35);

  // Profession check
  const normalizedPersona = targetProfileType.replace(/_/g, ' ').toLowerCase();
  const personaWords = normalizedPersona.split(' ').filter(w => w.length > 2);
  
  const profession_signal_found = personaWords.length > 0
    ? personaWords.some(word => text.includes(word))
    : text.includes(normalizedPersona);

  const matched_signals = [
    ...matchedFreelancerSignals.map(s => `freelancer:${s}`),
    ...matchedBusinessSignals.map(s => `business:${s}`),
  ];

  return {
    freelancer_score,
    business_score,
    matched_signals,
    profession_signal_found,
  };
}
