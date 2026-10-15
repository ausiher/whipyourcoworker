/**
 * OpenWhip AR - Next-Gen 3D Anime Arcade Gauntlet & Whip Engine
 * Features:
 * • Rigged 3D Hand Model (GLB) with Gripping Pose & Armored Gauntlet
 * • Braided Whip Handle with Brass Ferrule Emitter
 * • Responsive Frustum Anchor (prominent first-person framing on mobile & desktop)
 * • Wave-propagation S-curve whip physics (realistic bullwhip crack)
 * • Pure Speed Arcade Frenzy Multiplier (up to 4.0x rapid-fire)
 * • Comic Impact Starburst, Shockwaves, and Sparks
 */

class WhipEngine {
  constructor(canvas, threeCanvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.threeCanvasElem = threeCanvas;

    this.W = 0;
    this.H = 0;

    // ── Audio Engine ──────────────────────────────────────────────────────────
    this.audioPool = [];
    this.audioUnlocked = false;
    this.isMuted = false;
    this.initAudio();

    // ── Three.js 3D Viewport & Scene ──────────────────────────────────────────
    this.initThreeJS(threeCanvas);
    this.resize();

    // ── Whip Rope Physics ─────────────────────────────────────────────────────
    this.segments = 24;
    this.segmentLength = 22;
    this.pts = [];
    this.initWhipPoints();

    // ── Frenzy Speed Multiplier ───────────────────────────────────────────────
    this.frenzy = 1.0;
    this.combo = 0;
    this.lastTapTime = 0;
    this.whipCount = 0;

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

  // ── Mobile Device Sensors: Gyro 3D Tilt & Physical Swing ──────────────────
  initSensors() {
    this.handleDeviceMotion = this.handleDeviceMotion.bind(this);
    this.handleDeviceOrientation = this.handleDeviceOrientation.bind(this);

    if (typeof window !== 'undefined') {
      // 1. Android & Modern Browsers: Attach directly if permission not required
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
    // Map phone tilt into subtle 3D weapon rotation parallax
    const pitch = THREE.MathUtils.clamp(event.beta - 45, -35, 35) * 0.012;
    const yaw = THREE.MathUtils.clamp(event.gamma, -35, 35) * 0.014;
    const roll = THREE.MathUtils.clamp(event.gamma, -25, 25) * -0.010;

    this.gyroTilt.x += (pitch - this.gyroTilt.x) * 0.25;
    this.gyroTilt.y += (yaw - this.gyroTilt.y) * 0.25;
    this.gyroTilt.z += (roll - this.gyroTilt.z) * 0.25;
  }

  handleDeviceMotion(event) {
    const now = performance.now();
    if (now - this.lastSwingTime < 280) return; // Prevent double-triggering in single wrist arc

    // Support devices where event.acceleration properties may be null
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

    // Delta acceleration cancels static 9.8m/s^2 gravity perfectly on any orientation
    const dx = ax - this.lastAcc.x;
    const dy = ay - this.lastAcc.y;
    const dz = az - this.lastAcc.z;
    this.lastAcc = { x: ax, y: ay, z: az };

    const deltaMag = Math.hypot(dx, dy, dz);
    const totalMag = Math.hypot(ax, ay, az);

    // High impact flick threshold: deltaMag >= 13 m/s² OR totalMag >= 20 m/s²
    if (deltaMag >= 13.0 || totalMag >= 20.0) {
      this.lastSwingTime = now;

      // Haptic feedback vibration
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate([40, 25, 80]); } catch {}
      }

      // Strike directly at center of screen (crosshair)
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

  initAudio() {
    this.soundFiles = [
      'sounds/A.mp3',
      'sounds/B.mp3',
      'sounds/C.mp3',
      'sounds/D.mp3',
      'sounds/E.mp3',
    ];

    // HTML5 Audio fallback
    this.audioPool = [];
    this.soundFiles.forEach(src => {
      const a = new Audio(src);
      a.volume = 0.95;
      this.audioPool.push(a);
    });

    // Web Audio Engine for zero-latency + video stream audio injection
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      try {
        this.audioCtx = new AudioCtx();
        this.audioDest = this.audioCtx.createMediaStreamDestination();
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
        const arrayBuffer = await resp.arrayBuffer();
        const decoded = await this.audioCtx.decodeAudioData(arrayBuffer);
        this.audioBuffers.push(decoded);
      } catch (e) {
        // Fallback to HTML5 audio pool
      }
    }
  }

  unlockAudio() {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
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

  playCrackSound() {
    if (this.isMuted) return;
    this.unlockAudio();

    const pitchRate = Math.min(1.58, 0.95 + (this.frenzy - 1.0) * 0.18);

    // 1. Web Audio (Zero-latency + Mixed into video recording stream)
    if (this.audioCtx && this.audioBuffers && this.audioBuffers.length > 0) {
      try {
        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume();
        }
        const buffer = this.audioBuffers[Math.floor(Math.random() * this.audioBuffers.length)];
        const source = this.audioCtx.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = pitchRate;

        const gainNode = this.audioCtx.createGain();
        gainNode.gain.value = 0.95;

        source.connect(gainNode);
        gainNode.connect(this.audioCtx.destination); // to User Speakers

        if (this.audioDest) {
          gainNode.connect(this.audioDest); // to Video Recorder MediaStream!
        }
        source.start(0);
        return;
      } catch (e) {
        // Fallback to HTML5 Audio below
      }
    }

    // 2. Fallback HTML5 Audio
    try {
      if (this.audioPool && this.audioPool.length > 0) {
        const a = this.audioPool[Math.floor(Math.random() * this.audioPool.length)];
        a.currentTime = 0;
        a.playbackRate = pitchRate;
        a.play().catch(() => {});
      }
    } catch {}
  }

  getAudioStream() {
    return this.audioDest ? this.audioDest.stream : null;
  }

  initWhipPoints() {
    this.pts = [];
    const origin = this.getEmitterScreenPos();
    for (let i = 0; i < this.segments; i++) {
      const t = i / (this.segments - 1);
      // Gentle hanging idle curve downward from handle
      const x = origin.x - t * 90 + Math.sin(t * Math.PI) * 45;
      const y = origin.y + t * (this.H * 0.32) + Math.sin(t * Math.PI * 0.7) * 40;
      this.pts.push({ x, y, px: x, py: y });
    }
  }

  // ── Three.js 3D Setup ─────────────────────────────────────────────────────
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

    // Studio Lights for Cel-Shaded Metal
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.1);
    this.scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffea00, 1.5);
    keyLight.position.set(4, 7, 5);
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x00f5ff, 1.3);
    rimLight.position.set(-5, 4, -2);
    this.scene.add(rimLight);

    // Root Group for 3D Arm attached directly to camera view space
    this.armRoot = new THREE.Group();
    this.camera.add(this.armRoot);

    // Assemble 3D Arm, Gauntlet & Handle
    this.build3DGauntlet();

    // Load 3D Hand GLB Model
    this.loadHandGLB();
  }

  updateArmPlacement() {
    if (!this.camera || !this.armRoot) return;

    // Viewport-adaptive first-person weapon positioning
    const dist = 2.4;
    const vFOV = THREE.MathUtils.degToRad(this.camera.fov);
    const visibleHeight = 2 * Math.tan(vFOV / 2) * dist;
    const visibleWidth = visibleHeight * this.camera.aspect;

    const isPortrait = this.camera.aspect < 1.0;

    if (isPortrait) {
      // Mobile Portrait (e.g. 9:16 or 9:19.5):
      // Push arm comfortably into lower-right corner leaving center open
      this.armBasePos = new THREE.Vector3(
        visibleWidth * 0.38,
        -visibleHeight * 0.36,
        -dist
      );
      this.armRoot.scale.set(0.85, 0.85, 0.85);
    } else {
      // Desktop / Landscape:
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

      // Stylized Platinum Cyber-Glove Material
      const cyberGloveMat = new THREE.MeshStandardMaterial({
        color: 0xdde3ed,
        metalness: 0.78,
        roughness: 0.28,
      });

      model.traverse((child) => {
        if (child.isMesh) {
          child.material = cyberGloveMat;
          child.castShadow = true;
        }
      });

      // Fit and position the GLB hand onto our gauntlet armature
      model.scale.set(4.8, 4.8, 4.8);
      model.position.set(0.04, -0.02, -0.02);
      model.rotation.set(Math.PI / 2 + 0.22, 0.35, -0.55);

      if (this.armAssembly) {
        this.armAssembly.add(model);
      } else {
        this.armRoot.add(model);
      }
      this.glbHandModel = model;
    }, undefined, (err) => {
      console.warn('Custom GLB load note:', err.message);
    });
  }

  build3DGauntlet() {
    // High-end Cyber Anime Materials
    const darkTitaniumMat = new THREE.MeshStandardMaterial({
      color: 0x161822,
      metalness: 0.88,
      roughness: 0.28,
    });
    const goldPlateMat = new THREE.MeshStandardMaterial({
      color: 0xffb703,
      metalness: 0.96,
      roughness: 0.12,
    });
    this.energyMat = new THREE.MeshBasicMaterial({
      color: 0xffea00
    });

    // 1. Arm Assembly Group (tilted toward screen center)
    this.armAssembly = new THREE.Group();
    this.armAssembly.rotation.set(0.18, -0.32, 0.24);

    // 2. Forearm Cyber Bracer
    const bracerGeo = new THREE.CylinderGeometry(0.20, 0.30, 1.5, 8);
    const bracer = new THREE.Mesh(bracerGeo, darkTitaniumMat);
    bracer.position.set(0, -0.65, 0);
    this.armAssembly.add(bracer);

    // Golden Bracer Rings
    const ring1 = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 8), goldPlateMat);
    ring1.position.set(0, -0.12, 0);
    this.armAssembly.add(ring1);
    const ring2 = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.08, 8), goldPlateMat);
    ring2.position.set(0, -0.9, 0);
    this.armAssembly.add(ring2);

    // Glowing Cyber Conduit
    const conduit = new THREE.Mesh(new THREE.BoxGeometry(0.035, 1.3, 0.05), this.energyMat);
    conduit.position.set(0, -0.65, 0.24);
    this.armAssembly.add(conduit);

    // 3. Whip Handle (Tactical Baton gripped in hand)
    const handleGroup = new THREE.Group();
    handleGroup.position.set(0, 0.18, 0.02);
    handleGroup.rotation.set(0.35, 0.15, -0.25);

    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.95, 16), new THREE.MeshStandardMaterial({
      color: 0x1e1916,
      metalness: 0.4,
      roughness: 0.5
    }));
    handleGroup.add(grip);

    // Golden Collar & Pommel
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.15, 16), goldPlateMat);
    collar.position.set(0, 0.48, 0);
    handleGroup.add(collar);

    const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), goldPlateMat);
    pommel.position.set(0, -0.48, 0);
    handleGroup.add(pommel);

    // 3D Whip Emitter Point
    this.whipEmitter = new THREE.Object3D();
    this.whipEmitter.position.set(0, 0.56, 0);
    handleGroup.add(this.whipEmitter);

    this.armAssembly.add(handleGroup);
    this.armRoot.add(this.armAssembly);
  }

  // ── Strike Trigger with Speed Frenzy ──────────────────────────────────────
  strikeAt(targetX, targetY) {
    this.unlockAudio();

    const now = performance.now();
    const timeSinceLastTap = now - this.lastTapTime;
    this.lastTapTime = now;

    // Frenzy Speed Escalation
    if (timeSinceLastTap < 550) {
      this.combo++;
      this.frenzy = Math.min(4.0, this.frenzy + 0.42);
    } else {
      this.combo = 1;
    }

    // Strike duration scales from 210ms down to 60ms!
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
      if (this.onFrenzyChange) {
        this.onFrenzyChange(this.frenzy, this.combo);
      }
    }

    // Dynamic Energy Conduit Color based on Frenzy level
    if (this.energyMat) {
      if (this.frenzy > 2.8) {
        this.energyMat.color.setHex(0xff0077); // Blazing Plasma
      } else if (this.frenzy > 1.8) {
        this.energyMat.color.setHex(0x00f0ff); // Neon Cyan
      } else {
        this.energyMat.color.setHex(0xffea00); // Electric Gold
      }
    }

    // Dynamic Energy Conduit Color matches Frenzy Multiplier
    if (this.energyMat) {
      const energyHex = this.frenzy > 2.8 ? 0xff0077 : (this.frenzy > 1.8 ? 0x00f0ff : 0xffea00);
      this.energyMat.color.setHex(energyHex);
    }

    // 1. Three.js 3D Arm Motion, Weapon Sway & 3D Gyro Tilt Reaction
    const idleSwayX = Math.cos(this.time * 2.2) * 0.02;
    const idleSwayY = Math.sin(this.time * 3.0) * 0.015;
    const idleRotZ = Math.sin(this.time * 1.8) * 0.012;

    let armTargetX = this.armBasePos ? this.armBasePos.x + idleSwayX : 1.1;
    let armTargetY = this.armBasePos ? this.armBasePos.y + idleSwayY : -0.7;
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
        // Wind-up: 3D Arm cocks backward
        const p = progress / 0.22;
        armTargetX += 0.08 * Math.sin(p * Math.PI * 0.5);
        armTargetY -= 0.07 * Math.sin(p * Math.PI * 0.5);
        armRotZ += 0.12 * Math.sin(p * Math.PI * 0.5);
      } else if (progress < 0.65) {
        // Explosive 3D forward lunge toward target with wrist snap
        const p = (progress - 0.22) / 0.43;
        const ease = p * p * (3 - 2 * p);
        armTargetX -= 0.18 * ease;
        armTargetY += 0.16 * ease;
        armRotX += 0.20 * ease;
        armRotZ = -Math.sin(strikeAimAngle) * 0.25;

        strikeWavePhase = p;

        tipTarget = {
          x: this.pts[this.pts.length - 1].x + (this.strike.targetX - this.pts[this.pts.length - 1].x) * ease,
          y: this.pts[this.pts.length - 1].y + (this.strike.targetY - this.pts[this.pts.length - 1].y) * ease,
        };
      } else if (!this.strike.impactFired) {
        // Impact Moment!
        this.strike.impactFired = true;
        tipTarget = { x: this.strike.targetX, y: this.strike.targetY };
        this.triggerImpact(this.strike.targetX, this.strike.targetY);
      } else {
        // Snappy 3D Elastic Recoil
        const p = (progress - 0.65) / 0.35;
        armTargetX += 0.08 * (1 - p);
        armTargetY -= 0.06 * (1 - p);
      }

      if (progress >= 1.0) {
        this.strike = null;
      }
    }

    // Apply transforms to 3D Arm Root (including 3D gyro tilt)
    this.armRoot.position.x += (armTargetX - this.armRoot.position.x) * 0.45;
    this.armRoot.position.y += (armTargetY - this.armRoot.position.y) * 0.45;
    this.armRoot.rotation.x += (armRotX - this.armRoot.rotation.x) * 0.45;
    this.armRoot.rotation.y += (armRotY - this.armRoot.rotation.y) * 0.45;
    this.armRoot.rotation.z += (armRotZ - this.armRoot.rotation.z) * 0.45;

    // Get 3D Emitter screen coordinates
    const emitterScreen = this.getEmitterScreenPos();

    // 2. Whip Rope Physics (Verlet) with S-Curve Wave Propagation
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

      // Authentic S-curve transverse wave traveling down the whip
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

    // 3. Update Impact FX
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

    // Screen Shake
    this.screenShake = 16 + this.frenzy * 4;

    const frenzyColor = this.frenzy > 2.8 ? '#ff0077' : (this.frenzy > 1.8 ? '#00f0ff' : '#ffea00');

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
        color: Math.random() > 0.4 ? frenzyColor : '#ffffff',
        gravity: 0.38,
      });
    }

    // 4. Floating Comic Hit Text
    const phrases = [
      '💥 CRACK!',
      '⚡ FASTER!',
      '💢 WHIP!',
      '🔥 OUCH!',
      '😈 SPEED UP!',
      '💥 BAM!'
    ];
    if (this.frenzy >= 3.0) {
      phrases.push('🔥 MAX FRENZY!', '⚡ 9999 CRIT!', '💥 GODLIKE!');
    }
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

    // Starbursts
    for (let i = this.starbursts.length - 1; i >= 0; i--) {
      const sb = this.starbursts[i];
      sb.scale += 0.12;
      sb.alpha -= 0.07;
      if (sb.alpha <= 0 || sb.scale >= sb.maxScale) this.starbursts.splice(i, 1);
    }

    // Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.r += 5.2;
      s.alpha -= 0.058;
      if (s.alpha <= 0 || s.r >= s.maxR) this.shockwaves.splice(i, 1);
    }

    // Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.alpha -= 0.038;
      if (p.alpha <= 0) this.particles.splice(i, 1);
    }

    // Floating Texts
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

    // Screen Shake Transform
    if (this.screenShake > 0) {
      const sx = (Math.random() - 0.5) * this.screenShake;
      const sy = (Math.random() - 0.5) * this.screenShake;
      this.ctx.translate(sx, sy);
    }

    // 1. Draw Whip Rope Spline
    this.drawWhip();

    // 2. Render Three.js 3D Anime Gauntlet onto Canvas
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

    // 6. Draw Floating Comic Text
    for (const ft of this.floatingTexts) {
      this.ctx.save();
      this.ctx.translate(ft.x, ft.y);
      this.ctx.scale(ft.scale, ft.scale);
      this.ctx.globalAlpha = Math.max(0, ft.alpha);
      this.ctx.textAlign = 'center';
      this.ctx.font = '900 28px system-ui, -apple-system, sans-serif';

      this.ctx.strokeStyle = '#000000';
      this.ctx.lineWidth = 6;
      this.ctx.strokeText(ft.text, 0, 0);

      this.ctx.fillStyle = ft.color || '#ffea00';
      this.ctx.fillText(ft.text, 0, 0);
      this.ctx.restore();
    }

    this.ctx.restore();
  }

  // Draw 10-pointed Comic Impact Starburst
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

    const frenzyGlow = this.frenzy > 2.8 ? '#ff0077' : (this.frenzy > 1.8 ? '#00f0ff' : '#ffffff');
    const frenzyCore = this.frenzy > 2.8 ? '#ff77aa' : (this.frenzy > 1.8 ? '#88ffff' : '#ffea00');

    // 1. Outer Energy Halo
    this.ctx.beginPath();
    this.ctx.moveTo(this.pts[0].x, this.pts[0].y);
    for (let i = 0; i < this.pts.length - 1; i++) {
      const b = this.getBezier(i);
      this.ctx.bezierCurveTo(b.cp1x, b.cp1y, b.cp2x, b.cp2y, b.x2, b.y2);
    }
    this.ctx.strokeStyle = frenzyGlow;
    this.ctx.lineWidth = 9 + this.frenzy * 2.5;
    this.ctx.stroke();

    // 2. Glowing Braided Core
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

    // 3. Blazing Cracker Tip
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
