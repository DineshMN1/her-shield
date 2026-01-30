import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

// GET /api/medical-records/scans - Get patient's scans
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const scans = await prisma.medicalScan.findMany({
      where: { patientId: user.id },
      orderBy: { scanDate: 'desc' },
    });

    return Response.json({ scans });
  } catch (error) {
    console.error('Fetch scans error:', error);
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/medical-records/scans - Upload scan
export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { title, scanType, fileUrl, fileType, notes, appointmentId, scanDate } = body;

    const scan = await prisma.medicalScan.create({
      data: {
        patientId: user.id,
        title,
        scanType,
        fileUrl,
        fileType,
        notes,
        appointmentId,
        scanDate: scanDate ? new Date(scanDate) : new Date(),
      },
    });

    return Response.json({ scan });
  } catch (error) {
    console.error('Upload scan error:', error);
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}
