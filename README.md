# ⚡ Whip Your Coworker (OpenWhip AR)

An Augmented Reality (AR) camera weapon filter & desktop utility to crack the whip and keep your coworkers productive!

Hold your phone, see an authentic **3D Cybernetic Anime Gauntlet** held in your right hand, and **physically swing your phone** (or tap the screen) to unleash a high-speed whip crack right into your coworker's face!

---

## 🌟 Key Features

- 📱 **Physical Device Swing Activation**: Whip cracks instantly when you physically flick or swing your phone downward (powered by `DeviceMotionEvent` accelerometer detection with haptic vibration).
- 🤖 **3D Rigged Anime Gauntlet**: High-poly rigged hand with metallic armor plating, gold knuckle carapace, glowing neon cyber conduits, and a tactical bullwhip handle.
- 🎯 **Tactical AR Crosshair**: Precision center reticle so you know exactly where your swing gesture will land.
- ⚡ **Pure Speed Frenzy Multiplier (1.0x – 4.0x)**: Rapid-fire whipping escalates your Frenzy meter, accelerating strikes from 210ms down to 60ms, pitching audio up, and shifting energy conduit colors from **Electric Gold** ➔ **Neon Cyan** ➔ **Blazing Plasma Magenta**.
- 🎬 **Video Recording & Sharing**: Tap `🔴 REC` to capture composite video (Camera + 3D Gauntlet + Whip + Comic Starbursts) at 30fps with instant playback, `💾 Save Video`, and mobile `📲 Share Sheet`.
- 🔄 **Front/Back Camera Switch**: Seamlessly flip between rear camera (point at coworkers) and selfie camera.
- 🖥️ **Desktop Screen Overlay**: Whip buttons and Claude Code directly on your desktop screen with global hotkey `Ctrl + Shift + W`.

---

## 🚀 Quick Start (AR Web App)

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
| **Mobile / Desktop** | **Tap / Click Anywhere** | Whip lashes out to strike the exact touched location |
| **Rapid Tapping / Swings** | **Frenzy Escalation** | Multiplies speed up to `4.0x`, increases whip crack pitch, shifts trail colors |
| **Header Controls** | **🔴 REC** | Start/stop video recording with instant preview & export |
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

## 📦 Zero-Dependency Web Deployment

The `web/` folder is completely static and self-contained with bundled Three.js and GLTFLoader. You can deploy it directly to **GitHub Pages**, **Vercel**, or **Netlify** with zero backend build steps.

---

## 📄 License

MIT License. Have fun and whip responsibly!