import { Link } from "wouter";
import { Menu } from "lucide-react";
import { ProntoLogoMark } from "@/components/ProntoLogo";

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
        <ProntoLogoMark size={28} />
        <span className="font-display font-bold text-foreground text-sm">{title || "Pronto"}</span>
      </Link>
    </div>
  );
}
