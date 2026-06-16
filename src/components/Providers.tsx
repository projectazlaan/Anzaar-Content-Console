"use client";

import React from "react";
import { AuthProvider } from "@/lib/AuthContext";
import { NotificationProvider } from "./NotificationProvider";
import ImageViewerProvider from "./ImageViewerProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <NotificationProvider>
        <ImageViewerProvider>
          {children}
        </ImageViewerProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}
