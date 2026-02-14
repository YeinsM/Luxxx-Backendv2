import { Request, Response } from 'express';
import { getCloudinaryService } from '../services/cloudinary.service';
import { getDatabaseService } from '../services/database.service';
import { MediaFile } from '../models/user.model';

const cloudinaryService = getCloudinaryService();
const databaseService = getDatabaseService();

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

    const user = await databaseService.getUserById(userId);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.status(200).json({
      message: 'Photos retrieved successfully',
      data: user.photos || [],
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

    const user = await databaseService.getUserById(userId);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.status(200).json({
      message: 'Videos retrieved successfully',
      data: user.videos || [],
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

    const user = await databaseService.getUserById(userId);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
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

    // Create MediaFile objects
    const newPhotos: MediaFile[] = uploadResults.map((result) => ({
      url: result.url,
      publicId: result.publicId,
      width: result.width,
      height: result.height,
      format: result.format,
      resourceType: 'image' as const,
      uploadedAt: new Date(),
    }));

    // Update user with new photos
    const updatedPhotos = [...(user.photos || []), ...newPhotos];
    const updatedUser = await databaseService.updateUser(userId, {
      ...user,
      photos: updatedPhotos,
    });

    res.status(200).json({
      message: `${newPhotos.length} photos uploaded successfully`,
      data: newPhotos,
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

    const user = await databaseService.getUserById(userId);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
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

    // Create MediaFile objects
    const newVideos: MediaFile[] = uploadResults.map((result) => ({
      url: result.url,
      publicId: result.publicId,
      width: result.width,
      height: result.height,
      format: result.format,
      resourceType: 'video' as const,
      uploadedAt: new Date(),
    }));

    // Update user with new videos
    const updatedVideos = [...(user.videos || []), ...newVideos];
    const updatedUser = await databaseService.updateUser(userId, {
      ...user,
      videos: updatedVideos,
    });

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

    const user = await databaseService.getUserById(userId);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Check if photo belongs to user
    const photoExists = user.photos?.some((photo) => photo.publicId === publicId);

    if (!photoExists) {
      res.status(404).json({ error: 'Photo not found' });
      return;
    }

    // Delete from Cloudinary
    await cloudinaryService.deleteImage(publicId);

    // Remove from user's photos
    const updatedPhotos = user.photos!.filter((photo) => photo.publicId !== publicId);
    await databaseService.updateUser(userId, {
      ...user,
      photos: updatedPhotos,
    });

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

    const user = await databaseService.getUserById(userId);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Check if video belongs to user
    const videoExists = user.videos?.some((video) => video.publicId === publicId);

    if (!videoExists) {
      res.status(404).json({ error: 'Video not found' });
      return;
    }

    // Delete from Cloudinary
    await cloudinaryService.deleteVideo(publicId);

    // Remove from user's videos
    const updatedVideos = user.videos!.filter((video) => video.publicId !== publicId);
    await databaseService.updateUser(userId, {
      ...user,
      videos: updatedVideos,
    });

    res.status(200).json({
      message: 'Video deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete video error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete video' });
  }
};
