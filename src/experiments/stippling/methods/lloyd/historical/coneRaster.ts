import type { PlacementPoint } from "../../../types";
import { CONE_BACKGROUND_RGB, decodeSiteIndex, encodeSiteIndex, MAX_CONE_SITE_INDEX } from "./indexColor";

export const CONE_NODES = 32;
export const CONE_APEX_Z = 1;
export const CONE_RING_Z = -300;
const FULL_TURN = Math.PI * 2;
const SECTOR_ANGLE = FULL_TURN / CONE_NODES;
const NORMAL_X = Array.from({ length: CONE_NODES }, (_, index) => Math.cos((index + 0.5) * SECTOR_ANGLE));
const NORMAL_Y = Array.from({ length: CONE_NODES }, (_, index) => Math.sin((index + 0.5) * SECTOR_ANGLE));

export interface ConeOwnership {
  width: number;
  height: number;
  encodedRgb: Uint32Array;
  owners: Int32Array;
  // t = 0 at the apex and t = 1 at the polygon ring; z = 1 - 301t.
  depthFraction: Float64Array;
}

export function renderConeOwnership(
  points: readonly PlacementPoint[],
  width: number,
  height: number,
): ConeOwnership {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new Error("Cone ownership needs positive integer image dimensions.");
  }
  if (points.length > MAX_CONE_SITE_INDEX + 1) {
    throw new Error("The historical RGB encoding supports at most 262144 sites.");
  }

  const encodedRgb = new Uint32Array(width * height);
  encodedRgb.fill(CONE_BACKGROUND_RGB);
  const depthFraction = new Float64Array(width * height);
  depthFraction.fill(Infinity);
  const owners = new Int32Array(width * height);
  owners.fill(-1);
  const radius = width + height;
  const apothem = radius * Math.cos(Math.PI / CONE_NODES);

  for (let siteIndex = 0; siteIndex < points.length; siteIndex += 1) {
    const site = points[siteIndex];
    const color = encodeSiteIndex(siteIndex);
    for (let y = 0; y < height; y += 1) {
      const dy = y - site.y;
      const dySquared = dy * dy;
      for (let x = 0; x < width; x += 1) {
        const index = y * width + x;
        const dx = x - site.x;
        const distanceSquared = dx * dx + dySquared;
        const currentRadius = depthFraction[index] * radius;
        // A polygonal cone cannot be higher than a circular cone at the same
        // distance. Skip a facet lookup only when it cannot win the depth test.
        if (distanceSquared >= currentRadius * currentRadius) continue;

        let angle = Math.atan2(dy, dx);
        if (angle < 0) angle += FULL_TURN;
        const facet = Math.min(CONE_NODES - 1, Math.floor(angle / SECTOR_ANGLE));
        const fraction = (dx * NORMAL_X[facet] + dy * NORMAL_Y[facet]) / apothem;
        if (fraction > 1 || fraction >= depthFraction[index]) continue;

        // With the orthographic course camera, higher z wins. Since every
        // cone has z = 1 - 301t, the smaller facet fraction is nearer.
        depthFraction[index] = fraction;
        encodedRgb[index] = color;
      }
    }
  }

  // Decode the same RGB buffer the software depth test wrote; background 127
  // decodes outside the site range and remains the -1 sentinel.
  for (let index = 0; index < owners.length; index += 1) {
    const decoded = decodeSiteIndex(encodedRgb[index]);
    if (decoded < points.length) owners[index] = decoded;
  }

  return { width, height, encodedRgb, owners, depthFraction };
}
