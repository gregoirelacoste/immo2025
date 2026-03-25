"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export type UserMode = "beginner" | "expert";

interface UserModeContextValue {
  mode: UserMode;
  isBeginner: boolean;
  toggleMode: () => void;
  setMode: (mode: UserMode) => void;
}

const UserModeContext = createContext<UserModeContextValue>({
  mode: "beginner",
  isBeginner: true,
  toggleMode: () => {},
  setMode: () => {},
});

const STORAGE_KEY = "tiili-user-mode";

export function UserModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<UserMode>("beginner");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as UserMode | null;
    if (stored === "beginner" || stored === "expert") {
      setModeState(stored);
    }
    setHydrated(true);
  }, []);

  const setMode = useCallback((newMode: UserMode) => {
    setModeState(newMode);
    localStorage.setItem(STORAGE_KEY, newMode);
  }, []);

  const toggleMode = useCallback(() => {
    setMode(mode === "beginner" ? "expert" : "beginner");
  }, [mode, setMode]);

  // Avoid hydration mismatch — render children only after reading localStorage
  if (!hydrated) return <>{children}</>;

  return (
    <UserModeContext.Provider value={{ mode, isBeginner: mode === "beginner", toggleMode, setMode }}>
      {children}
    </UserModeContext.Provider>
  );
}

export function useUserMode() {
  return useContext(UserModeContext);
}
