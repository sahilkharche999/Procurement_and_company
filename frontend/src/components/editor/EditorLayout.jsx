import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import editorData from "../../data/editor_data.json";
import CanvasEditor from "./CanvasEditor";
import Sidebar from "./Sidebar";
import ContextMenu from "./ContextMenu";
import GroupDialog from "./dialogs/GroupDialog";
import CreateGroupDialog from "./dialogs/CreateGroupDialog";
import GroupAssignPopover from "./GroupAssignPopover";
import AssignDrawnMaskDialog from "./dialogs/AssignDrawnMaskDialog";
import FloatingToolbar from "./components/FloatingToolbar";
import { buildServerUrl } from "../../config";
import { useEditorApi } from "../../redux/hooks/editor/useEditorApi";

export default function EditorLayout() {
  const { roomId } = useParams();
  const {
    fetchRoomById,
    fetchEditorState,
    persistEditorState,
    setRoomBudgetInclusion,
    createGroup,
    updateGroup,
    deleteGroup,
  } = useEditorApi(roomId);
  const [bgImageUrl, setBgImageUrl] = useState(null);
  const [projectId, setProjectId] = useState("");
  const [roomIncludedInBudget, setRoomIncludedInBudget] = useState(false);
  const [roomIncludeLoading, setRoomIncludeLoading] = useState(false);

  // ─── Core state ────────────────────────────────────────────────────────────
  const [groups, setGroups] = useState(() => {
    // Try room boundary storage first or fallback
    const saved = localStorage.getItem(
      roomId ? `editor_groups_${roomId}` : "editor_groups",
    );
    const baseGroups = saved ? JSON.parse(saved) : editorData.groups;

    const initializedGroups = {};
    for (const [key, group] of Object.entries(baseGroups)) {
      initializedGroups[key] = {
        ...group,
        type: group.type || "FF&E",
      };
    }
    return initializedGroups;
  });

  const [masks, setMasks] = useState(() => {
    const saved = localStorage.getItem(
      roomId ? `editor_masks_${roomId}` : "editor_masks",
    );
    return saved ? JSON.parse(saved) : editorData.masks;
  });
  const [selectedMaskIds, setSelectedMaskIds] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [editorMode, setEditorMode] = useState("all");

  useEffect(() => {
    if (!roomId) return;
    const fetchRoomData = async () => {
      try {
        const roomData = await fetchRoomById();
        const projectIdFromRoom = String(roomData.project || "");
        setProjectId(projectIdFromRoom);

        setRoomIncludedInBudget(!!roomData.is_included_in_budget);

        if (roomData.room_image_url) {
          setBgImageUrl(buildServerUrl(roomData.room_image_url));
        }

        if (projectIdFromRoom) {
          const data = await fetchEditorState(projectIdFromRoom);

          const initializedGroups = {};
          for (const [key, group] of Object.entries(data.groups || {})) {
            initializedGroups[key] = {
              ...group,
              type: group.type || "FF&E",
            };
          }

          // Always prefer latest server payload to avoid stale local cache
          // causing visual misalignment with the current room image.
          setGroups(initializedGroups);
          setMasks(data.masks || []);
          setHistory([
            {
              masks: data.masks || [],
              groups: initializedGroups,
            },
          ]);
          setHistoryIndex(0);

          // Sync cache to latest server data as well.
          localStorage.setItem(
            `editor_groups_${roomId}`,
            JSON.stringify(initializedGroups),
          );
          localStorage.setItem(
            `editor_masks_${roomId}`,
            JSON.stringify(data.masks || []),
          );
        }
      } catch (err) {
        console.error("Error fetching room data:", err);
      }
    };
    fetchRoomData();
  }, [roomId, fetchRoomById, fetchEditorState]);

  // ─── UI state ──────────────────────────────────────────────────────────────
  const [contextMenu, setContextMenu] = useState(null);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [createGroupDialogOpen, setCreateGroupDialogOpen] = useState(false);

  // ─── Reassign-mode state ───────────────────────────────────────────────────
  /** Whether "Change Group" mode is active (only meaningful in group editorMode) */
  const [changeGroupMode, setChangeGroupMode] = useState(false);
  /** Position + data for the floating group-assign popover; null = hidden */
  const [assignPopover, setAssignPopover] = useState(null); // { x, y }

  // ─── Drawing mode state ────────────────────────────────────────────────────
  const [isDrawMode, setIsDrawMode] = useState(false);
  const [isLabelDrawMode, setIsLabelDrawMode] = useState(false);
  const [pendingMaskPolygons, setPendingMaskPolygons] = useState(null);
  const [pendingMaskType, setPendingMaskType] = useState("custom");
  const [saveStatus, setSaveStatus] = useState(null); // null | 'saved'
  const [clipboardMasks, setClipboardMasks] = useState([]);

  // ─── Undo / Redo ──────────────────────────────────────────────────────────
  const [history, setHistory] = useState([{ masks, groups }]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const isMongoObjectId = (value) =>
    typeof value === "string" && /^[a-f\d]{24}$/i.test(value);

  const normalizeGroup = (raw) => {
    if (!raw) return null;
    const id = raw.id || raw._id;
    if (!id) return null;
    return {
      id,
      name: raw.name || "",
      description: raw.description || "",
      code: raw.code || "",
      user_entered_qty: raw.user_entered_qty ?? null,
      color: Array.isArray(raw.color) ? raw.color : [141, 106, 59],
      type: raw.type || "FF&E",
      unit_id: raw.unit_id || null,
      room: raw.room || roomId || "",
      project: raw.project || "",
    };
  };

  const createGroupOnServer = async (group) => {
    const created = await createGroup(group);
    return normalizeGroup(created);
  };

  const updateGroupOnServer = async (groupId, group) => {
    const updated = await updateGroup(groupId, group);
    return normalizeGroup(updated);
  };

  const deleteGroupOnServer = async (groupId) => {
    await deleteGroup(groupId);
  };

  const pushToHistory = (newMasks, newGroups) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({
      masks: JSON.parse(JSON.stringify(newMasks)),
      groups: JSON.parse(JSON.stringify(newGroups)),
    });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex === 0) return;
    const prev = history[historyIndex - 1];
    setMasks(prev.masks);
    setGroups(prev.groups);
    setHistoryIndex(historyIndex - 1);
  };

  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    const next = history[historyIndex + 1];
    setMasks(next.masks);
    setGroups(next.groups);
    setHistoryIndex(historyIndex + 1);
  };

  const handlePersist = useCallback(async () => {
    try {
      setSaveStatus("Saving to backend...");
      if (!projectId) throw new Error("Missing project context for room");

      const persisted = await persistEditorState(projectId, masks, groups);
      if (persisted?.groups && persisted?.masks) {
        setGroups(persisted.groups);
        setMasks(persisted.masks);
      }

      setSaveStatus("Persisted to database");
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (err) {
      console.error(err);
      setSaveStatus("Error saving to database");
      setTimeout(() => setSaveStatus(null), 2500);
    }
  }, [projectId, masks, groups, persistEditorState]);

  const handleToggleRoomIncludedInBudget = useCallback(
    async (nextValue) => {
      if (!roomId) return;
      if (!projectId) return;
      try {
        setRoomIncludeLoading(true);
        const updatedRoom = await setRoomBudgetInclusion(projectId, nextValue);
        setRoomIncludedInBudget(!!updatedRoom.is_included_in_budget);
      } catch (err) {
        console.error(err);
      } finally {
        setRoomIncludeLoading(false);
      }
    },
    [roomId, projectId, setRoomBudgetInclusion],
  );

  const moveSelectedMasksBy = useCallback(
    (dx, dy) => {
      if (selectedMaskIds.length === 0) return;

      const newMasks = masks.map((mask) => {
        if (!selectedMaskIds.includes(mask.id)) return mask;

        const newPolygons = mask.polygons.map((poly) => {
          const flatPoly = poly.flat();
          const res = [];
          for (let i = 0; i < flatPoly.length; i += 2) {
            res.push(flatPoly[i] + dx, flatPoly[i + 1] + dy);
          }
          return res;
        });

        return { ...mask, polygons: newPolygons };
      });

      setMasks(newMasks);
      pushToHistory(newMasks, groups);
    },
    [selectedMaskIds, masks, groups],
  );

  // ─── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      const target = e.target;
      const isTypingElement =
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);
      if (isTypingElement) return;

      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const ctrlKey = isMac ? e.metaKey : e.ctrlKey;

      if (ctrlKey && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if (ctrlKey && (e.key === "Z" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
      }

      // Cmd+C / Ctrl+C
      if (ctrlKey && e.key === "c") {
        e.preventDefault();
        const toCopy = masks.filter((m) => selectedMaskIds.includes(m.id));
        if (toCopy.length > 0) {
          setClipboardMasks(JSON.parse(JSON.stringify(toCopy)));
          setSaveStatus("copied");
          setTimeout(() => setSaveStatus(null), 1500);
        }
      }

      // Cmd+V / Ctrl+V
      if (ctrlKey && e.key === "v") {
        e.preventDefault();
        if (clipboardMasks.length > 0) {
          const newSelectedIds = [];
          const offset = 20;

          const updatedClipboard = clipboardMasks.map((mask) => {
            const newId = `mask_${Date.now()}_${Math.random()
              .toString(36)
              .substr(2, 5)}`;
            newSelectedIds.push(newId);

            const newPolygons = mask.polygons.map((poly) => {
              const flatPoly = poly.flat();
              const res = [];
              for (let i = 0; i < flatPoly.length; i += 2) {
                res.push(flatPoly[i] + offset, flatPoly[i + 1] + offset);
              }
              return res;
            });

            return { ...mask, id: newId, polygons: newPolygons };
          });

          const newMasks = [...masks, ...updatedClipboard];
          setMasks(newMasks);
          setSelectedMaskIds(newSelectedIds);
          setClipboardMasks(updatedClipboard);
          pushToHistory(newMasks, groups);
        }
      }

      // Cmd+S / Ctrl+S to save to local storage AND persist to backend
      if (ctrlKey && e.key === "s") {
        e.preventDefault();
        localStorage.setItem(
          roomId ? `editor_groups_${roomId}` : "editor_groups",
          JSON.stringify(groups),
        );
        localStorage.setItem(
          roomId ? `editor_masks_${roomId}` : "editor_masks",
          JSON.stringify(masks),
        );
        console.log("State saved to local storage");
        // Also fire off the persist command to the backend
        handlePersist();
      }

      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedMaskIds.length > 0
      ) {
        e.preventDefault();
        deleteSelectedMasks();
      }

      // Arrow key nudge: normal = 1px, Shift+Arrow = 10px
      if (
        selectedMaskIds.length > 0 &&
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)
      ) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;

        if (e.key === "ArrowUp") moveSelectedMasksBy(0, -step);
        if (e.key === "ArrowDown") moveSelectedMasksBy(0, step);
        if (e.key === "ArrowLeft") moveSelectedMasksBy(-step, 0);
        if (e.key === "ArrowRight") moveSelectedMasksBy(step, 0);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    historyIndex,
    history,
    selectedMaskIds,
    groups,
    masks,
    clipboardMasks,
    handlePersist,
    moveSelectedMasksBy,
  ]);

  // ─── Selection helpers ────────────────────────────────────────────────────
  /**
   * Standard toggle — used by both normal mode and reassign mode.
   * isShift=true  → add / remove from selection
   * isShift=false → select only this mask
   */
  const toggleMaskSelection = (id, isShift) => {
    if (isShift) {
      setSelectedMaskIds((prev) =>
        prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
      );
    } else {
      setSelectedMaskIds([id]);
    }
  };

  /**
   * Called by CanvasEditor on Ctrl+Click in reassign mode.
   * Adds the clicked mask to selection (if not already there) and shows popover.
   */
  const handleCtrlClickMask = (maskId, cursorPos) => {
    setSelectedMaskIds((prev) =>
      prev.includes(maskId) ? prev : [...prev, maskId],
    );
    setAssignPopover(cursorPos); // { x, y }
  };

  /**
   * Called when the user clicks a group in the GroupAssignPopover.
   * Moves all selected masks to the chosen group, clears selection, saves history.
   */
  const assignMasksToGroup = (groupId) => {
    const newMasks = masks.map((mask) =>
      selectedMaskIds.includes(mask.id) ? { ...mask, group_id: groupId } : mask,
    );
    setMasks(newMasks);
    setSelectedMaskIds([]);
    setAssignPopover(null);
    pushToHistory(newMasks, groups);
  };

  const handleUpdateMaskPosition = (maskId, dx, dy) => {
    const newMasks = masks.map((mask) => {
      if (mask.id !== maskId) return mask;
      const newPolygons = mask.polygons.map((poly) => {
        const flatPoly = poly.flat();
        const res = [];
        for (let i = 0; i < flatPoly.length; i += 2) {
          res.push(flatPoly[i] + dx, flatPoly[i + 1] + dy);
        }
        return res;
      });
      return { ...mask, polygons: newPolygons };
    });
    setMasks(newMasks);
    pushToHistory(newMasks, groups);
  };

  const handleUpdateMaskPolygons = (maskId, newPolygons) => {
    const newMasks = masks.map((mask) =>
      mask.id === maskId ? { ...mask, polygons: newPolygons } : mask,
    );
    setMasks(newMasks);
    pushToHistory(newMasks, groups);
  };

  // ─── Other handlers ───────────────────────────────────────────────────────
  const handleSaveNewMask = (polygons) => {
    setPendingMaskType("custom");
    setPendingMaskPolygons(polygons); // Pause to assign group
  };

  const handlePlaceLabelMask = (polygons) => {
    if (!polygons || polygons.length === 0) return;

    if (selectedGroupId) {
      const newMask = {
        id: `mask_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        group_id: selectedGroupId,
        polygons,
        source: "user",
        type: "label",
      };
      const newMasks = [...masks, newMask];
      setMasks(newMasks);
      setSelectedMaskIds([newMask.id]);
      pushToHistory(newMasks, groups);
      return;
    }

    setPendingMaskType("label");
    setPendingMaskPolygons(polygons);
  };

  const handleAssignDrawnMask = (groupId) => {
    if (!pendingMaskPolygons) return;
    const newMask = {
      id: `mask_${Date.now()}`,
      group_id: groupId,
      polygons: pendingMaskPolygons,
      source: "user",
      type: pendingMaskType === "label" ? "label" : "custom",
    };
    const newMasks = [...masks, newMask];
    setMasks(newMasks);
    setSelectedMaskIds([newMask.id]);
    setSelectedGroupId(groupId); // auto-select the group we just assigned to
    pushToHistory(newMasks, groups);
    setPendingMaskPolygons(null);
    setPendingMaskType("custom");
    if (pendingMaskType !== "label") {
      setIsDrawMode(false);
    }
  };

  /** Legacy right-click → GroupDialog path (kept for backward compat) */
  const assignGroup = (groupId) => {
    const newMasks = masks.map((mask) =>
      selectedMaskIds.includes(mask.id) ? { ...mask, group_id: groupId } : mask,
    );
    setMasks(newMasks);
    pushToHistory(newMasks, groups);
  };

  const deleteSelectedMasks = () => {
    const newMasks = masks.filter((m) => !selectedMaskIds.includes(m.id));
    setMasks(newMasks);
    setSelectedMaskIds([]);
    pushToHistory(newMasks, groups);
  };

  const handleGroupCreated = async (newGroupDraft) => {
    try {
      const createdGroup = await createGroupOnServer(newGroupDraft);
      if (!createdGroup) return null;

      const newGroups = { ...groups, [createdGroup.id]: createdGroup };
      setGroups(newGroups);
      setSelectedGroupId(createdGroup.id);
      setEditorMode("group");
      pushToHistory(masks, newGroups);
      return createdGroup;
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const handleGroupUpdated = async (updatedGroup) => {
    try {
      let savedGroup = null;
      let newMasks = masks;
      let newSelectedGroupId = selectedGroupId;
      const previousId = updatedGroup.id;

      if (isMongoObjectId(previousId)) {
        savedGroup = await updateGroupOnServer(previousId, updatedGroup);
      } else {
        // Legacy local/random group id: create canonical Mongo group and remap masks.
        savedGroup = await createGroupOnServer(updatedGroup);
        newMasks = masks.map((m) =>
          m.group_id === previousId ? { ...m, group_id: savedGroup.id } : m,
        );
        if (newSelectedGroupId === previousId) {
          newSelectedGroupId = savedGroup.id;
        }
      }

      if (!savedGroup) return false;

      const baseGroups = { ...groups };
      if (previousId !== savedGroup.id) delete baseGroups[previousId];
      const newGroups = { ...baseGroups, [savedGroup.id]: savedGroup };

      setGroups(newGroups);
      if (newMasks !== masks) setMasks(newMasks);
      if (newSelectedGroupId !== selectedGroupId) {
        setSelectedGroupId(newSelectedGroupId);
      }
      pushToHistory(newMasks, newGroups);
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  /**
   * Delete a group:
   *  • Remove it from the groups map
    *  • Remove all masks that belonged to it
   *  • Clear selectedGroupId if it was the deleted group
   *  • Push to undo/redo history
   */
  const handleDeleteGroup = async (groupId) => {
    try {
      if (isMongoObjectId(groupId)) {
        await deleteGroupOnServer(groupId);
      }

      const { [groupId]: _removed, ...newGroups } = groups;
      const newMasks = masks.filter((m) => m.group_id !== groupId);
      setGroups(newGroups);
      setMasks(newMasks);
      if (selectedGroupId === groupId) setSelectedGroupId(null);
      pushToHistory(newMasks, newGroups);
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  /**
   * Delete all groups that currently have no masks assigned to them.
   */
  const handleDeleteEmptyGroups = async () => {
    const groupIdsWithMasks = new Set(
      masks.map((m) => m.group_id).filter(Boolean),
    );
    const emptyGroupIds = Object.keys(groups).filter(
      (id) => !groupIdsWithMasks.has(id),
    );

    if (emptyGroupIds.length === 0) return;

    const keepIds = new Set();
    for (const id of emptyGroupIds) {
      if (!isMongoObjectId(id)) {
        continue;
      }

      try {
        await deleteGroupOnServer(id);
      } catch (err) {
        console.error(err);
        keepIds.add(id);
      }
    }

    const newGroups = { ...groups };
    let hasDeletions = false;
    emptyGroupIds.forEach((id) => {
      if (!keepIds.has(id)) {
        delete newGroups[id];
        hasDeletions = true;
      }
    });

    if (!hasDeletions) return;

    setGroups(newGroups);
    if (selectedGroupId && !newGroups[selectedGroupId]) {
      setSelectedGroupId(null);
    }
    pushToHistory(masks, newGroups);
  };

  const handleMaskClickFromSidebar = (maskId) => {
    setSelectedMaskIds([maskId]);
    setEditorMode("group");
  };

  /** Turn off changeGroupMode when leaving group editorMode */
  const handleSetEditorMode = (mode) => {
    setEditorMode(mode);
    if (mode !== "group") setChangeGroupMode(false);
  };

  return (
    <div className="flex h-screen relative">
      <Sidebar
        groups={groups}
        masks={masks}
        roomIncludedInBudget={roomIncludedInBudget}
        roomIncludeLoading={roomIncludeLoading}
        onToggleRoomIncludedInBudget={handleToggleRoomIncludedInBudget}
        selectedGroupId={selectedGroupId}
        setSelectedGroupId={setSelectedGroupId}
        editorMode={editorMode}
        setEditorMode={handleSetEditorMode}
        selectedMaskIds={selectedMaskIds}
        changeGroupMode={changeGroupMode}
        setChangeGroupMode={setChangeGroupMode}
        onCreateGroup={() => setCreateGroupDialogOpen(true)}
        onUpdateGroup={handleGroupUpdated}
        onDeleteGroup={handleDeleteGroup}
        onDeleteEmptyGroups={handleDeleteEmptyGroups}
        onMaskClick={handleMaskClickFromSidebar}
        onPersist={handlePersist}
      />

      <div
        className="flex-1 overflow-hidden relative"
        style={{
          backgroundColor: "#f0f0f0",
          backgroundImage:
            "radial-gradient(circle, #b0b0b8 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      >
        <FloatingToolbar
          isDrawMode={isDrawMode}
          setIsDrawMode={setIsDrawMode}
          isLabelDrawMode={isLabelDrawMode}
          setIsLabelDrawMode={setIsLabelDrawMode}
        />

        <CanvasEditor
          groups={groups}
          masks={masks}
          selectedMaskIds={selectedMaskIds}
          selectedGroupId={selectedGroupId}
          editorMode={editorMode}
          changeGroupMode={changeGroupMode}
          toggleMaskSelection={toggleMaskSelection}
          setSelectedMaskIds={setSelectedMaskIds}
          setSelectedGroupId={setSelectedGroupId}
          setContextMenu={setContextMenu}
          onCtrlClickMask={handleCtrlClickMask}
          isDrawMode={isDrawMode}
          isLabelDrawMode={isLabelDrawMode}
          onSaveNewMask={handleSaveNewMask}
          onCreateLabelMask={handlePlaceLabelMask}
          onUpdateMaskPosition={handleUpdateMaskPosition}
          onUpdateMaskPolygons={handleUpdateMaskPolygons}
          bgImageUrl={bgImageUrl}
        />
      </div>

      {/* ── Right-click context menu (legacy path) ─────────────────────────── */}
      {contextMenu && (
        <ContextMenu
          position={contextMenu}
          onClose={() => setContextMenu(null)}
          onAssign={() => {
            setGroupDialogOpen(true);
            setContextMenu(null);
          }}
          onDelete={() => {
            deleteSelectedMasks();
            setContextMenu(null);
          }}
        />
      )}

      {/* ── Floating group-assign popover ─────────────────────────────────── */}
      {assignPopover && (
        <GroupAssignPopover
          position={assignPopover}
          groups={groups}
          selectedCount={selectedMaskIds.length}
          onAssign={assignMasksToGroup}
          onClose={() => setAssignPopover(null)}
        />
      )}

      <GroupDialog
        open={groupDialogOpen}
        onClose={() => setGroupDialogOpen(false)}
        groups={groups}
        onCreateGroup={handleGroupCreated}
        assignGroup={assignGroup}
      />

      <CreateGroupDialog
        open={createGroupDialogOpen}
        onClose={() => setCreateGroupDialogOpen(false)}
        onGroupCreated={handleGroupCreated}
      />

      {pendingMaskPolygons && (
        <AssignDrawnMaskDialog
          open={!!pendingMaskPolygons}
          onClose={() => {
            setPendingMaskPolygons(null);
            setPendingMaskType("custom");
          }}
          onAssign={handleAssignDrawnMask}
          groups={groups}
        />
      )}

      {/* ── Save Notification ────────────────────────────────────────────── */}
      {saveStatus && (
        <div className="absolute bottom-6 right-6 z-100 bg-emerald-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span className="text-sm font-medium">
            {saveStatus === "copied"
              ? "Copied to clipboard"
              : "Saved to local storage"}
          </span>
        </div>
      )}
    </div>
  );
}
