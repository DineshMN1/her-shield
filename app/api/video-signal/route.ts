import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

// POST /api/video-signal — store a WebRTC signal
// recipientId = null  → broadcast to anyone in the room (used for initial offer)
// recipientId = userId → direct to a specific peer (answer, ICE candidates)
export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const { roomId, recipientId, type, payload } = await request.json();

    if (!roomId || !type || !payload) {
      return Response.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const signal = await prisma.videoSignal.create({
      data: {
        roomId,
        senderId: user.id,
        recipientId: recipientId ?? null,
        type,
        payload,
      },
    });

    return Response.json({ id: signal.id });
  } catch (error) {
    console.error('Video signal POST error:', error);
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/video-signal?roomId=X
// Returns unconsumed signals for this user: direct (recipientId=me) OR broadcast (recipientId=null)
// Excludes signals sent by this user. Marks returned signals as consumed.
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');

    if (!roomId) return Response.json({ signals: [] });

    const signals = await prisma.videoSignal.findMany({
      where: {
        roomId,
        consumed: false,
        NOT: { senderId: user.id },
        OR: [{ recipientId: user.id }, { recipientId: null }],
      },
      orderBy: { createdAt: 'asc' },
    });

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

// DELETE /api/video-signal?roomId=X — clean up consumed signals on call end
export async function DELETE(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');

    if (!roomId) return Response.json({ message: 'roomId required' }, { status: 400 });

    await prisma.videoSignal.deleteMany({
      where: { roomId, consumed: true },
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error('Video signal DELETE error:', error);
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}
