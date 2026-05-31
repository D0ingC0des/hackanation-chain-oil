import { useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useWallet } from "@solana/wallet-adapter-react";

export function useAuthGuard() {
  const navigate = useNavigate();
  const { connected, connecting } = useWallet();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!connecting && !connected && pathname !== "/") {
      navigate({ to: "/", replace: true });
    }
  }, [connected, connecting, navigate, pathname]);
}
