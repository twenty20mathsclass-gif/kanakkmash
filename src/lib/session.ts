'use server';

import { cookies } from 'next/headers';
import type { User } from './definitions';
import { users } from './data';

const SESSION_COOKIE_NAME = 'mathsprint_session';

// In a real app, this would be a secure, encrypted session object.
// For this mock, we'll store the user ID and re-fetch the user.
type SessionPayload = {
  userId: string;
};

export async function createSession(userId: string) {
  const payload: SessionPayload = { userId };
  cookies().set(SESSION_COOKIE_NAME, JSON.stringify(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // One week
    path: '/',
  });
}

export async function getSession(): Promise<{ user: User | null }> {
  const sessionCookie = cookies().get(SESSION_COOKIE_NAME);

  if (!sessionCookie) {
    return { user: null };
  }

  try {
    const payload: SessionPayload = JSON.parse(sessionCookie.value);
    // In a real app, you'd fetch this from a database.
    const user = users.find((u) => u.id === payload.userId) || null;
    return { user };
  } catch (error) {
    console.error('Failed to parse session cookie:', error);
    return { user: null };
  }
}

export async function deleteSession() {
  cookies().delete(SESSION_COOKIE_NAME);
}
