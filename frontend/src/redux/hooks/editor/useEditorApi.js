import { useCallback } from "react";
import { buildServerUrl } from "../../../config";

async function extractApiError(response, fallbackMessage) {
  try {
    const data = await response.json();
    if (typeof data?.detail === "string" && data.detail.trim()) {
      return data.detail;
    }
  } catch {
    // no-op
  }
  return fallbackMessage;
}

export function useEditorApi(roomId) {
  const fetchRoomById = useCallback(async () => {
    if (!roomId) throw new Error("Missing room id");

    const response = await fetch(buildServerUrl(`/rooms/${roomId}`));
    if (!response.ok) throw new Error("Failed to fetch room");
    return response.json();
  }, [roomId]);

  const fetchEditorState = useCallback(
    async (projectId) => {
      const response = await fetch(
        `${buildServerUrl(`/projects/${projectId}/rooms/${roomId}/editor-state`)}?t=${Date.now()}`,
        { cache: "no-store" },
      );

      if (!response.ok) throw new Error("Failed to fetch editor state");
      return response.json();
    },
    [roomId],
  );

  const persistEditorState = useCallback(
    async (projectId, masks, groups) => {
      const response = await fetch(
        buildServerUrl(`/projects/${projectId}/rooms/${roomId}/editor-state`),
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ masks, groups }),
        },
      );

      if (!response.ok) throw new Error("Failed to persist");
      return response.json();
    },
    [roomId],
  );

  const setRoomBudgetInclusion = useCallback(
    async (projectId, isIncludedInBudget) => {
      const response = await fetch(
        buildServerUrl(`/projects/${projectId}/rooms/${roomId}/budget-inclusion`),
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_included_in_budget: isIncludedInBudget }),
        },
      );

      if (!response.ok) throw new Error("Failed to update room budget flag");
      return response.json();
    },
    [roomId],
  );

  const createGroup = useCallback(
    async (group) => {
      const payload = {
        name: group.name || "",
        description: group.description || "",
        code: group.code || "",
        user_entered_qty: group.user_entered_qty ?? null,
        color: Array.isArray(group.color) ? group.color : [141, 106, 59],
        type: group.type || "FF&E",
        unit_id: group.unit_id || null,
        room: roomId,
      };

      const response = await fetch(buildServerUrl("/groups"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(await extractApiError(response, "Failed to create group"));
      }
      return response.json();
    },
    [roomId],
  );

  const updateGroup = useCallback(async (groupId, group) => {
    const payload = {
      name: group.name || "",
      description: group.description || "",
      code: group.code || "",
      user_entered_qty: group.user_entered_qty ?? null,
      color: Array.isArray(group.color) ? group.color : [141, 106, 59],
      type: group.type || "FF&E",
      unit_id: group.unit_id || null,
    };

    const response = await fetch(buildServerUrl(`/groups/${groupId}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(await extractApiError(response, "Failed to update group"));
    }
    return response.json();
  }, []);

  const deleteGroup = useCallback(async (groupId) => {
    const response = await fetch(buildServerUrl(`/groups/${groupId}`), {
      method: "DELETE",
    });

    if (!response.ok && response.status !== 404) {
      throw new Error("Failed to delete group");
    }
  }, []);

  return {
    fetchRoomById,
    fetchEditorState,
    persistEditorState,
    setRoomBudgetInclusion,
    createGroup,
    updateGroup,
    deleteGroup,
  };
}
