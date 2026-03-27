import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getTrendingVideos, updateAllTrendingScores } from '@/lib/recommendation';

/**
 * GET /api/videos/trending - Get trending videos
 * Query params:
 * - cursor: string - last video id for pagination
 * - limit: number - number of videos to return (default: 20)
 * - minViews: number - minimum views threshold (default: 0)
 * - period: string - time period filter (hour, day, week, month, all)
 * - refresh: boolean - force refresh trending scores
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const minViews = parseInt(searchParams.get('minViews') || '0', 10);
    const period = searchParams.get('period') || 'all';
    const refresh = searchParams.get('refresh') === 'true';

    // Optionally refresh trending scores
    if (refresh) {
      // Run in background without awaiting
      updateAllTrendingScores().catch(console.error);
    }

    // Calculate time filter based on period
    let timeFilter: Date | null = null;
    const now = new Date();

    switch (period) {
      case 'hour':
        timeFilter = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'day':
        timeFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        timeFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        timeFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        // No time filter for 'all'
        break;
    }

    // Build where clause
    const where: Record<string, unknown> = {
      status: 'PUBLISHED',
      viewsCount: { gte: minViews },
    };

    if (timeFilter) {
      where.publishedAt = { gte: timeFilter };
    }

    if (cursor) {
      where.id = { lt: cursor };
    }

    // Get trending videos
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
      period,
    });
  } catch (error) {
    console.error('Error fetching trending videos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trending videos' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/videos/trending - Trigger trending score refresh
 * This is an admin-only endpoint
 */
export async function POST(request: NextRequest) {
  try {
    // In a real app, you would check for admin privileges here
    // For now, we'll allow anyone to trigger the refresh

    await updateAllTrendingScores();

    return NextResponse.json({
      success: true,
      message: 'Trending scores updated successfully',
    });
  } catch (error) {
    console.error('Error updating trending scores:', error);
    return NextResponse.json(
      { error: 'Failed to update trending scores' },
      { status: 500 }
    );
  }
}
