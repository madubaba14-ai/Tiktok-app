import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/notifications - Get user's notifications
export async function GET(request: NextRequest) {
  try {
    const currentUserId = request.headers.get('x-user-id');

    if (!currentUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;
    const type = searchParams.get('type'); // Filter by notification type
    const unreadOnly = searchParams.get('unread') === 'true';

    // Build filter
    const where: Record<string, unknown> = {
      userId: currentUserId,
    };

    if (type) {
      where.type = type;
    }

    if (unreadOnly) {
      where.isRead = false;
    }

    const notifications = await db.notification.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    });

    // Parse JSON data and format notifications
    const formattedNotifications = notifications.map((notification) => ({
      ...notification,
      data: notification.data ? JSON.parse(notification.data) : null,
    }));

    // Get total count
    const totalNotifications = await db.notification.count({ where });

    // Get unread count
    const unreadCount = await db.notification.count({
      where: {
        userId: currentUserId,
        isRead: false,
      },
    });

    return NextResponse.json({
      notifications: formattedNotifications,
      pagination: {
        page,
        limit,
        total: totalNotifications,
        totalPages: Math.ceil(totalNotifications / limit),
      },
      unreadCount,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
