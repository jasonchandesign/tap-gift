/**
 * The shape of a rip. A finger's cut is kept exactly, then carried on to the edges of the screen
 * in the direction it was heading, wandering a little like real paper. The two pieces either side
 * of the line fly apart.
 */

export type Point = { x: number; y: number };

export type Half = {
  /** A CSS clip-path in screen pixels. */
  clip: string;
  /** The same piece with a thin, uneven band past the torn edge, where the paper's white core shows. */
  rim: string;
  dx: number;
  dy: number;
  rotate: number;
  origin: string;
};

/** Spacing of the wander points where the tear carries on past the finger. */
const STEP_PX = 26;
/**
 * How much of the cut's ends sets the direction it carries on in: at least this much, and more for
 * a long cut, so a zigzag carries on the way it was going overall rather than along its last zig.
 */
const AIM_PX = 40;
const AIM_MAX_PX = 220;
/** The shortest cut that tears. Anything less is a tap or a slip. */
export const MIN_CUT_PX = 80;

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function unit({ x, y }: Point) {
  const length = Math.hypot(x, y);
  return length ? { x: x / length, y: y / length } : { x: 0, y: 0 };
}

function clamp(point: Point, width: number, height: number) {
  return {
    x: Math.min(width, Math.max(0, point.x)),
    y: Math.min(height, Math.max(0, point.y)),
  };
}

export function cutLength(path: Point[]) {
  return path.reduce((total, point, index) => (index ? total + distance(path[index - 1], point) : 0), 0);
}

/** Where a line from a point in a direction leaves the screen. */
function exit(point: Point, direction: Point, width: number, height: number) {
  const steps: number[] = [];
  if (direction.x > 0) steps.push((width - point.x) / direction.x);
  if (direction.x < 0) steps.push(-point.x / direction.x);
  if (direction.y > 0) steps.push((height - point.y) / direction.y);
  if (direction.y < 0) steps.push(-point.y / direction.y);
  const step = steps.length ? Math.min(...steps) : 0;
  return clamp({ x: point.x + direction.x * step, y: point.y + direction.y * step }, width, height);
}

/** Carries the tear on from a point to the edge, not including the point itself. */
function carryOn(point: Point, direction: Point, width: number, height: number) {
  const aim = unit(direction);
  if (!aim.x && !aim.y) return [];
  const end = exit(point, aim, width, height);
  const length = distance(point, end);
  if (length < 2) return [];

  const across = { x: -aim.y, y: aim.x };
  const limit = Math.min(30, length * 0.08);
  const steps = Math.max(1, Math.round(length / STEP_PX));
  const points: Point[] = [];
  let wander = 0;
  for (let index = 1; index < steps; index += 1) {
    wander = Math.max(-limit, Math.min(limit, wander + (Math.random() - 0.5) * 10));
    const shift = wander + (Math.random() - 0.5) * 8;
    const along = (length * index) / steps;
    points.push(
      clamp(
        { x: point.x + aim.x * along + across.x * shift, y: point.y + aim.y * along + across.y * shift },
        width,
        height,
      ),
    );
  }
  return [...points, end];
}

/**
 * The direction a cut was heading at its end. A zigzag, much longer than the distance it covers,
 * carries on the way it went overall.
 */
function heading(path: Point[]) {
  const end = path[path.length - 1];
  if (cutLength(path) > 1.6 * distance(path[0], end)) {
    return { x: end.x - path[0].x, y: end.y - path[0].y };
  }
  const aim = Math.min(AIM_MAX_PX, Math.max(AIM_PX, cutLength(path) * 0.4));
  let index = path.length - 2;
  let travelled = 0;
  while (index > 0 && travelled < aim) {
    travelled += distance(path[index], path[index + 1]);
    index -= 1;
  }
  return { x: end.x - path[index].x, y: end.y - path[index].y };
}

/** Where a point on the screen's edge sits going clockwise from the top left, from 0 to 4. */
function around({ x, y }: Point, width: number, height: number) {
  if (y <= 1) return x / width;
  if (x >= width - 1) return 1 + y / height;
  if (y >= height - 1) return 2 + (width - x) / width;
  return 3 + (height - y) / height;
}

function polygon(points: Point[]) {
  return `polygon(${points.map(({ x, y }) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(", ")})`;
}

/**
 * The torn line pushed out past the piece's edge by an uneven amount: mostly a few pixels that
 * wander, with the odd fiber sticking further out, like the white inside of torn paper.
 */
function fray(line: Point[], outward: 1 | -1, width: number, height: number) {
  let band = 3;
  return line.map((point, index) => {
    const before = line[Math.max(0, index - 1)];
    const after = line[Math.min(line.length - 1, index + 1)];
    const along = unit({ x: after.x - before.x, y: after.y - before.y });
    band = Math.max(1.5, Math.min(6, band + (Math.random() - 0.5) * 2.5));
    const fiber = Math.random() < 0.2 ? Math.random() * 5 : 0;
    const push = (band + fiber) * outward;
    return clamp({ x: point.x + along.y * push, y: point.y - along.x * push }, width, height);
  });
}

/** One piece: the torn line, then back around the screen's edge one way or the other. */
function piece(line: Point[], way: 1 | -1, width: number, height: number): Half {
  const from = around(line[line.length - 1], width, height);
  const to = around(line[0], width, height);
  const corners = [
    { at: 0, point: { x: 0, y: 0 } },
    { at: 1, point: { x: width, y: 0 } },
    { at: 2, point: { x: width, y: height } },
    { at: 3, point: { x: 0, y: height } },
  ];
  const span = (way * (to - from) + 4) % 4;
  const passed = corners
    .map((corner) => ({ ...corner, gap: (way * (corner.at - from) + 4) % 4 }))
    .filter(({ gap }) => gap > 0 && gap < span)
    .sort((a, b) => a.gap - b.gap)
    .map(({ point }) => point);
  const shape = [...line, ...passed];

  // Going round the piece clockwise on screen, its inside is to the right of the torn line, so the
  // white band goes to the left; anticlockwise, the other way round.
  const area = shape.reduce((sum, point, index) => {
    const next = shape[(index + 1) % shape.length];
    return sum + point.x * next.y - next.x * point.y;
  }, 0);
  const rim = [...fray(line, area > 0 ? 1 : -1, width, height), ...passed];

  // Fly away from the line, toward the middle of this piece.
  const middle = (points: Point[]) => ({
    x: points.reduce((sum, { x }) => sum + x, 0) / points.length,
    y: points.reduce((sum, { y }) => sum + y, 0) / points.length,
  });
  const center = middle(shape);
  const lineCenter = middle(line);
  const lineAim = unit({ x: line[line.length - 1].x - line[0].x, y: line[line.length - 1].y - line[0].y });
  let away = unit({ x: center.x - lineCenter.x, y: center.y - lineCenter.y });
  if (!away.x && !away.y) away = { x: -lineAim.y * way, y: lineAim.x * way };
  const throwPx = Math.max(width, height) * 1.1;
  const turn = Math.sign(lineAim.x * away.y - lineAim.y * away.x) || way;

  return {
    clip: polygon(shape),
    rim: polygon(rim),
    dx: away.x * throwPx,
    dy: away.y * throwPx,
    rotate: turn * (10 + Math.random() * 8),
    origin: `${lineCenter.x.toFixed(0)}px ${lineCenter.y.toFixed(0)}px`,
  };
}

/** Tears along a finger's cut, in screen pixels, carried on to the edges both ways. */
export function tearAlong(cut: Point[], width: number, height: number): Half[] {
  const path = cut
    .map((point) => clamp(point, width, height))
    .filter((point, index, all) => index === 0 || distance(point, all[index - 1]) >= 3);
  if (path.length < 2) return tearAcross(width, height);

  const before = carryOn(path[0], heading([...path].reverse()), width, height).reverse();
  const after = carryOn(path[path.length - 1], heading(path), width, height);
  const line = [...before, ...path, ...after];

  // Tiny jags between points, like paper fibers.
  const ragged = line.flatMap((point, index) => {
    const next = line[index + 1];
    if (!next) return [point];
    const across = unit({ x: -(next.y - point.y), y: next.x - point.x });
    const jag = (Math.random() - 0.5) * 4;
    const mid = clamp(
      { x: (point.x + next.x) / 2 + across.x * jag, y: (point.y + next.y) / 2 + across.y * jag },
      width,
      height,
    );
    return [point, mid];
  });

  return [piece(ragged, 1, width, height), piece(ragged, -1, width, height)];
}

/** A tear from top to bottom for the Unwrap button, a little different every time. */
export function tearAcross(width: number, height: number): Half[] {
  const points: Point[] = [];
  let drift = 0;
  let side = Math.random() < 0.5 ? -1 : 1;
  for (let y = 0; y < height; y += 14 + Math.random() * 40) {
    points.push({ x: width / 2 + drift + side * (4 + Math.random() * 18), y });
    drift = Math.max(-width * 0.12, Math.min(width * 0.12, drift + (Math.random() - 0.5) * 30));
    side = Math.random() < 0.75 ? -side : side;
  }
  points[0] = { ...points[0], y: 0 };
  points.push({ x: width / 2 + drift, y: height });
  return tearAlong(points, width, height);
}
