import { Loader2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Tone = "water" | "primary" | "reward";

const TONE_CLASS: Record<Tone, string> = {
  water: "bg-water/15 text-water",
  primary: "bg-primary/10 text-primary",
  reward: "bg-reward/25 text-reward-foreground",
};

interface MetricCardProps {
  icon: LucideIcon;
  value: string;
  label: string;
  tone: Tone;
  loading: boolean;
}

export function MetricCard({ icon: Icon, value, label, tone, loading }: MetricCardProps) {
  return (
    <div className="rounded-3xl bg-card border border-border p-4 shadow-soft">
      <div className={`size-10 rounded-2xl flex items-center justify-center ${TONE_CLASS[tone]}`}>
        <Icon className="size-5" />
      </div>
      <div className="mt-3 min-h-[28px] flex items-center">
        {loading ? (
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        ) : (
          <span className="text-xl font-extrabold tracking-tight">{value}</span>
        )}
      </div>
      <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">{label}</div>
    </div>
  );
}
