import { Request, Response } from 'express';
import { getCloudinaryService } from '../services/cloudinary.service';
import { getAppDatabaseService } from '../services/app-database.service';
import { UserMedia } from '../models/advertisement.model';

const cloudinaryService = getCloudinaryService();
const db = getAppDatabaseService();

// Extend Request type to include user from auth middleware
interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    userType: string;
  };
}

/**
 * Get all photos of the authenticated user
 */
export const getMyPhotos = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthRequest).user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const photos = await db.getUserMedia(userId, 'image');

    res.status(200).json({
      message: 'Photos retrieved successfully',
      data: photos,
    });
  } catch (error: any) {
    console.error('Get photos error:', error);
    res.status(500).json({ error: error.message || 'Failed to get photos' });
  }
};

/**
 * Get all videos of the authenticated user
 */
export const getMyVideos = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthRequest).user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const videos = await db.getUserMedia(userId, 'video');

    res.status(200).json({
      message: 'Videos retrieved successfully',
      data: videos,
    });
  } catch (error: any) {
    console.error('Get videos error:', error);
    res.status(500).json({ error: error.message || 'Failed to get videos' });
  }
};

/**
 * Upload photos for the authenticated user
 */
export const uploadMyPhotos = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthRequest).user?.userId;
    const { photos } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!photos || !Array.isArray(photos) || photos.length === 0) {
      res.status(400).json({ error: 'Photos array is required' });
      return;
    }

    // Upload photos to Cloudinary
    const uploadResults = await cloudinaryService.uploadMultipleImages(photos, {
      folder: `lusty/users/${userId}/photos`,
      tags: [userId, 'profile-photo'],
      transformation: {
        quality: 'auto',
        format: 'webp',
      },
    });

    // Save each photo to user_media table
    const newPhotos: UserMedia[] = [];
    for (const result of uploadResults) {
      const media = await db.createUserMedia({
        userId,
        url: result.url,
        publicId: result.publicId,
        resourceType: 'image',
        width: result.width,
        height: result.height,
        format: result.format,
      });
      newPhotos.push(media);
    }

    // If the user already has a published ad, submit new photos for verification
    const existingAd = await db.getAdvertisementByUserId(userId);
    if (existingAd && existingAd.isOnline) {
      await db.submitPhotosForVerification(
        existingAd.id,
        userId,
        newPhotos.map(p => ({ url: p.url, publicId: p.publicId }))
      );
    }

    res.status(200).json({
      message: `${newPhotos.length} photos uploaded successfully`,
      data: newPhotos,
      pendingVerification: !!(existingAd && existingAd.isOnline),
    });
  } catch (error: any) {
    console.error('Upload photos error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload photos' });
  }
};

/**
 * Upload videos for the authenticated user
 */
export const uploadMyVideos = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthRequest).user?.userId;
    const { videos } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!videos || !Array.isArray(videos) || videos.length === 0) {
      res.status(400).json({ error: 'Videos array is required' });
      return;
    }

    // Upload videos to Cloudinary
    const uploadPromises = videos.map((video) =>
      cloudinaryService.uploadBase64Video(video, {
        folder: `lusty/users/${userId}/videos`,
        tags: [userId, 'profile-video'],
        transformation: {
          quality: 'auto',
        },
      })
    );

    const uploadResults = await Promise.all(uploadPromises);

    // Save each video to user_media table
    const newVideos: UserMedia[] = [];
    for (const result of uploadResults) {
      const media = await db.createUserMedia({
        userId,
        url: result.url,
        publicId: result.publicId,
        resourceType: 'video',
        width: result.width,
        height: result.height,
        format: result.format,
        duration: result.duration,
        thumbnailUrl: result.thumbnailUrl,
      });
      newVideos.push(media);
    }

    res.status(200).json({
      message: `${newVideos.length} videos uploaded successfully`,
      data: newVideos,
    });
  } catch (error: any) {
    console.error('Upload videos error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload videos' });
  }
};

/**
 * Upload verification photos — stored in a private Cloudinary folder,
 * never persisted to user_media so they never appear in the user's album.
 */
export const uploadVerificationPhoto = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthRequest).user?.userId;
    const { photo } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!photo || typeof photo !== 'string') {
      res.status(400).json({ error: 'A base64 photo string is required' });
      return;
    }

    const result = await cloudinaryService.uploadBase64Image(photo, {
      folder: `lusty/private/verification/${userId}`,
      tags: [userId, 'verification'],
      transformation: { quality: 'auto', format: 'webp' },
    });

    res.status(200).json({
      message: 'Verification photo uploaded successfully',
      data: { url: result.url, publicId: result.publicId },
    });
  } catch (error: any) {
    console.error('Upload verification photo error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload verification photo' });
  }
};

/**
 * Delete a photo of the authenticated user
 */
export const deleteMyPhoto = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthRequest).user?.userId;
    const { publicId } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!publicId) {
      res.status(400).json({ error: 'Public ID is required' });
      return;
    }

    // Delete from Cloudinary
    await cloudinaryService.deleteImage(publicId);

    // Delete from user_media table
    const deleted = await db.deleteUserMediaByPublicId(publicId, userId);

    if (!deleted) {
      res.status(404).json({ error: 'Photo not found' });
      return;
    }

    res.status(200).json({
      message: 'Photo deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete photo error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete photo' });
  }
};

/**
 * Delete a video of the authenticated user
 */
export const deleteMyVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthRequest).user?.userId;
    const { publicId } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!publicId) {
      res.status(400).json({ error: 'Public ID is required' });
      return;
    }

    // Delete from Cloudinary
    await cloudinaryService.deleteVideo(publicId);

    // Delete from user_media table
    const deleted = await db.deleteUserMediaByPublicId(publicId, userId);

    if (!deleted) {
      res.status(404).json({ error: 'Video not found' });
      return;
    }

    res.status(200).json({
      message: 'Video deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete video error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete video' });
  }
};

/** GET /api/profile/media/photo-verifications — User's own photo verification statuses */
export const getMyPhotoVerifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthRequest).user?.userId;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const verifications = await db.getPhotoVerificationsForUser(userId);
    res.status(200).json({ success: true, data: verifications });
  } catch (error: any) {
    console.error('Get photo verifications error:', error);
    res.status(500).json({ error: error.message || 'Failed to get photo verifications' });
  }
};
