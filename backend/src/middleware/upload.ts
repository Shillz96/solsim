import multer from 'multer';
import path from 'path';
import { promises as fs } from 'fs';
import sharp from 'sharp';
import { ValidationError } from '../utils/errorHandler.js';

/**
 * Avatar Upload Middleware
 * 
 * Handles file uploads with:
 * - Size limits (5MB max)
 * - File type validation (images only)
 * - Secure filename generation
 * - Image processing and optimization
 * - Automatic directory creation
 */

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads', 'avatars');

const ensureUploadDir = async () => {
  try {
    await fs.access(uploadsDir);
  } catch {
    await fs.mkdir(uploadsDir, { recursive: true });
  }
};

// Initialize upload directory
ensureUploadDir().catch(console.error);

// Configure multer storage
const storage = multer.memoryStorage(); // Use memory storage for processing

// File filter for image validation
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Check file type
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ValidationError('Only image files (JPEG, PNG, GIF, WebP) are allowed'));
  }
};

// Configure multer upload
export const avatarUpload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1 // Only one file at a time
  }
});

/**
 * Process and save avatar image
 * - Resizes to standard avatar dimensions
 * - Optimizes file size
 * - Generates unique filename
 * - Returns the saved file path
 */
export const processAvatar = async (
  buffer: Buffer, 
  userId: string, 
  originalName: string
): Promise<string> => {
  await ensureUploadDir();

  // Generate unique filename
  const timestamp = Date.now();
  const ext = path.extname(originalName).toLowerCase();
  const filename = `avatar_${userId}_${timestamp}${ext}`;
  const filepath = path.join(uploadsDir, filename);

  try {
    // Process image with Sharp
    let processedBuffer: Buffer;
    
    if (ext === '.gif') {
      // For GIFs, just resize but preserve animation
      processedBuffer = await sharp(buffer, { animated: true })
        .resize(300, 300, {
          fit: 'cover',
          position: 'center'
        })
        .toBuffer();
    } else {
      // For other formats, optimize and convert to WebP for better compression
      processedBuffer = await sharp(buffer)
        .resize(300, 300, {
          fit: 'cover',
          position: 'center'
        })
        .webp({ quality: 85 })
        .toBuffer();
      
      // Update filename to .webp for non-GIF images
      const webpFilename = `avatar_${userId}_${timestamp}.webp`;
      const webpFilepath = path.join(uploadsDir, webpFilename);
      
      await fs.writeFile(webpFilepath, processedBuffer);
      return `/uploads/avatars/${webpFilename}`;
    }

    // Save the processed image
    await fs.writeFile(filepath, processedBuffer);
    return `/uploads/avatars/${filename}`;

  } catch (error) {
    console.error('Error processing avatar:', error);
    throw new ValidationError('Failed to process avatar image');
  }
};

/**
 * Delete old avatar file
 */
export const deleteAvatarFile = async (avatarPath: string): Promise<void> => {
  if (!avatarPath || avatarPath.startsWith('http')) {
    return; // Don't delete external URLs
  }

  try {
    const fullPath = path.join(process.cwd(), avatarPath.replace(/^\//, ''));
    await fs.unlink(fullPath);
  } catch (error) {
    // Log but don't throw - file might already be deleted
    console.warn('Could not delete old avatar file:', avatarPath, error);
  }
};

/**
 * Validate uploaded avatar file
 */
export const validateAvatarFile = (file: Express.Multer.File): void => {
  if (!file) {
    throw new ValidationError('No avatar file provided');
  }

  // Double-check file size (multer should catch this, but be safe)
  if (file.size > 5 * 1024 * 1024) {
    throw new ValidationError('Avatar file must be smaller than 5MB');
  }

  // Validate file type again
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp'
  ];

  if (!allowedMimeTypes.includes(file.mimetype)) {
    throw new ValidationError('Avatar must be an image file (JPEG, PNG, GIF, WebP)');
  }
};