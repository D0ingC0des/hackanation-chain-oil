import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { TopNav } from "./TopNav";

interface Props {
  children: ReactNode;
  hideNav?: boolean;
  className?: string;
  transparentBg?: boolean;
}

export function MobileShell({ children, hideNav, className, transparentBg }: Props) {
  return (
    <div className={`min-h-screen flex flex-col ${transparentBg ? "bg-transparent" : "bg-background"}`}>
      {!hideNav && <TopNav />}
      <div className="mx-auto w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-6xl flex-1 flex flex-col relative">
        <main className={`flex-1 ${!hideNav ? "pb-24 lg:pb-10" : ""} ${className ?? ""}`}>
          {children}
        </main>
        {!hideNav && <BottomNav />}
      </div>
    </div>
  );
}
