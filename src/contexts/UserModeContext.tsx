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

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "beginner" || stored === "expert") {
      setModeState(stored);
    }
  }, []);

  const setMode = useCallback((newMode: UserMode) => {
    setModeState(newMode);
    localStorage.setItem(STORAGE_KEY, newMode);
  }, []);

  const toggleMode = useCallback(() => {
    setMode(mode === "beginner" ? "expert" : "beginner");
  }, [mode, setMode]);

  const value = { mode, isBeginner: mode === "beginner", toggleMode, setMode };

  return (
    <UserModeContext.Provider value={value}>
      {children}
    </UserModeContext.Provider>
  );
}

export function useUserMode() {
  return useContext(UserModeContext);
}
