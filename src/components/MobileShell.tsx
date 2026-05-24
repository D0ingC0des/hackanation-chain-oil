import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

interface Props {
  children: ReactNode;
  hideNav?: boolean;
  className?: string;
}

export function MobileShell({ children, hideNav, className }: Props) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="mx-auto w-full max-w-md sm:max-w-lg md:max-w-2xl flex-1 flex flex-col relative">
        <main className={`flex-1 ${hideNav ? "" : "pb-24"} ${className ?? ""}`}>
          {children}
        </main>
        {!hideNav && <BottomNav />}
      </div>
    </div>
  );
}
