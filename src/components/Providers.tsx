"use client";

import { SessionProvider } from "next-auth/react";
import { AppProgressBar } from "next-nprogress-bar";
import { UserModeProvider } from "@/contexts/UserModeContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <UserModeProvider>
        {children}
      </UserModeProvider>
      <AppProgressBar
        height="3px"
        color="#4f46e5"
        options={{ showSpinner: false }}
        shallowRouting
      />
    </SessionProvider>
  );
}
