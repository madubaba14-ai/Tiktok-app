import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/users/[id]/following - Get users that this user is following
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

    const following = await db.follow.findMany({
      where: { followerId: id },
      include: {
        following: {
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

    // Check if current user follows these users
    let currentUserFollowingIds: string[] = [];
    if (currentUserId) {
      const currentUserFollowing = await db.follow.findMany({
        where: {
          followerId: currentUserId,
          followingId: { in: following.map((f) => f.following.id) },
        },
        select: { followingId: true },
      });
      currentUserFollowingIds = currentUserFollowing.map((f) => f.followingId);
    }

    const formattedFollowing = following.map((follow) => ({
      ...follow.following,
      followedAt: follow.createdAt,
      isFollowing: currentUserFollowingIds.includes(follow.following.id),
    }));

    // Get total count
    const totalFollowing = await db.follow.count({
      where: { followerId: id },
    });

    return NextResponse.json({
      following: formattedFollowing,
      pagination: {
        page,
        limit,
        total: totalFollowing,
        totalPages: Math.ceil(totalFollowing / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching following:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
