"use server";

import { db } from "./firebase";
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp, 
  getDocs, 
  getDoc,
  setDoc,
  query, 
  orderBy,
  deleteDoc,
  where,
  limit
} from "firebase/firestore";
import { uploadFileToDrive, getDriveImageUrl, getOrCreateFolder } from "./drive";
import { Readable } from "stream";

async function createNotif(data: { title: string; message: string; type?: string; actionType?: string }) {
  try {
    await addDoc(collection(db, "notifications"), {
      title: data.title,
      message: data.message,
      type: data.type || "info",
      actionType: data.actionType || "general",
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.error("Failed to create notification:", e);
  }
}

// --- PRODUCT FLOW ACTIONS ---

export async function createProduct(formData: FormData) {
  const name = formData.get("name") as string;
  const category = formData.get("category") as string;
  const file = formData.get("file") as File;

  if (!name || !file) throw new Error("Missing required fields");

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

    const docRef = await addDoc(collection(db, "products"), {
      name,
      category,
      status: "Pending Direction",
      designUrl: driveFile.webViewLink,
      designId: driveFile.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    createNotif({ title: "New Product Created", message: `${name} has been created and is pending direction`, type: "success", actionType: "product_created" });

    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error("Error creating product:", error);
    return { success: false, error: error.message };
  }
}

export async function createBulkProducts(formData: FormData) {
  const name = formData.get("name") as string;
  const category = formData.get("category") as string;
  const files = formData.getAll("files") as File[];

  try {
    if (!name || files.length === 0) throw new Error("Missing required fields");
    
    const dateStr = new Date().toISOString().split('T')[0];
    const designParentId = await getOrCreateFolder(dateStr, process.env.GOOGLE_DRIVE_DESIGNS_FOLDER_ID as string);

    // Upload all files to Drive in parallel
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
      };
    });

    const uploadedFiles = await Promise.all(uploadPromises);
    
    // Create variations array
    const variations = uploadedFiles.map((file, index) => ({
      ...file,
      label: `Variation ${index + 1}`,
      // Generate displayable thumbnail URL
      thumbnailUrl: file.id ? getDriveImageUrl(file.id) : null,
    }));

    // Create single product document with variations
    const productData: any = {
      name,
      category,
      status: "Pending Direction",
      mainDesignUrl: uploadedFiles[0].url,
      mainDesignId: uploadedFiles[0].id,
      // Add thumbnail URL for display
      thumbnailUrl: uploadedFiles[0].id ? getDriveImageUrl(uploadedFiles[0].id) : null,
      variations,
      variationCount: uploadedFiles.length,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // Keep backward compatibility - also store designUrl for old queries
    if (uploadedFiles.length === 1) {
      productData.designUrl = uploadedFiles[0].url;
      productData.designId = uploadedFiles[0].id;
      productData.thumbnailUrl = uploadedFiles[0].id ? getDriveImageUrl(uploadedFiles[0].id) : null;
    }

    const docRef = await addDoc(collection(db, "products"), productData);
    
    createNotif({ title: "Bulk Products Created", message: `${name} created with ${uploadedFiles.length} variations`, type: "success", actionType: "bulk_created" });
    
    return { success: true, id: docRef.id, variationCount: uploadedFiles.length };
  } catch (error: any) {
    console.error("Error creating bulk products:", error);
    return { success: false, error: error.message };
  }
}

export async function submitDirection(productId: string, shootDir: string, editDir: string) {
  try {
    const productRef = doc(db, "products", productId);
    await updateDoc(productRef, {
      status: "Pending Shoot",
      directions: { shoot: shootDir, edit: editDir },
      updatedAt: serverTimestamp(),
    });
    createNotif({ title: "Direction Submitted", message: `Directions provided, status set to Pending Shoot`, type: "info", actionType: "direction_submitted" });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function markAsShot(productId: string) {
  try {
    const productRef = doc(db, "products", productId);
    await updateDoc(productRef, {
      status: "Pending Selection",
      updatedAt: serverTimestamp(),
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
    // Get product name for folder
    const productSnap = await getDoc(doc(db, "products", productId));
    const productName = productSnap.exists() ? productSnap.data().name : productId;
    
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

    const productRef = doc(db, "products", productId);
    await updateDoc(productRef, {
      rawUrls: rawUrls,
      rawIds: rawIds,
      updatedAt: serverTimestamp(),
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
    
    // Get product name for folder
    const productSnap = await getDoc(doc(db, "products", productId));
    const productName = productSnap.exists() ? productSnap.data().name : productId;
    
    const editParentId = await getOrCreateFolder(productName, process.env.GOOGLE_DRIVE_EDITS_FOLDER_ID as string);

    const result = await uploadFileToDrive(
      stream,
      `${productId}-edited`,
      file.type,
      editParentId
    );

    const productRef = doc(db, "products", productId);
    await updateDoc(productRef, {
      editedUrl: result.webViewLink,
      status: "Pending Review",
      updatedAt: serverTimestamp(),
    });

    createNotif({ title: "Edited Asset Uploaded", message: `Edited file uploaded, status set to Pending Review`, type: "success", actionType: "edit_uploaded" });

    return { success: true, url: result.webViewLink };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function submitForReview(productId: string) {
  try {
    const productRef = doc(db, "products", productId);
    await updateDoc(productRef, {
      status: "Pending Review",
      updatedAt: serverTimestamp(),
    });
    createNotif({ title: "Submitted for Review", message: `Product submitted for review`, type: "info", actionType: "submitted_review" });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteProduct(productId: string) {
  try {
    await deleteDoc(doc(db, "products", productId));
    createNotif({ title: "Product Deleted", message: `Product has been removed`, type: "warning", actionType: "product_deleted" });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- PRESET INSTRUCTION ACTIONS ---

export async function getInstructionPresets() {
  try {
    const snapshot = await getDocs(query(collection(db, "instruction_presets"), orderBy("text", "asc")));
    return snapshot.docs.map(doc => ({ id: doc.id, text: doc.data().text }));
  } catch (error) {
    console.error("Error getting presets:", error);
    return [];
  }
}

export async function addInstructionPreset(text: string) {
  const docRef = await addDoc(collection(db, "instruction_presets"), { text });
  return { id: docRef.id, text };
}

export async function removeInstructionPreset(id: string) {
  await deleteDoc(doc(db, "instruction_presets", id));
  return { success: true };
}

// --- CATEGORY ACTIONS ---

export async function getCategories() {
  try {
    const snapshot = await getDocs(query(collection(db, "categories"), orderBy("name", "asc")));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting categories:", error);
    return [];
  }
}

export async function addCategory(name: string) {
  try {
    const docRef = await addDoc(collection(db, "categories"), { 
      name,
      createdAt: serverTimestamp() 
    });
    return { success: true, id: docRef.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function removeCategory(id: string) {
  try {
    await deleteDoc(doc(db, "categories", id));
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateUserRole(uid: string, role: string, permissions: any) {
  try {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
      role,
      permissions,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteUser(uid: string) {
  try {
    await deleteDoc(doc(db, "users", uid));
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function initializeUserAccount(uid: string, email: string) {
  try {
    // Check if this is the first user
    const usersSnap = await getDocs(query(collection(db, "users"), limit(1)));
    const isFirstUser = usersSnap.empty;

    console.log('Initializing user account:', { uid, email, isFirstUser, existingUsers: !usersSnap.empty });

    const role = isFirstUser ? "admin" : "pending";
    const permissions = isFirstUser ? 
      { view: true, edit: true, delete: true } : 
      { view: true, edit: false, delete: false };

    await setDoc(doc(db, "users", uid), {
      email,
      role,
      permissions,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log('User account initialized:', { uid, role, isFirstUser });

    return { success: true, isFirstUser };
  } catch (error: any) {
    console.error("Error initializing user:", error);
    return { success: false, error: error.message };
  }
}

// Force set user as admin (for emergency fix)
export async function forceSetAsAdmin(uid: string) {
  try {
    console.log('Force setting user as admin:', uid);
    
    await updateDoc(doc(db, "users", uid), {
      role: "admin",
      permissions: { view: true, edit: true, delete: true },
      updatedAt: serverTimestamp(),
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
    const snapshot = await getDocs(query(collection(db, "master_templates"), orderBy("name", "asc")));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting master templates:", error);
    return [];
  }
}

export async function addMasterTemplate(name: string, shoot: string, edit: string) {
  const docRef = await addDoc(collection(db, "master_templates"), { 
    name, 
    shoot, 
    edit,
    createdAt: serverTimestamp() 
  });
  return { id: docRef.id, name, shoot, edit };
}

export async function removeMasterTemplate(id: string) {
  await deleteDoc(doc(db, "master_templates", id));
  return { success: true };
}

export async function submitBulkDirections(productIds: string[], shootDir: string, editDir: string) {
  try {
    const promises = productIds.map(id => {
      const productRef = doc(db, "products", id);
      return updateDoc(productRef, {
        status: "Pending Shoot",
        directions: { shoot: shootDir, edit: editDir },
        updatedAt: serverTimestamp(),
      });
    });
    
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
    const productRef = doc(db, "products", productId);
    const productSnap = await getDoc(productRef);
    
    if (!productSnap.exists()) {
      return { success: false, error: "Product not found" };
    }

    const productData = productSnap.data();
    const productName = productData.name || 'product';
    
    // Get the date in format "Apr 28, 26"
    const now = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dateStr = `${months[now.getMonth()]} ${now.getDate()}, ${String(now.getFullYear()).slice(-2)}`;
    const folderName = `Selected - ${dateStr}`;
    
    // Create or get date-based folder in Google Drive
    const { getOrCreateFolder, getDriveService } = await import("@/lib/drive");
    const driveFolderId = await getOrCreateFolder(folderName);
    
    // Copy files to the new folder with crop ratio in name
    const drive = await getDriveService();
    const selectedUrls: string[] = [];
    const cropRatios: Record<string, string> = {};
    
    for (const [url, ratio] of Object.entries(selectedAssets)) {
      // Extract file ID from URL
      const match = url.match(/[-\w]{25,}/);
      if (!match) continue;
      
      const fileId = match[0];
      
      try {
        // Get original file metadata
        const fileMetadata = await drive.files.get({
          fileId,
          fields: "name, mimeType",
          supportsAllDrives: true,
        } as any);
        
        const originalName = fileMetadata.data.name || 'image';
        const nameWithoutExt = originalName.replace(/\.[^/.]+$/, "");
        const extension = originalName.match(/\.[^/.]+$/)?.[0] || '.jpg';
        
        // New filename with crop ratio
        const newName = `${nameWithoutExt}-${ratio}${extension}`;
        
        // Copy file to new folder with new name
        const copiedFile = await drive.files.copy({
          fileId,
          requestBody: {
            name: newName,
            parents: [driveFolderId],
          },
          fields: "id, webViewLink, webContentLink",
          supportsAllDrives: true,
        } as any);
        
        if (copiedFile.data.id) {
          selectedUrls.push(copiedFile.data.webContentLink || url);
          cropRatios[copiedFile.data.id] = ratio;
        }
      } catch (error) {
        console.error(`Failed to copy file ${fileId}:`, error);
        // Fallback: keep original URL
        selectedUrls.push(url);
        cropRatios[fileId] = ratio;
      }
    }
    
    // Update Firestore with selected assets and crop ratios
    await updateDoc(productRef, {
      status: "Pending Edit",
      selectedAssetUrls: selectedUrls,
      cropRatios: cropRatios,
      selectedDate: now.toISOString(),
      updatedAt: serverTimestamp(),
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
    const productRef = doc(db, "products", productId);
    await updateDoc(productRef, {
      status: "Completed",
      updatedAt: serverTimestamp(),
    });
    createNotif({ title: "Product Approved", message: `Product has been completed and approved`, type: "success", actionType: "product_approved" });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function submitBulkStatusUpdate(productIds: string[], targetStatus: string) {
  try {
    const promises = productIds.map(id => {
      const productRef = doc(db, "products", id);
      return updateDoc(productRef, {
        status: targetStatus,
        updatedAt: serverTimestamp(),
      });
    });
    
    await Promise.all(promises);
    createNotif({ title: "Bulk Status Update", message: `${productIds.length} products updated to ${targetStatus}`, type: "info", actionType: "bulk_status" });
    return { success: true, count: productIds.length };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getUserData(uid: string) {
  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    if (userDoc.exists()) {
      return { success: true, data: userDoc.data() };
    }
    return { success: false, error: "User data not found" };
  } catch (error: any) {
    console.error("Error fetching user data:", error);
    return { success: false, error: error.message };
  }
}
