export default function SelectionFooter({ selectedCount }) {
  if (!selectedCount) return null;

  return (
    <div className="p-3 border-t bg-gray-50 text-xs flex justify-between items-center">
      <span className="text-gray-500 font-medium uppercase tracking-wide">
        Selection
      </span>
      <span className="bg-white border px-2 py-1 font-mono text-gray-700 shadow-sm">
        {selectedCount} items
      </span>
    </div>
  );
}
