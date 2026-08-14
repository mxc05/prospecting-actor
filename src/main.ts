import { Actor } from 'apify';
import dotenv from 'dotenv';
import { validateInput } from './config/input.js';
import { discoverProfiles } from './discovery/instagram.js';
import { classifyProfile } from './processing/classifier.js';
import { Deduplicator } from './processing/deduplicate.js';
import { passesBasicFilters } from './processing/filters.js';
import { detectSignals } from './processing/freelancerDetector.js';
import { calculateLeadScore } from './processing/leadScore.js';
import { normalizeProfile } from './processing/normalize.js';
import { scrapeProfile } from './scraping/instagram.js';
import { DiscoveredProfile, FinalQualifiedLead } from './types/index.js';
import { exportLeadsToCsvAndJson } from './utils/export.js';
import { logger } from './utils/logger.js';

dotenv.config();

await Actor.init();

try {
  const rawInput = await Actor.getInput();
  const input = validateInput(rawInput);

  logger.info('Prospecting Actor started with configuration:', {
    platform: input.platform,
    profile_type: input.profile_type,
    location: input.location,
    min_followers: input.min_followers,
    max_followers: input.max_followers,
    max_results: input.max_results,
    llm_provider: input.llm_provider,
  });

  const deduplicator = new Deduplicator();

  // Determine candidate profile list
  let candidateProfiles: DiscoveredProfile[] = [];

  if (input.profile_urls && input.profile_urls.length > 0) {
    logger.info(`Direct profile_urls supplied (${input.profile_urls.length}). Skipping discovery phase.`);
    candidateProfiles = input.profile_urls.map((url) => ({ profileUrl: url }));
  } else {
    candidateProfiles = await discoverProfiles(input);
  }

  const uniqueCandidates = deduplicator.filterDuplicates(
    candidateProfiles,
    (c) => c.profileUrl,
    input.platform
  );

  logger.info(`Processing ${uniqueCandidates.length} unique profile candidates...`);

  let pushedLeadsCount = 0;
  const maxResults = input.max_results || 50;
  const collectedLeads: FinalQualifiedLead[] = [];

  for (const candidate of uniqueCandidates) {
    if (pushedLeadsCount >= maxResults) {
      logger.info(`Reached maximum requested leads limit (${maxResults}). Stopping run.`);
      break;
    }

    logger.info(`[${pushedLeadsCount + 1}/${uniqueCandidates.length}] Scraping candidate: ${candidate.profileUrl}`);

    const rawData = await scrapeProfile(candidate.profileUrl);
    if (!rawData) {
      logger.warning(`Skipping empty or unscrapable profile: ${candidate.profileUrl}`);
      continue;
    }

    // Apply basic cheap filters before LLM invocation
    if (!passesBasicFilters(rawData, input)) {
      logger.info(`Profile @${rawData.username} failed basic filters (follower/location). Skipping.`);
      continue;
    }

    // Data normalization
    const normalized = normalizeProfile(rawData);

    // Rule-based signal detection
    const signals = detectSignals(normalized, input.profile_type);

    // AI Classification with graceful fallback
    const classification = await classifyProfile(normalized, input.profile_type, signals, input);

    // Lead scoring calculation
    const scoreResult = calculateLeadScore({
      normalized,
      signals,
      classification,
    });

    const finalLead: FinalQualifiedLead = {
      ...normalized,
      ...signals,
      ...classification,
      ...scoreResult,
      scraped_at: new Date().toISOString(),
    };

    // Push qualified lead to Apify Dataset & local collection array
    await Actor.pushData(finalLead);
    collectedLeads.push(finalLead);
    pushedLeadsCount++;

    logger.info(`Successfully pushed lead @${finalLead.username} (Score: ${finalLead.lead_score}, Qualification: ${finalLead.qualification})`);
  }

  // Export to separate CSV and JSON files with timestamp and min/max followers naming convention
  exportLeadsToCsvAndJson(collectedLeads, input, 'storage');

  // Save persistent deduplication memory for future runs
  deduplicator.saveState();

  logger.info(`Prospecting Actor run finished. Total qualified leads pushed: ${pushedLeadsCount}`);
} catch (error: unknown) {
  logger.error(`Fatal error in Prospecting Actor execution: ${(error as Error).message}`);
} finally {
  await Actor.exit();
}
