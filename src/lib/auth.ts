// Auth is now handled entirely by Solana Wallet Adapter (useWallet).
// This file is kept for Supabase identity linking in future sessions.
// Public key from useWallet().publicKey serves as the user identifier.

export interface AuthSession {
  publicKey: string;
  name: string;
}
