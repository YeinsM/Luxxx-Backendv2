import { Request, Response } from 'express';
import { getCloudinaryService } from '../services/cloudinary.service';
import { getAppDatabaseService } from '../services/app-database.service';

const cloudinaryService = getCloudinaryService();
const db = getAppDatabaseService();

interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    userType: string;
  };
}

type UploadPromotionVideoInput = {
  data?: string;
  title?: string;
  description?: string;
};

function buildPromotionVideoTitle(value?: string, fallback: string = 'Promotion video'): string {
  const title = value?.trim();
  if (!title) return fallback;
  return title.slice(0, 160);
}

export const getMyPromotionVideos = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthRequest).user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const videos = await db.getUserPromotionVideos(userId);

    res.status(200).json({
      success: true,
      data: videos,
    });
  } catch (error: any) {
    console.error('Get promotion videos error:', error);
    res.status(500).json({ error: error.message || 'Failed to get promotion videos' });
  }
};

export const getMyPromotionVideoStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthRequest).user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const stats = await db.getPromotionVideoStats(userId);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('Get promotion video stats error:', error);
    res.status(500).json({ error: error.message || 'Failed to get promotion video stats' });
  }
};

export const uploadMyPromotionVideos = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthRequest).user?.userId;
    const { videos } = req.body as { videos?: UploadPromotionVideoInput[] };

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!Array.isArray(videos) || videos.length === 0) {
      res.status(400).json({ error: 'Videos array is required' });
      return;
    }

    const createdVideos = [];

    for (const [index, video] of videos.entries()) {
      if (!video?.data || typeof video.data !== 'string') {
        res.status(400).json({ error: 'Each promotion video requires a base64 payload' });
        return;
      }

      const uploadResult = await cloudinaryService.uploadBase64Video(video.data, {
        folder: `lusty/users/${userId}/promotion-videos`,
        tags: [userId, 'promotion-video'],
        transformation: {
          quality: 'auto',
        },
      });

      const createdVideo = await db.createPromotionVideo({
        userId,
        title: buildPromotionVideoTitle(video.title, `Promotion video ${index + 1}`),
        description: video.description?.trim() || undefined,
        url: uploadResult.url,
        publicId: uploadResult.publicId,
        thumbnailUrl: uploadResult.thumbnailUrl,
        width: uploadResult.width,
        height: uploadResult.height,
        format: uploadResult.format,
        duration: uploadResult.duration,
        isPublic: false,
      });

      createdVideos.push(createdVideo);
    }

    res.status(200).json({
      success: true,
      message: `${createdVideos.length} promotion videos uploaded successfully`,
      data: createdVideos,
    });
  } catch (error: any) {
    console.error('Upload promotion videos error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload promotion videos' });
  }
};

export const updateMyPromotionVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthRequest).user?.userId;
    const { title, description, isPublic } = req.body as {
      title?: string;
      description?: string;
      isPublic?: boolean;
    };

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const updatedVideo = await db.updatePromotionVideo(req.params.id, userId, {
      title: title !== undefined ? buildPromotionVideoTitle(title) : undefined,
      description: description !== undefined ? description.trim() : undefined,
      isPublic,
    });

    if (!updatedVideo) {
      res.status(404).json({ error: 'Promotion video not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: updatedVideo,
    });
  } catch (error: any) {
    console.error('Update promotion video error:', error);
    res.status(500).json({ error: error.message || 'Failed to update promotion video' });
  }
};

export const deleteMyPromotionVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthRequest).user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const video = await db.getPromotionVideoById(req.params.id, userId);
    if (!video) {
      res.status(404).json({ error: 'Promotion video not found' });
      return;
    }

    await cloudinaryService.deleteVideo(video.publicId);
    const deleted = await db.deletePromotionVideo(video.id, userId);

    if (!deleted) {
      res.status(404).json({ error: 'Promotion video not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Promotion video deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete promotion video error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete promotion video' });
  }
};
