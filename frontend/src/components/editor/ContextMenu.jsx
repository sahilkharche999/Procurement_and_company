export default function ContextMenu({
  position,
  onClose,
  onAssign,
  onDelete,
}) {
  return (
    <div
      className="absolute z-50"
      style={{ top: position.y, left: position.x }}
      onMouseLeave={onClose}
    >
      <div className="w-56 border border-slate-300 bg-slate-100 shadow-xl">
        <div className="px-3 py-2 border-b border-slate-300 bg-slate-50">
          <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-slate-600">
            Mask Actions
          </p>
        </div>

        <div className="p-2 space-y-2">
          <button
            type="button"
            className="w-full text-left px-3 py-2 border border-slate-300 bg-white text-slate-800 hover:bg-blue-50 hover:border-blue-300 transition-colors"
            onClick={onAssign}
          >
            Change Group
          </button>
          <button
            type="button"
            className="w-full text-left px-3 py-2 border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors"
            onClick={onDelete}
          >
            Delete Selected
          </button>
        </div>
      </div>
    </div>
  );
}
