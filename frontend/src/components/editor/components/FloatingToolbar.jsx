export default function FloatingToolbar({
  isDrawMode,
  setIsDrawMode,
  isLabelDrawMode,
  setIsLabelDrawMode,
  isSetScaleMode,
  setIsSetScaleMode,
  isMeasureMode,
  setIsMeasureMode,
  roomScaleFactor,
  onCreateSubItem,
  canCreateSubItem,
}) {
  return (
    <div>
    <div className=" mt-4 ml-4 top-8 left-4 z-10 flex flex-row gap-2 pointer-events-none">
      <button
        onClick={() => {
          const next = !isDrawMode;
          setIsDrawMode(next);
          if (next) setIsLabelDrawMode(false);
        }}
        className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded shadow-sm border pointer-events-auto transition-colors ${
          isDrawMode
            ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
            : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
        {isDrawMode ? "Cancel Mask Drawing" : "Draw Custom Mask"}
      </button>

      <button
        onClick={() => {
          const next = !isLabelDrawMode;
          setIsLabelDrawMode(next);
          if (next) {
            setIsDrawMode(false);
          }
        }}
        className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded shadow-sm border pointer-events-auto transition-colors ${
          isLabelDrawMode
            ? "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100"
            : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3H8l-4 4V7z" />
        </svg>
        {isLabelDrawMode ? "Cancel Label Drawing" : "Draw Label"}
      </button>

      <button
        onClick={onCreateSubItem}
        disabled={!canCreateSubItem}
        className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded shadow-sm border pointer-events-auto transition-colors ${
          canCreateSubItem
            ? "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
            : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
        }`}
        title={
          canCreateSubItem
            ? "Create subgroup for selected group"
            : "Select a group first to create subitem"
        }
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M8 6h13" />
          <path d="M8 12h13" />
          <path d="M8 18h13" />
          <path d="M3 12h1" />
          <path d="M3 6h1" />
          <path d="M3 18h1" />
        </svg>
        Create SubItem
      </button>

      <button
        onClick={() => {
          const next = !isSetScaleMode;
          setIsSetScaleMode(next);
          if (next) {
            setIsDrawMode(false);
            setIsLabelDrawMode(false);
            setIsMeasureMode(false);
          }
        }}
        className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded shadow-sm border pointer-events-auto transition-colors ${
          isSetScaleMode
            ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
            : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 6h18" />
          <path d="M7 6v3" />
          <path d="M11 6v3" />
          <path d="M15 6v3" />
          <path d="M19 6v3" />
          <path d="M3 18h18" />
        </svg>
        {isSetScaleMode ? "Cancel Set Scale" : "Set Scale"}
      </button>

      <button
        onClick={() => {
          const next = !isMeasureMode;
          setIsMeasureMode(next);
          if (next) {
            setIsDrawMode(false);
            setIsLabelDrawMode(false);
            setIsSetScaleMode(false);
          }
        }}
        className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded shadow-sm border pointer-events-auto transition-colors ${
          isMeasureMode
            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
            : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 12h18" />
          <path d="M7 8v8" />
          <path d="M17 8v8" />
        </svg>
        {isMeasureMode ? "Cancel Measure" : "Measure"}
      </button>
  {roomScaleFactor ? (
        <div className="text-[11px] text-gray-700 bg-white/95 p-2 rounded shadow-sm border border-gray-200 pointer-events-auto">
          Scale: 1 px = {roomScaleFactor.toFixed(4)} ft
        </div>
      ) : null}

    </div>
        

      {isDrawMode && (
        <div className="text-xs text-gray-600 bg-white/95 p-2.5 rounded shadow-sm border border-gray-200 pointer-events-auto">
          <p className="font-medium text-gray-800 mb-1">Drawing Actions:</p>
          <ul className="list-disc leading-snug space-y-0.5 ml-4">
            <li>
              <strong>Left Click</strong> to add a straight corner.
            </li>
            <li>
              <strong>Right Click</strong> to add a smooth curve point.
            </li>
            <li>
              Press <strong>Enter</strong> to finish mask.
            </li>
            <li>
              Press <strong>Esc</strong> to cancel.
            </li>
          </ul>
        </div>
      )}

      {isLabelDrawMode && (
        <div className="text-xs text-gray-600 bg-white/95 p-2.5 rounded shadow-sm border border-violet-200 pointer-events-auto">
          <p className="font-medium text-gray-800 mb-1">Label Drawing:</p>
          <ul className="list-disc leading-snug space-y-0.5 ml-4">
            <li>
              <strong>Click</strong> anywhere to place a label.
            </li>
            <li>Uses selected group from sidebar.</li>
            <li>
              If no group is selected, you&apos;ll be asked to choose one.
            </li>
          </ul>
        </div>
      )}

      {isSetScaleMode && (
        <div className="text-xs text-gray-600 bg-white/95 p-2.5 rounded shadow-sm border border-amber-200 pointer-events-auto">
          <p className="font-medium text-gray-800 mb-1">Set Scale:</p>
          <ul className="list-disc leading-snug space-y-0.5 ml-4">
            <li>
              <strong>Click</strong> start and end points for reference line.
            </li>
            <li>
              Press <strong>Enter</strong> to confirm the line.
            </li>
            <li>Enter actual feet value in dialog.</li>
          </ul>
        </div>
      )}

      {isMeasureMode && (
        <div className="text-xs text-gray-600 bg-white/95 p-2.5 rounded shadow-sm border border-emerald-200 pointer-events-auto">
          <p className="font-medium text-gray-800 mb-1">Measure:</p>
          <ul className="list-disc leading-snug space-y-0.5 ml-4">
            <li>
              <strong>Click</strong> start and end points for measured line.
            </li>
            <li>
              Press <strong>Enter</strong> to calculate size.
            </li>
            <li>Assign measured size to a group.</li>
          </ul>
        </div>
      )}
    </div>
  );
}
