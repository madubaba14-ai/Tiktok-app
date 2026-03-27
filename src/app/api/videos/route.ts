import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { uploadFile, validateFile, extractHashtags, formatHashtagsForStorage } from '@/lib/upload';
import { calculateTrendingScore } from '@/lib/recommendation';

interface VideoWithAuthor {
  id: string;
  authorId: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  caption: string | null;
  hashtags: string;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  duration: number | null;
  width: number | null;
  height: number | null;
  fileSize: number | null;
  status: string;
  isFeatured: boolean;
  trendingScore: number;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
  author: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    isVerified: boolean;
  };
}

/**
 * GET /api/videos - List videos with pagination
 * Query params:
 * - cursor: string - last video id for pagination
 * - limit: number - number of videos to return (default: 20)
 * - authorId: string - filter by author
 * - hashtag: string - filter by hashtag
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const authorId = searchParams.get('authorId');
    const hashtag = searchParams.get('hashtag');

    // Build where clause
    const where: Record<string, unknown> = {
      status: 'PUBLISHED',
    };

    if (authorId) {
      where.authorId = authorId;
    }

    if (hashtag) {
      // SQLite JSON search for hashtag
      where.hashtags = {
        contains: `"${hashtag.toLowerCase()}"`,
      };
    }

    if (cursor) {
      where.id = { lt: cursor };
    }

    const videos = await db.video.findMany({
      where,
      orderBy: [
        { trendingScore: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isVerified: true,
          },
        },
      },
    });

    // Parse hashtags from JSON string to array
    const parsedVideos = videos.map((video) => ({
      ...video,
      hashtags: video.hashtags ? JSON.parse(video.hashtags) : [],
    }));

    // Get the next cursor
    const nextCursor = parsedVideos.length === limit ? parsedVideos[videos.length - 1]?.id : null;

    return NextResponse.json({
      videos: parsedVideos,
      nextCursor,
      hasMore: parsedVideos.length === limit,
    });
  } catch (error) {
    console.error('Error fetching videos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch videos' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/videos - Upload a new video
 * Form data:
 * - video: File - video file
 * - thumbnail: File? - thumbnail image
 * - caption: string? - video caption
 * - authorId: string - author user id
 * - duration: number? - video duration in seconds
 * - width: number? - video width
 * - height: number? - video height
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const videoFile = formData.get('video') as File | null;
    const thumbnailFile = formData.get('thumbnail') as File | null;
    const caption = formData.get('caption') as string | null;
    const authorId = formData.get('authorId') as string | null;
    const duration = formData.get('duration') ? parseInt(formData.get('duration') as string, 10) : null;
    const width = formData.get('width') ? parseInt(formData.get('width') as string, 10) : null;
    const height = formData.get('height') ? parseInt(formData.get('height') as string, 10) : null;

    // Validate required fields
    if (!videoFile) {
      return NextResponse.json(
        { error: 'Video file is required' },
        { status: 400 }
      );
    }

    if (!authorId) {
      return NextResponse.json(
        { error: 'Author ID is required' },
        { status: 400 }
      );
    }

    // Check if author exists
    const author = await db.user.findUnique({
      where: { id: authorId },
    });

    if (!author) {
      return NextResponse.json(
        { error: 'Author not found' },
        { status: 404 }
      );
    }

    // Validate video file
    const videoValidation = validateFile(videoFile, {
      allowedTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
      maxSizeBytes: 100 * 1024 * 1024, // 100MB
    });

    if (!videoValidation.valid) {
      return NextResponse.json(
        { error: videoValidation.error },
        { status: 400 }
      );
    }

    // Upload video
    const videoUpload = await uploadFile(videoFile, { folder: 'videos' });

    // Upload thumbnail if provided
    let thumbnailUrl: string | null = null;
    if (thumbnailFile) {
      const thumbnailValidation = validateFile(thumbnailFile, {
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
        maxSizeBytes: 5 * 1024 * 1024, // 5MB
      });

      if (thumbnailValidation.valid) {
        const thumbnailUpload = await uploadFile(thumbnailFile, { folder: 'thumbnails' });
        thumbnailUrl = thumbnailUpload.url;
      }
    }

    // Extract hashtags from caption
    const hashtags = caption ? extractHashtags(caption) : [];
    const hashtagsJson = formatHashtagsForStorage(hashtags);

    // Create video record
    const video = await db.video.create({
      data: {
        authorId,
        videoUrl: videoUpload.url,
        thumbnailUrl,
        caption,
        hashtags: hashtagsJson,
        duration,
        width,
        height,
        fileSize: videoUpload.size,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        trendingScore: 0, // Initial score, will be calculated
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isVerified: true,
          },
        },
      },
    });

    // Calculate and update trending score
    const trendingScore = calculateTrendingScore({
      viewsCount: video.viewsCount,
      likesCount: video.likesCount,
      commentsCount: video.commentsCount,
      sharesCount: video.sharesCount,
      createdAt: video.createdAt,
      publishedAt: video.publishedAt,
    });

    await db.video.update({
      where: { id: video.id },
      data: { trendingScore },
    });

    // Update user's video count
    await db.user.update({
      where: { id: authorId },
      data: {
        videosCount: { increment: 1 },
      },
    });

    return NextResponse.json({
      video: {
        ...video,
        trendingScore,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error uploading video:', error);
    return NextResponse.json(
      { error: 'Failed to upload video' },
      { status: 500 }
    );
  }
}
