import * as admin from "firebase-admin";

if (!admin.apps.length) {
  const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY || process.env.GOOGLE_DRIVE_PRIVATE_KEY;
  const privateKey = rawPrivateKey
    ? rawPrivateKey.replace(/\\n/g, '\n').replace(/"/g, '')
    : undefined;

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL || process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL,
      privateKey: privateKey,
    } as admin.ServiceAccount),
  });
}

const adminDb = admin.firestore();
const adminAuth = admin.auth();

export { adminDb, adminAuth, admin };
