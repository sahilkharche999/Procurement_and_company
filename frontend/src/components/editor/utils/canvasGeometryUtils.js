export const calculatePolygonBounds = (polygon) => {
  if (!polygon || polygon.length === 0) {
    return null;
  }

  const flatPoints = Array.isArray(polygon[0]) ? polygon.flat() : polygon;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < flatPoints.length; i += 2) {
    minX = Math.min(minX, flatPoints[i]);
    maxX = Math.max(maxX, flatPoints[i]);
    minY = Math.min(minY, flatPoints[i + 1]);
    maxY = Math.max(maxY, flatPoints[i + 1]);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
};

export const calculateMaskBounds = (mask) => {
  if (!mask.polygons || mask.polygons.length === 0) {
    return null;
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  mask.polygons.forEach((polygon) => {
    const bounds = calculatePolygonBounds(polygon);
    if (bounds) {
      minX = Math.min(minX, bounds.x);
      maxX = Math.max(maxX, bounds.x + bounds.width);
      minY = Math.min(minY, bounds.y);
      maxY = Math.max(maxY, bounds.y + bounds.height);
    }
  });

  if (minX === Infinity) {
    return null;
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
};

export const computeHandles = (rawNodes, close = false) => {
  const nodeCount = rawNodes.length;
  if (nodeCount === 0) return [];

  const getPrev = (index) =>
    close
      ? rawNodes[(index - 1 + nodeCount) % nodeCount]
      : rawNodes[Math.max(index - 1, 0)];

  const getNext = (index) =>
    close
      ? rawNodes[(index + 1) % nodeCount]
      : rawNodes[Math.min(index + 1, nodeCount - 1)];

  return rawNodes.map((node, index) => {
    if (!node.isCurve) {
      return {
        ...node,
        handleIn: { x: node.x, y: node.y },
        handleOut: { x: node.x, y: node.y },
      };
    }

    const prev = getPrev(index);
    const next = getNext(index);

    let vx = next.x - prev.x;
    let vy = next.y - prev.y;
    const len = Math.sqrt(vx * vx + vy * vy) || 1;
    vx /= len;
    vy /= len;

    const tension = 0.3;
    const dPrev = Math.sqrt((node.x - prev.x) ** 2 + (node.y - prev.y) ** 2);
    const dNext = Math.sqrt((next.x - node.x) ** 2 + (next.y - node.y) ** 2);

    return {
      ...node,
      handleIn: {
        x: node.x - vx * dPrev * tension,
        y: node.y - vy * dPrev * tension,
      },
      handleOut: {
        x: node.x + vx * dNext * tension,
        y: node.y + vy * dNext * tension,
      },
    };
  });
};

export const generateSmoothPolygon = (rawNodes, close = false) => {
  if (rawNodes.length === 0) return [];
  if (rawNodes.length === 1) return [rawNodes[0].x, rawNodes[0].y];

  const computedNodes = computeHandles(rawNodes, close);
  const nodeCount = computedNodes.length;

  const out = [];
  out.push(computedNodes[0].x, computedNodes[0].y);

  const segmentCount = close ? nodeCount : nodeCount - 1;
  for (let i = 0; i < segmentCount; i++) {
    const p1 = computedNodes[i];
    const p2 = computedNodes[(i + 1) % nodeCount];

    if (!p1.isCurve && !p2.isCurve) {
      out.push(p2.x, p2.y);
    } else {
      const cp1 = p1.isCurve ? p1.handleOut : { x: p1.x, y: p1.y };
      const cp2 = p2.isCurve ? p2.handleIn : { x: p2.x, y: p2.y };

      const segmentSteps = 20;
      for (let t = 1; t <= segmentSteps; t++) {
        const u = t / segmentSteps;
        const invU = 1 - u;
        const b0 = invU * invU * invU;
        const b1 = 3 * invU * invU * u;
        const b2 = 3 * invU * u * u;
        const b3 = u * u * u;

        const x = b0 * p1.x + b1 * cp1.x + b2 * cp2.x + b3 * p2.x;
        const y = b0 * p1.y + b1 * cp1.y + b2 * cp2.y + b3 * p2.y;
        out.push(x, y);
      }
    }
  }

  return out;
};
