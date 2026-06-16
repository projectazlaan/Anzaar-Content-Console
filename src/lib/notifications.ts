import { collection, addDoc, serverTimestamp, query, where, orderBy, onSnapshot, doc, updateDoc, deleteDoc, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type NotificationType = "info" | "success" | "warning" | "error";

export interface AppNotification {
  id: string;
  userId?: string;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
  read: boolean;
  createdAt: Timestamp | null;
  actionType: string;
}

export function createNotification(data: {
  userId?: string;
  title: string;
  message: string;
  type?: NotificationType;
  link?: string;
  actionType?: string;
}) {
  return addDoc(collection(db, "notifications"), {
    userId: data.userId || null,
    title: data.title,
    message: data.message,
    type: data.type || "info",
    link: data.link || null,
    actionType: data.actionType || "general",
    read: false,
    createdAt: serverTimestamp(),
  });
}

export function listenNotifications(userId: string | null | undefined, callback: (notifications: AppNotification[]) => void) {
  if (!userId) return () => {};
  const q = query(
    collection(db, "notifications"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    const list: AppNotification[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as AppNotification);
    });
    callback(list);
  });
}

export function listenAllNotifications(callback: (notifications: AppNotification[]) => void) {
  const q = query(collection(db, "notifications"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    const list: AppNotification[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as AppNotification);
    });
    callback(list);
  });
}

export function markNotificationRead(notifId: string) {
  return updateDoc(doc(db, "notifications", notifId), { read: true });
}

export function markAllNotificationsRead(userId: string) {
  return getDocs(query(collection(db, "notifications"), where("userId", "==", userId), where("read", "==", false)))
    .then((snap) => {
      const updates = snap.docs.map((d) => updateDoc(doc(db, "notifications", d.id), { read: true }));
      return Promise.all(updates);
    });
}

export function clearNotifications(userId: string) {
  return getDocs(query(collection(db, "notifications"), where("userId", "==", userId)))
    .then((snap) => {
      const deletes = snap.docs.map((d) => deleteDoc(doc(db, "notifications", d.id)));
      return Promise.all(deletes);
    });
}
