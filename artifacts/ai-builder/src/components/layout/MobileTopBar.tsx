import { Link } from "wouter";
import { Menu } from "lucide-react";
import { ProntoLogoMark, ProntoTagline } from "@/components/ProntoLogo";

interface MobileTopBarProps {
  onMenuClick: () => void;
  title?: string;
}

export function MobileTopBar({ onMenuClick }: MobileTopBarProps) {
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
        <div>
          <span className="font-display font-bold text-foreground text-sm leading-none block">Pronto</span>
          <ProntoTagline />
        </div>
      </Link>
    </div>
  );
}
