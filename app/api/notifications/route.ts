import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

// GET /api/notifications - List current user's notifications
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unreadOnly') === '1';
    const type = searchParams.get('type');
    const take = Number(searchParams.get('take') || 20);

    const notifications = await prisma.notification.findMany({
      where: {
        userId: user.id,
        ...(unreadOnly ? { isRead: false } : {}),
        ...(type ? { type } : {}),
      },
      orderBy: { sentAt: 'desc' },
      take: Number.isFinite(take) ? Math.min(Math.max(take, 1), 100) : 20,
    });

    return Response.json({ notifications });
  } catch (error) {
    console.error('Fetch notifications error:', error);
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/notifications - Mark notifications as read
export async function PUT(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const body = await request.json().catch(() => ({}));
    const ids = Array.isArray(body?.ids) ? body.ids.filter((id: unknown) => typeof id === 'string') : [];
    const markAll = body?.markAll === true;

    if (!markAll && ids.length === 0) {
      return Response.json({ message: 'Notification ids required' }, { status: 400 });
    }

    await prisma.notification.updateMany({
      where: {
        userId: user.id,
        ...(markAll ? {} : { id: { in: ids } }),
      },
      data: { isRead: true },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Update notifications error:', error);
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}

