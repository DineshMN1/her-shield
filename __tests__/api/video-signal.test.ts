/**
 * Unit + integration tests for /api/video-signal
 *
 * Prisma and auth are mocked — no real DB required.
 * Covers the broadcast-offer signaling model:
 *   - Patient posts offer with recipientId=null (broadcast)
 *   - Doctor/admin polls and finds the broadcast offer
 *   - Answer and ICE candidates are sent directly (recipientId=userId)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks ─────────────────────────────────────────────────────────

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
}));

import { POST, GET, DELETE } from '@/app/api/video-signal/route';
import { getAuthUser } from '@/lib/auth';

// ── Helpers ────────────────────────────────────────────────────────────────

const patient = { id: 'patient-aaa', role: 'PATIENT', firstName: 'Jane', lastName: 'Doe' };
const doctor  = { id: 'doctor-bbb',  role: 'DOCTOR',  firstName: 'Priya', lastName: 'Sharma' };
const admin   = { id: 'admin-ccc',   role: 'ADMIN',   firstName: 'Admin', lastName: 'User' };

function makeRequest(method: string, body?: object, url = 'http://localhost/api/video-signal') {
  return new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer fake' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAuthUser).mockResolvedValue(patient as any);
});

// ── POST ──────────────────────────────────────────────────────────────────

describe('POST /api/video-signal', () => {
  it('creates a broadcast offer (recipientId=null) and returns id', async () => {
    mockPrisma.videoSignal.create.mockResolvedValue({ id: 'sig-1' });

    const req = makeRequest('POST', {
      roomId: 'room-x',
      recipientId: null,        // broadcast — patient's offer to anyone
      type: 'offer',
      payload: JSON.stringify({ type: 'offer', sdp: 'v=0...' }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.id).toBe('sig-1');
    expect(mockPrisma.videoSignal.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ recipientId: null, type: 'offer' }),
    });
  });

  it('creates a direct answer (recipientId=patientId)', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(doctor as any);
    mockPrisma.videoSignal.create.mockResolvedValue({ id: 'sig-2' });

    const req = makeRequest('POST', {
      roomId: 'room-x',
      recipientId: patient.id,  // direct answer to patient
      type: 'answer',
      payload: '{"type":"answer","sdp":"v=0..."}',
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockPrisma.videoSignal.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ recipientId: patient.id, type: 'answer', senderId: doctor.id }),
    });
  });

  it('returns 400 when roomId, type, or payload is missing', async () => {
    const cases = [
      { type: 'offer', payload: '{}' },           // missing roomId
      { roomId: 'r', payload: '{}' },             // missing type
      { roomId: 'r', type: 'offer' },             // missing payload
    ];
    for (const body of cases) {
      const res = await POST(makeRequest('POST', body));
      expect(res.status).toBe(400);
    }
    expect(mockPrisma.videoSignal.create).not.toHaveBeenCalled();
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null);
    const res = await POST(makeRequest('POST', { roomId: 'r', type: 'offer', payload: '{}' }));
    expect(res.status).toBe(401);
  });
});

// ── GET ────────────────────────────────────────────────────────────────────

describe('GET /api/video-signal', () => {
  it('returns direct signals (recipientId=me) AND broadcast signals (recipientId=null)', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(doctor as any);
    const signals = [
      { id: 's1', type: 'offer',     senderId: patient.id, payload: '{"sdp":"x"}' }, // broadcast
      { id: 's2', type: 'candidate', senderId: patient.id, payload: '{"c":"y"}' },   // direct
    ];
    mockPrisma.videoSignal.findMany.mockResolvedValue(signals);
    mockPrisma.videoSignal.updateMany.mockResolvedValue({ count: 2 });

    const req = makeRequest('GET', undefined, 'http://localhost/api/video-signal?roomId=room-x');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.signals).toHaveLength(2);

    // Verify the query filters: NOT sender=me, AND (recipientId=me OR null)
    expect(mockPrisma.videoSignal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          NOT: { senderId: doctor.id },
          OR: [{ recipientId: doctor.id }, { recipientId: null }],
        }),
      })
    );
  });

  it('marks returned signals as consumed', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(doctor as any);
    mockPrisma.videoSignal.findMany.mockResolvedValue([
      { id: 's1', type: 'offer', senderId: patient.id, payload: '{}' },
    ]);
    mockPrisma.videoSignal.updateMany.mockResolvedValue({ count: 1 });

    await GET(makeRequest('GET', undefined, 'http://localhost/api/video-signal?roomId=room-x'));

    expect(mockPrisma.videoSignal.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['s1'] } },
      data: { consumed: true },
    });
  });

  it('does not call updateMany when no signals found', async () => {
    mockPrisma.videoSignal.findMany.mockResolvedValue([]);
    await GET(makeRequest('GET', undefined, 'http://localhost/api/video-signal?roomId=room-x'));
    expect(mockPrisma.videoSignal.updateMany).not.toHaveBeenCalled();
  });

  it('returns empty array when roomId is missing', async () => {
    const res = await GET(makeRequest('GET'));
    const body = await res.json();
    expect(body.signals).toHaveLength(0);
    expect(mockPrisma.videoSignal.findMany).not.toHaveBeenCalled();
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null);
    const res = await GET(makeRequest('GET', undefined, 'http://localhost/api/video-signal?roomId=x'));
    expect(res.status).toBe(401);
  });

  it('never returns signals sent by the current user', async () => {
    mockPrisma.videoSignal.findMany.mockResolvedValue([]);
    await GET(makeRequest('GET', undefined, 'http://localhost/api/video-signal?roomId=room-x'));
    expect(mockPrisma.videoSignal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ NOT: { senderId: patient.id } }),
      })
    );
  });
});

// ── DELETE ────────────────────────────────────────────────────────────────

describe('DELETE /api/video-signal', () => {
  it('deletes consumed signals for the room', async () => {
    mockPrisma.videoSignal.deleteMany.mockResolvedValue({ count: 3 });
    const res = await DELETE(makeRequest('DELETE', undefined, 'http://localhost/api/video-signal?roomId=room-x'));
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
    expect(mockPrisma.videoSignal.deleteMany).toHaveBeenCalledWith({
      where: { roomId: 'room-x', consumed: true },
    });
  });

  it('returns 400 when roomId missing', async () => {
    const res = await DELETE(makeRequest('DELETE'));
    expect(res.status).toBe(400);
    expect(mockPrisma.videoSignal.deleteMany).not.toHaveBeenCalled();
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null);
    const res = await DELETE(makeRequest('DELETE', undefined, 'http://localhost/api/video-signal?roomId=x'));
    expect(res.status).toBe(401);
  });
});

// ── Full signaling flow (in-memory store) ─────────────────────────────────

describe('Broadcast-offer signaling flow', () => {
  /**
   * In-memory Prisma replacement.
   * Simulates: patient broadcasts offer → admin (or doctor) receives it
   * → admin answers directly to patient → ICE candidates exchanged.
   */

  let store: Array<{
    id: string; roomId: string; senderId: string; recipientId: string | null;
    type: string; payload: string; consumed: boolean;
  }> = [];
  let seq = 1;

  beforeEach(() => {
    store = [];
    seq = 1;

    mockPrisma.videoSignal.create.mockImplementation(({ data }: any) => {
      const rec = { id: `s${seq++}`, ...data, recipientId: data.recipientId ?? null, consumed: false };
      store.push(rec);
      return Promise.resolve(rec);
    });

    mockPrisma.videoSignal.findMany.mockImplementation(({ where }: any) => {
      const results = store.filter((s) => {
        if (s.roomId !== where.roomId) return false;
        if (s.consumed !== false) return false;
        if (where.NOT?.senderId === s.senderId) return false;
        if (where.OR) {
          return where.OR.some((c: any) =>
            c.recipientId === s.recipientId ||
            (c.recipientId === null && s.recipientId === null)
          );
        }
        return true;
      });
      return Promise.resolve(results);
    });

    mockPrisma.videoSignal.updateMany.mockImplementation(({ where, data }: any) => {
      let count = 0;
      store.forEach((s) => {
        if (where.id.in.includes(s.id)) { Object.assign(s, data); count++; }
      });
      return Promise.resolve({ count });
    });
  });

  const room = 'room-instant-123';
  const url = `http://localhost/api/video-signal?roomId=${room}`;

  it('patient broadcasts offer → admin receives it (not sent to doctor)', async () => {
    // Patient posts broadcast offer
    vi.mocked(getAuthUser).mockResolvedValue(patient as any);
    await POST(makeRequest('POST', { roomId: room, recipientId: null, type: 'offer', payload: '{"sdp":"offer"}' }));

    // Admin polls — should receive the broadcast offer
    vi.mocked(getAuthUser).mockResolvedValue(admin as any);
    const { signals } = await (await GET(makeRequest('GET', undefined, url))).json();
    expect(signals).toHaveLength(1);
    expect(signals[0].type).toBe('offer');
    expect(signals[0].senderId).toBe(patient.id);
  });

  it('doctor also receives the broadcast offer', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(patient as any);
    await POST(makeRequest('POST', { roomId: room, recipientId: null, type: 'offer', payload: '{"sdp":"offer"}' }));

    // Doctor polls first
    vi.mocked(getAuthUser).mockResolvedValue(doctor as any);
    const { signals } = await (await GET(makeRequest('GET', undefined, url))).json();
    expect(signals[0].type).toBe('offer');
  });

  it('broadcast offer consumed after first poll — second poller gets nothing', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(patient as any);
    await POST(makeRequest('POST', { roomId: room, recipientId: null, type: 'offer', payload: '{}' }));

    // Admin polls first — consumes the offer
    vi.mocked(getAuthUser).mockResolvedValue(admin as any);
    const first = await (await GET(makeRequest('GET', undefined, url))).json();
    expect(first.signals).toHaveLength(1);

    // Doctor polls second — offer already consumed
    vi.mocked(getAuthUser).mockResolvedValue(doctor as any);
    const second = await (await GET(makeRequest('GET', undefined, url))).json();
    expect(second.signals).toHaveLength(0);
  });

  it('admin sends answer directly to patient, patient receives it', async () => {
    // Admin posts answer directly to patient
    vi.mocked(getAuthUser).mockResolvedValue(admin as any);
    await POST(makeRequest('POST', {
      roomId: room, recipientId: patient.id, type: 'answer', payload: '{"sdp":"answer"}',
    }));

    // Patient polls — receives the answer
    vi.mocked(getAuthUser).mockResolvedValue(patient as any);
    const { signals } = await (await GET(makeRequest('GET', undefined, url))).json();
    expect(signals).toHaveLength(1);
    expect(signals[0].type).toBe('answer');
    expect(signals[0].senderId).toBe(admin.id);
  });

  it('complete instant-meet flow: patient offer → admin answers → ICE exchanged', async () => {
    // 1. Patient broadcasts offer
    vi.mocked(getAuthUser).mockResolvedValue(patient as any);
    await POST(makeRequest('POST', { roomId: room, recipientId: null, type: 'offer', payload: '{"sdp":"offer"}' }));

    // 2. Patient broadcasts ICE candidates (peer unknown yet)
    await POST(makeRequest('POST', { roomId: room, recipientId: null, type: 'candidate', payload: '{"c":"p-ice-1"}' }));
    await POST(makeRequest('POST', { roomId: room, recipientId: null, type: 'candidate', payload: '{"c":"p-ice-2"}' }));

    // 3. Admin polls — receives offer + 2 ICE candidates
    vi.mocked(getAuthUser).mockResolvedValue(admin as any);
    const adminPoll1 = await (await GET(makeRequest('GET', undefined, url))).json();
    expect(adminPoll1.signals.map((s: any) => s.type)).toEqual(['offer', 'candidate', 'candidate']);

    // 4. Admin posts answer + ICE directly to patient
    await POST(makeRequest('POST', { roomId: room, recipientId: patient.id, type: 'answer', payload: '{"sdp":"answer"}' }));
    await POST(makeRequest('POST', { roomId: room, recipientId: patient.id, type: 'candidate', payload: '{"c":"a-ice-1"}' }));

    // 5. Patient polls — receives answer + admin ICE
    vi.mocked(getAuthUser).mockResolvedValue(patient as any);
    const patientPoll = await (await GET(makeRequest('GET', undefined, url))).json();
    expect(patientPoll.signals.map((s: any) => s.type)).toEqual(['answer', 'candidate']);

    // 6. Confirm no cross-delivery: admin polling again gets nothing
    vi.mocked(getAuthUser).mockResolvedValue(admin as any);
    const adminPoll2 = await (await GET(makeRequest('GET', undefined, url))).json();
    expect(adminPoll2.signals).toHaveLength(0);
  });

  it('patient signal not returned to patient (no self-delivery)', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(patient as any);
    await POST(makeRequest('POST', { roomId: room, recipientId: null, type: 'offer', payload: '{}' }));

    // Patient polls own room — should NOT get back their own offer
    const { signals } = await (await GET(makeRequest('GET', undefined, url))).json();
    expect(signals).toHaveLength(0);
  });
});
