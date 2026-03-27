import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/users/[id]/videos - Get user's videos
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUserId = request.headers.get('x-user-id');
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Check if user exists
    const user = await db.user.findUnique({
      where: { id },
      select: { id: true, isPrivate: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has private account
    if (user.isPrivate && currentUserId !== id) {
      // Check if current user follows this user
      const follow = await db.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUserId || '',
            followingId: id,
          },
        },
      });

      if (!follow) {
        return NextResponse.json(
          { error: 'This account is private' },
          { status: 403 }
        );
      }
    }

    const videos = await db.video.findMany({
      where: {
        authorId: id,
        status: 'PUBLISHED',
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
        createdAt: 'desc',
      },
      skip,
      take: limit,
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

    const formattedVideos = videos.map((video) => ({
      ...video,
      hashtags: video.hashtags ? JSON.parse(video.hashtags) : [],
      likesCount: video._count.likes,
      commentsCount: video._count.comments,
      isLiked: likedVideoIds.includes(video.id),
      _count: undefined,
    }));

    // Get total count for pagination
    const totalVideos = await db.video.count({
      where: {
        authorId: id,
        status: 'PUBLISHED',
      },
    });

    return NextResponse.json({
      videos: formattedVideos,
      pagination: {
        page,
        limit,
        total: totalVideos,
        totalPages: Math.ceil(totalVideos / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching user videos:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
