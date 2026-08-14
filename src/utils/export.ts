import fs from 'fs';
import path from 'path';
import { ActorInput, FinalQualifiedLead } from '../types/index.js';
import { logger } from './logger.js';

/**
 * Exports an array of qualified leads to a separate CSV file with timestamp and min/max followers in the naming convention.
 * Example filename: leads_social_media_manager_500to100000_2026-08-14_01-55-00.csv
 */
export function exportLeadsToCsvAndJson(
  leads: FinalQualifiedLead[],
  input?: Partial<ActorInput>,
  outputDir = 'storage'
): void {
  if (!leads || leads.length === 0) {
    logger.info('No leads to export.');
    return;
  }

  try {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Format timestamp string
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    const timestampStr = `${dateStr}_${timeStr}`;

    const minFollowers = input?.min_followers ?? 0;
    const maxFollowers = input?.max_followers ?? 100000;
    const profileType = (input?.profile_type || 'leads').toLowerCase().replace(/[^a-z0-9]+/g, '_');

    // Naming convention: leads_<profile_type>_<min>to<max>_<timestamp>.csv
    const csvFileName = `leads_${profileType}_${minFollowers}to${maxFollowers}_${timestampStr}.csv`;
    const jsonFileName = `leads_${profileType}_${minFollowers}to${maxFollowers}_${timestampStr}.json`;

    // 1. Export JSON file
    const jsonPath = path.join(outputDir, jsonFileName);
    fs.writeFileSync(jsonPath, JSON.stringify(leads, null, 2), 'utf-8');
    logger.info(`Run JSON exported to: ${jsonPath}`);

    // 2. Export CSV file
    const headers = [
      'platform',
      'name',
      'username',
      'profile_url',
      'bio',
      'location',
      'followers',
      'website',
      'public_email',
      'verified',
      'profession',
      'niche',
      'employment_type',
      'profession_match',
      'freelancer_score',
      'business_score',
      'lead_score',
      'qualification',
      'qualification_reason',
      'scraped_at',
    ];

    const csvRows: string[] = [];
    csvRows.push(headers.join(','));

    for (const lead of leads) {
      const row = headers.map((header) => {
        const val = (lead as unknown as Record<string, unknown>)[header];
        if (val === null || val === undefined) return '""';
        const strVal = String(val).replace(/"/g, '""');
        return `"${strVal}"`;
      });
      csvRows.push(row.join(','));
    }

    const csvPath = path.join(outputDir, csvFileName);
    fs.writeFileSync(csvPath, csvRows.join('\n'), 'utf-8');
    logger.info(`Run CSV exported to: ${csvPath}`);

    // Also update/overwrite standard master qualified_leads.csv for easy single-click access
    const masterCsvPath = path.join(outputDir, 'qualified_leads.csv');
    safeWriteFileSync(masterCsvPath, csvRows.join('\n'));
  } catch (err: unknown) {
    logger.error(`Failed to export CSV/JSON files: ${(err as Error).message}`);
  }
}

function safeWriteFileSync(filePath: string, content: string): string {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    return filePath;
  } catch (err: unknown) {
    if ((err as { code?: string }).code === 'EBUSY') {
      const parsed = path.parse(filePath);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fallbackPath = path.join(parsed.dir, `${parsed.name}_${timestamp}${parsed.ext}`);
      fs.writeFileSync(fallbackPath, content, 'utf-8');
      return fallbackPath;
    }
    throw err;
  }
}
