import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local
const envPath = join(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1]] = match[2].replace(/^"(.*)"$/, '$1');
  }
});

const privateKey = env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/"/g, '');
const rulesContent = readFileSync(join(__dirname, '..', 'firestore.rules'), 'utf-8');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    }),
  });
}

const rules = admin.securityRules();

try {
  console.log('Creating ruleset from source...');
  const ruleset = await rules.createRuleset(rulesContent);
  console.log('✅ Ruleset created:', ruleset.name);

  console.log('Releasing ruleset...');
  // Get existing release and update it
  const releaseName = 'projects/' + env.NEXT_PUBLIC_FIREBASE_PROJECT_ID + '/releases/cloud.firestore';
  await rules.updateRelease(env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, releaseName, ruleset.name);
  console.log('✅ Firestore rules deployed successfully!');
} catch (err) {
  console.error('❌ Deployment failed:', err.message);
  if (err.errorInfo) {
    console.error('Error details:', err.errorInfo);
  }
}
