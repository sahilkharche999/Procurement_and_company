export default function GroupSectionHeader({
  query,
  filteredCount,
  totalCount,
  onDeleteEmptyGroups,
  onCreateGroup,
}) {
  return (
    <div className="px-4 pt-4 pb-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Groups
        </h2>
        <span className="text-xs bg-gray-100 px-1.5 py-0.5 text-gray-600 border border-gray-200">
          {query ? `${filteredCount} / ${totalCount}` : totalCount}
        </span>
      </div>

      <div className="flex gap-1">
        <button
          onClick={onDeleteEmptyGroups}
          title="Delete all empty groups"
          className="flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 px-2 py-1 border border-gray-200 hover:border-red-200 transition-all"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="w-3.5 h-3.5"
          >
            <path
              fillRule="evenodd"
              d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.711Z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        <button
          onClick={onCreateGroup}
          title="Create a new group"
          className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 border border-blue-200 hover:border-blue-400 transition-all"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="w-3.5 h-3.5"
          >
            <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
          </svg>
          New Group
        </button>
      </div>
    </div>
  );
}
