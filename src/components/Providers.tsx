"use client";

import React from "react";
import { AuthProvider } from "@/lib/AuthContext";
import { NotificationProvider } from "./NotificationProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <NotificationProvider>
        {children}
      </NotificationProvider>
    </AuthProvider>
  );
}
