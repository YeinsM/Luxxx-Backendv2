import { createHash } from 'crypto';
import { getAppDatabaseService } from './app-database.service';

const VIEWER_SIMULATION_RANGE_KEY = 'viewer_simulation_range_max';
const VIEWER_SIMULATION_STARTED_AT_KEY = 'viewer_simulation_started_at';
const VIEWER_SIMULATION_INITIAL_BOOST = 5;
const VIEWER_SIMULATION_DAILY_STEP = 2;
const VIEWER_SIMULATION_THRESHOLD = 50;
const VIEWER_SIMULATION_RANDOM_MIN = 20;
const VIEWER_METRIC_REFRESH_INTERVAL_SECONDS = 120;

type PublicViewerSummaryOptions = {
  profileId?: string;
};

export class ViewerMetricsService {
  private appDb = getAppDatabaseService();

  async heartbeatPresence(
    sessionId: string,
    userId?: string,
    pathname?: string,
  ): Promise<{ tracked: boolean }> {
    await this.appDb.upsertPublicViewerSession(sessionId, userId, pathname);
    return { tracked: true };
  }

  async getPublicSummary(options: PublicViewerSummaryOptions = {}) {
    const now = new Date();

    const [appName, trackedViewers, totalProfiles, simulationBoost] = await Promise.all([
      this.appDb.getAdminSetting('app_name'),
      this.appDb.countActivePublicViewerSessions(),
      this.appDb.countPublishedAdvertisements(),
      this.resolveSimulationBoost(now),
    ]);

    const basePlatformViewers = trackedViewers + simulationBoost;
    const platformViewers = this.resolvePlatformDisplayCount(basePlatformViewers, now);
    const profileViewers = this.resolveProfileDisplayCount(
      platformViewers,
      totalProfiles,
      options.profileId,
      now,
    );

    return {
      appName: appName || 'Luxxx',
      trackedViewers,
      simulationBoost,
      platformViewers,
      profileViewers,
      totalProfiles,
      refreshIntervalSeconds: VIEWER_METRIC_REFRESH_INTERVAL_SECONDS,
      generatedAt: now.toISOString(),
    };
  }

  private async resolveSimulationBoost(now: Date): Promise<number> {
    const [rangeMax, startedAt] = await Promise.all([
      this.getSimulationRangeMax(),
      this.getOrCreateSimulationStartDate(now),
    ]);

    const deterministicBoost =
      VIEWER_SIMULATION_INITIAL_BOOST +
      this.getUtcDayDifference(startedAt, now) * VIEWER_SIMULATION_DAILY_STEP;

    if (deterministicBoost < VIEWER_SIMULATION_THRESHOLD) {
      return deterministicBoost;
    }

    const cappedMax = Math.max(VIEWER_SIMULATION_THRESHOLD, rangeMax);
    return this.hashNumber(
      `daily:${this.getUtcDayKey(now)}`,
      VIEWER_SIMULATION_RANDOM_MIN,
      cappedMax,
    );
  }

  private async getSimulationRangeMax(): Promise<number> {
    const rawValue = await this.appDb.getAdminSetting(VIEWER_SIMULATION_RANGE_KEY);
    const parsed = Number.parseInt(rawValue ?? '', 10);

    if (!Number.isFinite(parsed) || parsed < VIEWER_SIMULATION_THRESHOLD) {
      return VIEWER_SIMULATION_THRESHOLD;
    }

    return parsed;
  }

  private async getOrCreateSimulationStartDate(now: Date): Promise<Date> {
    const rawValue = await this.appDb.getAdminSetting(VIEWER_SIMULATION_STARTED_AT_KEY);
    const parsedDate = rawValue ? new Date(rawValue) : null;

    if (parsedDate && !Number.isNaN(parsedDate.getTime())) {
      return parsedDate;
    }

    const fallback = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );

    await this.appDb.setAdminSetting(
      VIEWER_SIMULATION_STARTED_AT_KEY,
      fallback.toISOString(),
    );

    return fallback;
  }

  private resolvePlatformDisplayCount(basePlatformViewers: number, now: Date): number {
    if (basePlatformViewers <= 0) {
      return 0;
    }

    const minimumValue = Math.max(0, basePlatformViewers - 2);
    return this.hashNumber(
      `window:${this.getWindowKey(now)}:${basePlatformViewers}`,
      minimumValue,
      basePlatformViewers,
    );
  }

  private resolveProfileDisplayCount(
    platformViewers: number,
    totalProfiles: number,
    profileId: string | undefined,
    now: Date,
  ): number {
    if (platformViewers <= 0 || totalProfiles <= 0) {
      return 0;
    }

    if (totalProfiles === 1) {
      return platformViewers;
    }

    const distributableViewers = Math.max(0, platformViewers - 1);
    if (distributableViewers === 0) {
      return 0;
    }

    const baseCount = Math.floor(distributableViewers / totalProfiles);
    const remainder = distributableViewers % totalProfiles;

    if (!profileId || remainder === 0) {
      return baseCount;
    }

    const slot = this.hashToInt(
      `profile:${profileId}:${this.getWindowKey(now)}`,
    ) % totalProfiles;

    return baseCount + (slot < remainder ? 1 : 0);
  }

  private getUtcDayDifference(from: Date, to: Date): number {
    const fromStamp = Date.UTC(
      from.getUTCFullYear(),
      from.getUTCMonth(),
      from.getUTCDate(),
    );
    const toStamp = Date.UTC(
      to.getUTCFullYear(),
      to.getUTCMonth(),
      to.getUTCDate(),
    );

    return Math.max(0, Math.floor((toStamp - fromStamp) / 86_400_000));
  }

  private getUtcDayKey(date: Date): string {
    return [
      date.getUTCFullYear(),
      String(date.getUTCMonth() + 1).padStart(2, '0'),
      String(date.getUTCDate()).padStart(2, '0'),
    ].join('-');
  }

  private getWindowKey(date: Date): string {
    return String(
      Math.floor(date.getTime() / (VIEWER_METRIC_REFRESH_INTERVAL_SECONDS * 1000)),
    );
  }

  private hashNumber(seed: string, min: number, max: number): number {
    if (max <= min) {
      return min;
    }

    return min + (this.hashToInt(seed) % (max - min + 1));
  }

  private hashToInt(seed: string): number {
    const digest = createHash('sha256').update(seed).digest();
    return digest.readUInt32BE(0);
  }
}

export function getViewerMetricsService(): ViewerMetricsService {
  return new ViewerMetricsService();
}