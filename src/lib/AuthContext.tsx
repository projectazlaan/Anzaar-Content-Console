"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

interface AuthUser {
  uid: string;
  email: string | null;
  role: string;
  permissions: {
    view: boolean;
    edit: boolean;
    delete: boolean;
  };
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

// Cache user data to avoid unnecessary re-renders
let userCache: AuthUser | null = null;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(userCache);
  const [loading, setLoading] = useState(!userCache);
  const snapshotRef = useRef<any>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Use getDoc for faster initial load instead of onSnapshot
        try {
          const docSnap = await getDoc(doc(db, "users", firebaseUser.uid));
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            const userData: AuthUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              role: data.role || "pending",
              permissions: data.permissions || { view: true, edit: false, delete: false },
            };
            
            // Cache the user data
            userCache = userData;
            setUser(userData);
            
            // Set up real-time listener after initial load for live updates
            if (!snapshotRef.current) {
              snapshotRef.current = onSnapshot(doc(db, "users", firebaseUser.uid), (snap) => {
                if (snap.exists()) {
                  const updatedData = snap.data();
                  userCache = {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    role: updatedData.role || "pending",
                    permissions: updatedData.permissions || { view: true, edit: false, delete: false },
                  };
                  setUser(userCache);
                }
              });
            }
          } else {
            userCache = null;
            setUser(null);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          userCache = null;
          setUser(null);
        }
      } else {
        userCache = null;
        setUser(null);
        // Cleanup snapshot listener
        if (snapshotRef.current) {
          snapshotRef.current();
          snapshotRef.current = null;
        }
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (snapshotRef.current) {
        snapshotRef.current();
        snapshotRef.current = null;
      }
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
