/**
 * Unit + integration tests for /api/video-signal
 *
 * Prisma and auth are mocked so the tests run without a real DB.
 * Each test calls the route handler directly (no HTTP server needed).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks — must be declared before any import that depends on them ─

const mockPrisma = vi.hoisted(() => ({
  videoSignal: {
    create: vi.fn(),
    findMany: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({ default: mockPrisma }));

vi.mock('@/lib/auth', () => ({
  getAuthUser: vi.fn(),
  unauthorizedResponse: () =>
    new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 }),
  forbiddenResponse: () =>
    new Response(JSON.stringify({ message: 'Forbidden' }), { status: 403 }),
}));

const mockUser = { id: 'user-patient-1', role: 'PATIENT', firstName: 'Jane', lastName: 'Doe' };

// Import after mocks are registered
import { POST, GET, DELETE } from '@/app/api/video-signal/route';
import { getAuthUser } from '@/lib/auth';

// ── Helpers ────────────────────────────────────────────────────────────────

function makeRequest(method: string, body?: object, url = 'http://localhost/api/video-signal') {
  return new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer fake-token' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAuthUser).mockResolvedValue(mockUser as any);
});

// ── POST ───────────────────────────────────────────────────────────────────

describe('POST /api/video-signal', () => {
  it('creates a signal and returns its id', async () => {
    const created = {
      id: 'sig-1',
      roomId: 'room-abc',
      senderId: mockUser.id,
      recipientId: 'user-doctor-2',
      type: 'offer',
      payload: JSON.stringify({ type: 'offer', sdp: 'v=0...' }),
    };
    mockPrisma.videoSignal.create.mockResolvedValue(created);

    const req = makeRequest('POST', {
      roomId: created.roomId,
      recipientId: created.recipientId,
      type: created.type,
      payload: created.payload,
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.id).toBe('sig-1');
    expect(mockPrisma.videoSignal.create).toHaveBeenCalledWith({
      data: {
        roomId: 'room-abc',
        senderId: mockUser.id,
        recipientId: 'user-doctor-2',
        type: 'offer',
        payload: created.payload,
      },
    });
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null);

    const req = makeRequest('POST', { roomId: 'r', recipientId: 'u', type: 'offer', payload: '{}' });
    const res = await POST(req);

    expect(res.status).toBe(401);
    expect(mockPrisma.videoSignal.create).not.toHaveBeenCalled();
  });

  it('returns 400 when required fields are missing', async () => {
    const req = makeRequest('POST', { roomId: 'r' }); // missing recipientId, type, payload
    const res = await POST(req);

    expect(res.status).toBe(400);
    expect(mockPrisma.videoSignal.create).not.toHaveBeenCalled();
  });

  it('stores offer, answer, and candidate types', async () => {
    const types = ['offer', 'answer', 'candidate'];

    for (const type of types) {
      mockPrisma.videoSignal.create.mockResolvedValue({ id: `sig-${type}` });

      const req = makeRequest('POST', {
        roomId: 'room-x',
        recipientId: 'other-user',
        type,
        payload: '{"sdp":"..."}',
      });
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.id).toBe(`sig-${type}`);
    }
  });
});

// ── GET ────────────────────────────────────────────────────────────────────

describe('GET /api/video-signal', () => {
  it('returns unconsumed signals for the current user in the room', async () => {
    const signals = [
      { id: 'sig-1', type: 'offer', senderId: 'user-doctor-2', payload: '{"sdp":"..."}' },
      { id: 'sig-2', type: 'candidate', senderId: 'user-doctor-2', payload: '{"candidate":"..."}' },
    ];
    mockPrisma.videoSignal.findMany.mockResolvedValue(signals);
    mockPrisma.videoSignal.updateMany.mockResolvedValue({ count: 2 });

    const req = makeRequest('GET', undefined, 'http://localhost/api/video-signal?roomId=room-abc');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.signals).toHaveLength(2);
    expect(body.signals[0]).toEqual({ id: 'sig-1', type: 'offer', senderId: 'user-doctor-2', payload: '{"sdp":"..."}' });
  });

  it('marks fetched signals as consumed', async () => {
    const signals = [{ id: 'sig-1', type: 'answer', senderId: 'other', payload: '{}' }];
    mockPrisma.videoSignal.findMany.mockResolvedValue(signals);
    mockPrisma.videoSignal.updateMany.mockResolvedValue({ count: 1 });

    const req = makeRequest('GET', undefined, 'http://localhost/api/video-signal?roomId=room-abc');
    await GET(req);

    expect(mockPrisma.videoSignal.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['sig-1'] } },
      data: { consumed: true },
    });
  });

  it('does not call updateMany when there are no signals', async () => {
    mockPrisma.videoSignal.findMany.mockResolvedValue([]);

    const req = makeRequest('GET', undefined, 'http://localhost/api/video-signal?roomId=room-abc');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.signals).toHaveLength(0);
    expect(mockPrisma.videoSignal.updateMany).not.toHaveBeenCalled();
  });

  it('returns empty array when roomId is missing', async () => {
    const req = makeRequest('GET', undefined, 'http://localhost/api/video-signal');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.signals).toHaveLength(0);
    expect(mockPrisma.videoSignal.findMany).not.toHaveBeenCalled();
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null);

    const req = makeRequest('GET', undefined, 'http://localhost/api/video-signal?roomId=room-abc');
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it('only returns signals addressed to the current user', async () => {
    mockPrisma.videoSignal.findMany.mockResolvedValue([]);

    const req = makeRequest('GET', undefined, 'http://localhost/api/video-signal?roomId=room-abc');
    await GET(req);

    expect(mockPrisma.videoSignal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ recipientId: mockUser.id }),
      })
    );
  });
});

// ── DELETE ─────────────────────────────────────────────────────────────────

describe('DELETE /api/video-signal', () => {
  it('deletes consumed signals for the room', async () => {
    mockPrisma.videoSignal.deleteMany.mockResolvedValue({ count: 5 });

    const req = makeRequest('DELETE', undefined, 'http://localhost/api/video-signal?roomId=room-abc');
    const res = await DELETE(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(mockPrisma.videoSignal.deleteMany).toHaveBeenCalledWith({
      where: { roomId: 'room-abc', consumed: true },
    });
  });

  it('returns 400 when roomId is missing', async () => {
    const req = makeRequest('DELETE', undefined, 'http://localhost/api/video-signal');
    const res = await DELETE(req);

    expect(res.status).toBe(400);
    expect(mockPrisma.videoSignal.deleteMany).not.toHaveBeenCalled();
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null);

    const req = makeRequest('DELETE', undefined, 'http://localhost/api/video-signal?roomId=room-abc');
    const res = await DELETE(req);

    expect(res.status).toBe(401);
  });
});

// ── Signaling flow integration test ───────────────────────────────────────

describe('Full signaling flow (patient → doctor)', () => {
  /**
   * Simulates the complete offer/answer/candidate exchange between two users
   * by calling the API handlers in sequence, as the real browser code does.
   */

  const patient = { id: 'aaaa-patient', role: 'PATIENT', firstName: 'Jane', lastName: 'Doe' };
  const doctor  = { id: 'bbbb-doctor',  role: 'DOCTOR',  firstName: 'Priya', lastName: 'Sharma' };
  const roomId  = 'room-integration-test';

  // In-memory signal store (replaces Prisma for this test group)
  let signalStore: Array<{
    id: string; roomId: string; senderId: string; recipientId: string;
    type: string; payload: string; consumed: boolean;
  }> = [];
  let nextId = 1;

  beforeEach(() => {
    signalStore = [];
    nextId = 1;

    mockPrisma.videoSignal.create.mockImplementation(({ data }: any) => {
      const record = { id: `sig-${nextId++}`, ...data, consumed: false };
      signalStore.push(record);
      return Promise.resolve(record);
    });

    mockPrisma.videoSignal.findMany.mockImplementation(({ where }: any) => {
      const matches = signalStore.filter(
        (s) =>
          s.roomId === where.roomId &&
          s.recipientId === where.recipientId &&
          s.consumed === false
      );
      return Promise.resolve(matches);
    });

    mockPrisma.videoSignal.updateMany.mockImplementation(({ where, data }: any) => {
      let count = 0;
      signalStore.forEach((s) => {
        if (where.id.in.includes(s.id)) { s.consumed = data.consumed; count++; }
      });
      return Promise.resolve({ count });
    });
  });

  it('patient posts offer → doctor receives it via GET', async () => {
    // Patient creates and posts an offer
    vi.mocked(getAuthUser).mockResolvedValue(patient as any);
    const postReq = makeRequest('POST', {
      roomId,
      recipientId: doctor.id,
      type: 'offer',
      payload: JSON.stringify({ type: 'offer', sdp: 'v=0\r\nm=video...' }),
    });
    const postRes = await POST(postReq);
    expect(postRes.status).toBe(200);

    // Doctor polls and receives the offer
    vi.mocked(getAuthUser).mockResolvedValue(doctor as any);
    const getReq = makeRequest('GET', undefined, `http://localhost/api/video-signal?roomId=${roomId}`);
    const getRes = await GET(getReq);
    const { signals } = await getRes.json();

    expect(signals).toHaveLength(1);
    expect(signals[0].type).toBe('offer');
    expect(signals[0].senderId).toBe(patient.id);
  });

  it('offer is marked consumed after first poll — not returned again', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(patient as any);
    await POST(makeRequest('POST', {
      roomId, recipientId: doctor.id, type: 'offer', payload: '{"sdp":"x"}',
    }));

    vi.mocked(getAuthUser).mockResolvedValue(doctor as any);
    const url = `http://localhost/api/video-signal?roomId=${roomId}`;

    const first  = await GET(makeRequest('GET', undefined, url));
    const second = await GET(makeRequest('GET', undefined, url));

    const firstSignals  = (await first.json()).signals;
    const secondSignals = (await second.json()).signals;

    expect(firstSignals).toHaveLength(1);
    expect(secondSignals).toHaveLength(0); // consumed — not returned again
  });

  it('complete round-trip: offer → answer → candidates exchanged correctly', async () => {
    // Step 1: Patient posts offer to doctor
    vi.mocked(getAuthUser).mockResolvedValue(patient as any);
    await POST(makeRequest('POST', {
      roomId, recipientId: doctor.id, type: 'offer',
      payload: JSON.stringify({ type: 'offer', sdp: 'v=0 offer' }),
    }));

    // Step 2: Patient posts ICE candidates to doctor
    await POST(makeRequest('POST', {
      roomId, recipientId: doctor.id, type: 'candidate',
      payload: JSON.stringify({ candidate: 'candidate:1 ...', sdpMid: '0' }),
    }));

    // Step 3: Doctor polls — should receive offer + candidate
    vi.mocked(getAuthUser).mockResolvedValue(doctor as any);
    const doctorPoll1 = await GET(makeRequest('GET', undefined, `http://localhost/api/video-signal?roomId=${roomId}`));
    const doctorSignals = (await doctorPoll1.json()).signals;
    expect(doctorSignals.map((s: any) => s.type)).toEqual(['offer', 'candidate']);

    // Step 4: Doctor posts answer to patient
    await POST(makeRequest('POST', {
      roomId, recipientId: patient.id, type: 'answer',
      payload: JSON.stringify({ type: 'answer', sdp: 'v=0 answer' }),
    }));

    // Step 5: Doctor posts ICE candidates to patient
    await POST(makeRequest('POST', {
      roomId, recipientId: patient.id, type: 'candidate',
      payload: JSON.stringify({ candidate: 'candidate:2 ...', sdpMid: '0' }),
    }));

    // Step 6: Patient polls — should receive answer + candidate
    vi.mocked(getAuthUser).mockResolvedValue(patient as any);
    const patientPoll = await GET(makeRequest('GET', undefined, `http://localhost/api/video-signal?roomId=${roomId}`));
    const patientSignals = (await patientPoll.json()).signals;
    expect(patientSignals.map((s: any) => s.type)).toEqual(['answer', 'candidate']);

    // Step 7: Signals are not cross-delivered (patient's signals go to doctor only)
    vi.mocked(getAuthUser).mockResolvedValue(doctor as any);
    const doctorPoll2 = await GET(makeRequest('GET', undefined, `http://localhost/api/video-signal?roomId=${roomId}`));
    expect((await doctorPoll2.json()).signals).toHaveLength(0);
  });
});
