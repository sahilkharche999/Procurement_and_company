export const filterGroups = (groupsMap, query) => {
  const allGroups = Object.values(groupsMap || {});
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return { allGroups, filteredGroups: allGroups, normalizedQuery };
  }

  const filteredGroups = allGroups.filter(
    (group) =>
      group.name.toLowerCase().includes(normalizedQuery) ||
      (group.code && group.code.toLowerCase().includes(normalizedQuery)),
  );

  return { allGroups, filteredGroups, normalizedQuery };
};

export const getGroupMaskCount = (masks, groupId) =>
  masks.filter((mask) => mask.group_id === groupId).length;

export const getGroupColorStyle = (group) => {
  if (group?.color) {
    return {
      backgroundColor: `rgb(${group.color[0]}, ${group.color[1]}, ${group.color[2]})`,
    };
  }

  return { backgroundColor: "#ccc" };
};

export const highlightMatch = (text, query) => {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query);
  if (idx === -1) return text;

  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 text-yellow-900 px-0">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
};
