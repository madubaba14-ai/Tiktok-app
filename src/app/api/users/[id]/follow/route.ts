import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/users/[id]/follow - Follow a user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetUserId } = await params;
    const currentUserId = request.headers.get('x-user-id');

    if (!currentUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Can't follow yourself
    if (currentUserId === targetUserId) {
      return NextResponse.json(
        { error: 'Cannot follow yourself' },
        { status: 400 }
      );
    }

    // Check if target user exists
    const targetUser = await db.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, username: true, displayName: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if already following
    const existingFollow = await db.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUserId,
          followingId: targetUserId,
        },
      },
    });

    if (existingFollow) {
      return NextResponse.json(
        { error: 'Already following this user' },
        { status: 400 }
      );
    }

    // Create follow relationship
    await db.follow.create({
      data: {
        followerId: currentUserId,
        followingId: targetUserId,
      },
    });

    // Update follower/following counts
    await db.$transaction([
      db.user.update({
        where: { id: currentUserId },
        data: { followingCount: { increment: 1 } },
      }),
      db.user.update({
        where: { id: targetUserId },
        data: { followersCount: { increment: 1 } },
      }),
    ]);

    // Create notification for the followed user
    const currentUser = await db.user.findUnique({
      where: { id: currentUserId },
      select: { username: true, displayName: true },
    });

    await db.notification.create({
      data: {
        userId: targetUserId,
        type: 'FOLLOW',
        title: 'New follower',
        content: `${currentUser?.displayName || currentUser?.username} started following you`,
        data: JSON.stringify({
          followerId: currentUserId,
          followerUsername: currentUser?.username,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Successfully followed user',
    });
  } catch (error) {
    console.error('Error following user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id]/follow - Unfollow a user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetUserId } = await params;
    const currentUserId = request.headers.get('x-user-id');

    if (!currentUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if follow relationship exists
    const existingFollow = await db.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUserId,
          followingId: targetUserId,
        },
      },
    });

    if (!existingFollow) {
      return NextResponse.json(
        { error: 'Not following this user' },
        { status: 400 }
      );
    }

    // Delete follow relationship
    await db.follow.delete({
      where: {
        followerId_followingId: {
          followerId: currentUserId,
          followingId: targetUserId,
        },
      },
    });

    // Update follower/following counts
    await db.$transaction([
      db.user.update({
        where: { id: currentUserId },
        data: { followingCount: { decrement: 1 } },
      }),
      db.user.update({
        where: { id: targetUserId },
        data: { followersCount: { decrement: 1 } },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Successfully unfollowed user',
    });
  } catch (error) {
    console.error('Error unfollowing user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
