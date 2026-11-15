import os

files_to_update = {
    '/home/workspace/Projects/the-open-world/src/client/game.ts': ('v0.34.0', 'v0.35.0'),
    '/home/workspace/Projects/the-open-world/src/server/game-engine.ts': ("GAME_VERSION = '0.34.0'", "GAME_VERSION = '0.35.0'"),
    '/home/workspace/Projects/the-open-world/docs/UPDATE-LOGS.md': ('v0.34.0', 'v0.35.0'),
    '/home/workspace/Projects/the-open-world/docs/roadmap.md': ('v0.34.0', 'v0.35.0'),
}

for path, (old_str, new_str) in files_to_update.items():
    if os.path.exists(path):
        with open(path, 'r') as f:
            content = f.read()
        content = content.replace(old_str, new_str)
        with open(path, 'w') as f:
            f.write(content)
        print(f"Updated {path}")
    else:
        print(f"Not found: {path}")

# Add an entry to the top of the update logs
log_path = '/home/workspace/Projects/the-open-world/docs/UPDATE-LOGS.md'
if os.path.exists(log_path):
    with open(log_path, 'r') as f:
        content = f.read()
    
    new_entry = """## Version 0.35.0 — May 4, 2026

### 🎨 UI/UX Polish & Fullscreen Fix
- **Redesigned Landing/Splash Screen**: Modern look with deep animated backdrop and glassmorphism logo.
- **Redesigned Main Menu**: Polished UI with sleek buttons and subtle glowing effects.
- **Fullscreen Issue Fixed**: Removed non-functional fullscreen buttons/logic since Reddit's iframe blocks it.

---

"""
    
    content = content.replace("---", "---\n\n" + new_entry, 1)
    with open(log_path, 'w') as f:
        f.write(content)
        print("Added new log entry")
