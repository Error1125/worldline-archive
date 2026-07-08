import type { StoredAsset } from "./types";

/**
 * Storage mock。第一版返回本地占位图路径（/public/images/photos 下的 SVG）。
 */
export const mockAssets: StoredAsset[] = [
  {
    id: "asset_ns_01",
    url: "/images/photos/ns-01.svg",
    kind: "image",
    width: 1200,
    height: 800,
    createdAt: "2025-06-01T00:00:00.000Z",
  },
  {
    id: "asset_cw_01",
    url: "/images/photos/cw-01.svg",
    kind: "image",
    width: 1200,
    height: 800,
    createdAt: "2025-06-05T00:00:00.000Z",
  },
  {
    id: "asset_ol_01",
    url: "/images/photos/ol-01.svg",
    kind: "image",
    width: 1200,
    height: 800,
    createdAt: "2025-06-10T00:00:00.000Z",
  },
];
