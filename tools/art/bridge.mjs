// Thin client for the Pixelorama-MCP HTTP bridge (127.0.0.1:7373).
export const BRIDGE = "http://127.0.0.1:7373";

export async function cmd(tool, params = {}) {
  const res = await fetch(`${BRIDGE}/command`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tool, params }),
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(`[${tool}] ${data.error ?? JSON.stringify(data)}`);
  }
  return data.data;
}

export async function health() {
  const r = await fetch(`${BRIDGE}/health`);
  return r.json();
}

export async function flush(grid, W, H, layer) {
  const flat = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const c = grid[y * W + x];
      if (c) flat.push(x, y, c);
    }
  }
  const STRIDE = 3;
  const CHUNK = 15000 * STRIDE;
  for (let i = 0; i < flat.length; i += CHUNK) {
    const params = { data: flat.slice(i, i + CHUNK) };
    if (layer) params.layer = layer;
    await cmd("draw_pixels_fast", params);
  }
  return flat.length / STRIDE;
}

export function closeCanvas() {
  return cmd("close_canvas");
}
