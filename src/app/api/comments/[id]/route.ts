import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// DELETE /api/comments/[id] - Delete a comment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: commentId } = await params;
    const currentUserId = request.headers.get('x-user-id');

    if (!currentUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Find the comment
    const comment = await db.comment.findUnique({
      where: { id: commentId },
      select: {
        id: true,
        userId: true,
        videoId: true,
        parentId: true,
      },
    });

    if (!comment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

    // Check if user owns the comment
    if (comment.userId !== currentUserId) {
      return NextResponse.json(
        { error: 'You can only delete your own comments' },
        { status: 403 }
      );
    }

    // Count replies to update video comments count correctly
    const repliesCount = await db.comment.count({
      where: { parentId: commentId },
    });

    // Delete the comment and its replies (cascade delete)
    await db.comment.delete({
      where: { id: commentId },
    });

    // Update video comments count (subtract 1 for the comment + replies)
    await db.video.update({
      where: { id: comment.videoId },
      data: {
        commentsCount: { decrement: 1 + repliesCount },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Comment deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
