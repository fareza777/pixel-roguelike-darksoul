import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class Browser {
  constructor(proc, ws, profile, port) {
    this.proc = proc;
    this.ws = ws;
    this.profile = profile;
    this.port = port;
    this.id = 0;
    this.pending = new Map();
    this.listeners = new Map();
    this.errors = [];
    this.logs = [];
    ws.addEventListener("message", (ev) => this.onMessage(ev.data));
  }

  onMessage(raw) {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    if (msg.id !== undefined) {
      const p = this.pending.get(msg.id);
      if (!p) return;
      this.pending.delete(msg.id);
      if (msg.error) p.reject(new Error(msg.error.message + " " + JSON.stringify(msg.error.data || "")));
      else p.resolve(msg.result);
      return;
    }
    const key = msg.method;
    if (key === "Runtime.exceptionThrown") {
      const d = msg.params.exceptionDetails;
      this.errors.push(`${d.text} ${d.exception?.description || ""}`.trim());
    }
    if (key === "Log.entryAdded" && msg.params.entry.level === "error") {
      this.errors.push(`${msg.params.entry.text} (${msg.params.entry.url || ""})`);
    }
    if (key === "Runtime.consoleAPICalled" && msg.params.type === "error") {
      this.errors.push(msg.params.args.map((a) => a.value ?? a.description ?? "").join(" "));
    }
    if (key === "Runtime.consoleAPICalled") {
      this.logs.push({ type: msg.params.type, text: msg.params.args.map((a) => a.value ?? a.description ?? "").join(" ") });
    }
    const arr = this.listeners.get(key);
    if (arr) for (const fn of arr.slice()) fn(msg.params);
  }

  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error("CDP timeout: " + method));
        }
      }, 30000);
    });
  }

  once(method) {
    return new Promise((resolve) => {
      const fn = (params) => {
        const arr = this.listeners.get(method);
        arr.splice(arr.indexOf(fn), 1);
        resolve(params);
      };
      if (!this.listeners.has(method)) this.listeners.set(method, []);
      this.listeners.get(method).push(fn);
    });
  }

  async eval(fn, ...args) {
    const expr = typeof fn === "string" ? fn : `(${fn.toString()})(${args.map((a) => JSON.stringify(a)).join(",")})`;
    const res = await this.send("Runtime.evaluate", {
      expression: expr,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true,
    });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
    }
    return res.result?.value;
  }

  async waitFor(fn, timeout = 15000, label = "condition") {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      let v;
      try { v = await this.eval(fn); } catch { v = false; }
      if (v) return v;
      await sleep(100);
    }
    throw new Error(`Timed out waiting for ${label}`);
  }

  async key(code, key, holdMs = 60, vk = 0) {
    const base = { code, key, windowsVirtualKeyCode: vk || key.toUpperCase().charCodeAt(0), nativeVirtualKeyCode: vk || key.toUpperCase().charCodeAt(0) };
    await this.send("Input.dispatchKeyEvent", { type: "keyDown", ...base });
    if (holdMs) await sleep(holdMs);
    await this.send("Input.dispatchKeyEvent", { type: "keyUp", ...base });
  }

  async keyDown(code, key, vk = 0) {
    await this.send("Input.dispatchKeyEvent", {
      type: "keyDown", code, key,
      windowsVirtualKeyCode: vk || key.toUpperCase().charCodeAt(0),
      nativeVirtualKeyCode: vk || key.toUpperCase().charCodeAt(0),
    });
  }

  async keyUp(code, key, vk = 0) {
    await this.send("Input.dispatchKeyEvent", {
      type: "keyUp", code, key,
      windowsVirtualKeyCode: vk || key.toUpperCase().charCodeAt(0),
      nativeVirtualKeyCode: vk || key.toUpperCase().charCodeAt(0),
    });
  }

  async screenshot(name, full = false) {
    const params = { format: "png", fromSurface: true, captureBeyondViewport: false };
    if (!full) {
      const rect = await this.eval(() => {
        const el = document.getElementById("stage");
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      });
      if (rect && rect.width > 0) params.clip = { ...rect, scale: 1 };
    }
    const res = await this.send("Page.captureScreenshot", params);
    const { writeFile } = await import("node:fs/promises");
    await writeFile(name, Buffer.from(res.data, "base64"));
    return name;
  }

  async close() {
    try { this.ws.close(); } catch {}
    try { this.proc.kill(); } catch {}
    await sleep(300);
    try { await rm(this.profile, { recursive: true, force: true }); } catch {}
  }
}

export async function launch({ port = 9444, width = 1024, height = 640 } = {}) {
  const profile = await mkdtemp(join(tmpdir(), "ashen-cdp-"));
  const proc = spawn(CHROME, [
    "--headless=new",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    "--hide-scrollbars",
    "--mute-audio",
    "--autoplay-policy=no-user-gesture-required",
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
    `--window-size=${width},${height}`,
    "about:blank",
  ], { stdio: "ignore" });

  let pageWs = null;
  const start = Date.now();
  while (Date.now() - start < 15000) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      const pages = await res.json();
      const page = pages.find((p) => p.type === "page");
      if (page?.webSocketDebuggerUrl) { pageWs = page.webSocketDebuggerUrl; break; }
    } catch {}
    await sleep(150);
  }
  if (!pageWs) {
    try { proc.kill(); } catch {}
    throw new Error("Chrome did not expose a page target");
  }
  const ws = new WebSocket(pageWs);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
  const browser = new Browser(proc, ws, profile, port);
  await browser.send("Page.enable");
  await browser.send("Runtime.enable");
  await browser.send("Log.enable");
  await browser.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
  return browser;
}
