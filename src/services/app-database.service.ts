import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config';
import {
  Advertisement,
  AdvertisementService,
  AdvertisementRate,
  UserMedia,
  PromotionVideo,
  Review,
  Message,
  Conversation,
  Notification,
  Transaction,
  Invoice,
  SavedSearch,
  PhotoVerification,
  CreateAdvertisementDto,
  ProfileSearchParams,
  PromotionPlan,
  PromotionPlanAvailabilityStatus,
  AdvertisementPromotion,
  UpsertAdvertisementPromotionDto,
} from '../models/advertisement.model';
import { InternalServerError, NotFoundError } from '../models/error.model';
import { normalizeAdvertisementGender } from '../utils/gender.utils';
import { sseService } from '../utils/sse';
import { getCloudinaryService } from './cloudinary.service';

type PromotionVideoOwner = {
  advertisementId: string;
  userId: string;
  name: string;
  title?: string;
  city?: string;
  age?: number;
  gender?: string;
  profileImageUrl?: string;
};

const ADVERTISEMENT_PRESENCE_TTL_MS = 2 * 60 * 1000;
const PHOTO_VERIFICATION_REQUIRED_SETTING_KEY = 'photo_verification_required';
const cloudinaryService = getCloudinaryService();
type PhotoVerificationStatus = PhotoVerification['status'];

export class AppDatabaseService {
  private client: SupabaseClient;

  constructor() {
    if (!config.supabase.url || !config.supabase.serviceKey) {
      throw new Error('Supabase configuration is missing');
    }
    this.client = createClient(config.supabase.url, config.supabase.serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  // ============================================================
  // ADVERTISEMENTS
  // ============================================================

  async createAdvertisement(userId: string, dto: CreateAdvertisementDto): Promise<Advertisement> {
    const photoVerificationRequired = await this.isPhotoVerificationRequiredForNewUploads();
    const sanitizedDto = await this.sanitizeAdvertisementPhotoSelection(
      userId,
      dto,
      photoVerificationRequired,
    );
    const { services, rates, ...adData } = sanitizedDto;

    // Set status to 'active' by default, visibility is controlled by isOnline
    const row = this.serializeAd({ ...adData, userId, status: 'active' } as any);
    if ((adData as any).selectedPlan !== undefined) {
      row.plan_priority = await this.resolvePlanPriorityForSelectedPlan((adData as any).selectedPlan);
    }
    const { data, error } = await this.client
      .from('advertisements')
      .insert([row])
      .select()
      .single();

    if (error) throw new InternalServerError(`Failed to create advertisement: ${error.message}`);

    const ad = this.deserializeAd(data);

    // Insert services
    if (services && services.length > 0) {
      const serviceRows = services.map(s => ({
        advertisement_id: ad.id,
        service_name: s.serviceName,
        price: s.price || null,
        notes: s.notes || null,
      }));
      await this.client.from('advertisement_services').insert(serviceRows);
    }

    // Insert rates
    if (rates && rates.length > 0) {
      const rateRows = rates.map(r => ({
        advertisement_id: ad.id,
        time_label: r.timeLabel,
        incall_price: r.incallPrice || null,
        outcall_price: r.outcallPrice || null,
      }));
      await this.client.from('advertisement_rates').insert(rateRows);
    }

    return this.getAdvertisementById(ad.id) as Promise<Advertisement>;
  }

  async getAdvertisementById(id: string): Promise<Advertisement | null> {
    const { data, error } = await this.client
      .from('advertisements')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;

    const ad = this.deserializeAd(data);
    ad.services = await this.getAdServices(id);
    ad.rates = await this.getAdRates(id);
    const allPhotos = await this.getUserMedia(ad.userId, 'image');
    // Filter to only selected photos for public view
    ad.photos = ad.selectedPhotoIds && ad.selectedPhotoIds.length > 0
      ? allPhotos.filter(p => (ad.selectedPhotoIds as string[]).includes(p.url))
      : allPhotos;
    const allVideos = await this.getUserMedia(ad.userId, 'video');
    // Filter to only selected videos for public view
    ad.videos = ad.selectedVideoIds && ad.selectedVideoIds.length > 0
      ? allVideos.filter(v => (ad.selectedVideoIds as string[]).includes(v.url))
      : allVideos;
    return ad;
  }

  async getPublicAdvertisementById(id: string): Promise<Advertisement | null> {
    const ad = await this.getAdvertisementById(id);
    if (!ad) return null;

    const photoVerificationRequired = await this.isPhotoVerificationRequiredForNewUploads();
    await this.applyPublicModelPhotoDeliveryToAdvertisement(
      ad,
      ad.photos || [],
      photoVerificationRequired,
    );
    return ad;
  }

  async getAdvertisementByUserId(userId: string): Promise<Advertisement | null> {
    const { data, error } = await this.client
      .from('advertisements')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;

    const ad = this.deserializeAd(data);
    ad.services = await this.getAdServices(ad.id);
    ad.rates = await this.getAdRates(ad.id);
    // Return ALL photos for the user's own management view (so they can manage selection)
    ad.photos = await this.getUserMedia(userId, 'image');
    ad.videos = await this.getUserMedia(userId, 'video');
    return ad;
  }

  async updateAdvertisement(id: string, userId: string, dto: Partial<CreateAdvertisementDto>): Promise<Advertisement> {
    const photoVerificationRequired = await this.isPhotoVerificationRequiredForNewUploads();
    const sanitizedDto = await this.sanitizeAdvertisementPhotoSelection(
      userId,
      dto,
      photoVerificationRequired,
    );
    const { services, rates, ...adData } = sanitizedDto;
    const row = this.serializeAd(adData as any);
    if ((adData as any).selectedPlan !== undefined) {
      row.plan_priority = await this.resolvePlanPriorityForSelectedPlan((adData as any).selectedPlan);
    }

    const { data, error } = await this.client
      .from('advertisements')
      .update(row)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !data) throw new NotFoundError('Advertisement not found');

    // Replace services if provided
    if (services !== undefined) {
      await this.client.from('advertisement_services').delete().eq('advertisement_id', id);
      if (services.length > 0) {
        const serviceRows = services.map(s => ({
          advertisement_id: id,
          service_name: s.serviceName,
          price: s.price || null,
          notes: s.notes || null,
        }));
        await this.client.from('advertisement_services').insert(serviceRows);
      }
    }

    // Replace rates if provided
    if (rates !== undefined) {
      await this.client.from('advertisement_rates').delete().eq('advertisement_id', id);
      if (rates.length > 0) {
        const rateRows = rates.map(r => ({
          advertisement_id: id,
          time_label: r.timeLabel,
          incall_price: r.incallPrice || null,
          outcall_price: r.outcallPrice || null,
        }));
        await this.client.from('advertisement_rates').insert(rateRows);
      }
    }

    return this.getAdvertisementById(id) as Promise<Advertisement>;
  }

  async deleteAdvertisement(id: string, userId: string): Promise<boolean> {
    const { error } = await this.client
      .from('advertisements')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    return !error;
  }

  /** Returns the verification_status for a user, or null if not found */
  async getUserById(userId: string): Promise<{ id: string; verificationStatus: string | null } | null> {
    const { data, error } = await this.client
      .from('users')
      .select('id, verification_status')
      .eq('id', userId)
      .single();
    if (error || !data) return null;
    return { id: data.id, verificationStatus: data.verification_status ?? null };
  }

  async softDeleteAdvertisementsByUserId(userId: string): Promise<number> {
    const { data, error } = await this.client
      .from('advertisements')
      .update({
        is_online: false,
        status: 'deleted',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select('id');

    if (error) {
      throw new InternalServerError(`Failed to soft-delete advertisements: ${error.message}`);
    }

    return (data || []).length;
  }

  async verifyAdvertisement(id: string, userId: string, idType: string, idNumber: string): Promise<Advertisement> {
    const { data, error } = await this.client
      .from('advertisements')
      .update({
        id_type: idType,
        id_number: idNumber,
        verification_status: 'SUBMITTED',
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !data) throw new NotFoundError('Advertisement not found');
    return this.deserializeAd(data);
  }

  async promoteAdvertisement(id: string, userId: string, promotionType: string, targetAudience: string, campaignDuration: string): Promise<Advertisement> {
    const { data, error } = await this.client
      .from('advertisements')
      .update({
        promotion_type: promotionType,
        target_audience: targetAudience,
        campaign_duration: campaignDuration,
        promoted_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !data) throw new NotFoundError('Advertisement not found');
    return this.deserializeAd(data);
  }

  // ============================================================
  // PUBLIC PROFILES (search/list)
  // ============================================================

  async searchProfiles(params: ProfileSearchParams): Promise<{ profiles: Advertisement[]; total: number }> {
    const { category, city, query, gender, sortBy, page = 1, limit = 20 } = params;
    const offset = (page - 1) * limit;
    const normalizedGender = normalizeAdvertisementGender(gender);

    let q = this.client
      .from('advertisements')
      .select('*', { count: 'exact' })
      .eq('is_online', true); // Filter by isOnline instead of status

    if (category && category !== 'all') {
      q = q.eq('category', category);
    }
    if (city) {
      q = q.ilike('city', `%${city}%`);
    }
    if (query) {
      q = q.or(`name.ilike.%${query}%,description.ilike.%${query}%,title.ilike.%${query}%`);
    }
    if (normalizedGender) {
      q = q.eq('gender', normalizedGender);
    }

    // Sorting: plan tier (EXCLUSIVE→PREMIUM→STANDARD) is always the primary sort.
    // Within each tier, boosted ads (boosted_until in the future) come first.
    switch (sortBy) {
      case 'rating':
        q = q
          .order('plan_priority', { ascending: false })
          .order('boosted_until', { ascending: false, nullsFirst: false })
          .order('rating', { ascending: false });
        break;
      case 'newest':
        q = q
          .order('plan_priority', { ascending: false })
          .order('boosted_until', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false });
        break;
      default:
        q = q
          .order('plan_priority', { ascending: false })
          .order('boosted_until', { ascending: false, nullsFirst: false })
          .order('promoted_at', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false });
    }

    q = q.range(offset, offset + limit - 1);

    const { data, error, count } = await q;

    if (error) throw new InternalServerError(`Failed to search profiles: ${error.message}`);

    const photoVerificationRequired = await this.isPhotoVerificationRequiredForNewUploads();

    const profiles = await Promise.all(
      (data || []).map(async (row: any) => {
        const ad = this.deserializeAd(row);
        ad.services = await this.getAdServices(ad.id);
        ad.rates = await this.getAdRates(ad.id);
        const sourcePhotos = await this.getUserMedia(ad.userId, 'image');
        await this.applyPublicModelPhotoDeliveryToAdvertisement(
          ad,
          sourcePhotos,
          photoVerificationRequired,
        );
        return ad;
      })
    );

    return { profiles, total: count || 0 };
  }

  async getProfileStats(): Promise<{ 
    total: number; 
    online: number; 
    premium: number; 
    avgRating: number;
    byCategory: {
      all: number;
      escort: number;
      companion: number;
      massage: number;
      virtual: number;
    };
  }> {
    const { data, error } = await this.client
      .from('advertisements')
      .select('is_online,is_premium,rating,category,presence_expires_at')
      .eq('is_online', true); // Count published advertisements, then derive real-time online state

    if (error) throw new InternalServerError('Failed to get stats');

    const rows = data || [];
    const total = rows.length;
    const online = rows.filter((r: any) => this.isAdvertisementCurrentlyOnlineRow(r)).length;
    const premium = rows.filter((r: any) => r.is_premium).length;
    const avgRating = total > 0 ? rows.reduce((sum: number, r: any) => sum + (parseFloat(r.rating) || 0), 0) / total : 0;

    // Count by category
    const byCategory = {
      all: total,
      escort: rows.filter((r: any) => r.category === 'escort').length,
      companion: rows.filter((r: any) => r.category === 'companion').length,
      massage: rows.filter((r: any) => r.category === 'massage').length,
      virtual: rows.filter((r: any) => r.category === 'virtual').length,
    };

    return { 
      total, 
      online, 
      premium, 
      avgRating: Math.round(avgRating * 10) / 10,
      byCategory,
    };
  }

  /** Returns distinct, non-null city names from active advertisements, sorted alphabetically */
  async getCities(): Promise<string[]> {
    const { data, error } = await this.client
      .from('advertisements')
      .select('city')
      .eq('is_online', true)
      .not('city', 'is', null);

    if (error) throw new InternalServerError(`Failed to get cities: ${error.message}`);

    const cities = [...new Set((data || []).map((r: any) => (r.city as string).trim()).filter(Boolean))];
    cities.sort((a, b) => a.localeCompare(b));
    return cities;
  }

  async incrementViewCount(id: string): Promise<void> {
    // Use RPC or raw update - Supabase doesn't support increment directly in JS client easily
    const { data } = await this.client.from('advertisements').select('view_count').eq('id', id).single();
    if (data) {
      await this.client.from('advertisements').update({ view_count: (data.view_count || 0) + 1 }).eq('id', id);
    }
  }

  async touchAdvertisementPresence(userId: string): Promise<number> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ADVERTISEMENT_PRESENCE_TTL_MS).toISOString();

    const { data, error } = await this.client
      .from('advertisements')
      .update({
        last_seen_online_at: now.toISOString(),
        presence_expires_at: expiresAt,
      })
      .eq('user_id', userId)
      .neq('status', 'deleted')
      .select('id');

    if (error) {
      throw new InternalServerError(`Failed to update advertisement presence: ${error.message}`);
    }

    return (data || []).length;
  }

  async clearAdvertisementPresence(userId: string): Promise<number> {
    const now = new Date().toISOString();

    const { data, error } = await this.client
      .from('advertisements')
      .update({
        presence_expires_at: now,
      })
      .eq('user_id', userId)
      .neq('status', 'deleted')
      .select('id');

    if (error) {
      throw new InternalServerError(`Failed to clear advertisement presence: ${error.message}`);
    }

    return (data || []).length;
  }

  // ============================================================
  // USER MEDIA
  // ============================================================

  async getUserMedia(userId: string, resourceType?: string): Promise<UserMedia[]> {
    let q = this.client.from('user_media').select('*').eq('user_id', userId);
    if (resourceType) q = q.eq('resource_type', resourceType);
    q = q.order('uploaded_at', { ascending: false });

    const { data, error } = await q;
    if (error) return [];
    return (data || []).map(this.deserializeMedia);
  }

  async createUserMedia(media: Omit<UserMedia, 'id' | 'uploadedAt'>): Promise<UserMedia> {
    const { data, error } = await this.client
      .from('user_media')
      .insert([{
        user_id: media.userId,
        url: media.url,
        public_id: media.publicId,
        resource_type: media.resourceType,
        width: media.width || null,
        height: media.height || null,
        format: media.format || null,
        duration: media.duration || null,
        thumbnail_url: media.thumbnailUrl || null,
      }])
      .select()
      .single();

    if (error) throw new InternalServerError(`Failed to create media: ${error.message}`);
    return this.deserializeMedia(data);
  }

  async deleteUserMedia(id: string, userId: string): Promise<boolean> {
    const { error } = await this.client
      .from('user_media')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    return !error;
  }

  async deleteUserMediaByPublicId(publicId: string, userId: string): Promise<boolean> {
    const { error } = await this.client
      .from('user_media')
      .delete()
      .eq('public_id', publicId)
      .eq('user_id', userId);
    return !error;
  }

  // ============================================================
  // PROMOTION VIDEOS
  // ============================================================

  async getUserPromotionVideos(userId: string): Promise<PromotionVideo[]> {
    const { data, error } = await this.client
      .from('promotion_videos')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return [];
    return (data || []).map(this.deserializePromotionVideo);
  }

  async getPromotionVideoById(id: string, userId?: string): Promise<PromotionVideo | null> {
    let query = this.client
      .from('promotion_videos')
      .select('*')
      .eq('id', id);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.single();
    if (error || !data) return null;
    return this.deserializePromotionVideo(data);
  }

  async createPromotionVideo(video: Omit<PromotionVideo, 'id' | 'viewCount' | 'publishedAt' | 'createdAt' | 'updatedAt'>): Promise<PromotionVideo> {
    const { data, error } = await this.client
      .from('promotion_videos')
      .insert([{
        user_id: video.userId,
        title: video.title,
        description: video.description || null,
        url: video.url,
        public_id: video.publicId,
        thumbnail_url: video.thumbnailUrl || null,
        width: video.width || null,
        height: video.height || null,
        format: video.format || null,
        duration: video.duration || null,
        is_public: video.isPublic ?? false,
        published_at: video.isPublic ? new Date().toISOString() : null,
      }])
      .select()
      .single();

    if (error) throw new InternalServerError(`Failed to create promotion video: ${error.message}`);
    return this.deserializePromotionVideo(data);
  }

  async updatePromotionVideo(
    id: string,
    userId: string,
    updates: Partial<Pick<PromotionVideo, 'title' | 'description' | 'isPublic'>>
  ): Promise<PromotionVideo | null> {
    const existing = await this.getPromotionVideoById(id, userId);
    if (!existing) return null;

    const nextIsPublic = updates.isPublic ?? existing.isPublic;
    const row: Record<string, unknown> = {};

    if (updates.title !== undefined) row.title = updates.title;
    if (updates.description !== undefined) row.description = updates.description || null;
    if (updates.isPublic !== undefined) {
      row.is_public = nextIsPublic;
      row.published_at = nextIsPublic
        ? existing.publishedAt?.toISOString() || new Date().toISOString()
        : null;
    }

    const { data, error } = await this.client
      .from('promotion_videos')
      .update(row)
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error || !data) return null;
    return this.deserializePromotionVideo(data);
  }

  async deletePromotionVideo(id: string, userId: string): Promise<boolean> {
    const { error } = await this.client
      .from('promotion_videos')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    return !error;
  }

  async recordPromotionVideoView(videoId: string, viewerUserId?: string): Promise<void> {
    const video = await this.getPromotionVideoById(videoId);
    if (!video || !video.isPublic) return;

    await this.client.from('promotion_video_views').insert([{
      promotion_video_id: videoId,
      viewer_user_id: viewerUserId || null,
      is_anonymous: !viewerUserId,
    }]);

    await this.client
      .from('promotion_videos')
      .update({ view_count: (video.viewCount || 0) + 1 })
      .eq('id', videoId);
  }

  async getPromotionVideoStats(userId: string): Promise<{
    totalVideos: number;
    publicVideos: number;
    totalViews: number;
    last30DaysViews: number;
    topVideoTitle?: string;
    topVideoViews: number;
    profileOpens: number;
  }> {
    const videos = await this.getUserPromotionVideos(userId);
    const advertisement = await this.getAdvertisementByUserId(userId);
    const videoIds = videos.map((video) => video.id);
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    let last30DaysViews = 0;
    if (videoIds.length > 0) {
      const { count } = await this.client
        .from('promotion_video_views')
        .select('*', { count: 'exact', head: true })
        .in('promotion_video_id', videoIds)
        .gte('created_at', since);
      last30DaysViews = count || 0;
    }

    const topVideo = videos
      .slice()
      .sort((a, b) => b.viewCount - a.viewCount)[0];

    return {
      totalVideos: videos.length,
      publicVideos: videos.filter((video) => video.isPublic).length,
      totalViews: videos.reduce((sum, video) => sum + video.viewCount, 0),
      last30DaysViews,
      topVideoTitle: topVideo?.title,
      topVideoViews: topVideo?.viewCount || 0,
      profileOpens: advertisement?.viewCount || 0,
    };
  }

  async getPromotionVideoHub(
    gender?: string,
    page: number = 1,
    limit: number = 8
  ): Promise<{
    newestVideos: any[];
    newestTotal: number;
    page: number;
    limit: number;
    popularModels: any[];
    counts: Record<string, number>;
  }> {
    const normalizedGender = normalizeAdvertisementGender(gender);
    const allOwners = await this.getPromotionVideoOwners();
    const filteredOwners = normalizedGender
      ? new Map(
          [...allOwners.entries()].filter(([, owner]) => owner.gender === normalizedGender)
        )
      : allOwners;

    const counts = { all: 0, woman: 0, man: 0, couple: 0, trans: 0 } as Record<string, number>;
    const allUserIds = [...allOwners.keys()];

    if (allUserIds.length > 0) {
      const { data: countRows } = await this.client
        .from('promotion_videos')
        .select('id, user_id')
        .eq('is_public', true)
        .in('user_id', allUserIds);

      for (const row of countRows || []) {
        counts.all += 1;
        const rowGender = allOwners.get(row.user_id)?.gender;
        if (rowGender && counts[rowGender] !== undefined) {
          counts[rowGender] += 1;
        }
      }
    }

    const filteredUserIds = [...filteredOwners.keys()];
    if (filteredUserIds.length === 0) {
      return {
        newestVideos: [],
        newestTotal: 0,
        page,
        limit,
        popularModels: [],
        counts,
      };
    }

    const offset = (page - 1) * limit;
    const { data: newestRows, count } = await this.client
      .from('promotion_videos')
      .select('*', { count: 'exact' })
      .eq('is_public', true)
      .in('user_id', filteredUserIds)
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const newestVideos = (newestRows || []).map((row: any) =>
      this.serializePromotionVideoForPublic(row, filteredOwners.get(row.user_id))
    );

    const { data: publicRows } = await this.client
      .from('promotion_videos')
      .select('*')
      .eq('is_public', true)
      .in('user_id', filteredUserIds);

    const allPublicRows = publicRows || [];
    const videoIds = allPublicRows.map((row: any) => row.id);
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const last30ViewsByVideoId = new Map<string, number>();

    if (videoIds.length > 0) {
      const { data: last30Rows } = await this.client
        .from('promotion_video_views')
        .select('promotion_video_id')
        .in('promotion_video_id', videoIds)
        .gte('created_at', since);

      for (const row of last30Rows || []) {
        last30ViewsByVideoId.set(
          row.promotion_video_id,
          (last30ViewsByVideoId.get(row.promotion_video_id) || 0) + 1
        );
      }
    }

    const groupedOwners = new Map<string, any>();
    for (const row of allPublicRows) {
      const owner = filteredOwners.get(row.user_id);
      if (!owner) continue;

      const current = groupedOwners.get(row.user_id) || {
        ...owner,
        totalViews: 0,
        last30DaysViews: 0,
        videoCount: 0,
        featuredVideos: [],
      };

      const serializedVideo = this.serializePromotionVideoForPublic(row, owner);
      current.totalViews += row.view_count || 0;
      current.last30DaysViews += last30ViewsByVideoId.get(row.id) || 0;
      current.videoCount += 1;
      current.featuredVideos.push(serializedVideo);
      groupedOwners.set(row.user_id, current);
    }

    const popularModels = [...groupedOwners.values()]
      .map((owner) => ({
        ...owner,
        featuredVideos: owner.featuredVideos
          .sort((a: any, b: any) => b.views - a.views)
          .slice(0, 2),
      }))
      .sort((a, b) =>
        b.last30DaysViews - a.last30DaysViews ||
        b.totalViews - a.totalViews ||
        b.videoCount - a.videoCount
      )
      .slice(0, 5);

    return {
      newestVideos,
      newestTotal: count || 0,
      page,
      limit,
      popularModels,
      counts,
    };
  }

  // ============================================================
  // REVIEWS
  // ============================================================

  async getReviewsByAdvertisement(advertisementId: string): Promise<Review[]> {
    const { data, error } = await this.client
      .from('reviews')
      .select('*')
      .eq('advertisement_id', advertisementId)
      .order('created_at', { ascending: false });

    if (error) return [];
    return (data || []).map(this.deserializeReview);
  }

  async getReviewsByUser(userId: string): Promise<Review[]> {
    // Get the user's advertisement first
    const { data: ads } = await this.client
      .from('advertisements')
      .select('id')
      .eq('user_id', userId);

    if (!ads || ads.length === 0) return [];

    const adIds = ads.map((a: any) => a.id);
    const { data, error } = await this.client
      .from('reviews')
      .select('*')
      .in('advertisement_id', adIds)
      .order('created_at', { ascending: false });

    if (error) return [];
    return (data || []).map(this.deserializeReview);
  }

  async getReviewsAuthoredByUser(userId: string): Promise<Review[]> {
    const { data, error } = await this.client
      .from('reviews')
      .select('*')
      .eq('author_id', userId)
      .order('created_at', { ascending: false });

    if (error) return [];
    return (data || []).map(this.deserializeReview);
  }

  async createReview(userId: string, authorName: string, advertisementId: string, rating: number, text?: string): Promise<Review> {
    const { data, error } = await this.client
      .from('reviews')
      .insert([{
        advertisement_id: advertisementId,
        author_id: userId,
        author_name: authorName,
        rating,
        text: text || null,
      }])
      .select()
      .single();

    if (error) throw new InternalServerError(`Failed to create review: ${error.message}`);

    // Update advertisement rating
    await this.updateAdRating(advertisementId);

    return this.deserializeReview(data);
  }

  async deleteReview(id: string, userId: string): Promise<boolean> {
    // Get the review first to find the ad
    const { data: review } = await this.client.from('reviews').select('*').eq('id', id).single();
    if (!review) return false;

    // Check: user owns the review OR user owns the advertisement
    const { data: ad } = await this.client.from('advertisements').select('user_id').eq('id', review.advertisement_id).single();
    const isOwner = review.author_id === userId;
    const isAdOwner = ad && ad.user_id === userId;

    if (!isOwner && !isAdOwner) return false;

    const { error } = await this.client.from('reviews').delete().eq('id', id);
    if (!error && review.advertisement_id) {
      await this.updateAdRating(review.advertisement_id);
    }
    return !error;
  }

  private async updateAdRating(advertisementId: string): Promise<void> {
    const { data } = await this.client
      .from('reviews')
      .select('rating')
      .eq('advertisement_id', advertisementId);

    const reviews = data || [];
    const count = reviews.length;
    const avg = count > 0 ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / count : 0;

    await this.client
      .from('advertisements')
      .update({ rating: Math.round(avg * 10) / 10, review_count: count })
      .eq('id', advertisementId);
  }

  // ============================================================
  // MESSAGES
  // ============================================================

  async getMessages(userId: string): Promise<Message[]> {
    const { data, error } = await this.client
      .from('messages')
      .select('*')
      .eq('to_user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return [];
    return (data || []).map(this.deserializeMessage);
  }

  async createMessage(fromUserId: string, fromName: string, toUserId: string, subject: string, body: string, parentId?: string): Promise<Message> {
    const { data, error } = await this.client
      .from('messages')
      .insert([{
        from_user_id: fromUserId,
        to_user_id: toUserId,
        from_name: fromName,
        subject,
        body,
        parent_id: parentId || null,
      }])
      .select()
      .single();

    if (error) throw new InternalServerError(`Failed to create message: ${error.message}`);

    // Create notification for recipient
    await this.createNotification(toUserId, 'message', 'New Message', `${fromName}: ${subject}`);

    return this.deserializeMessage(data);
  }

  async markMessageRead(id: string, userId: string): Promise<boolean> {
    const { error } = await this.client
      .from('messages')
      .update({ is_read: true })
      .eq('id', id)
      .eq('to_user_id', userId);
    return !error;
  }

  async deleteMessage(id: string, userId: string): Promise<boolean> {
    const { error } = await this.client
      .from('messages')
      .delete()
      .eq('id', id)
      .eq('to_user_id', userId);
    return !error;
  }

  // ============================================================
  // CONVERSATIONS (1-to-1 chat)
  // ============================================================

  /** Get all conversations for a user, enriched with last message + unread count */
  async getConversations(userId: string): Promise<Conversation[]> {
    const { data, error } = await this.client
      .from('conversations')
      .select('*')
      .or(`participant_a_id.eq.${userId},participant_b_id.eq.${userId}`)
      .order('last_message_at', { ascending: false });

    if (error) return [];

    const convos = data || [];

    // Enrich each conversation
    const enriched = await Promise.all(convos.map(async (c: any) => {
      // Last message body
      const { data: msgs } = await this.client
        .from('messages')
        .select('body')
        .eq('conversation_id', c.id)
        .order('created_at', { ascending: false })
        .limit(1);
      const lastMessageBody = msgs?.[0]?.body ?? '';

      // Unread count for this user
      const { count: unreadCount } = await this.client
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', c.id)
        .eq('to_user_id', userId)
        .eq('is_read', false);

      // Other participant id
      const otherParticipantId = c.participant_a_id === userId ? c.participant_b_id : c.participant_a_id;

      // Other participant display name from users table
      const { data: otherUser } = await this.client
        .from('users')
        .select('email, name, username, agency_name, club_name')
        .eq('id', otherParticipantId)
        .single();
      const otherParticipantName = otherUser
        ? (otherUser.username || otherUser.name || otherUser.agency_name || otherUser.club_name || otherUser.email)
        : 'Unknown';

      return {
        ...c,
        last_message_body: lastMessageBody,
        unread_count: unreadCount ?? 0,
        other_participant_name: otherParticipantName,
      };
    }));

    return enriched.map(this.deserializeConversation.bind(this));
  }

  /** Get or create a conversation between two users. Returns the conversation. */
  async getOrCreateConversation(memberUserId: string, escortUserId: string, advertisementId?: string): Promise<Conversation> {
    // Normalize order: always store smaller UUID as participant_a
    const [pA, pB] = [memberUserId, escortUserId].sort();

    const { data: existing } = await this.client
      .from('conversations')
      .select('*')
      .eq('participant_a_id', pA)
      .eq('participant_b_id', pB)
      .single();

    if (existing) return this.deserializeConversation(existing);

    const { data, error } = await this.client
      .from('conversations')
      .insert([{
        participant_a_id: pA,
        participant_b_id: pB,
        advertisement_id: advertisementId ?? null,
      }])
      .select()
      .single();

    if (error) throw new InternalServerError(`Failed to create conversation: ${error.message}`);
    return this.deserializeConversation(data);
  }

  /** Get a conversation by ID, checking the user is a participant */
  async getConversationById(conversationId: string, userId: string): Promise<Conversation | null> {
    const { data, error } = await this.client
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .or(`participant_a_id.eq.${userId},participant_b_id.eq.${userId}`)
      .single();

    if (error || !data) return null;
    return this.deserializeConversation(data);
  }

  /** Get all messages in a conversation, marking recipient's messages as read */
  async getConversationMessages(conversationId: string, userId: string): Promise<Message[]> {
    const { data, error } = await this.client
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) return [];

    // Mark unread messages targeted at this user as read
    await this.client
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .eq('to_user_id', userId)
      .eq('is_read', false);

    return (data || []).map(this.deserializeMessage.bind(this));
  }

  /** Send a message inside a conversation */
  async sendConversationMessage(conversationId: string, fromUserId: string, fromName: string, toUserId: string, body: string): Promise<Message> {
    const { data, error } = await this.client
      .from('messages')
      .insert([{
        conversation_id: conversationId,
        from_user_id: fromUserId,
        to_user_id: toUserId,
        from_name: fromName,
        subject: '',
        body,
        is_read: false,
      }])
      .select()
      .single();

    if (error) throw new InternalServerError(`Failed to send message: ${error.message}`);

    // Update conversation's last_message_at
    await this.client
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId);

    // Notify recipient
    await this.createNotification(
      toUserId,
      'message',
      'Nuevo mensaje',
      `${fromName}: ${body.substring(0, 60)}`,
      conversationId,
    );

    return this.deserializeMessage(data);
  }

  // ============================================================
  // NOTIFICATIONS
  // ============================================================

  async getNotifications(userId: string): Promise<Notification[]> {
    const { data, error } = await this.client
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return [];
    return (data || []).map(this.deserializeNotification);
  }

  async createNotification(userId: string, type: string, title: string, message: string, relatedId?: string): Promise<Notification> {
    const { data, error } = await this.client
      .from('notifications')
      .insert([{
        user_id: userId,
        type,
        title,
        message,
        related_id: relatedId || null,
      }])
      .select()
      .single();

    if (error) throw new InternalServerError(`Failed to create notification: ${error.message}`);

    const notification = this.deserializeNotification(data);
    sseService.emit(userId, 'new_notification', notification);

    return notification;
  }

  async markNotificationRead(id: string, userId: string): Promise<boolean> {
    const { error } = await this.client
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', userId);
    return !error;
  }

  async deleteNotification(id: string, userId: string): Promise<boolean> {
    const { error } = await this.client
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    return !error;
  }

  // ============================================================
  // ADMIN SETTINGS
  // ============================================================

  async getAdminSetting(key: string): Promise<string | null> {
    const { data, error } = await this.client
      .from('admin_settings')
      .select('value')
      .eq('key', key)
      .single();
    if (error || !data) return null;
    return data.value;
  }

  async setAdminSetting(key: string, value: string): Promise<void> {
    await this.client
      .from('admin_settings')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  }

  async isPhotoVerificationRequiredForNewUploads(): Promise<boolean> {
    const value = await this.getAdminSetting(PHOTO_VERIFICATION_REQUIRED_SETTING_KEY);
    return this.parseBooleanAdminSetting(value, true);
  }

  // ============================================================
  // BOOST
  // ============================================================

  async boostAdvertisement(adId: string, userId: string): Promise<{ boostedAt: Date }> {
    const now = new Date();

    const { data, error } = await this.client
      .from('advertisements')
      .update({ boosted_until: now.toISOString() })
      .eq('id', adId)
      .eq('user_id', userId)
      .select('boosted_until')
      .single();

    if (error || !data) throw new NotFoundError('Advertisement not found');
    return { boostedAt: new Date(data.boosted_until) };
  }

  async getBoostStatus(adId: string, userId: string): Promise<{ boostedAt: Date | null }> {
    const { data, error } = await this.client
      .from('advertisements')
      .select('boosted_until')
      .eq('id', adId)
      .eq('user_id', userId)
      .single();

    if (error || !data) throw new NotFoundError('Advertisement not found');
    const boostedAt = data.boosted_until ? new Date(data.boosted_until) : null;
    return { boostedAt };
  }

  async getAdvertisementRanking(adId: string, userId: string): Promise<{
    position: number;
    totalInCategory: number;
    page: number;
    category: string;
  }> {
    // Get the ad's selected_plan and category
    const { data: ad, error: adError } = await this.client
      .from('advertisements')
      .select('category, selected_plan')
      .eq('id', adId)
      .eq('user_id', userId)
      .single();

    if (adError || !ad) throw new NotFoundError('Advertisement not found');

    const selectedPlan = (ad.selected_plan as string) || 'STANDARD';

    // Get all online ads with the same promotion plan, sorted by the same algorithm as searchProfiles
    const { data: ranked, error: rankError } = await this.client
      .from('advertisements')
      .select('id')
      .eq('is_online', true)
      .eq('selected_plan', selectedPlan)
      .order('plan_priority', { ascending: false })
      .order('boosted_until', { ascending: false, nullsFirst: false })
      .order('promoted_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (rankError) throw new InternalServerError('Failed to compute ranking');

    const rows = ranked || [];
    const totalInCategory = rows.length;
    const index = rows.findIndex((r: any) => r.id === adId);
    const position = index >= 0 ? index + 1 : totalInCategory + 1;
    const perPage = 30;
    const page = Math.ceil(position / perPage);

    return { position, totalInCategory, page, category: selectedPlan };
  }

  // ============================================================
  // PHOTO VERIFICATIONS
  // ============================================================

  async submitPhotosForVerification(adId: string, userId: string, photos: Array<{ url: string; publicId: string }>): Promise<void> {
    if (photos.length === 0) return;
    const rows = photos.map(p => ({
      advertisement_id: adId,
      user_id: userId,
      photo_url: p.url,
      public_id: p.publicId,
      status: 'PENDING',
    }));
    await this.client.from('photo_verifications').upsert(rows, { onConflict: 'public_id', ignoreDuplicates: true });
  }

  async getPhotoVerificationsForUser(userId: string): Promise<PhotoVerification[]> {
    const { data, error } = await this.client
      .from('photo_verifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) return [];
    return (data || []).map(this.deserializePhotoVerification);
  }

  async getPendingPhotoVerifications(page = 1, limit = 20): Promise<{ data: PhotoVerification[]; total: number }> {
    const offset = (page - 1) * limit;
    const { data, error, count } = await this.client
      .from('photo_verifications')
      .select('*', { count: 'exact' })
      .eq('status', 'PENDING')
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);
    if (error) return { data: [], total: 0 };
    return { data: (data || []).map(this.deserializePhotoVerification), total: count || 0 };
  }

  async getAllPhotoVerifications(page = 1, limit = 20, status?: string): Promise<{ data: PhotoVerification[]; total: number }> {
    const offset = (page - 1) * limit;
    let q = this.client
      .from('photo_verifications')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (status && status !== 'ALL') q = q.eq('status', status);
    const { data, error, count } = await q;
    if (error) return { data: [], total: 0 };
    return { data: (data || []).map(this.deserializePhotoVerification), total: count || 0 };
  }

  async updatePhotoVerificationStatus(id: string, status: 'VERIFIED' | 'REJECTED', adminComment?: string): Promise<PhotoVerification> {
    const { data, error } = await this.client
      .from('photo_verifications')
      .update({ status, admin_comment: adminComment || null, reviewed_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error || !data) throw new NotFoundError('Photo verification not found');
    return this.deserializePhotoVerification(data);
  }

  private deserializePhotoVerification(data: any): PhotoVerification {
    return {
      id: data.id,
      advertisementId: data.advertisement_id,
      userId: data.user_id,
      photoUrl: data.photo_url,
      publicId: data.public_id,
      status: data.status,
      adminComment: data.admin_comment,
      createdAt: new Date(data.created_at),
      reviewedAt: data.reviewed_at ? new Date(data.reviewed_at) : undefined,
    };
  }

  // ============================================================
  // BILLING - TRANSACTIONS
  // ============================================================

  async getTransactions(userId: string): Promise<Transaction[]> {
    const { data, error } = await this.client
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return [];
    return (data || []).map(this.deserializeTransaction);
  }

  async addTransaction(userId: string, type: 'income' | 'expense', description: string, amount: number): Promise<Transaction> {
    const { data, error } = await this.client
      .from('transactions')
      .insert([{ user_id: userId, type, description, amount }])
      .select()
      .single();

    if (error) throw new InternalServerError(`Failed to record transaction: ${error.message}`);
    return this.deserializeTransaction(data);
  }

  async getBalance(userId: string): Promise<{ totalBalance: number; totalIncome: number; totalExpenses: number }> {
    const { data, error } = await this.client
      .from('transactions')
      .select('type,amount')
      .eq('user_id', userId);

    if (error) return { totalBalance: 0, totalIncome: 0, totalExpenses: 0 };

    const rows = data || [];
    const totalIncome = rows.filter((r: any) => r.type === 'income').reduce((sum: number, r: any) => sum + parseFloat(r.amount), 0);
    const totalExpenses = rows.filter((r: any) => r.type === 'expense').reduce((sum: number, r: any) => sum + parseFloat(r.amount), 0);

    return {
      totalBalance: totalIncome - totalExpenses,
      totalIncome,
      totalExpenses,
    };
  }

  // ============================================================
  // BILLING - INVOICES
  // ============================================================

  async getInvoices(userId: string): Promise<Invoice[]> {
    const { data, error } = await this.client
      .from('invoices')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return [];
    return (data || []).map(this.deserializeInvoice);
  }

  async getInvoiceById(id: string, userId: string): Promise<Invoice | null> {
    const { data, error } = await this.client
      .from('invoices')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;
    return this.deserializeInvoice(data);
  }

  // ============================================================
  // SAVED SEARCHES
  // ============================================================

  async getSavedSearches(userId: string): Promise<SavedSearch[]> {
    const { data, error } = await this.client
      .from('saved_searches')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return [];
    return (data || []).map(this.deserializeSavedSearch);
  }

  async createSavedSearch(userId: string, name: string, queryString: string, resultsCount?: number): Promise<SavedSearch> {
    const { data, error } = await this.client
      .from('saved_searches')
      .insert([{
        user_id: userId,
        name,
        query_string: queryString,
        results_count: resultsCount || 0,
      }])
      .select()
      .single();

    if (error) throw new InternalServerError(`Failed to save search: ${error.message}`);
    return this.deserializeSavedSearch(data);
  }

  async deleteSavedSearch(id: string, userId: string): Promise<boolean> {
    const { error } = await this.client
      .from('saved_searches')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    return !error;
  }

  // ============================================================
  // TRENDING VIDEOS
  // ============================================================

  async getTrendingVideos(sortBy?: string, page: number = 1, limit: number = 20): Promise<{ videos: any[]; total: number }> {
    const allOwners = await this.getPromotionVideoOwners();
    const userIds = [...allOwners.keys()];
    if (userIds.length === 0) {
      return { videos: [], total: 0 };
    }

    const offset = (page - 1) * limit;
    let query = this.client
      .from('promotion_videos')
      .select('*', { count: 'exact' })
      .eq('is_public', true)
      .in('user_id', userIds);

    switch (sortBy) {
      case 'views':
        query = query.order('view_count', { ascending: false });
        break;
      case 'newest':
      default:
        query = query
          .order('published_at', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false });
        break;
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);
    if (error) {
      return { videos: [], total: 0 };
    }

    return {
      videos: (data || []).map((row: any) =>
        this.serializePromotionVideoForPublic(row, allOwners.get(row.user_id))
      ),
      total: count || 0,
    };
  }

  // ============================================================
  // SERIALIZATION HELPERS
  // ============================================================

  private async getPromotionVideoOwners(): Promise<Map<string, PromotionVideoOwner>> {
    const { data: advertisements } = await this.client
      .from('advertisements')
      .select('id, user_id, name, title, city, age, gender, selected_photo_ids')
      .eq('is_online', true)
      .eq('status', 'active');

    const ownerRows = advertisements || [];
    const userIds = ownerRows.map((row: any) => row.user_id);
    const profileImages = await this.getPromotionVideoOwnerPhotos(ownerRows);
    const owners = new Map<string, PromotionVideoOwner>();

    for (const row of ownerRows) {
      if (!userIds.includes(row.user_id)) continue;
      owners.set(row.user_id, {
        advertisementId: row.id,
        userId: row.user_id,
        name: row.name || 'Model',
        title: row.title || undefined,
        city: row.city || undefined,
        age: row.age || undefined,
        gender: normalizeAdvertisementGender(row.gender) || row.gender || undefined,
        profileImageUrl: profileImages.get(row.user_id),
      });
    }

    return owners;
  }

  private async getPromotionVideoOwnerPhotos(ownerRows: any[]): Promise<Map<string, string | undefined>> {
    const userIds = ownerRows.map((row) => row.user_id);
    const profileImages = new Map<string, string | undefined>();

    if (userIds.length === 0) {
      return profileImages;
    }

    const { data: photoRows } = await this.client
      .from('user_media')
      .select('user_id, url, public_id')
      .eq('resource_type', 'image')
      .in('user_id', userIds);

    const photoVerificationRequired = await this.isPhotoVerificationRequiredForNewUploads();
    const verificationStatusMap = await this.getPhotoVerificationStatusMap(
      (photoRows || []).map((row: any) => row.public_id),
      photoVerificationRequired,
    );

    const photosByUser = new Map<string, Array<{ url: string; publicId?: string }>>();
    for (const row of photoRows || []) {
      photosByUser.set(row.user_id, [
        ...(photosByUser.get(row.user_id) || []),
        { url: row.url, publicId: row.public_id || undefined },
      ]);
    }

    for (const owner of ownerRows) {
      const selectedPhotos = Array.isArray(owner.selected_photo_ids) ? owner.selected_photo_ids : [];
      const availablePhotos = (photosByUser.get(owner.user_id) || []).filter((photo) =>
        this.isPhotoSelectableForAdvertisement(
          photo.publicId ? verificationStatusMap.get(photo.publicId) : undefined
        )
      );
      const selectedPhoto =
        availablePhotos.find((photo) => selectedPhotos.includes(photo.url)) || availablePhotos[0];
      profileImages.set(
        owner.user_id,
        this.buildPublicModelPhotoUrl(selectedPhoto?.publicId, selectedPhoto?.url)
      );
    }

    return profileImages;
  }

  private serializePromotionVideoForPublic(row: any, owner?: PromotionVideoOwner | null): any {
    const durationSeconds = row.duration ? parseFloat(row.duration) : 0;

    return {
      id: row.id,
      title: row.title,
      description: row.description || undefined,
      thumbnailUrl: row.thumbnail_url || row.url,
      videoUrl: row.url,
      url: row.url,
      duration: this.formatPromotionVideoDuration(durationSeconds),
      durationSeconds,
      views: row.view_count || 0,
      userId: row.user_id,
      advertisementId: owner?.advertisementId,
      creatorName: owner?.name || 'Model',
      creatorTitle: owner?.title,
      city: owner?.city,
      age: owner?.age,
      gender: owner?.gender,
      profileImageUrl: owner?.profileImageUrl,
      isPublic: row.is_public ?? false,
      createdAt: row.created_at,
      publishedAt: row.published_at,
    };
  }

  private formatPromotionVideoDuration(durationSeconds: number): string {
    if (!durationSeconds || Number.isNaN(durationSeconds)) {
      return '00:00';
    }

    const totalSeconds = Math.max(0, Math.round(durationSeconds));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  private serializeAd(ad: Partial<Advertisement> & { userId?: string }): any {
    const row: any = {};
    if (ad.userId !== undefined) row.user_id = ad.userId;
    if (ad.name !== undefined) row.name = ad.name;
    if (ad.title !== undefined) row.title = ad.title;
    if (ad.description !== undefined) row.description = ad.description;
    if (ad.category !== undefined) row.category = ad.category;
    if (ad.isOnline !== undefined) row.is_online = ad.isOnline;
    if (ad.isVerified !== undefined) row.is_verified = ad.isVerified;
    if (ad.isPremium !== undefined) row.is_premium = ad.isPremium;
    if (ad.status !== undefined) row.status = ad.status;
    if (ad.country !== undefined) row.country = ad.country;
    if (ad.city !== undefined) row.city = ad.city;
    if (ad.cityPart !== undefined) row.city_part = ad.cityPart;
    if (ad.zipCode !== undefined) row.zip_code = ad.zipCode;
    if (ad.gender !== undefined) row.gender = normalizeAdvertisementGender(ad.gender) ?? ad.gender;
    if (ad.genderIdentity !== undefined) row.gender_identity = ad.genderIdentity;
    if (ad.orientation !== undefined) row.orientation = ad.orientation;
    if (ad.age !== undefined) row.age = ad.age;
    if (ad.ethnicity !== undefined) row.ethnicity = ad.ethnicity;
    if (ad.nationality !== undefined) row.nationality = ad.nationality;
    if (ad.languages !== undefined) row.languages = ad.languages;
    if (ad.height !== undefined) row.height = ad.height;
    if (ad.weight !== undefined) row.weight = ad.weight;
    if (ad.eyes !== undefined) row.eyes = ad.eyes;
    if (ad.bodyType !== undefined) row.body_type = ad.bodyType;
    if (ad.hairColor !== undefined) row.hair_color = ad.hairColor;
    if (ad.hairLength !== undefined) row.hair_length = ad.hairLength;
    if (ad.pubicHair !== undefined) row.pubic_hair = ad.pubicHair;
    if (ad.bustSize !== undefined) row.bust_size = ad.bustSize;
    if (ad.bustType !== undefined) row.bust_type = ad.bustType;
    if (ad.penisLength !== undefined) row.penis_length = ad.penisLength;
    if (ad.circumcised !== undefined) row.circumcised = ad.circumcised;
    if (ad.smoker !== undefined) row.smoker = ad.smoker;
    if (ad.tattoo !== undefined) row.tattoo = ad.tattoo;
    if (ad.piercing !== undefined) row.piercing = ad.piercing;
    if (ad.travel !== undefined) row.travel = ad.travel;
    if (ad.availableFor !== undefined) row.available_for = ad.availableFor;
    if (ad.meetingWith !== undefined) row.meeting_with = ad.meetingWith;
    if (ad.workingHours !== undefined) row.working_hours = ad.workingHours;
    if (ad.phone !== undefined) row.phone = ad.phone;
    if (ad.phoneVerified !== undefined) row.phone_verified = ad.phoneVerified;
    if (ad.lastSeenOnlineAt !== undefined) {
      row.last_seen_online_at = ad.lastSeenOnlineAt ? new Date(ad.lastSeenOnlineAt).toISOString() : null;
    }
    if (ad.presenceExpiresAt !== undefined) {
      row.presence_expires_at = ad.presenceExpiresAt ? new Date(ad.presenceExpiresAt).toISOString() : null;
    }
    if (ad.contactByPhone !== undefined) row.contact_by_phone = ad.contactByPhone;
    if (ad.contactByWhatsApp !== undefined) row.contact_by_whatsapp = ad.contactByWhatsApp;
    if (ad.contactBySignal !== undefined) row.contact_by_signal = ad.contactBySignal;
    if (ad.contactByTelegram !== undefined) row.contact_by_telegram = ad.contactByTelegram;
    if (ad.contactBySMS !== undefined) row.contact_by_sms = ad.contactBySMS;
    if (ad.contactByKinky !== undefined) row.contact_by_kinky = ad.contactByKinky;
    if (ad.kinkyEmailFrequency !== undefined) row.kinky_email_frequency = ad.kinkyEmailFrequency;
    if (ad.websiteUrl !== undefined) row.website_url = ad.websiteUrl;
    if (ad.promoSticker !== undefined) row.promo_sticker = ad.promoSticker;
    if (ad.budget !== undefined) row.budget = ad.budget;
    if (ad.idType !== undefined) row.id_type = ad.idType;
    if (ad.idNumber !== undefined) row.id_number = ad.idNumber;
    if ((ad as any).verificationPhotoPresence !== undefined) row.verification_photo_presence = (ad as any).verificationPhotoPresence;
    if ((ad as any).verificationPhotoBody !== undefined) row.verification_photo_body = (ad as any).verificationPhotoBody;
    if ((ad as any).verificationPhotoIdentity !== undefined) row.verification_photo_identity = (ad as any).verificationPhotoIdentity;
    if ((ad as any).titleEmoji !== undefined) row.title_emoji = (ad as any).titleEmoji;
    if (ad.promotionType !== undefined) row.promotion_type = ad.promotionType;
    if (ad.targetAudience !== undefined) row.target_audience = ad.targetAudience;
    if (ad.campaignDuration !== undefined) row.campaign_duration = ad.campaignDuration;
    if ((ad as any).selectedPlan !== undefined) {
      row.selected_plan = (ad as any).selectedPlan;
    }
    if ((ad as any).selectedDuration !== undefined) row.selected_duration = (ad as any).selectedDuration;
    if ((ad as any).selectedAddons !== undefined) row.selected_addons = (ad as any).selectedAddons;
    if ((ad as any).selectedPhotoIds !== undefined) row.selected_photo_ids = (ad as any).selectedPhotoIds;
    if ((ad as any).selectedVideoIds !== undefined) row.selected_video_ids = (ad as any).selectedVideoIds;
    if ((ad as any).boostedUntil !== undefined) row.boosted_until = (ad as any).boostedUntil ? new Date((ad as any).boostedUntil).toISOString() : null;
    return row;
  }

  private deserializeAd(data: any): Advertisement {
    const normalizedGender = normalizeAdvertisementGender(data.gender);
    const currentlyOnline = this.isAdvertisementCurrentlyOnlineRow(data);

    return {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      title: data.title,
      description: data.description,
      category: data.category,
      isOnline: data.is_online,
      currentlyOnline,
      isVerified: data.is_verified,
      isPremium: data.is_premium,
      status: data.status,
      country: data.country,
      city: data.city,
      cityPart: data.city_part,
      zipCode: data.zip_code,
      gender: normalizedGender ?? data.gender,
      genderIdentity: data.gender_identity,
      orientation: data.orientation,
      age: data.age,
      ethnicity: data.ethnicity,
      nationality: data.nationality,
      languages: data.languages,
      height: data.height,
      weight: data.weight,
      eyes: data.eyes,
      bodyType: data.body_type,
      hairColor: data.hair_color,
      hairLength: data.hair_length,
      pubicHair: data.pubic_hair,
      bustSize: data.bust_size,
      bustType: data.bust_type,
      penisLength: data.penis_length,
      circumcised: data.circumcised,
      smoker: data.smoker,
      tattoo: data.tattoo,
      piercing: data.piercing,
      travel: data.travel,
      availableFor: data.available_for,
      meetingWith: data.meeting_with,
      workingHours: data.working_hours,
      phone: data.phone,
      phoneVerified: data.phone_verified,
      lastSeenOnlineAt: data.last_seen_online_at ? new Date(data.last_seen_online_at) : undefined,
      presenceExpiresAt: data.presence_expires_at ? new Date(data.presence_expires_at) : undefined,
      contactByPhone: data.contact_by_phone ?? true,
      contactByWhatsApp: data.contact_by_whatsapp ?? true,
      contactBySignal: data.contact_by_signal ?? true,
      contactByTelegram: data.contact_by_telegram ?? true,
      contactBySMS: data.contact_by_sms ?? true,
      contactByKinky: data.contact_by_kinky ?? false,
      kinkyEmailFrequency: data.kinky_email_frequency || 'every',
      websiteUrl: data.website_url,
      promotedAt: data.promoted_at ? new Date(data.promoted_at) : undefined,
      promoSticker: data.promo_sticker,
      budget: data.budget ? parseFloat(data.budget) : undefined,
      idType: data.id_type,
      idNumber: data.id_number,
      verificationStatus: data.verification_status ?? 'PENDING',
      verificationPhotoPresence: data.verification_photo_presence,
      verificationPhotoBody: data.verification_photo_body,
      verificationPhotoIdentity: data.verification_photo_identity,
      titleEmoji: data.title_emoji,
      promotionType: data.promotion_type,
      targetAudience: data.target_audience,
      campaignDuration: data.campaign_duration,
      selectedPlan: data.selected_plan,
      selectedDuration: data.selected_duration,
      selectedAddons: data.selected_addons ?? [],
      planExpiresAt: data.plan_expires_at ? new Date(data.plan_expires_at) : undefined,
      selectedPhotoIds: data.selected_photo_ids || [],
      selectedVideoIds: data.selected_video_ids || [],
      planPriority: data.plan_priority ?? 0,
      boostedUntil: data.boosted_until ? new Date(data.boosted_until) : undefined,
      viewCount: data.view_count || 0,
      rating: parseFloat(data.rating) || 0,
      reviewCount: data.review_count || 0,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  private deserializeMedia(data: any): UserMedia {
    return {
      id: data.id,
      userId: data.user_id,
      url: data.url,
      publicId: data.public_id,
      resourceType: data.resource_type,
      width: data.width,
      height: data.height,
      format: data.format,
      duration: data.duration ? parseFloat(data.duration) : undefined,
      thumbnailUrl: data.thumbnail_url,
      uploadedAt: new Date(data.uploaded_at),
    };
  }

  private buildPublicModelPhotoMedia(media: UserMedia[]): UserMedia[] {
    return media.map((item) => ({
      ...item,
      url: this.buildPublicModelPhotoUrl(item.publicId, item.url),
    }));
  }

  private buildPublicModelPhotoUrl(publicId?: string, fallbackUrl?: string): string {
    if (!publicId) return fallbackUrl || '';
    return cloudinaryService.buildImageUrl(publicId, true);
  }

  private parseBooleanAdminSetting(value: string | null | undefined, defaultValue: boolean): boolean {
    if (value === undefined || value === null || value.trim() === '') {
      return defaultValue;
    }

    const normalized = value.trim().toLowerCase();
    if (['false', '0', 'no', 'off'].includes(normalized)) {
      return false;
    }
    if (['true', '1', 'yes', 'on'].includes(normalized)) {
      return true;
    }

    return defaultValue;
  }

  private async sanitizeAdvertisementPhotoSelection<T extends Partial<CreateAdvertisementDto>>(
    userId: string,
    dto: T,
    photoVerificationRequired: boolean,
  ): Promise<T> {
    if (!Object.prototype.hasOwnProperty.call(dto, 'selectedPhotoIds')) {
      return dto;
    }

    const selectedPhotoIds = Array.isArray((dto as any).selectedPhotoIds)
      ? ((dto as any).selectedPhotoIds as string[])
      : [];

    return {
      ...dto,
      selectedPhotoIds: await this.filterSelectablePhotoUrls(
        userId,
        selectedPhotoIds,
        photoVerificationRequired,
      ),
    };
  }

  private async applyPublicModelPhotoDeliveryToAdvertisement(
    ad: Advertisement,
    sourcePhotos: UserMedia[],
    photoVerificationRequired: boolean,
  ): Promise<void> {
    const selectablePhotos = await this.filterSelectablePhotos(
      sourcePhotos,
      photoVerificationRequired,
    );
    const selectedPhotoUrls = Array.isArray(ad.selectedPhotoIds) ? ad.selectedPhotoIds : [];
    const scopedPhotos =
      selectedPhotoUrls.length > 0
        ? selectablePhotos.filter((photo) => selectedPhotoUrls.includes(photo.url))
        : selectablePhotos;

    const deliveredPhotos = this.buildPublicModelPhotoMedia(scopedPhotos);
    ad.photos = deliveredPhotos;
    ad.selectedPhotoIds = deliveredPhotos.map((photo) => photo.url);
  }

  private async filterSelectablePhotoUrls(
    userId: string,
    selectedPhotoUrls: string[],
    photoVerificationRequired: boolean,
  ): Promise<string[]> {
    if (selectedPhotoUrls.length === 0) return [];

    const allPhotos = await this.getUserMedia(userId, 'image');
    const photoByUrl = new Map(allPhotos.map((photo) => [photo.url, photo]));
    const selectedPhotos = selectedPhotoUrls
      .map((url) => photoByUrl.get(url))
      .filter((photo): photo is UserMedia => Boolean(photo));

    const selectablePhotos = await this.filterSelectablePhotos(
      selectedPhotos,
      photoVerificationRequired,
    );
    const selectableUrls = new Set(selectablePhotos.map((photo) => photo.url));
    return selectedPhotoUrls.filter((url) => selectableUrls.has(url));
  }

  private async filterSelectablePhotos(
    photos: UserMedia[],
    photoVerificationRequired: boolean,
  ): Promise<UserMedia[]> {
    if (photos.length === 0) return [];

    const verificationStatusMap = await this.getPhotoVerificationStatusMap(
      photos.map((photo) => photo.publicId),
      photoVerificationRequired,
    );

    return photos.filter((photo) =>
      this.isPhotoSelectableForAdvertisement(verificationStatusMap.get(photo.publicId))
    );
  }

  private async getPhotoVerificationStatusMap(
    publicIds: Array<string | undefined>,
    photoVerificationRequired: boolean,
  ): Promise<Map<string, PhotoVerificationStatus>> {
    if (!photoVerificationRequired) {
      return new Map();
    }

    const normalizedPublicIds = Array.from(
      new Set(
        publicIds
          .map((publicId) => publicId?.trim())
          .filter((publicId): publicId is string => Boolean(publicId))
      )
    );

    if (normalizedPublicIds.length === 0) return new Map();

    const { data, error } = await this.client
      .from('photo_verifications')
      .select('public_id, status')
      .in('public_id', normalizedPublicIds);

    if (error) return new Map();

    const statusMap = new Map<string, PhotoVerificationStatus>();
    for (const row of data || []) {
      if (row.public_id) {
        statusMap.set(row.public_id, row.status as PhotoVerificationStatus);
      }
    }

    return statusMap;
  }

  private isPhotoSelectableForAdvertisement(status?: PhotoVerificationStatus): boolean {
    return !status || status === 'VERIFIED';
  }

  private deserializePromotionVideo(data: any): PromotionVideo {
    return {
      id: data.id,
      userId: data.user_id,
      title: data.title,
      description: data.description || undefined,
      url: data.url,
      publicId: data.public_id,
      thumbnailUrl: data.thumbnail_url || undefined,
      width: data.width || undefined,
      height: data.height || undefined,
      format: data.format || undefined,
      duration: data.duration ? parseFloat(data.duration) : undefined,
      isPublic: data.is_public ?? false,
      viewCount: data.view_count || 0,
      publishedAt: data.published_at ? new Date(data.published_at) : undefined,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  private isAdvertisementCurrentlyOnlineRow(data: { is_online?: boolean; presence_expires_at?: string | null }): boolean {
    if (!data?.is_online || !data.presence_expires_at) {
      return false;
    }

    const expiresAt = new Date(data.presence_expires_at).getTime();
    return Number.isFinite(expiresAt) && expiresAt > Date.now();
  }

  private deserializeReview(data: any): Review {
    return {
      id: data.id,
      advertisementId: data.advertisement_id,
      authorId: data.author_id,
      authorName: data.author_name,
      rating: data.rating,
      text: data.text,
      isRead: data.is_read,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  private deserializeMessage(data: any): Message {
    return {
      id: data.id,
      fromUserId: data.from_user_id,
      toUserId: data.to_user_id,
      fromName: data.from_name,
      subject: data.subject,
      body: data.body,
      isRead: data.is_read,
      parentId: data.parent_id,
      conversationId: data.conversation_id,
      createdAt: new Date(data.created_at),
    };
  }

  private deserializeConversation(data: any): Conversation {
    return {
      id: data.id,
      participantAId: data.participant_a_id,
      participantBId: data.participant_b_id,
      advertisementId: data.advertisement_id,
      lastMessageAt: new Date(data.last_message_at),
      createdAt: new Date(data.created_at),
      lastMessageBody: data.last_message_body,
      unreadCount: data.unread_count ?? 0,
      otherParticipantName: data.other_participant_name,
    };
  }

  private deserializeNotification(data: any): Notification {
    return {
      id: data.id,
      userId: data.user_id,
      type: data.type,
      title: data.title,
      message: data.message,
      isRead: data.is_read,
      relatedId: data.related_id,
      createdAt: new Date(data.created_at),
    };
  }

  private deserializeTransaction(data: any): Transaction {
    return {
      id: data.id,
      userId: data.user_id,
      type: data.type,
      description: data.description,
      amount: parseFloat(data.amount),
      balanceAfter: data.balance_after ? parseFloat(data.balance_after) : undefined,
      createdAt: new Date(data.created_at),
    };
  }

  private deserializeInvoice(data: any): Invoice {
    return {
      id: data.id,
      userId: data.user_id,
      invoiceNumber: data.invoice_number,
      amount: parseFloat(data.amount),
      status: data.status,
      description: data.description,
      dueDate: data.due_date ? new Date(data.due_date) : undefined,
      paidAt: data.paid_at ? new Date(data.paid_at) : undefined,
      pdfUrl: data.pdf_url,
      createdAt: new Date(data.created_at),
    };
  }

  private deserializeSavedSearch(data: any): SavedSearch {
    return {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      queryString: data.query_string,
      resultsCount: data.results_count || 0,
      createdAt: new Date(data.created_at),
    };
  }

  private async getAdServices(advertisementId: string): Promise<AdvertisementService[]> {
    const { data } = await this.client
      .from('advertisement_services')
      .select('*')
      .eq('advertisement_id', advertisementId);

    return (data || []).map((row: any) => ({
      id: row.id,
      advertisementId: row.advertisement_id,
      serviceName: row.service_name,
      price: row.price ? parseFloat(row.price) : undefined,
      notes: row.notes,
      createdAt: new Date(row.created_at),
    }));
  }

  private async getAdRates(advertisementId: string): Promise<AdvertisementRate[]> {
    const { data } = await this.client
      .from('advertisement_rates')
      .select('*')
      .eq('advertisement_id', advertisementId);

    return (data || []).map((row: any) => ({
      id: row.id,
      advertisementId: row.advertisement_id,
      timeLabel: row.time_label,
      incallPrice: row.incall_price,
      outcallPrice: row.outcall_price,
      createdAt: new Date(row.created_at),
    }));
  }

  // ============================================================
  // PROMOTION PLANS
  // ============================================================

  async getPromotionPlans(options: { includeHidden?: boolean } = {}): Promise<PromotionPlan[]> {
    let query = this.client
      .from('promotion_plans')
      .select('*');

    if (!options.includeHidden) {
      query = query.neq('availability_status', 'HIDDEN');
    }

    const { data, error } = await query;

    if (error) throw new InternalServerError(`Failed to fetch promotion plans: ${error.message}`);

    return (data || [])
      .map((row) => this.deserializePromotionPlan(row))
      .sort((left, right) => this.getPromotionPlanSortWeight(left.name) - this.getPromotionPlanSortWeight(right.name));
  }

  async updatePromotionPlan(
    id: string,
    updates: Partial<
      Pick<
        PromotionPlan,
        'pricePerDay' | 'pricePerWeek' | 'pricePerMonth' | 'displayName' | 'features' | 'isActive' | 'availabilityStatus' | 'expiresAt'
      >
    >,
  ): Promise<PromotionPlan> {
    const { data: currentPlan, error: currentPlanError } = await this.client
      .from('promotion_plans')
      .select('name, expires_at')
      .eq('id', id)
      .maybeSingle();

    if (currentPlanError) {
      throw new InternalServerError(`Failed to load current promotion plan: ${currentPlanError.message}`);
    }

    if (!currentPlan) {
      throw new NotFoundError('Promotion plan not found');
    }

    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.pricePerDay !== undefined) row.price_per_day = updates.pricePerDay;
    if (updates.pricePerWeek !== undefined) row.price_per_week = updates.pricePerWeek;
    if (updates.pricePerMonth !== undefined) row.price_per_month = updates.pricePerMonth;
    if (updates.displayName !== undefined) row.display_name = updates.displayName.trim();
    if (updates.features !== undefined) row.features = this.normalizePromotionPlanFeatures(updates.features);
    if (updates.expiresAt !== undefined) {
      row.expires_at = updates.expiresAt ? updates.expiresAt.toISOString() : null;
    }
    if (updates.availabilityStatus !== undefined) {
      const normalizedStatus = this.normalizePromotionPlanAvailabilityStatus(updates.availabilityStatus);
      row.availability_status = normalizedStatus;
      row.is_active = normalizedStatus !== 'HIDDEN';
    } else if (updates.isActive !== undefined) {
      row.is_active = updates.isActive;
      if (!updates.isActive) {
        row.availability_status = 'HIDDEN';
      }
    }

    const { data, error } = await this.client
      .from('promotion_plans')
      .update(row)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new InternalServerError(`Failed to update promotion plan: ${error.message}`);
    if (!data) throw new NotFoundError('Promotion plan not found');

    if (updates.expiresAt instanceof Date && !Number.isNaN(updates.expiresAt.getTime())) {
      const { error: adsError } = await this.client
        .from('advertisements')
        .update({
          plan_expires_at: updates.expiresAt.toISOString(),
        })
        .eq('selected_plan', data.name);

      if (adsError) {
        throw new InternalServerError(`Failed to sync advertisement plan expiry: ${adsError.message}`);
      }
    }

    return this.deserializePromotionPlan(data);
  }

  // ============================================================
  // ADVERTISEMENT PROMOTIONS
  // ============================================================

  async upsertAdvertisementPromotion(dto: UpsertAdvertisementPromotionDto): Promise<AdvertisementPromotion> {
    const row = {
      advertisement_id: dto.advertisementId,
      plan_id: dto.planId,
      duration_type: dto.durationType,
      price: dto.price,
      start_date: dto.startDate?.toISOString(),
      end_date: dto.endDate?.toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.client
      .from('advertisement_promotions')
      .upsert(row, { onConflict: 'advertisement_id' })
      .select()
      .single();

    if (error) throw new InternalServerError(`Failed to save promotion: ${error.message}`);
    return this.deserializeAdvertisementPromotion(data);
  }

  async getAdvertisementPromotion(advertisementId: string): Promise<AdvertisementPromotion | null> {
    const { data, error } = await this.client
      .from('advertisement_promotions')
      .select('*')
      .eq('advertisement_id', advertisementId)
      .maybeSingle();

    if (error) throw new InternalServerError(`Failed to fetch promotion: ${error.message}`);
    return data ? this.deserializeAdvertisementPromotion(data) : null;
  }

  private deserializePromotionPlan(data: any): PromotionPlan {
    return {
      id: data.id,
      name: data.name,
      displayName: (data.display_name || '').trim() || this.getDefaultPromotionPlanDisplayName(data.name),
      pricePerDay: parseFloat(data.price_per_day),
      pricePerWeek: parseFloat(data.price_per_week),
      pricePerMonth: parseFloat(data.price_per_month),
      features: this.normalizePromotionPlanFeatures(data.features),
      isActive: data.is_active,
      availabilityStatus: this.normalizePromotionPlanAvailabilityStatus(data.availability_status),
      expiresAt: data.expires_at ? new Date(data.expires_at) : null,
      updatedAt: new Date(data.updated_at),
    };
  }

  private normalizePromotionPlanFeatures(features: unknown): Record<string, unknown> {
    if (!features || typeof features !== 'object' || Array.isArray(features)) {
      return {};
    }

    const normalized: Record<string, unknown> = {};

    for (const [rawKey, rawValue] of Object.entries(features as Record<string, unknown>)) {
      const normalizedKey = this.normalizePromotionPlanFeatureKey(rawKey);
      normalized[normalizedKey] = rawValue;
    }

    if (typeof normalized.position === 'string') {
      normalized.position = this.normalizePromotionPlanPosition(normalized.position);
    }

    return normalized;
  }

  private normalizePromotionPlanFeatureKey(key: string): string {
    const normalized = key
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

    const canonicalKeys = new Set([
      'direct_contact',
      'unlimited_videos',
      'max_photos',
      'website_link',
      'rotating_banner',
      'promo_tag',
      'emoji_in_title',
      'promo_sticker_price_per_day',
      'boost_price_per_day',
      'emoji_price_per_day',
      'position',
    ]);

    return canonicalKeys.has(normalized) ? normalized : key;
  }

  private getDefaultPromotionPlanDisplayName(name: string): string {
    switch (name) {
      case 'LAUNCH':
        return 'Launch Plan';
      case 'PREMIUM':
        return 'Featured';
      case 'EXCLUSIVE':
        return 'Elite';
      default:
        return 'Standard';
    }
  }

  private getPromotionPlanSortWeight(name: string): number {
    switch (name) {
      case 'STANDARD':
        return 1;
      case 'LAUNCH':
        return 2;
      case 'PREMIUM':
        return 3;
      case 'EXCLUSIVE':
        return 4;
      default:
        return 99;
    }
  }

  private normalizePromotionPlanAvailabilityStatus(
    value: string | null | undefined,
  ): PromotionPlanAvailabilityStatus {
    if (!value) return 'AVAILABLE';

    const normalized = value
      .trim()
      .toUpperCase()
      .replace(/[^A-Z]+/g, '_')
      .replace(/^_+|_+$/g, '');

    if (normalized === 'COMING_SOON') return 'COMING_SOON';
    if (normalized === 'HIDDEN') return 'HIDDEN';
    return 'AVAILABLE';
  }

  private getPlanPriorityFromPosition(position: unknown): number {
    const normalizedPosition =
      typeof position === 'string'
        ? this.normalizePromotionPlanPosition(position)
        : '';

    if (normalizedPosition === 'above_premium') return 3;
    if (normalizedPosition === 'above_standard') return 2;
    if (normalizedPosition === 'standard') return 1;
    return 0;
  }

  private async resolvePlanPriorityForSelectedPlan(
    planName: string | null | undefined,
  ): Promise<number> {
    if (!planName) return 0;

    const { data, error } = await this.client
      .from('promotion_plans')
      .select('features')
      .eq('name', planName)
      .maybeSingle();

    if (!error && data) {
      const features = this.normalizePromotionPlanFeatures(data.features);
      const priority = this.getPlanPriorityFromPosition(features.position);
      if (priority > 0) return priority;
    }

    if (planName === 'EXCLUSIVE') return 3;
    if (planName === 'PREMIUM') return 2;
    if (planName === 'LAUNCH' || planName === 'STANDARD') return 1;
    return 0;
  }

  private normalizePromotionPlanPosition(position: string): string {
    const raw = position.trim();
    if (!raw) return raw;

    const normalized = raw
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

    const standardTokens = ['standard', 'standaard', 'estandar', 'padrao'];
    const aboveTokens = ['above', 'encima', 'boven', 'acima', 'nad'];

    if (normalized === 'above_standard' || normalized === 'above_premium') {
      return normalized;
    }

    if (standardTokens.includes(normalized)) {
      return 'standard';
    }

    if (normalized === 'premium') {
      return 'above_premium';
    }

    const hasAboveToken = aboveTokens.some((token) => normalized.includes(token));
    const hasStandardToken = standardTokens.some((token) => normalized.includes(token));

    if (normalized.includes('premium')) {
      return 'above_premium';
    }

    if (hasStandardToken) {
      return hasAboveToken ? 'above_standard' : 'standard';
    }

    return raw;
  }

  private deserializeAdvertisementPromotion(data: any): AdvertisementPromotion {
    return {
      id: data.id,
      advertisementId: data.advertisement_id,
      planId: data.plan_id,
      durationType: data.duration_type,
      price: parseFloat(data.price),
      startDate: data.start_date ? new Date(data.start_date) : undefined,
      endDate: data.end_date ? new Date(data.end_date) : undefined,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
}

// Singleton
let instance: AppDatabaseService | null = null;

export function getAppDatabaseService(): AppDatabaseService {
  if (!instance) {
    instance = new AppDatabaseService();
  }
  return instance;
}
