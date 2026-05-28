export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span className="relative inline-flex size-9 items-center justify-center rounded-2xl bg-gradient-primary shadow-soft">
        <svg
          viewBox="0 0 24 24"
          className="size-5 text-primary-foreground"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3c2.5 4 5 6.5 5 10a5 5 0 1 1-10 0c0-3.5 2.5-6 5-10z" />
        </svg>
      </span>
      <span className="text-xl font-extrabold tracking-tight">
        Chain<span className="text-primary">Oil</span>
      </span>
    </div>
  );
}
