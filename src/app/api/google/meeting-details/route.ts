import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);


        if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_ADMIN_REFRESH_TOKEN) {
            return NextResponse.json({ error: 'Google API credentials are missing' }, { status: 500 });
        }

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );
        
        oauth2Client.setCredentials({
            refresh_token: process.env.GOOGLE_ADMIN_REFRESH_TOKEN,
        });

        // 1. Get the Meet Code from the URL (e.g. "abc-defg-hij")
        const meetLink = url.searchParams.get('meetLink');
        if (!meetLink) return NextResponse.json({ error: 'meetLink parameter is required' }, { status: 400 });
        
        const meetCodeMatch = meetLink.match(/meet\.google\.com\/([a-z0-9\-]+)/);
        if (!meetCodeMatch) return NextResponse.json({ error: 'Invalid Google Meet Link format' }, { status: 400 });
        const spaceId = meetCodeMatch[1];

        // 2. Refresh Auth Token to use native REST requests
        const { credentials } = await oauth2Client.refreshAccessToken();
        const token = credentials.access_token;
        const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

        // 3. GET Meeting Details (Google Meet API v2: spaces)
        const spaceRes = await fetch(`https://meet.googleapis.com/v2/spaces/${spaceId}`, { headers });
        const spaceData = spaceRes.ok ? await spaceRes.json() : { error: await spaceRes.text(), status: spaceRes.status };

        // 4. GET Conference Records (to find the active or past sessions for this space)
        const confRes = await fetch(`https://meet.googleapis.com/v2/conferenceRecords?filter=space.name%3D%22spaces/${spaceId}%22`, { headers });
        let conferenceRecords = [];
        let participants = [];

        if (confRes.ok) {
            const confData = await confRes.json();
            conferenceRecords = confData.conferenceRecords || [];

            // 5. GET Participants for the most recent session
            if (conferenceRecords.length > 0) {
                const latestRecord = conferenceRecords[0].name; // usually formatted "conferenceRecords/xxx"
                const partRes = await fetch(`https://meet.googleapis.com/v2/${latestRecord}/participants`, { headers });
                if (partRes.ok) {
                    const partData = await partRes.json();
                    participants = partData.participants || [];
                }
            }
        }

        return NextResponse.json({
            success: true,
            spaceDetails: spaceData,
            totalSessionsFound: conferenceRecords.length,
            participants: participants
        });

    } catch (error: any) {
        console.error('Failed to fetch meeting details:', error?.response?.data || error);
        return NextResponse.json({ error: 'Failed to fetch meeting from Google', details: error.message }, { status: 500 });
    }
}
