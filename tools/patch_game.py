import os

path = '/home/workspace/Projects/the-open-world/src/client/game.ts'
with open(path, 'r') as f:
    content = f.read()

# 1. Redesign Landing Screen
old_landing = """    <div class="screen landing-screen">
      <div class="landing-content">
        <div class="landing-logo">🌍</div>
        <h1 class="landing-title">THE OPEN WORLD</h1>
        <p class="landing-tagline">A Life Simulation</p>
        <div class="landing-subtitle">
          Build your story in the Mid-South and beyond
        </div>
        <div class="loading-bar">
          <div class="loading-progress"></div>
        </div>
        <p class="loading-text">Loading world data...</p>
      </div>
    </div>"""

new_landing = """    <div class="screen landing-screen">
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
    </div>"""

# 2. Redesign Main Menu and remove fullscreen button
old_menu = """    <div class="screen menu-screen">
      <div class="menu-header">
        <div class="menu-logo">🌍</div>
        <h1 class="menu-title">THE OPEN WORLD</h1>
        <p class="menu-ver">v0.34.0</p>
      </div>
      
      <div class="menu-options">
        ${hasContinue ? `
          <button class="menu-btn primary" data-action="continue">
            <span class="btn-icon">▶</span>
            <span class="btn-text">Continue</span>
            <span class="btn-sub">${state.player?.name} · ${state.player?.city}</span>
          </button>
        ` : `
          <button class="menu-btn primary" data-action="new">
            <span class="btn-icon">✦</span>
            <span class="btn-text">New Game</span>
            <span class="btn-sub">Begin a new life</span>
          </button>
        `}
        
        <button class="menu-btn" data-action="load">
          <span class="btn-icon">📂</span>
          <span class="btn-text">Load Game</span>
          <span class="btn-sub">Continue from save</span>
        </button>
        
        <button class="menu-btn" data-action="settings">
          <span class="btn-icon">⚙</span>
          <span class="btn-text">Settings</span>
          <span class="btn-sub">Audio, display, controls</span>
        </button>
      </div>
      
      <div class="menu-footer">
        <button class="menu-small-btn" id="fullscreen-btn" title="Toggle Fullscreen">
          ⛶ Fullscreen
        </button>
        <p class="menu-credits">Built on Reddit Devvit</p>
      </div>
    </div>"""

new_menu = """    <div class="screen menu-screen">
      <div class="menu-backdrop"></div>
      <div class="menu-content">
        <div class="menu-header">
          <div class="menu-logo">🌍</div>
          <h1 class="menu-title">THE OPEN WORLD</h1>
          <p class="menu-ver">v0.34.0</p>
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
    </div>"""

# 3. Remove fullscreen logic
old_fs_logic = """  // Fullscreen button
  const fsBtn = rootEl.querySelector('#fullscreen-btn');
  fsBtn?.addEventListener('click', toggleFullscreen);"""
new_fs_logic = ""

# 4. Remove game screen fullscreen button
old_game_header = """        <div class="header-right">
          <button class="fs-btn" id="game-fs-btn" title="Fullscreen">⛶</button>
        </div>"""
new_game_header = """        <div class="header-right">
          <span class="header-status-indicator"></span>
        </div>"""

# 5. Remove game screen fullscreen logic
old_game_fs_logic = """  // Fullscreen
  fsBtn?.addEventListener('click', toggleFullscreen);"""
new_game_fs_logic = ""

# 6. Remove toggleFullscreen function entirely (or just make it a no-op so we don't break anything else)
old_toggle_fs = """// ============================================
// FULLSCREEN - Works for ENTIRE page, not just iframe
// ============================================

function toggleFullscreen() {
  try {
    // Try to get parent frame for Reddit iframe
    const parentDoc = window.parent?.document;
    if (parentDoc && parentDoc.fullscreenElement) {
      if (parentDoc.exitFullscreen) {
        parentDoc.exitFullscreen();
      }
      return;
    }
    
    // Request fullscreen on parent if in iframe
    if (window.parent && window.parent !== window) {
      try {
        const parentHtml = parentDoc?.documentElement;
        if (parentHtml?.requestFullscreen) {
          parentHtml.requestFullscreen();
          return;
        }
      } catch (e) {
        // Cross-origin restriction - use local fullscreen
      }
    }
    
    // Local fullscreen fallback
    const elem = document.documentElement;
    if (document.fullscreenElement) {
      if (document.exitFullscreen) document.exitFullscreen();
    } else {
      if (elem.requestFullscreen) elem.requestFullscreen();
      // @ts-ignore - webkit prefix
      else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
    }
  } catch (e) {
    console.log("Fullscreen not available");
  }
}

function isFullscreen(): boolean {
  return !!(document.fullscreenElement || 
    // @ts-ignore
    document.webkitFullscreenElement ||
    // @ts-ignore  
    document.mozFullScreenElement);
}"""

new_toggle_fs = """// ============================================
// FULLSCREEN (Removed due to Reddit iframe restrictions)
// ============================================

function isFullscreen(): boolean {
  return false;
}"""

content = content.replace(old_landing, new_landing)
content = content.replace(old_menu, new_menu)
content = content.replace(old_fs_logic, new_fs_logic)
content = content.replace(old_game_header, new_game_header)
content = content.replace(old_game_fs_logic, new_game_fs_logic)
content = content.replace(old_toggle_fs, new_toggle_fs)

# Remove the keyboard shortcut for F
old_f_key = """  // F for fullscreen
  if (e.key === 'f' && state.currentScreen === 'game') {
    const activeEl = document.activeElement;
    if (activeEl?.tagName !== 'INPUT') {
      toggleFullscreen();
    }
  }"""
new_f_key = ""
content = content.replace(old_f_key, new_f_key)

with open(path, 'w') as f:
    f.write(content)

print("Replaced game.ts successfully")