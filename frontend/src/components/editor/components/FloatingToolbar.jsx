export default function FloatingToolbar({
  isDrawMode,
  setIsDrawMode,
  isLabelDrawMode,
  setIsLabelDrawMode,
}) {
  return (
    <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 pointer-events-none">
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
            <li>
              Uses selected group from sidebar.
            </li>
            <li>
              If no group is selected, you&apos;ll be asked to choose one.
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
