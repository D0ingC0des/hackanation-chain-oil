import { useState } from "react";
import { ADMIN_SESSION_KEY } from "@/constants/session";

export function useAdminPin() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(ADMIN_SESSION_KEY) === "1");

  function approve() {
    sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
    setAuthed(true);
  }

  return { authed, approve };
}
