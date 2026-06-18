"use server";

import { adminDb, admin } from "./firebase-admin";
import { uploadFileToDrive, getDriveImageUrl, getOrCreateFolder } from "./drive";
import { Readable } from "stream";

const ts = () => admin.firestore.FieldValue.serverTimestamp();
const col = (name: string) => adminDb.collection(name);
const docRef = (name: string, id: string) => adminDb.collection(name).doc(id);
const snapData = (d: any) => serialize({ id: d.id, ...d.data() });
const serialize = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'object' && obj.constructor?.name === 'Timestamp') {
    return obj.toDate().toISOString();
  }
  if (Array.isArray(obj)) return obj.map(serialize);
  if (typeof obj === 'object' && Object.getPrototypeOf(obj) === Object.prototype) {
    const result: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) result[k] = serialize(v);
    return result;
  }
  return obj;
};

async function createNotif(data: { title: string; message: string; type?: string; actionType?: string }) {
  try {
    await col("notifications").add({
      title: data.title,
      message: data.message,
      type: data.type || "info",
      actionType: data.actionType || "general",
      read: false,
      createdAt: ts(),
    });
  } catch (e) {
    console.error("Failed to create notification:", e);
  }
}

// --- PRODUCT FLOW ACTIONS ---

export async function createProduct(formData: FormData) {
  const rawName = formData.get("name") as string;
  const category = formData.get("category") as string;
  const file = formData.get("file") as File;

  if (!file) throw new Error("Missing required fields");

  const name = rawName?.trim() || `Untitled-${Date.now().toString(36).toUpperCase()}`;
  const namePending = !rawName?.trim();

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const stream = Readable.from(buffer);
    
    const dateStr = new Date().toISOString().split('T')[0];
    const designParentId = await getOrCreateFolder(dateStr, process.env.GOOGLE_DRIVE_DESIGNS_FOLDER_ID as string);

    const driveFile = await uploadFileToDrive(
      stream, 
      `${name}-design`, 
      file.type,
      designParentId
    );

    const docRef = await col("products").add({
      name,
      namePending,
      category,
      status: "Pending Direction",
      designUrl: driveFile.webViewLink,
      designId: driveFile.id,
      downloadUrl: driveFile.webContentLink || null,
      thumbnailUrl: driveFile.id ? getDriveImageUrl(driveFile.id) : null,
      createdAt: ts(),
      updatedAt: ts(),
    });

    const msg = namePending ? `Product created — name pending from director` : `${name} has been created and is pending direction`;
    createNotif({ title: namePending ? "Name Pending" : "New Product Created", message: msg, type: namePending ? "warning" : "success", actionType: "product_created" });

    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error("Error creating product:", error);
    return { success: false, error: error.message };
  }
}

export async function createBulkProducts(formData: FormData) {
  const rawName = formData.get("name") as string;
  const category = formData.get("category") as string;
  const files = formData.getAll("files") as File[];

  try {
    if (files.length === 0) throw new Error("Missing required fields");

    const name = rawName?.trim() || `Untitled-${Date.now().toString(36).toUpperCase()}`;
    const namePending = !rawName?.trim();

    const dateStr = new Date().toISOString().split('T')[0];
    const designParentId = await getOrCreateFolder(dateStr, process.env.GOOGLE_DRIVE_DESIGNS_FOLDER_ID as string);

    const uploadPromises = files.map(async (file, index) => {
      const buffer = Buffer.from(await file.arrayBuffer());
      const stream = Readable.from(buffer);
      
      const productName = files.length > 1 ? `${name} - Variation ${index + 1}` : name;
      
      const driveFile = await uploadFileToDrive(
        stream, 
        `${productName}-design`, 
        file.type,
        designParentId
      );

      return {
        url: driveFile.webViewLink,
        id: driveFile.id,
        fileName: file.name,
        downloadUrl: driveFile.webContentLink || null,
      };
    });

    const uploadedFiles = await Promise.all(uploadPromises);
    
    const variations = uploadedFiles.map((file, index) => ({
      ...file,
      label: `Variation ${index + 1}`,
      thumbnailUrl: file.id ? getDriveImageUrl(file.id) : null,
    }));

    const productData: any = {
      name,
      namePending,
      category,
      status: "Pending Direction",
      mainDesignUrl: uploadedFiles[0].url,
      mainDesignId: uploadedFiles[0].id,
      mainDownloadUrl: uploadedFiles[0].downloadUrl || null,
      thumbnailUrl: uploadedFiles[0].id ? getDriveImageUrl(uploadedFiles[0].id) : null,
      variations,
      variationCount: uploadedFiles.length,
      createdAt: ts(),
      updatedAt: ts(),
    };

    if (uploadedFiles.length === 1) {
      productData.designUrl = uploadedFiles[0].url;
      productData.designId = uploadedFiles[0].id;
      productData.downloadUrl = uploadedFiles[0].downloadUrl || null;
      productData.thumbnailUrl = uploadedFiles[0].id ? getDriveImageUrl(uploadedFiles[0].id) : null;
    }

    const docRef = await col("products").add(productData);
    
    const msg = namePending ? `Products uploaded — name pending from director` : `${name} created with ${uploadedFiles.length} variations`;
    createNotif({ title: namePending ? "Name Pending" : "Bulk Products Created", message: msg, type: namePending ? "warning" : "success", actionType: "bulk_created" });
    
    return { success: true, id: docRef.id, variationCount: uploadedFiles.length, namePending };
  } catch (error: any) {
    console.error("Error creating bulk products:", error);
    return { success: false, error: error.message };
  }
}

export async function setProductName(productId: string, newName: string) {
  if (!newName?.trim()) return { success: false, error: "Name is required" };
  try {
    await docRef("products", productId).update({
      name: newName.trim(),
      namePending: false,
      updatedAt: ts(),
    });
    createNotif({ title: "Product Named", message: `Product name set to "${newName.trim()}"`, type: "info", actionType: "product_named" });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function submitDirection(productId: string, shootDir: string, editDir: string) {
  try {
    await docRef("products", productId).update({
      status: "Pending Shoot",
      directions: { shoot: shootDir, edit: editDir },
      updatedAt: ts(),
    });
    createNotif({ title: "Direction Submitted", message: `Directions provided, status set to Pending Shoot`, type: "info", actionType: "direction_submitted" });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function markAsShot(productId: string) {
  try {
    await docRef("products", productId).update({
      status: "Pending Selection",
      updatedAt: ts(),
    });
    createNotif({ title: "Marked as Shot", message: `Product status set to Pending Selection`, type: "success", actionType: "marked_shot" });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function uploadRawAssets(productId: string, formData: FormData) {
  const files = formData.getAll("files") as File[];
  
  try {
    const productSnap = await docRef("products", productId).get();
    const productName = productSnap.exists ? (productSnap.data()?.name || productId) : productId;
    
    const shootParentId = await getOrCreateFolder(productName, process.env.GOOGLE_DRIVE_SHOOTS_FOLDER_ID as string);

    const uploadPromises = files.map(async (file) => {
      const buffer = Buffer.from(await file.arrayBuffer());
      const stream = Readable.from(buffer);
      return uploadFileToDrive(
        stream,
        `${productId}-${file.name}`,
        file.type,
        shootParentId
      );
    });

    const results = await Promise.all(uploadPromises);
    const rawUrls = results.map(r => r.webViewLink);
    const rawIds = results.map(r => r.id);
    const rawDownloadUrls = results.map(r => r.webContentLink || null);

    await docRef("products", productId).update({
      rawUrls: rawUrls,
      rawIds: rawIds,
      rawDownloadUrls: rawDownloadUrls,
      updatedAt: ts(),
    });

    createNotif({ title: "Raw Assets Uploaded", message: `${files.length} raw asset(s) uploaded`, type: "success", actionType: "raw_uploaded" });

    return { success: true, count: files.length };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function uploadEditedAsset(productId: string, formData: FormData) {
  const file = formData.get("file") as File;
  
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const stream = Readable.from(buffer);
    
    const productSnap = await docRef("products", productId).get();
    const productName = productSnap.exists ? (productSnap.data()?.name || productId) : productId;
    
    const editParentId = await getOrCreateFolder(productName, process.env.GOOGLE_DRIVE_EDITS_FOLDER_ID as string);

    const result = await uploadFileToDrive(
      stream,
      `${productId}-edited`,
      file.type,
      editParentId
    );

    await docRef("products", productId).update({
      editedUrl: result.webViewLink,
      editedDownloadUrl: result.webContentLink || null,
      status: "Pending Review",
      updatedAt: ts(),
    });

    createNotif({ title: "Edited Asset Uploaded", message: `Edited file uploaded, status set to Pending Review`, type: "success", actionType: "edit_uploaded" });

    return { success: true, url: result.webViewLink };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function submitForReview(productId: string) {
  try {
    await docRef("products", productId).update({
      status: "Pending Review",
      updatedAt: ts(),
    });
    createNotif({ title: "Submitted for Review", message: `Product submitted for review`, type: "info", actionType: "submitted_review" });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteProduct(productId: string) {
  try {
    await docRef("products", productId).delete();
    createNotif({ title: "Product Deleted", message: `Product has been removed`, type: "warning", actionType: "product_deleted" });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- PRESET INSTRUCTION ACTIONS ---

export async function getInstructionPresets() {
  try {
    const snapshot = await col("instruction_presets").orderBy("text", "asc").get();
    return snapshot.docs.map((d: any) => ({ id: d.id, text: d.data().text }));
  } catch (error) {
    console.error("Error getting presets:", error);
    return [];
  }
}

export async function addInstructionPreset(text: string) {
  const docRef = await col("instruction_presets").add({ text });
  return { id: docRef.id, text };
}

export async function removeInstructionPreset(id: string) {
  await docRef("instruction_presets", id).delete();
  return { success: true };
}

// --- CATEGORY ACTIONS ---

export async function getCategories() {
  try {
    const snapshot = await col("categories").orderBy("name", "asc").get();
    return snapshot.docs.map((d: any) => snapData(d));
  } catch (error) {
    console.error("Error getting categories:", error);
    return [];
  }
}

export async function addCategory(name: string) {
  try {
    const docRef = await col("categories").add({ name, createdAt: ts() });
    return { success: true, id: docRef.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function removeCategory(id: string) {
  try {
    await docRef("categories", id).delete();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateUserRole(uid: string, role: string, permissions: any) {
  try {
    await docRef("users", uid).update({ role, permissions, updatedAt: ts() });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteUser(uid: string) {
  try {
    await docRef("users", uid).delete();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function initializeUserAccount(uid: string, email: string) {
  try {
    const usersSnap = await col("users").limit(1).get();
    const isFirstUser = usersSnap.empty;

    console.log('Initializing user account:', { uid, email, isFirstUser, existingUsers: !usersSnap.empty });

    const role = isFirstUser ? "admin" : "pending";
    const permissions = isFirstUser ? 
      { view: true, edit: true, delete: true } : 
      { view: true, edit: false, delete: false };

    await col("users").doc(uid).set({
      email,
      role,
      permissions,
      createdAt: ts(),
      updatedAt: ts(),
    }, { merge: true });

    console.log('User account initialized:', { uid, role, isFirstUser });

    return { success: true, isFirstUser };
  } catch (error: any) {
    console.error("Error initializing user:", error);
    return { success: false, error: error.message };
  }
}

export async function forceSetAsAdmin(uid: string) {
  try {
    console.log('Force setting user as admin:', uid);
    
    await docRef("users", uid).update({
      role: "admin",
      permissions: { view: true, edit: true, delete: true },
      updatedAt: ts(),
    });

    console.log('User successfully set as admin:', uid);
    return { success: true };
  } catch (error: any) {
    console.error("Error setting user as admin:", error);
    return { success: false, error: error.message };
  }
}

// --- MASTER TEMPLATE ACTIONS ---

export async function getMasterTemplates() {
  try {
    const snapshot = await col("master_templates").orderBy("name", "asc").get();
    return snapshot.docs.map((d: any) => snapData(d));
  } catch (error) {
    console.error("Error getting master templates:", error);
    return [];
  }
}

export async function addMasterTemplate(name: string, shoot: string, edit: string) {
  const docRef = await col("master_templates").add({ name, shoot, edit, createdAt: ts() });
  return { id: docRef.id, name, shoot, edit };
}

export async function removeMasterTemplate(id: string) {
  await docRef("master_templates", id).delete();
  return { success: true };
}

export async function submitBulkDirections(productIds: string[], shootDir: string, editDir: string) {
  try {
    const promises = productIds.map(id => 
      docRef("products", id).update({
        status: "Pending Shoot",
        directions: { shoot: shootDir, edit: editDir },
        updatedAt: ts(),
      })
    );
    
    await Promise.all(promises);
    createNotif({ title: "Bulk Directions Submitted", message: `Directions provided for ${productIds.length} products`, type: "info", actionType: "bulk_directions" });
    return { success: true, count: productIds.length };
  } catch (error: any) {
    console.error("Error submitting bulk directions:", error);
    return { success: false, error: error.message };
  }
}

export async function submitSelection(productId: string, selectedAssets: Record<string, 'three-quarter' | 'half' | 'full'>) {
  try {
    const productRef = docRef("products", productId);
    const productSnap = await productRef.get();
    
    if (!productSnap.exists) {
      return { success: false, error: "Product not found" };
    }

    const productData = productSnap.data() || {};
    const productName = productData.name || 'product';
    
    const now = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dateStr = `${months[now.getMonth()]} ${now.getDate()}, ${String(now.getFullYear()).slice(-2)}`;
    const folderName = `Selected - ${dateStr}`;
    
    const { getOrCreateFolder, getDriveService } = await import("@/lib/drive");
    const driveFolderId = await getOrCreateFolder(folderName);
    
    const drive = await getDriveService();
    const selectedUrls: string[] = [];
    const cropRatios: Record<string, string> = {};
    
    const copyTasks = Object.entries(selectedAssets).map(async ([url, ratio]) => {
      const match = url.match(/[-\w]{25,}/);
      if (!match) return;
      const fileId = match[0];
      try {
        const [fileMeta, copied] = await Promise.all([
          drive.files.get({ fileId, fields: "name, mimeType", supportsAllDrives: true } as any),
          drive.files.copy({ fileId, requestBody: { name: `${url.replace(/\.[^/.]+$/, '')}-${ratio}${url.match(/\.[^/.]+$/)?.[0] || '.jpg'}`, parents: [driveFolderId] }, fields: "id, webViewLink, webContentLink", supportsAllDrives: true } as any)
        ]);
        if (copied.data.id) {
          return { url: copied.data.webContentLink || url, id: copied.data.id, ratio };
        }
      } catch {
        return { url, id: fileId, ratio };
      }
    });
    
    const results = await Promise.allSettled(copyTasks);
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) {
        selectedUrls.push(r.value.url);
        cropRatios[r.value.id] = r.value.ratio;
      }
    }
    
    await productRef.update({
      status: "Pending Edit",
      selectedAssetUrls: selectedUrls,
      cropRatios: cropRatios,
      selectedDate: now.toISOString(),
      updatedAt: ts(),
    });
    
    createNotif({ title: "Selection Submitted", message: `Assets selected with crop ratios, status set to Pending Edit`, type: "success", actionType: "selection_submitted" });
    
    return { success: true };
  } catch (error: any) {
    console.error("Submit selection error:", error);
    return { success: false, error: error.message };
  }
}

export async function approveProduct(productId: string) {
  try {
    await docRef("products", productId).update({
      status: "Completed",
      updatedAt: ts(),
    });
    createNotif({ title: "Product Approved", message: `Product has been completed and approved`, type: "success", actionType: "product_approved" });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function submitBulkStatusUpdate(productIds: string[], targetStatus: string) {
  try {
    const promises = productIds.map(id => 
      docRef("products", id).update({
        status: targetStatus,
        updatedAt: ts(),
      })
    );
    
    await Promise.all(promises);
    createNotif({ title: "Bulk Status Update", message: `${productIds.length} products updated to ${targetStatus}`, type: "info", actionType: "bulk_status" });
    return { success: true, count: productIds.length };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getUserData(uid: string) {
  try {
    const userDoc = await docRef("users", uid).get();
    if (userDoc.exists) {
      return { success: true, data: userDoc.data() };
    }
    return { success: false, error: "User data not found" };
  } catch (error: any) {
    console.error("Error fetching user data:", error);
    return { success: false, error: error.message };
  }
}

export async function createNotification(data: { userId: string; title: string; message: string; type: string; link?: string }) {
  try {
    await col("notifications").add({
      userId: data.userId,
      title: data.title,
      message: data.message,
      type: data.type || "info",
      link: data.link || "",
      read: false,
      createdAt: ts(),
    });
    return { success: true };
  } catch (error: any) {
    console.error("Error creating notification:", error);
    return { success: false, error: error.message };
  }
}

export async function getProductHistory(productId: string) {
  try {
    const snapshot = await col("audit_logs")
      .where("productId", "==", productId)
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();
    return snapshot.docs.map((d: any) => snapData(d));
  } catch (error: any) {
    console.error("Error fetching product history:", error);
    return [];
  }
}

export async function getDesignerRequests() {
  try {
    const snapshot = await col("designer_requests").orderBy("createdAt", "desc").get();
    return snapshot.docs.map((d: any) => snapData(d));
  } catch (error: any) {
    console.error("Error fetching designer requests:", error);
    return [];
  }
}

export async function updateCategory(id: string, name: string) {
  try {
    await docRef("categories", id).update({ name, updatedAt: ts() });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function bulkUpdateProductStatus(productIds: string[], status: string) {
  try {
    const promises = productIds.map(id => 
      docRef("products", id).update({ status, updatedAt: ts() })
    );
    await Promise.all(promises);
    createNotif({ title: "Bulk Status Update", message: `${productIds.length} products updated to ${status}`, type: "info", actionType: "bulk_status_update" });
    return { success: true, count: productIds.length };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateDesignerRequestStatus(requestId: string, status: string) {
  try {
    await docRef("designer_requests", requestId).update({ status, updatedAt: ts() });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createDesignerRequest(data: { productId: string; productName: string; productThumb: string; type: string; instructions: string; createdBy: string }) {
  try {
    await col("designer_requests").add({
      productId: data.productId,
      productName: data.productName,
      productThumb: data.productThumb,
      type: data.type,
      instructions: data.instructions,
      createdBy: data.createdBy,
      status: "pending",
      createdAt: ts(),
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getProducts() {
  try {
    const snapshot = await col("products").orderBy("createdAt", "desc").get();
    return snapshot.docs.map((d: any) => snapData(d));
  } catch (error: any) {
    console.error("Error fetching products:", error);
    return [];
  }
}

export async function getAllUsers() {
  try {
    const snapshot = await col("users").get();
    return snapshot.docs.map((d: any) => serialize({ uid: d.id, ...d.data() }));
  } catch (error: any) {
    console.error("Error fetching users:", error);
    return [];
  }
}

export async function getNotifications(userId: string) {
  try {
    const snapshot = await col("notifications")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();
    return snapshot.docs.map((d: any) => snapData(d));
  } catch (error: any) {
    console.error("Error fetching notifications:", error);
    return [];
  }
}

export async function markNotificationRead(notificationId: string) {
  try {
    await docRef("notifications", notificationId).update({ read: true });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function bulkMarkNotificationsRead(notificationIds: string[]) {
  try {
    const promises = notificationIds.map(id => 
      docRef("notifications", id).update({ read: true })
    );
    await Promise.all(promises);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getUserRole(uid: string) {
  try {
    const userDoc = await docRef("users", uid).get();
    if (userDoc.exists) {
      const d = userDoc.data();
      return { success: true, role: d?.role, permissions: d?.permissions };
    }
    return { success: false, error: "User not found" };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getProductsByCategory(category: string) {
  try {
    const snapshot = await col("products")
      .where("category", "==", category)
      .orderBy("createdAt", "desc")
      .get();
    return snapshot.docs.map((d: any) => snapData(d));
  } catch (error: any) {
    console.error("Error fetching products by category:", error);
    return [];
  }
}
