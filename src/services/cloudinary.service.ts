import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config';

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

export interface UploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  resourceType: string;
}

export interface UploadOptions {
  folder?: string;
  transformation?: {
    width?: number;
    height?: number;
    crop?: 'scale' | 'fit' | 'fill' | 'pad' | 'thumb';
    quality?: number | 'auto';
    format?: string;
  };
  tags?: string[];
}

export class CloudinaryService {
  private static instance: CloudinaryService;

  private constructor() {
    // Validate configuration
    if (!config.cloudinary.cloudName || !config.cloudinary.apiKey || !config.cloudinary.apiSecret) {
      console.warn('Cloudinary is not properly configured. Image upload will not work.');
    }
  }

  public static getInstance(): CloudinaryService {
    if (!CloudinaryService.instance) {
      CloudinaryService.instance = new CloudinaryService();
    }
    return CloudinaryService.instance;
  }

  /**
   * Upload an image from base64 string
   * @param base64Image Base64 encoded image (with or without data:image prefix)
   * @param options Upload options
   * @returns Upload result with URL and metadata
   */
  async uploadBase64Image(
    base64Image: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    try {
      const uploadOptions: any = {
        folder: options.folder || 'lusty/users',
        tags: options.tags || [],
      };

      if (options.transformation) {
        uploadOptions.transformation = options.transformation;
      }

      const result = await cloudinary.uploader.upload(base64Image, uploadOptions);

      return {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        resourceType: result.resource_type,
      };
    } catch (error: any) {
      console.error('Error uploading image to Cloudinary:', error);
      throw new Error(`Failed to upload image: ${error.message}`);
    }
  }

  /**
   * Upload an image from file path
   * @param filePath Path to the image file
   * @param options Upload options
   * @returns Upload result with URL and metadata
   */
  async uploadImageFromPath(
    filePath: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    try {
      const uploadOptions: any = {
        folder: options.folder || 'lusty/users',
        tags: options.tags || [],
      };

      if (options.transformation) {
        uploadOptions.transformation = options.transformation;
      }

      const result = await cloudinary.uploader.upload(filePath, uploadOptions);

      return {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        resourceType: result.resource_type,
      };
    } catch (error: any) {
      console.error('Error uploading image to Cloudinary:', error);
      throw new Error(`Failed to upload image: ${error.message}`);
    }
  }

  /**
   * Upload multiple images
   * @param images Array of base64 images or file paths
   * @param options Upload options
   * @returns Array of upload results
   */
  async uploadMultipleImages(
    images: string[],
    options: UploadOptions = {}
  ): Promise<UploadResult[]> {
    try {
      const uploadPromises = images.map((image) => {
        // Check if it's a file path or base64
        if (image.startsWith('data:') || image.includes('base64')) {
          return this.uploadBase64Image(image, options);
        } else {
          return this.uploadImageFromPath(image, options);
        }
      });

      return await Promise.all(uploadPromises);
    } catch (error: any) {
      console.error('Error uploading multiple images:', error);
      throw new Error(`Failed to upload images: ${error.message}`);
    }
  }

  /**
   * Delete an image from Cloudinary
   * @param publicId Public ID of the image to delete
   * @returns Deletion result
   */
  async deleteImage(publicId: string): Promise<{ result: string }> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result;
    } catch (error: any) {
      console.error('Error deleting image from Cloudinary:', error);
      throw new Error(`Failed to delete image: ${error.message}`);
    }
  }

  /**
   * Delete multiple images
   * @param publicIds Array of public IDs to delete
   * @returns Array of deletion results
   */
  async deleteMultipleImages(publicIds: string[]): Promise<any[]> {
    try {
      const deletePromises = publicIds.map((publicId) => this.deleteImage(publicId));
      return await Promise.all(deletePromises);
    } catch (error: any) {
      console.error('Error deleting multiple images:', error);
      throw new Error(`Failed to delete images: ${error.message}`);
    }
  }

  /**
   * Get optimized image URL with transformations
   * @param publicId Public ID of the image
   * @param transformation Transformation options
   * @returns Optimized image URL
   */
  getOptimizedUrl(
    publicId: string,
    transformation?: {
      width?: number;
      height?: number;
      crop?: 'scale' | 'fit' | 'fill' | 'pad' | 'thumb';
      quality?: number | 'auto';
      format?: string;
    }
  ): string {
    return cloudinary.url(publicId, {
      transformation: transformation || { quality: 'auto', fetch_format: 'auto' },
    });
  }

  /**
   * Get thumbnail URL for an image
   * @param publicId Public ID of the image
   * @param width Thumbnail width (default: 200)
   * @param height Thumbnail height (default: 200)
   * @returns Thumbnail URL
   */
  getThumbnailUrl(publicId: string, width: number = 200, height: number = 200): string {
    return this.getOptimizedUrl(publicId, {
      width,
      height,
      crop: 'thumb',
      quality: 'auto',
    });
  }

  /**
   * Upload a video from base64 string
   * @param base64Video Base64 encoded video (with or without data:video prefix)
   * @param options Upload options
   * @returns Upload result with URL and metadata
   */
  async uploadBase64Video(
    base64Video: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    try {
      const uploadOptions: any = {
        folder: options.folder || 'lusty/videos',
        tags: options.tags || [],
        resource_type: 'video',
      };

      if (options.transformation) {
        uploadOptions.transformation = options.transformation;
      }

      const result = await cloudinary.uploader.upload(base64Video, uploadOptions);

      return {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        resourceType: result.resource_type,
      };
    } catch (error: any) {
      console.error('Error uploading video to Cloudinary:', error);
      throw new Error(`Failed to upload video: ${error.message}`);
    }
  }

  /**
   * Upload a video from file path
   * @param filePath Path to the video file
   * @param options Upload options
   * @returns Upload result with URL and metadata
   */
  async uploadVideoFromPath(
    filePath: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    try {
      const uploadOptions: any = {
        folder: options.folder || 'lusty/videos',
        tags: options.tags || [],
        resource_type: 'video',
      };

      if (options.transformation) {
        uploadOptions.transformation = options.transformation;
      }

      const result = await cloudinary.uploader.upload(filePath, uploadOptions);

      return {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        resourceType: result.resource_type,
      };
    } catch (error: any) {
      console.error('Error uploading video to Cloudinary:', error);
      throw new Error(`Failed to upload video: ${error.message}`);
    }
  }

  /**
   * Delete a video from Cloudinary
   * @param publicId Public ID of the video to delete
   * @returns Deletion result
   */
  async deleteVideo(publicId: string): Promise<{ result: string }> {
    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: 'video',
      });
      return result;
    } catch (error: any) {
      console.error('Error deleting video from Cloudinary:', error);
      throw new Error(`Failed to delete video: ${error.message}`);
    }
  }
}

// Export singleton instance
export const getCloudinaryService = (): CloudinaryService => {
  return CloudinaryService.getInstance();
};
