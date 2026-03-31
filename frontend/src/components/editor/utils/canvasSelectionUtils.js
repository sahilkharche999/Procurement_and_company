export const getSelectionBoxFromPoints = (start, end) => ({
  x: Math.min(start.x, end.x),
  y: Math.min(start.y, end.y),
  width: Math.abs(end.x - start.x),
  height: Math.abs(end.y - start.y),
});

export const getMaskBoundingBox = (mask) => {
  if (!mask.polygons) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  mask.polygons.forEach((polygon) => {
    polygon.flat().forEach((value, index) => {
      if (index % 2 === 0) {
        minX = Math.min(minX, value);
        maxX = Math.max(maxX, value);
      } else {
        minY = Math.min(minY, value);
        maxY = Math.max(maxY, value);
      }
    });
  });

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
};

export const getSelectedMaskIdsInSelectionBox = (masks, selectionBox) => {
  if (!selectionBox) return [];

  return masks
    .filter((mask) => {
      const maskBox = getMaskBoundingBox(mask);
      if (!maskBox) return false;

      return (
        maskBox.x >= selectionBox.x &&
        maskBox.x + maskBox.width <= selectionBox.x + selectionBox.width &&
        maskBox.y >= selectionBox.y &&
        maskBox.y + maskBox.height <= selectionBox.y + selectionBox.height
      );
    })
    .map((mask) => mask.id);
};

export const createLabelPolygon = (point, labelSize = 20) => {
  const half = labelSize / 2;
  return [
    point.x - half,
    point.y - half,
    point.x + half,
    point.y - half,
    point.x + half,
    point.y + half,
    point.x - half,
    point.y + half,
    point.x - half,
    point.y - half,
  ];
};
