import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/users/[id] - Get user profile
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUserId = request.headers.get('x-user-id');

    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        bannerUrl: true,
        isVerified: true,
        isPrivate: true,
        videosCount: true,
        likesCount: true,
        followersCount: true,
        followingCount: true,
        createdAt: true,
        lastActiveAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if current user is following this user
    let isFollowing = false;
    if (currentUserId && currentUserId !== id) {
      const follow = await db.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUserId,
            followingId: id,
          },
        },
      });
      isFollowing = !!follow;
    }

    // Don't expose email to other users
    const isOwnProfile = currentUserId === id;
    const userProfile = {
      ...user,
      email: isOwnProfile ? user.email : undefined,
      isFollowing,
    };

    return NextResponse.json({ user: userProfile });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/users/[id] - Update user profile
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUserId = request.headers.get('x-user-id');

    // Check authorization
    if (!currentUserId || currentUserId !== id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { displayName, bio, avatarUrl, bannerUrl, isPrivate } = body;

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {};
    if (displayName !== undefined) updateData.displayName = displayName;
    if (bio !== undefined) updateData.bio = bio;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
    if (bannerUrl !== undefined) updateData.bannerUrl = bannerUrl;
    if (isPrivate !== undefined) updateData.isPrivate = isPrivate;

    const updatedUser = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        bannerUrl: true,
        isVerified: true,
        isPrivate: true,
        videosCount: true,
        likesCount: true,
        followersCount: true,
        followingCount: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
