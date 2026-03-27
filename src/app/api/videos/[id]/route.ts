import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/videos/[id] - Get a single video by ID
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    const video = await db.video.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isVerified: true,
            followersCount: true,
            videosCount: true,
          },
        },
      },
    });

    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    // Check if requesting user has liked this video
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    let isLiked = false;
    if (userId) {
      const like = await db.like.findUnique({
        where: {
          userId_videoId: {
            userId,
            videoId: id,
          },
        },
      });
      isLiked = !!like;
    }

    return NextResponse.json({
      video: {
        ...video,
        hashtags: video.hashtags ? JSON.parse(video.hashtags) : [],
        isLiked,
      },
    });
  } catch (error) {
    console.error('Error fetching video:', error);
    return NextResponse.json(
      { error: 'Failed to fetch video' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/videos/[id] - Delete a video
 * Query params:
 * - userId: string - the user requesting deletion (must be the author)
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Find the video
    const video = await db.video.findUnique({
      where: { id },
      select: { authorId: true },
    });

    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    // Check if user is the author
    if (video.authorId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized - you can only delete your own videos' },
        { status: 403 }
      );
    }

    // Delete the video (cascade will delete likes, comments, views)
    await db.video.delete({
      where: { id },
    });

    // Update user's video count
    await db.user.update({
      where: { id: userId },
      data: {
        videosCount: { decrement: 1 },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Video deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting video:', error);
    return NextResponse.json(
      { error: 'Failed to delete video' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/videos/[id] - Update video details
 * Body:
 * - caption: string?
 * - thumbnail: File?
 * - status: VideoStatus?
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    
    const caption = formData.get('caption') as string | null;
    const userId = formData.get('userId') as string | null;
    const status = formData.get('status') as string | null;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Find the video
    const video = await db.video.findUnique({
      where: { id },
      select: { authorId: true },
    });

    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    // Check if user is the author
    if (video.authorId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized - you can only update your own videos' },
        { status: 403 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (caption !== null) {
      updateData.caption = caption;
      // Update hashtags if caption changed
      const { extractHashtags, formatHashtagsForStorage } = await import('@/lib/upload');
      const hashtags = extractHashtags(caption);
      updateData.hashtags = formatHashtagsForStorage(hashtags);
    }

    if (status && ['PROCESSING', 'PUBLISHED', 'ARCHIVED', 'DELETED'].includes(status)) {
      updateData.status = status;
      if (status === 'PUBLISHED' && !video.authorId) {
        updateData.publishedAt = new Date();
      }
    }

    // Handle thumbnail update
    const thumbnailFile = formData.get('thumbnail') as File | null;
    if (thumbnailFile) {
      const { uploadFile, validateFile } = await import('@/lib/upload');
      const thumbnailValidation = validateFile(thumbnailFile, {
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
        maxSizeBytes: 5 * 1024 * 1024,
      });

      if (thumbnailValidation.valid) {
        const thumbnailUpload = await uploadFile(thumbnailFile, { folder: 'thumbnails' });
        updateData.thumbnailUrl = thumbnailUpload.url;
      }
    }

    // Update video
    const updatedVideo = await db.video.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json({
      video: updatedVideo,
    });
  } catch (error) {
    console.error('Error updating video:', error);
    return NextResponse.json(
      { error: 'Failed to update video' },
      { status: 500 }
    );
  }
}
