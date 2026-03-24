import { useNavigate, useParams } from "react-router-dom";
import {
  Database,
  Scissors,
  Wand2,
  Receipt,
  BarChart3,
} from "lucide-react";

const TABS = [
  {
    key: "source",
    label: "Source",
    icon: Database,
    desc: "Manage source images",
  },
  {
    key: "room_separator",
    label: "Room Separator",
    icon: Scissors,
    desc: "Cut rooms from plans",
  },
  {
    key: "room_processor",
    label: "Room Processor",
    icon: Wand2,
    desc: "Process cut rooms",
  },
  {
    key: "budget",
    label: "Budget",
    icon: Receipt,
    desc: "View & edit budget",
  },
  {
    key: "summary",
    label: "Summary",
    icon: BarChart3,
    desc: "Project overview",
  },
];

export function ProjectNav({ activeTab, project }) {
  const navigate = useNavigate();
  const { id } = useParams();

  const handleTabChange = (tabKey) => {
    navigate(`/projects/${id}/${tabKey}`);
  };

  return (
    <nav className="flex-1 py-3 px-2.5 space-y-0.5 overflow-y-auto">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/25 px-2 pt-1 pb-2">
        Project Tools
      </p>
      {TABS.map(({ key, label, icon: Icon, desc }) => {
        const isActive = activeTab === key;
        return (
          <button
            key={key}
            onClick={() => handleTabChange(key)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 relative group
                                ${
                                  isActive
                                    ? "bg-sidebar-accent text-sidebar-foreground shadow-sm"
                                    : "text-sidebar-foreground/45 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground/80"
                                }`}
          >
            {isActive && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-0.75 rounded-r-full bg-linear-to-b from-violet-400 to-indigo-500" />
            )}
            <div
              className={`h-8 w-8 shrink-0 rounded-lg flex items-center justify-center transition-all duration-200
                                ${
                                  isActive
                                    ? "bg-linear-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/20"
                                    : "bg-sidebar-foreground/4 border border-sidebar-foreground/7 group-hover:bg-sidebar-foreground/8"
                                }`}
            >
              <Icon
                className={`h-4 w-4 transition-colors ${isActive ? "text-violet-400" : "text-sidebar-foreground/30 group-hover:text-sidebar-foreground/60"}`}
              />
            </div>
            <div>
              <p className="text-sm font-semibold leading-none">{label}</p>
              <p className="text-[10px] text-sidebar-foreground/25 mt-1 leading-none">
                {desc}
              </p>
            </div>
          </button>
        );
      })}
    </nav>
  );
}

export { TABS };
