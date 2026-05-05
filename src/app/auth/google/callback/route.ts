import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const code = url.searchParams.get('code');

        if (!code) {
            return new NextResponse('Authorization code not found in URL.', { status: 400 });
        }

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            'http://localhost:9002/auth/google/callback'
        );

        // Exchange the fast-expiring auth code for persistent tokens
        const { tokens } = await oauth2Client.getToken(code);

        // --- AUTOMATIC ENV REPAIR ---
        const fs = require('fs');
        const path = require('path');
        const envPath = path.join(process.cwd(), '.env');
        let envContent = fs.readFileSync(envPath, 'utf8');
        envContent = envContent.replace(
            new RegExp(`^GOOGLE_ADMIN_REFRESH_TOKEN=.*$`, 'm'),
            `GOOGLE_ADMIN_REFRESH_TOKEN=${tokens.refresh_token}`
        );
        fs.writeFileSync(envPath, envContent);

        // Update active server instance
        process.env.GOOGLE_ADMIN_REFRESH_TOKEN = tokens.refresh_token;

        return new NextResponse(`
            <html>
                <body style="font-family: sans-serif; max-width: 600px; margin: 40px auto; line-height: 1.6;">
                    <h2 style="color: #22c55e;">Authorization Automatic Setup Complete!</h2>
                    <p>Google has successfully authenticated your account!</p>
                    <p><strong>I have automatically saved your Refresh Token into your .env file for you.</strong> You do not need to copy and paste anything!</p>
                    
                    <div style="background: #fffbeb; padding: 16px; border-left: 4px solid #f59e0b; margin-top: 24px;">
                        <h3 style="margin-top:0">Next Steps:</h3>
                        <ol style="margin-bottom: 0;">
                            <li>Close this tab.</li>
                            <li>Go back to your <strong>Create Schedule</strong> page.</li>
                            <li>Click the <strong>Generate Meet Link</strong> button again. It will work instantly!</li>
                        </ol>
                    </div>
                </body>
            </html>
        `, { headers: { 'Content-Type': 'text/html' } });

    } catch (error: any) {
        return new NextResponse(`Error exchanging code: ${error.message}`, { status: 500 });
    }
}
