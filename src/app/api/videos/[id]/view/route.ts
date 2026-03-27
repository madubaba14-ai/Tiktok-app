import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { updateVideoTrendingScore } from '@/lib/recommendation';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/videos/[id]/view - Record a video view
 * Body:
 * - userId: string? - the user watching (optional for anonymous views)
 * - watchTime: number - time watched in seconds
 * - percentage: number - percentage of video watched (0-100)
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: videoId } = await params;
    const body = await request.json();
    const { userId, watchTime = 0, percentage = 0 } = body;

    // Check if video exists
    const video = await db.video.findUnique({
      where: { id: videoId },
      select: { id: true, duration: true },
    });

    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    // If userId is provided, check if user exists and update/create view record
    if (userId) {
      const user = await db.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      // Try to update existing view or create new one
      const existingView = await db.videoView.findUnique({
        where: {
          userId_videoId: {
            userId,
            videoId,
          },
        },
      });

      if (existingView) {
        // Update existing view if new values are higher
        await db.videoView.update({
          where: {
            userId_videoId: {
              userId,
              videoId,
            },
          },
          data: {
            watchTime: Math.max(existingView.watchTime, watchTime),
            percentage: Math.max(existingView.percentage, percentage),
          },
        });
      } else {
        // Create new view record
        await db.videoView.create({
          data: {
            userId,
            videoId,
            watchTime,
            percentage,
          },
        });

        // Increment view count (only for new views, not re-watches)
        await db.video.update({
          where: { id: videoId },
          data: {
            viewsCount: { increment: 1 },
          },
        });

        // Update trending score
        await updateVideoTrendingScore(videoId);
      }
    } else {
      // Anonymous view - just increment the counter
      await db.video.update({
        where: { id: videoId },
        data: {
          viewsCount: { increment: 1 },
        },
      });

      // Update trending score
      await updateVideoTrendingScore(videoId);
    }

    // Get updated video stats
    const updatedVideo = await db.video.findUnique({
      where: { id: videoId },
      select: {
        viewsCount: true,
        trendingScore: true,
      },
    });

    return NextResponse.json({
      success: true,
      viewsCount: updatedVideo?.viewsCount,
    });
  } catch (error) {
    console.error('Error recording view:', error);
    return NextResponse.json(
      { error: 'Failed to record view' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/videos/[id]/view - Get view statistics for a video
 * Query params:
 * - userId: string? - get user's specific view stats
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: videoId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // Check if video exists
    const video = await db.video.findUnique({
      where: { id: videoId },
      select: {
        id: true,
        viewsCount: true,
        duration: true,
      },
    });

    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    // If userId is provided, get user-specific stats
    if (userId) {
      const userView = await db.videoView.findUnique({
        where: {
          userId_videoId: {
            userId,
            videoId,
          },
        },
      });

      return NextResponse.json({
        video: {
          viewsCount: video.viewsCount,
          duration: video.duration,
        },
        userView: userView ? {
          watchTime: userView.watchTime,
          percentage: userView.percentage,
          createdAt: userView.createdAt,
        } : null,
      });
    }

    // Return general video stats
    return NextResponse.json({
      viewsCount: video.viewsCount,
      duration: video.duration,
    });
  } catch (error) {
    console.error('Error fetching view stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch view stats' },
      { status: 500 }
    );
  }
}
