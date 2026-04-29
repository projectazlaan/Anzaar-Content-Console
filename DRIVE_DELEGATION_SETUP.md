# 🔧 Domain-Wide Delegation Setup Guide

## ❌ Problem:
```
Service Accounts do not have storage quota.
```

## ✅ Solution: Domain-Wide Delegation

This allows the service account to impersonate your Google account and use YOUR Drive storage.

---

## 🚀 Setup Steps (5 Minutes):

### **Step 1: Enable Domain-Wide Delegation on Service Account**

1. **Go to Service Accounts:**
   https://console.cloud.google.com/iam-admin/serviceaccounts?project=anzaar-engine-lite-c4fc2

2. **Find your service account:**
   `content-drive-bot@anzaar-engine-lite-c4fc2.iam.gserviceaccount.com`

3. **Click on it** to open details

4. **Go to "KEYS" tab** (you should already have a key)

5. **Click "EDIT"** (pencil icon at the top)

6. **Check the box:**
   ✅ "Enable G Suite Domain-wide Delegation"

7. **Click "SAVE"**

---

### **Step 2: Add OAuth Scopes to Admin Console**

**If you're using Google Workspace:**

1. **Go to Admin Console:**
   https://admin.google.com/

2. **Navigate to:**
   Security → Access and data control → API controls

3. **Click "Manage Domain Wide Delegation"**

4. **Click "Add new"**

5. **Enter:**
   - **Client ID:** Find it in your service account JSON key file (look for `"client_id"`)
   - **OAuth Scopes:** Add these one by one:
     ```
     https://www.googleapis.com/auth/drive
     ```

6. **Click "Authorize"**

---

### **Step 3: Verify .env.local Configuration**

Your `.env.local` should now have:

```env
GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL=content-drive-bot@anzaar-engine-lite-c4fc2.iam.gserviceaccount.com
GOOGLE_DRIVE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_USER_EMAIL=ihriajul@gmail.com  ← THIS IS NEW!

GOOGLE_DRIVE_DESIGNS_FOLDER_ID=1S6Hkg7DRsI6GwQlN606sSNDI8VG1tlXd
GOOGLE_DRIVE_SHOOTS_FOLDER_ID=1-xNzwrk-_qQTFL4e0duyUqnMWauah7O-
GOOGLE_DRIVE_EDITS_FOLDER_ID=1eiJHKNXW6mgzywGX0K2M-C2aBqVuKtJC
```

✅ Already added: `GOOGLE_DRIVE_USER_EMAIL=ihriajul@gmail.com`

---

### **Step 4: Share Your Google Drive Folders**

1. **Go to Google Drive:** https://drive.google.com/

2. **For each folder (Designs, Shoots, Edits):**
   - Right-click folder → Share
   - Add: `ihriajul@gmail.com` (your email)
   - Give "Editor" access
   - Click "Share"

3. **Also share with service account** (if not already):
   - Add: `content-drive-bot@anzaar-engine-lite-c4fc2.iam.gserviceaccount.com`
   - Give "Editor" access

---

### **Step 5: Restart Server**

```bash
# Stop the current server (Ctrl+C in terminal)
# Then restart:
npm run dev
```

---

## ✅ Verification:

**Test the setup:**

1. **Login to your app:** http://localhost:3000/

2. **Go to Designer page** (or Shooting/Editing)

3. **Upload a test file**

4. **Check Google Drive:**
   - Files should appear in your personal Drive
   - URL: https://drive.google.com/drive/my-drive
   - Check the specific folders

---

## 🔍 How It Works Now:

```
Your App
    ↓
Service Account (content-drive-bot@...)
    ↓
Impersonates: ihriajul@gmail.com
    ↓
Uses YOUR Google Drive storage
    ↓
Files appear in your Drive folders
```

**Key Changes:**
- ✅ Scope changed from `drive.file` to `drive` (full access)
- ✅ Added user email for impersonation
- ✅ Files now use YOUR storage quota
- ✅ No more "no storage quota" error

---

## 📋 Troubleshooting:

### Error: "insufficient permissions"
**Fix:** 
1. Make sure Domain-Wide Delegation is enabled
2. Check OAuth scopes are added in Admin Console
3. Wait 5 minutes for changes to propagate

### Error: "user not found"
**Fix:** 
- Verify `GOOGLE_DRIVE_USER_EMAIL` is correct
- Make sure it's a valid Google account

### Error: "folder not found"
**Fix:**
- Share folders with both your email AND service account
- Verify folder IDs are correct

### Files not appearing in Drive
**Fix:**
- Check if files are in "Shared with me" instead
- Look in the specific folders by ID

---

## 🎯 Alternative: Use Shared Drive

If Domain-Wide Delegation doesn't work (requires Google Workspace):

### **Option: Create a Shared Drive**

1. **Go to Google Drive:** https://drive.google.com/

2. **Click "Shared drives"** on the left

3. **Click "New shared drive"**

4. **Name it:** "Anzaar Content"

5. **Add members:**
   - `ihriajul@gmail.com` (Manager)
   - `content-drive-bot@anzaar-engine-lite-c4fc2.iam.gserviceaccount.com` (Manager)

6. **Create folders inside Shared Drive:**
   - Designs
   - Shoots
   - Edits

7. **Update .env.local** with new folder IDs

**Advantage:** Shared Drives have their own storage, separate from personal accounts.

---

## 💡 Important Notes:

1. **Domain-Wide Delegation** requires:
   - Google Workspace account (not personal Gmail)
   - Admin console access

2. **If using personal Gmail:**
   - Use Shared Drive method instead
   - Or use OAuth 2.0 with user consent

3. **Storage:**
   - Files count against YOUR quota (ihriajul@gmail.com)
   - Or against Shared Drive quota if using that method

---

## ✅ Final Checklist:

- [ ] Domain-Wide Delegation enabled on service account
- [ ] OAuth scopes added in Admin Console (if Workspace)
- [ ] `GOOGLE_DRIVE_USER_EMAIL` added to .env.local
- [ ] Folders shared with your email
- [ ] Folders shared with service account
- [ ] Server restarted
- [ ] Test upload successful

---

## 🚀 Quick Summary:

1. **Enable delegation** on service account
2. **Add scopes** in Admin Console
3. **Add email** to .env.local (already done!)
4. **Share folders** with your account
5. **Restart server**
6. **Test upload**

---

**After completing these steps, uploads will work using your Google Drive storage! 🎉**
