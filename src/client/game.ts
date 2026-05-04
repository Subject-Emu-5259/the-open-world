import {} from "@devvit/web/client";

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

function clientSave(slot: number, player: PlayerState): boolean {
  try {
    const saves = clientLoadAll();
    saves[slot] = {
      ...player,
      savedAt: Date.now(),
      playTime: (saves[slot]?.playTime || 0) + 0.1
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(saves));
    console.log(`[save] Saved to slot ${slot}: ${player.name}`);
    return true;
  } catch (e) {
    console.error('[save] Failed to save:', e);
    return false;
  }
}

function clientLoad(slot: number): PlayerState | null {
  try {
    const saves = clientLoadAll();
    return saves[slot] || null;
  } catch (e) {
    console.error('[save] Failed to load:', e);
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

// ============================================
// GAME STATE
// ============================================

const state = {
  currentScreen: 'landing' as GameScreen,
  player: null as PlayerState | null,
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
          Build your story in the Mid-South and beyond
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
  
  setTimeout(() => {
    state.currentScreen = 'main-menu';
    render();
  }, 2400);
}

// ============================================
// MAIN MENU
// ============================================

function renderMainMenu() {
  if (!rootEl) return;
  
  const hasContinue = state.player !== null;
  
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
              <span class="btn-sub">${state.player?.name} · ${state.player?.city}</span>
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
          <p class="menu-credits">Built on Reddit Devvit</p>
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
    case 'new':
      startGame();
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
      const loadedPlayer = clientLoad(slotId);
      
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
      
      <div class="updates-list">
        <div class="update-card">
          <div class="update-header">
            <span class="update-version">v0.15.0</span>
            <span class="update-date">April 15, 2026</span>
          </div>
          <h3 class="update-title">World Expansion & Natural Language</h3>
          <ul class="update-features">
            <li>🌍 <strong>28 Cities</strong> across 7 regions worldwide</li>
            <li>🗣️ <strong>Natural Language</strong> - Speak naturally, game understands</li>
            <li>📱 <strong>Phone System</strong> - Check emails, messages, voicemails</li>
            <li>🎭 <strong>Crime System</strong> - Risk and consequences</li>
            <li>🏆 <strong>Achievements</strong> - 30+ milestones to unlock</li>
            <li>🧭 <strong>Travel System</strong> - Bus, flight, train, drive</li>
          </ul>
        </div>
        
        <div class="update-card">
          <div class="update-header">
            <span class="update-version">v0.2.0</span>
            <span class="update-date">April 14, 2026</span>
          </div>
          <h3 class="update-title">Property & Storyline Systems</h3>
          <ul class="update-features">
            <li>🏠 <strong>Real Estate</strong> - Buy properties with mortgages</li>
            <li>📈 <strong>Investments</strong> - Stocks, bonds, crypto, business</li>
            <li>📖 <strong>Storyline Events</strong> - Job interviews, life events</li>
            <li>🌤️ <strong>Weather Effects</strong> - Impacts work and exploration</li>
            <li>🚗 <strong>Vehicles</strong> - Buy, sell, garage system</li>
          </ul>
        </div>
        
        <div class="update-card">
          <div class="update-header">
            <span class="update-version">v0.1.0</span>
            <span class="update-date">April 12, 2026</span>
          </div>
          <h3 class="update-title">Initial Release</h3>
          <ul class="update-features">
            <li>🎮 <strong>Core Engine</strong> - Time, economy, social systems</li>
            <li>👥 <strong>42 NPCs</strong> - Schedules, personalities, relationships</li>
            <li>💼 <strong>Jobs</strong> - Work, get paid, build career</li>
            <li>📚 <strong>Skills</strong> - Study to improve abilities</li>
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

function handleGameMenuAction(action: string) {
  const gameMenu = document.getElementById('game-menu');
  const convEl = document.getElementById('conversation');
  
  switch (action) {
    case 'resume':
      if (gameMenu) gameMenu.style.display = 'none';
      break;
    case 'save':
      // Save to slot 1 by default
      if (state.player) {
        const success = clientSave(1, state.player);
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
        clientSave(1, state.player);
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

async function startGame() {
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
    const res = await fetch("/api/init", { method: "GET" });
    const data: GameData = await res.json().catch(() => null);
    
    if (data?.hasPlayer && data.player) {
      state.player = data.player;
      state.currentScreen = 'game';
      render();
    } else {
      // Show character creation
      showCharacterCreation();
    }
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

// Start with landing screen
render();