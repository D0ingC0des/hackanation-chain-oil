import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { isAuthenticated } from "@/lib/auth";

export function useAuthGuard() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate({ to: "/", replace: true });
    }
  }, [navigate]);
}
