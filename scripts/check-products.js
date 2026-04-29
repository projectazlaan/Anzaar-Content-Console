
const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL,
      privateKey: process.env.GOOGLE_DRIVE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    })
  });
}

const db = admin.firestore();

async function checkProducts() {
  console.log("Checking products...");
  const snapshot = await db.collection('products').get();
  if (snapshot.empty) {
    console.log("No products found.");
    return;
  }
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`ID: ${doc.id}, Name: ${data.name}, Status: ${data.status}`);
  });
}

checkProducts().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
