import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useProjects } from "../../redux/hooks/project/useProjects";
import { BudgetTable } from "../../components/budget/BudgetTable";
import { Button } from "../../components/ui/button";
import {
  ArrowLeft,
  Loader2,
  Images,
  FolderOpen,
  Save,
  RefreshCw,
  Receipt,
  BarChart3,
  Pencil,
  Check,
  X,
  Database,
  PenLine,
  Scissors,
  Wand2,
} from "lucide-react";

import { RoomSeparatorTab } from "./RoomSeparatorTab";
import { RoomProcessorTab } from "./RoomProcessorTab";
import { SourceTab } from "./SourceTab";
import { SummaryTab } from "./SummaryTab";
import { BudgetPage } from "../budget/BudgetPage";
import { ProjectNav, TABS } from "../../components/project/ProjectNav";

/* ── Inline project name editor ─────────────────────────────────────────── */
function ProjectNameEditor({ project, onRename }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(project?.name ?? "");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    setValue(project?.name ?? "");
  }, [project?.name]);

  const startEdit = () => {
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 50);
  };
  const cancel = () => {
    setEditing(false);
    setValue(project?.name ?? "");
  };
  const save = async () => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === project?.name) {
      cancel();
      return;
    }
    setSaving(true);
    await onRename(project._id ?? project.id, trimmed);
    setSaving(false);
    setEditing(false);
  };
  const onKey = (e) => {
    if (e.key === "Enter") save();
    if (e.key === "Escape") cancel();
  };

  if (!editing) {
    return (
      <div className="flex items-start gap-2 group/name min-w-0">
        <p
          className="text-sidebar-foreground text-xs font-semibold leading-snug truncate flex-1"
          title={project?.name}
        >
          {project?.name ?? "Loading…"}
        </p>
        {project && (
          <button
            onClick={startEdit}
            title="Rename project"
            className="shrink-0 opacity-0 group-hover/name:opacity-100 transition-opacity h-5 w-5 rounded-md hover:bg-white/10 flex items-center justify-center mt-0.5"
          >
            <Pencil className="h-3 w-3 text-sidebar-foreground/50" />
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 w-full">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKey}
        disabled={saving}
        className="flex-1 min-w-0 text-xs font-semibold bg-white/10 border border-violet-400/40 rounded-md px-2 py-1 text-sidebar-foreground placeholder:text-white/30 focus:outline-none focus:border-violet-400/80"
        placeholder="Project name"
        autoFocus
      />
      <button
        onClick={save}
        disabled={saving}
        className="h-6 w-6 shrink-0 rounded-md bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/30 flex items-center justify-center transition-colors"
      >
        {saving ? (
          <Loader2 className="h-3 w-3 text-violet-300 animate-spin" />
        ) : (
          <Check className="h-3 w-3 text-violet-300" />
        )}
      </button>
      <button
        onClick={cancel}
        className="h-6 w-6 shrink-0 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors"
      >
        <X className="h-3 w-3 text-sidebar-foreground/50" />
      </button>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═════════════════════════════════════════════════════════════════════════════ */
export function ProjectEditorPage() {
  const { id, tab = "source" } = useParams();
  const navigate = useNavigate();
  const {
    currentProject,
    currentProjectLoading,
    error,
    loadOne,
    rename,
    clearCurrentProj,
  } = useProjects();

  // Fetch this specific project from backend on mount (or when id changes)
  useEffect(() => {
    loadOne(id);
    return () => clearCurrentProj();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const project = currentProject;

  // Loading state
  if (currentProjectLoading && !project) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-sm font-medium">Loading project…</span>
      </div>
    );
  }

  // Error / not found state
  if (!currentProjectLoading && !project && error) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background gap-4 text-center px-6">
        <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <X className="h-8 w-8 text-destructive" />
        </div>
        <div>
          <p className="font-semibold mb-1">Project not found</p>
          <p className="text-sm text-muted-foreground max-w-xs">{error}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/projects")}
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back to Projects
        </Button>
      </div>
    );
  }

  const renderTabContent = () => {
    if (!project) {
      return (
        <div className="flex items-center justify-center flex-1 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading project…</span>
        </div>
      );
    }

    switch (tab) {
      case "source":
        return <SourceTab project={project} />;
      case "room_separator":
        return <RoomSeparatorTab project={project} />;
      case "room_processor":
        return <RoomProcessorTab project={project} />;
      case "budget":
        return (
          <div className="flex-1 overflow-y-auto p-6">
            <BudgetPage projectId={project?._id ?? project?.id} />
          </div>
        );
      case "summary":
        return <SummaryTab project={project} />;
      default:
        return <SourceTab project={project} />;
    }
  };

  const activeTabLabel = TABS.find((t) => t.key === tab)?.label || "Source";
  const activeTabIcon = TABS.find((t) => t.key === tab)?.icon || Database;
  const ActiveTabIcon = activeTabIcon;

  return (
    <div className="fixed inset-0 flex bg-background overflow-hidden">
      {/* ── Project sidebar ── */}
      <aside className="w-60 shrink-0 flex flex-col bg-sidebar border-r border-sidebar-border">
        <div className="px-4 pt-5 pb-4 border-b border-sidebar-border">
          <button
            onClick={() => navigate("/projects")}
            className="flex items-center gap-1.5 text-sidebar-foreground/40 hover:text-sidebar-foreground/70 text-xs mb-4 transition-colors group"
          >
            <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
            All Projects
          </button>
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 shrink-0 rounded-lg bg-linear-to-br from-violet-500/25 to-indigo-600/25 border border-violet-500/25 flex items-center justify-center shadow-sm">
              <FolderOpen className="h-4 w-4 text-violet-300" />
            </div>
            <div className="min-w-0 flex-1">
              <ProjectNameEditor project={project} onRename={rename} />
              {project?.pdf_name && (
                <p
                  className="text-sidebar-foreground/30 text-[10px] truncate mt-1"
                  title={project.pdf_name}
                >
                  {project.pdf_name}
                </p>
              )}
            </div>
          </div>
        </div>

        <ProjectNav activeTab={tab} project={project} />

        {project && (
          <div className="px-3 py-3 border-t border-sidebar-border space-y-2">
            {/* Image count */}
            <div className="rounded-xl bg-sidebar-accent border border-sidebar-border px-3 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Images className="h-3.5 w-3.5 text-violet-400/70" />
                <span className="text-[11px] text-sidebar-foreground/40 font-medium">
                  Images
                </span>
              </div>
              <span className="text-sm font-bold text-sidebar-foreground/75">
                {project.image_count}
              </span>
            </div>
            {/* DPI badge if available */}
            {project.detail?.dpi && (
              <div className="rounded-xl bg-sidebar-accent border border-sidebar-border px-3 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="h-3.5 w-3.5 text-indigo-400/70" />
                  <span className="text-[11px] text-sidebar-foreground/40 font-medium">
                    DPI
                  </span>
                </div>
                <span className="text-sm font-bold text-sidebar-foreground/75">
                  {project.detail.dpi}
                </span>
              </div>
            )}
          </div>
        )}
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        <div className="h-14 shrink-0 border-b border-border/50 px-6 flex items-center gap-3 bg-background">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <ActiveTabIcon className="h-4 w-4 text-violet-400" />
            </div>
            <span className="font-semibold text-sm">{activeTabLabel}</span>
            {project && (
              <span className="text-xs text-muted-foreground/50 font-normal">
                — {project.name}
              </span>
            )}
          </div>
          {/* Refresh button */}
          <button
            onClick={() => loadOne(id)}
            disabled={currentProjectLoading}
            className="ml-auto h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted transition-colors disabled:opacity-30"
            title="Refresh project data from server"
          >
            {currentProjectLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}
