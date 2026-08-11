// ---- Ambient hero canvas (idle FFT-style bars, no audio yet) ----
const heroCanvas = document.getElementById('hero-canvas');
const heroCtx = heroCanvas.getContext('2d');
let w, h;

function resizeHero(){
  w = heroCanvas.width = heroCanvas.clientWidth * devicePixelRatio;
  h = heroCanvas.height = heroCanvas.clientHeight * devicePixelRatio;
}
window.addEventListener('resize', resizeHero);
resizeHero();

const BAR_COUNT = 64;
let t = 0;

function drawHero(){
  heroCtx.clearRect(0, 0, w, h);
  const barWidth = w / BAR_COUNT;
  for (let i = 0; i < BAR_COUNT; i++){
    // layered sine waves to fake an idle frequency landscape
    const n = Math.sin(i * 0.3 + t * 0.02) * 0.5
            + Math.sin(i * 0.12 - t * 0.015) * 0.3
            + Math.sin(i * 0.05 + t * 0.008) * 0.2;
    const amp = (n * 0.5 + 0.5) * h * 0.35;
    const x = i * barWidth;
    const grad = heroCtx.createLinearGradient(0, h, 0, h - amp);
    grad.addColorStop(0, 'rgba(255,107,71,0.5)');
    grad.addColorStop(1, 'rgba(111,168,220,0.15)');
    heroCtx.fillStyle = grad;
    heroCtx.fillRect(x + barWidth * 0.15, h - amp, barWidth * 0.7, amp);
  }
  t++;
  requestAnimationFrame(drawHero);
}
drawHero();

// ---- Divider bars (static FFT-motif dividers between sections) ----
document.querySelectorAll('[data-divider]').forEach(div => {
  const barCount = 40;
  for (let i = 0; i < barCount; i++){
    const bar = document.createElement('span');
    const height = 4 + Math.abs(Math.sin(i * 0.4)) * 24 + Math.random() * 6;
    bar.style.cssText = `display:inline-block;width:3px;height:${height}px;background:linear-gradient(to top, var(--coral), var(--ice));border-radius:2px;opacity:0.6;`;
    div.appendChild(bar);
  }
});

// ---- Rhythm grid cells ----
const rhythmGrid = document.getElementById('rhythm-grid');
const rhythmCells = [];
if (rhythmGrid){
  for (let i = 0; i < 16; i++){
    const cell = document.createElement('div');
    cell.className = 'rhythm-cell';
    rhythmGrid.appendChild(cell);
    rhythmCells.push(cell);
  }
}

// ============================================================
// LIVE DEMO: synthesized phrase -> real AnalyserNode -> 3 views
// ============================================================
const playBtn = document.getElementById('demo-play');
const statusEl = document.getElementById('demo-status');
const vizCanvas = document.getElementById('viz-canvas');
const vizCtx = vizCanvas.getContext('2d');
const radarCanvas = document.getElementById('radar-canvas');
const radarCtx = radarCanvas.getContext('2d');

let audioCtx, analyser, dataArray, freqBinCount, rafId;
let playing = false;
let beatClock = 0;

function setupAudioGraph(){
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 512; // -> 256 frequency bins, we'll sample down to 64
  analyser.smoothingTimeConstant = 0.75;
  freqBinCount = analyser.frequencyBinCount;
  dataArray = new Uint8Array(freqBinCount);
  const masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.22;
  masterGain.connect(analyser);
  analyser.connect(audioCtx.destination);
  return masterGain;
}

// Simple procedural phrase: a chord progression with a kick-ish pulse underneath.
function scheduleDemoPhrase(destination){
  const now = audioCtx.currentTime;
  const chords = [
    [220.00, 277.18, 329.63],   // A minor-ish
    [196.00, 246.94, 293.66],   // G
    [174.61, 220.00, 261.63],   // F
    [196.00, 246.94, 329.63],   // G sus-ish
  ];
  const chordDur = 1.1;
  const totalDur = chordDur * chords.length;

  chords.forEach((chord, i) => {
    const start = now + i * chordDur;
    chord.forEach((freq, vi) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = vi === 0 ? 'sine' : 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.5, start + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, start + chordDur * 0.95);
      osc.connect(gain).connect(destination);
      osc.start(start);
      osc.stop(start + chordDur);
    });

    // beat pulses: 2 per chord, low sine "kick"
    for (let b = 0; b < 2; b++){
      const beatStart = start + b * (chordDur / 2);
      const kick = audioCtx.createOscillator();
      const kickGain = audioCtx.createGain();
      kick.type = 'sine';
      kick.frequency.setValueAtTime(140, beatStart);
      kick.frequency.exponentialRampToValueAtTime(50, beatStart + 0.15);
      kickGain.gain.setValueAtTime(0.7, beatStart);
      kickGain.gain.exponentialRampToValueAtTime(0.001, beatStart + 0.18);
      kick.connect(kickGain).connect(destination);
      kick.start(beatStart);
      kick.stop(beatStart + 0.2);
    }
  });

  return totalDur;
}

function drawVisualizer(){
  analyser.getByteFrequencyData(dataArray);
  const cw = vizCanvas.width = vizCanvas.clientWidth * devicePixelRatio;
  const ch = vizCanvas.height = 160 * devicePixelRatio;
  vizCtx.clearRect(0, 0, cw, ch);

  const bins = 64;
  const step = Math.floor(freqBinCount / bins);
  const barW = cw / bins;

  for (let i = 0; i < bins; i++){
    const v = dataArray[i * step] / 255;
    const barH = v * ch * 0.95;
    const grad = vizCtx.createLinearGradient(0, ch, 0, ch - barH);
    grad.addColorStop(0, '#FF6B47');
    grad.addColorStop(1, '#6FA8DC');
    vizCtx.fillStyle = grad;
    vizCtx.fillRect(i * barW + barW * 0.15, ch - barH, barW * 0.7, barH);
  }
  return dataArray;
}

function driveRhythmGrid(freqData){
  // low-frequency energy (first ~8 bins) approximates beat/kick presence
  let lowEnergy = 0;
  for (let i = 0; i < 8; i++) lowEnergy += freqData[i];
  lowEnergy /= (8 * 255);

  beatClock++;
  rhythmCells.forEach((cell, i) => {
    const phase = (beatClock * 0.05 + i * 0.6) % (Math.PI * 2);
    const active = lowEnergy > 0.35 && Math.sin(phase) > 0.7;
    cell.classList.toggle('pulse', active);
  });
}

// Emotion fingerprint: 5 axes derived from the frequency spectrum shape.
// energy | brightness | warmth | tension | motion
function computeEmotionVector(freqData){
  const n = freqData.length;
  const low = avg(freqData, 0, n * 0.15);
  const mid = avg(freqData, n * 0.15, n * 0.5);
  const high = avg(freqData, n * 0.5, n);
  const energy = (low + mid + high) / (3 * 255);
  const brightness = high / 255;
  const warmth = low / 255;
  const tension = Math.abs(mid - high) / 255;
  const motion = variance(freqData) / (255 * 255);
  return [energy, brightness, warmth, tension, Math.min(motion * 4, 1)];
}
function avg(arr, from, to){
  from = Math.floor(from); to = Math.floor(to);
  let s = 0; for (let i = from; i < to; i++) s += arr[i];
  return s / Math.max(1, to - from);
}
function variance(arr){
  const m = arr.reduce((a,b)=>a+b,0) / arr.length;
  return arr.reduce((a,b)=>a + (b-m)*(b-m), 0) / arr.length;
}

function drawRadar(vector){
  const labels = ['energy','bright','warmth','tension','motion'];
  const cx = radarCanvas.width / 2, cy = radarCanvas.height / 2;
  const radius = Math.min(cx, cy) - 24;
  radarCtx.clearRect(0, 0, radarCanvas.width, radarCanvas.height);

  // grid rings
  radarCtx.strokeStyle = 'rgba(243,238,228,0.12)';
  for (let ring = 1; ring <= 3; ring++){
    radarCtx.beginPath();
    for (let i = 0; i <= 5; i++){
      const angle = (Math.PI * 2 * i / 5) - Math.PI / 2;
      const r = radius * (ring / 3);
      const x = cx + Math.cos(angle) * r, y = cy + Math.sin(angle) * r;
      i === 0 ? radarCtx.moveTo(x,y) : radarCtx.lineTo(x,y);
    }
    radarCtx.closePath();
    radarCtx.stroke();
  }

  // data shape
  radarCtx.beginPath();
  vector.forEach((v, i) => {
    const angle = (Math.PI * 2 * i / 5) - Math.PI / 2;
    const r = radius * Math.max(0.08, v);
    const x = cx + Math.cos(angle) * r, y = cy + Math.sin(angle) * r;
    i === 0 ? radarCtx.moveTo(x,y) : radarCtx.lineTo(x,y);
  });
  radarCtx.closePath();
  radarCtx.fillStyle = 'rgba(255,107,71,0.28)';
  radarCtx.strokeStyle = '#FF6B47';
  radarCtx.lineWidth = 2;
  radarCtx.fill();
  radarCtx.stroke();

  // labels
  radarCtx.fillStyle = '#8C8577';
  radarCtx.font = '9px IBM Plex Mono, monospace';
  radarCtx.textAlign = 'center';
  labels.forEach((label, i) => {
    const angle = (Math.PI * 2 * i / 5) - Math.PI / 2;
    const x = cx + Math.cos(angle) * (radius + 14);
    const y = cy + Math.sin(angle) * (radius + 14);
    radarCtx.fillText(label, x, y);
  });
}

function tick(){
  const freqData = drawVisualizer();
  driveRhythmGrid(freqData);
  drawRadar(computeEmotionVector(freqData));
  rafId = requestAnimationFrame(tick);
}

function stopDemo(){
  playing = false;
  playBtn.textContent = '▶ Play demo phrase';
  statusEl.textContent = 'idle';
  statusEl.classList.remove('playing');
  cancelAnimationFrame(rafId);
  rhythmCells.forEach(c => c.classList.remove('pulse'));
}

playBtn.addEventListener('click', async () => {
  if (playing) return;
  if (!audioCtx) {
    const dest = setupAudioGraph();
    playBtn._dest = dest;
  }
  if (audioCtx.state === 'suspended') await audioCtx.resume();

  playing = true;
  playBtn.textContent = '♪ Playing…';
  statusEl.textContent = 'analyzing 64 bins, live';
  statusEl.classList.add('playing');

  const duration = scheduleDemoPhrase(playBtn._dest);
  tick();
  setTimeout(stopDemo, duration * 1000 + 300);
});
