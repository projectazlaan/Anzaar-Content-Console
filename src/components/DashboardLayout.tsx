"use client";

import React from "react";
import Sidebar from "./Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="layout-root">
      <Sidebar />
      <main className="content-area">
        {children}
      </main>

      <style jsx>{`
        .layout-root {
          display: flex;
          min-height: 100vh;
          background-color: var(--bg-deep);
        }

        .content-area {
          flex: 1;
          margin-left: 300px;
          padding: 2.5rem;
          min-height: 100vh;
          transition: margin var(--transition-base);
        }

        @media (max-width: 1024px) {
          .content-area {
            margin-left: 80px;
          }
        }

        @media (max-width: 768px) {
          .content-area {
            margin-left: 0;
            padding: 1.5rem;
            padding-top: 90px;
            padding-bottom: 80px;
          }
        }

        @media (max-width: 480px) {
          .content-area {
            padding: 1rem;
            padding-top: 85px;
            padding-bottom: 80px;
          }
        }
      `}</style>
    </div>
  );
}
