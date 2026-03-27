import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/users/[id]/followers - Get user's followers
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

    // For private accounts, only followers can see the list
    if (user.isPrivate && currentUserId !== id) {
      const isFollowing = await db.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUserId || '',
            followingId: id,
          },
        },
      });

      if (!isFollowing) {
        return NextResponse.json(
          { error: 'This account is private' },
          { status: 403 }
        );
      }
    }

    const followers = await db.follow.findMany({
      where: { followingId: id },
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isVerified: true,
            bio: true,
            followersCount: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    });

    // Check if current user follows these followers
    let followingIds: string[] = [];
    if (currentUserId) {
      const currentUserFollowing = await db.follow.findMany({
        where: {
          followerId: currentUserId,
          followingId: { in: followers.map((f) => f.follower.id) },
        },
        select: { followingId: true },
      });
      followingIds = currentUserFollowing.map((f) => f.followingId);
    }

    const formattedFollowers = followers.map((follow) => ({
      ...follow.follower,
      followedAt: follow.createdAt,
      isFollowing: followingIds.includes(follow.follower.id),
    }));

    // Get total count
    const totalFollowers = await db.follow.count({
      where: { followingId: id },
    });

    return NextResponse.json({
      followers: formattedFollowers,
      pagination: {
        page,
        limit,
        total: totalFollowers,
        totalPages: Math.ceil(totalFollowers / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching followers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
