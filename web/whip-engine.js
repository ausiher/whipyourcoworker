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
    this.taserLatch = null; // { x, y, startTime, lastTapTime, comboTaps, active }

    this.weaponConfigs = {
      whip: {
        id: 'whip',
        name: 'WHIP',
        sub: 'Classic Brown',
        themeColor: '#d97706',
        coreColor: '#78350f',
        glowColor: 'rgba(217, 119, 6, 0.65)',
        sparkColors: ['#d97706', '#b45309', '#92400e', '#fef3c7', '#78350f'],
        phrases: []
      },
      pentung: {
        id: 'pentung',
        name: 'PENTUNG',
        sub: 'Satpam Bash',
        themeColor: '#f59e0b',
        coreColor: '#78350f',
        glowColor: 'rgba(245, 158, 11, 0.65)',
        sparkColors: ['#f59e0b', '#d97706', '#fbbf24', '#ffffff', '#78350f'],
        phrases: []
      },
      baton: {
        id: 'pentung',
        name: 'PENTUNG',
        sub: 'Satpam Bash',
        themeColor: '#f59e0b',
        coreColor: '#78350f',
        glowColor: 'rgba(245, 158, 11, 0.65)',
        sparkColors: ['#f59e0b', '#d97706', '#fbbf24', '#ffffff', '#78350f'],
        phrases: []
      },
      chain: {
        id: 'chain',
        name: 'CHAIN',
        sub: 'Heavy Flail',
        themeColor: '#94a3b8',
        coreColor: '#334155',
        glowColor: 'rgba(148, 163, 184, 0.6)',
        sparkColors: ['#94a3b8', '#cbd5e1', '#ffffff', '#475569', '#64748b'],
        phrases: []
      },
      taser: {
        id: 'taser',
        name: 'TASER',
        sub: 'Arc Latch',
        themeColor: '#00f5ff',
        coreColor: '#ffffff',
        glowColor: 'rgba(0, 245, 255, 0.85)',
        sparkColors: ['#00f5ff', '#38bdf8', '#ffffff', '#818cf8', '#67e8f9'],
        phrases: []
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

  // Indonesian Satpam Ruyung (Double Stick): Solid teak wood strike "TAK!" + metal chain rattle
  playBatonSound(pitchRate = 1.0) {
    if (!this.audioCtx || this.isMuted) return;
    try {
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
      const ctx = this.audioCtx;
      const t = ctx.currentTime;

      // 1. Resonant solid hardwood "TAK!" impact
      const woodOsc = ctx.createOscillator();
      woodOsc.type = 'triangle';
      woodOsc.frequency.setValueAtTime(740 * pitchRate, t);
      woodOsc.frequency.exponentialRampToValueAtTime(140, t + 0.045);

      const woodGain = ctx.createGain();
      woodGain.gain.setValueAtTime(1.3, t);
      woodGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

      woodOsc.connect(woodGain);
      woodGain.connect(this.sfxGain);
      woodOsc.start(t);
      woodOsc.stop(t + 0.065);

      // 2. High-frequency wood crack impulse (noise burst)
      const bufferSize = Math.floor(ctx.sampleRate * 0.025);
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      const nFilter = ctx.createBiquadFilter();
      nFilter.type = 'bandpass';
      nFilter.frequency.setValueAtTime(2200, t);
      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(1.1, t);
      nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
      noise.connect(nFilter);
      nFilter.connect(nGain);
      nGain.connect(this.sfxGain);
      noise.start(t);

      // 3. Steel chain swivel ring
      const chainRing = ctx.createOscillator();
      chainRing.type = 'sine';
      chainRing.frequency.setValueAtTime(3200 * pitchRate, t);
      chainRing.frequency.exponentialRampToValueAtTime(1800, t + 0.08);
      const chainGain = ctx.createGain();
      chainGain.gain.setValueAtTime(0.45, t);
      chainGain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      chainRing.connect(chainGain);
      chainGain.connect(this.sfxGain);
      chainRing.start(t);
      chainRing.stop(t + 0.095);
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

  // Tactical Taser: High-voltage electrical buzz discharge scaling with combo taps
  playTaserSound(comboTaps = 1) {
    if (!this.audioCtx || this.isMuted) return;
    try {
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
      const ctx = this.audioCtx;
      const t = ctx.currentTime;

      const combo = Math.min(8, comboTaps);
      const sparkCount = Math.min(10, 3 + combo * 2);
      const baseFreq = 950 + combo * 180;
      const volume = Math.min(1.4, 0.75 + combo * 0.12);

      for (let s = 0; s < sparkCount; s++) {
        const sparkTime = t + s * (0.024 - Math.min(0.012, combo * 0.0015));
        const osc = ctx.createOscillator();
        osc.type = s % 2 === 0 ? 'sawtooth' : 'square';
        osc.frequency.setValueAtTime((baseFreq + s * 300) * (0.9 + Math.random() * 0.3), sparkTime);
        osc.frequency.exponentialRampToValueAtTime(260, sparkTime + 0.026);

        const sparkGain = ctx.createGain();
        sparkGain.gain.setValueAtTime(volume, sparkTime);
        sparkGain.gain.exponentialRampToValueAtTime(0.001, sparkTime + 0.028);

        osc.connect(sparkGain);
        sparkGain.connect(this.sfxGain);
        osc.start(sparkTime);
        osc.stop(sparkTime + 0.03);
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
      case 'pentung':
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
    if (weaponId === 'baton') weaponId = 'pentung';
    if (!this.weaponConfigs[weaponId]) return;
    this.currentWeapon = weaponId;
    this.playWeaponSwitchSound();
    this.update3DWeaponVisibility();
    this.strike = null;
    if (this.taserLatch) {
      this.taserLatch.active = false;
    }
    this.initWhipPoints();
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
    const meshKey = (this.currentWeapon === 'pentung') ? 'baton' : this.currentWeapon;
    for (const key of ['whip', 'baton', 'chain', 'taser']) {
      if (this.weaponMeshes[key]) {
        this.weaponMeshes[key].visible = (meshKey === key);
      }
    }

    if (this.whipEmitter) {
      const h = 2.85;
      const w = h / (1376 / 768);
      let u = 0.336, v = 0.249;
      if (this.currentWeapon === 'pentung' || this.currentWeapon === 'baton') { u = 0.330; v = 0.160; }
      else if (this.currentWeapon === 'chain') { u = 0.440; v = 0.120; }
      else if (this.currentWeapon === 'taser') { u = 0.340; v = 0.220; }
      this.whipEmitter.position.set((u - 0.5) * w, (0.5 - v) * h, 0.02);
    }

    if (this.rimLight) {
      const cfg = this.weaponConfigs[this.currentWeapon];
      if (cfg) this.rimLight.color.set(cfg.themeColor);
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

    // ── Taser Arc Latch Mode (No whip curve, latch to initial click, combo tap escalates intensity)
    if (this.currentWeapon === 'taser') {
      const isNewLatch = !this.taserLatch || !this.taserLatch.active || (now - this.taserLatch.lastTapTime > 1800);
      if (isNewLatch) {
        this.taserLatch = {
          x: targetX,
          y: targetY,
          startTime: now,
          lastTapTime: now,
          comboTaps: 1,
          active: true
        };
      } else {
        // Tapped again! Remains latched to initial click coordinates, increasing voltage & combo sparks
        this.taserLatch.comboTaps = Math.min(12, this.taserLatch.comboTaps + 1);
        this.taserLatch.lastTapTime = now;
        this.taserLatch.active = true;
      }

      this.triggerImpact(this.taserLatch.x, this.taserLatch.y);

      if (this.onFrenzyChange) {
        this.onFrenzyChange(this.frenzy, this.combo);
      }
      return;
    }

    const baseDuration = (this.currentWeapon === 'chain') ? 240 : ((this.currentWeapon === 'pentung' || this.currentWeapon === 'baton') ? 180 : 200);
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

    // If chain weapon, park points far below screen so the spiked ball does NOT hover in idle
    if (this.currentWeapon === 'chain') {
      for (let i = 0; i < this.segments; i++) {
        const x = this.W * 0.6;
        const y = this.H + 220 + i * 12;
        this.pts.push({ x, y, px: x, py: y });
      }
      return;
    }

    // Natural hanging rope catenary curve for classic whip
    for (let i = 0; i < this.segments; i++) {
      const t = i / (this.segments - 1);
      const x = origin.x - t * (this.W * 0.16) + Math.sin(t * Math.PI) * (this.W * 0.05);
      const y = origin.y + t * (this.H * 0.30) + Math.sin(t * Math.PI) * (this.H * 0.07);
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

    // Combo decays after idle, but Productivity Multiplier does NOT reset/decay to 1.0x when idle
    const timeSinceLastTap = performance.now() - this.lastTapTime;
    if (timeSinceLastTap > 3200 && this.combo > 1) {
      this.combo = 1;
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

      const isPentung = (this.currentWeapon === 'pentung' || this.currentWeapon === 'baton');

      if (isPentung) {
        // Pentung: Overhead downward bash diagonally across screen
        if (progress < 0.28) {
          // Cock high overhead
          const p = progress / 0.28;
          armTargetX += 0.22 * Math.sin(p * Math.PI * 0.5);
          armTargetY += 0.42 * Math.sin(p * Math.PI * 0.5);
          armTargetZ += 0.22 * Math.sin(p * Math.PI * 0.5);
          armRotX -= 0.65 * Math.sin(p * Math.PI * 0.5);
          armRotZ += 0.42 * Math.sin(p * Math.PI * 0.5);
        } else if (progress < 0.65) {
          // Smash down diagonally across the whole screen
          const p = (progress - 0.28) / 0.37;
          const ease = p * p * (3 - 2 * p);
          armTargetX -= 0.55 * ease;
          armTargetY -= 0.65 * ease;
          armTargetZ -= 0.35 * ease;
          armRotX += 1.05 * ease;
          armRotZ -= 0.75 * ease;
        } else if (!this.strike.impactFired) {
          this.strike.impactFired = true;
          this.triggerImpact(this.strike.targetX, this.strike.targetY);
        } else {
          // Stiff blunt rebound
          const p = (progress - 0.65) / 0.35;
          const recoilOsc = Math.sin(p * Math.PI * 4) * Math.exp(-p * 5.5) * 0.16;
          armTargetX += recoilOsc;
          armTargetY += recoilOsc * 0.6;
          armRotZ += recoilOsc * 0.5;
        }
      } else {
        // Standard whip & flail arm kinematics
        if (progress < 0.22) {
          const p = progress / 0.22;
          armTargetX += 0.12 * Math.sin(p * Math.PI * 0.5);
          armTargetY -= 0.10 * Math.sin(p * Math.PI * 0.5);
          armTargetZ += 0.28 * Math.sin(p * Math.PI * 0.5);
          armRotX -= 0.22 * Math.sin(p * Math.PI * 0.5);
          armRotZ += 0.16 * Math.sin(p * Math.PI * 0.5);
        } else if (progress < 0.65) {
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
          this.strike.impactFired = true;
          tipTarget = { x: this.strike.targetX, y: this.strike.targetY };
          this.triggerImpact(this.strike.targetX, this.strike.targetY);
        } else {
          const p = (progress - 0.65) / 0.35;
          const recoilOsc = Math.sin(p * Math.PI * 3.5) * Math.exp(-p * 4.5) * 0.12;
          armTargetX += 0.08 * (1 - p) + recoilOsc;
          armTargetY -= 0.06 * (1 - p) - recoilOsc * 0.5;
          armTargetZ += recoilOsc * 0.8;
          armRotZ += recoilOsc * 0.4;
        }
      }

      if (progress >= 1.0) {
        this.strike = null;
      }
    }

    // Taser active discharge recoil jitter
    if (this.currentWeapon === 'taser' && this.taserLatch && this.taserLatch.active) {
      const jitterAmp = 0.008 * Math.min(5, this.taserLatch.comboTaps);
      armTargetX += (Math.random() - 0.5) * jitterAmp;
      armTargetY += (Math.random() - 0.5) * jitterAmp;
      armRotZ += (Math.random() - 0.5) * jitterAmp * 2.5;
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

    // Natural Classic Whip Physics (Verlet Rope Dynamics)
    if (this.currentWeapon === 'whip') {
      const gravity = 1.15;
      const damping = 0.94;

      for (let i = 1; i < this.pts.length; i++) {
        const p = this.pts[i];
        const vx = (p.x - p.px) * damping;
        const vy = (p.y - p.py) * damping;
        p.px = p.x;
        p.py = p.y;
        p.x += vx;
        p.y += vy + gravity;

        // Natural idle rope sway (not pinned to a static bezier curve)
        if (!this.strike) {
          const t = i / (this.pts.length - 1);
          const sway = Math.sin(this.time * 2.2 + t * 2.0) * (0.45 * t);
          p.x += sway;
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
      const iters = 8;
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
    }

    this.updateFX(dt);
  }

  // ── Impact Trigger ────────────────────────────────────────────────────────
  triggerImpact(x, y) {
    this.whipCount++;
    if (this.currentWeapon === 'taser' && this.taserLatch) {
      this.playTaserSound(this.taserLatch.comboTaps);
    } else {
      this.playWeaponSound();
    }

    if ('vibrate' in navigator) {
      try {
        const vib = Math.min(90, 40 + this.frenzy * 14);
        navigator.vibrate([vib, 20, vib * 1.3]);
      } catch {}
    }

    this.screenShake = 16 + this.frenzy * 5;
    const cfg = this.weaponConfigs[this.currentWeapon];

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

    // 5. Taser Electric Lightning Arcs
    if (this.currentWeapon === 'taser') {
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

    this.ctx.restore();
  }

  // ── Draw Specific Weapon Visuals ──────────────────────────────────────────
  drawCurrentWeapon() {
    switch (this.currentWeapon) {
      case 'pentung':
      case 'baton':
        this.drawPentungVisual();
        break;
      case 'chain':
        this.drawChainVisual();
        break;
      case 'taser':
        this.drawTaserVisual();
        break;
      case 'whip':
      default:
        this.drawClassicBrownWhip();
        break;
    }
  }

  // ── Classic Braided Brown Leather Whip ────────────────────────────────────
  drawClassicBrownWhip() {
    if (this.pts.length < 2) return;
    const ctx = this.ctx;
    ctx.save();

    const n = this.pts.length;

    // 1. Draw tapered braided leather body
    // Outer leather shadow & depth
    ctx.beginPath();
    ctx.moveTo(this.pts[0].x, this.pts[0].y);
    for (let i = 0; i < n - 1; i++) {
      const b = this.getBezier(i);
      ctx.bezierCurveTo(b.cp1x, b.cp1y, b.cp2x, b.cp2y, b.x2, b.y2);
    }
    ctx.strokeStyle = '#271105'; // dark leather crease
    ctx.lineWidth = 10.0 + this.frenzy * 0.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Main rich saddle-brown braided core
    ctx.beginPath();
    ctx.moveTo(this.pts[0].x, this.pts[0].y);
    for (let i = 0; i < n - 1; i++) {
      const b = this.getBezier(i);
      ctx.bezierCurveTo(b.cp1x, b.cp1y, b.cp2x, b.cp2y, b.x2, b.y2);
    }
    ctx.strokeStyle = '#78350f'; // rich warm brown
    ctx.lineWidth = 7.0 + this.frenzy * 0.4;
    ctx.stroke();

    // Inner tan highlight ridge
    ctx.beginPath();
    ctx.moveTo(this.pts[0].x, this.pts[0].y);
    for (let i = 0; i < n - 1; i++) {
      const b = this.getBezier(i);
      ctx.bezierCurveTo(b.cp1x, b.cp1y, b.cp2x, b.cp2y, b.x2, b.y2);
    }
    ctx.strokeStyle = '#d97706'; // tan leather sheen
    ctx.lineWidth = 3.0;
    ctx.stroke();

    // 2. Leather Braiding Segments along the lash
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const p = this.pts[i];
      const prev = this.pts[Math.max(0, i - 1)];
      const next = this.pts[Math.min(n - 1, i + 1)];
      const angle = Math.atan2(next.y - prev.y, next.x - prev.x);

      const w = 18 * (1 - t * 0.65) + 3; // Tapers from base to tip
      const h = 8 * (1 - t * 0.35) + 2;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(angle);

      // Braided leather weave segment
      const grad = ctx.createLinearGradient(-h * 0.5, 0, h * 0.5, 0);
      grad.addColorStop(0, '#451a03');
      grad.addColorStop(0.35, '#b45309');
      grad.addColorStop(0.7, '#78350f');
      grad.addColorStop(1, '#290f02');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(-h * 0.5, -w * 0.5, h, w, 2);
      ctx.fill();

      // Alternating diagonal chevron braid seam
      ctx.strokeStyle = (i % 2 === 0) ? '#d97706' : '#290f02';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(-h * 0.4, -w * 0.45);
      ctx.lineTo(h * 0.4, w * 0.45);
      ctx.stroke();

      ctx.restore();
    }

    // 3. Brass Ferrule at whip root
    const root = this.pts[0];
    const rootNext = this.pts[1];
    const rootAngle = Math.atan2(rootNext.y - root.y, rootNext.x - root.x);
    ctx.save();
    ctx.translate(root.x, root.y);
    ctx.rotate(rootAngle);
    const brassGrad = ctx.createLinearGradient(-8, 0, 8, 0);
    brassGrad.addColorStop(0, '#78350f');
    brassGrad.addColorStop(0.4, '#fde047');
    brassGrad.addColorStop(0.8, '#d4af37');
    brassGrad.addColorStop(1, '#78350f');
    ctx.fillStyle = brassGrad;
    ctx.beginPath();
    ctx.roundRect(-8, -12, 16, 24, 3);
    ctx.fill();
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();

    // 4. Genuine Leather Fall & Red/White Cracker Knot at Tip
    const tip = this.pts[n - 1];
    const tipPrev = this.pts[n - 2];
    const tipAngle = Math.atan2(tip.y - tipPrev.y, tip.x - tipPrev.x);
    ctx.save();
    ctx.translate(tip.x, tip.y);
    ctx.rotate(tipAngle);

    // Leather Fall thong (narrow strip extending beyond last point)
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(15, Math.sin(this.time * 5) * 6, 28, 0);
    ctx.stroke();

    // Red yarn cracker/popper at the extreme end
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(28, 0);
    ctx.lineTo(38, Math.sin(this.time * 8) * 8);
    ctx.stroke();

    // Knot bead
    ctx.fillStyle = '#fef2f2';
    ctx.beginPath();
    ctx.arc(28, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    // Supersonic crack shockwave if striking
    if (this.strike && this.strike.impactFired) {
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(32, 0, 16, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
    ctx.restore();
  }

  // ── Traditional Indonesian Satpam Pentung (Tongkat Satpam Nightstick) ─────
  drawPentungVisual() {
    const ctx = this.ctx;
    const origin = this.getEmitterScreenPos();
    ctx.save();

    const batonLen = Math.max(150, Math.min(240, this.H * 0.25));
    const batonW = 16;
    let swingAngle = -Math.PI * 0.58; // Idle guard angle pointing up-left

    if (this.strike) {
      const elapsed = performance.now() - this.strike.startTime;
      const progress = Math.min(1, Math.max(0, elapsed / this.strike.duration));

      const dx = this.strike.targetX - origin.x;
      const dy = this.strike.targetY - origin.y;
      const targetAngle = Math.atan2(dy, dx);

      const startAng = -Math.PI * 0.58 - 0.55;
      const endAng = targetAngle + 0.45;

      if (progress < 0.28) {
        // Cock back overhead
        const p = progress / 0.28;
        swingAngle = -Math.PI * 0.58 - p * 0.55;
      } else if (progress < 0.65) {
        // Forward high-speed downward slash diagonally across the entire screen
        const p = (progress - 0.28) / 0.37;
        const ease = p * p * (3 - 2 * p);
        swingAngle = startAng + (endAng - startAng) * ease;

        // Draw Motion Blur Sweep Arc across screen
        ctx.save();
        ctx.beginPath();
        ctx.arc(origin.x, origin.y, batonLen * 0.95, startAng, swingAngle, false);
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
        ctx.lineWidth = batonLen * 0.48;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(origin.x, origin.y, batonLen, startAng, swingAngle, false);
        ctx.strokeStyle = 'rgba(254, 240, 138, 0.85)';
        ctx.lineWidth = 6.5;
        ctx.stroke();
        ctx.restore();
      } else {
        // Stiff blunt rebound back to guard
        const p = (progress - 0.65) / 0.35;
        const recoilOsc = Math.sin(p * Math.PI * 3.5) * Math.exp(-p * 5.2) * 0.22;
        swingAngle = -Math.PI * 0.58 + recoilOsc;
      }
    } else {
      // Idle natural breathing sway
      const sway = Math.sin(this.time * 2.2) * 0.04;
      swingAngle += sway;
    }

    // Draw the Stiff Satpam Pentung Body
    ctx.save();
    ctx.translate(origin.x, origin.y);
    ctx.rotate(swingAngle);

    // 1. Heavy Ribbed Hardwood / Black Rubber Cylinder
    const batonGrad = ctx.createLinearGradient(0, -batonW * 0.5, 0, batonW * 0.5);
    batonGrad.addColorStop(0, '#1c1917');
    batonGrad.addColorStop(0.22, '#451a03');
    batonGrad.addColorStop(0.5, '#78350f');
    batonGrad.addColorStop(0.78, '#29180d');
    batonGrad.addColorStop(1, '#0c0a09');

    // Main shaft
    ctx.fillStyle = batonGrad;
    ctx.beginPath();
    ctx.roundRect(-batonLen * 0.15, -batonW * 0.5, batonLen, batonW, 4);
    ctx.fill();

    // 2. Ribbed Non-Slip Grip Handle
    const gripStart = -batonLen * 0.12;
    const gripEnd = batonLen * 0.25;
    const gripSteps = 8;
    ctx.strokeStyle = '#0a0a0a';
    ctx.lineWidth = 2.4;
    for (let g = 0; g < gripSteps; g++) {
      const gx = gripStart + (gripEnd - gripStart) * (g / (gripSteps - 1));
      ctx.beginPath();
      ctx.moveTo(gx, -batonW * 0.55);
      ctx.lineTo(gx, batonW * 0.55);
      ctx.stroke();
    }

    // 3. Satpam Indonesian Gold Accent Rings
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(gripEnd + 4, -batonW * 0.55);
    ctx.lineTo(gripEnd + 4, batonW * 0.55);
    ctx.moveTo(gripEnd + 8, -batonW * 0.55);
    ctx.lineTo(gripEnd + 8, batonW * 0.55);
    ctx.moveTo(batonLen * 0.75, -batonW * 0.52);
    ctx.lineTo(batonLen * 0.75, batonW * 0.52);
    ctx.stroke();

    // 4. Solid Rounded Tip Cap
    ctx.fillStyle = '#292524';
    ctx.beginPath();
    ctx.arc(batonLen * 0.85, 0, batonW * 0.52, -Math.PI * 0.5, Math.PI * 0.5);
    ctx.fill();
    ctx.strokeStyle = '#78716c';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // 5. Pommel & Lanyard Wrist Loop at base
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.arc(-batonLen * 0.14, 0, batonW * 0.65, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Lanyard cord hanging from pommel with natural physics sway
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-batonLen * 0.14, 0);
    const cordSway = Math.sin(this.time * 3.5) * 8;
    ctx.quadraticCurveTo(-batonLen * 0.22, 18 + cordSway, -batonLen * 0.12, 34);
    ctx.stroke();

    ctx.restore();
    ctx.restore();
  }

  // ── Heavy Iron Spiked Flail Chain Visual (Dynamic Multi-Link Whip-Lash) ─────
  drawChainVisual() {
    if (this.currentWeapon !== 'chain') return;
    if (!this.strike) return; // HIDDEN in idle! Spiked ball never hovers on screen!

    const ctx = this.ctx;
    const origin = this.getEmitterScreenPos();
    const elapsed = performance.now() - this.strike.startTime;
    const progress = Math.min(1, Math.max(0, elapsed / this.strike.duration));

    const targetX = this.strike.targetX;
    const targetY = this.strike.targetY;
    const bottomStartX = this.W * 0.62;
    const bottomStartY = this.H + 190;

    let ballX, ballY;

    if (progress < 0.58) {
      // Phase 1: Hurling UP from bottom to target with whip-lash acceleration
      const p = progress / 0.58;
      const ease = p * p * (3 - 2 * p);
      ballX = bottomStartX + (targetX - bottomStartX) * ease;
      ballY = bottomStartY + (targetY - bottomStartY) * ease;
    } else {
      // Phase 2: Post-impact recoil - heavy morningstar drops back down off screen
      const p = (progress - 0.58) / 0.42;
      ballX = targetX + Math.sin(p * Math.PI) * 28;
      ballY = targetY + p * p * (this.H * 1.05); // Plunges down
    }

    ctx.save();

    // Dynamic Multi-Link Catenary Curve with Wave Sag & Inertia
    const chainLinksCount = 18;
    const chainPoints = [];
    for (let c = 0; c <= chainLinksCount; c++) {
      const t = c / chainLinksCount;
      const sag = Math.sin(t * Math.PI) * (70 * (1 - progress * 0.45));
      const wave = Math.sin(t * Math.PI * 2 - progress * 8) * (14 * (1 - progress));
      const cx = origin.x + (ballX - origin.x) * t + wave;
      const cy = origin.y + (ballY - origin.y) * t + sag;
      chainPoints.push({ x: cx, y: cy });
    }

    // 1. Draw Interlocking Heavy Dark Iron Chain Links
    for (let i = 0; i < chainPoints.length - 1; i++) {
      const p1 = chainPoints[i];
      const p2 = chainPoints[i + 1];
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
        ctx.lineWidth = 5.2;
        ctx.beginPath();
        ctx.ellipse(0, 0, Math.max(8, dist * 0.48), 7.5, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#cbd5e1'; // Specular sheen
        ctx.lineWidth = 1.6;
        ctx.stroke();
      } else {
        // Edge-profile link
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.roundRect(-dist * 0.35, -4, dist * 0.7, 8, 3);
        ctx.fill();
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.0;
        ctx.stroke();
      }

      ctx.restore();
    }

    // 2. Heavy Spiked Morningstar Iron Ball
    ctx.save();
    ctx.translate(ballX, ballY);

    const ballRadius = 26 + this.frenzy * 2.2;
    const spikeCount = 10;

    // Conical spikes radiating from morningstar with high-velocity rotation
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;

    for (let s = 0; s < spikeCount; s++) {
      const ang = (s / spikeCount) * Math.PI * 2 + progress * 16.0; // Fast spin in flight
      const spikeLen = 15 + (s % 2 === 0 ? 7 : 0);

      ctx.save();
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.moveTo(-5.5, ballRadius * 0.82);
      ctx.lineTo(0, ballRadius + spikeLen);
      ctx.lineTo(5.5, ballRadius * 0.82);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Iron Sphere Body with Specular Highlight
    const sphereGrad = ctx.createRadialGradient(-7, -7, 2, 0, 0, ballRadius);
    sphereGrad.addColorStop(0, '#e2e8f0');
    sphereGrad.addColorStop(0.25, '#64748b');
    sphereGrad.addColorStop(0.7, '#1e293b');
    sphereGrad.addColorStop(1, '#020617');

    ctx.fillStyle = sphereGrad;
    ctx.beginPath();
    ctx.arc(0, 0, ballRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    ctx.restore();
    ctx.restore();
  }

  // ── Tactical Dual-Prong Taser Arc Latch (Latches to click, escalates with combo) ──
  drawTaserVisual() {
    if (this.currentWeapon !== 'taser') return;
    if (!this.taserLatch || !this.taserLatch.active) return;

    const ctx = this.ctx;
    const origin = this.getEmitterScreenPos();
    const target = { x: this.taserLatch.x, y: this.taserLatch.y };
    const combo = this.taserLatch.comboTaps || 1;

    const elapsedSinceTap = performance.now() - this.taserLatch.lastTapTime;
    if (elapsedSinceTap > 1800) {
      this.taserLatch.active = false;
      return;
    }

    const intensityFade = Math.max(0, 1 - (elapsedSinceTap / 1800));

    ctx.save();

    // 1. Dual Dart Wires (Thin copper wires connecting muzzle to latched darts)
    const offsets = [-8, 8];
    offsets.forEach(off => {
      ctx.beginPath();
      ctx.moveTo(origin.x + off, origin.y);
      const wireSteps = 16;
      for (let s = 1; s <= wireSteps; s++) {
        const t = s / wireSteps;
        const wx = origin.x + off + (target.x - (origin.x + off)) * t;
        const sag = Math.sin(t * Math.PI) * (18 / (1 + combo * 0.3)); // Tightens as voltage increases
        const wy = origin.y + (target.y - origin.y) * t + sag;
        const jitterX = (Math.random() - 0.5) * (2 + combo * 0.8);
        const jitterY = (Math.random() - 0.5) * (2 + combo * 0.8);
        ctx.lineTo(wx + jitterX, wy + jitterY);
      }
      ctx.strokeStyle = `rgba(180, 220, 255, ${0.45 * intensityFade})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    });

    // 2. High-Voltage Primary Lightning Arcs scaling with combo
    const boltCount = Math.min(7, 2 + Math.floor(combo * 0.7));
    for (let b = 0; b < boltCount; b++) {
      ctx.beginPath();
      ctx.moveTo(origin.x + (b % 2 === 0 ? -6 : 6), origin.y);

      const steps = 18;
      let curX = origin.x;
      let curY = origin.y;
      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        const tx = origin.x + (target.x - origin.x) * t;
        const ty = origin.y + (target.y - origin.y) * t;

        const maxJitter = (8 + combo * 3.5) * Math.sin(t * Math.PI);
        const jx = (Math.random() - 0.5) * maxJitter;
        const jy = (Math.random() - 0.5) * maxJitter;

        ctx.lineTo(tx + jx, ty + jy);
        curX = tx + jx;
        curY = ty + jy;

        // Erratic branching sub-sparks
        if (s % 4 === 0 && Math.random() < (0.35 + combo * 0.08)) {
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(curX, curY);
          const branchLen = (12 + combo * 4) * (Math.random() > 0.5 ? 1 : -1);
          ctx.lineTo(curX + branchLen, curY + (Math.random() - 0.5) * branchLen);
          ctx.strokeStyle = '#00f5ff';
          ctx.lineWidth = 1.2;
          ctx.stroke();
          ctx.restore();
        }
      }
      ctx.lineTo(target.x, target.y);

      ctx.strokeStyle = (b === 0) ? '#ffffff' : (b % 2 === 0 ? '#00f5ff' : '#38bdf8');
      ctx.lineWidth = (b === 0 ? 3.5 : 2.0) + Math.min(3, combo * 0.4);
      ctx.shadowColor = '#00f5ff';
      ctx.shadowBlur = 12 + combo * 3;
      ctx.stroke();
    }

    // 3. Stun Electrode Node at target coordinate (latch site)
    const glowRadius = 16 + combo * 4;
    const radialGrad = ctx.createRadialGradient(target.x, target.y, 2, target.x, target.y, glowRadius);
    radialGrad.addColorStop(0, '#ffffff');
    radialGrad.addColorStop(0.35, '#00f5ff');
    radialGrad.addColorStop(0.7, 'rgba(0, 245, 255, 0.45)');
    radialGrad.addColorStop(1, 'rgba(0, 245, 255, 0)');

    ctx.fillStyle = radialGrad;
    ctx.beginPath();
    ctx.arc(target.x, target.y, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    // Dual barbed darts stuck in target
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(target.x - 7, target.y, 4, 0, Math.PI * 2);
    ctx.arc(target.x + 7, target.y, 4, 0, Math.PI * 2);
    ctx.fill();

    // High frequency electric sparks around latch site
    const sparkCount = 4 + combo * 2;
    for (let sp = 0; sp < sparkCount; sp++) {
      const spAng = Math.random() * Math.PI * 2;
      const spDist = Math.random() * (glowRadius * 1.2);
      ctx.fillStyle = sp % 2 === 0 ? '#ffffff' : '#38bdf8';
      ctx.beginPath();
      ctx.arc(target.x + Math.cos(spAng) * spDist, target.y + Math.sin(spAng) * spDist, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

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
