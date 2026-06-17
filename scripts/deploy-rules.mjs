import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import jwt from 'jsonwebtoken';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local manually
const envPath = join(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1]] = match[2].replace(/^"(.*)"$/, '$1');
  }
});

const clientEmail = env.FIREBASE_CLIENT_EMAIL;
const privateKey = env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/"/g, '');
const projectId = env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

const rulesContent = readFileSync(join(__dirname, '..', 'firestore.rules'), 'utf-8');

async function getAccessToken() {
  const payload = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/firebase',
    aud: 'https://oauth2.googleapis.com/token',
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
  };
  const assertion = jwt.sign(payload, privateKey, { algorithm: 'RS256' });
  
  return new Promise((resolve, reject) => {
    const postData = `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${encodeURIComponent(assertion)}`;
    const req = https.request({
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(postData) },
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const json = JSON.parse(data);
        if (json.access_token) resolve(json.access_token);
        else reject(new Error(json.error_description || 'Failed to get token'));
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function apiCall(method, hostname, path, token, body) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname,
      path,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };
    if (body) {
      opts.headers['Content-Length'] = Buffer.byteLength(body);
    }
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data || '{}'));
        } else {
          reject(new Error(`${res.statusCode}: ${data.substring(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function deployRules(token) {
  // Step 1: Create a ruleset
  console.log('Creating ruleset...');
  const rulesetBody = JSON.stringify({
    source: { files: [{ name: 'firestore.rules', content: rulesContent }] },
  });
  const ruleset = await apiCall('POST', 'firebaserules.googleapis.com', `/v1/projects/${projectId}/rulesets`, token, rulesetBody);
  const rulesetName = ruleset.name;
  console.log(`✅ Ruleset created: ${rulesetName}`);

  // Step 2: Get the current Firestore database to include in the update
  console.log('Fetching current database config...');
  const dbConfig = await apiCall('GET', 'firestore.googleapis.com', `/v1/projects/${projectId}/databases/(default)`, token);
  
  // Step 3: Update database with rules
  console.log('Updating database with new rules...');
  // The patch body must include the rules source inline
  const updateBody = JSON.stringify({
    rules: rulesContent,
  });
  await apiCall('PATCH', 'firestore.googleapis.com', `/v1/projects/${projectId}/databases/(default)?updateMask=rules`, token, updateBody);

  console.log('✅ Firestore rules deployed successfully!');
}

try {
  console.log('Getting access token...');
  const token = await getAccessToken();
  console.log('✅ Got access token');
  console.log('Deploying Firestore rules...');
  await deployRules(token);
} catch (err) {
  console.error('Deployment failed:', err.message);
}
