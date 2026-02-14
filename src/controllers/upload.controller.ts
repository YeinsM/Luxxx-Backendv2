import { Request, Response } from 'express';
import { getCloudinaryService } from '../services/cloudinary.service';

const cloudinaryService = getCloudinaryService();

/**
 * Upload a single image (base64)
 */
export const uploadImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { image, folder, tags } = req.body;

    if (!image) {
      res.status(400).json({ error: 'Image data is required' });
      return;
    }

    const result = await cloudinaryService.uploadBase64Image(image, {
      folder: folder || 'lusty/users',
      tags: tags || [],
      transformation: {
        quality: 'auto',
        format: 'webp',
      },
    });

    res.status(200).json({
      message: 'Image uploaded successfully',
      data: result,
    });
  } catch (error: any) {
    console.error('Upload image error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload image' });
  }
};

/**
 * Upload multiple images (base64)
 */
export const uploadMultipleImages = async (req: Request, res: Response): Promise<void> => {
  try {
    const { images, folder, tags } = req.body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      res.status(400).json({ error: 'Images array is required' });
      return;
    }

    const results = await cloudinaryService.uploadMultipleImages(images, {
      folder: folder || 'lusty/users',
      tags: tags || [],
      transformation: {
        quality: 'auto',
        format: 'webp',
      },
    });

    res.status(200).json({
      message: `${results.length} images uploaded successfully`,
      data: results,
    });
  } catch (error: any) {
    console.error('Upload multiple images error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload images' });
  }
};

/**
 * Delete an image
 */
export const deleteImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { publicId } = req.body;

    if (!publicId) {
      res.status(400).json({ error: 'Public ID is required' });
      return;
    }

    const result = await cloudinaryService.deleteImage(publicId);

    res.status(200).json({
      message: 'Image deleted successfully',
      data: result,
    });
  } catch (error: any) {
    console.error('Delete image error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete image' });
  }
};

/**
 * Delete multiple images
 */
export const deleteMultipleImages = async (req: Request, res: Response): Promise<void> => {
  try {
    const { publicIds } = req.body;

    if (!publicIds || !Array.isArray(publicIds) || publicIds.length === 0) {
      res.status(400).json({ error: 'Public IDs array is required' });
      return;
    }

    const results = await cloudinaryService.deleteMultipleImages(publicIds);

    res.status(200).json({
      message: `${results.length} images deleted successfully`,
      data: results,
    });
  } catch (error: any) {
    console.error('Delete multiple images error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete images' });
  }
};

/**
 * Get optimized URL for an image
 */
export const getOptimizedUrl = async (req: Request, res: Response): Promise<void> => {
  try {
    const { publicId, width, height, crop, quality, format } = req.query;

    if (!publicId || typeof publicId !== 'string') {
      res.status(400).json({ error: 'Public ID is required' });
      return;
    }

    const url = cloudinaryService.getOptimizedUrl(publicId, {
      width: width ? parseInt(width as string) : undefined,
      height: height ? parseInt(height as string) : undefined,
      crop: crop as any,
      quality: quality === 'auto' ? 'auto' : quality ? parseInt(quality as string) : undefined,
      format: format as string,
    });

    res.status(200).json({
      message: 'Optimized URL generated',
      data: { url },
    });
  } catch (error: any) {
    console.error('Get optimized URL error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate optimized URL' });
  }
};
