import { AIClassificationResult, LeadScoreResult, NormalizedProfileData, RuleSignals } from '../types/index.js';

export function calculateLeadScore(params: {
  normalized: NormalizedProfileData;
  signals: RuleSignals;
  classification: AIClassificationResult;
}): LeadScoreResult {
  const { normalized, signals, classification } = params;

  // 1. Profession Match Score (40%)
  let professionScore = 0;
  if (classification.profession_match === true) {
    professionScore = Math.round((classification.confidence || 0.8) * 100);
  } else if (classification.profession_match === null) {
    professionScore = signals.profession_signal_found ? 70 : 30;
  } else {
    professionScore = 0;
  }

  // 2. Freelancer Signal Score (25%)
  const freelancerScore = Math.round(
    Math.max(signals.freelancer_score, (classification.freelancer_confidence || 0) * 100)
  );

  // 3. Business Signal Score (15%)
  const businessScore = Math.round(
    Math.max(signals.business_score, (classification.business_confidence || 0) * 100)
  );

  // 4. Contactability Score (20%)
  let contactabilityScore = 0;
  if (normalized.public_email) contactabilityScore += 50;
  if (normalized.website) contactabilityScore += 50;
  contactabilityScore = Math.min(100, contactabilityScore);

  // Weighted total calculation (0 - 100)
  const totalScore = Math.round(
    professionScore * 0.40 +
    freelancerScore * 0.25 +
    businessScore * 0.15 +
    contactabilityScore * 0.20
  );

  // Qualification categorization
  let qualification: 'High' | 'Medium' | 'Low' | 'Unclassified' = 'Low';
  if (classification.profession_match === null && !signals.profession_signal_found) {
    qualification = 'Unclassified';
  } else if (totalScore >= 80) {
    qualification = 'High';
  } else if (totalScore >= 60) {
    qualification = 'Medium';
  } else {
    qualification = 'Low';
  }

  const reasonParts: string[] = [];
  if (classification.profession_match) reasonParts.push('Matched target profession');
  if (normalized.public_email || normalized.website) reasonParts.push('Public contact info available');
  if (freelancerScore > 50) reasonParts.push('Strong freelancer signals detected');

  return {
    profession_match_score: professionScore,
    freelancer_score: freelancerScore,
    business_score: businessScore,
    contactability_score: contactabilityScore,
    lead_score: totalScore,
    qualification,
    qualification_reason: reasonParts.join('. ') || classification.reason || 'Lead evaluated.',
  };
}
