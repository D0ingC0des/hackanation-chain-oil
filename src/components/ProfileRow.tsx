interface ProfileRowProps {
  icon: React.ElementType;
  label: string;
  value: string;
}

export function ProfileRow({ icon: Icon, label, value }: ProfileRowProps) {
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
