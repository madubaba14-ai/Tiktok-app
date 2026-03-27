import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/users/search - Search users
export async function GET(request: NextRequest) {
  try {
    const currentUserId = request.headers.get('x-user-id');
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    if (!query.trim()) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

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
      skip,
      take: limit,
      orderBy: {
        followersCount: 'desc',
      },
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

    const formattedUsers = users.map((user) => ({
      ...user,
      isFollowing: followingIds.includes(user.id),
    }));

    // Get total count
    const totalUsers = await db.user.count({
      where: {
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { displayName: { contains: query, mode: 'insensitive' } },
        ],
      },
    });

    return NextResponse.json({
      users: formattedUsers,
      pagination: {
        page,
        limit,
        total: totalUsers,
        totalPages: Math.ceil(totalUsers / limit),
      },
    });
  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
