import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getPersonalizedFeed } from '@/lib/recommendation';

/**
 * GET /api/videos/feed - Get personalized video feed
 * Query params:
 * - userId: string? - user ID for personalization (optional)
 * - cursor: string - last video id for pagination
 * - limit: number - number of videos to return (default: 20)
 * - type: string - feed type (for_you, following, trending)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const cursor = searchParams.get('cursor');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const type = searchParams.get('type') || 'for_you';

    // Handle different feed types
    switch (type) {
      case 'following': {
        // Feed from followed users only
        if (!userId) {
          return NextResponse.json(
            { error: 'User ID is required for following feed' },
            { status: 400 }
          );
        }

        // Get following list
        const following = await db.follow.findMany({
          where: { followerId: userId },
          select: { followingId: true },
        });

        const followingIds = following.map(f => f.followingId);

        if (followingIds.length === 0) {
          return NextResponse.json({
            videos: [],
            nextCursor: null,
            hasMore: false,
            type: 'following',
          });
        }

        // Build where clause
        const where: Record<string, unknown> = {
          status: 'PUBLISHED',
          authorId: { in: followingIds },
        };

        if (cursor) {
          where.id = { lt: cursor };
        }

        const videos = await db.video.findMany({
          where,
          orderBy: [
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

        // Check if user has liked each video
        let videosWithLikeStatus = videos.map(v => ({
          ...v,
          hashtags: v.hashtags ? JSON.parse(v.hashtags) : [],
        }));
        if (userId) {
          const videoIds = videos.map(v => v.id);
          const likes = await db.like.findMany({
            where: {
              userId,
              videoId: { in: videoIds },
            },
            select: { videoId: true },
          });
          const likedVideoIds = new Set(likes.map(l => l.videoId));
          videosWithLikeStatus = videos.map(v => ({
            ...v,
            hashtags: v.hashtags ? JSON.parse(v.hashtags) : [],
            isLiked: likedVideoIds.has(v.id),
          }));
        }

        const nextCursor = videos.length === limit ? videos[videos.length - 1]?.id : null;

        return NextResponse.json({
          videos: videosWithLikeStatus,
          nextCursor,
          hasMore: videos.length === limit,
          type: 'following',
        });
      }

      case 'trending': {
        // Trending feed (public, no personalization)
        const where: Record<string, unknown> = {
          status: 'PUBLISHED',
        };

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

        // Check if user has liked each video
        let videosWithLikeStatus = videos.map(v => ({
          ...v,
          hashtags: v.hashtags ? JSON.parse(v.hashtags) : [],
        }));
        if (userId) {
          const videoIds = videos.map(v => v.id);
          const likes = await db.like.findMany({
            where: {
              userId,
              videoId: { in: videoIds },
            },
            select: { videoId: true },
          });
          const likedVideoIds = new Set(likes.map(l => l.videoId));
          videosWithLikeStatus = videos.map(v => ({
            ...v,
            hashtags: v.hashtags ? JSON.parse(v.hashtags) : [],
            isLiked: likedVideoIds.has(v.id),
          }));
        }

        const nextCursor = videos.length === limit ? videos[videos.length - 1]?.id : null;

        return NextResponse.json({
          videos: videosWithLikeStatus,
          nextCursor,
          hasMore: videos.length === limit,
          type: 'trending',
        });
      }

      case 'for_you':
      default: {
        // Personalized "For You" feed
        const videos = await getPersonalizedFeed({
          userId: userId || undefined,
          limit,
          cursor: cursor || undefined,
        });

        // Check if user has liked each video
        let videosWithLikeStatus = videos.map(v => ({
          ...v,
          hashtags: v.hashtags ? JSON.parse(v.hashtags) : [],
        }));
        if (userId) {
          const videoIds = videos.map(v => v.id);
          const likes = await db.like.findMany({
            where: {
              userId,
              videoId: { in: videoIds },
            },
            select: { videoId: true },
          });
          const likedVideoIds = new Set(likes.map(l => l.videoId));
          videosWithLikeStatus = videos.map(v => ({
            ...v,
            hashtags: v.hashtags ? JSON.parse(v.hashtags) : [],
            isLiked: likedVideoIds.has(v.id),
          }));
        }

        const nextCursor = videos.length === limit ? videos[videos.length - 1]?.id : null;

        return NextResponse.json({
          videos: videosWithLikeStatus,
          nextCursor,
          hasMore: videos.length === limit,
          type: 'for_you',
        });
      }
    }
  } catch (error) {
    console.error('Error fetching feed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feed' },
      { status: 500 }
    );
  }
}
