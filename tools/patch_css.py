import re
import os

path = '/home/workspace/Projects/the-open-world/public/game.css'

with open(path, 'r') as f:
    content = f.read()

# Remove the old landing and menu styles using regex, and replace them with new polished CSS
import re

start_landing = content.find('.landing-screen {')
end_landing = content.find('/* ============================================', start_landing)

if start_landing != -1 and end_landing != -1:
    content = content[:start_landing] + content[end_landing:]

start_menu = content.find('.menu-screen {')
end_menu = content.find('/* ============================================', start_menu)

if start_menu != -1 and end_menu != -1:
    content = content[:start_menu] + content[end_menu:]

# Now inject the new styles
new_css = """
/* ============================================
   LANDING & SPLASH SCREEN REDESIGN
   ============================================ */

.landing-screen {
  position: relative;
  justify-content: center;
  align-items: center;
  text-align: center;
  overflow: hidden;
  background: var(--bg-deep);
}

.landing-backdrop {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: 
    radial-gradient(circle at 50% -20%, rgba(99, 102, 241, 0.15) 0%, transparent 60%),
    radial-gradient(circle at 100% 100%, rgba(139, 92, 246, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 0% 100%, rgba(34, 211, 238, 0.05) 0%, transparent 50%);
  z-index: 0;
  animation: pulse-bg 8s ease-in-out infinite alternate;
}

@keyframes pulse-bg {
  0% { opacity: 0.7; transform: scale(1); }
  100% { opacity: 1; transform: scale(1.05); }
}

.landing-content {
  position: relative;
  z-index: 1;
  padding: 60px 40px;
  background: rgba(26, 26, 46, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 32px;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  animation: slideUpFade 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  max-width: 460px;
  width: 90%;
}

@keyframes slideUpFade {
  from { opacity: 0; transform: translateY(40px); }
  to { opacity: 1; transform: translateY(0); }
}

.landing-logo-container {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  width: 120px;
  height: 120px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.2));
  border-radius: 50%;
  margin-bottom: 24px;
  box-shadow: 0 0 40px rgba(99, 102, 241, 0.2), inset 0 0 20px rgba(139, 92, 246, 0.4);
  position: relative;
}

.landing-logo-container::after {
  content: '';
  position: absolute;
  top: -2px; left: -2px; right: -2px; bottom: -2px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple), var(--accent-cyan));
  z-index: -1;
  opacity: 0.5;
  animation: spin 4s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.landing-logo {
  font-size: 64px;
  animation: float-logo 4s ease-in-out infinite;
  filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.5));
}

@keyframes float-logo {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-8px) scale(1.05); }
}

.landing-title {
  font-size: 46px;
  font-weight: 900;
  background: linear-gradient(135deg, #fff, var(--accent-cyan), var(--accent-purple));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: -1.5px;
  margin-bottom: 8px;
  text-shadow: 0 4px 20px rgba(0,0,0,0.3);
}

.landing-tagline {
  font-size: 20px;
  font-weight: 600;
  color: var(--accent-blue);
  margin-bottom: 8px;
  letter-spacing: 2px;
  text-transform: uppercase;
}

.landing-subtitle {
  font-size: 15px;
  color: var(--text-muted);
  margin-bottom: 48px;
  line-height: 1.5;
}

.loading-container {
  background: rgba(0, 0, 0, 0.3);
  padding: 20px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.03);
}

.loading-bar {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  margin: 0 auto 16px;
  overflow: hidden;
  position: relative;
}

.loading-progress {
  width: 0%;
  height: 100%;
  background: linear-gradient(90deg, var(--accent-cyan), var(--accent-blue), var(--accent-purple));
  border-radius: 6px;
  animation: loading 2.4s cubic-bezier(0.65, 0, 0.35, 1) forwards;
  box-shadow: 0 0 15px var(--accent-blue);
}

.loading-text {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
  letter-spacing: 1px;
  animation: pulse-text 1.5s infinite;
}

@keyframes pulse-text {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

/* ============================================
   MAIN MENU REDESIGN
   ============================================ */

.menu-screen {
  position: relative;
  justify-content: center;
  align-items: center;
  padding: 40px;
  background: var(--bg-deep);
}

.menu-backdrop {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: 
    url('data:image/svg+xml;utf8,<svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><circle cx="2" cy="2" r="1" fill="rgba(255,255,255,0.05)"/></svg>'),
    radial-gradient(circle at 20% 30%, rgba(99, 102, 241, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 80% 70%, rgba(139, 92, 246, 0.08) 0%, transparent 50%);
  z-index: 0;
}

.menu-content {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 400px;
  animation: fadeInScale 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes fadeInScale {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.menu-header {
  text-align: center;
  margin-bottom: 48px;
}

.menu-logo {
  font-size: 56px;
  margin-bottom: 12px;
  filter: drop-shadow(0 4px 15px rgba(99, 102, 241, 0.4));
  display: inline-block;
  transition: transform 0.3s ease;
}

.menu-logo:hover {
  transform: scale(1.1) rotate(5deg);
}

.menu-title {
  font-size: 38px;
  font-weight: 900;
  background: linear-gradient(135deg, #fff, var(--accent-blue));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: -1px;
}

.menu-ver {
  font-size: 13px;
  color: var(--accent-cyan);
  margin-top: 8px;
  font-weight: 600;
  letter-spacing: 2px;
  background: rgba(34, 211, 238, 0.1);
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
}

.menu-options {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.menu-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  background: rgba(26, 26, 46, 0.6);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  width: 100%;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.btn-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.menu-btn:hover {
  background: rgba(34, 34, 58, 0.8);
  border-color: rgba(255, 255, 255, 0.15);
  transform: translateY(-4px) scale(1.02);
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.3);
}

.menu-btn.primary {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.15));
  border: 1px solid rgba(99, 102, 241, 0.4);
  box-shadow: 0 8px 25px rgba(99, 102, 241, 0.2);
}

.menu-btn.primary:hover {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(139, 92, 246, 0.25));
  border-color: rgba(99, 102, 241, 0.8);
  box-shadow: 0 15px 35px rgba(99, 102, 241, 0.4);
}

.btn-icon {
  font-size: 24px;
  width: 40px;
  height: 40px;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(0,0,0,0.2);
  border-radius: 12px;
  transition: transform 0.3s ease;
}

.menu-btn:hover .btn-icon {
  transform: scale(1.15);
}

.btn-text {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.btn-sub {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
  background: rgba(0,0,0,0.3);
  padding: 6px 12px;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.menu-btn:hover .btn-sub {
  background: rgba(0,0,0,0.5);
  color: #fff;
}

.menu-footer {
  margin-top: 48px;
  text-align: center;
}

.menu-credits {
  font-size: 13px;
  color: var(--text-muted);
  letter-spacing: 1px;
  text-transform: uppercase;
  font-weight: 600;
  opacity: 0.6;
  transition: opacity 0.3s ease;
}

.menu-credits:hover {
  opacity: 1;
}

"""

# Prepend the new styles
content = new_css + "\n\n" + content

with open(path, 'w') as f:
    f.write(content)

print("Replaced game.css styles successfully")
