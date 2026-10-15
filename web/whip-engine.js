/**
 * OpenWhip AR - LinkedIn Corporate Edition
 * Features:
 * • Rigged 3D Hand Model with Executive Wardrobe Customization (C-Suite, Silicon Valley, Wall Street, Cyber)
 * • Luxury accessories: Tailored Suit Cuff, Rolex Oyster Perpetual, Apple Watch with Fitness Rings, 24K Gold Gauntlet
 * • Next-Gen Spring-Damper Kinetic Whipping Physics & Aim-Aware Wrist Flex
 * • Full Web Audio Mixing: Combined User Microphone + Decoded SFX + Procedural Sonic Boom Crack
 * • Corporate "Work Productivity Maxx" Multiplier & Tier Progression
 * • Satirical Corporate Buzzwords & High-Impact Visual Effects
 */

class WhipEngine {
  constructor(canvas, threeCanvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.threeCanvasElem = threeCanvas;

    this.W = 0;
    this.H = 0;

    // ── Executive Style & Skin System ─────────────────────────────────────────
    this.currentStyle = 'csuite'; // 'csuite' | 'silicon' | 'wallstreet' | 'cyber'
    this.styleConfigs = {
      csuite: {
        id: 'csuite',
        name: 'The C-Suite Executive',
        role: 'Chief Retention Officer',
        perk: '+50% Executive Presence',
        handColor: 0xdeb887,
        handRoughness: 0.62,
        handMetalness: 0.04,
        sleeveColor: 0x182635, // Navy Tailored Wool
        cuffColor: 0xf5f7fa,   // White French Cuff
        cufflink: 0xffd700,    // 24K Gold
        handleWood: 0x3d2314,  // Italian Walnut
        handleMetal: 0xd4af37, // Polished Brass
        ropeGlow: '#0a66c2',   // LinkedIn Blue
        ropeCore: '#ffc107',   // Gold Braid
        sparkColors: ['#0a66c2', '#ffd700', '#ffffff', '#004182'],
        phrases: [
          'SYNERGY ALIGNED! 💼',
          'QUARTERLY OKR HIT! 🎯',
          'CIRCLE BACK! 🔄',
          'TAKE THIS OFFLINE! 📌',
          'PROMOTED TO VP! 🏆',
          'WORK PRODUCTIVITY MAXX! ⚡'
        ]
      },
      silicon: {
        id: 'silicon',
        name: 'Silicon Valley 10x Hustler',
        role: 'Disruptive Architect',
        perk: '+100% Agile Velocity',
        handColor: 0x242830, // Fingerless Tech Glove
        handRoughness: 0.45,
        handMetalness: 0.45,
        sleeveColor: 0x2b2e38, // Patagonia Tech Fleece
        cuffColor: 0x00f5ff,   // Cyan technical seam
        cufflink: 0x10b981,    // Emerald sensor
        handleWood: 0x14161a,  // Carbon Fiber
        handleMetal: 0x00f5ff, // Anodized Cyan
        ropeGlow: '#00f0ff',   // Neon Cyan
        ropeCore: '#10b981',   // Growth Emerald
        sparkColors: ['#00f0ff', '#10b981', '#ffffff', '#38bdf8'],
        phrases: [
          'PIVOT! 🚀',
          '10X ENGINEER! 💻',
          'DISRUPTIVE INNOVATION! ⚡',
          'SERIES B SECURED! 🦄',
          'FAST REFACTOR! ⚡',
          'PRODUCTIVITY MAXX! ⚡'
        ]
      },
      wallstreet: {
        id: 'wallstreet',
        name: 'Wall Street Titan',
        role: 'Managing Partner',
        perk: '+200% Golden Parachute',
        handColor: 0xffb703, // Pure 24K Gold Gauntlet
        handRoughness: 0.12,
        handMetalness: 0.96,
        sleeveColor: 0x0f1115, // Pinstripe Midnight Wool
        cuffColor: 0x880e4f,   // Silk Crimson
        cufflink: 0xffd700,    // Diamond Stud
        handleWood: 0xffc107,  // Solid Gold Bullion
        handleMetal: 0xd90429, // Ruby Pommel
        ropeGlow: '#ffb703',   // Pure Gold
        ropeCore: '#ef4444',   // Ruby Crimson
        sparkColors: ['#ffd700', '#ffb703', '#ffffff', '#ef4444'],
        phrases: [
          'GOLDEN PARACHUTE! 🪙',
          'HOSTILE TAKEOVER! 💼',
          'LEVERAGED BUYOUT! 📈',
          'BONUS APPROVED! 💰',
          'HIGH NET WORTH! 💎',
          'PRODUCTIVITY MAXX! ⚡'
        ]
      },
      cyber: {
        id: 'cyber',
        name: 'Cyber Director 2077',
        role: 'Autonomous Syndicate AI',
        perk: '+300% Overclock Yield',
        handColor: 0xdde3ed, // Platinum Chrome Prosthetic
        handRoughness: 0.18,
        handMetalness: 0.88,
        sleeveColor: 0x161822, // Exoskeleton Armor
        cuffColor: 0xff0077,   // Plasma Pink conduit
        cufflink: 0x00f5ff,    // Cyber Cyan node
        handleWood: 0x0d0e14,  // Matte Carbon
        handleMetal: 0xff0077, // Plasma Emitter
        ropeGlow: '#ff0077',   // Hot Plasma Pink
        ropeCore: '#00f5ff',   // Cyber Cyan
        sparkColors: ['#ff0077', '#00f5ff', '#ffffff', '#e879f9'],
        phrases: [
          'NEURAL SYNERGY! ⚡',
          'OVERCLOCK MAXX! 💥',
          'QUANTUM DISRUPT! 🔮',
          'CYBER HUSTLE! 🦾',
          'CORE SYNCED! ⚡',
          'PRODUCTIVITY MAXX! ⚡'
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
    this.initAudio();

    // ── Three.js 3D Viewport & Scene ──────────────────────────────────────────
    this.initThreeJS(threeCanvas);
    this.resize();

    // ── Whip Rope Physics ─────────────────────────────────────────────────────
    this.segments = 24;
    this.segmentLength = 22;
    this.pts = [];
    this.initWhipPoints();

    // ── Work Productivity Maxx Multiplier ────────────────────────────────────
    this.frenzy = 1.0;
    this.combo = 0;
    this.lastTapTime = 0;
    this.whipCount = 0;
    this.lastTierAlert = 1;

    // ── Animation & Strike State ──────────────────────────────────────────────
    this.time = 0;
    this.lastTime = performance.now();
    this.strike = null; // { startTime, duration, targetX, targetY, impactFired }

    // ── Particles, Shockwaves, Starbursts & Text ──────────────────────────────
    this.particles = [];
    this.shockwaves = [];
    this.starbursts = [];
    this.floatingTexts = [];
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

      const targetX = this.W * 0.5 + (Math.random() * 16 - 8);
      const targetY = this.H * 0.5 + (Math.random() * 16 - 8);
      this.strikeAt(targetX, targetY);

      if (this.onSwingDetected) {
        this.onSwingDetected(deltaMag || totalMag);
      }
    }
  }

  resize() {
    this.W = this.canvas.width = window.innerWidth;
    this.H = this.canvas.height = window.innerHeight;
    this.segmentLength = Math.max(16, Math.min(26, this.H * 0.026));

    if (this.camera && this.renderer) {
      this.camera.aspect = this.W / this.H;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.W, this.H);
    }

    this.updateArmPlacement();
  }

  // ── Web Audio & Microphone Mixing ─────────────────────────────────────────
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

        // Keep-alive silent node ensures MediaRecorder gets continuous audio frames without audible buzz
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
        // Fallback to procedural synth + HTML5 audio pool
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

  // Connect microphone stream into the recording audio bus (direct to recorder, no speaker feedback!)
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
    // Soft mute mic gain to avoid idle noise bleeding into recorder bus,
    // while keeping the stream active for instant subsequent recordings without re-prompt
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

  // Realistic Procedural Whip Crack Synthesizer (Instantaneous zero-latency fallback)
  playProceduralCrack(pitchRate = 1.0) {
    if (!this.audioCtx || this.isMuted) return;
    try {
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
      const ctx = this.audioCtx;
      const t = ctx.currentTime;

      // 1. High-frequency crack noise burst
      const bufferSize = Math.floor(ctx.sampleRate * 0.05); // 50ms burst
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
      }

      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(3200 * pitchRate, t);
      filter.Q.setValueAtTime(3.5, t);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(1.1, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.sfxGain);
      noise.start(t);

      // 2. Sub-bass sonic boom thud (breaking sound barrier)
      const boom = ctx.createOscillator();
      boom.type = 'sine';
      boom.frequency.setValueAtTime(190 * pitchRate, t);
      boom.frequency.exponentialRampToValueAtTime(36, t + 0.075);

      const boomGain = ctx.createGain();
      boomGain.gain.setValueAtTime(0.95, t);
      boomGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      boom.connect(boomGain);
      boomGain.connect(this.sfxGain);
      boom.start(t);
      boom.stop(t + 0.085);
    } catch (e) {
      console.warn('Procedural audio error:', e);
    }
  }

  // Corporate Level-Up Chime when passing Productivity Tiers
  playLevelUpChime(tier) {
    if (!this.audioCtx || this.isMuted) return;
    try {
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
      const ctx = this.audioCtx;
      const t = ctx.currentTime;

      const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 corporate arpeggio
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

  playCrackSound() {
    if (this.isMuted) return;
    this.unlockAudio();

    const pitchRate = Math.min(1.58, 0.95 + (this.frenzy - 1.0) * 0.18);

    // 1. Play decoded high-fidelity sound buffer if available
    let bufferPlayed = false;
    if (this.audioCtx && this.audioBuffers && this.audioBuffers.length > 0) {
      try {
        if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
        const buffer = this.audioBuffers[Math.floor(Math.random() * this.audioBuffers.length)];
        const source = this.audioCtx.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = pitchRate;

        const gainNode = this.audioCtx.createGain();
        gainNode.gain.value = 0.95;

        source.connect(gainNode);
        gainNode.connect(this.sfxGain);
        source.start(0);
        bufferPlayed = true;
      } catch (e) {}
    }

    // 2. Play procedural synth whip crack layer for crisp impact
    this.playProceduralCrack(pitchRate);

    // 3. Fallback HTML5 audio pool if WebAudio buffer wasn't available
    if (!bufferPlayed) {
      try {
        if (this.audioPool && this.audioPool.length > 0) {
          const a = this.audioPool[Math.floor(Math.random() * this.audioPool.length)];
          a.currentTime = 0;
          a.playbackRate = pitchRate;
          a.play().catch(() => {});
        }
      } catch {}
    }
  }

  initWhipPoints() {
    this.pts = [];
    const origin = this.getEmitterScreenPos();
    for (let i = 0; i < this.segments; i++) {
      const t = i / (this.segments - 1);
      const x = origin.x - t * 90 + Math.sin(t * Math.PI) * 45;
      const y = origin.y + t * (this.H * 0.32) + Math.sin(t * Math.PI * 0.7) * 40;
      this.pts.push({ x, y, px: x, py: y });
    }
  }

  // ── Three.js 3D Viewport & Modular Executive Wardrobe ─────────────────────
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

    // Studio Lights for Executive Materials
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.25);
    this.scene.add(ambientLight);

    this.keyLight = new THREE.DirectionalLight(0xfff4d6, 1.7);
    this.keyLight.position.set(4, 7, 5);
    this.scene.add(this.keyLight);

    this.rimLight = new THREE.DirectionalLight(0x0a66c2, 1.4); // LinkedIn Blue Rim
    this.rimLight.position.set(-5, 4, -2);
    this.scene.add(this.rimLight);

    this.armRoot = new THREE.Group();
    this.camera.add(this.armRoot);

    // Assemble Arm, Hand & Wardrobe Accessories
    this.build3DGauntlet();
    this.loadHandGLB();

    // Apply default style
    this.setExecutiveStyle('csuite');
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
        visibleWidth * 0.38,
        -visibleHeight * 0.36,
        -dist
      );
      this.armRoot.scale.set(0.88, 0.88, 0.88);
    } else {
      this.armBasePos = new THREE.Vector3(
        Math.min(visibleWidth * 0.28, 1.15),
        -visibleHeight * 0.32,
        -dist
      );
      this.armRoot.scale.set(1.0, 1.0, 1.0);
    }

    this.armRoot.position.copy(this.armBasePos);
  }

  loadHandGLB() {
    if (typeof THREE.GLTFLoader === 'undefined') return;

    const loader = new THREE.GLTFLoader();
    loader.load('models/hand.glb', (gltf) => {
      const model = gltf.scene;

      this.handModel = model;
      this.handMeshes = [];

      model.traverse((child) => {
        if (child.isMesh) {
          this.handMeshes.push(child);
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      model.scale.set(4.8, 4.8, 4.8);
      model.position.set(0.04, -0.02, -0.02);
      model.rotation.set(Math.PI / 2 + 0.22, 0.35, -0.55);

      if (this.armAssembly) {
        this.armAssembly.add(model);
      } else {
        this.armRoot.add(model);
      }

      // Re-apply style to newly loaded hand mesh
      this.applyStyleMaterials();
    }, undefined, (err) => {
      console.warn('Custom GLB load note:', err.message);
    });
  }

  build3DGauntlet() {
    // 1. Arm Assembly Group
    this.armAssembly = new THREE.Group();
    this.armAssembly.rotation.set(0.18, -0.32, 0.24);

    // 2. Forearm Suit Sleeve / Bracer
    const sleeveGeo = new THREE.CylinderGeometry(0.24, 0.32, 1.45, 24);
    this.sleeveMat = new THREE.MeshStandardMaterial({
      color: 0x182635,
      roughness: 0.85,
      metalness: 0.1
    });
    this.sleeveMesh = new THREE.Mesh(sleeveGeo, this.sleeveMat);
    this.sleeveMesh.position.set(0, -0.65, 0);
    this.armAssembly.add(this.sleeveMesh);

    // 3. Crisp White French Shirt Cuff / Inner Seam
    const shirtCuffGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.16, 24);
    this.shirtCuffMat = new THREE.MeshStandardMaterial({
      color: 0xf4f6f8,
      roughness: 0.7,
      metalness: 0.05
    });
    this.shirtCuffMesh = new THREE.Mesh(shirtCuffGeo, this.shirtCuffMat);
    this.shirtCuffMesh.position.set(0, -0.04, 0);
    this.armAssembly.add(this.shirtCuffMesh);

    // 4. Gold Cufflinks
    this.cufflinkMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      roughness: 0.15,
      metalness: 0.95
    });
    const linkGeo = new THREE.BoxGeometry(0.04, 0.04, 0.07);
    this.cufflinkMesh1 = new THREE.Mesh(linkGeo, this.cufflinkMat);
    this.cufflinkMesh1.position.set(0.18, -0.04, 0.14);
    this.armAssembly.add(this.cufflinkMesh1);

    // 5. Luxury Watch Group (Rolex / Apple Watch / Diamond Chronometer) positioned on top of wrist
    this.watchGroup = new THREE.Group();
    this.watchGroup.position.set(0, -0.14, 0.22);
    this.watchGroup.rotation.set(0.42, 0, 0);
    this.watchGroup.scale.set(1.45, 1.45, 1.45);

    // Watch Case
    const watchCaseGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.06, 24);
    this.watchCaseMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.95,
      roughness: 0.15
    });
    this.watchCaseMesh = new THREE.Mesh(watchCaseGeo, this.watchCaseMat);
    this.watchCaseMesh.rotation.x = Math.PI / 2;
    this.watchGroup.add(this.watchCaseMesh);

    // Watch Dial / Bezel
    const watchDialGeo = new THREE.CylinderGeometry(0.095, 0.095, 0.065, 24);
    this.watchDialMat = new THREE.MeshStandardMaterial({
      color: 0x057642, // Rolex Emerald Ceramic Bezel
      metalness: 0.6,
      roughness: 0.3
    });
    this.watchDialMesh = new THREE.Mesh(watchDialGeo, this.watchDialMat);
    this.watchDialMesh.rotation.x = Math.PI / 2;
    this.watchGroup.add(this.watchDialMesh);

    // Watch Bracelet Straps
    const strapGeo = new THREE.BoxGeometry(0.14, 0.03, 0.36);
    this.watchStrapMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.9,
      roughness: 0.2
    });
    this.watchStrapMesh = new THREE.Mesh(strapGeo, this.watchStrapMat);
    this.watchStrapMesh.position.set(0, -0.01, 0);
    this.watchGroup.add(this.watchStrapMesh);

    this.armAssembly.add(this.watchGroup);

    // 6. Glowing Energy Conduit
    this.energyMat = new THREE.MeshBasicMaterial({ color: 0x0a66c2 });
    this.conduitMesh = new THREE.Mesh(new THREE.BoxGeometry(0.035, 1.3, 0.05), this.energyMat);
    this.conduitMesh.position.set(0, -0.65, 0.24);
    this.armAssembly.add(this.conduitMesh);

    // 7. Whip Handle (Tactical Baton gripped tightly in hand)
    const handleGroup = new THREE.Group();
    handleGroup.position.set(0, 0.18, 0.02);
    handleGroup.rotation.set(0.35, 0.15, -0.25);

    this.handleWoodMat = new THREE.MeshStandardMaterial({
      color: 0x3d2314,
      metalness: 0.3,
      roughness: 0.6
    });
    this.gripMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.95, 24), this.handleWoodMat);
    handleGroup.add(this.gripMesh);

    // Golden Collar & Pommel
    this.handleMetalMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.95,
      roughness: 0.15
    });
    this.collarMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.15, 24), this.handleMetalMat);
    this.collarMesh.position.set(0, 0.48, 0);
    handleGroup.add(this.collarMesh);

    this.pommelMesh = new THREE.Mesh(new THREE.SphereGeometry(0.08, 20, 20), this.handleMetalMat);
    this.pommelMesh.position.set(0, -0.48, 0);
    handleGroup.add(this.pommelMesh);

    // 3D Whip Emitter Point
    this.whipEmitter = new THREE.Object3D();
    this.whipEmitter.position.set(0, 0.56, 0);
    handleGroup.add(this.whipEmitter);

    this.armAssembly.add(handleGroup);

    // 8. Anatomical Fist Group gripping the baton handle firmly
    this.fistGroup = new THREE.Group();
    this.fistGroup.name = 'fistGroup';
    this.fistGroup.position.set(0, 0.04, 0.02);

    this.fistSkinMat = new THREE.MeshStandardMaterial({
      color: 0xdeb887,
      roughness: 0.55,
      metalness: 0.05
    });
    this.knuckleMat = new THREE.MeshStandardMaterial({
      color: 0xd4a373,
      roughness: 0.48,
      metalness: 0.08
    });

    // Palm block
    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.28, 0.18), this.fistSkinMat);
    palm.position.set(0, 0.06, 0.02);
    this.fistGroup.add(palm);

    // 4 Curled fingers wrapping around the baton
    const fingerData = [
      { y: 0.16, r: 0.040, len: 0.17 }, // Index
      { y: 0.09, r: 0.042, len: 0.18 }, // Middle
      { y: 0.02, r: 0.040, len: 0.17 }, // Ring
      { y: -0.05, r: 0.036, len: 0.15 } // Pinky
    ];

    fingerData.forEach(d => {
      const fGroup = new THREE.Group();
      fGroup.position.set(-0.06, d.y, 0.03);

      // Knuckle
      const k = new THREE.Mesh(new THREE.SphereGeometry(d.r * 1.05, 12, 12), this.knuckleMat);
      k.position.set(0.02, 0, 0.05);
      fGroup.add(k);

      // Proximal phalanx
      const p = new THREE.Mesh(new THREE.CylinderGeometry(d.r, d.r * 1.05, d.len * 0.48, 12), this.fistSkinMat);
      p.rotation.set(0.2, 0, Math.PI / 2 + 0.3);
      p.position.set(d.len * 0.24, 0, 0.03);
      fGroup.add(p);

      // Distal phalanx wrapping tightly around front of baton
      const dist = new THREE.Mesh(new THREE.CylinderGeometry(d.r * 0.85, d.r, d.len * 0.55, 12), this.fistSkinMat);
      dist.rotation.set(0.7, 0.15, Math.PI / 2 - 0.4);
      dist.position.set(d.len * 0.58, 0, -0.02);
      fGroup.add(dist);

      this.fistGroup.add(fGroup);
    });

    // Opposing Thumb locked over the grip and index knuckle
    const thumb = new THREE.Group();
    thumb.position.set(0.08, 0.12, 0.08);
    const thumbProx = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.056, 0.15, 12), this.fistSkinMat);
    thumbProx.rotation.set(0.35, -0.5, -0.75);
    thumb.add(thumbProx);

    const thumbDist = new THREE.Mesh(new THREE.SphereGeometry(0.048, 12, 12), this.fistSkinMat);
    thumbDist.position.set(-0.07, 0.02, -0.02);
    thumb.add(thumbDist);
    this.fistGroup.add(thumb);

    // Signet Ring on Pinky Finger
    this.ringMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.95,
      roughness: 0.15
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.012, 8, 20), this.ringMat);
    ring.position.set(-0.04, -0.05, 0.06);
    ring.rotation.y = Math.PI / 2;
    this.fistGroup.add(ring);

    this.armAssembly.add(this.fistGroup);
    this.armRoot.add(this.armAssembly);
  }

  // ── Executive Style Switching ─────────────────────────────────────────────
  setExecutiveStyle(styleKey) {
    if (!this.styleConfigs[styleKey]) return;
    this.currentStyle = styleKey;
    this.applyStyleMaterials();
  }

  applyStyleMaterials() {
    const cfg = this.styleConfigs[this.currentStyle];
    if (!cfg) return;

    // 1. Fist Skin & Knuckle Materials
    if (this.fistSkinMat) {
      this.fistSkinMat.color.setHex(cfg.handColor);
      this.fistSkinMat.roughness = cfg.handRoughness;
      this.fistSkinMat.metalness = cfg.handMetalness;
    }
    if (this.knuckleMat) {
      this.knuckleMat.color.setHex(cfg.handColor);
      this.knuckleMat.roughness = cfg.handRoughness * 0.9;
      this.knuckleMat.metalness = cfg.handMetalness;
    }

    // 2. Sleeve & Cuff
    if (this.sleeveMat) this.sleeveMat.color.setHex(cfg.sleeveColor);
    if (this.shirtCuffMat) this.shirtCuffMat.color.setHex(cfg.cuffColor);
    if (this.cufflinkMat) this.cufflinkMat.color.setHex(cfg.cufflink);
    if (this.ringMat) this.ringMat.color.setHex(cfg.cufflink);

    // 3. Watch customization per executive style
    if (this.watchGroup) {
      if (this.currentStyle === 'csuite') {
        // Gold Rolex Oyster Perpetual with Emerald Bezel
        this.watchCaseMat.color.setHex(0xffd700);
        this.watchCaseMat.metalness = 0.95;
        this.watchDialMat.color.setHex(0x057642); // Emerald dial
        this.watchStrapMat.color.setHex(0xffd700);
        this.watchGroup.visible = true;
        this.conduitMesh.visible = false;
      } else if (this.currentStyle === 'silicon') {
        // Apple Watch Ultra with Orange Action Button & OLED face
        this.watchCaseMat.color.setHex(0x9aa0a6); // Titanium
        this.watchCaseMat.metalness = 0.7;
        this.watchDialMat.color.setHex(0x00f5ff); // Glowing cyan fitness ring
        this.watchStrapMat.color.setHex(0x1e2024); // Sport band
        this.watchGroup.visible = true;
        this.conduitMesh.visible = true;
      } else if (this.currentStyle === 'wallstreet') {
        // Pure Gold Diamond Chronometer
        this.watchCaseMat.color.setHex(0xffb703);
        this.watchCaseMat.metalness = 0.98;
        this.watchDialMat.color.setHex(0xd90429); // Ruby Red dial
        this.watchStrapMat.color.setHex(0xffb703);
        this.watchGroup.visible = true;
        this.conduitMesh.visible = false;
      } else if (this.currentStyle === 'cyber') {
        // Cyber Holographic Interface
        this.watchCaseMat.color.setHex(0x161822);
        this.watchCaseMat.metalness = 0.9;
        this.watchDialMat.color.setHex(0xff0077);
        this.watchStrapMat.color.setHex(0x0a0c10);
        this.watchGroup.visible = true;
        this.conduitMesh.visible = true;
      }
    }

    // 4. Whip Handle Materials
    if (this.handleWoodMat) this.handleWoodMat.color.setHex(cfg.handleWood);
    if (this.handleMetalMat) this.handleMetalMat.color.setHex(cfg.handleMetal);
    if (this.energyMat) this.energyMat.color.set(cfg.ropeGlow);

    // 5. Rim light matches theme
    if (this.rimLight) {
      this.rimLight.color.set(cfg.ropeGlow);
    }
  }

  // Helper providing full productivity stats for HUD and recording watermark
  getProductivityInfo() {
    let tierName = 'UNPAID INTERN';
    let tierColor = '#0a66c2';
    let progress = Math.min(1.0, (this.frenzy - 1.0) / 3.0);

    if (this.frenzy >= 3.8) {
      tierName = '10X UNICORN MAXX 🦄';
      tierColor = '#ec4899';
    } else if (this.frenzy >= 2.8) {
      tierName = 'VP OF SYNERGY 🏆';
      tierColor = '#f59e0b';
    } else if (this.frenzy >= 1.8) {
      tierName = 'OVERTIME SPECIALIST ⏱️';
      tierColor = '#10b981';
    }

    return {
      multiplier: this.frenzy,
      formattedMultiplier: this.frenzy.toFixed(1) + 'x',
      combo: this.combo,
      whipCount: this.whipCount,
      tierName,
      tierColor,
      progress,
      styleName: this.styleConfigs[this.currentStyle].name,
      roleName: this.styleConfigs[this.currentStyle].role
    };
  }

  // ── Strike Trigger with Speed Frenzy ──────────────────────────────────────
  strikeAt(targetX, targetY) {
    this.unlockAudio();

    const now = performance.now();
    const timeSinceLastTap = now - this.lastTapTime;
    this.lastTapTime = now;

    // Frenzy Speed Escalation (Work Productivity Maxx)
    if (timeSinceLastTap < 550) {
      this.combo++;
      this.frenzy = Math.min(4.0, this.frenzy + 0.42);
    } else {
      this.combo = 1;
    }

    // Check for level up chime crossing tiers
    const currentTier = this.frenzy >= 3.8 ? 4 : (this.frenzy >= 2.8 ? 3 : (this.frenzy >= 1.8 ? 2 : 1));
    if (currentTier > this.lastTierAlert) {
      this.playLevelUpChime(currentTier);
      this.lastTierAlert = currentTier;
    }

    const baseDuration = 210;
    const strikeDuration = Math.max(60, baseDuration / this.frenzy);

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

  // ── Physics & Animation Update ────────────────────────────────────────────
  update(dt) {
    this.time += dt;

    // Decay Frenzy when idle
    const timeSinceLastTap = performance.now() - this.lastTapTime;
    if (timeSinceLastTap > 650 && this.frenzy > 1.0) {
      this.frenzy = Math.max(1.0, this.frenzy - dt * 1.8);
      this.lastTierAlert = this.frenzy >= 3.8 ? 4 : (this.frenzy >= 2.8 ? 3 : (this.frenzy >= 1.8 ? 2 : 1));
      if (this.onFrenzyChange) {
        this.onFrenzyChange(this.frenzy, this.combo);
      }
    }

    // Three.js 3D Arm Motion, Weapon Sway & Spring Recoil
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
        // Wind-up: Arm cocks backward in 3D depth with aim-aware wrist tension
        const p = progress / 0.22;
        armTargetX += 0.12 * Math.sin(p * Math.PI * 0.5);
        armTargetY -= 0.10 * Math.sin(p * Math.PI * 0.5);
        armTargetZ += 0.28 * Math.sin(p * Math.PI * 0.5);
        armRotX -= 0.22 * Math.sin(p * Math.PI * 0.5);
        armRotZ += 0.16 * Math.sin(p * Math.PI * 0.5);
      } else if (progress < 0.65) {
        // Explosive forward lunge: Arm drives deep into the scene toward target with dynamic wrist snap
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
        // Kinetic Spring Recoil with Damped Harmonic Oscillation
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

    // 2. Whip Rope Physics (Verlet) with S-Curve Wave
    const gravity = 1.3;
    const damping = 0.94;

    for (let i = 1; i < this.pts.length; i++) {
      const p = this.pts[i];
      const vx = (p.x - p.px) * damping;
      const vy = (p.y - p.py) * damping;
      p.px = p.x;
      p.py = p.y;
      p.x += vx;
      p.y += vy + gravity;

      if (strikeWavePhase > 0) {
        const segT = i / (this.pts.length - 1);
        const distFromWave = segT - strikeWavePhase;
        const waveAmp = Math.sin(distFromWave * Math.PI * 3) * Math.exp(-distFromWave * distFromWave * 14) * 50 * (1 - strikeWavePhase);
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

  getEmitterScreenPos() {
    if (!this.whipEmitter || !this.camera) {
      return { x: this.W * 0.78, y: this.H * 0.78 };
    }
    const worldPos = new THREE.Vector3();
    this.whipEmitter.getWorldPosition(worldPos);
    worldPos.project(this.camera);

    return {
      x: (worldPos.x * 0.5 + 0.5) * this.W,
      y: (-(worldPos.y * 0.5) + 0.5) * this.H,
    };
  }

  triggerImpact(x, y) {
    this.whipCount++;
    this.playCrackSound();

    if ('vibrate' in navigator) {
      try {
        const vib = Math.min(85, 35 + this.frenzy * 14);
        navigator.vibrate([vib, 20, vib * 1.3]);
      } catch {}
    }

    this.screenShake = 16 + this.frenzy * 4;

    const cfg = this.styleConfigs[this.currentStyle];
    const frenzyColor = this.frenzy > 3.8 ? '#ec4899' : (this.frenzy > 2.8 ? '#f59e0b' : (this.frenzy > 1.8 ? '#10b981' : cfg.ropeGlow));

    // 1. Comic Impact Starburst
    this.starbursts.push({
      x,
      y,
      scale: 0.3,
      maxScale: 1.25 + this.frenzy * 0.25,
      rotation: Math.random() * Math.PI,
      alpha: 1.0,
      color: frenzyColor,
    });

    // 2. Double Expanding Shockwaves
    this.shockwaves.push({ x, y, r: 12, maxR: 90 + this.frenzy * 10, alpha: 1.0, color: frenzyColor });
    this.shockwaves.push({ x, y, r: 6, maxR: 55, alpha: 1.0, color: '#ffffff' });

    // 3. Spark Particles
    const sparkCount = Math.floor(22 + this.frenzy * 6);
    const sparkPalette = cfg.sparkColors;
    for (let i = 0; i < sparkCount; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 6 + Math.random() * (12 + this.frenzy * 4);
      this.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 3.5,
        alpha: 1.0,
        size: 3 + Math.random() * 4.5,
        color: sparkPalette[Math.floor(Math.random() * sparkPalette.length)],
        gravity: 0.38,
      });
    }

    // 4. Floating Corporate Buzzwords
    const phrases = cfg.phrases;
    const chosenText = phrases[Math.floor(Math.random() * phrases.length)];

    this.floatingTexts.push({
      x: x + (Math.random() * 24 - 12),
      y: y - 26,
      text: chosenText,
      alpha: 1.0,
      scale: 0.6,
      vy: -3.4,
      color: frenzyColor,
    });

    if (this.onWhipHit) {
      this.onWhipHit(this.whipCount, this.combo);
    }
  }

  updateFX(dt) {
    if (this.screenShake > 0) {
      this.screenShake *= 0.82;
      if (this.screenShake < 0.5) this.screenShake = 0;
    }

    for (let i = this.starbursts.length - 1; i >= 0; i--) {
      const sb = this.starbursts[i];
      sb.scale += 0.12;
      sb.alpha -= 0.07;
      if (sb.alpha <= 0 || sb.scale >= sb.maxScale) this.starbursts.splice(i, 1);
    }

    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.r += 5.2;
      s.alpha -= 0.058;
      if (s.alpha <= 0 || s.r >= s.maxR) this.shockwaves.splice(i, 1);
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.alpha -= 0.038;
      if (p.alpha <= 0) this.particles.splice(i, 1);
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy;
      if (ft.scale < 1.25) ft.scale += 0.08;
      ft.alpha -= 0.024;
      if (ft.alpha <= 0) this.floatingTexts.splice(i, 1);
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

    // 1. Draw Whip Rope Spline
    this.drawWhip();

    // 2. Render Three.js 3D Arm onto Canvas
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }

    // 3. Draw Comic Starbursts
    for (const sb of this.starbursts) {
      this.drawStarburst(sb);
    }

    // 4. Draw Shockwaves
    for (const s of this.shockwaves) {
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      this.ctx.strokeStyle = s.color;
      this.ctx.globalAlpha = Math.max(0, s.alpha);
      this.ctx.lineWidth = 4.5;
      this.ctx.stroke();
      this.ctx.restore();
    }

    // 5. Draw Particles
    for (const p of this.particles) {
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = Math.max(0, p.alpha);
      this.ctx.fill();
      this.ctx.restore();
    }

    // 6. Draw Floating Corporate Comic Text
    for (const ft of this.floatingTexts) {
      this.ctx.save();
      this.ctx.translate(ft.x, ft.y);
      this.ctx.scale(ft.scale, ft.scale);
      this.ctx.globalAlpha = Math.max(0, ft.alpha);
      this.ctx.textAlign = 'center';
      this.ctx.font = '900 26px system-ui, -apple-system, sans-serif';

      this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
      this.ctx.lineWidth = 5;
      this.ctx.strokeText(ft.text, 0, 0);

      this.ctx.fillStyle = ft.color || '#ffea00';
      this.ctx.fillText(ft.text, 0, 0);
      this.ctx.restore();
    }

    this.ctx.restore();
  }

  drawStarburst(sb) {
    this.ctx.save();
    this.ctx.translate(sb.x, sb.y);
    this.ctx.rotate(sb.rotation);
    this.ctx.scale(sb.scale, sb.scale);
    this.ctx.globalAlpha = Math.max(0, sb.alpha);

    const points = 10;
    const outerRadius = 45;
    const innerRadius = 20;

    this.ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = (i % 2 === 0) ? outerRadius : innerRadius;
      const a = (i * Math.PI) / points;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) this.ctx.moveTo(px, py);
      else this.ctx.lineTo(px, py);
    }
    this.ctx.closePath();

    this.ctx.fillStyle = sb.color;
    this.ctx.fill();
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 4;
    this.ctx.stroke();

    this.ctx.restore();
  }

  drawWhip() {
    if (this.pts.length < 2) return;

    this.ctx.save();
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    const cfg = this.styleConfigs[this.currentStyle];
    const frenzyGlow = this.frenzy > 3.8 ? '#ec4899' : (this.frenzy > 2.8 ? '#f59e0b' : (this.frenzy > 1.8 ? '#10b981' : cfg.ropeGlow));
    const frenzyCore = this.frenzy > 3.8 ? '#fbcfe8' : (this.frenzy > 2.8 ? '#fef08a' : (this.frenzy > 1.8 ? '#a7f3d0' : cfg.ropeCore));

    // Outer Glow Halo
    this.ctx.beginPath();
    this.ctx.moveTo(this.pts[0].x, this.pts[0].y);
    for (let i = 0; i < this.pts.length - 1; i++) {
      const b = this.getBezier(i);
      this.ctx.bezierCurveTo(b.cp1x, b.cp1y, b.cp2x, b.cp2y, b.x2, b.y2);
    }
    this.ctx.strokeStyle = frenzyGlow;
    this.ctx.lineWidth = 9 + this.frenzy * 2.5;
    this.ctx.stroke();

    // Glowing Braided Core
    for (let i = 0; i < this.pts.length - 1; i++) {
      const t = i / (this.pts.length - 2);
      const w = (7 * (1 - t * 0.5) + 2) + this.frenzy * 1.5;
      const b = this.getBezier(i);
      this.ctx.beginPath();
      this.ctx.moveTo(this.pts[i].x, this.pts[i].y);
      this.ctx.bezierCurveTo(b.cp1x, b.cp1y, b.cp2x, b.cp2y, b.x2, b.y2);
      this.ctx.strokeStyle = frenzyCore;
      this.ctx.lineWidth = w;
      this.ctx.stroke();
    }

    // Cracker Tip
    const tip = this.pts[this.pts.length - 1];
    this.ctx.beginPath();
    this.ctx.arc(tip.x, tip.y, 5 + this.frenzy, 0, Math.PI * 2);
    this.ctx.fillStyle = frenzyGlow;
    this.ctx.fill();

    this.ctx.restore();
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

    this.update(dt);
    this.draw();

    requestAnimationFrame(this.loop);
  }
}
