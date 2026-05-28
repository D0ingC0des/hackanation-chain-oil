import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  Copy,
  CheckCheck,
  Wallet,
  User,
  Mail,
  Phone,
  Building2,
  MapPin,
  Hash,
  Loader2,
  Globe,
  ArrowLeft,
} from "lucide-react";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { getProfile, type WalletProfile } from "@/services/profileService";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
  head: () => ({
    meta: [{ title: "Perfil — ChainOil" }],
  }),
});

function truncate(key: string) {
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

function ProfilePage() {
  useAuthGuard();

  const router = useRouter();
  const { publicKey, wallet } = useWallet();
  const { connection } = useConnection();

  const [mounted, setMounted] = useState(false);
  const [profile, setProfile] = useState<WalletProfile | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!publicKey) return;
    getProfile(publicKey.toBase58())
      .then(setProfile)
      .finally(() => setLoadingProfile(false));
  }, [publicKey]);

  useEffect(() => {
    if (!publicKey) return;
    connection
      .getBalance(publicKey)
      .then((lamports) => setBalance(lamports / LAMPORTS_PER_SOL))
      .finally(() => setLoadingBalance(false));
  }, [connection, publicKey]);

  function handleCopy() {
    if (!publicKey) return;
    navigator.clipboard.writeText(publicKey.toBase58());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const address = publicKey?.toBase58() ?? "";

  return (
    <div className="min-h-screen bg-background pb-28 lg:pb-8">
      <div className="max-w-2xl mx-auto px-4 pt-6 lg:pt-10 space-y-4">
        <button
          type="button"
          onClick={() => router.history.back()}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition -ml-1 mb-2"
        >
          <ArrowLeft className="size-4" />
          Voltar
        </button>

        {/* Carteira */}
        <section className="rounded-3xl bg-card border border-border p-5 space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <Wallet className="size-3.5" />
            Carteira Solana
          </div>

          <div className="flex items-center gap-4">
            {mounted && wallet?.adapter.icon ? (
              <img
                src={wallet.adapter.icon}
                alt={wallet.adapter.name}
                className="size-12 rounded-2xl"
              />
            ) : (
              <div className="size-12 rounded-2xl bg-secondary flex items-center justify-center">
                <Wallet className="size-6 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold">
                {mounted ? (wallet?.adapter.name ?? "Carteira") : "Carteira"}
              </p>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition mt-0.5"
              >
                <span className="font-mono">{truncate(address)}</span>
                {copied ? (
                  <CheckCheck className="size-3 text-primary" />
                ) : (
                  <Copy className="size-3" />
                )}
              </button>
            </div>
            <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-primary/10 text-primary shrink-0">
              Devnet
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-secondary/60 p-3">
              <p className="text-xs text-muted-foreground mb-1">Saldo SOL</p>
              {loadingBalance ? (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              ) : (
                <p className="text-lg font-bold">
                  {balance !== null ? balance.toFixed(4) : "—"}
                  <span className="text-xs font-normal text-muted-foreground ml-1">SOL</span>
                </p>
              )}
            </div>
            <div className="rounded-2xl bg-secondary/60 p-3">
              <p className="text-xs text-muted-foreground mb-1">Rede</p>
              <div className="flex items-center gap-1.5">
                <Globe className="size-4 text-primary" />
                <p className="text-sm font-semibold">Solana</p>
              </div>
              <p className="text-xs text-muted-foreground">Devnet</p>
            </div>
          </div>

          <div className="rounded-2xl bg-secondary/30 px-4 py-2.5">
            <p className="text-[10px] text-muted-foreground mb-0.5">Endereço completo</p>
            <p className="font-mono text-xs break-all select-all">{address}</p>
          </div>
        </section>

        {/* Perfil */}
        <section className="rounded-3xl bg-card border border-border p-5 space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <User className="size-3.5" />
            Dados do perfil
          </div>

          {loadingProfile ? (
            <div className="flex justify-center py-6">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : profile ? (
            <div className="space-y-3">
              <ProfileRow icon={User} label="Nome" value={profile.name} />
              <ProfileRow icon={Mail} label="E-mail" value={profile.email} />
              <ProfileRow icon={Phone} label="Celular" value={profile.phone} />
              <ProfileRow icon={Building2} label="Estabelecimento" value={profile.business_name} />
              {profile.cnpj && <ProfileRow icon={Hash} label="CNPJ" value={profile.cnpj} />}
              <ProfileRow
                icon={MapPin}
                label="Localização"
                value={[profile.street, profile.neighborhood, profile.city, profile.state]
                  .filter(Boolean)
                  .join(", ")}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Perfil não encontrado.</p>
          )}
        </section>
      </div>
    </div>
  );
}

function ProfileRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="size-8 rounded-xl bg-secondary flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="size-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-sm font-medium break-words">{value}</p>
      </div>
    </div>
  );
}
