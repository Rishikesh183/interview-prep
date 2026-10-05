import { getNodesBounds, getViewportForBounds, type Node } from "@xyflow/react";
import { toPng } from "html-to-image";

const PADDING = 80;
const MAX_SIDE = 4000;

function download(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
}

export function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  download(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Renders every node (not just the visible area) to a PNG at ~1:1 scale. */
export async function downloadPng(nodes: Node[], filename: string) {
  const viewport = document.querySelector<HTMLElement>(".react-flow__viewport");
  if (!viewport || nodes.length === 0) throw new Error("Nothing to export.");

  const bounds = getNodesBounds(nodes);
  const width = Math.min(MAX_SIDE, Math.ceil(bounds.width + PADDING * 2));
  const height = Math.min(MAX_SIDE, Math.ceil(bounds.height + PADDING * 2));
  const vp = getViewportForBounds(bounds, width, height, 0.1, 1, 0);

  const dataUrl = await toPng(viewport, {
    backgroundColor: getComputedStyle(document.body).backgroundColor,
    width,
    height,
    pixelRatio: 2,
    style: {
      width: `${width}px`,
      height: `${height}px`,
      transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})`,
    },
  });
  download(dataUrl, filename);
}
