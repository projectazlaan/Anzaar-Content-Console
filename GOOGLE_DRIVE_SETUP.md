# 🔧 Google Drive API Setup Guide

## ❌ Error You're Seeing:

```
Google Drive API has not been used in project 632264425449 before or it is disabled.
```

## ✅ Quick Fix (5 Minutes):

### **Step 1: Enable Google Drive API**

1. **Click this link:** 
   https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=632264425449

2. **Click "Enable API" button**
   - Wait 2-3 minutes for it to propagate

3. **Verify it's enabled:**
   - Go to: https://console.cloud.google.com/apis/library/drive.googleapis.com
   - Should show "API enabled" ✅

---

### **Step 2: Create Service Account**

1. **Go to Service Accounts:**
   https://console.cloud.google.com/iam-admin/serviceaccounts?project=632264425449

2. **Click "+ CREATE SERVICE ACCOUNT"**

3. **Fill in details:**
   - Service account name: `drive-uploader`
   - Description: `For uploading files to Google Drive`
   - Click "CREATE AND CONTINUE"

4. **Grant Role:**
   - Search for "Drive"
   - Select **"Drive Admin"** or **"Drive File Writer"**
   - Click "CONTINUE"
   - Click "DONE"

---

### **Step 3: Generate Service Account Key**

1. **Find your service account** in the list
2. **Click on the email** (looks like: `drive-uploader@project-id.iam.gserviceaccount.com`)
3. **Go to "KEYS" tab**
4. **Click "ADD KEY" → "Create new key"**
5. **Select "JSON" format**
6. **Click "CREATE"**
7. **Download the JSON file** (keep it safe!)

---

### **Step 4: Extract Credentials from JSON**

Open the downloaded JSON file, you'll see:

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "drive-uploader@project-id.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  ...
}
```

**You need:**
- `client_email` → This is your `GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL`
- `private_key` → This is your `GOOGLE_DRIVE_PRIVATE_KEY`

---

### **Step 5: Create Google Drive Folders**

1. **Go to Google Drive:** https://drive.google.com/

2. **Create 3 folders:**
   - `Anzaar Designs` (for designer uploads)
   - `Anzaar Shoots` (for shooter uploads)
   - `Anzaar Edits` (for editor uploads)

3. **Get Folder IDs:**
   - Open each folder
   - Look at the URL: `https://drive.google.com/drive/folders/FOLDER_ID_HERE`
   - Copy the FOLDER_ID part

4. **Share folders with Service Account:**
   - Right-click folder → Share
   - Paste the service account email: `drive-uploader@project-id.iam.gserviceaccount.com`
   - Give "Editor" access
   - Click "Share"
   - Repeat for all 3 folders

---

### **Step 6: Update .env.local File**

Open your `.env.local` file and update:

```env
# Google Drive API
GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL=drive-uploader@your-project.iam.gserviceaccount.com
GOOGLE_DRIVE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour full private key here\n-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_DESIGNS_FOLDER_ID=1ABC123xyz_folder_id_here
GOOGLE_DRIVE_SHOOTS_FOLDER_ID=1DEF456abc_folder_id_here
GOOGLE_DRIVE_EDITS_FOLDER_ID=1GHI789def_folder_id_here
```

**⚠️ Important Notes:**
- Put the FULL private key including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
- Wrap the private key in quotes `"..."`
- Replace `\n` with actual newline characters if needed
- Folder IDs are the long strings from the URLs

---

### **Step 7: Restart Server**

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

---

## ✅ Verification:

After setup, test by:

1. **Login to your app**
2. **Go to Designer/Shooting/Editing page**
3. **Try uploading a file**
4. **Should work without errors!** ✅

**Check Google Drive:**
- Files should appear in the respective folders
- Service account should have access

---

## 🔍 Troubleshooting:

### Error: "credentials not configured"
**Fix:** Check `.env.local` has all 5 GOOGLE_DRIVE variables

### Error: "invalid_grant"
**Fix:** Private key is incorrect - make sure it includes BEGIN/END lines

### Error: "insufficient permissions"
**Fix:** 
1. Share the folders with service account email
2. Give Editor access
3. Wait 2 minutes

### Error: "folder not found"
**Fix:** Check folder IDs are correct and folders exist

---

## 📋 Checklist:

- [ ] Google Drive API enabled
- [ ] Service account created
- [ ] Drive Admin role assigned
- [ ] JSON key downloaded
- [ ] `.env.local` updated with credentials
- [ ] 3 folders created in Google Drive
- [ ] Folders shared with service account
- [ ] Server restarted
- [ ] Upload tested successfully

---

## 🎯 Quick Summary:

1. **Enable API** → Click the link in error message
2. **Create Service Account** → Get email & private key
3. **Create Folders** → Get folder IDs
4. **Share Folders** → With service account email
5. **Update .env.local** → Add all credentials
6. **Restart Server** → Test upload

---

## 💡 Pro Tips:

- Keep your JSON key file secure (never commit to git)
- The `.env.local` file is already in `.gitignore`
- You can use the same service account for multiple projects
- Test with small files first

---

**Need Help?** Follow the steps above one by one, and the upload will work! 🚀
