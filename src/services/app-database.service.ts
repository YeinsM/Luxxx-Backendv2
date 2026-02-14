import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config';
import {
  Advertisement,
  AdvertisementService,
  AdvertisementRate,
  UserMedia,
  Review,
  Message,
  Notification,
  Transaction,
  Invoice,
  SavedSearch,
  CreateAdvertisementDto,
  ProfileSearchParams,
} from '../models/advertisement.model';
import { InternalServerError, NotFoundError } from '../models/error.model';

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
    const { services, rates, ...adData } = dto;

    const row = this.serializeAd({ ...adData, userId } as any);
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
    ad.photos = await this.getUserMedia(ad.userId, 'image');
    ad.videos = await this.getUserMedia(ad.userId, 'video');
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
    ad.photos = await this.getUserMedia(userId, 'image');
    ad.videos = await this.getUserMedia(userId, 'video');
    return ad;
  }

  async updateAdvertisement(id: string, userId: string, dto: Partial<CreateAdvertisementDto>): Promise<Advertisement> {
    const { services, rates, ...adData } = dto;
    const row = this.serializeAd(adData as any);

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

  async verifyAdvertisement(id: string, userId: string, idType: string, idNumber: string): Promise<Advertisement> {
    const { data, error } = await this.client
      .from('advertisements')
      .update({
        id_type: idType,
        id_number: idNumber,
        verification_status: 'submitted',
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
    const { category, city, query, sortBy, page = 1, limit = 20 } = params;
    const offset = (page - 1) * limit;

    let q = this.client
      .from('advertisements')
      .select('*', { count: 'exact' })
      .eq('status', 'active');

    if (category && category !== 'all') {
      q = q.eq('category', category);
    }
    if (city) {
      q = q.ilike('city', `%${city}%`);
    }
    if (query) {
      q = q.or(`name.ilike.%${query}%,description.ilike.%${query}%,title.ilike.%${query}%`);
    }

    // Sorting
    switch (sortBy) {
      case 'rating':
        q = q.order('rating', { ascending: false });
        break;
      case 'newest':
        q = q.order('created_at', { ascending: false });
        break;
      default:
        q = q.order('is_premium', { ascending: false }).order('promoted_at', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false });
    }

    q = q.range(offset, offset + limit - 1);

    const { data, error, count } = await q;

    if (error) throw new InternalServerError(`Failed to search profiles: ${error.message}`);

    const profiles = await Promise.all(
      (data || []).map(async (row: any) => {
        const ad = this.deserializeAd(row);
        ad.services = await this.getAdServices(ad.id);
        ad.rates = await this.getAdRates(ad.id);
        ad.photos = await this.getUserMedia(ad.userId, 'image');
        return ad;
      })
    );

    return { profiles, total: count || 0 };
  }

  async getProfileStats(): Promise<{ total: number; online: number; premium: number; avgRating: number }> {
    const { data, error } = await this.client
      .from('advertisements')
      .select('is_online,is_premium,rating')
      .eq('status', 'active');

    if (error) throw new InternalServerError('Failed to get stats');

    const rows = data || [];
    const total = rows.length;
    const online = rows.filter((r: any) => r.is_online).length;
    const premium = rows.filter((r: any) => r.is_premium).length;
    const avgRating = total > 0 ? rows.reduce((sum: number, r: any) => sum + (parseFloat(r.rating) || 0), 0) / total : 0;

    return { total, online, premium, avgRating: Math.round(avgRating * 10) / 10 };
  }

  async incrementViewCount(id: string): Promise<void> {
    // Use RPC or raw update - Supabase doesn't support increment directly in JS client easily
    const { data } = await this.client.from('advertisements').select('view_count').eq('id', id).single();
    if (data) {
      await this.client.from('advertisements').update({ view_count: (data.view_count || 0) + 1 }).eq('id', id);
    }
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
    return this.deserializeNotification(data);
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
    const offset = (page - 1) * limit;

    let q = this.client
      .from('user_media')
      .select('*, users!inner(id, name)', { count: 'exact' })
      .eq('resource_type', 'video');

    switch (sortBy) {
      case 'newest':
        q = q.order('uploaded_at', { ascending: false });
        break;
      default:
        q = q.order('uploaded_at', { ascending: false });
    }

    q = q.range(offset, offset + limit - 1);

    const { data, error, count } = await q;

    if (error) {
      // Fallback: query without join
      const { data: vData, error: vError, count: vCount } = await this.client
        .from('user_media')
        .select('*', { count: 'exact' })
        .eq('resource_type', 'video')
        .order('uploaded_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (vError) return { videos: [], total: 0 };
      return {
        videos: (vData || []).map(this.deserializeMedia),
        total: vCount || 0,
      };
    }

    return {
      videos: (data || []).map((row: any) => ({
        ...this.deserializeMedia(row),
        userName: row.users?.name,
      })),
      total: count || 0,
    };
  }

  // ============================================================
  // SERIALIZATION HELPERS
  // ============================================================

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
    if (ad.gender !== undefined) row.gender = ad.gender;
    if (ad.genderIdentity !== undefined) row.gender_identity = ad.genderIdentity;
    if (ad.orientation !== undefined) row.orientation = ad.orientation;
    if (ad.age !== undefined) row.age = ad.age;
    if (ad.ethnicity !== undefined) row.ethnicity = ad.ethnicity;
    if (ad.nationality !== undefined) row.nationality = ad.nationality;
    if (ad.languages !== undefined) row.languages = ad.languages;
    if (ad.height !== undefined) row.height = ad.height;
    if (ad.weight !== undefined) row.weight = ad.weight;
    if (ad.eyes !== undefined) row.eyes = ad.eyes;
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
    if (ad.websiteUrl !== undefined) row.website_url = ad.websiteUrl;
    if (ad.promoSticker !== undefined) row.promo_sticker = ad.promoSticker;
    if (ad.budget !== undefined) row.budget = ad.budget;
    if (ad.idType !== undefined) row.id_type = ad.idType;
    if (ad.idNumber !== undefined) row.id_number = ad.idNumber;
    if (ad.promotionType !== undefined) row.promotion_type = ad.promotionType;
    if (ad.targetAudience !== undefined) row.target_audience = ad.targetAudience;
    if (ad.campaignDuration !== undefined) row.campaign_duration = ad.campaignDuration;
    return row;
  }

  private deserializeAd(data: any): Advertisement {
    return {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      title: data.title,
      description: data.description,
      category: data.category,
      isOnline: data.is_online,
      isVerified: data.is_verified,
      isPremium: data.is_premium,
      status: data.status,
      country: data.country,
      city: data.city,
      cityPart: data.city_part,
      zipCode: data.zip_code,
      gender: data.gender,
      genderIdentity: data.gender_identity,
      orientation: data.orientation,
      age: data.age,
      ethnicity: data.ethnicity,
      nationality: data.nationality,
      languages: data.languages,
      height: data.height,
      weight: data.weight,
      eyes: data.eyes,
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
      websiteUrl: data.website_url,
      promotedAt: data.promoted_at ? new Date(data.promoted_at) : undefined,
      promoSticker: data.promo_sticker,
      budget: data.budget ? parseFloat(data.budget) : undefined,
      idType: data.id_type,
      idNumber: data.id_number,
      verificationStatus: data.verification_status,
      promotionType: data.promotion_type,
      targetAudience: data.target_audience,
      campaignDuration: data.campaign_duration,
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
      createdAt: new Date(data.created_at),
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
}

// Singleton
let instance: AppDatabaseService | null = null;

export function getAppDatabaseService(): AppDatabaseService {
  if (!instance) {
    instance = new AppDatabaseService();
  }
  return instance;
}
