# ⚡ OpenWhip™ Corporate AR — Work Productivity Maxx™

An Augmented Reality (AR) corporate performance weapon & desktop utility to align workplace synergy and keep your coworkers productive!

Hold your phone, see an authentic **Executive 3D Fist & Luxury Watch** gripping a tactical bullwhip, and **physically swing your phone** (or tap the screen) to deliver high-speed performance reviews directly to your coworkers!

---

## 🌟 Key Features

- 💼 **LinkedIn Executive Corporate Theme**: Complete corporate satire UI with `WorkforceSynergy™`, `OPEN TO WHIP` status, `🗣️ Top Voice`, and corporate performance review badges.
- 👔 **Executive Wardrobe Choices**: 4 distinct corporate personas with custom 3D sleeve cuffs, materials, and luxury wristwatches:
  1. **The C-Suite Executive**: Tailored navy wool suit, Rolex Gold Oyster Perpetual with emerald bezel, and Italian walnut whip (+50% Executive Presence).
  2. **Silicon Valley 10x Hustler**: Patagonia tech fleece, Apple Watch Ultra with activity rings, and matte carbon whip (+100% Disruptive Velocity).
  3. **Wall Street Titan**: Midnight wool, 24K solid gold gauntlet, diamond chronometer with ruby dial, and bullion whip (+200% Golden Parachute Bonus).
  4. **Cyber Director 2077**: Exoskeleton bracer, chrome prosthetic, holographic watch, and plasma whip (+300% Overclock Yield).
- 📈 **Work Productivity Maxx™ Tachometer Gauge**: Dynamic 14-segment LED tachometer power gauge and progress track with corporate milestones (`1.0x Base` ➔ `2.0x Overtime` ➔ `3.0x Synergy` ➔ `4.0x MAXX ⚡`) and corporate rank tiers (`UNPAID INTERN` ➔ `OVERTIME SPECIALIST` ➔ `VP OF SYNERGY` ➔ `10X UNICORN MAXX`).
- 🎙️ **Live Microphone Audio + Whip SFX Recording**: Mixed directly into the recording stream without feedback loops, capturing both your live voice commentary and thunderous whip cracks.
- 📼 **Universal .MP4 Export (H.264 + AAC)**: Prioritizes H.264 video with AAC audio so downloaded recordings play sound natively across Windows Media Player, QuickTime, iOS Photos, Android Gallery, Slack, and WhatsApp.
- 📺 **Broadcast Watermark (No App UI in Video)**: Recorded video embeds a broadcast-style corporate scorecard with the live multiplier, 14-segment gauge, combo pill, and audit stamp without recording any DOM button UI.
- 📲 **Direct Messaging App Sharing**: Native mobile file sharing to WhatsApp, Slack, LinkedIn, Instagram, TikTok, and Discord, plus instant deep-link shortcuts (`💬 WhatsApp`, `💼 LinkedIn`, `💾 Save .MP4`, `📋 Copy Announcement`).
- 📱 **Physical Device Swing & 3D Gyroscope**: Whip cracks on physical downward flick with haptic feedback; tilting the phone tilts the 3D fist with responsive gyro parallax.
- 🔄 **Front/Back Camera Switch**: Seamlessly flip between rear camera (audit coworkers) and selfie camera.
- 🖥️ **Desktop Screen Overlay**: Whip buttons and Claude Code directly on your desktop screen with global hotkey `Ctrl + Shift + W`.

---

## ☁️ Cloudflare Pages Deployment (Recommended)

**OpenWhip AR is 100% compatible with Cloudflare Pages!** The `web/` directory is completely client-side (HTML5, Three.js, Web Audio API, WebGL) and runs on Cloudflare's ultra-fast Edge network with free HTTPS certificates (mandatory for mobile camera and motion sensor APIs).

### Method A: Deploy with 1 Click from GitHub
1. Fork or push to your GitHub repo (`https://github.com/ausiher/whipyourcoworker`).
2. Log in to your [Cloudflare Dashboard](https://dash.cloudflare.com/) ➔ **Compute (Workers & Pages)** ➔ **Create application** ➔ **Pages** ➔ **Connect to Git**.
3. Select `whipyourcoworker` repository.
4. Set Build Settings:
   - **Framework preset**: None
   - **Build command**: *(leave empty)*
   - **Build output directory**: `web`
5. Click **Save and Deploy**. Your app will be live at `https://whipyourcoworker.pages.dev` with automatic HTTPS, camera, and sensor access!

### Method B: Deploy via Wrangler CLI
```bash
npx wrangler pages deploy web --project-name=whipyourcoworker
```

---

## 🚀 Quick Start (Local AR Server)

### 1. Start the Server
```bash
npm install
npm run server
```

The server will automatically generate self-signed SSL certificates and display a **QR code** directly in your terminal:

```
╔══════════════════════════════════════════════════════════════╗
║               ⚡ WHIP YOUR COWORKER AR SERVER ⚡              ║
╚══════════════════════════════════════════════════════════════╝

 Local:   http://localhost:3000
 HTTPS:   https://192.168.0.103:3443
```

### 2. Connect Your Phone
1. Connect your phone to the same Wi-Fi network.
2. Scan the terminal **QR code** with your phone's camera.
3. Accept the self-signed SSL warning (required by mobile browsers to access camera & accelerometer).
4. **Swing your phone** or tap anywhere to whip!

---

## 🕹️ Controls

| Platform | Action | Effect |
| :--- | :--- | :--- |
| **Mobile** | **Physical Phone Swing** | Flick phone downward to crack the whip at the center crosshair + haptic vibe |
| **Mobile** | **Device Tilt / Gyro** | Real-time 3D weapon rotation matching phone orientation |
| **Mobile / Desktop** | **Tap / Click Anywhere** | Whip lashes out to strike the exact touched location |
| **Rapid Tapping / Swings** | **Frenzy Escalation** | Multiplies speed up to `4.0x`, increases whip crack pitch, shifts trail colors |
| **Header Controls** | **🔴 REC** | Start/stop video recording with synchronized whip audio, replay & share |
| **Header Controls** | **🔄 Flip** | Switch between rear camera and selfie camera |
| **Header Controls** | **🔊 Sound** | Toggle whip sound effects on/off |
| **Header Controls** | **⛶ Fullscreen** | Toggle immersive fullscreen AR mode |

---

## 🖥️ Mode 2: Desktop Screen Overlay

Whip Claude and UI buttons directly on your desktop screen:

```bash
npm start
```

### Desktop Controls:
- **Global Hotkey**: Press `Ctrl + Shift + W` (or `Alt + W`) to summon or dismiss the whip overlay.
- **Left Click**: Snaps the whip to the nearest Windows UI button with impact spark FX.
- **Right Click**: Dismisses the overlay.

---

## 📄 License

MIT License. Have fun and whip responsibly!