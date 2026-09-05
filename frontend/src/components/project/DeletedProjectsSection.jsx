import { useEffect, useState } from "react";
import { useProjects } from "../../redux/hooks/project/useProjects";
import { Button } from "../ui/button";
import { Trash2, Undo2, Loader2, CalendarDays, Images } from "lucide-react";

const getId = (p) => p?._id ?? p?.id;

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * The recycle bin. Deleting a project only marks it, so everything listed here
 * is intact and one click from being back in the working list.
 */
export function DeletedProjectsSection() {
  const { deletedProjects, deletedLoading, loadDeleted, restore } = useProjects();
  const [restoringId, setRestoringId] = useState(null);

  useEffect(() => {
    loadDeleted();
  }, [loadDeleted]);

  const handleRestore = async (project) => {
    const id = getId(project);
    setRestoringId(id);
    await restore(id);
    setRestoringId(null);
  };

  if (deletedLoading && deletedProjects.length === 0) {
    return (
      <div className="flex items-center justify-center gap-2 py-14 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading deleted projects…
      </div>
    );
  }

  if (deletedProjects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/20 py-16 text-center">
        <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <Trash2 className="h-7 w-7 text-muted-foreground/30" />
        </div>
        <p className="text-sm font-semibold">Nothing deleted</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
          Deleted projects are kept here so you can bring them back. Nothing is
          erased.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        These projects are hidden from the list but fully intact — drawings,
        rooms and budget items are all still stored.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {deletedProjects.map((project) => {
          const id = getId(project);
          const pageCount =
            project.selected_diagram_metadata?.total ??
            project.selected_diagram_metadata?.images?.length ??
            0;
          return (
            <div
              key={id}
              className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className="text-sm font-semibold truncate"
                    title={project.name}
                  >
                    {project.name}
                  </p>
                  {project.description && (
                    <p
                      className="text-xs text-muted-foreground truncate mt-0.5"
                      title={project.description}
                    >
                      {project.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Deleted {formatDate(project.deleted_at)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Images className="h-3.5 w-3.5" />
                  {pageCount} {pageCount === 1 ? "drawing" : "drawings"}
                </span>
              </div>

              <Button
                size="sm"
                variant="outline"
                className="w-full gap-1.5 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
                disabled={restoringId === id}
                onClick={() => handleRestore(project)}
              >
                {restoringId === id ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Restoring…
                  </>
                ) : (
                  <>
                    <Undo2 className="h-3.5 w-3.5" />
                    Restore project
                  </>
                )}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
