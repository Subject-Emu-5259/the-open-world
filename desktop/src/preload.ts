// ============================================
// The Open World — Preload bridge
// ============================================
// Minimal, safe surface exposed to the loaded pages. The game is a
// web app and doesn't need Node access; this exists so native
// features have a place to live without loosening contextIsolation.
//
// Its one load-bearing job: expose window.__TOW_PC_CONFIG__
// ({apiBase}) BEFORE the game script runs. game.ts reads that value
// at module top-level (towApiBase) and the runtime value wins over
// the build-time __TOW_API_BASE__ define. The value comes from the
// main process over a synchronous IPC call — preload runs before any
// page script, so the config is in place by the time game.js loads.

import { contextBridge, ipcRenderer } from 'electron';

interface TowPcConfig {
  apiBase: string;
}

function readConfig(): TowPcConfig {
  try {
    const cfg = ipcRenderer.sendSync('tow:get-config') as TowPcConfig | null;
    if (cfg && typeof cfg.apiBase === 'string') return { apiBase: cfg.apiBase };
  } catch {
    /* fall through — the client falls back to its build-time define */
  }
  return { apiBase: '' };
}

contextBridge.exposeInMainWorld('__TOW_PC_CONFIG__', readConfig());

contextBridge.exposeInMainWorld('towDesktop', {
  platform: process.platform,
  isDesktop: true,
});
