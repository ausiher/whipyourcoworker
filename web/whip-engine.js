/**
 * OpenWhip™ AR - AAA Cyberpunk Game Edition
 * Features:
 * • First-Person Tactical Arm with Combat Glove & Molded Knuckle Armor Plates
 * • 4 Distinct Selectable Weapons in 3D & 2D:
 *   1. WHIP: Articulated Mechanical Cyber-Spine Segmented Vertebrae with Glowing Crimson LED Core
 *   2. BATON: High-Tech Riot Stun Baton with Glowing Electric Blue Plasma Core & Voltage Arcs
 *   3. CHAIN: Heavy Iron Morningstar Spiked Flail with Interlocking Chain Links & Inertia Physics
 *   4. TASER: Futuristic Dual-Prong Stun Taser Firing High-Voltage Lightning Discharges
 * • Comic Speech Bubble Callout ("FOCUS NOW!", "WORK HARDER!", etc.) & Curved Crimson Slash Arcs
 * • Zero-Latency Procedural Synthesizer for all 4 Weapon SFX + Decoded Buffer & Audio Pool
 * • Live Microphone + SFX Mixing into .mp4 Video Recorder
 * • Full Cyber Productivity Gauge HUD Integration (1.0x - 4.0x) with 20-Segment LED Thermometer
 * • Mobile Device Orientation Gyro Tilt Parallax
 */

class WhipEngine {
  constructor(canvas, threeCanvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.threeCanvasElem = threeCanvas;

    this.W = 0;
    this.H = 0;

    // ── Current Weapon System ─────────────────────────────────────────────────
    this.currentWeapon = 'whip'; // 'whip' | 'baton' | 'chain' | 'taser'

    this.weaponConfigs = {
      whip: {
        id: 'whip',
        name: 'WHIP',
        sub: 'Classic',
        themeColor: '#ff1744',
        coreColor: '#ff8a80',
        glowColor: 'rgba(255, 23, 68, 0.85)',
        sparkColors: ['#ff1744', '#ff5252', '#ffffff', '#ff8a80', '#d50000'],
        phrases: [
          'FOCUS NOW! ⚡',
          'WORK HARDER! 🔥',
          'OUCH! 💢',
          'FASTER! 💨',
          'DEADLINE TODAY! ⏰',
          'NO SLACKING! 🚫',
          'CRUSH THE OKR! 🎯'
        ]
      },
      baton: {
        id: 'baton',
        name: 'BATON',
        sub: 'Stun',
        themeColor: '#00f5ff',
        coreColor: '#e0f7fa',
        glowColor: 'rgba(0, 245, 255, 0.85)',
        sparkColors: ['#00f5ff', '#00b4d8', '#ffffff', '#38bdf8', '#0077b6'],
        phrases: [
          'STUNNED! ⚡',
          'SHOCK THERAPY! 🔌',
          'WAKE UP! 🚨',
          'MAX VOLTAGE! ⚡',
          'OUCH! 💢',
          'SYSTEM RESET! 🔄',
          'ALERT LEVEL HIGH! ⚠️'
        ]
      },
      chain: {
        id: 'chain',
        name: 'CHAIN',
        sub: 'Heavy',
        themeColor: '#f59e0b',
        coreColor: '#fef3c7',
        glowColor: 'rgba(245, 158, 11, 0.85)',
        sparkColors: ['#f59e0b', '#fbbf24', '#ffffff', '#d97706', '#b45309'],
        phrases: [
          'CRUNCH! 💥',
          'SMACK! 🔨',
          'GET TO WORK! 💼',
          'HEAVY DUTY! 🛡️',
          'OUCH! 💢',
          'PRESSURE APPLIED! 📈',
          'NO EXCUSES! 🚫'
        ]
      },
      taser: {
        id: 'taser',
        name: 'TASER',
        sub: 'Shock',
        themeColor: '#38bdf8',
        coreColor: '#ffffff',
        glowColor: 'rgba(56, 189, 248, 0.95)',
        sparkColors: ['#38bdf8', '#818cf8', '#ffffff', '#00f5ff', '#c084fc'],
        phrases: [
          'ZAP! ⚡',
          'MAX VOLTAGE! ⚡',
          'OVERCLOCK! 🚀',
          '10X SPEED! 💻',
          'OUCH! 💢',
          'POWER SURGE! ⚡',
          'HIGH CURRENT! 🔋'
        ]
      }
    };

    // ── Audio Engine ──────────────────────────────────────────────────────────
    this.audioPool = [];
    this.audioUnlocked = false;
    this.isMuted = false;
    this.micStream = null;
    this.micSource = null;
    this.micGain = null;
    this.isMicActive = false;
    this.initAudio();

    // ── Three.js 3D Viewport & Scene ──────────────────────────────────────────
    this.initThreeJS(threeCanvas);
    this.resize();

    // ── Whip & Chain Physics Points ─────────────────────────────────────────
    this.segments = 18; // Articulated vertebrae count (matches reference spacing)
    this.segmentLength = 22;
    this.pts = [];
    this.initWhipPoints();

    // ── Work Productivity Multiplier ─────────────────────────────────────────
    this.frenzy = 1.0;
    this.combo = 1;
    this.lastTapTime = 0;
    this.whipCount = 0;
    this.lastTierAlert = 1;
    this.lockFrenzy = false;
    this.isPaused = false;

    // ── Animation & Strike State ──────────────────────────────────────────────
    this.time = 0;
    this.lastTime = performance.now();
    this.strike = null; // { startTime, duration, targetX, targetY, impactFired }

    // ── Visual FX Collections ─────────────────────────────────────────────────
    this.particles = [];
    this.shockwaves = [];
    this.slashMarks = [];
    this.callouts = []; // Comic speech bubbles ("FOCUS NOW!")
    this.lightningArcs = [];
    this.screenShake = 0;

    // ── Device Motion & 3D Gyro Parallax ──────────────────────────────────────
    this.lastSwingTime = 0;
    this.lastAcc = { x: 0, y: 0, z: 0 };
    this.gyroTilt = { x: 0, y: 0, z: 0 };
    this.motionListening = false;
    this.onSwingDetected = null;
    this.initSensors();

    // Callbacks
    this.onWhipHit = null;
    this.onFrenzyChange = null;

    // Start Main Render Loop
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  // ── Mobile Device Sensors ─────────────────────────────────────────────────
  initSensors() {
    this.handleDeviceMotion = this.handleDeviceMotion.bind(this);
    this.handleDeviceOrientation = this.handleDeviceOrientation.bind(this);

    if (typeof window !== 'undefined') {
      if ('DeviceMotionEvent' in window && typeof DeviceMotionEvent.requestPermission !== 'function') {
        window.addEventListener('devicemotion', this.handleDeviceMotion, true);
        this.motionListening = true;
      }
      if ('DeviceOrientationEvent' in window && typeof DeviceOrientationEvent.requestPermission !== 'function') {
        window.addEventListener('deviceorientation', this.handleDeviceOrientation, true);
      }
    }
  }

  requestMotionPermission() {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      DeviceMotionEvent.requestPermission().then(res => {
        if (res === 'granted' && !this.motionListening) {
          window.addEventListener('devicemotion', this.handleDeviceMotion, true);
          this.motionListening = true;
        }
      }).catch(() => {});
    }
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission().then(res => {
        if (res === 'granted') {
          window.addEventListener('deviceorientation', this.handleDeviceOrientation, true);
        }
      }).catch(() => {});
    }
  }

  handleDeviceOrientation(event) {
    if (event.gamma === null || event.beta === null) return;
    const pitch = THREE.MathUtils.clamp(event.beta - 45, -35, 35) * 0.012;
    const yaw = THREE.MathUtils.clamp(event.gamma, -35, 35) * 0.014;
    const roll = THREE.MathUtils.clamp(event.gamma, -25, 25) * -0.010;

    this.gyroTilt.x += (pitch - this.gyroTilt.x) * 0.25;
    this.gyroTilt.y += (yaw - this.gyroTilt.y) * 0.25;
    this.gyroTilt.z += (roll - this.gyroTilt.z) * 0.25;
  }

  handleDeviceMotion(event) {
    const now = performance.now();
    if (now - this.lastSwingTime < 280) return;

    let ax = 0, ay = 0, az = 0;
    if (event.acceleration && event.acceleration.x !== null) {
      ax = event.acceleration.x || 0;
      ay = event.acceleration.y || 0;
      az = event.acceleration.z || 0;
    } else if (event.accelerationIncludingGravity && event.accelerationIncludingGravity.x !== null) {
      ax = event.accelerationIncludingGravity.x || 0;
      ay = event.accelerationIncludingGravity.y || 0;
      az = event.accelerationIncludingGravity.z || 0;
    } else {
      return;
    }

    const dx = ax - this.lastAcc.x;
    const dy = ay - this.lastAcc.y;
    const dz = az - this.lastAcc.z;
    this.lastAcc = { x: ax, y: ay, z: az };

    const deltaMag = Math.hypot(dx, dy, dz);
    const totalMag = Math.hypot(ax, ay, az);

    if (deltaMag >= 13.0 || totalMag >= 20.0) {
      this.lastSwingTime = now;

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate([40, 25, 80]); } catch {}
      }

      const targetX = this.W * 0.5 + (Math.random() * 24 - 12);
      const targetY = this.H * 0.38 + (Math.random() * 24 - 12);
      this.strikeAt(targetX, targetY);

      if (this.onSwingDetected) {
        this.onSwingDetected(deltaMag || totalMag);
      }
    }
  }

  resize() {
    this.W = this.canvas.width = window.innerWidth;
    this.H = this.canvas.height = window.innerHeight;
    this.segmentLength = Math.max(14, Math.min(26, this.H * 0.024));

    if (this.camera && this.renderer) {
      this.camera.aspect = this.W / this.H;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.W, this.H);
    }

    this.updateArmPlacement();
  }

  // ── Web Audio & Synthesizer ───────────────────────────────────────────────
  initAudio() {
    this.soundFiles = [
      'sounds/A.mp3',
      'sounds/B.mp3',
      'sounds/C.mp3',
      'sounds/D.mp3',
      'sounds/E.mp3',
    ];

    this.audioPool = [];
    this.soundFiles.forEach(src => {
      const a = new Audio(src);
      a.volume = 0.95;
      this.audioPool.push(a);
    });

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      try {
        this.audioCtx = new AudioCtx();
        this.audioDest = this.audioCtx.createMediaStreamDestination();

        // Master SFX Bus
        this.sfxGain = this.audioCtx.createGain();
        this.sfxGain.gain.value = 1.0;
        this.sfxGain.connect(this.audioCtx.destination); // to user speakers
        this.sfxGain.connect(this.audioDest); // to video recorder

        // Keep-alive silent node ensures MediaRecorder gets continuous audio frames
        const silenceGain = this.audioCtx.createGain();
        silenceGain.gain.value = 0.0;
        const keepAliveOsc = this.audioCtx.createOscillator();
        keepAliveOsc.frequency.value = 440;
        keepAliveOsc.connect(silenceGain);
        silenceGain.connect(this.audioDest);
        keepAliveOsc.start();

        this.audioBuffers = [];
        this.loadAudioBuffers();
      } catch (e) {
        console.warn('Web Audio init note:', e);
      }
    }
  }

  async loadAudioBuffers() {
    if (!this.audioCtx) return;
    for (const src of this.soundFiles) {
      try {
        const resp = await fetch(src);
        if (resp.ok) {
          const arrayBuffer = await resp.arrayBuffer();
          const decoded = await this.audioCtx.decodeAudioData(arrayBuffer);
          this.audioBuffers.push(decoded);
        }
      } catch (e) {
        // Fallback to procedural synthesis
      }
    }
  }

  async unlockAudio() {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      try {
        await this.audioCtx.resume();
      } catch {}
    }
    if (this.audioUnlocked) return;
    this.audioUnlocked = true;
    try {
      const a = this.audioPool[0];
      if (a) {
        a.play().then(() => {
          a.pause();
          a.currentTime = 0;
        }).catch(() => {});
      }
    } catch {}
  }

  // Connect microphone stream into the recording audio bus
  async startRecordingAudio() {
    await this.unlockAudio();
    if (!this.audioCtx) return this.getAudioStream();

    if (this.audioCtx.state === 'suspended') {
      try { await this.audioCtx.resume(); } catch {}
    }

    const needNewMic = !this.micStream ||
      this.micStream.getAudioTracks().length === 0 ||
      this.micStream.getAudioTracks().every(t => t.readyState === 'ended');

    if (needNewMic && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const micPromise = navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          }
        });
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Microphone request timed out')), 2500)
        );
        const stream = await Promise.race([micPromise, timeoutPromise]);
        this.micStream = stream;

        if (this.micSource) {
          try { this.micSource.disconnect(); } catch {}
        }

        this.micSource = this.audioCtx.createMediaStreamSource(stream);
        if (!this.micGain) {
          this.micGain = this.audioCtx.createGain();
        }
        this.micGain.gain.value = 1.0;
        this.micSource.connect(this.micGain);
        this.micGain.connect(this.audioDest); // Direct to recorder only, no speaker feedback!
        this.isMicActive = true;
      } catch (err) {
        console.warn('Microphone permission or stream skipped:', err.message);
        this.isMicActive = false;
      }
    } else {
      if (this.micGain) {
        this.micGain.gain.value = 1.0;
      }
      this.isMicActive = true;
    }

    return this.getAudioStream();
  }

  stopRecordingAudio() {
    if (this.micGain) {
      this.micGain.gain.value = 0.0;
    }
  }

  isMicrophoneActive() {
    return !!(this.isMicActive && this.micStream && this.micStream.active);
  }

  getAudioStream() {
    return this.audioDest ? this.audioDest.stream : null;
  }

  // ── Procedural Sound Synthesizers for 4 Weapons ───────────────────────────
  playWhipSound(pitchRate = 1.0) {
    if (!this.audioCtx || this.isMuted) return;
    try {
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
      const ctx = this.audioCtx;
      const t = ctx.currentTime;

      // 1. High-frequency supersonic crack burst (50ms)
      const bufferSize = Math.floor(ctx.sampleRate * 0.045);
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.22));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(3600 * pitchRate, t);
      filter.Q.setValueAtTime(3.8, t);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(1.15, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.sfxGain);
      noise.start(t);

      // 2. Sub-bass sonic boom
      const boom = ctx.createOscillator();
      boom.type = 'sine';
      boom.frequency.setValueAtTime(210 * pitchRate, t);
      boom.frequency.exponentialRampToValueAtTime(34, t + 0.08);

      const boomGain = ctx.createGain();
      boomGain.gain.setValueAtTime(1.0, t);
      boomGain.gain.exponentialRampToValueAtTime(0.001, t + 0.085);

      boom.connect(boomGain);
      boomGain.connect(this.sfxGain);
      boom.start(t);
      boom.stop(t + 0.09);
    } catch (e) {}
  }

  playBatonSound(pitchRate = 1.0) {
    if (!this.audioCtx || this.isMuted) return;
    try {
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
      const ctx = this.audioCtx;
      const t = ctx.currentTime;

      // Electric stun crackle + high voltage buzz
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc2.type = 'square';
      osc1.frequency.setValueAtTime(880 * pitchRate, t);
      osc1.frequency.exponentialRampToValueAtTime(110, t + 0.12);
      osc2.frequency.setValueAtTime(1760 * pitchRate, t);
      osc2.frequency.exponentialRampToValueAtTime(220, t + 0.1);

      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(600, t);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.95, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.15);
      osc2.stop(t + 0.15);
    } catch (e) {}
  }

  playChainSound(pitchRate = 1.0) {
    if (!this.audioCtx || this.isMuted) return;
    try {
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
      const ctx = this.audioCtx;
      const t = ctx.currentTime;

      // Heavy iron impact clang + metal resonance
      const metalOsc = ctx.createOscillator();
      metalOsc.type = 'triangle';
      metalOsc.frequency.setValueAtTime(440 * pitchRate, t);
      metalOsc.frequency.exponentialRampToValueAtTime(70, t + 0.22);

      const ringOsc = ctx.createOscillator();
      ringOsc.type = 'sine';
      ringOsc.frequency.setValueAtTime(1420 * pitchRate, t);
      ringOsc.frequency.exponentialRampToValueAtTime(320, t + 0.18);

      const metalGain = ctx.createGain();
      metalGain.gain.setValueAtTime(1.1, t);
      metalGain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);

      metalOsc.connect(metalGain);
      ringOsc.connect(metalGain);
      metalGain.connect(this.sfxGain);

      metalOsc.start(t);
      ringOsc.start(t);
      metalOsc.stop(t + 0.25);
      ringOsc.stop(t + 0.25);
    } catch (e) {}
  }

  playTaserSound(pitchRate = 1.0) {
    if (!this.audioCtx || this.isMuted) return;
    try {
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
      const ctx = this.audioCtx;
      const t = ctx.currentTime;

      // Rapid high-voltage multi-spark discharge
      for (let s = 0; s < 4; s++) {
        const sparkTime = t + s * 0.025;
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime((1200 + s * 400) * pitchRate, sparkTime);
        osc.frequency.exponentialRampToValueAtTime(300, sparkTime + 0.022);

        const sparkGain = ctx.createGain();
        sparkGain.gain.setValueAtTime(0.85, sparkTime);
        sparkGain.gain.exponentialRampToValueAtTime(0.001, sparkTime + 0.024);

        osc.connect(sparkGain);
        sparkGain.connect(this.sfxGain);
        osc.start(sparkTime);
        osc.stop(sparkTime + 0.026);
      }
    } catch (e) {}
  }

  playWeaponSwitchSound() {
    if (!this.audioCtx || this.isMuted) return;
    try {
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
      const ctx = this.audioCtx;
      const t = ctx.currentTime;

      // Sci-fi high-tech weapon equip click & whoosh
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(840, t + 0.08);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.65, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.095);
    } catch (e) {}
  }

  playLevelUpChime(tier) {
    if (!this.audioCtx || this.isMuted) return;
    try {
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
      const ctx = this.audioCtx;
      const t = ctx.currentTime;

      const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 arpeggio
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t + idx * 0.045);

        gain.gain.setValueAtTime(0.001, t + idx * 0.045);
        gain.gain.linearRampToValueAtTime(0.35, t + idx * 0.045 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.045 + 0.22);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t + idx * 0.045);
        osc.stop(t + idx * 0.045 + 0.23);
      });
    } catch (e) {}
  }

  playWeaponSound() {
    if (this.isMuted) return;
    this.unlockAudio();
    const pitchRate = Math.min(1.55, 0.95 + (this.frenzy - 1.0) * 0.16);

    switch (this.currentWeapon) {
      case 'baton':
        this.playBatonSound(pitchRate);
        break;
      case 'chain':
        this.playChainSound(pitchRate);
        break;
      case 'taser':
        this.playTaserSound(pitchRate);
        break;
      case 'whip':
      default:
        this.playWhipSound(pitchRate);
        // Fallback decoded sample buffer if available
        if (this.audioCtx && this.audioBuffers && this.audioBuffers.length > 0) {
          try {
            const buf = this.audioBuffers[Math.floor(Math.random() * this.audioBuffers.length)];
            const src = this.audioCtx.createBufferSource();
            src.buffer = buf;
            src.playbackRate.value = pitchRate;
            const g = this.audioCtx.createGain();
            g.gain.value = 0.9;
            src.connect(g);
            g.connect(this.sfxGain);
            src.start(0);
          } catch {}
        }
        break;
    }
  }

  // ── Weapon Switching ──────────────────────────────────────────────────────
  setWeapon(weaponId) {
    if (!this.weaponConfigs[weaponId]) return;
    this.currentWeapon = weaponId;
    this.playWeaponSwitchSound();
    this.update3DWeaponVisibility();
  }

  // ── 3D Scene Initialization ───────────────────────────────────────────────
  initThreeJS(threeCanvas) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.set(0, 0, 7);
    this.scene.add(this.camera);

    this.threeCanvas = threeCanvas || document.getElementById('three-canvas') || document.createElement('canvas');
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.threeCanvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Studio Lights for AAA Materials
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    this.scene.add(ambientLight);

    this.keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
    this.keyLight.position.set(4, 7, 5);
    this.scene.add(this.keyLight);

    this.rimLight = new THREE.DirectionalLight(0x00f5ff, 1.6); // Cyber Cyan Rim
    this.rimLight.position.set(-5, 4, -2);
    this.scene.add(this.rimLight);

    this.armRoot = new THREE.Group();
    this.camera.add(this.armRoot);

    // Assemble Photorealistic First-Person Tactical Arm & Weapon Planes
    this.init3DArmPlanes();
    this.update3DWeaponVisibility();
  }

  init3DArmPlanes() {
    const texLoader = new THREE.TextureLoader();
    this.weaponTextures = {
      whip: texLoader.load('assets/fps_arm_whip.png'),
      baton: texLoader.load('assets/fps_arm_baton.png'),
      chain: texLoader.load('assets/fps_arm_chain.png'),
      taser: texLoader.load('assets/fps_arm_taser.png'),
    };

    for (const key in this.weaponTextures) {
      this.weaponTextures[key].generateMipmaps = true;
      this.weaponTextures[key].minFilter = THREE.LinearMipmapLinearFilter;
      this.weaponTextures[key].magFilter = THREE.LinearFilter;
    }

    const h = 2.85;
    const w = h / (1376 / 768);
    const geo = new THREE.PlaneGeometry(w, h);

    this.weaponMeshes = {};
    for (const key of ['whip', 'baton', 'chain', 'taser']) {
      const mat = new THREE.MeshBasicMaterial({
        map: this.weaponTextures[key],
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = (key === this.currentWeapon);
      this.armRoot.add(mesh);
      this.weaponMeshes[key] = mesh;
    }

    // Universal Emitter Node (tracked in 3D for whip/spark origin)
    this.whipEmitter = new THREE.Object3D();
    const emitLocalX = (0.336 - 0.5) * w;
    const emitLocalY = (0.5 - 0.249) * h;
    this.whipEmitter.position.set(emitLocalX, emitLocalY, 0.02);
    this.armRoot.add(this.whipEmitter);
  }

  updateArmPlacement() {
    if (!this.camera || !this.armRoot) return;

    const dist = 2.4;
    const vFOV = THREE.MathUtils.degToRad(this.camera.fov);
    const visibleHeight = 2 * Math.tan(vFOV / 2) * dist;
    const visibleWidth = visibleHeight * this.camera.aspect;

    const isPortrait = this.camera.aspect < 1.0;

    if (isPortrait) {
      this.armBasePos = new THREE.Vector3(
        visibleWidth * 0.40,
        -visibleHeight * 0.35,
        -dist
      );
      this.armRoot.scale.set(0.92, 0.92, 0.92);
    } else {
      this.armBasePos = new THREE.Vector3(
        Math.min(visibleWidth * 0.30, 1.15),
        -visibleHeight * 0.28,
        -dist
      );
      this.armRoot.scale.set(1.05, 1.05, 1.05);
    }

    this.armRoot.position.copy(this.armBasePos);
  }

  update3DWeaponVisibility() {
    if (!this.weaponMeshes) return;
    for (const key of ['whip', 'baton', 'chain', 'taser']) {
      if (this.weaponMeshes[key]) {
        this.weaponMeshes[key].visible = (this.currentWeapon === key);
      }
    }

    if (this.whipEmitter) {
      const h = 2.85;
      const w = h / (1376 / 768);
      let u = 0.336, v = 0.249;
      if (this.currentWeapon === 'baton') { u = 0.330; v = 0.160; }
      else if (this.currentWeapon === 'chain') { u = 0.440; v = 0.120; }
      else if (this.currentWeapon === 'taser') { u = 0.340; v = 0.220; }
      this.whipEmitter.position.set((u - 0.5) * w, (0.5 - v) * h, 0.02);
    }

    if (this.rimLight) {
      const cfg = this.weaponConfigs[this.currentWeapon];
      this.rimLight.color.set(cfg.themeColor);
    }
  }

  // Helper providing full productivity stats for HUD and recording watermark
  getProductivityInfo() {
    let tierName = 'OK (1.0x)';
    let tierColor = '#38bdf8';
    let progress = Math.min(1.0, (this.frenzy - 1.0) / 3.0);

    if (this.frenzy >= 3.8) {
      tierName = 'MAX 👑 (4.0x)';
      tierColor = '#00f5ff';
    } else if (this.frenzy >= 2.8) {
      tierName = 'PEAK 👑 (3.0x)';
      tierColor = '#39ff14';
    } else if (this.frenzy >= 1.8) {
      tierName = 'GOOD (2.0x)';
      tierColor = '#eab308';
    }

    const cfg = this.weaponConfigs[this.currentWeapon];

    return {
      multiplier: this.frenzy,
      formattedMultiplier: 'x' + this.frenzy.toFixed(1),
      combo: this.combo,
      whipCount: this.whipCount,
      tierName,
      tierColor,
      progress,
      weaponName: cfg.name,
      weaponSub: cfg.sub,
      weaponTheme: cfg.themeColor,
    };
  }

  // ── Strike Trigger ────────────────────────────────────────────────────────
  strikeAt(targetX, targetY) {
    this.unlockAudio();

    const now = performance.now();
    const timeSinceLastTap = now - this.lastTapTime;
    this.lastTapTime = now;

    // Frenzy Speed Escalation (Work Productivity Maxx)
    if (timeSinceLastTap < 650) {
      this.combo++;
      this.frenzy = Math.min(4.0, this.frenzy + 0.36);
    } else {
      this.combo = 1;
    }

    // Check for level up chime crossing tiers
    const currentTier = this.frenzy >= 3.8 ? 4 : (this.frenzy >= 2.8 ? 3 : (this.frenzy >= 1.8 ? 2 : 1));
    if (currentTier > this.lastTierAlert) {
      this.playLevelUpChime(currentTier);
      this.lastTierAlert = currentTier;
    }

    const baseDuration = this.currentWeapon === 'chain' ? 240 : (this.currentWeapon === 'baton' ? 170 : 200);
    const strikeDuration = Math.max(65, baseDuration / this.frenzy);

    this.strike = {
      startTime: now,
      duration: strikeDuration,
      targetX,
      targetY,
      impactFired: false,
    };

    if (this.onFrenzyChange) {
      this.onFrenzyChange(this.frenzy, this.combo);
    }
  }

  initWhipPoints() {
    this.pts = [];
    const origin = this.getEmitterScreenPos();

    // Parabolic arc matching reference image: poised gracefully above coworker head
    const p0 = { x: origin.x, y: origin.y };
    const p1 = { x: origin.x - this.W * 0.08, y: origin.y - this.H * 0.18 };
    const p2 = { x: origin.x - this.W * 0.22, y: origin.y - this.H * 0.21 };
    const p3 = { x: this.W * 0.43, y: origin.y - this.H * 0.13 };

    for (let i = 0; i < this.segments; i++) {
      const t = i / (this.segments - 1);
      const oneMinusT = 1 - t;
      const x = oneMinusT * oneMinusT * oneMinusT * p0.x +
                3 * oneMinusT * oneMinusT * t * p1.x +
                3 * oneMinusT * t * t * p2.x +
                t * t * t * p3.x;
      const y = oneMinusT * oneMinusT * oneMinusT * p0.y +
                3 * oneMinusT * oneMinusT * t * p1.y +
                3 * oneMinusT * t * t * p2.y +
                t * t * t * p3.y;
      this.pts.push({ x, y, px: x, py: y });
    }
  }

  getEmitterScreenPos() {
    if (!this.whipEmitter || !this.camera) {
      return { x: this.W * 0.76, y: this.H * 0.70 };
    }
    const worldPos = new THREE.Vector3();
    this.whipEmitter.getWorldPosition(worldPos);
    worldPos.project(this.camera);

    return {
      x: (worldPos.x * 0.5 + 0.5) * this.W,
      y: (-(worldPos.y * 0.5) + 0.5) * this.H,
    };
  }

  // ── Physics & Animation Update ────────────────────────────────────────────
  update(dt) {
    this.time += dt;

    // Decay Frenzy when idle (unless locked for reference match)
    const timeSinceLastTap = performance.now() - this.lastTapTime;
    if (!this.lockFrenzy && timeSinceLastTap > 750 && this.frenzy > 1.0) {
      this.frenzy = Math.max(1.0, this.frenzy - dt * 1.6);
      this.lastTierAlert = this.frenzy >= 3.8 ? 4 : (this.frenzy >= 2.8 ? 3 : (this.frenzy >= 1.8 ? 2 : 1));
      if (this.onFrenzyChange) {
        this.onFrenzyChange(this.frenzy, this.combo);
      }
    }

    // 3D Arm Motion, Sway & Recoil
    const idleSwayX = Math.cos(this.time * 2.2) * 0.02;
    const idleSwayY = Math.sin(this.time * 3.0) * 0.015;
    const idleRotZ = Math.sin(this.time * 1.8) * 0.012;

    let armTargetX = this.armBasePos ? this.armBasePos.x + idleSwayX : 1.1;
    let armTargetY = this.armBasePos ? this.armBasePos.y + idleSwayY : -0.7;
    let armTargetZ = this.armBasePos ? this.armBasePos.z : -2.4;
    let armRotX = this.gyroTilt.x;
    let armRotY = this.gyroTilt.y;
    let armRotZ = idleRotZ + this.gyroTilt.z;

    let tipTarget = null;
    let strikeWavePhase = 0;
    let strikeAimAngle = 0;

    if (this.strike) {
      const elapsed = performance.now() - this.strike.startTime;
      const progress = Math.min(1, Math.max(0, elapsed / this.strike.duration));

      const emitterScreen = this.getEmitterScreenPos();
      const dx = this.strike.targetX - emitterScreen.x;
      const dy = this.strike.targetY - emitterScreen.y;
      strikeAimAngle = Math.atan2(dy, dx);

      if (progress < 0.22) {
        // Wind-up: Arm cocks backward with aim-aware wrist tension
        const p = progress / 0.22;
        armTargetX += 0.12 * Math.sin(p * Math.PI * 0.5);
        armTargetY -= 0.10 * Math.sin(p * Math.PI * 0.5);
        armTargetZ += 0.28 * Math.sin(p * Math.PI * 0.5);
        armRotX -= 0.22 * Math.sin(p * Math.PI * 0.5);
        armRotZ += 0.16 * Math.sin(p * Math.PI * 0.5);
      } else if (progress < 0.65) {
        // Forward strike lunge towards target
        const p = (progress - 0.22) / 0.43;
        const ease = p * p * (3 - 2 * p);
        armTargetX -= 0.26 * ease;
        armTargetY += 0.22 * ease;
        armTargetZ -= 0.52 * ease;
        armRotX += 0.44 * ease;
        armRotZ = -Math.sin(strikeAimAngle) * 0.38;

        strikeWavePhase = p;

        tipTarget = {
          x: this.pts[this.pts.length - 1].x + (this.strike.targetX - this.pts[this.pts.length - 1].x) * ease,
          y: this.pts[this.pts.length - 1].y + (this.strike.targetY - this.pts[this.pts.length - 1].y) * ease,
        };
      } else if (!this.strike.impactFired) {
        // Impact Moment
        this.strike.impactFired = true;
        tipTarget = { x: this.strike.targetX, y: this.strike.targetY };
        this.triggerImpact(this.strike.targetX, this.strike.targetY);
      } else {
        // Kinetic spring recoil
        const p = (progress - 0.65) / 0.35;
        const recoilOsc = Math.sin(p * Math.PI * 3.5) * Math.exp(-p * 4.5) * 0.12;
        armTargetX += 0.08 * (1 - p) + recoilOsc;
        armTargetY -= 0.06 * (1 - p) - recoilOsc * 0.5;
        armTargetZ += recoilOsc * 0.8;
        armRotZ += recoilOsc * 0.4;
      }

      if (progress >= 1.0) {
        this.strike = null;
      }
    }

    // Apply transforms to 3D Arm Root
    this.armRoot.position.x += (armTargetX - this.armRoot.position.x) * 0.48;
    this.armRoot.position.y += (armTargetY - this.armRoot.position.y) * 0.48;
    this.armRoot.position.z += (armTargetZ - this.armRoot.position.z) * 0.48;
    this.armRoot.rotation.x += (armRotX - this.armRoot.rotation.x) * 0.48;
    this.armRoot.rotation.y += (armRotY - this.armRoot.rotation.y) * 0.48;
    this.armRoot.rotation.z += (armRotZ - this.armRoot.rotation.z) * 0.48;

    // Get 3D Emitter screen coordinates
    const emitterScreen = this.getEmitterScreenPos();

    // Whip / Chain Physics (Verlet) with S-Curve Wave
    const isWhip = this.currentWeapon === 'whip';
    const gravity = isWhip ? 0.35 : (this.currentWeapon === 'chain' ? 2.2 : 1.25);
    const damping = this.currentWeapon === 'chain' ? 0.91 : 0.94;

    for (let i = 1; i < this.pts.length; i++) {
      const p = this.pts[i];
      const vx = (p.x - p.px) * damping;
      const vy = (p.y - p.py) * damping;
      p.px = p.x;
      p.py = p.y;
      p.x += vx;
      p.y += vy + gravity;

      if (!this.strike && isWhip) {
        // Poised cyber-spine internal tension & gentle breath sway
        const t = i / (this.pts.length - 1);
        const breath = Math.sin(this.time * 2.2 + t * 2.5) * (3.5 * t);
        const p0 = { x: emitterScreen.x, y: emitterScreen.y };
        const p1 = { x: emitterScreen.x - this.W * 0.08, y: emitterScreen.y - this.H * 0.18 };
        const p2 = { x: emitterScreen.x - this.W * 0.22, y: emitterScreen.y - this.H * 0.21 };
        const p3 = { x: this.W * 0.43, y: emitterScreen.y - this.H * 0.13 };

        const oneMinusT = 1 - t;
        const targetX = oneMinusT * oneMinusT * oneMinusT * p0.x +
                        3 * oneMinusT * oneMinusT * t * p1.x +
                        3 * oneMinusT * t * t * p2.x +
                        t * t * t * p3.x + breath;
        const targetY = oneMinusT * oneMinusT * oneMinusT * p0.y +
                        3 * oneMinusT * oneMinusT * t * p1.y +
                        3 * oneMinusT * t * t * p2.y +
                        t * t * t * p3.y + breath * 0.5;
        p.x += (targetX - p.x) * 0.085;
        p.y += (targetY - p.y) * 0.085;
      }

      if (strikeWavePhase > 0) {
        const segT = i / (this.pts.length - 1);
        const distFromWave = segT - strikeWavePhase;
        const waveAmp = Math.sin(distFromWave * Math.PI * 3) * Math.exp(-distFromWave * distFromWave * 14) * 55 * (1 - strikeWavePhase);
        const perpX = -Math.sin(strikeAimAngle) * waveAmp;
        const perpY = Math.cos(strikeAimAngle) * waveAmp;
        p.x += perpX * 0.38;
        p.y += perpY * 0.38;
      }
    }

    // Pin whip root to 3D handle tip
    this.pts[0].x = emitterScreen.x;
    this.pts[0].y = emitterScreen.y;
    this.pts[0].px = emitterScreen.x;
    this.pts[0].py = emitterScreen.y;

    if (tipTarget) {
      const tip = this.pts[this.pts.length - 1];
      tip.x = tipTarget.x;
      tip.y = tipTarget.y;
      tip.px = tipTarget.x;
      tip.py = tipTarget.y;
    }

    // Distance constraint solver
    const iters = 6;
    for (let iter = 0; iter < iters; iter++) {
      for (let i = 0; i < this.pts.length - 1; i++) {
        const a = this.pts[i], b = this.pts[i + 1];
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 0.0001;
        const diff = (dist - this.segmentLength) / dist * 0.5;
        const ox = dx * diff, oy = dy * diff;

        if (i === 0) {
          b.x -= ox * 2;
          b.y -= oy * 2;
        } else if (i === this.pts.length - 2 && tipTarget) {
          a.x += ox * 2;
          a.y += oy * 2;
        } else {
          a.x += ox; a.y += oy;
          b.x -= ox; b.y -= oy;
        }
      }
    }

    this.updateFX(dt);
  }

  // ── Impact Trigger ────────────────────────────────────────────────────────
  triggerImpact(x, y) {
    this.whipCount++;
    this.playWeaponSound();

    if ('vibrate' in navigator) {
      try {
        const vib = Math.min(90, 40 + this.frenzy * 14);
        navigator.vibrate([vib, 20, vib * 1.3]);
      } catch {}
    }

    this.screenShake = 16 + this.frenzy * 5;
    const cfg = this.weaponConfigs[this.currentWeapon];

    // 1. Comic Speech Bubble Callout ("FOCUS NOW!", "WORK HARDER!", etc.)
    const phrases = cfg.phrases;
    const chosenText = phrases[Math.floor(Math.random() * phrases.length)];
    this.callouts.push({
      x: x + (Math.random() * 40 - 20),
      y: y - 50 + (Math.random() * 20 - 10),
      text: chosenText,
      rotation: (Math.random() - 0.5) * 0.22, // Dynamic angled comic style
      scale: 0.3,
      targetScale: 1.05 + this.frenzy * 0.1,
      alpha: 1.0,
      age: 0,
      life: 1.25,
      color: cfg.themeColor,
    });

    // 2. Curved Crimson / Electric Slash Streaks radiating outwards
    const slashCount = 5;
    for (let i = 0; i < slashCount; i++) {
      const baseAng = (i / slashCount) * Math.PI * 2 + (Math.random() * 0.4 - 0.2);
      this.slashMarks.push({
        x,
        y,
        angle: baseAng,
        len: 40 + Math.random() * 55 * (1 + this.frenzy * 0.25),
        curve: (Math.random() - 0.5) * 35,
        alpha: 1.0,
        color: cfg.themeColor,
        width: 3.5 + Math.random() * 3.0,
      });
    }

    // 3. Double Expanding Shockwaves
    this.shockwaves.push({ x, y, r: 12, maxR: 95 + this.frenzy * 12, alpha: 1.0, color: cfg.themeColor });
    this.shockwaves.push({ x, y, r: 6, maxR: 60, alpha: 1.0, color: '#ffffff' });

    // 4. Spark Particles
    const sparkCount = Math.floor(24 + this.frenzy * 8);
    const sparkPalette = cfg.sparkColors;
    for (let i = 0; i < sparkCount; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 6 + Math.random() * (14 + this.frenzy * 4);
      this.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 3.8,
        alpha: 1.0,
        size: 3 + Math.random() * 4.5,
        color: sparkPalette[Math.floor(Math.random() * sparkPalette.length)],
        gravity: 0.38,
      });
    }

    // 5. Taser / Baton Electric Lightning Arcs
    if (this.currentWeapon === 'taser' || this.currentWeapon === 'baton') {
      const emitter = this.getEmitterScreenPos();
      for (let a = 0; a < 3; a++) {
        this.lightningArcs.push({
          x1: emitter.x,
          y1: emitter.y,
          x2: x,
          y2: y,
          alpha: 1.0,
          color: cfg.themeColor,
        });
      }
    }

    if (this.onWhipHit) {
      this.onWhipHit(this.whipCount, this.combo);
    }
  }

  updateFX(dt) {
    if (this.screenShake > 0) {
      this.screenShake *= 0.82;
      if (this.screenShake < 0.5) this.screenShake = 0;
    }

    // Callout comic speech bubbles
    for (let i = this.callouts.length - 1; i >= 0; i--) {
      const c = this.callouts[i];
      c.age += dt;
      if (c.scale < c.targetScale) c.scale += (c.targetScale - c.scale) * 0.35;
      if (c.age > c.life * 0.6) {
        c.alpha -= dt * 2.8;
      }
      if (c.alpha <= 0 || c.age >= c.life) this.callouts.splice(i, 1);
    }

    // Slash marks
    for (let i = this.slashMarks.length - 1; i >= 0; i--) {
      const sl = this.slashMarks[i];
      sl.alpha -= 0.065;
      if (sl.alpha <= 0) this.slashMarks.splice(i, 1);
    }

    // Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.r += 6.5;
      s.alpha -= 0.055;
      if (s.alpha <= 0 || s.r >= s.maxR) this.shockwaves.splice(i, 1);
    }

    // Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.alpha -= 0.035;
      if (p.alpha <= 0) this.particles.splice(i, 1);
    }

    // Lightning arcs
    for (let i = this.lightningArcs.length - 1; i >= 0; i--) {
      const la = this.lightningArcs[i];
      la.alpha -= 0.12;
      if (la.alpha <= 0) this.lightningArcs.splice(i, 1);
    }
  }

  // ── Master Render Method ──────────────────────────────────────────────────
  draw() {
    this.ctx.clearRect(0, 0, this.W, this.H);

    this.ctx.save();

    if (this.screenShake > 0) {
      const sx = (Math.random() - 0.5) * this.screenShake;
      const sy = (Math.random() - 0.5) * this.screenShake;
      this.ctx.translate(sx, sy);
    }

    // 1. Draw Active 2D Weapon Physics (Cyber-Spine Whip / Baton / Chain / Taser)
    this.drawCurrentWeapon();

    // 2. Render Three.js 3D Tactical Arm onto Canvas
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }

    // 3. Draw Lightning Arcs (for Taser & Baton)
    this.drawLightningArcs();

    // 4. Draw Slash Marks
    this.drawSlashMarks();

    // 5. Draw Shockwaves
    for (const s of this.shockwaves) {
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      this.ctx.strokeStyle = s.color;
      this.ctx.globalAlpha = Math.max(0, s.alpha);
      this.ctx.lineWidth = 4.5;
      this.ctx.shadowColor = s.color;
      this.ctx.shadowBlur = 10;
      this.ctx.stroke();
      this.ctx.restore();
    }

    // 6. Draw Spark Particles
    for (const p of this.particles) {
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = Math.max(0, p.alpha);
      this.ctx.shadowColor = p.color;
      this.ctx.shadowBlur = 6;
      this.ctx.fill();
      this.ctx.restore();
    }

    // 7. Draw Comic Speech Bubbles ("FOCUS NOW!", "WORK HARDER!", etc.)
    for (const c of this.callouts) {
      this.drawComicCallout(c);
    }

    this.ctx.restore();
  }

  // ── Draw Specific Weapon Visuals ──────────────────────────────────────────
  drawCurrentWeapon() {
    switch (this.currentWeapon) {
      case 'baton':
        this.drawBatonVisual();
        break;
      case 'chain':
        this.drawChainVisual();
        break;
      case 'taser':
        this.drawTaserVisual();
        break;
      case 'whip':
      default:
        this.drawCyberSpineWhip();
        break;
    }
  }

  // ── Articulated Mechanical Cyber-Spine Whip (Matches Reference Image) ──────
  drawCyberSpineWhip() {
    if (this.pts.length < 2) return;
    const ctx = this.ctx;
    ctx.save();

    const n = this.pts.length;

    // 1. Underlying Glowing Tendon/Spine Core (Flexible Crimson Synthetic Muscle)
    ctx.beginPath();
    ctx.moveTo(this.pts[0].x, this.pts[0].y);
    for (let i = 0; i < n - 1; i++) {
      const b = this.getBezier(i);
      ctx.bezierCurveTo(b.cp1x, b.cp1y, b.cp2x, b.cp2y, b.x2, b.y2);
    }
    ctx.strokeStyle = '#ff1744';
    ctx.lineWidth = 4.0 + this.frenzy * 0.8;
    ctx.shadowColor = '#ff1744';
    ctx.shadowBlur = 8;
    ctx.stroke();

    // Inner bright core
    ctx.beginPath();
    ctx.moveTo(this.pts[0].x, this.pts[0].y);
    for (let i = 0; i < n - 1; i++) {
      const b = this.getBezier(i);
      ctx.bezierCurveTo(b.cp1x, b.cp1y, b.cp2x, b.cp2y, b.x2, b.y2);
    }
    ctx.strokeStyle = '#ffcdd2';
    ctx.lineWidth = 1.4;
    ctx.shadowBlur = 0;
    ctx.stroke();

    // 2. Articulated Mechanical Vertebrae Segments (Gunmetal Shell + Specular Rim)
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1); // 0 at base, 1 at tip
      const p = this.pts[i];

      // Tangent direction along spine
      const prev = this.pts[Math.max(0, i - 1)];
      const next = this.pts[Math.min(n - 1, i + 1)];
      const angle = Math.atan2(next.y - prev.y, next.x - prev.x);

      // Vertebra dimensions: tapering from base to tip
      const w = 32 * (1 - t * 0.60) + 6; // Width across spine
      const h = 13 * (1 - t * 0.38) + 4; // Length along spine

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(angle);

      // Backwards-pointing mechanical spinal process ridges (top & bottom flanges)
      ctx.fillStyle = '#1c222b';
      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(-h * 0.45, -w * 0.46);
      ctx.lineTo(-h * 0.82, -w * 0.56);
      ctx.lineTo(h * 0.22, -w * 0.42);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-h * 0.45, w * 0.46);
      ctx.lineTo(-h * 0.82, w * 0.56);
      ctx.lineTo(h * 0.22, w * 0.42);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Main Armored Gunmetal Vertebra Shell
      const grad = ctx.createLinearGradient(-h * 0.5, 0, h * 0.5, 0);
      grad.addColorStop(0, '#101418');
      grad.addColorStop(0.35, '#28303c');
      grad.addColorStop(0.7, '#1a1f26');
      grad.addColorStop(1, '#0e1115');

      ctx.fillStyle = grad;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.32)';
      ctx.lineWidth = 1.2;
      ctx.shadowBlur = 0;

      ctx.beginPath();
      ctx.roundRect(-h * 0.5, -w * 0.5, h, w, Math.min(4, h * 0.35));
      ctx.fill();
      ctx.stroke();

      // Specular Top Rim Highlight
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.42)';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(-h * 0.35, -w * 0.44);
      ctx.lineTo(h * 0.35, -w * 0.44);
      ctx.stroke();

      // Center Glowing Crimson LED Reactor Core Slot
      ctx.fillStyle = '#ff1744';
      ctx.shadowColor = '#ff1744';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.roundRect(-h * 0.24, -w * 0.18, h * 0.48, w * 0.36, 1.5);
      ctx.fill();

      // White-hot inner core slit
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 0;
      ctx.fillRect(-h * 0.10, -w * 0.08, h * 0.20, w * 0.16);

      ctx.restore();
    }

    // 3. Glowing Rounded Emitter Cap at Tip (with radiating sparks)
    const tip = this.pts[n - 1];
    ctx.save();
    ctx.translate(tip.x, tip.y);

    const radGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 14);
    radGrad.addColorStop(0, '#ffffff');
    radGrad.addColorStop(0.35, '#ff1744');
    radGrad.addColorStop(1, 'rgba(255, 23, 68, 0)');

    ctx.fillStyle = radGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 14 + this.frenzy * 2, 0, Math.PI * 2);
    ctx.fill();

    // Radiating dynamic crimson energy slash sparks at tip (as in reference image)
    const sparks = [-1.1, -0.6, -0.1, 0.4, 0.9];
    ctx.strokeStyle = '#ff1744';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#ff1744';
    ctx.shadowBlur = 10;
    sparks.forEach((angOffset, idx) => {
      ctx.save();
      ctx.rotate(angOffset + Math.sin(this.time * 4.0 + idx) * 0.15);
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.quadraticCurveTo(24, (idx % 2 === 0 ? 8 : -8), 42 + (idx % 3) * 12, 0);
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.quadraticCurveTo(20, (idx % 2 === 0 ? 4 : -4), 30, 0);
      ctx.stroke();
      ctx.restore();
    });

    ctx.restore();
    ctx.restore();
  }

  // ── Riot Stun Baton Visual ────────────────────────────────────────────────
  drawBatonVisual() {
    const ctx = this.ctx;
    const origin = this.getEmitterScreenPos();
    const tip = this.pts[this.pts.length - 1];

    ctx.save();

    // Draw electrical lightning aura around baton line
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.strokeStyle = '#00f5ff';
    ctx.lineWidth = 10;
    ctx.shadowColor = '#00f5ff';
    ctx.shadowBlur = 18;
    ctx.stroke();

    // Inner bright plasma core
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Electrical sparks at baton tip
    ctx.fillStyle = '#00f5ff';
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, 10 + this.frenzy * 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // ── Heavy Iron Spiked Flail Chain Visual ──────────────────────────────────
  drawChainVisual() {
    if (this.pts.length < 2) return;
    const ctx = this.ctx;
    ctx.save();

    const n = this.pts.length;

    // 1. Interlocking Dark Iron Chain Links
    for (let i = 0; i < n - 1; i++) {
      const p1 = this.pts[i];
      const p2 = this.pts[i + 1];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const ang = Math.atan2(dy, dx);
      const dist = Math.hypot(dx, dy);

      ctx.save();
      ctx.translate((p1.x + p2.x) * 0.5, (p1.y + p2.y) * 0.5);
      ctx.rotate(ang);

      if (i % 2 === 0) {
        // Flat oval chain link
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, dist * 0.48, 7, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#94a3b8'; // Specular sheen
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        // Edge-profile link
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.roundRect(-dist * 0.35, -3.5, dist * 0.7, 7, 3);
        ctx.fill();
      }

      ctx.restore();
    }

    // 2. Heavy Spiked Morningstar Iron Ball at Tip
    const tip = this.pts[n - 1];
    ctx.save();
    ctx.translate(tip.x, tip.y);

    const ballRadius = 24 + this.frenzy * 2;

    // 12 Conical Spikes around the perimeter
    const spikeCount = 10;
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;

    for (let s = 0; s < spikeCount; s++) {
      const ang = (s / spikeCount) * Math.PI * 2 + this.time * 0.5;
      const spikeLen = 14 + (s % 2 === 0 ? 6 : 0);

      ctx.save();
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.moveTo(-5, ballRadius * 0.85);
      ctx.lineTo(0, ballRadius + spikeLen);
      ctx.lineTo(5, ballRadius * 0.85);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Iron Sphere Body with Specular Highlight
    const sphereGrad = ctx.createRadialGradient(-6, -6, 2, 0, 0, ballRadius);
    sphereGrad.addColorStop(0, '#94a3b8');
    sphereGrad.addColorStop(0.3, '#334155');
    sphereGrad.addColorStop(0.85, '#0f172a');
    sphereGrad.addColorStop(1, '#020617');

    ctx.fillStyle = sphereGrad;
    ctx.beginPath();
    ctx.arc(0, 0, ballRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
    ctx.restore();
  }

  // ── Tactical Dual-Prong Taser Visual ──────────────────────────────────────
  drawTaserVisual() {
    const ctx = this.ctx;
    const origin = this.getEmitterScreenPos();
    const tip = this.pts[this.pts.length - 1];

    ctx.save();

    // Dual electrified dart wires with high-frequency jitter
    const wires = [-6, 6];
    wires.forEach(offset => {
      ctx.beginPath();
      ctx.moveTo(origin.x + offset, origin.y + offset);

      const segments = 12;
      for (let s = 1; s <= segments; s++) {
        const t = s / segments;
        const x = origin.x + offset + (tip.x - origin.x - offset) * t;
        const y = origin.y + offset + (tip.y - origin.y - offset) * t;
        const jitterX = (Math.random() - 0.5) * 8 * (1 - t * 0.5);
        const jitterY = (Math.random() - 0.5) * 8 * (1 - t * 0.5);
        ctx.lineTo(x + jitterX, y + jitterY);
      }

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#00f5ff';
      ctx.shadowBlur = 10;
      ctx.stroke();
    });

    // Electrified dart node at target
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawComicCallout(c) {
    const ctx = this.ctx;
    ctx.save();

    const isFocusNow = (c.text === 'FOCUS NOW!' || c.text.startsWith('FOCUS NOW'));
    const lines = isFocusNow ? ['FOCUS', 'NOW!'] : (c.text.includes('\n') ? c.text.split('\n') : [c.text]);

    ctx.font = '900 24px "Permanent Marker", "Bangers", Impact, sans-serif';
    let maxLineWidth = 0;
    lines.forEach(l => {
      const w = ctx.measureText(l).width;
      if (w > maxLineWidth) maxLineWidth = w;
    });

    const isMultiLine = lines.length > 1;
    const bubbleW = isMultiLine ? Math.max(116, maxLineWidth + 32) : Math.max(130, maxLineWidth + 32);
    const bubbleH = isMultiLine ? 66 : 50;
    const r = 12;

    // Boundary clamp: keep bubble within screen margins
    const clampedX = Math.min(this.W - bubbleW * 0.5 - 14, Math.max(bubbleW * 0.5 + 14, c.x));
    const clampedY = Math.min(this.H - bubbleH - 120, Math.max(bubbleH * 0.5 + 40, c.y));

    ctx.translate(clampedX, clampedY);
    ctx.rotate(c.rotation || -0.12);
    ctx.scale(c.scale, c.scale);
    ctx.globalAlpha = Math.max(0, c.alpha);

    // Jagged / Angled Comic Speech Balloon
    ctx.fillStyle = 'rgba(6, 16, 32, 0.94)';
    ctx.beginPath();
    ctx.roundRect(-bubbleW * 0.5, -bubbleH * 0.5, bubbleW, bubbleH, r);
    ctx.fill();

    // Pointed Tail pointing toward coworker target
    ctx.beginPath();
    ctx.moveTo(-14, bubbleH * 0.5);
    ctx.lineTo(-26, bubbleH * 0.5 + 18);
    ctx.lineTo(-2, bubbleH * 0.5);
    ctx.closePath();
    ctx.fill();

    // Glowing Neon Cyan Border
    ctx.strokeStyle = '#00f5ff';
    ctx.lineWidth = 3.0;
    ctx.shadowColor = '#00f5ff';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.roundRect(-bubbleW * 0.5, -bubbleH * 0.5, bubbleW, bubbleH, r);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-14, bubbleH * 0.5);
    ctx.lineTo(-26, bubbleH * 0.5 + 18);
    ctx.lineTo(-2, bubbleH * 0.5);
    ctx.stroke();

    // Radiating red action marks around comic bubble (reference image detail)
    ctx.strokeStyle = '#ff1744';
    ctx.lineWidth = 2.4;
    ctx.shadowColor = '#ff1744';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    // Top right tick
    ctx.moveTo(bubbleW * 0.5 + 4, -bubbleH * 0.35);
    ctx.lineTo(bubbleW * 0.5 + 15, -bubbleH * 0.48);
    // Right middle tick
    ctx.moveTo(bubbleW * 0.5 + 5, 2);
    ctx.lineTo(bubbleW * 0.5 + 17, 4);
    // Top tick
    ctx.moveTo(2, -bubbleH * 0.5 - 4);
    ctx.lineTo(-2, -bubbleH * 0.5 - 14);
    ctx.stroke();

    // Dynamic Comic Text
    ctx.shadowBlur = 0;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';

    if (isMultiLine) {
      ctx.font = '900 24px "Permanent Marker", "Bangers", Impact, sans-serif';
      ctx.fillText(lines[0], 0, -14);
      ctx.font = '900 26px "Permanent Marker", "Bangers", Impact, sans-serif';
      ctx.fillText(lines[1], 0, 15);
    } else {
      ctx.font = '900 24px "Permanent Marker", "Bangers", Impact, sans-serif';
      ctx.fillText(lines[0], 0, -2);
    }

    ctx.restore();
  }

  // ── Radiating Crimson / Electric Slash Marks ───────────────────────────────
  drawSlashMarks() {
    const ctx = this.ctx;
    for (const sl of this.slashMarks) {
      ctx.save();
      ctx.translate(sl.x, sl.y);
      ctx.rotate(sl.angle);
      ctx.globalAlpha = Math.max(0, sl.alpha);

      ctx.strokeStyle = sl.color;
      ctx.lineWidth = sl.width;
      ctx.lineCap = 'round';
      ctx.shadowColor = sl.color;
      ctx.shadowBlur = 10;

      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.quadraticCurveTo(sl.len * 0.5, sl.curve, sl.len, 0);
      ctx.stroke();

      // White-hot inner core streak
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1, sl.width * 0.4);
      ctx.stroke();

      ctx.restore();
    }
  }

  // ── Branching Lightning Arcs (for Taser & Baton) ──────────────────────────
  drawLightningArcs() {
    const ctx = this.ctx;
    for (const la of this.lightningArcs) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, la.alpha);
      ctx.strokeStyle = la.color;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = la.color;
      ctx.shadowBlur = 12;

      ctx.beginPath();
      ctx.moveTo(la.x1, la.y1);

      const steps = 14;
      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        const x = la.x1 + (la.x2 - la.x1) * t;
        const y = la.y1 + (la.y2 - la.y1) * t;
        const jX = (Math.random() - 0.5) * 36;
        const jY = (Math.random() - 0.5) * 36;
        ctx.lineTo(x + jX, y + jY);
      }
      ctx.lineTo(la.x2, la.y2);
      ctx.stroke();

      ctx.restore();
    }
  }

  getBezier(i) {
    const p0 = this.getCatmullPt(i - 1);
    const p1 = this.pts[i];
    const p2 = this.pts[i + 1];
    const p3 = this.getCatmullPt(i + 2);
    return {
      cp1x: p1.x + (p2.x - p0.x) * 0.166667,
      cp1y: p1.y + (p2.y - p0.y) * 0.166667,
      cp2x: p2.x - (p3.x - p1.x) * 0.166667,
      cp2y: p2.y - (p3.y - p1.y) * 0.166667,
      x2: p2.x,
      y2: p2.y,
    };
  }

  getCatmullPt(i) {
    const n = this.pts.length;
    if (i < 0) return { x: 2 * this.pts[0].x - this.pts[1].x, y: 2 * this.pts[0].y - this.pts[1].y };
    if (i >= n) return { x: 2 * this.pts[n - 1].x - this.pts[n - 2].x, y: 2 * this.pts[n - 1].y - this.pts[n - 2].y };
    return this.pts[i];
  }

  loop(currTime) {
    const dt = Math.min(0.1, (currTime - this.lastTime) * 0.001);
    this.lastTime = currTime;

    if (!this.isPaused) {
      this.update(dt);
    }
    this.draw();

    requestAnimationFrame(this.loop);
  }
}
