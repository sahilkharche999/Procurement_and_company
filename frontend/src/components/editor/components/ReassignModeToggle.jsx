import { cn } from "@/lib/utils";

export default function ReassignModeToggle({
  editorMode,
  changeGroupMode,
  setChangeGroupMode,
}) {
  if (editorMode !== "group") return null;

  return (
    <div className="px-3 pb-2 pt-1">
      <button
        onClick={() => setChangeGroupMode((value) => !value)}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2 text-xs font-medium border transition-all",
          changeGroupMode
            ? "bg-orange-50 border-orange-300 text-orange-700 shadow-sm"
            : "bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700",
        )}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
          className={cn(
            "w-3.5 h-3.5 shrink-0",
            changeGroupMode ? "text-orange-500" : "text-gray-400",
          )}
        >
          <path d="M3 3.732a1.5 1.5 0 0 1 2.305-1.265l6.706 4.267a1.5 1.5 0 0 1 0 2.531l-6.706 4.268A1.5 1.5 0 0 1 3 12.267V3.732Z" />
        </svg>
        <span>Reassign Mode</span>
        <span
          className={cn(
            "ml-auto text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5",
            changeGroupMode
              ? "bg-orange-200 text-orange-700"
              : "bg-gray-200 text-gray-500",
          )}
        >
          {changeGroupMode ? "ON" : "OFF"}
        </span>
      </button>

      {changeGroupMode && (
        <div className="mt-1.5 px-2 py-1.5 bg-orange-50 border border-orange-100 text-[10px] text-orange-600 space-y-0.5">
          <p>
            <kbd className="font-mono font-bold">Click</kbd> — select mask
          </p>
          <p>
            <kbd className="font-mono font-bold">Shift+Click</kbd> —
            multi-select / deselect
          </p>
          <p>
            <kbd className="font-mono font-bold">Ctrl+Click</kbd> — open
            group picker
          </p>
        </div>
      )}
    </div>
  );
}
