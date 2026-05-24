const MOCK_PHONE = "(44) 98888-7777";
const MOCK_PHONE_RAW = "44988887777";
const MOCK_PIN = "1234";
const AUTH_KEY = "chainoil_auth";

export interface AuthSession {
  phone: string;
  name: string;
  level: string;
}

export function login(phoneRaw: string, pin: string): AuthSession | null {
  if (phoneRaw === MOCK_PHONE_RAW && pin === MOCK_PIN) {
    const session: AuthSession = {
      phone: MOCK_PHONE,
      name: "Parceiro ChainOil",
      level: "Prata",
    };
    localStorage.setItem(AUTH_KEY, JSON.stringify(session));
    return session;
  }
  return null;
}

export function logout() {
  localStorage.removeItem(AUTH_KEY);
}

export function getSession(): AuthSession | null {
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    logout();
    return null;
  }
}

export function isAuthenticated(): boolean {
  return getSession() !== null;
}
