const { google } = require('googleapis');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

async function deployRules() {
  try {
    const serviceAccountJson = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: serviceAccountJson.client_email,
        private_key: serviceAccountJson.private_key,
      },
      scopes: ['https://www.googleapis.com/auth/firebase', 'https://www.googleapis.com/auth/cloud-platform'],
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });

    const firebaserules = google.firebaserules({
      version: 'v1',
      auth: auth,
    });

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const rulesContent = fs.readFileSync('firestore.rules', 'utf8');

    console.log(`Deploying rules for project ${projectId}...`);

    const rulesetRes = await firebaserules.projects.rulesets.create({
      name: `projects/${projectId}`,
      requestBody: {
        source: {
          files: [
            {
              name: 'firestore.rules',
              content: rulesContent,
            },
          ],
        },
      },
    });

    const rulesetName = rulesetRes.data.name;
    console.log('Created ruleset:', rulesetName);

    const releaseRes = await firebaserules.projects.releases.patch({
      name: `projects/${projectId}/releases/cloud.firestore`,
      requestBody: {
        name: `projects/${projectId}/releases/cloud.firestore`,
        rulesetName: rulesetName,
      },
    });

    console.log('Successfully updated release:', releaseRes.data.name);
    console.log('Rules deployed successfully!');
  } catch (error) {
    console.error('Error deploying rules:', error.message);
    if (error.response) {
      console.error(error.response.data);
    }
  }
}

deployRules();
