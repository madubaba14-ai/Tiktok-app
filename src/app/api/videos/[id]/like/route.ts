import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { updateVideoTrendingScore } from '@/lib/recommendation';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/videos/[id]/like - Like a video
 * Body:
 * - userId: string - the user liking the video
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: videoId } = await params;
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check if video exists
    const video = await db.video.findUnique({
      where: { id: videoId },
      select: { id: true, authorId: true },
    });

    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    // Check if user exists
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if already liked
    const existingLike = await db.like.findUnique({
      where: {
        userId_videoId: {
          userId,
          videoId,
        },
      },
    });

    if (existingLike) {
      return NextResponse.json(
        { error: 'Already liked this video' },
        { status: 400 }
      );
    }

    // Create like
    await db.like.create({
      data: {
        userId,
        videoId,
      },
    });

    // Update video likes count
    const updatedVideo = await db.video.update({
      where: { id: videoId },
      data: {
        likesCount: { increment: 1 },
      },
    });

    // Update author's total likes
    await db.user.update({
      where: { id: video.authorId },
      data: {
        likesCount: { increment: 1 },
      },
    });

    // Update trending score
    await updateVideoTrendingScore(videoId);

    return NextResponse.json({
      success: true,
      likesCount: updatedVideo.likesCount,
    });
  } catch (error) {
    console.error('Error liking video:', error);
    return NextResponse.json(
      { error: 'Failed to like video' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/videos/[id]/like - Unlike a video
 * Query params:
 * - userId: string - the user unliking the video
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: videoId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check if like exists
    const existingLike = await db.like.findUnique({
      where: {
        userId_videoId: {
          userId,
          videoId,
        },
      },
    });

    if (!existingLike) {
      return NextResponse.json(
        { error: 'Not liked this video' },
        { status: 400 }
      );
    }

    // Get video for author info
    const video = await db.video.findUnique({
      where: { id: videoId },
      select: { authorId: true },
    });

    // Delete like
    await db.like.delete({
      where: {
        userId_videoId: {
          userId,
          videoId,
        },
      },
    });

    // Update video likes count
    const updatedVideo = await db.video.update({
      where: { id: videoId },
      data: {
        likesCount: { decrement: 1 },
      },
    });

    // Update author's total likes
    if (video) {
      await db.user.update({
        where: { id: video.authorId },
        data: {
          likesCount: { decrement: 1 },
        },
      });
    }

    // Update trending score
    await updateVideoTrendingScore(videoId);

    return NextResponse.json({
      success: true,
      likesCount: updatedVideo.likesCount,
    });
  } catch (error) {
    console.error('Error unliking video:', error);
    return NextResponse.json(
      { error: 'Failed to unlike video' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/videos/[id]/like - Check if user has liked the video
 * Query params:
 * - userId: string - the user to check
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: videoId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const like = await db.like.findUnique({
      where: {
        userId_videoId: {
          userId,
          videoId,
        },
      },
    });

    return NextResponse.json({
      isLiked: !!like,
    });
  } catch (error) {
    console.error('Error checking like status:', error);
    return NextResponse.json(
      { error: 'Failed to check like status' },
      { status: 500 }
    );
  }
}
