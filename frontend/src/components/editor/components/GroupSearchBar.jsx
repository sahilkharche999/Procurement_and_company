export default function GroupSearchBar({
  searchQuery,
  onSearchChange,
  onClearSearch,
}) {
  return (
    <div className="px-3 pb-2">
      <div className="flex items-center gap-2 border border-gray-200 bg-gray-50 px-2.5 py-1.5 focus-within:border-blue-400 focus-within:bg-white transition-colors">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
          className="w-3.5 h-3.5 text-gray-400 shrink-0"
        >
          <path
            fillRule="evenodd"
            d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z"
            clipRule="evenodd"
          />
        </svg>

        <input
          type="text"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by name or code…"
          className="flex-1 bg-transparent text-xs text-gray-700 placeholder-gray-400 focus:outline-none min-w-0"
        />

        {searchQuery && (
          <button
            onClick={onClearSearch}
            className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            title="Clear search"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="w-3.5 h-3.5"
            >
              <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
