import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET() {
    try {
        if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
            return NextResponse.json({ error: 'Missing Client ID or Secret in .env' }, { status: 400 });
        }

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            'http://localhost:9002/auth/google/callback'
        );

        const scopes = ['https://www.googleapis.com/auth/calendar.events'];

        // Generate a url that asks permissions for Google Calendar scopes
        const url = oauth2Client.generateAuthUrl({
            access_type: 'offline', // strictly requests a refresh token
            prompt: 'consent',      // forces bringing up the consent screen again
            scope: scopes,
        });

        return NextResponse.redirect(url);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to generate auth url' }, { status: 500 });
    }
}
