import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LogOut, Plus, BarChart2, User } from "lucide-react";
import { Logo } from "./Logo";
import { useWallet } from "@solana/wallet-adapter-react";

const NAV_ITEMS = [
  { to: "/dashboard" as const, label: "Meu impacto", icon: BarChart2 },
  { to: "/profile" as const, label: "Perfil", icon: User },
];

export function TopNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { disconnect } = useWallet();

  async function handleLogout() {
    await disconnect();
    navigate({ to: "/" });
  }

  return (
    <header className="hidden lg:flex sticky top-0 z-40 w-full bg-card/95 backdrop-blur border-b border-border items-center justify-between px-8 h-16 shadow-soft">
      <Logo />

      <nav className="flex items-center gap-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Icon className="size-4" strokeWidth={active ? 2.5 : 2} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-2">
        <Link
          to="/collect"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-primary text-primary-foreground text-sm font-semibold shadow-soft hover:opacity-90 transition"
        >
          <Plus className="size-4" strokeWidth={2.5} />
          Nova coleta
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition"
        >
          <LogOut className="size-4" />
          Sair
        </button>
      </div>
    </header>
  );
}
