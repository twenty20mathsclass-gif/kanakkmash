import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

/**
 * POST /api/create-meet
 * Generates a unique Jitsi Meet room link.
 * Jitsi is free, open-source, requires no authentication, and works like Google Meet.
 * Room links are permanent and unique: https://meet.jit.si/{roomName}
 *
 * NOTE: Google Meet API requires domain-wide delegation (Google Workspace only).
 * Jitsi is the practical equivalent for this use case.
 */
export async function POST(_req: NextRequest) {
  try {
    // Generate a cryptographically unique room name
    const randomSuffix = randomBytes(6).toString('hex'); // e.g. "a3f9b2c1d4e5"
    const roomName = `KanakKmash-${randomSuffix}`;
    const meetingUri = `https://meet.jit.si/${roomName}`;

    return NextResponse.json({
      meetingUri,
      meetingCode: roomName,
      name: roomName,
      provider: 'jitsi',
    });
  } catch (err: any) {
    console.error('[create-meet] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to generate meeting link' },
      { status: 500 }
    );
  }
}
