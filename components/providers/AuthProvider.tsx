"use client";

import { SessionProvider } from "next-auth/react";
import {
  createContext,
  useEffect,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { LoginModal } from "@/components/auth/LoginModal";

type AuthContextValue = {
  openLoginModal: () => void;
};

const AuthContext = createContext<AuthContextValue>({ openLoginModal: () => {} });

export function useAuthModal() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false} refetchInterval={0}>
      <AuthModalStateProvider>{children}</AuthModalStateProvider>
    </SessionProvider>
  );
}

function AuthModalStateProvider({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const openLoginModal = useCallback(() => setIsOpen(true), []);
  const closeLoginModal = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    if (status !== "unauthenticated") return;
    if (!pathname) return;
    if (pathname.startsWith("/admin") || pathname.startsWith("/api")) return;

    const sessionGateKey = "tatvaops_login_modal_seen_session";
    const cooldownKey = "tatvaops_login_modal_last_seen_at";
    const now = Date.now();
    const lastShown = Number(window.localStorage.getItem(cooldownKey) ?? "0");
    const seenThisSession = window.sessionStorage.getItem(sessionGateKey) === "1";
    const cooldownMs = 6 * 60 * 60 * 1000;

    if (seenThisSession || now - lastShown < cooldownMs) return;

    let shown = false;
    const showOnce = () => {
      if (shown) return;
      shown = true;
      setIsOpen(true);
      window.sessionStorage.setItem(sessionGateKey, "1");
      window.localStorage.setItem(cooldownKey, String(Date.now()));
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("mouseleave", onMouseLeave);
    };

    const delayTimer = window.setTimeout(showOnce, 9000);
    const onScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      const ratio = window.scrollY / scrollable;
      if (ratio >= 0.45) showOnce();
    };
    const onMouseLeave = (event: MouseEvent) => {
      if (event.clientY <= 8) showOnce();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("mouseleave", onMouseLeave);

    return () => {
      window.clearTimeout(delayTimer);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [pathname, status]);

  return (
    <AuthContext.Provider value={{ openLoginModal }}>
      {children}
      <LoginModal isOpen={isOpen} onClose={closeLoginModal} />
    </AuthContext.Provider>
  );
}
