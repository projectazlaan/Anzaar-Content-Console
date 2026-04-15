import type { Metadata } from "next";
import "@/styles/globals.css";
import { AuthProvider } from "@/lib/AuthContext";

export const metadata: Metadata = {
  title: "Anzaar Content Consol | Production Flow",
  description: "Enterprise content production pipeline management",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <div className="main-wrapper">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
