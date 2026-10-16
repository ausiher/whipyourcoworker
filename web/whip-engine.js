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
    this.currentWeapon = 'whip'; // 'whip' | 'chain' | 'taser'
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

    // ── Whip & Physics Points ───────────────────────────────────────────────
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
    this.callouts = []; // Indonesian satire WhatsApp chat popouts
    this.onScreenShake = null; // High-impact screen shake callback for container & MAX hits
    this.memesEnabled = true;
    this.memePhrases = [
      'KITA DI SINI KELUARGA!',
      'DEMI PENGALAMAN KAMU!',
      'KERJA IKHLAS ITU BERKAH!',
      'LOYALITAS TANPA BATAS!',
      'JANGAN HITUNG-HITUNGAN!',
      'MASIH UNTUNG DIGAJI!',
      'DI LUAR BANYAK YG NGANTRI!',
      'MENTAL KAMU TEMPE!',
      'OVERTIME DEMI MASA DEPAN!',
      'BUKTIKAN DEDIKASI KAMU!',
      'PASSION NOMOR SATU!',
      'INVESTASI LEHER KE ATAS!',
      'ANGGAP AJA BELAJAR!',
      'KURANG BERSYUKUR KAMU!',
      'SAYA DULU LEBIH PARAH!',
      'KERJA CERDAS DONG!'
    ];
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

    if (deltaMag >= 10.5 || totalMag >= 16.5) {
      this.lastSwingTime = now;
      this.unlockAudio();

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
        this.chainSoundFiles = [
          'sounds/chain_hit_1.wav',
          'sounds/chain_hit_2.wav',
          'sounds/chain_hit_3.wav'
        ];
        this.chainBuffers = [];
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

    if (this.chainSoundFiles) {
      for (const src of this.chainSoundFiles) {
        try {
          const resp = await fetch(src);
          if (resp.ok) {
            const arrayBuffer = await resp.arrayBuffer();
            const decoded = await this.audioCtx.decodeAudioData(arrayBuffer);
            this.chainBuffers.push(decoded);
          }
        } catch (e) {
          // Fallback to procedural synthesis
        }
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

  // Heavy Forged Iron Spiked Flail / Mace Strike
  playChainSound(pitchRate = 1.0) {
    if (!this.audioCtx || this.isMuted) return;
    try {
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
      const ctx = this.audioCtx;
      const t = ctx.currentTime;
      const varPitch = pitchRate * (0.92 + Math.random() * 0.16);

      // Play authentic cast iron mace clank WAV if available
      if (this.chainBuffers && this.chainBuffers.length > 0) {
        const buf = this.chainBuffers[Math.floor(Math.random() * this.chainBuffers.length)];
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.playbackRate.value = varPitch;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(1.4, t);
        src.connect(gain);
        gain.connect(this.sfxGain);
        src.start(t);
        return;
      }

      // 1. Heavy Mass Kinetic Thud (Deep physical morningstar weight)
      const thudOsc = ctx.createOscillator();
      thudOsc.type = 'triangle';
      thudOsc.frequency.setValueAtTime(125 * varPitch, t);
      thudOsc.frequency.exponentialRampToValueAtTime(26, t + 0.17);

      const thudGain = ctx.createGain();
      thudGain.gain.setValueAtTime(1.4, t);
      thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.19);

      thudOsc.connect(thudGain);
      thudGain.connect(this.sfxGain);
      thudOsc.start(t);
      thudOsc.stop(t + 0.20);

      // 2. Multi-Part Inharmonic Iron Plate CLANG ("KLAAANG!")
      const partialFreqs = [640, 1120, 1680, 2740, 3950];
      partialFreqs.forEach((baseF, idx) => {
        const osc = ctx.createOscillator();
        osc.type = (idx % 2 === 0) ? 'sawtooth' : 'square';
        const f = baseF * varPitch * (0.94 + Math.random() * 0.12);
        osc.frequency.setValueAtTime(f, t);
        osc.frequency.exponentialRampToValueAtTime(f * 0.70, t + 0.26);

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(f, t);
        filter.Q.setValueAtTime(9 + idx * 2.5, t);

        const gain = ctx.createGain();
        const initialAmp = (1.2 / (idx + 1)) * 0.70;
        gain.gain.setValueAtTime(initialAmp, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.20 + idx * 0.035);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(t);
        osc.stop(t + 0.27);
      });

      // 3. Cascading Iron Chain Links Clinking / Chattering (4-6 staggered link impacts)
      const rattleLinks = 4 + Math.floor(Math.random() * 3);
      for (let r = 0; r < rattleLinks; r++) {
        const linkDelay = 0.028 + r * (0.022 + Math.random() * 0.016);
        const linkTime = t + linkDelay;
        const linkFreq = (2200 + Math.random() * 2800) * varPitch;

        const linkOsc = ctx.createOscillator();
        linkOsc.type = 'sine';
        linkOsc.frequency.setValueAtTime(linkFreq, linkTime);
        linkOsc.frequency.exponentialRampToValueAtTime(linkFreq * 0.42, linkTime + 0.042);

        const linkGain = ctx.createGain();
        linkGain.gain.setValueAtTime(0.48 * (1 - r * 0.14), linkTime);
        linkGain.gain.exponentialRampToValueAtTime(0.001, linkTime + 0.045);

        linkOsc.connect(linkGain);
        linkGain.connect(this.sfxGain);

        linkOsc.start(linkTime);
        linkOsc.stop(linkTime + 0.048);
      }
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
    this.strike = null;
    if (this.taserLatch) {
      this.taserLatch.active = false;
    }
    this.initWhipPoints();
    if (this.onWeaponChange) {
      this.onWeaponChange(weaponId);
    }
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
    for (const key of ['whip', 'chain', 'taser']) {
      if (this.weaponMeshes[key]) {
        this.weaponMeshes[key].visible = (this.currentWeapon === key);
      }
    }
    if (this.weaponMeshes['baton']) {
      this.weaponMeshes['baton'].visible = false;
    }

    if (this.whipEmitter) {
      const h = 2.85;
      const w = h / (1376 / 768);
      let u = 0.336, v = 0.249;
      if (this.currentWeapon === 'chain') { u = 0.440; v = 0.120; }
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
      tierName = 'MAX ⚡ (4.0x)';
      tierColor = '#00f5ff';
    } else if (this.frenzy >= 2.8) {
      tierName = 'PEAK ⚡ (3.0x)';
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

    // Bishi Bashi / Tap Tap Intensity Engine:
    // Taps rapidly pump up intensity (+0.28 per tap up to 4.0x) and combo streak
    if (timeSinceLastTap < 1100) {
      this.combo++;
      this._comboFloat = this.combo;
      this.frenzy = Math.min(4.0, this.frenzy + 0.28);
    } else {
      this.combo = 1;
      this._comboFloat = 1;
      this.frenzy = Math.min(4.0, Math.max(1.0, this.frenzy + 0.25));
    }
    this.lastTapTime = now;

    // Check for level up chime crossing tiers
    const currentTier = this.frenzy >= 3.8 ? 4 : (this.frenzy >= 2.8 ? 3 : (this.frenzy >= 1.8 ? 2 : 1));
    if (currentTier > this.lastTierAlert) {
      this.playLevelUpChime(currentTier);
      this.lastTierAlert = currentTier;
    }

    // ── Taser Arc Latch Mode (No whip curve, latch to initial click, combo tap escalates intensity)
    if (this.currentWeapon === 'taser') {
      const isNewLatch = !this.taserLatch || !this.taserLatch.active || (now - this.taserLatch.lastTapTime > 2200);
      if (isNewLatch) {
        this.taserLatch = {
          screenX: targetX,
          screenY: targetY,
          x: targetX,
          y: targetY,
          initialGyroX: this.gyroTilt.x,
          initialGyroY: this.gyroTilt.y,
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

      this.triggerImpact(this.taserLatch.screenX || this.taserLatch.x, this.taserLatch.screenY || this.taserLatch.y);

      if (this.onFrenzyChange) {
        this.onFrenzyChange(this.frenzy, this.combo);
      }
      return;
    }

    // Chain Flail has distinct swing trajectory, inertia weight & freeze frame per strike
    const isChain = (this.currentWeapon === 'chain');
    const baseDuration = isChain ? (360 + Math.random() * 80) : 200;
    const strikeDuration = Math.max(95, baseDuration / Math.pow(this.frenzy, 0.45));

    this.strike = {
      startTime: now,
      duration: strikeDuration,
      targetX,
      targetY,
      impactFired: false,
      // Chain physics variations per strike (heavier feeling, different trajectories)
      swingStyle: Math.floor(Math.random() * 3), // 0: Overhead arc slam, 1: Lateral centrifugal slash, 2: Deep catapult surge
      sagAmp: (50 + Math.random() * 45), // varying chain sag weight
      waveAmp: (10 + Math.random() * 12),
      chainLinks: 16 + Math.floor(Math.random() * 6),
      impactAngle: (Math.random() - 0.5) * 1.5,
      weightTremor: 3.5 + Math.random() * 2.5
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

    // ── Bishi Bashi / Tap Tap Continuous Intensity & Combo Decay ────────────
    // If player pauses or stops tapping, intensity immediately begins draining in real time
    const timeSinceLastTap = performance.now() - this.lastTapTime;
    if (timeSinceLastTap > 320 && !this.lockFrenzy) {
      // Drain rate accelerates at higher tiers to force intense tapping to retain MAX ⚡
      const decaySpeed = 0.52 + (this.frenzy - 1.0) * 0.42;
      const oldFrenzy = this.frenzy;
      this.frenzy = Math.max(1.0, this.frenzy - decaySpeed * dt);

      // Combo also bleeds down when intensity drops or user pauses > 750ms
      if (this.combo > 1 && timeSinceLastTap > 750) {
        if (!this._comboFloat) this._comboFloat = this.combo;
        this._comboFloat = Math.max(1.0, this._comboFloat - 3.2 * dt);
        const newCombo = Math.floor(this._comboFloat);
        if (newCombo !== this.combo) {
          this.combo = newCombo;
        }
      }

      if (this.onFrenzyChange && (Math.abs(oldFrenzy - this.frenzy) > 0.02 || this.frenzy === 1.0)) {
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
      const elapsed = (this.strike.elapsed !== undefined) ? this.strike.elapsed : (performance.now() - this.strike.startTime);
      const progress = Math.min(1, Math.max(0, elapsed / this.strike.duration));

      const emitterScreen = this.getEmitterScreenPos();
      const dx = this.strike.targetX - emitterScreen.x;
      const dy = this.strike.targetY - emitterScreen.y;
      strikeAimAngle = Math.atan2(dy, dx);

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

      // Angular bending stiffness to prevent rope kinking or sharp zigzags
      for (let i = 1; i < this.pts.length - 1; i++) {
        const pPrev = this.pts[i - 1];
        const pCurr = this.pts[i];
        const pNext = this.pts[i + 1];
        const midX = (pPrev.x + pNext.x) * 0.5;
        const midY = (pPrev.y + pNext.y) * 0.5;
        pCurr.x += (midX - pCurr.x) * 0.25;
        pCurr.y += (midY - pCurr.y) * 0.25;
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

    const isMax = this.frenzy >= 3.8;
    this.screenShake = (isMax ? 36 : 18) + this.frenzy * 7;
    if (this.onScreenShake) {
      this.onScreenShake(this.screenShake, isMax);
    }
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

    // 6. Indonesian Satire Workplace Meme Popout (manipulative gaslighting boss quotes)
    if (this.memesEnabled && this.memePhrases && this.memePhrases.length > 0) {
      const phrase = this.memePhrases[Math.floor(Math.random() * this.memePhrases.length)];
      // Spawn at a random position across the screen so they pop up dynamically everywhere
      const marginX = Math.min(130, this.W * 0.20);
      const marginY = Math.min(110, this.H * 0.16);
      const randX = marginX + Math.random() * (this.W - marginX * 2);
      const randY = marginY + Math.random() * (this.H * 0.50);

      const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      this.callouts.push({
        text: phrase,
        x: randX,
        y: randY,
        rotation: (Math.random() - 0.5) * 0.08,
        scale: 0.15,
        targetScale: 1.0,
        alpha: 1.0,
        age: 0,
        life: 1.85,
        timeStr: timeNow
      });
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



    // Callout WhatsApp speech bubbles
    for (let i = this.callouts.length - 1; i >= 0; i--) {
      const c = this.callouts[i];
      c.age += dt;
      if (c.scale < c.targetScale) c.scale += (c.targetScale - c.scale) * 0.38;
      if (c.age > c.life * 0.65) {
        c.alpha -= dt * 2.4;
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

    // 1. Draw Active 2D Weapon Physics (Cyber-Spine Whip / Taser)
    this.drawCurrentWeapon();

    // 2. Render Three.js 3D Tactical Arm onto Canvas
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }

    // 3. Draw Lightning Arcs (for Taser)
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

    // 7. Draw Indonesian Satire WhatsApp Chat Bubbles
    this.drawCallouts();

    this.ctx.restore();
  }



  drawCallouts() {
    for (const c of this.callouts) {
      this.drawComicCallout(c);
    }
  }

  // ── Draw Specific Weapon Visuals ──────────────────────────────────────────
  drawCurrentWeapon() {
    switch (this.currentWeapon) {
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

  // ── Classic Braided Brown Leather Whip (Continuous Tapered Quad Strip) ─────
  drawClassicBrownWhip() {
    if (this.pts.length < 2) return;
    const ctx = this.ctx;
    ctx.save();

    const n = this.pts.length;

    // 1. Calculate tangent and normal vectors + local taper width at each spline node
    const normals = [];
    const tangents = [];
    const widths = [];

    for (let i = 0; i < n; i++) {
      const prev = this.pts[Math.max(0, i - 1)];
      const next = this.pts[Math.min(n - 1, i + 1)];
      let tx = next.x - prev.x;
      let ty = next.y - prev.y;
      const len = Math.hypot(tx, ty) || 0.001;
      tx /= len;
      ty /= len;
      tangents.push({ x: tx, y: ty, angle: Math.atan2(ty, tx) });
      normals.push({ x: -ty, y: tx });

      // Organic taper: ~15px at handle base down to ~2.8px at cracker tip
      const t = i / (n - 1);
      const w = (15.0 * Math.pow(1 - t, 0.72) + 2.8) * (1 + (this.frenzy - 1.0) * 0.08);
      widths.push(w);
    }

    // 2. Draw Deep Leather Shadow & Outer Crease
    ctx.beginPath();
    ctx.moveTo(this.pts[0].x, this.pts[0].y);
    for (let i = 0; i < n - 1; i++) {
      const b = this.getBezier(i);
      ctx.bezierCurveTo(b.cp1x, b.cp1y, b.cp2x, b.cp2y, b.x2, b.y2);
    }
    ctx.strokeStyle = '#1a0a03';
    ctx.lineWidth = widths[0] + 3.0;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // 3. Draw Continuous Tapered Quad Strip for Leather Body
    for (let i = 0; i < n - 1; i++) {
      const p1 = this.pts[i];
      const p2 = this.pts[i + 1];
      const n1 = normals[i];
      const n2 = normals[i + 1];
      const hw1 = widths[i] * 0.5;
      const hw2 = widths[i + 1] * 0.5;

      const p1_top = { x: p1.x + n1.x * hw1, y: p1.y + n1.y * hw1 };
      const p1_bot = { x: p1.x - n1.x * hw1, y: p1.y - n1.y * hw1 };
      const p2_top = { x: p2.x + n2.x * hw2, y: p2.y + n2.y * hw2 };
      const p2_bot = { x: p2.x - n2.x * hw2, y: p2.y - n2.y * hw2 };

      // Rich gradient across the leather quad: dark bevel -> warm saddle brown -> dark underside
      const quadGrad = ctx.createLinearGradient(p1_top.x, p1_top.y, p1_bot.x, p1_bot.y);
      quadGrad.addColorStop(0, '#3b1a07');
      quadGrad.addColorStop(0.25, '#92400e');
      quadGrad.addColorStop(0.55, '#78350f');
      quadGrad.addColorStop(0.85, '#451a03');
      quadGrad.addColorStop(1, '#240c02');

      ctx.fillStyle = quadGrad;
      ctx.beginPath();
      ctx.moveTo(p1_top.x, p1_top.y);
      ctx.lineTo(p2_top.x, p2_top.y);
      ctx.lineTo(p2_bot.x, p2_bot.y);
      ctx.lineTo(p1_bot.x, p1_bot.y);
      ctx.closePath();
      ctx.fill();
    }

    // 4. Draw Braided Leather Herringbone Chevron Plaits along the length
    // Forward-angled chevrons that flow ALONG the spline instead of 90-degree blocks
    for (let i = 0; i < n - 1; i++) {
      const t = i / (n - 1);
      const p1 = this.pts[i];
      const p2 = this.pts[i + 1];
      const mx = (p1.x + p2.x) * 0.5;
      const my = (p1.y + p2.y) * 0.5;
      const tan = tangents[i];
      const w = widths[i];
      const hw = w * 0.44;

      ctx.save();
      ctx.translate(mx, my);
      ctx.rotate(tan.angle);

      // Forward-angled herringbone V-braid chevron (angle ~35deg forward)
      ctx.lineWidth = Math.max(0.9, 1.6 * (1 - t * 0.5));
      ctx.lineCap = 'round';

      // Shadow deboss
      ctx.strokeStyle = '#1f0a02';
      ctx.beginPath();
      ctx.moveTo(-hw, -hw * 0.7);
      ctx.lineTo(hw * 0.35, 0);
      ctx.lineTo(-hw, hw * 0.7);
      ctx.stroke();

      // Tan specular highlight stitch
      ctx.strokeStyle = (i % 2 === 0) ? '#d97706' : '#b45309';
      ctx.beginPath();
      ctx.moveTo(-hw + 0.8, -hw * 0.7);
      ctx.lineTo(hw * 0.35 + 0.8, 0);
      ctx.lineTo(-hw + 0.8, hw * 0.7);
      ctx.stroke();

      ctx.restore();
    }

    // 5. Sleek Continuous Tan Specular Ridge along upper spine
    ctx.beginPath();
    ctx.moveTo(this.pts[0].x, this.pts[0].y);
    for (let i = 0; i < n - 1; i++) {
      const b = this.getBezier(i);
      ctx.bezierCurveTo(b.cp1x, b.cp1y, b.cp2x, b.cp2y, b.x2, b.y2);
    }
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // 6. Solid Polished Brass Ferrule at whip root
    const root = this.pts[0];
    const rootAngle = tangents[0].angle;
    ctx.save();
    ctx.translate(root.x, root.y);
    ctx.rotate(rootAngle);
    const brassGrad = ctx.createLinearGradient(-10, 0, 10, 0);
    brassGrad.addColorStop(0, '#78350f');
    brassGrad.addColorStop(0.35, '#fde047');
    brassGrad.addColorStop(0.75, '#d4af37');
    brassGrad.addColorStop(1, '#78350f');
    ctx.fillStyle = brassGrad;
    ctx.beginPath();
    ctx.roundRect(-8, -widths[0] * 0.75, 16, widths[0] * 1.5, 3);
    ctx.fill();
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();

    // 7. Kangaroo Leather Fall & Vibrant Red Cracker Knot at Tip
    const tip = this.pts[n - 1];
    const tipAngle = tangents[n - 1].angle;
    ctx.save();
    ctx.translate(tip.x, tip.y);
    ctx.rotate(tipAngle);

    // Leather Fall (kangaroo lace strip extending 24px)
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(14, Math.sin(this.time * 6) * 5, 26, 0);
    ctx.stroke();

    // Vivid red yarn popper/cracker
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(26, 0);
    ctx.lineTo(36, Math.sin(this.time * 10) * 7);
    ctx.stroke();

    // White knot bead
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(26, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Supersonic crack shockwave if striking
    if (this.strike && this.strike.impactFired) {
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.9)';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(30, 0, 18, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
    ctx.restore();
  }

  // ── Heavy Spiked Morningstar Flail with Impact Freeze Frame ────────────────
  drawChainVisual() {
    if (this.currentWeapon !== 'chain') return;
    if (!this.strike) return; // Completely hidden when idle!

    const ctx = this.ctx;
    const origin = this.getEmitterScreenPos();
    const elapsed = (this.strike && this.strike.elapsed !== undefined) ? this.strike.elapsed : (performance.now() - this.strike.startTime);
    const progress = Math.min(1, Math.max(0, elapsed / this.strike.duration));

    const targetX = this.strike.targetX;
    const targetY = this.strike.targetY;
    const bottomStartX = this.W * 0.62;
    const bottomStartY = this.H + 200;

    const swingStyle = (this.strike && this.strike.swingStyle !== undefined) ? this.strike.swingStyle : 0;
    const sagWeight = (this.strike && this.strike.sagAmp) ? this.strike.sagAmp : 65;
    const waveWeight = (this.strike && this.strike.waveAmp) ? this.strike.waveAmp : 12;
    const numLinks = (this.strike && this.strike.chainLinks) ? this.strike.chainLinks : 18;
    const tremorWeight = (this.strike && this.strike.weightTremor) ? this.strike.weightTremor : 4.2;

    let ballX, ballY;
    let isFreezeFrame = false;

    if (progress < 0.40) {
      const p = progress / 0.40;
      if (swingStyle === 0) {
        // High Overhead Loop & Slam: catapults high into the air and crashes vertically down
        const t = p * p * (3 - 2 * p);
        const p0x = bottomStartX, p0y = bottomStartY;
        const p1x = targetX + (origin.x - targetX) * 0.25;
        const p1y = Math.min(targetY - 150, this.H * 0.16);
        const p2x = targetX, p2y = targetY;
        const oneMinusT = 1 - t;
        ballX = oneMinusT * oneMinusT * p0x + 2 * oneMinusT * t * p1x + t * t * p2x;
        ballY = oneMinusT * oneMinusT * p0y + 2 * oneMinusT * t * p1y + t * t * p2y;
      } else if (swingStyle === 1) {
        // Lateral Centrifugal Swoop: sweeps across from the left flank
        const t = p * p * (3 - 2 * p);
        const p0x = -60, p0y = targetY + 110;
        const p1x = targetX * 0.45, p1y = targetY - 60;
        const p2x = targetX, p2y = targetY;
        const oneMinusT = 1 - t;
        ballX = oneMinusT * oneMinusT * p0x + 2 * oneMinusT * t * p1x + t * t * p2x;
        ballY = oneMinusT * oneMinusT * p0y + 2 * oneMinusT * t * p1y + t * t * p2y;
      } else {
        // Deep Catapult Surge: straight upward surge from bottom-right
        const ease = p * p * (3 - 2 * p);
        ballX = bottomStartX + (targetX - bottomStartX) * ease;
        ballY = bottomStartY + (targetY - bottomStartY) * ease;
      }
    } else if (progress < 0.72) {
      // Phase 2 (0.40 - 0.72): HIT FREEZE FRAME! Spiked ball locks on target with micro-tremor
      isFreezeFrame = true;
      const p = (progress - 0.40) / 0.32; // 0 to 1 during freeze
      const tremorAmp = (1 - p) * tremorWeight;
      ballX = targetX + Math.sin(this.time * 85) * tremorAmp;
      ballY = targetY + Math.cos(this.time * 95) * tremorAmp;
    } else {
      // Phase 3 (0.72 - 1.00): Heavy Recoil Plunge - massive morningstar plunges down off-screen
      const p = (progress - 0.72) / 0.28;
      ballX = targetX + Math.sin(p * Math.PI) * 28;
      ballY = targetY + p * p * (this.H * 1.35);
    }

    ctx.save();

    // 1. Kinetic Freeze Frame Shockwave Ring & Impact Starburst
    if (isFreezeFrame) {
      ctx.save();
      const ringR = 38 + (progress - 0.40) * 120;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 3.0;
      ctx.shadowColor = '#94a3b8';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(targetX, targetY, ringR, 0, Math.PI * 2);
      ctx.stroke();

      // High-contrast starburst spikes on impact
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.85)';
      ctx.lineWidth = 2.0;
      for (let k = 0; k < 6; k++) {
        const kAng = (k / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(targetX + Math.cos(kAng) * (ringR * 0.4), targetY + Math.sin(kAng) * (ringR * 0.4));
        ctx.lineTo(targetX + Math.cos(kAng) * (ringR * 1.15), targetY + Math.sin(kAng) * (ringR * 1.15));
        ctx.stroke();
      }
      ctx.restore();
    }

    // 2. Interlocking Heavy Steel Chain Links
    const chainLinksCount = numLinks;
    const chainPoints = [];
    for (let c = 0; c <= chainLinksCount; c++) {
      const t = c / chainLinksCount;
      const currentSagAmp = isFreezeFrame ? 20 : sagWeight * (1 - progress * 0.42);
      const sag = Math.sin(t * Math.PI) * currentSagAmp;
      const wave = Math.sin(t * Math.PI * 2 - progress * 8) * (waveWeight * (1 - progress));
      const cx = origin.x + (ballX - origin.x) * t + wave;
      const cy = origin.y + (ballY - origin.y) * t + sag;
      chainPoints.push({ x: cx, y: cy });
    }

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
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 5.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, Math.max(9, dist * 0.48), 8.0, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#e2e8f0'; // Specular steel highlight
        ctx.lineWidth = 1.8;
        ctx.stroke();
      } else {
        // Edge-profile link
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.roundRect(-dist * 0.35, -4.5, dist * 0.7, 9, 3);
        ctx.fill();
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      ctx.restore();
    }

    // 3. Huge Reinforced Morningstar Spiked Ball (Distinctly visible during Freeze Frame!)
    ctx.save();
    ctx.translate(ballX, ballY);

    const ballRadius = 32 + this.frenzy * 2.8;
    const spikeCount = 12;

    // Draw 12 Sharp Steel Conical Spikes
    for (let s = 0; s < spikeCount; s++) {
      // Rotation: frozen during freeze frame, spinning during travel
      const ang = (s / spikeCount) * Math.PI * 2 + (isFreezeFrame ? 0.35 : progress * 16.0);
      const spikeLen = 19 + (s % 2 === 0 ? 8 : 0);

      ctx.save();
      ctx.rotate(ang);

      // Shadow facet of spike
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(-6, ballRadius * 0.85);
      ctx.lineTo(0, ballRadius + spikeLen);
      ctx.lineTo(0, ballRadius * 0.85);
      ctx.closePath();
      ctx.fill();

      // Highlight facet of spike
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.moveTo(0, ballRadius * 0.85);
      ctx.lineTo(0, ballRadius + spikeLen);
      ctx.lineTo(6, ballRadius * 0.85);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-6, ballRadius * 0.85);
      ctx.lineTo(0, ballRadius + spikeLen);
      ctx.lineTo(6, ballRadius * 0.85);
      ctx.stroke();

      ctx.restore();
    }

    // Heavy Iron Sphere Body with High-Contrast Specular Reflection
    const sphereGrad = ctx.createRadialGradient(-9, -9, 3, 0, 0, ballRadius);
    sphereGrad.addColorStop(0, '#ffffff');
    sphereGrad.addColorStop(0.22, '#cbd5e1');
    sphereGrad.addColorStop(0.55, '#475569');
    sphereGrad.addColorStop(0.85, '#1e293b');
    sphereGrad.addColorStop(1, '#020617');

    ctx.fillStyle = sphereGrad;
    ctx.beginPath();
    ctx.arc(0, 0, ballRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 2.4;
    ctx.stroke();

    // Equatorial Rivet Band
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(0, 0, ballRadius * 0.95, -0.6, 0.6);
    ctx.stroke();

    // Central Heavy Iron Eyelet / Swivel Shackle
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
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

    // Fixed in physical world space relative to camera/gyro orientation:
    // As the phone pans or turns, the taser darts stay anchored to the subject in space!
    const deltaYaw = this.gyroTilt.y - (this.taserLatch.initialGyroY || 0);
    const deltaPitch = this.gyroTilt.x - (this.taserLatch.initialGyroX || 0);
    const baseX = (this.taserLatch.screenX !== undefined ? this.taserLatch.screenX : this.taserLatch.x);
    const baseY = (this.taserLatch.screenY !== undefined ? this.taserLatch.screenY : this.taserLatch.y);
    const targetX = baseX - deltaYaw * (this.W * 1.6);
    const targetY = baseY + deltaPitch * (this.H * 1.6);
    const target = { x: targetX, y: targetY };
    const combo = this.taserLatch.comboTaps || 1;

    const elapsedSinceTap = performance.now() - this.taserLatch.lastTapTime;
    if (elapsedSinceTap > 2200) {
      this.taserLatch.active = false;
      return;
    }

    const intensityFade = Math.max(0, 1 - (elapsedSinceTap / 2200));

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

    const text = c.text || '';
    const timeStr = c.timeStr || (new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

    // Scale WhatsApp chat bubble based on screen resolution (phone stays 1.0, computers/laptops scale up naturally)
    let resScale = 1.0;
    if (this.W > 480) {
      resScale = Math.min(1.85, 1.0 + (this.W - 480) / 1200);
    }

    const fontMsgSize = Math.round(13 * resScale);
    const fontMetaSize = Math.round(10 * resScale);
    const padX = Math.round(12 * resScale);
    const bubbleH = Math.round(34 * resScale);
    const r = Math.round(8 * resScale);
    const tailW = Math.round(8 * resScale);
    const tailH = Math.round(11 * resScale);
    const checkOffset = Math.round(4 * resScale);

    // Authentic WhatsApp typography
    ctx.font = `600 ${fontMsgSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
    const textWidth = ctx.measureText(text).width;

    ctx.font = `500 ${fontMetaSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    const timeMetrics = ctx.measureText(timeStr);
    const metaWidth = timeMetrics.width + Math.round(18 * resScale); // time + checkmarks spacing

    const bubbleW = Math.max(Math.round(120 * resScale), textWidth + metaWidth + padX * 2);

    // Boundary clamp: keep WhatsApp bubble within screen margins
    const clampedX = Math.min(this.W - bubbleW * 0.5 - 18 * resScale, Math.max(bubbleW * 0.5 + 18 * resScale, c.x));
    const clampedY = Math.min(this.H - bubbleH - 120 * resScale, Math.max(bubbleH * 0.5 + 40 * resScale, c.y));

    ctx.translate(clampedX, clampedY);
    ctx.rotate(c.rotation || 0);
    ctx.scale(c.scale, c.scale);
    ctx.globalAlpha = Math.max(0, c.alpha);

    // 1. Subtle soft shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = Math.round(8 * resScale);
    ctx.shadowOffsetY = Math.round(3 * resScale);

    // 2. Classic WhatsApp Outgoing Green Bubble (#005c4b)
    ctx.fillStyle = '#005c4b';
    ctx.beginPath();
    ctx.roundRect(-bubbleW * 0.5, -bubbleH * 0.5, bubbleW, bubbleH, r);
    ctx.fill();

    // 3. WhatsApp Corner Notch / Tail on top-right pointing outward
    ctx.beginPath();
    ctx.moveTo(bubbleW * 0.5 - 1, -bubbleH * 0.5);
    ctx.lineTo(bubbleW * 0.5 + tailW, -bubbleH * 0.5);
    ctx.lineTo(bubbleW * 0.5 - 1, -bubbleH * 0.5 + tailH);
    ctx.closePath();
    ctx.fill();

    // Reset shadow for crisp text
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // 4. White message text (left aligned)
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = `600 ${fontMsgSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
    ctx.fillText(text, -bubbleW * 0.5 + padX, 0);

    // 5. Timestamp (light greyish-green)
    const metaX = bubbleW * 0.5 - padX - metaWidth;
    ctx.font = `500 ${fontMetaSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillStyle = '#8696a0';
    ctx.fillText(timeStr, metaX, Math.round(1 * resScale));

    // 6. WhatsApp Blue Double Checkmark (✓✓ Read Receipts)
    ctx.font = `bold ${fontMetaSize}px sans-serif`;
    ctx.fillStyle = '#53bdeb';
    ctx.fillText('✓✓', metaX + timeMetrics.width + checkOffset, Math.round(1 * resScale));

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
      this.draw();
    }

    requestAnimationFrame(this.loop);
  }
}
