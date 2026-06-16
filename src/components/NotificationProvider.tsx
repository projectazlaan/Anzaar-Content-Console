"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { AppNotification, listenAllNotifications, markNotificationRead, markAllNotificationsRead, clearNotifications } from "@/lib/notifications";

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  clearAll: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  markRead: async () => {},
  markAllRead: async () => {},
  clearAll: async () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }
    unsubRef.current = listenAllNotifications(setNotifications);
    return () => {
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markRead = useCallback(async (id: string) => {
    await markNotificationRead(id);
  }, []);

  const markAllRead = useCallback(async () => {
    const unread = notifications.filter((n) => !n.read);
    await Promise.all(unread.map((n) => markNotificationRead(n.id)));
  }, [notifications]);

  const clearAll = useCallback(async () => {
    for (const n of notifications) {
      try {
        const { doc, deleteDoc, collection } = await import("firebase/firestore");
        const { db } = await import("@/lib/firebase");
        await deleteDoc(doc(db, "notifications", n.id));
      } catch {}
    }
  }, [notifications]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markRead, markAllRead, clearAll }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
