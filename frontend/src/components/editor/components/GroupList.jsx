import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  getGroupMaskCount,
  getGroupColorStyle,
  highlightMatch,
} from "../utils/groupListUtils.jsx";

export default function GroupList({
  masks,
  filteredGroups,
  allGroups,
  query,
  selectedGroupId,
  onSelectGroup,
  onDeleteGroup,
  onCreateGroup,
}) {
  const groupsById = Object.fromEntries(allGroups.map((group) => [group.id, group]));

  return (
    <ScrollArea className="flex-1">
      <div className="px-3 pb-4 space-y-px">
        {allGroups.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-400">
            No groups yet.{" "}
            <button
              onClick={onCreateGroup}
              className="text-blue-500 underline hover:text-blue-700"
            >
              Create one
            </button>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="py-6 text-center text-xs text-gray-400 space-y-1">
            <p className="font-medium text-gray-500">No results</p>
            <p>No groups match &ldquo;{query}&rdquo;</p>
          </div>
        ) : (
          filteredGroups.map((group) => {
            const count = getGroupMaskCount(masks, group.id);
            const isSelected = selectedGroupId === group.id;
            const colorStyle = getGroupColorStyle(group);

            return (
              <div
                key={group.id}
                onClick={() => onSelectGroup(group.id)}
                className={cn(
                  "group flex items-center justify-between p-2.5 cursor-pointer border-l-[3px] transition-all hover:bg-gray-50",
                  isSelected
                    ? "bg-blue-50/50 border-blue-500"
                    : "border-transparent",
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-3.5 h-3.5 shadow-sm ring-1 ring-black/10 shrink-0"
                    style={colorStyle}
                  />
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                      <span
                        className={cn(
                          "text-sm leading-tight truncate",
                          isSelected
                            ? "font-medium text-gray-900"
                            : "text-gray-600",
                        )}
                      >
                        {highlightMatch(group.name, query)}
                      </span>
                      {group.is_subgroup && (
                        <span className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 shrink-0">
                          Sub Item
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-wrap min-w-0">
                      {group.code && (
                        <span className="text-[10px] font-mono text-gray-400 truncate">
                          {highlightMatch(group.code, query)}
                        </span>
                      )}
                      {group.is_subgroup && group.parent_group && (
                        <span className="text-[9px] text-gray-500 truncate">
                          of {groupsById[group.parent_group]?.code || groupsById[group.parent_group]?.name || "parent"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  
                  <button
                    title={`Delete group "${group.name}"`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onDeleteGroup(group.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
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

                  {group.user_entered_qty !== undefined &&
                    group.user_entered_qty !== null &&
                    String(group.user_entered_qty).trim() !== "" && (
                      <span
                        title="User entered quantity"
                        className={cn(
                          "text-xs font-medium px-1.5 py-0.5 min-w-6 text-center",
                          isSelected
                            ? "text-blue-600 bg-blue-100 border-blue-200"
                            : "text-emerald-700 bg-emerald-50 border-emerald-200",
                        )}
                      >
                        {group.user_entered_qty}
                      </span>
                    )}


                  <span
                    title="System identified quantity"
                    className={cn(
                      "text-xs font-medium px-1.5 py-0.5 min-w-6 text-center",
                      isSelected
                        ? "text-blue-600 bg-blue-100"
                        : "text-gray-400 bg-gray-100 group-hover:bg-gray-200",
                    )}
                  >
                    {count}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </ScrollArea>
  );
}
