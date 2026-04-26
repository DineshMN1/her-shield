import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

// POST /api/video-signal — store a WebRTC signal (offer/answer/candidate)
export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const { roomId, recipientId, type, payload } = await request.json();

    if (!roomId || !recipientId || !type || !payload) {
      return Response.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const signal = await prisma.videoSignal.create({
      data: { roomId, senderId: user.id, recipientId, type, payload },
    });

    return Response.json({ id: signal.id });
  } catch (error) {
    console.error('Video signal POST error:', error);
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/video-signal?roomId=X — fetch and consume unread signals for the current user
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');

    if (!roomId) {
      return Response.json({ signals: [] });
    }

    // Fetch all unconsumed signals addressed to this user in this room
    const signals = await prisma.videoSignal.findMany({
      where: { roomId, recipientId: user.id, consumed: false },
      orderBy: { createdAt: 'asc' },
    });

    // Mark them consumed atomically
    if (signals.length > 0) {
      await prisma.videoSignal.updateMany({
        where: { id: { in: signals.map((s) => s.id) } },
        data: { consumed: true },
      });
    }

    return Response.json({
      signals: signals.map((s) => ({
        id: s.id,
        type: s.type,
        senderId: s.senderId,
        payload: s.payload,
      })),
    });
  } catch (error) {
    console.error('Video signal GET error:', error);
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/video-signal?roomId=X — clean up old signals for a room (called on call end)
export async function DELETE(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');

    if (!roomId) {
      return Response.json({ message: 'roomId required' }, { status: 400 });
    }

    await prisma.videoSignal.deleteMany({
      where: { roomId, consumed: true },
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error('Video signal DELETE error:', error);
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}
