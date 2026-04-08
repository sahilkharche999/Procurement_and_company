import { useState } from "react";
import { useParams } from "react-router-dom";
import { BudgetTable } from "../../components/budget/BudgetTable";
import {
  Receipt,
  Wand2,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { api } from "../../redux/api/apiClient";

export function BudgetPage({ projectId: propProjectId }) {
  //Support both: passed as prop (ProjectEditorPage) OR read from URL param (/projects/:id)
  const params = useParams();
  const projectId = propProjectId || params.id;
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState(null); // {message, created, updated}
  const [genError, setGenError] = useState(null);
  //We'll use a refresh key to force BudgetTable to re-fetch after generation
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreateBudget = async () => {
    if (!projectId) return;
    setGenerating(true);
    setGenResult(null);
    setGenError(null);
    try {
      const res = await api.post(`/budget/create_budget/${projectId}`);
      setGenResult(res.data);
      // Trigger a refetch on BudgetTable
      setRefreshKey((k) => k + 1);
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        "Budget generation failed.";
      setGenError(msg);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex flex-col space-y-6 p-6 lg:p-8 max-w-400 mx-auto min-h-screen overflow-y-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Receipt className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Budget</h1>
            <p className="text-sm text-muted-foreground">
              Manage procurement budget items
            </p>
          </div>
        </div>

        {/* Create Budget Button */}
        {projectId && (
          <Button
            onClick={handleCreateBudget}
            disabled={generating}
            className="gap-2 bg-violet-600 hover:bg-violet-700 text-white shadow-md"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating Budget…
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4" />
                Create Budget
              </>
            )}
          </Button>
        )}
      </div>

      {/* Generation result / error banner */}
      {genResult && (
        <div className="flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm">
          <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-emerald-700 dark:text-emerald-400">
              {genResult.message}
            </p>
            <p className="text-emerald-600/80 dark:text-emerald-500/80 text-xs mt-0.5">
              {genResult.created} new items created · {genResult.updated} items
              updated · {genResult.rooms_processed} rooms processed
            </p>
          </div>
        </div>
      )}

      {genError && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm">
          <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <p className="text-destructive">{genError}</p>
        </div>
      )}

      {/* Budget Table */}
      <BudgetTable projectId={projectId} refreshKey={refreshKey} />
    </div>
  );
}
