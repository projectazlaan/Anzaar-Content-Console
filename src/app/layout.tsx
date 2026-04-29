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
    <html lang="en" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme');
                  if (theme === 'light') {
                    document.documentElement.setAttribute('data-theme', 'light');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        <AuthProvider>
          <div className="main-wrapper">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
