import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

export interface UploadResult {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

export interface UploadOptions {
  folder?: string;
  allowedTypes?: string[];
  maxSizeBytes?: number;
}

const DEFAULT_ALLOWED_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

const DEFAULT_MAX_SIZE = 100 * 1024 * 1024; // 100MB

/**
 * Generates a unique filename with the original extension
 */
export function generateUniqueFilename(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  const uuid = randomUUID();
  return `${uuid}${ext}`;
}

/**
 * Ensures the upload directory exists
 */
async function ensureUploadDir(folder: string): Promise<string> {
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', folder);
  
  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true });
  }
  
  return uploadDir;
}

/**
 * Validates file against allowed types and size
 */
export function validateFile(
  file: File,
  options: UploadOptions = {}
): { valid: boolean; error?: string } {
  const {
    allowedTypes = DEFAULT_ALLOWED_TYPES,
    maxSizeBytes = DEFAULT_MAX_SIZE,
  } = options;

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
    };
  }

  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File size ${file.size} bytes exceeds maximum allowed size of ${maxSizeBytes} bytes`,
    };
  }

  return { valid: true };
}

/**
 * Determines if the file is a video
 */
export function isVideoFile(mimeType: string): boolean {
  return mimeType.startsWith('video/');
}

/**
 * Determines if the file is an image
 */
export function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

/**
 * Gets the appropriate folder based on file type
 */
export function getFolderByType(mimeType: string): string {
  if (isVideoFile(mimeType)) {
    return 'videos';
  }
  if (isImageFile(mimeType)) {
    return 'images';
  }
  return 'files';
}

/**
 * Uploads a file to the public directory
 */
export async function uploadFile(
  file: File,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const { folder: customFolder } = options;
  
  // Determine folder
  const folder = customFolder || getFolderByType(file.type);
  
  // Ensure upload directory exists
  const uploadDir = await ensureUploadDir(folder);
  
  // Generate unique filename
  const filename = generateUniqueFilename(file.name);
  const filepath = path.join(uploadDir, filename);
  
  // Convert File to ArrayBuffer and write to disk
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  
  await writeFile(filepath, buffer);
  
  // Generate public URL
  const url = `/uploads/${folder}/${filename}`;
  
  return {
    url,
    filename,
    size: file.size,
    mimeType: file.type,
  };
}

/**
 * Uploads multiple files
 */
export async function uploadFiles(
  files: File[],
  options: UploadOptions = {}
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];
  
  for (const file of files) {
    const result = await uploadFile(file, options);
    results.push(result);
  }
  
  return results;
}

/**
 * Extracts hashtags from caption text
 */
export function extractHashtags(caption: string): string[] {
  const hashtagRegex = /#[\w\u0590-\u05ff\u0600-\u06ff]+/g;
  const matches = caption.match(hashtagRegex) || [];
  
  // Remove the # symbol and convert to lowercase
  return matches.map(tag => tag.substring(1).toLowerCase());
}

/**
 * Formats hashtags for storage (as JSON string)
 */
export function formatHashtagsForStorage(hashtags: string[]): string {
  return JSON.stringify(hashtags);
}

/**
 * Parses hashtags from storage
 */
export function parseHashtagsFromStorage(hashtagsJson: string): string[] {
  try {
    return JSON.parse(hashtagsJson) as string[];
  } catch {
    return [];
  }
}
