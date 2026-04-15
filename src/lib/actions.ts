"use server";

import { db } from "./firebase";
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp, 
  getDocs, 
  query, 
  orderBy,
  deleteDoc,
  where
} from "firebase/firestore";
import { uploadFileToDrive } from "./drive";
import { Readable } from "stream";

// --- PRODUCT FLOW ACTIONS ---

export async function createProduct(formData: FormData) {
  const name = formData.get("name") as string;
  const category = formData.get("category") as string;
  const file = formData.get("file") as File;

  if (!name || !file) throw new Error("Missing required fields");

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const stream = Readable.from(buffer);
    
    const driveFile = await uploadFileToDrive(
      stream, 
      `${name}-design`, 
      file.type,
      process.env.GOOGLE_DRIVE_DESIGNS_FOLDER_ID
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

    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error("Error creating product:", error);
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
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function uploadRawAssets(productId: string, formData: FormData) {
  const files = formData.getAll("files") as File[];
  
  try {
    const uploadPromises = files.map(async (file) => {
      const buffer = Buffer.from(await file.arrayBuffer());
      const stream = Readable.from(buffer);
      return uploadFileToDrive(
        stream,
        `${productId}-${file.name}`,
        file.type,
        process.env.GOOGLE_DRIVE_SHOOTS_FOLDER_ID
      );
    });

    const results = await Promise.all(uploadPromises);
    const rawUrls = results.map(r => r.webViewLink);

    const productRef = doc(db, "products", productId);
    await updateDoc(productRef, {
      rawUrls: rawUrls,
      updatedAt: serverTimestamp(),
    });

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
    
    const result = await uploadFileToDrive(
      stream,
      `${productId}-edited`,
      file.type,
      process.env.GOOGLE_DRIVE_EDITS_FOLDER_ID
    );

    const productRef = doc(db, "products", productId);
    await updateDoc(productRef, {
      editedUrl: result.webViewLink,
      status: "Pending Review",
      updatedAt: serverTimestamp(),
    });

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
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- PRESET INSTRUCTION ACTIONS ---

export async function getInstructionPresets() {
  const q = query(collection(db, "instruction_presets"), orderBy("text", "asc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, text: doc.data().text }));
}

export async function addInstructionPreset(text: string) {
  const docRef = await addDoc(collection(db, "instruction_presets"), { text });
  return { id: docRef.id, text };
}

export async function removeInstructionPreset(id: string) {
  await deleteDoc(doc(db, "instruction_presets", id));
  return { success: true };
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
