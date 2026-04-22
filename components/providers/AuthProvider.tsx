"use client";

import { SessionProvider } from "next-auth/react";
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { LoginModal } from "@/components/auth/LoginModal";

type AuthContextValue = {
  openLoginModal: () => void;
};

const AuthContext = createContext<AuthContextValue>({ openLoginModal: () => {} });

export function useAuthModal() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const openLoginModal = useCallback(() => setIsOpen(true), []);

  return (
    <SessionProvider>
      <AuthContext.Provider value={{ openLoginModal }}>
        {children}
        <LoginModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
      </AuthContext.Provider>
    </SessionProvider>
  );
}
