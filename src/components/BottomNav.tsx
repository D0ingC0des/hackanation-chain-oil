import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Plus, Trophy } from "lucide-react";

const items = [
  { to: "/collect" as const, label: "Coleta", icon: Home },
  { to: "/collect" as const, label: "Nova", icon: Plus, primary: true },
  { to: "/dashboard" as const, label: "Impacto", icon: Trophy },
];

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="lg:hidden fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md sm:max-w-lg md:max-w-2xl z-40 safe-bottom px-4 pt-2">
      <div className="bg-card/95 backdrop-blur border border-border rounded-3xl shadow-elevated flex items-center justify-around px-2 py-2">
        {items.map((item, i) => {
          const Icon = item.icon;
          const active = pathname === item.to && !item.primary;
          if (item.primary) {
            return (
              <Link
                key={i}
                to={item.to}
                className="-mt-8 size-16 rounded-full bg-gradient-primary text-primary-foreground shadow-elevated flex items-center justify-center active:scale-95 transition"
                aria-label="Nova coleta"
              >
                <Icon className="size-7" strokeWidth={2.5} />
              </Link>
            );
          }
          return (
            <Link
              key={i}
              to={item.to}
              className={`flex flex-col items-center gap-1 px-6 py-2 rounded-2xl min-w-16 ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="size-5" strokeWidth={active ? 2.5 : 2} />
              <span className="text-[11px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
