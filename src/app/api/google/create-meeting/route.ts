import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function POST(req: Request) {
    try {
        const { title, date, startTime, endTime, teacherEmail, studentEmails } = await req.json();

        if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_ADMIN_REFRESH_TOKEN) {
            throw new Error('Google API credentials are missing in the environment variables.');
        }

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            'http://localhost:9002/auth/google/callback'
        );

        let currentToken = process.env.GOOGLE_ADMIN_REFRESH_TOKEN;

        // Auto-exchange mechanism: If the user pasted an Authorization Code (starts with "4/") 
        // into the .env instead of a Refresh Token, we exchange it for them securely.
        if (currentToken.startsWith('4/')) {
            const { tokens } = await oauth2Client.getToken(currentToken);
            if (tokens.refresh_token) {
                currentToken = tokens.refresh_token;

                // Update the .env file securely so they never have to do this again
                const fs = require('fs');
                const path = require('path');
                const envPath = path.join(process.cwd(), '.env');
                let envContent = fs.readFileSync(envPath, 'utf8');
                envContent = envContent.replace(
                    new RegExp(`^GOOGLE_ADMIN_REFRESH_TOKEN=.*$`, 'm'),
                    `GOOGLE_ADMIN_REFRESH_TOKEN=${currentToken}`
                );
                fs.writeFileSync(envPath, envContent);

                // Update the active process variable
                process.env.GOOGLE_ADMIN_REFRESH_TOKEN = currentToken;
            }
        }

        oauth2Client.setCredentials({
            refresh_token: currentToken,
        });

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        
        let startDateTime = new Date();
        let endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // +1 hour default

        if (date && startTime && endTime) {
            const dateObj = new Date(date);
            const [startH, startM] = startTime.split(':');
            startDateTime = new Date(dateObj);
            startDateTime.setHours(parseInt(startH), parseInt(startM), 0, 0);
            
            const [endH, endM] = endTime.split(':');
            endDateTime = new Date(dateObj);
            endDateTime.setHours(parseInt(endH), parseInt(endM), 0, 0);
        }

        const attendees: any[] = [];
        if (teacherEmail) {
            attendees.push({ email: teacherEmail, responseStatus: 'accepted' });
        }
        if (Array.isArray(studentEmails)) {
            studentEmails.forEach(email => {
                if (email) attendees.push({ email, responseStatus: 'accepted' });
            });
        }

        const event = await calendar.events.insert({
            calendarId: 'primary',
            conferenceDataVersion: 1,
            requestBody: {
                summary: title || 'Scheduled Class',
                description: 'Kanakkumash Online Class',
                start: { 
                    dateTime: startDateTime.toISOString(),
                    timeZone: 'Asia/Kolkata',
                },
                end: { 
                    dateTime: endDateTime.toISOString(),
                    timeZone: 'Asia/Kolkata',
                },
                attendees,
                guestsCanInviteOthers: true,
                guestsCanModify: true,
                conferenceData: {
                    createRequest: {
                        requestId: Math.random().toString(36).substring(7),
                        conferenceSolutionKey: { type: 'hangoutsMeet' },
                    },
                },
            },
        });
        
        const meetLink = event.data.hangoutLink;
        const eventId = event.data.id;
        
        if (!meetLink) {
            throw new Error('Failed to generate Google Meet link from Event.');
        }

        return NextResponse.json({ meetLink, eventId });
    } catch (error: any) {
        console.error('Meet API Error:', error?.response?.data || error);
        return NextResponse.json({ error: 'Failed to generate meeting', details: error.message }, { status: 500 });
    }
}
