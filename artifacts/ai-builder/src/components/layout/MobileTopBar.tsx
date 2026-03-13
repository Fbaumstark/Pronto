import { Link } from "wouter";
import { Menu, Code2 } from "lucide-react";

interface MobileTopBarProps {
  onMenuClick: () => void;
  title?: string;
}

export function MobileTopBar({ onMenuClick, title }: MobileTopBarProps) {
  return (
    <div className="md:hidden h-14 bg-card border-b border-border flex items-center px-4 gap-3 shrink-0 z-30">
      <button
        onClick={onMenuClick}
        className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>
      <Link href="/" className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-md">
          <Code2 className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="font-bold text-foreground text-sm">{title || "AI Builder"}</span>
      </Link>
    </div>
  );
}
