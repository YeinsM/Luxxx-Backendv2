import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config';

export class ZipcodeService {
  private client: SupabaseClient;

  constructor() {
    this.client = createClient(config.supabase.url, config.supabase.serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  /**
   * Returns the list of cities for a given postal code + country.
   * Checks the local DB cache first; only calls the external API on a cache miss.
   */
  async getCities(zipCode: string, countryCode: string): Promise<string[]> {
    const normalizedZip = zipCode.trim().toUpperCase();
    const normalizedCountry = countryCode.trim().toLowerCase();

    // 1 — Cache hit?
    const cached = await this.getFromCache(normalizedZip, normalizedCountry);
    if (cached) return cached;

    // 2 — Cache miss: call external API
    const cities = await this.fetchFromApi(normalizedZip, normalizedCountry);

    // 3 — Persist result (even empty arrays, to avoid re-querying dead codes)
    await this.saveToCache(normalizedZip, normalizedCountry, cities);

    return cities;
  }

  // ─── Private helpers ─────────────────────────────────────────────────

  private async getFromCache(zipCode: string, countryCode: string): Promise<string[] | null> {
    const { data, error } = await this.client
      .from('zipcode_cache')
      .select('cities')
      .eq('zip_code', zipCode)
      .eq('country_code', countryCode)
      .maybeSingle();

    if (error) {
      console.error('[zipcode] cache read error:', error.message);
      return null;
    }

    return data?.cities ?? null;
  }

  private async saveToCache(zipCode: string, countryCode: string, cities: string[]): Promise<void> {
    const { error } = await this.client
      .from('zipcode_cache')
      .upsert(
        { zip_code: zipCode, country_code: countryCode, cities },
        { onConflict: 'zip_code,country_code' },
      );

    if (error) {
      // Non-fatal: log and continue
      console.error('[zipcode] cache write error:', error.message);
    }
  }

  private async fetchFromApi(zipCode: string, countryCode: string): Promise<string[]> {
    const apiKey = config.zipcode.apiKey;
    if (!apiKey) {
      throw new Error('ZIPCODEBASE_API_KEY is not configured');
    }

    const url = new URL('https://app.zipcodebase.com/api/v1/search');
    url.searchParams.set('apikey', apiKey);
    url.searchParams.set('codes', zipCode);
    url.searchParams.set('country', countryCode);

    const res = await fetch(url.toString());

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`[zipcode] upstream ${res.status}:`, body);
      throw new Error(`Upstream error: ${res.status}`);
    }

    const data = await res.json() as Record<string, unknown>;

    const results: Array<{ city: string }> =
      (data?.results as Record<string, Array<{ city: string }>>)?.[zipCode] ?? [];

    // De-duplicate city names (case-insensitive)
    const seen = new Set<string>();
    const cities: string[] = [];
    for (const r of results) {
      const normalized = r.city.trim();
      const key = normalized.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        cities.push(normalized);
      }
    }

    return cities;
  }
}
