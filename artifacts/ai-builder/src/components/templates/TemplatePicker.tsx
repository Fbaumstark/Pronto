import { useState } from "react";
import { Loader2 } from "lucide-react";

interface Template {
  id: number;
  name: string;
  description: string;
  category: string;
  emoji: string;
}

interface TemplatePickerProps {
  templates: Template[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}

const CATEGORIES = ["All", "Marketing", "Personal", "Business", "Productivity", "Content", "E-Commerce"];

export function TemplatePicker({ templates, selectedId, onSelect }: TemplatePickerProps) {
  const [activeCategory, setActiveCategory] = useState("All");

  const filtered = activeCategory === "All"
    ? templates
    : templates.filter((t) => t.category === activeCategory);

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 flex-wrap">
        {CATEGORIES.filter((c) => c === "All" || templates.some((t) => t.category === c)).map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              activeCategory === cat
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
        <button
          onClick={() => onSelect(null)}
          className={`p-3 rounded-xl border-2 text-left transition-all ${
            selectedId === null
              ? "border-primary bg-primary/5"
              : "border-border hover:border-border/80 bg-muted/30"
          }`}
        >
          <div className="text-xl mb-1.5">📄</div>
          <div className="text-xs font-semibold text-foreground">Blank Project</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Start from scratch</div>
        </button>

        {filtered.map((t) => (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            className={`p-3 rounded-xl border-2 text-left transition-all ${
              selectedId === t.id
                ? "border-primary bg-primary/5"
                : "border-border hover:border-border/80 bg-muted/30"
            }`}
          >
            <div className="text-xl mb-1.5">{t.emoji}</div>
            <div className="text-xs font-semibold text-foreground">{t.name}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{t.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
