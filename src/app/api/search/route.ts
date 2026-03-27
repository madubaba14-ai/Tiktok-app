import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/search - Search videos, users, and hashtags
export async function GET(request: NextRequest) {
  try {
    const currentUserId = request.headers.get('x-user-id');
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const type = searchParams.get('type') || 'all'; // 'all', 'videos', 'users', 'hashtags'
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query.trim()) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    const results: {
      videos: unknown[];
      users: unknown[];
      hashtags: unknown[];
    } = {
      videos: [],
      users: [],
      hashtags: [],
    };

    // Search videos
    if (type === 'all' || type === 'videos') {
      const videos = await db.video.findMany({
        where: {
          status: 'PUBLISHED',
          OR: [
            { caption: { contains: query, mode: 'insensitive' } },
            { hashtags: { contains: query, mode: 'insensitive' } },
          ],
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
          _count: {
            select: {
              likes: true,
              comments: true,
            },
          },
        },
        orderBy: {
          trendingScore: 'desc',
        },
        take: type === 'all' ? limit : limit * 2,
      });

      // Check which videos are liked by current user
      let likedVideoIds: string[] = [];
      if (currentUserId) {
        const likes = await db.like.findMany({
          where: {
            userId: currentUserId,
            videoId: { in: videos.map((v) => v.id) },
          },
          select: { videoId: true },
        });
        likedVideoIds = likes.map((l) => l.videoId);
      }

      results.videos = videos.map((video) => ({
        id: video.id,
        videoUrl: video.videoUrl,
        thumbnailUrl: video.thumbnailUrl,
        caption: video.caption,
        hashtags: video.hashtags ? JSON.parse(video.hashtags) : [],
        viewsCount: video.viewsCount,
        likesCount: video._count.likes,
        commentsCount: video._count.comments,
        createdAt: video.createdAt,
        author: video.author,
        isLiked: likedVideoIds.includes(video.id),
      }));
    }

    // Search users
    if (type === 'all' || type === 'users') {
      const users = await db.user.findMany({
        where: {
          OR: [
            { username: { contains: query, mode: 'insensitive' } },
            { displayName: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          isVerified: true,
          bio: true,
          followersCount: true,
          videosCount: true,
        },
        orderBy: {
          followersCount: 'desc',
        },
        take: type === 'all' ? limit : limit * 2,
      });

      // Check if current user follows these users
      let followingIds: string[] = [];
      if (currentUserId) {
        const follows = await db.follow.findMany({
          where: {
            followerId: currentUserId,
            followingId: { in: users.map((u) => u.id) },
          },
          select: { followingId: true },
        });
        followingIds = follows.map((f) => f.followingId);
      }

      results.users = users.map((user) => ({
        ...user,
        isFollowing: followingIds.includes(user.id),
      }));
    }

    // Search hashtags
    if (type === 'all' || type === 'hashtags') {
      const hashtags = await db.hashtag.findMany({
        where: {
          name: { contains: query.replace('#', ''), mode: 'insensitive' },
        },
        orderBy: {
          videosCount: 'desc',
        },
        take: type === 'all' ? limit : limit * 2,
      });

      results.hashtags = hashtags.map((hashtag) => ({
        id: hashtag.id,
        name: hashtag.name,
        videosCount: hashtag.videosCount,
        createdAt: hashtag.createdAt,
      }));
    }

    // If searching for a specific type, add pagination info
    if (type !== 'all') {
      let total = 0;
      if (type === 'videos') {
        total = await db.video.count({
          where: {
            status: 'PUBLISHED',
            OR: [
              { caption: { contains: query, mode: 'insensitive' } },
              { hashtags: { contains: query, mode: 'insensitive' } },
            ],
          },
        });
      } else if (type === 'users') {
        total = await db.user.count({
          where: {
            OR: [
              { username: { contains: query, mode: 'insensitive' } },
              { displayName: { contains: query, mode: 'insensitive' } },
            ],
          },
        });
      } else if (type === 'hashtags') {
        total = await db.hashtag.count({
          where: {
            name: { contains: query.replace('#', ''), mode: 'insensitive' },
          },
        });
      }

      return NextResponse.json({
        results,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    }

    return NextResponse.json({
      results,
      query,
    });
  } catch (error) {
    console.error('Error searching:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
