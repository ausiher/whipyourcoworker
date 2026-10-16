// Node script to generate authentic heavy iron mace/flail strike sounds as 44.1kHz 16-bit WAV files
const fs = require('fs');
const path = require('path');

function createWavBuffer(sampleRate, samples) {
  const byteRate = sampleRate * 2; // 16-bit mono = 2 bytes per sample
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(1, 22); // NumChannels (1 = Mono)
  buffer.writeUInt32LE(sampleRate, 24); // SampleRate
  buffer.writeUInt32LE(byteRate, 28); // ByteRate
  buffer.writeUInt16LE(2, 32); // BlockAlign
  buffer.writeUInt16LE(16, 34); // BitsPerSample

  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples.length; i++) {
    // Clamp to -1.0 to 1.0
    let s = Math.max(-1.0, Math.min(1.0, samples[i]));
    let val = s < 0 ? s * 32768 : s * 32767;
    buffer.writeInt16LE(Math.floor(val), 44 + i * 2);
  }

  return buffer;
}

function synthesizeMaceClank(variation = 0) {
  const sampleRate = 44100;
  const duration = 0.45; // 450ms
  const totalSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(totalSamples);

  // Base fundamental frequency variation (around 380 - 460 Hz)
  const baseF = [410, 445, 385][variation % 3];
  
  // Cast Iron Inharmonic Modal Ratios (Bessel vibration modes of solid iron sphere)
  const modes = [
    { freq: baseF * 1.000, decay: 0.28, amp: 0.65 },
    { freq: baseF * 1.624, decay: 0.22, amp: 0.50 },
    { freq: baseF * 2.341, decay: 0.16, amp: 0.42 },
    { freq: baseF * 3.185, decay: 0.12, amp: 0.35 },
    { freq: baseF * 4.412, decay: 0.08, amp: 0.28 },
    { freq: baseF * 5.920, decay: 0.05, amp: 0.22 },
    { freq: baseF * 7.840, decay: 0.035, amp: 0.18 },
    { freq: baseF * 10.20, decay: 0.025, amp: 0.12 }
  ];

  // 1. Initial High-Frequency Hard Metal Strike Transient (0 - 8ms)
  for (let i = 0; i < Math.floor(sampleRate * 0.015); i++) {
    const t = i / sampleRate;
    const env = Math.exp(-t * 350);
    // Noise filtered with high metallic crack
    const noise = (Math.random() * 2 - 1);
    const snap = Math.sin(2 * Math.PI * 3400 * t) * 0.4;
    samples[i] += (noise * 0.6 + snap) * env * 0.85;
  }

  // 2. Heavy Mass Kinetic Body Thud (Deep solid weight)
  const thudDuration = 0.18;
  for (let i = 0; i < Math.floor(sampleRate * thudDuration); i++) {
    const t = i / sampleRate;
    const thudFreq = 140 * Math.exp(-t * 18) + 32;
    const env = Math.exp(-t * 22);
    samples[i] += Math.sin(2 * Math.PI * thudFreq * t) * env * 0.70;
  }

  // 3. Dense Resonant Modal Metallic Ringing (The authentic cast iron "CLAAAANG")
  for (let m = 0; m < modes.length; m++) {
    const mode = modes[m];
    const modeSamples = Math.floor(sampleRate * Math.min(duration, mode.decay * 3.5));
    const phaseOffset = Math.random() * Math.PI * 2;
    for (let i = 0; i < modeSamples; i++) {
      const t = i / sampleRate;
      const env = Math.exp(-t / mode.decay);
      // Subtle non-linear pitch sag on impact
      const instantFreq = mode.freq * (1.0 + 0.035 * Math.exp(-t * 60));
      samples[i] += Math.sin(2 * Math.PI * instantFreq * t + phaseOffset) * env * mode.amp * 0.45;
    }
  }

  // 4. Secondary Iron Chain Links Chattering / Jingling (3 - 4 links)
  const linkPings = [
    { delay: 0.032, freq: 2840, decay: 0.045, amp: 0.35 },
    { delay: 0.058, freq: 3620, decay: 0.038, amp: 0.28 },
    { delay: 0.092, freq: 2410, decay: 0.050, amp: 0.24 },
    { delay: 0.125, freq: 4100, decay: 0.032, amp: 0.18 },
  ];

  linkPings.forEach(lp => {
    const startIdx = Math.floor(sampleRate * lp.delay);
    const len = Math.floor(sampleRate * lp.decay * 3);
    for (let i = 0; i < len; i++) {
      const idx = startIdx + i;
      if (idx >= totalSamples) break;
      const t = i / sampleRate;
      const env = Math.exp(-t / lp.decay);
      const ping = Math.sin(2 * Math.PI * lp.freq * t);
      const linkNoise = (Math.random() * 2 - 1) * 0.15;
      samples[idx] += (ping + linkNoise) * env * lp.amp * 0.4;
    }
  });

  // Soft master limiting / normalization
  let maxPeak = 0;
  for (let i = 0; i < totalSamples; i++) {
    const abs = Math.abs(samples[i]);
    if (abs > maxPeak) maxPeak = abs;
  }
  if (maxPeak > 0.01) {
    const norm = 0.92 / maxPeak;
    for (let i = 0; i < totalSamples; i++) {
      samples[i] *= norm;
    }
  }

  return createWavBuffer(sampleRate, samples);
}

const soundsDir = path.join(__dirname, '..', 'web', 'sounds');
if (!fs.existsSync(soundsDir)) {
  fs.mkdirSync(soundsDir, { recursive: true });
}

for (let v = 1; v <= 3; v++) {
  const wavBuf = synthesizeMaceClank(v - 1);
  const outPath = path.join(soundsDir, `chain_hit_${v}.wav`);
  fs.writeFileSync(outPath, wavBuf);
  console.log(`Generated: ${outPath} (${wavBuf.length} bytes)`);
}
