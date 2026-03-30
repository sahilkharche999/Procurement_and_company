import { useMemo, useState } from "react";
import SelectedGroupCard from "./SelectedGroupCard";
import SidebarHeader from "./components/SidebarHeader";
import ReassignModeToggle from "./components/ReassignModeToggle";
import GroupSectionHeader from "./components/GroupSectionHeader";
import GroupSearchBar from "./components/GroupSearchBar";
import GroupList from "./components/GroupList";
import SelectionFooter from "./components/SelectionFooter";
import { filterGroups } from "./utils/groupListUtils.jsx";

export default function Sidebar({
  groups,
  masks,
  roomIncludedInBudget,
  roomIncludeLoading,
  onToggleRoomIncludedInBudget,
  selectedGroupId,
  setSelectedGroupId,
  editorMode,
  setEditorMode,
  selectedMaskIds,
  changeGroupMode, // boolean – reassign mode toggle
  setChangeGroupMode, // (bool) => void
  onCreateGroup,
  onUpdateGroup,
  onDeleteGroup, // (groupId) => void
  onDeleteEmptyGroups, // () => void
  onMaskClick,
  onPersist, // () => void
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const { allGroups, filteredGroups, normalizedQuery } = useMemo(
    () => filterGroups(groups, searchQuery),
    [groups, searchQuery],
  );

  return (
    <div className="w-72 border-r bg-white flex flex-col h-full font-sans">
      <SidebarHeader
        editorMode={editorMode}
        setEditorMode={setEditorMode}
        onPersist={onPersist}
        roomIncludedInBudget={roomIncludedInBudget}
        roomIncludeLoading={roomIncludeLoading}
        onToggleRoomIncludedInBudget={onToggleRoomIncludedInBudget}
      />

      {/* ── Selected Group Card ───────────────────────────────────────────────── */}
      {selectedGroupId && groups[selectedGroupId] && (
        <SelectedGroupCard
          group={groups[selectedGroupId]}
          masks={masks}
          selectedMaskIds={selectedMaskIds}
          onUpdate={onUpdateGroup}
          onMaskClick={onMaskClick}
          setEditorMode={setEditorMode}
        />
      )}

      {/* ── Groups List ───────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <ReassignModeToggle
          editorMode={editorMode}
          changeGroupMode={changeGroupMode}
          setChangeGroupMode={setChangeGroupMode}
        />

        <GroupSectionHeader
          query={normalizedQuery}
          filteredCount={filteredGroups.length}
          totalCount={allGroups.length}
          onDeleteEmptyGroups={onDeleteEmptyGroups}
          onCreateGroup={onCreateGroup}
        />

        <GroupSearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onClearSearch={() => setSearchQuery("")}
        />

        <GroupList
          masks={masks}
          filteredGroups={filteredGroups}
          allGroups={allGroups}
          query={normalizedQuery}
          selectedGroupId={selectedGroupId}
          onSelectGroup={(groupId) => {
            setSelectedGroupId(groupId);
            if (editorMode === "all") setEditorMode("group");
          }}
          onDeleteGroup={onDeleteGroup}
          onCreateGroup={onCreateGroup}
        />
      </div>

      <SelectionFooter selectedCount={selectedMaskIds?.length ?? 0} />
    </div>
  );
}
