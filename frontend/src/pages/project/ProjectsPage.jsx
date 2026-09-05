import { useState } from "react";
import { FolderOpen, Trash2 } from "lucide-react";
import { ProjectsSection } from "../../components/project/ProjectsSection";
import { DeletedProjectsSection } from "../../components/project/DeletedProjectsSection";

const TABS = [
  { key: "active", label: "Projects", icon: FolderOpen },
  { key: "deleted", label: "Deleted", icon: Trash2 },
];

export function ProjectsPage() {
  const [tab, setTab] = useState("active");

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-3xl font-bold tracking-tight">Projects</h2>

        <div className="flex items-center gap-1 bg-muted/60 rounded-xl p-1">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
                ${
                  tab === key
                    ? "bg-background text-foreground shadow-sm border border-border/40"
                    : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "active" ? <ProjectsSection /> : <DeletedProjectsSection />}
    </div>
  );
}
