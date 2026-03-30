import { cn } from "@/lib/utils";

export default function SidebarHeader({
  editorMode,
  setEditorMode,
  onPersist,
  roomIncludedInBudget,
  roomIncludeLoading,
  onToggleRoomIncludedInBudget,
}) {
  return (
    <div className="p-4 border-b">
      <div className="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
        <span>Editor Mode</span>
        <button
          onClick={onPersist}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 border border-emerald-200 rounded shadow-sm transition-colors text-[11px] font-bold tracking-wide uppercase"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="w-3.5 h-3.5"
          >
            <path d="M2.5 3A1.5 1.5 0 0 1 4 1.5h8A1.5 1.5 0 0 1 13.5 3v10a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 13V3Zm10-1.5H4a.5.5 0 0 0-.5.5v10a.5.5 0 0 0 .5.5h8a.5.5 0 0 0 .5-.5V3a.5.5 0 0 0-.5-.5ZM7 8.25a.75.75 0 0 1 .75-.75h2a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1-.75-.75Zm0 2.5a.75.75 0 0 1 .75-.75h2a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1-.75-.75ZM4.75 8A.75.75 0 0 1 5.5 7.25h.5a.75.75 0 0 1 0 1.5h-.5A.75.75 0 0 1 4.75 8Zm0 2.5a.75.75 0 0 1 .75-.75h.5a.75.75 0 0 1 0 1.5h-.5a.75.75 0 0 1-.75-.75Z" />
          </svg>
          Persist
        </button>
      </div>

      <div className="flex bg-gray-100 p-1 border border-gray-200">
        <button
          onClick={() => setEditorMode("all")}
          className={cn(
            "flex-1 py-1.5 text-sm font-medium transition-all text-center",
            editorMode === "all"
              ? "bg-white text-black shadow-sm ring-1 ring-black/5"
              : "text-gray-500 hover:text-gray-700",
          )}
        >
          Show All
        </button>
        <button
          onClick={() => setEditorMode("group")}
          className={cn(
            "flex-1 py-1.5 text-sm font-medium transition-all text-center",
            editorMode === "group"
              ? "bg-white text-black shadow-sm ring-1 ring-black/5"
              : "text-gray-500 hover:text-gray-700",
          )}
        >
          Group Mode
        </button>
      </div>

      <div className="mt-3 px-2.5 py-2 border border-gray-200 bg-gray-50 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-gray-700 uppercase tracking-wide">
            Include in Budget
          </p>
          <p className="text-[10px] text-gray-500 truncate">
            Toggle room budget visibility
          </p>
        </div>

        <button
          type="button"
          disabled={roomIncludeLoading}
          onClick={() => onToggleRoomIncludedInBudget(!roomIncludedInBudget)}
          className={cn(
            "relative inline-flex h-6 w-11 items-center border transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
            roomIncludedInBudget
              ? "bg-emerald-500 border-emerald-600"
              : "bg-gray-300 border-gray-400",
          )}
          title={
            roomIncludedInBudget
              ? "Room included in budget"
              : "Room excluded from budget"
          }
        >
          <span
            className={cn(
              "inline-block h-4 w-4 bg-white transition-transform",
              roomIncludedInBudget ? "translate-x-6" : "translate-x-1",
            )}
          />
        </button>
      </div>
    </div>
  );
}
