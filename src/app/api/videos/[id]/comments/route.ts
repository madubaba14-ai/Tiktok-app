import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/videos/[id]/comments - Get video comments
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: videoId } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Check if video exists
    const video = await db.video.findUnique({
      where: { id: videoId },
      select: { id: true },
    });

    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    // Get top-level comments (no parent)
    const comments = await db.comment.findMany({
      where: {
        videoId,
        parentId: null, // Only top-level comments
      },
      include: {
        user: {
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
            replies: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    });

    // Get replies for each comment (first level of replies)
    const commentIds = comments.map((c) => c.id);
    const replies = await db.comment.findMany({
      where: {
        videoId,
        parentId: { in: commentIds },
      },
      include: {
        user: {
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
            replies: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: 3, // Only get first 3 replies per comment
    });

    // Group replies by parent
    const repliesByParent: Record<string, typeof replies> = {};
    replies.forEach((reply) => {
      if (reply.parentId) {
        if (!repliesByParent[reply.parentId]) {
          repliesByParent[reply.parentId] = [];
        }
        repliesByParent[reply.parentId].push(reply);
      }
    });

    const formattedComments = comments.map((comment) => ({
      id: comment.id,
      content: comment.content,
      likesCount: comment.likesCount,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      user: comment.user,
      repliesCount: comment._count.replies,
      replies: (repliesByParent[comment.id] || []).map((reply) => ({
        id: reply.id,
        content: reply.content,
        likesCount: reply.likesCount,
        createdAt: reply.createdAt,
        updatedAt: reply.updatedAt,
        user: reply.user,
        parentId: reply.parentId,
      })),
    }));

    // Get total count
    const totalComments = await db.comment.count({
      where: {
        videoId,
        parentId: null,
      },
    });

    return NextResponse.json({
      comments: formattedComments,
      pagination: {
        page,
        limit,
        total: totalComments,
        totalPages: Math.ceil(totalComments / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/videos/[id]/comments - Create a new comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: videoId } = await params;
    const currentUserId = request.headers.get('x-user-id');

    if (!currentUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { content, parentId } = body;

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'Comment content is required' },
        { status: 400 }
      );
    }

    // Check if video exists
    const video = await db.video.findUnique({
      where: { id: videoId },
      select: { id: true, authorId: true },
    });

    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    // If it's a reply, check if parent comment exists
    if (parentId) {
      const parentComment = await db.comment.findUnique({
        where: { id: parentId },
        select: { id: true, videoId: true, userId: true },
      });

      if (!parentComment || parentComment.videoId !== videoId) {
        return NextResponse.json(
          { error: 'Parent comment not found' },
          { status: 404 }
        );
      }
    }

    // Create comment
    const comment = await db.comment.create({
      data: {
        videoId,
        userId: currentUserId,
        parentId: parentId || null,
        content: content.trim(),
      },
      include: {
        user: {
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

    // Update video comments count
    await db.video.update({
      where: { id: videoId },
      data: { commentsCount: { increment: 1 } },
    });

    // Create notification
    if (parentId) {
      // Notify the parent comment author
      const parentComment = await db.comment.findUnique({
        where: { id: parentId },
        select: { userId: true },
      });

      if (parentComment && parentComment.userId !== currentUserId) {
        const currentUser = await db.user.findUnique({
          where: { id: currentUserId },
          select: { username: true, displayName: true },
        });

        await db.notification.create({
          data: {
            userId: parentComment.userId,
            type: 'COMMENT',
            title: 'New reply to your comment',
            content: `${currentUser?.displayName || currentUser?.username} replied to your comment`,
            data: JSON.stringify({
              videoId,
              commentId: comment.id,
              userId: currentUserId,
            }),
          },
        });
      }
    } else {
      // Notify the video author
      if (video.authorId !== currentUserId) {
        const currentUser = await db.user.findUnique({
          where: { id: currentUserId },
          select: { username: true, displayName: true },
        });

        await db.notification.create({
          data: {
            userId: video.authorId,
            type: 'COMMENT',
            title: 'New comment on your video',
            content: `${currentUser?.displayName || currentUser?.username} commented on your video`,
            data: JSON.stringify({
              videoId,
              commentId: comment.id,
              userId: currentUserId,
            }),
          },
        });
      }
    }

    return NextResponse.json({
      comment: {
        id: comment.id,
        content: comment.content,
        likesCount: comment.likesCount,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        user: comment.user,
        parentId: comment.parentId,
        repliesCount: 0,
        replies: [],
      },
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
