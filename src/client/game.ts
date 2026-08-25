import {} from "@devvit/web/client";
import { GAME_VERSION } from '../shared/version.js';

// ============================================
// THE OPEN WORLD - Client Application
// ============================================

interface GameData {
  hasPlayer: boolean;
  player?: PlayerState;
  dashboard?: string;
  text?: string;
  npcName?: string;
}

interface PlayerState {
  name: string;
  city: string;
  district: string;
  money: number;
  energy: number;
  health: number;
  happiness: number;
  job: { title: string; employer: string } | null;
  // Time fields
  gameTime?: string;
  gameDate?: string;
  weather?: { temp: number; condition: string };
}

interface SaveSlot {
  id: string;
  playerName: string;
  city: string;
  money: number;
  lastSaved: number;
  playTime: number;
}

type GameScreen = 'landing' | 'main-menu' | 'game' | 'settings' | 'load' | 'updates';

// ============================================
// SAVE SYSTEM (Client-Side LocalStorage)
// ============================================

const SAVE_KEY = 'the_open_world_saves';

async function clientSave(slot: number, player: PlayerState): Promise<boolean> {
  try {
    // 1. Local Save
    const saves = clientLoadAll();
    saves[slot] = {
      ...player,
      savedAt: Date.now(),
      playTime: (saves[slot]?.playTime || 0) + 0.1
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(saves));
    
    // 2. Server Save (Background sync)
    fetch("/api/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slot, player }),
    }).catch(e => console.warn("[save] Server sync failed:", e));

    console.log(`[save] Saved to slot ${slot}: ${player.name}`);
    return true;
  } catch (e) {
    console.error('[save] Failed to save:', e);
    return false;
  }
}

async function clientLoad(slot: number): Promise<PlayerState | null> {
  try {
    // 1. Try Server Load first
    const res = await fetch(`/api/load?slot=${slot}`);
    if (res.ok) {
      const data = await res.json();
      if (data.player) {
        console.log(`[load] Loaded ${data.player.name} from server`);
        // Sync back to local
        const saves = clientLoadAll();
        saves[slot] = data.player;
        localStorage.setItem(SAVE_KEY, JSON.stringify(saves));
        return data.player;
      }
    }

    // 2. Fallback to Local Storage
    const saves = clientLoadAll();
    const player = saves[slot];
    if (player) {
      console.log(`[load] Loaded ${player.name} from local storage. Migrating to server...`);
      // Migrate to server
      fetch("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot, player }),
      }).catch(e => console.warn("[load] Migration failed:", e));
      return player;
    }
    
    return null;
  } catch (e) {
    console.error('[load] Failed to load:', e);
    return null;
  }
}

function clientDelete(slot: number): boolean {
  try {
    const saves = clientLoadAll();
    delete saves[slot];
    localStorage.setItem(SAVE_KEY, JSON.stringify(saves));
    console.log(`[save] Deleted slot ${slot}`);
    return true;
  } catch (e) {
    console.error('[save] Failed to delete:', e);
    return false;
  }
}

function clientLoadAll(): Record<number, any> {
  try {
    const data = localStorage.getItem(SAVE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    return {};
  }
}

function clientGetSaveSlots(): SaveSlot[] {
  const saves = clientLoadAll();
  const slots: SaveSlot[] = [];
  
  for (let i = 1; i <= 3; i++) {
    const save = saves[i];
    if (save) {
      slots.push({
        id: String(i),
        playerName: save.name || 'Unknown',
        city: save.city?.replace('_', ' ') || 'Unknown',
        money: save.money || 0,
        lastSaved: save.savedAt || 0,
        playTime: save.playTime || 0,
      });
    } else {
      slots.push({
        id: String(i),
        playerName: 'Empty Slot',
        city: '-',
        money: 0,
        lastSaved: 0,
        playTime: 0,
      });
    }
  }
  
  return slots;
}

// Check server for any available save (slot 1..3)
async function clientCheckServerSaves(): Promise<PlayerState | null> {
  try {
    for (let slot = 1; slot <= 3; slot++) {
      const res = await fetch(`/api/load?slot=${slot}`);
      if (res.ok) {
        const data = await res.json();
        if (data.player) return data.player;
      }
    }
  } catch (e) {
    // Server unavailable - localStorage will be the fallback
  }
  return null;
}

// Detect the best available save (server wins, then localStorage, then none)
async function clientDetectSave(): Promise<PlayerState | null> {
  // Prefer server save
  const serverPlayer = await clientCheckServerSaves();
  if (serverPlayer) {
    const saves = clientLoadAll();
    saves[1] = serverPlayer; // keep server primary save mirrored locally
    localStorage.setItem(SAVE_KEY, JSON.stringify(saves));
    return serverPlayer;
  }

  // Fallback to localStorage
  const saves = clientLoadAll();
  const localPlayer = saves[1] || saves[2] || saves[3] || null;
  if (localPlayer) {
    // Try to migrate local save to server in background
    fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot: 1, player: localPlayer }),
    }).catch(() => {});
    return localPlayer;
  }

  return null;
}

// ============================================
// GAME STATE
// ============================================

const state = {
  currentScreen: 'landing' as GameScreen,
  player: null as PlayerState | null,
  saveAvailable: false as boolean,
  conversationHistory: [] as Array<{ role: string; content: string }>,
  settings: {
    soundEnabled: true,
    musicEnabled: true,
    fontSize: 'medium' as 'small' | 'medium' | 'large',
    theme: 'dark' as 'dark' | 'light',
  },
  saveSlots: [] as SaveSlot[],
};

// const appEl = document.querySelector<HTMLDivElement>(".app");
const rootEl = document.getElementById("game-root");

// ============================================
// FULLSCREEN (Removed due to Reddit iframe restrictions)
// ============================================

function isFullscreen(): boolean {
  return false;
}

// ============================================
// RENDER FUNCTIONS
// ============================================

function render() {
  if (!rootEl) return;
  
  switch (state.currentScreen) {
    case 'landing':
      renderLandingScreen();
      break;
    case 'main-menu':
      renderMainMenu();
      break;
    case 'game':
      renderGameScreen();
      break;
    case 'settings':
      renderSettingsScreen();
      break;
    case 'load':
      renderLoadScreen();
      break;
    case 'updates':
      renderUpdatesScreen();
      break;
  }
}

// ============================================
// LANDING SCREEN (Splash)
// ============================================

function renderLandingScreen() {
  if (!rootEl) return;
  
  rootEl.innerHTML = `
    <div class="screen landing-screen">
      <div class="landing-backdrop"></div>
      <div class="landing-content">
        <div class="landing-logo-container">
          <div class="landing-logo">🌍</div>
        </div>
        <h1 class="landing-title">THE OPEN WORLD</h1>
        <p class="landing-tagline">A Life Simulation</p>
        <div class="landing-subtitle">
          Build your story across the globe
        </div>
        <div class="loading-container">
          <div class="loading-bar">
            <div class="loading-progress"></div>
          </div>
          <p class="loading-text">Loading world data...</p>
        </div>
      </div>
    </div>
  `;
  
  // Animate loading, then transition to main menu
  setTimeout(() => {
    const loadingText = rootEl?.querySelector('.loading-text');
    if (loadingText) loadingText.textContent = 'Preparing NPCs...';
  }, 800);
  
  setTimeout(() => {
    const loadingText = rootEl?.querySelector('.loading-text');
    if (loadingText) loadingText.textContent = 'Initializing economy...';
  }, 1600);
  
  setTimeout(async () => {
    // Probe for an existing save while the splash is showing
    const detected = await clientDetectSave();
    if (detected) {
      state.player = detected;
      state.saveAvailable = true;
    }
    state.currentScreen = 'main-menu';
    render();
  }, 2400);
}

// ============================================
// MAIN MENU
// ============================================

function renderMainMenu() {
  if (!rootEl) return;
  
  const hasContinue = state.player !== null || state.saveAvailable;
  
  rootEl.innerHTML = `
    <div class="screen menu-screen">
      <div class="menu-backdrop"></div>
      <div class="menu-content">
        <div class="menu-header">
          <div class="menu-logo">🌍</div>
          <h1 class="menu-title">THE OPEN WORLD</h1>
        </div>
        
        <div class="menu-options">
          ${hasContinue ? `
            <button class="menu-btn primary" data-action="continue">
              <div class="btn-content">
                <span class="btn-icon">▶</span>
                <span class="btn-text">Continue</span>
              </div>
              <span class="btn-sub">${state.player?.name ? `${state.player.name} · ${state.player.city}` : 'Resume your saved life'}</span>
            </button>
          ` : `
            <button class="menu-btn primary" data-action="new">
              <div class="btn-content">
                <span class="btn-icon">✦</span>
                <span class="btn-text">New Game</span>
              </div>
              <span class="btn-sub">Begin a new life</span>
            </button>
          `}
          
          <button class="menu-btn" data-action="load">
            <div class="btn-content">
              <span class="btn-icon">📂</span>
              <span class="btn-text">Load Game</span>
            </div>
            <span class="btn-sub">Continue from save</span>
          </button>
          
          <button class="menu-btn" data-action="settings">
            <div class="btn-content">
              <span class="btn-icon">⚙</span>
              <span class="btn-text">Settings</span>
            </div>
            <span class="btn-sub">Audio, display, controls</span>
          </button>
        </div>
        
        <div class="menu-footer">
          <p class="menu-credits">v${GAME_VERSION} | Built on Reddit Devvit</p>
        </div>
      </div>
    </div>
  `;
  
  // Bind menu actions
  rootEl.querySelectorAll('.menu-btn, .menu-small-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const action = (e.currentTarget as HTMLElement).dataset.action;
      handleMenuAction(action || '');
    });
  });
  

}

function handleMenuAction(action: string) {
  switch (action) {
    case 'continue':
      startGame();
      break;
    case 'new':
      // Force a fresh character even if an auto-save exists
      state.player = null;
      state.saveAvailable = false;
      startGame(true);
      break;
    case 'load':
      state.currentScreen = 'load';
      render();
      break;
    case 'settings':
      state.currentScreen = 'settings';
      render();
      break;
    case 'updates':
      state.currentScreen = 'updates';
      render();
      break;
  }
}

// ============================================
// LOAD GAME SCREEN
// ============================================

async function renderLoadScreen() {
  if (!rootEl) return;
  
  // Load saves from client-side localStorage
  const slots = clientGetSaveSlots();
  state.saveSlots = slots;
  
  rootEl.innerHTML = `
    <div class="screen load-screen">
      <div class="screen-header">
        <button class="back-btn" data-action="back">← Back</button>
        <h2>Load Game</h2>
        <div style="width: 60px"></div>
      </div>
      
      <div class="save-slots">
        ${slots.map(slot => slot.playerName === 'Empty Slot' ? `
          <button class="save-slot empty" data-action="new">
            <div class="slot-empty-icon">+</div>
            <div class="slot-empty-text">Empty Slot</div>
          </button>
        ` : `
          <button class="save-slot" data-slot-id="${slot.id}">
            <div class="slot-header">
              <span class="slot-name">${slot.playerName}</span>
              <span class="slot-time">${formatPlayTime(slot.playTime)}</span>
            </div>
            <div class="slot-details">
              <span>📍 ${slot.city}</span>
              <span>💰 $${slot.money.toLocaleString()}</span>
            </div>
            <div class="slot-footer">
              <span>Last played: ${formatTimeAgo(slot.lastSaved)}</span>
              <button class="delete-btn" data-delete="${slot.id}">✕</button>
            </div>
          </button>
        `).join('')}
        
        <button class="save-slot new-game-btn" data-action="new">
          <div class="slot-empty-icon">+</div>
          <div class="slot-empty-text">Start New Game</div>
        </button>
      </div>
    </div>
  `;
  
  // Bind actions
  rootEl.querySelectorAll('[data-action]').forEach(el => {
    el.addEventListener('click', () => {
      const action = el.getAttribute('data-action');
      if (action === 'back') {
        state.currentScreen = 'main-menu';
        render();
      } else if (action === 'new') {
        startGame();
      }
    });
  });
  
  // Save slot clicks - load from client storage
  rootEl.querySelectorAll('.save-slot[data-slot-id]').forEach(el => {
    el.addEventListener('click', async (e) => {
      // Don't load if clicking delete button
      if ((e.target as HTMLElement).classList.contains('delete-btn')) return;
      
      const slotId = parseInt(el.getAttribute('data-slot-id') || '0', 10);
      const loadedPlayer = await clientLoad(slotId);
      
      if (loadedPlayer) {
        state.player = loadedPlayer;
        state.currentScreen = 'game';
        render();
      }
    });
  });
  
  // Delete button handler - use client-side delete
  rootEl.querySelectorAll('.delete-btn[data-delete]').forEach(el => {
    el.addEventListener('click', async (e) => {
      e.stopPropagation();
      const slotId = parseInt(el.getAttribute('data-delete') || '0', 10);
      if (confirm('Delete this save? This cannot be undone.')) {
        const success = clientDelete(slotId);
        if (success) {
          renderLoadScreen();
        }
      }
    });
  });
}

// ============================================
// SETTINGS SCREEN
// ============================================

function renderSettingsScreen() {
  if (!rootEl) return;
  
  rootEl.innerHTML = `
    <div class="screen settings-screen">
      <div class="screen-header">
        <button class="back-btn" data-action="back">← Back</button>
        <h2>Settings</h2>
        <div style="width: 60px"></div>
      </div>
      
      <div class="settings-list">
        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">Sound Effects</span>
            <span class="setting-desc">UI sounds and feedback</span>
          </div>
          <label class="toggle">
            <input type="checkbox" ${state.settings.soundEnabled ? 'checked' : ''} data-setting="soundEnabled">
            <span class="toggle-slider"></span>
          </label>
        </div>
        
        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">Background Music</span>
            <span class="setting-desc">Ambient city sounds</span>
          </div>
          <label class="toggle">
            <input type="checkbox" ${state.settings.musicEnabled ? 'checked' : ''} data-setting="musicEnabled">
            <span class="toggle-slider"></span>
          </label>
        </div>
        
        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">Font Size</span>
            <span class="setting-desc">Text readability</span>
          </div>
          <select class="setting-select" data-setting="fontSize">
            <option value="small" ${state.settings.fontSize === 'small' ? 'selected' : ''}>Small</option>
            <option value="medium" ${state.settings.fontSize === 'medium' ? 'selected' : ''}>Medium</option>
            <option value="large" ${state.settings.fontSize === 'large' ? 'selected' : ''}>Large</option>
          </select>
        </div>
        
        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">Theme</span>
            <span class="setting-desc">Color scheme</span>
          </div>
          <select class="setting-select" data-setting="theme">
            <option value="dark" ${state.settings.theme === 'dark' ? 'selected' : ''}>Dark</option>
            <option value="light" ${state.settings.theme === 'light' ? 'selected' : ''}>Light</option>
          </select>
        </div>
      </div>
      
      <div class="settings-footer">
        <button class="menu-btn" data-action="apply">
          Apply Settings
        </button>
      </div>
    </div>
  `;
  
  // Bind actions
  rootEl.querySelectorAll('[data-action]').forEach(el => {
    el.addEventListener('click', () => {
      const action = el.getAttribute('data-action');
      if (action === 'back') {
        state.currentScreen = 'main-menu';
        render();
      } else if (action === 'apply') {
        applySettings();
        state.currentScreen = 'main-menu';
        render();
      }
    });
  });
  
  // Settings changes
  rootEl.querySelectorAll('[data-setting]').forEach(el => {
    el.addEventListener('change', (e) => {
      const setting = el.getAttribute('data-setting') as keyof typeof state.settings;
      const value = (e.target as HTMLInputElement).type === 'checkbox' 
        ? (e.target as HTMLInputElement).checked 
        : (e.target as HTMLSelectElement).value;
      if (setting) {
        (state.settings as any)[setting] = value;
      }
    });
  });
}

function applySettings() {
  // Apply font size class
  document.body.classList.remove('font-small', 'font-medium', 'font-large');
  document.body.classList.add(`font-${state.settings.fontSize}`);
  
  // Apply theme
  document.body.classList.remove('theme-dark', 'theme-light');
  document.body.classList.add(`theme-${state.settings.theme}`);
}

// ============================================
// UPDATE LOGS SCREEN
// ============================================

function renderUpdatesScreen() {
  if (!rootEl) return;
  
  rootEl.innerHTML = `
    <div class="screen updates-screen">
      <div class="screen-header">
        <button class="back-btn" data-action="back">← Back</button>
        <h2>Update Logs</h2>
        <div style="width: 60px"></div>
      </div>
      
              <div class="updates-container">
        <div class="update-item">
          <span class="update-version">v0.99.3</span>
          <span class="update-date">August 25, 2026</span>
          <ul>
            <li>🧠 <strong>NPC Memory Fixed</strong> — Relationships now save correctly as JSON, so NPCs remember your name, conversation history, and how they feel about you across commands and reloads.</li>
            <li>💾 <strong>Save Serialization Hardened</strong> — Server-side Redis save now preserves the full relationship record; no more lost NPC context on refresh.</li>
            <li>🛠️ <strong>Code Cleanup</strong> — Removed stale version header and unified relationship record usage across game engine and storyline engine.</li>
          </ul>
        </div>
        
                              <div class="update-item">
          <span class="update-version">v0.101.0</span>
          <span class="update-date">August 25, 2026</span>
          <ul>
            <li>💾 <strong>Server-Authoritative Auto-Save</strong> - Every command is saved to Redis before the response returns; a synchronous beacon flush also fires on tab close/refresh.</li>
            <li>🧠 <strong>NPC Memory Fixed</strong> - Relationships now save as plain records so NPCs remember your name, chat history, and mood between messages and across reloads.</li>
            <li>🗣️ <strong>No More "What's yours?" Loop</strong> - NPCs recognize "I'm...", "I am...", "call me...", and "my name is..." and stop asking once they know you.</li>
            <li>🤖 <strong>Local NPC Reply Generator</strong> - New AI-style bridge produces natural greetings, answers, small talk, and farewells from memory and relationship context.</li>
            <li>🤝 <strong>Assist & Quests</strong> - Relationship changes from helping NPCs and completing quests now persist correctly.</li>
          </ul>
        </div>
              <div class="update-item">
          <span class="update-version">v0.99.2</span>
          <span class="update-date">August 25, 2026</span>
          <ul>
            <li>💾 <strong>Save System Rebuilt</strong> - Slot 1 auto-saves to server (Redis) every command and on refresh; localStorage is an offline fallback; splash screen auto-detects and resumes your game.</li>
            <li>💬 <strong>NPC Conversation Rebuilt</strong> - NPCs now greet first when you talk to them, and conversations can be exited with "bye", "end", "leave", or "exit".</li>
            <li>🛠️ <strong>Social Polish</strong> - "people" shows city-wide NPCs when no-one is in your exact district; "text" reads relationships correctly.</li>
            <li>📋 <strong>Developer Update</strong> - Patch focuses on save persistence and NPC conversation quality.</li>
          <li>🛠️ <strong>Save System Rebuilt</strong> - Redis-first persistence; Continue button appears only when a save exists; auto-save after every command; background save on tab close/minimize; server fallback keyed by username + install ID.</li>
          <li>✅ <strong>/api/init GET now checks Redis</strong> - returns the saved player instead of forcing a fresh start.</li>
          <li>🗣️ <strong>NPCs now respond</strong> - talk/greet triggers a contextual greeting; NPCs react to relationship, mood, district, time and role.</li>
          <li>👋 <strong>Conversations can end</strong> - say bye/goodbye/exit/leave/later/im out/ima head out to exit conversation mode.</li>
          <li>🔧 <strong>text [name] SMS fixed</strong> - relationship object lookup works and gives relationship-aware replies.</li>
          <li>🧹 <strong>Dead duplicate server.ts removed</strong> - single source of truth in src/server/index.ts.</li>
          <li>🔁 <strong>Version Sync</strong> - Bumped to v0.99.2 with server-first save flow and NPC greeting polish.</li>
          </ul>
        </div>
                <div class="update-item">
          <span class="update-version">v0.99.0</span>
          <span class="update-date">August 24, 2026</span>
          <ul>
            <li>🌍 <strong>Global NPC Expansion</strong> - Added 10 new international characters across Tokyo, London, Paris, Berlin, Dubai, Mexico City, Toronto, and Sydney. Meet a Harajuku designer, a Notting Hill bookshop owner, a Seine boat captain, and more.</li>
            <li>🎲 <strong>New City Encounters</strong> - Five fresh random events: Pop-Up Street Gallery, Language Exchange Picnic, Vintage Record Fair, Rooftop Herb Garden, and Impromptu Dance Parade.</li>
            <li>🔁 <strong>Version Sync</strong> - Bumped all project files to v0.99.0.</li>
          </ul>
        </div>
                <div class="update-item">
          <span class="update-version">v0.98.0</span>
          <span class="update-date">August 21, 2026</span>
          <ul>
            <li>🌍 <strong>Global NPC Expansion</strong> - Added 10 new international characters across London, Tokyo, Paris, Berlin, Dubai, Mexico City, Toronto, and Sydney. Meet sushi apprentices, jazz archivists, macaron bakers, and more.</li>
            <li>🎲 <strong>New City Encounters</strong> - Five fresh random events: Sandstorm Shortcut, Rooftop Yoga Class, Underground Comedy Night, Book Club on the Train, and Midnight Dog Walker Meetup.</li>
            <li>🔁 <strong>Version Sync</strong> - Bumped all project files to v0.98.0.</li>
          </ul>
        </div>
              <div class="update-item">
          <span class="update-version">v0.97.0</span>
          <span class="update-date">August 17, 2026</span>
          <ul>
            <li>🌍 <strong>Global NPC Expansion</strong> - Added 10 new international characters across London, Tokyo, Paris, Berlin, Dubai, Mexico City, Toronto, and Sydney. Meet spice merchants, bonsai masters, perfume blenders, and opera house ushers.</li>
            <li>🎲 <strong>New City Encounters</strong> - Five fresh random events: Riverboat Jazz Invitation, Neighborhood Power Outage, Foreign Film Pop-Up, Street Cart Free Sample, and Lost Tourist Needs Directions.</li>
            <li>🔁 <strong>Version Sync</strong> - Bumped all project files to v0.97.0.</li>
          </ul>
        </div>
                <div class="update-item">
          <span class="update-version">v0.96.0</span>
          <span class="update-date">August 14, 2026</span>
          <ul>
            <li>🌍 <strong>More International NPCs</strong> - Added 10 new characters across London, Tokyo, Paris, Berlin, Dubai, Mexico City, Toronto, and Sydney. Meet street poets, retro game shop owners, art collectors, and harbour tour guides.</li>
            <li>🎲 <strong>More Random Events</strong> - Five fresh city-life moments: Rooftop Garden Invitation, City-Wide Scavenger Hunt, Street Magician Disappearing Act, Vintage Polaroid Swap, and Midnight Ramen Queue.</li>
            <li>🔁 <strong>Version Sync</strong> - Bumped all project files to v0.96.0.</li>
          </ul>
        </div>
                <div class="update-item">
          <span class="update-version">v0.95.0</span>
          <span class="update-date">August 13, 2026</span>
          <ul>
            <li>🌍 <strong>International NPCs</strong> - Added 10 new characters in Tokyo, London, Paris, Berlin, Dubai, Mexico City, Toronto, and Sydney. Meet jazz club managers, pub landlords, fragrance designers, yacht brokers, surf instructors, and more.</li>
            <li>🎲 <strong>New City-Life Events</strong> - Five fresh random events: Airport Upgrade Offer, Train Seat Swap, Local Sports Rivalry, Famous Food Queue, and Street Photographer.</li>
            <li>🔁 <strong>Version Sync</strong> - Bumped all project files to v0.95.0.</li>
          </ul>
        </div>
                              <div class="update-item">
          <span class="update-version">v0.93.0</span>
          <span class="update-date">August 11, 2026</span>
          <ul>
            <li>🌍 <strong>International NPCs</strong> - Added 10 new characters across Tokyo, London, Paris, Berlin, Dubai, Mexico City, Toronto, and Sydney. Meet bonsai artists, opera singers, parfumeurs, street-fashion designers, and more.</li>
            <li>🎲 <strong>Global City Events</strong> - Five fresh random events: night markets, transit serenades, lost tourists, historic building tours, and free street haircuts.</li>
            <li>🔁 <strong>Version Sync</strong> - Bumped all project files to v0.93.0.</li>
          </ul>
        </div>
                <div class="update-item">
          <span class="update-version">v0.92.0</span>
          <span class="update-date">August 10, 2026</span>
          <ul>
            <li>🏎️ <strong>Vehicle Racing</strong> - New "race" and "race [track]" commands let you enter street, drag, and circuit competitions. Vehicle type, condition, driving skill, and a little luck decide the podium.</li>
            <li>🏁 <strong>City Tracks</strong> - Race locations in Los Angeles, Miami, Memphis, Atlanta, Detroit, and Tokyo with licensed and underground events.</li>
            <li>🔁 <strong>Version Sync</strong> - Bumped all project files to v0.92.0.</li>
          </ul>
        </div>
                <div class="update-item">
          <span class="update-version">v0.92.0</span>
          <span class="update-date">August 9, 2026</span>
          <ul>
            <li>🏘️ <strong>Expanded Property Market</strong> - Real estate listings now span Nashville, Atlanta, Chicago, New York, Los Angeles, Miami, Houston, Dallas, and Phoenix. Build a cross-country empire.</li>
            <li>🌅 <strong>Dynamic Arrivals</strong> - Travel descriptions now reflect the time of day for more immersive city entries.</li>
            <li>🔁 <strong>Version Sync</strong> - Bumped all project files to v0.92.0.</li>
          </ul>
        </div>
                <div class="update-item">
          <span class="update-version">v0.91.0</span>
          <span class="update-date">August 8, 2026</span>
          <ul>
            <li>🎯 <strong>New Achievements</strong> - Peak Fitness, Renaissance Person, and Trophy Hunter medals now reward stat mastery and completionists.</li>
            <li>🎲 <strong>New Random Events</strong> - Impromptu block parties, sudden rainstorms, street chess, hidden bookstore sales, and rooftop movie nights add fresh city flavor.</li>
            <li>🐛 <strong>Travel Fix</strong> - Removed duplicate police checkpoint encounter when arriving in a city with high heat.</li>
            <li>🔁 <strong>Version Sync</strong> - Bumped all project files to v0.91.0.</li>
          </ul>
        </div>
                <div class="update-item">
          <span class="update-version">v0.90.0</span>
          <span class="update-date">August 7, 2026</span>
          <ul>
            <li>🌍 <strong>International NPC Expansion</strong> - 10 new global NPCs in Berlin, Paris, Tokyo, Dubai, Mexico City, Toronto, and Sydney, including ballet instructors, yacht brokers, and comedy bookers.</li>
            <li>🎲 <strong>New Random Events</strong> - Sunrise yoga, bookstore readings, vintage car parades, community cleanups, and late-night food trucks add more everyday city flavor.</li>
            <li>🔁 <strong>Version Sync</strong> - Bumped all project files to v0.90.0.</li>
          </ul>
        </div>
        <div class="update-item">
          <span class="update-version">v0.89.1</span>
          <span class="update-date">August 6, 2026</span>
          <ul>
            <li>🛠️ <strong>Devvit Review Fix</strong> - Inline webview now opens in Expanded Mode, eliminating the inline scroll trap. Menu post creation uses idempotency keys to prevent duplicate game posts.</li>
            <li>🔁 <strong>Version Sync</strong> - Bumped all project files to v0.89.1.</li>
          </ul>
        </div>
        <div class="update-item">
          <span class="update-version">v0.89.0</span>
          <span class="update-date">August 6, 2026</span>
          <ul>
            <li>🌍 <strong>International NPCs</strong> - 10 new global NPCs in Dubai, Tokyo, Paris, Berlin, Mexico City, London, Toronto, and Sydney, from spice merchants to grime DJs.</li>
            <li>🚗 <strong>Travel Atmosphere</strong> - First-time arrival descriptions now cover 13 missing domestic cities, giving every destination a unique welcome.</li>
            <li>🎲 <strong>New Random Events</strong> - Street buskers, lost tourists, community gardens, free samples, and rooftop invites bring more city-life moments.</li>
            <li>🏆 <strong>New Travel Achievements</strong> - Global Citizen and Passport Collector medals now track your international city visits automatically.</li>
            <li>🔄 <strong>Version Sync</strong> - Unified version to v0.89.0 project-wide.</li>
          </ul>
        </div>
        <div class="update-item">
          <span class="update-version">v0.82.0</span>
          <span class="update-date">July 27, 2026</span>
          <ul>
            <li>💬 <strong>Dialogue Depth</strong> - Added apology & rumor intents, NPC awareness of player job/certs/health/stress/record, and conversation continuity.</li>
            <li>🏆 <strong>New Achievements</strong> - Scholar, Master Worker, Veteran, and Continental medals added.</li>
            <li>🔄 <strong>Version Sync</strong> - Unified version to v0.82.0 project-wide.</li>
          </ul>
        </div>
        <div class="update-item">
          <span class="update-version">v0.81.0</span>
          <span class="update-date">July 26, 2026</span>
          <ul>
            <li>🌍 <strong>International NPC Expansion</strong> - Added 8 new characters across Toronto, Sydney, Mexico City, Berlin, Dubai, and Paris.</li>
            <li>🎬 <strong>City Event Expansion</strong> - Added new random events in New York, Atlanta, and Nashville.</li>
            <li>🔄 <strong>Version Sync</strong> - Unified version to v0.81.0 project-wide.</li>
          </ul>
        </div>
        <div class="update-item">
          <span class="update-version">v0.80.0</span>
          <ul>
            <li>🔄 <strong>Version Sync</strong> - Unified version to v0.80.0 project-wide.</li>
          </ul>
        </div>

        <div class="update-item">
          <span class="update-version">v0.76.0</span>
          <span class="update-date">June 5, 2026</span>
          <ul>
            <li>🎓 <strong>Career & Specialization Overhaul</strong> - Added new international schools (London, Tokyo, Paris, Sydney) and high-tier career paths requiring specialized certifications.</li>
            <li>🌍 <strong>Global Expansion</strong> - Expanded the job market with elite international positions in tech, finance, and culinary arts.</li>
            <li>🔄 <strong>Version Sync</strong> - Unified version to v0.76.0 project-wide.</li>
          </ul>
        </div>

        <div class="update-item">
          <span class="update-version">v0.73.0</span>
          <span class="update-date">May 27, 2026</span>
          <ul>
            <li>🌍 <strong>Global Expansion</strong> - Added 6 new NPCs across Berlin, Mexico City, and Dubai.</li>
            <li>🛡️ <strong>New Factions</strong> - Introduced <strong>Berlin Underground</strong> and <strong>Dubai Elite</strong>.</li>
            <li>💬 <strong>Dialogue Depth</strong> - NPCs now have city-specific greetings and relationship-based responses.</li>
            <li>🔄 <strong>Version Sync</strong> - Unified version to v0.67.0 project-wide.</li>
          </ul>
        </div>

        <div class="update-item">
          <span class="update-version">v0.65.0</span>
          <ul class="update-list">
            <li>🔫 <strong>Crime Expansion</strong> - Added new crime types: <em>Scam</em> (Cybercrime) and <em>Grand Theft Auto</em>.</li>
            <li>🚨 <strong>Criminal Records</strong> - Arrests are now tracked and displayed in your status profile.</li>
            <li>📈 <strong>Dynamic Odds</strong> - Crime success rates now scale with Intelligence and Driving skills.</li>
            <li>🛠️ <strong>Stability</strong> - Version synchronization across all systems.</li>
          </ul>
        </div>

        <div class="update-item">
          <span class="update-version">v0.64.0</span>
          <ul class="update-list">
            <li>📱 <strong>Phone OS v2.0</strong> - Comprehensive communication overhaul with contact lists, search, and drafts.</li>
            <li>👥 <strong>Auto-Contacts</strong> - Talking to NPCs now automatically saves them to your phone.</li>
            <li>🎬 <strong>Life Moments</strong> - Expanded dynamic event system with 8+ new location-specific random events.</li>
            <li>🌍 <strong>Global Flavor</strong> - Unique events added for Manhattan, Shibuya, London, Berlin, Dubai, and more.</li>
          </ul>
        </div>

        <div class="update-item">
          <span class="update-version">v0.61.0</span>
          <ul class="update-list">
            <li>🌍 <strong>Global Expansion</strong> - Added 5 new international NPCs in London, Tokyo, Paris, Toronto, and Sydney.</li>
            <li>👥 <strong>Social Depth</strong> - Expanded NPC roster to 125 unique characters.</li>
            <li>🛠️ <strong>Maintenance</strong> - Routine stability checks and version synchronization.</li>
          </ul>
        </div>

        <div class="update-item">
          <span class="update-version">v0.60.0</span>
          <ul class="update-list">
            <li>🛡️ <strong>Critical Stability</strong> - Fixed server-side crashes in Achievement Engine.</li>
            <li>📊 <strong>Data Integrity</strong> - Defensive type-casting for player stats.</li>
            <li>💬 <strong>Chat Sync</strong> - Fixed NPC identity and formatting issues.</li>
          </ul>
        </div>

        <div class="update-item">
          <span class="update-version">v0.58.16</span>
          <ul class="update-list">
            <li>📊 <strong>Data Integrity</strong> - Defensive type-casting for player stats.</li>
            <li>💬 <strong>Chat Sync</strong> - Fixed NPC identity and formatting issues.</li>
          </ul>
        </div>

        <div class="update-item">
          <span class="update-version">v0.57.1</span>
          <ul class="update-list">
            <li>💬 <strong>Chat Stability</strong> - Resolved "blank bubble" bug in conversations.</li>
            <li>🏷️ <strong>Sender Identity</strong> - NPCs now correctly display their names in chat.</li>
            <li>📈 <strong>Skill Logic</strong> - Fixed job-to-skill mapping for accurate progression.</li>
            <li>📝 <strong>Formatting</strong> - Fixed broken newline escapes in system messages.</li>
          </ul>
        </div>

        <div class="update-item">
          <span class="update-version">v0.57.0</span>
          <ul class="update-list">
            <li>📈 <strong>Skill Overhaul</strong> - New granular skill progression system.</li>
            <li>📊 <strong>Skill Tracking</strong> - Track levels and XP for specialized abilities.</li>
            <li>🏦 <strong>Bank Fixes</strong> - Resolved critical issues with the new banking system.</li>
          </ul>
        </div>

        <div class="update-item">
          <span class="update-version">v0.56.0</span>
          <div class="update-card">
            <h3>🏦 BANKING SYSTEM</h3>
            <ul>
              <li>💰 <strong>Cash & Savings</strong> - Keep your money safe in the bank.</li>
              <li>📥 <strong>Deposit & Withdraw</strong> - New commands to manage your liquid assets.</li>
              <li>🏦 <strong>Bank Command</strong> - Check your balances and net worth at any time.</li>
            </ul>
          </div>
        </div>

        <div class="update-item">
          <span class="update-version">v0.55.0</span>
          <div class="update-card">
            <h3>🛠️ VEHICLE MAINTENANCE & PARTS</h3>
            <ul>
              <li>🔧 <strong>Condition & Mileage</strong> - Vehicles now track wear and tear.</li>
              <li>🛢️ <strong>Maintenance</strong> - New "maintain" and "repair vehicle" commands.</li>
              <li>🚗 <strong>Wear & Tear</strong> - Long distance travel affects vehicle performance.</li>
            </ul>
          </div>
        </div>

        <div class="update-item">
          <span class="update-version">v0.54.0</span>
          <div class="update-card">
            <h3>📱 PHONE & EMAIL OVERHAUL</h3>
            <ul>
              <li>📧 <strong>New Email System</strong> - Fully functional inbox and compose features.</li>
              <li>💬 <strong>Dynamic Messaging</strong> - NPCs now send more relevant texts and job offers.</li>
              <li>📢 <strong>Notifications</strong> - Improved phone notification system.</li>
            </ul>
          </div>
        </div>
        
        <div class="update-item">
          <span class="update-version">v0.53.0</span>
          <span class="update-date">May 21, 2026</span>
          <ul class="update-list">
            <li>🏆 <strong>Achievements</strong> - Full achievement system with 36 milestones.</li>
            <li>👥 <strong>New NPCs</strong> - Added 5 new international characters to meet.</li>
            <li>🛠️ <strong>Optimization</strong> - Improved engine performance and bug fixes.</li>
          </ul>
        </div>
        
        <div class="update-item">
          <span class="update-version">v0.52.0</span>
          <span class="update-date">April 15, 2026</span>
          <ul class="update-list">
            <li>🔫 <strong>Crime System</strong> - New crimes: pickpocket, shoplift, robbery, and heist.</li>
            <li>🚨 <strong>Consequences</strong> - Risk of arrest and prison time based on crime type and location.</li>
            <li>👮 <strong>Reputation</strong> - Criminal activities now affect your social and criminal standing.</li>
            <li>🔄 <strong>Version Sync</strong> - Project-wide update to v0.52.0.</li>
          </ul>
        </div>
        
        <div class="update-item">
          <span class="update-version">v0.51.0</span>
          <span class="update-date">April 15, 2026</span>
        </div>
        
        <div class="update-item">
          <span class="update-version">v0.50.0</span>
          <span class="update-date">April 15, 2026</span>
          <ul class="update-list">
            <li>🌍 <strong>16 New International NPCs</strong> across London, Tokyo, Paris, Berlin, Dubai, and more.</li>
            <li>👔 <strong>Finance Moguls & Tech Founders</strong> in global business hubs.</li>
            <li>🎨 <strong>Cultural Icons</strong> - Artists, chefs, and DJs added to international cities.</li>
            <li>📈 <strong>Stable Version</strong> - Critical bug fixes and type stability.</li>
          </ul>
        </div>
        
        <div class="update-item">
          <span class="update-version">v0.15.0</span>
          <span class="update-date">April 15, 2026</span>
          <h3 class="update-title">World Expansion & Natural Language</h3>
          <ul class="update-list">
            <li>🌍 <strong>28 Cities</strong> across 7 regions worldwide</li>
            <li>🗣️ <strong>Natural Language</strong> - Speak naturally, game understands</li>
            <li>📱 <strong>Phone System</strong> - Check emails, messages, voicemails</li>
            <li>🎭 <strong>Crime System</strong> - Risk and consequences</li>
            <li>🏆 <strong>Achievements</strong> - 30+ milestones to unlock</li>
            <li>🧭 <strong>Travel System</strong> - Bus, flight, train, drive</li>
          </ul>
        </div>
        
        <div class="update-item">
          <span class="update-version">v0.2.0</span>
          <span class="update-date">April 14, 2026</span>
          <h3 class="update-title">Property & Storyline Systems</h3>
          <ul class="update-list">
            <li>🏠 <strong>Real Estate</strong> - Buy properties with mortgages</li>
            <li>📈 <strong>Investments</strong> - Stocks, bonds, crypto, business</li>
            <li>📖 <strong>Storyline Events</strong> - Job interviews, life events</li>
            <li>🌤️ <strong>Weather Effects</strong> - Impacts work and exploration</li>
            <li>🚗 <strong>Vehicles</strong> - Buy, sell, garage system</li>
          </ul>
        </div>
        
        <div class="update-item">
          <span class="update-version">v0.1.0</span>
          <span class="update-date">April 12, 2026</span>
          <h3 class="update-title">Initial Release</h3>
          <ul class="update-list">
            <li>🎮 <strong>Core Engine</strong> - Time, economy, social systems</li>
            <li>👥 <strong>42 NPCs</strong> - Schedules, personalities, relationships</li>
            <li>💼 <strong>Jobs</strong> - Work, get paid, build career</li>
            <li>📚 <strong>Skills</strong> - Study to improve abilities</li>
          </ul>
        </div>
        <div class="update-card">
          <span class="update-version">v0.68.0</span>
          <span class="update-date">May 30, 2026</span>
          <ul class="update-list">
            <li>🌍 <strong>Global Expansion</strong> - Added new random events for London, Tokyo, and Dubai.</li>
            <li>🏡 <strong>Luxury Real Estate</strong> - Added premium property listings in international hubs.</li>
            <li>🔄 <strong>Version Sync</strong> - Unified version to v0.68.0 project-wide.</li>
          </ul>
        </div>
        <div class="update-card">
          <span class="update-version">v0.70.0</span>
          <span class="update-date">June 1, 2026</span>
          <ul class="update-list">
            <li>⚔️ <strong>Faction Wars</strong> - Added Influence, Support, and Sabotage mechanics.</li>
            <li>📊 <strong>Political Influence</strong> - Factions now compete for dominance in their HQ cities.</li>
            <li>🔄 <strong>Version Sync</strong> - Unified version to v0.70.0 project-wide.</li>
          </ul>
        </div>
        <div class="update-card">
          <span class="update-version">v0.69.0</span>
          <span class="update-date">May 31, 2026</span>
          <ul class="update-list">
            <li>🌍 <strong>Global Expansion</strong> - Added new random events for Toronto, Berlin, Mexico City, and Sydney.</li>
            <li>🔄 <strong>Version Sync</strong> - Unified version to v0.69.0 project-wide.</li>
          </ul>
        </div>
        <div class="update-card">
          <span class="update-version">v0.71.0</span>
          <span class="update-date">June 2, 2026</span>
          <ul class="update-list">
            <li>🎭 <strong>NPC Expansion</strong> - Added new city-specific greetings and dialogue variety.</li>
            <li>🌍 <strong>Mid-South Events</strong> - New random life moments for Memphis and West Memphis.</li>
            <li>🔄 <strong>Version Sync</strong> - Unified version to v0.71.0 project-wide.</li>
          </ul>
        </div>
        <div class="update-card">
          <span class="update-version">v0.72.0</span>
          <span class="update-date">June 3, 2026</span>
          <ul class="update-list">
            <li>👑 <strong>Faction Achievements</strong> - Added new milestones for faction leadership and sabotage.</li>
            <li>🏰 <strong>Real Estate Tycoon</strong> - New achievement for owning properties in 5+ cities.</li>
            <li>🎭 <strong>Dynamic Faction Events</strong> - Rival confrontations and mysterious bribes added to the world.</li>
            <li>🔄 <strong>Version Sync</strong> - Project-wide update to v0.72.0.</li>
          </ul>
        </div>
      </div>
    </div>
  `;
  
  // Bind back button
  rootEl.querySelector('[data-action="back"]')?.addEventListener('click', () => {
    state.currentScreen = 'main-menu';
    render();
  });
}

// ============================================
// GAME SCREEN
// ============================================

function renderGameScreen() {
  if (!rootEl || !state.player) return;
  
  const player = state.player;
  const time = player.gameTime || '6:00 AM';
  const date = player.gameDate || 'Monday, January 1, 2024';
  const weather = player.weather || { temp: 65, condition: 'clear' };
  const cityDisplay = formatCityName(player.city);
  const districtDisplay = formatDistrictName(player.district);
  
  rootEl.innerHTML = `
    <div class="screen game-screen ${isFullscreen() ? 'fullscreen' : ''}">
      <header class="game-header">
        <div class="header-left">
          <button class="menu-toggle" id="menu-toggle">☰</button>
          <span class="logo-mini">🌍</span>
        </div>
        <div class="header-center">
          <div class="location-time">
            <span class="location">📍 ${districtDisplay} · ${cityDisplay}</span>
            <span class="time-display">🕐 ${time}</span>
            <span class="date-display">📅 ${date}</span>
            <span class="weather-display">🌡️ ${weather.temp}°F ${weather.condition}</span>
          </div>
        </div>
        <div class="header-right">
          <span class="header-status-indicator"></span>
        </div>
      </header>
      
      <div class="stats-hud">
        <div class="stat-item money">
          <span class="stat-icon">💰</span>
          <span class="stat-value" id="stat-money">$${player.money}</span>
          <span class="stat-label">Cash</span>
        </div>
        <div class="stat-item energy">
          <span class="stat-icon">⚡</span>
          <span class="stat-value" id="stat-energy">${player.energy}</span>
          <span class="stat-label">Energy</span>
        </div>
        <div class="stat-item health">
          <span class="stat-icon">❤️</span>
          <span class="stat-value" id="stat-health">${player.health}</span>
          <span class="stat-label">Health</span>
        </div>
        <div class="stat-item happiness">
          <span class="stat-icon">😊</span>
          <span class="stat-value" id="stat-happy">${player.happiness}</span>
          <span class="stat-label">Happy</span>
        </div>
      </div>
      
      <div class="quick-actions">
        <button class="quick-btn" data-cmd="status">📊 Status</button>
        <button class="quick-btn" data-cmd="explore">👀 Explore</button>
        <button class="quick-btn" data-cmd="work">💼 Work</button>
        <button class="quick-btn" data-cmd="talk">💬 Talk</button>
        <button class="quick-btn" data-cmd="help">❓ Help</button>
      </div>
      
      <div class="conversation" id="conversation">
        <div class="msg system">Welcome back, ${player.name}. What would you like to do?</div>
      </div>
      
      <div class="input-area">
        <div class="input-wrapper">
          <input type="text" class="cmd-input" id="cmd-input" placeholder="What do you want to do?" autocomplete="off" autofocus>
          <button class="send-btn" id="send-btn">➤</button>
        </div>
      </div>
      
      <!-- Game Menu Overlay -->
      <div class="game-menu-overlay" id="game-menu" style="display: none;">
        <div class="game-menu-content">
          <h3>Game Menu</h3>
          <button class="menu-item" data-action="resume">▶ Resume</button>
          <button class="menu-item" data-action="save">💾 Save Game</button>
          <button class="menu-item" data-action="settings">⚙ Settings</button>
          <button class="menu-item danger" data-action="quit">🚪 Quit to Menu</button>
        </div>
      </div>
    </div>
  `;
  
  bindGameEvents();
}

function bindGameEvents() {
  const convEl = document.getElementById('conversation');
  const cmdInput = document.getElementById('cmd-input') as HTMLInputElement;
  const sendBtn = document.getElementById('send-btn');
  const menuToggle = document.getElementById('menu-toggle');
  const gameMenu = document.getElementById('game-menu');
  
  // Send command
  const sendCommand = () => {
    const input = cmdInput?.value.trim();
    if (!input) return;
    handleCommand(input, convEl!);
    cmdInput.value = '';
  };
  
  sendBtn?.addEventListener('click', sendCommand);
  cmdInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendCommand();
  });
  
  // Quick actions
  document.querySelectorAll('.quick-btn[data-cmd]').forEach(btn => {
    btn.addEventListener('click', () => {
      const cmd = btn.getAttribute('data-cmd');
      if (cmd && cmdInput) {
        cmdInput.value = cmd;
        sendCommand();
      }
    });
  });
  
  // Menu toggle
  menuToggle?.addEventListener('click', () => {
    if (gameMenu) {
      gameMenu.style.display = gameMenu.style.display === 'none' ? 'flex' : 'none';
    }
  });
  
  // Menu actions
  document.querySelectorAll('.game-menu-content .menu-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-action');
      handleGameMenuAction(action || '');
    });
  });
  

}

async function handleGameMenuAction(action: string) {
  const gameMenu = document.getElementById('game-menu');
  const convEl = document.getElementById('conversation');
  
  switch (action) {
    case 'resume':
      if (gameMenu) gameMenu.style.display = 'none';
      break;
    case 'save':
      // Save to slot 1 by default
      if (state.player) {
        const success = await clientSave(1, state.player);
        if (success && convEl) {
          addMessage(convEl, 'system', '💾 Game saved to slot 1!');
        } else if (convEl) {
          addMessage(convEl, 'system', '❌ Failed to save game.');
        }
      }
      if (gameMenu) gameMenu.style.display = 'none';
      break;
    case 'settings':
      state.currentScreen = 'settings';
      render();
      break;
    case 'quit':
      // Auto-save before quitting
      if (state.player) {
        await clientSave(1, state.player);
      }
      state.currentScreen = 'main-menu';
      render();
      break;
  }
}

async function handleCommand(input: string, convEl: HTMLElement) {
  // Add player message
  addMessage(convEl, 'player', input);
  
  // Show thinking
  const thinkingEl = addThinking(convEl);
  
  try {
    // Send player state with request (stateless server)
    const res = await fetch("/api/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        input,
        player: state.player  // Send current state
      }),
    });
    const data: GameData = await res.json().catch(() => null);
    
    thinkingEl?.remove();
    
    if (data) {
      const sender = data.npcName || "The World";
      addMessage(convEl, data.npcName ? 'npc' : 'game', data.text || "...", sender);
      
      // Update stats from server response
      if (data.player) {
        state.player = data.player;
        updateStats(data.player);
        // Persist progress automatically after each successful command
        clientSave(1, data.player).catch((e) => console.warn('[autosave] failed', e));
      }
    } else {
      addMessage(convEl, 'system', "Connection lost. Try again.");
    }
  } catch (e) {
    thinkingEl?.remove();
    addMessage(convEl, 'system', "Error processing command.");
  }
}

function addMessage(container: HTMLElement, type: string, content: string, sender?: string) {
  const msgEl = document.createElement('div');
  msgEl.className = `msg ${type}`;
  
  if (sender) {
    msgEl.innerHTML = `
      <div class="msg-sender">${sender}</div>
      <div class="msg-text">${formatText(content)}</div>
    `;
  } else {
    msgEl.innerHTML = formatText(content);
  }
  
  container.appendChild(msgEl);
  container.scrollTop = container.scrollHeight;
  
  state.conversationHistory.push({ role: type === 'player' ? 'user' : 'assistant', content });
}

function addThinking(container: HTMLElement): HTMLElement {
  const msgEl = document.createElement('div');
  msgEl.className = 'msg game thinking';
  msgEl.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
  container.appendChild(msgEl);
  container.scrollTop = container.scrollHeight;
  return msgEl;
}

function formatText(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}

function updateStats(player: PlayerState) {
  // Update HUD stats
  const moneyEl = document.getElementById('stat-money');
  const energyEl = document.getElementById('stat-energy');
  const healthEl = document.getElementById('stat-health');
  const happyEl = document.getElementById('stat-happy');
  
  if (moneyEl) moneyEl.textContent = `$${player.money}`;
  if (energyEl) energyEl.textContent = String(player.energy);
  if (healthEl) healthEl.textContent = String(player.health);
  if (happyEl) happyEl.textContent = String(player.happiness);
  
  // Update header location/time/date/weather
  const locationEl = document.querySelector('.header-center .location');
  const timeEl = document.querySelector('.header-center .time');
  const dateEl = document.querySelector('.header-center .date');
  const weatherEl = document.querySelector('.header-center .weather');
  
  if (locationEl) {
    const districtDisplay = formatDistrictName(player.district);
    const cityDisplay = formatCityName(player.city);
    locationEl.innerHTML = `📍 ${districtDisplay} · ${cityDisplay}`;
  }
  
  if (timeEl && player.gameTime) {
    timeEl.innerHTML = `🕐 ${player.gameTime}`;
  }
  
  if (dateEl && player.gameDate) {
    dateEl.innerHTML = `📅 ${player.gameDate}`;
  }
  
  if (weatherEl && player.weather) {
    const conditionEmoji = player.weather.condition === 'rainy' ? '🌧️' 
      : player.weather.condition === 'stormy' ? '⛈️'
      : player.weather.condition === 'hot' ? '🔥'
      : player.weather.condition === 'cold' ? '❄️'
      : player.weather.condition === 'cloudy' ? '☁️'
      : '☀️';
    weatherEl.innerHTML = `🌡️ ${player.weather.temp}°F ${conditionEmoji}`;
  }
}

// ============================================
// GAME START
// ============================================

async function startGame(forceNew = false) {
  if (!rootEl) return;
  
  rootEl.innerHTML = `
    <div class="screen loading-screen">
      <div class="loading-content">
        <div class="loading-logo">🌍</div>
        <p>Loading world...</p>
      </div>
    </div>
  `;
  
  try {
    // New Game bypasses any autosave
    if (forceNew) {
      showCharacterCreation();
      return;
    }

    // If we already have a player (from auto-load), go straight in
    if (state.player) {
      state.saveAvailable = true;
      state.currentScreen = 'game';
      render();
      return;
    }

    // Try loading the primary server/local save
    const loaded = await clientLoad(1);
    if (loaded) {
      state.player = loaded;
      state.saveAvailable = true;
      state.currentScreen = 'game';
      render();
      return;
    }

    // No save found - create a character
    showCharacterCreation();
  } catch (e) {
    console.error("Failed to start game:", e);
    state.currentScreen = 'main-menu';
    render();
  }
}

function showCharacterCreation() {
  if (!rootEl) return;
  
  rootEl.innerHTML = `
    <div class="screen create-screen">
      <div class="create-content">
        <h2>Create Your Character</h2>
        <div class="create-form">
          <input type="text" id="char-name" class="create-input" placeholder="Your name" maxlength="20" autofocus>
          
          <div class="create-section">
            <label>Background</label>
            <select id="char-bg" class="create-select">
              <option value="working_class">Working Class - $400, +craftsmanship</option>
              <option value="student">Student - $150, +charisma</option>
              <option value="corporate">Corporate - $900, +charisma</option>
              <option value="hustler">Hustler - $300, +driving</option>
              <option value="creative">Creative - $250, +charisma</option>
              <option value="unemployed">Unemployed - $50, +fitness</option>
            </select>
          </div>
          
          <button class="create-btn" id="create-submit">Begin Life</button>
        </div>
      </div>
    </div>
  `;
  
  const submitBtn = document.getElementById('create-submit');
  const nameInput = document.getElementById('char-name') as HTMLInputElement;
  const bgSelect = document.getElementById('char-bg') as HTMLSelectElement;
  
  submitBtn?.addEventListener('click', async () => {
    const name = nameInput?.value.trim() || 'Traveler';
    const background = bgSelect?.value || 'working_class';
    
    try {
      const res = await fetch("/api/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", firstName: name, background }),
      });
      const data: GameData = await res.json();
      
      if (data?.player) {
        state.player = data.player;
        state.currentScreen = 'game';
        render();
      }
    } catch (e) {
      console.error("Failed to create character:", e);
    }
  });
  
  nameInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitBtn?.click();
  });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatCityName(cityId: string | undefined): string {
  if (!cityId) return 'Unknown';
  switch (cityId) {
    case 'west_memphis': return 'West Memphis, AR';
    case 'memphis': return 'Memphis, TN';
    case 'littlerock': return 'Little Rock, AR';
    case 'southaven': return 'Southaven, MS';
    case 'nashville': return 'Nashville, TN';
    case 'atlanta': return 'Atlanta, GA';
    case 'chicago': return 'Chicago, IL';
    case 'new_orleans': return 'New Orleans, LA';
    case 'new_york': return 'New York, NY';
    case 'los_angeles': return 'Los Angeles, CA';
    case 'miami': return 'Miami, FL';
    case 'houston': return 'Houston, TX';
    case 'dallas': return 'Dallas, TX';
    default: return cityId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
}

function formatDistrictName(districtId: string | undefined): string {
  if (!districtId) return 'Downtown';
  return districtId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function formatPlayTime(hours: number): string {
  return `${hours.toFixed(1)}h played`;
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return `${minutes}m ago`;
}

// ============================================
// KEYBOARD SHORTCUTS
// ============================================

document.addEventListener('keydown', (e) => {
  // ESC to toggle menu
  if (e.key === 'Escape' && state.currentScreen === 'game') {
    const gameMenu = document.getElementById('game-menu');
    if (gameMenu) {
      gameMenu.style.display = gameMenu.style.display === 'none' ? 'flex' : 'none';
    }
  }
  

});

// ============================================
// INITIALIZE
// ============================================


// Save progress when the user leaves/closes the game window
window.addEventListener('beforeunload', () => {
  if (state.player) {
    // Synchronous localStorage flush; server sync is done via clientSave async
    try {
      const saves = clientLoadAll();
      saves[1] = { ...state.player, savedAt: Date.now() };
      localStorage.setItem(SAVE_KEY, JSON.stringify(saves));
    } catch (e) {
      console.warn('[beforeunload] local save failed', e);
    }
  }
});

// Start with landing screen
render();
