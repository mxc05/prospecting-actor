import fs from 'fs';
import path from 'path';
import { extractInstagramUsername } from '../utils/helpers.js';
import { logger } from '../utils/logger.js';

export class Deduplicator {
  private seenKeys = new Set<string>();
  private storageFilePath: string;

  constructor(outputDir = 'storage') {
    this.storageFilePath = path.join(outputDir, 'seen_leads.json');
    this.loadState();
  }

  /**
   * Loads previously processed usernames across runs from persistent storage.
   */
  private loadState(): void {
    try {
      if (fs.existsSync(this.storageFilePath)) {
        const raw = fs.readFileSync(this.storageFilePath, 'utf-8');
        const keys: string[] = JSON.parse(raw);
        if (Array.isArray(keys)) {
          keys.forEach((k) => this.seenKeys.add(k));
          logger.info(`Loaded ${keys.length} previously processed profile keys for cross-run deduplication.`);
        }
      }
    } catch (err: unknown) {
      logger.warning(`Could not load persistent deduplication state: ${(err as Error).message}`);
    }
  }

  /**
   * Saves updated seen profile keys to disk for future runs.
   */
  public saveState(): void {
    try {
      const dir = path.dirname(this.storageFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const keysArray = Array.from(this.seenKeys);
      fs.writeFileSync(this.storageFilePath, JSON.stringify(keysArray, null, 2), 'utf-8');
      logger.info(`Saved ${keysArray.length} profile keys to persistent deduplication store.`);
    } catch (err: unknown) {
      logger.warning(`Could not save persistent deduplication state: ${(err as Error).message}`);
    }
  }

  /**
   * Generates unique key from platform and username.
   */
  public generateKey(platform: string, usernameOrUrl: string): string {
    const username = extractInstagramUsername(usernameOrUrl);
    return `${platform.toLowerCase()}:${username.toLowerCase()}`;
  }

  /**
   * Checks if lead/username has already been seen in this or ANY previous run.
   */
  public isDuplicate(platform: string, usernameOrUrl: string): boolean {
    const key = this.generateKey(platform, usernameOrUrl);
    if (this.seenKeys.has(key)) {
      return true;
    }
    this.seenKeys.add(key);
    return false;
  }

  /**
   * Filters an array of items removing duplicates already seen today or in previous runs.
   */
  public filterDuplicates<T>(items: T[], getUrlFn: (item: T) => string, platform = 'instagram'): T[] {
    const unique: T[] = [];
    for (const item of items) {
      const url = getUrlFn(item);
      if (!this.isDuplicate(platform, url)) {
        unique.push(item);
      }
    }
    return unique;
  }

  public clear(): void {
    this.seenKeys.clear();
    this.saveState();
  }
}
