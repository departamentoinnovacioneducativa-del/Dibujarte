// ============ CONFIGURACIÓN INICIAL ============
const canvas = document.getElementById('paintCanvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });

let isDrawing = false;
let lastX = 0, lastY = 0;
let currentTool = 'brush';
let currentColor = '#FF6B6B';
let brushSize = 15;
let undoStack = [];
let currentTemplate = null;
let currentCategory = 'animales';
let currentSticker = '⭐';

// ============ SONIDOS Y VOZ ============
let audioCtx;
function playSound(freq = 800, duration = 0.1) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.connect(g); g.connect(audioCtx.destination);
    o.frequency.value = freq; o.type = 'sine';
    g.gain.setValueAtTime(0.3, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    o.start(audioCtx.currentTime); o.stop(audioCtx.currentTime + duration);
  } catch(e) {}
}

function speak(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = 1.2;
    utterance.pitch = 1.5;
    window.speechSynthesis.speak(utterance);
  }
}

// ============ COLORES (LÁPICES) ============
const colors = [
  '#FF6B6B', '#FF9F1C', '#FFD93D', '#FFE66D', '#95E06C', '#6BCB77',
  '#2EC4B6', '#5BC0EB', '#4D96FF', '#4361EE', 
  '#9D4EDD', '#C77DFF', '#FF6BCB', '#FF006E', '#8B4513', '#D4A574', 
  '#FFFFFF', '#C0C0C0', '#808080', '#000000'
];

const leftPencils = document.getElementById('leftPencils');
const rightPencils = document.getElementById('rightPencils');
const mobilePencils = document.getElementById('mobilePencils');

colors.forEach((color, i) => {
  // Lápiz Escritorio
  const pencil = document.createElement('div');
  pencil.className = 'pencil ' + (i < 10 ? 'left' : 'right');
  if (i === 0) pencil.classList.add('active');
  pencil.style.setProperty('--p-color', color);
  pencil.dataset.color = color;
  pencil.innerHTML = `<div class="pencil-tip"></div><div class="pencil-body"></div><div class="pencil-metal"></div><div class="pencil-eraser"></div>`;
  
  pencil.addEventListener('click', () => selectColor(color, pencil));
  
  if (i < 10) leftPencils.appendChild(pencil);
  else rightPencils.appendChild(pencil);

  // Lápiz Móvil
  const mobPencil = document.createElement('div');
  mobPencil.className = 'pencil mobile';
  mobPencil.style.setProperty('--p-color', color);
  mobPencil.style.transform = 'scale(0.7)';
  mobPencil.style.margin = '-5px';
  if (i === 0) mobPencil.classList.add('active');
  mobPencil.dataset.color = color;
  mobPencil.innerHTML = `<div class="pencil-tip"></div><div class="pencil-body"></div><div class="pencil-metal"></div><div class="pencil-eraser"></div>`;
  mobPencil.addEventListener('click', () => selectColor(color, mobPencil));
  mobilePencils.appendChild(mobPencil);
});

function selectColor(color, element) {
  document.querySelectorAll('.pencil').forEach(p => p.classList.remove('active'));
  element.classList.add('active');
  currentColor = color;
  updateActiveColorDisplay();
  playSound(600, 0.05);
}

function updateActiveColorDisplay() {
  document.getElementById('sizePreview').style.background = currentColor;
}

// ============ INICIALIZACIÓN DEL CANVAS ============
function initCanvas() {
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  undoStack = []; saveState();
}

function saveState() {
  if (undoStack.length >= 20) undoStack.shift();
  try { undoStack.push(canvas.toDataURL()); } catch (e) {}
}

function undo() {
  if (undoStack.length > 1) {
    undoStack.pop();
    const img = new Image();
    img.onload = () => { ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0); };
    img.src = undoStack[undoStack.length - 1];
    playSound(400, 0.1);
  }
}

// ============ DIBUJO Y PEGATINAS ============
function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const cx = e.touches ? e.touches[0].clientX : e.clientX;
  const cy = e.touches ? e.touches[0].clientY : e.clientY;
  return { x: (cx - rect.left) * scaleX, y: (cy - rect.top) * scaleY };
}

function startDraw(e) {
  e.preventDefault();
  const pos = getPos(e);
  
  if (currentTool === 'bucket') {
    floodFill(Math.floor(pos.x), Math.floor(pos.y), currentColor);
    saveState(); playSound(300, 0.2); return;
  }
  
  if (currentTool === 'sticker') {
    ctx.font = `${brushSize * 3}px Arial`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(currentSticker, pos.x, pos.y);
    saveState(); playSound(1000, 0.1); return;
  }
  
  isDrawing = true;
  lastX = pos.x; lastY = pos.y;
  
  if (currentTool === 'brush' || currentTool === 'eraser') {
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, brushSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = currentTool === 'eraser' ? '#FFFFFF' : currentColor;
    ctx.fill();
  }
}

function draw(e) {
  if (!isDrawing) return;
  e.preventDefault();
  const pos = getPos(e);
  
  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(pos.x, pos.y);
  ctx.strokeStyle = currentTool === 'eraser' ? '#FFFFFF' : currentColor;
  ctx.lineWidth = brushSize;
  ctx.stroke();
  
  lastX = pos.x; lastY = pos.y;
}

function stopDraw() {
  if (isDrawing) { isDrawing = false; saveState(); }
}

// ============ FLOOD FILL (CUBO) ============
function hexToRgba(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  return [parseInt(hex.substring(0, 2), 16), parseInt(hex.substring(2, 4), 16), parseInt(hex.substring(4, 6), 16), 255];
}

function floodFill(startX, startY, fillColorHex) {
  if (startX < 0 || startX >= canvas.width || startY < 0 || startY >= canvas.height) return;
  const fillColor = hexToRgba(fillColorHex);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const width = canvas.width, height = canvas.height;
  
  const startPos = (startY * width + startX) * 4;
  const startR = data[startPos], startG = data[startPos + 1], startB = data[startPos + 2];
  if (startR === fillColor[0] && startG === fillColor[1] && startB === fillColor[2]) return;
  
  const tolerance = 40;
  const stack = [[startX, startY]];
  const visited = new Uint8Array(width * height);
  
  while (stack.length > 0) {
    const [x, y] = stack.pop();
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    const idx = y * width + x;
    if (visited[idx]) continue;
    
    const pos = idx * 4;
    if (Math.abs(data[pos] - startR) > tolerance || Math.abs(data[pos+1] - startG) > tolerance || Math.abs(data[pos+2] - startB) > tolerance) continue;
    
    visited[idx] = 1;
    data[pos] = fillColor[0]; data[pos+1] = fillColor[1]; data[pos+2] = fillColor[2]; data[pos+3] = 255;
    stack.push([x + 1, y]); stack.push([x - 1, y]); stack.push([x, y + 1]); stack.push([x, y - 1]);
  }
  ctx.putImageData(imageData, 0, 0);
}

// ============ EVENTOS DEL CANVAS ============
canvas.addEventListener('mousedown', startDraw);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDraw);
canvas.addEventListener('mouseleave', stopDraw);
canvas.addEventListener('touchstart', startDraw, { passive: false });
canvas.addEventListener('touchmove', draw, { passive: false });
canvas.addEventListener('touchend', stopDraw);

// ============ HERRAMIENTAS Y PEGATINAS ============
document.querySelectorAll('.tool-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentTool = btn.dataset.tool;
    
    const name = btn.dataset.name;
    speak(name);
    playSound(800, 0.1);
    showToast(name, 'fa-hand-pointer');
    
    document.getElementById('stickerPanel').classList.toggle('hidden', currentTool !== 'sticker');
    if (currentTool === 'sticker') canvas.style.cursor = 'copy';
    else if (currentTool === 'eraser') canvas.style.cursor = 'grab';
    else if (currentTool === 'bucket') canvas.style.cursor = 'cell';
    else canvas.style.cursor = 'crosshair';
  });
});

document.querySelectorAll('.sticker-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.sticker-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentSticker = btn.dataset.sticker;
    playSound(1200, 0.1);
  });
});

// ============ TAMAÑO Y BOTONES ============
const sizeSlider = document.getElementById('sizeSlider');
const sizePreview = document.getElementById('sizePreview');
sizeSlider.addEventListener('input', (e) => {
  brushSize = parseInt(e.target.value);
  const ps = Math.min(brushSize, 36);
  sizePreview.style.width = ps + 'px'; sizePreview.style.height = ps + 'px';
});

document.getElementById('undoBtn').addEventListener('click', undo);
document.getElementById('newCanvasBtn').addEventListener('click', () => {
  initCanvas(); currentTemplate = null;
  document.querySelectorAll('.template-card').forEach(c => c.classList.remove('active'));
  showToast('¡Vaciado!', 'fa-trash'); playSound(200, 0.3);
});
document.getElementById('downloadBtn').addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = 'mi-dibujo.png'; link.href = canvas.toDataURL('image/png'); link.click();
  showToast('¡Guardado!', 'fa-download'); launchConfetti(); playSound(1000, 0.5);
});

document.getElementById('uploadBtn').addEventListener('click', () => document.getElementById('imageLoader').click());
document.getElementById('imageLoader').addEventListener('change', (e) => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      let w = img.width, h = img.height; const scale = Math.min(canvas.width / w, canvas.height / h);
      w = Math.floor(w * scale); h = Math.floor(h * scale);
      ctx.drawImage(img, Math.floor((canvas.width - w) / 2), Math.floor((canvas.height - h) / 2), w, h);
      saveState(); currentTemplate = null;
      document.querySelectorAll('.template-card').forEach(c => c.classList.remove('active'));
      showToast('¡Imagen lista!', 'fa-image');
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file); e.target.value = '';
});

// ============ TOAST Y CONFETI ============
function showToast(msg, icon = 'fa-circle-check') {
  const toast = document.getElementById('toast');
  toast.innerHTML = `<i class="fa-solid ${icon}"></i> ${msg}`;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 1500);
}

function launchConfetti() {
  const cColors = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#FF6BCB', '#FF9F1C', '#9D4EDD'];
  for (let i = 0; i < 60; i++) {
    setTimeout(() => {
      const c = document.createElement('div'); c.className = 'confetti';
      c.style.left = Math.random() * 100 + 'vw'; c.style.top = '-20px';
      c.style.background = cColors[Math.floor(Math.random() * cColors.length)];
      c.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
      c.style.width = '12px'; c.style.height = '12px';
      document.body.appendChild(c); setTimeout(() => c.remove(), 3000);
    }, i * 15);
  }
}

document.querySelectorAll('.category-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active'); currentCategory = tab.dataset.cat; renderTemplates();
    playSound(500, 0.05);
  });
});

// ============================================
// PLANTILLAS SVG
// ============================================
const templates = {
  cat: { name: 'Gatito', cat: 'animales', svg: `<svg viewBox="0 0 900 600" xmlns="http://www.w3.org/2000/svg"><path d="M 620 420 Q 780 400 760 250 Q 750 200 710 200" fill="white" stroke="black" stroke-width="8" stroke-linecap="round"/><ellipse cx="450" cy="420" rx="170" ry="130" fill="white" stroke="black" stroke-width="8"/><ellipse cx="450" cy="440" rx="90" ry="80" fill="white" stroke="black" stroke-width="4"/><ellipse cx="370" cy="520" rx="35" ry="25" fill="white" stroke="black" stroke-width="6"/><ellipse cx="530" cy="520" rx="35" ry="25" fill="white" stroke="black" stroke-width="6"/><circle cx="450" cy="240" r="160" fill="white" stroke="black" stroke-width="8"/><polygon points="320,160 300,40 410,130" fill="white" stroke="black" stroke-width="8"/><polygon points="580,160 600,40 490,130" fill="white" stroke="black" stroke-width="8"/><polygon points="335,150 325,85 380,135" fill="#FFD93D" stroke="black" stroke-width="4"/><polygon points="565,150 575,85 520,135" fill="#FFD93D" stroke="black" stroke-width="4"/><ellipse cx="390" cy="230" rx="25" ry="35" fill="white" stroke="black" stroke-width="6"/><ellipse cx="510" cy="230" rx="25" ry="35" fill="white" stroke="black" stroke-width="6"/><ellipse cx="395" cy="240" rx="12" ry="20" fill="black"/><ellipse cx="515" cy="240" rx="12" ry="20" fill="black"/><circle cx="390" cy="225" r="5" fill="white"/><circle cx="510" cy="225" r="5" fill="white"/><circle cx="350" cy="290" r="15" fill="#FFC8DD" stroke="black" stroke-width="3"/><circle cx="550" cy="290" r="15" fill="#FFC8DD" stroke="black" stroke-width="3"/><path d="M 430 290 L 470 290 L 450 310 Z" fill="#FF9F1C" stroke="black" stroke-width="4"/><path d="M 450 310 L 450 325" stroke="black" stroke-width="4"/><path d="M 450 325 Q 430 340 415 325" fill="none" stroke="black" stroke-width="4"/><path d="M 450 325 Q 470 340 485 325" fill="none" stroke="black" stroke-width="4"/><line x1="340" y1="280" x2="230" y2="260" stroke="black" stroke-width="4" stroke-linecap="round"/><line x1="340" y1="300" x2="230" y2="310" stroke="black" stroke-width="4" stroke-linecap="round"/><line x1="560" y1="280" x2="670" y2="260" stroke="black" stroke-width="4" stroke-linecap="round"/><line x1="560" y1="300" x2="670" y2="310" stroke="black" stroke-width="4" stroke-linecap="round"/></svg>` },
  dog: { name: 'Perrito', cat: 'animales', svg: `<svg viewBox="0 0 900 600" xmlns="http://www.w3.org/2000/svg"><ellipse cx="450" cy="420" rx="170" ry="120" fill="white" stroke="black" stroke-width="8"/><ellipse cx="370" cy="510" rx="35" ry="25" fill="white" stroke="black" stroke-width="6"/><ellipse cx="530" cy="510" rx="35" ry="25" fill="white" stroke="black" stroke-width="6"/><path d="M 620 420 Q 720 450 700 540 L 670 540 Q 680 470 620 450" fill="white" stroke="black" stroke-width="6"/><circle cx="450" cy="250" r="160" fill="white" stroke="black" stroke-width="8"/><ellipse cx="320" cy="200" rx="50" ry="90" fill="white" stroke="black" stroke-width="8" transform="rotate(-20 320 200)"/><ellipse cx="580" cy="200" rx="50" ry="90" fill="white" stroke="black" stroke-width="8" transform="rotate(20 580 200)"/><ellipse cx="450" cy="310" rx="80" ry="60" fill="white" stroke="black" stroke-width="6"/><ellipse cx="450" cy="290" rx="40" ry="30" fill="white" stroke="black" stroke-width="4"/><circle cx="390" cy="220" r="20" fill="white" stroke="black" stroke-width="6"/><circle cx="510" cy="220" r="20" fill="white" stroke="black" stroke-width="6"/><circle cx="395" cy="225" r="10" fill="black"/><circle cx="515" cy="225" r="10" fill="black"/><ellipse cx="450" cy="290" rx="20" ry="15" fill="black"/><path d="M 450 310 L 450 330" stroke="black" stroke-width="4"/><path d="M 450 330 Q 430 345 415 335" fill="none" stroke="black" stroke-width="4"/><path d="M 450 330 Q 470 345 485 335" fill="none" stroke="black" stroke-width="4"/><path d="M 440 340 L 460 340 L 455 350 L 445 350 Z" fill="#FF6B6B" stroke="black" stroke-width="3"/><circle cx="360" cy="280" r="15" fill="#FFC8DD" stroke="black" stroke-width="3"/><circle cx="540" cy="280" r="15" fill="#FFC8DD" stroke="black" stroke-width="3"/></svg>` },
  fish: { name: 'Pez', cat: 'animales', svg: `<svg viewBox="0 0 900 600" xmlns="http://www.w3.org/2000/svg"><path d="M 390 170 Q 340 120 380 90 Q 430 110 420 170" fill="white" stroke="black" stroke-width="6"/><path d="M 390 430 Q 340 480 380 510 Q 430 490 420 430" fill="white" stroke="black" stroke-width="6"/><ellipse cx="450" cy="300" rx="240" ry="140" fill="white" stroke="black" stroke-width="8"/><polygon points="670,300 800,180 800,420" fill="white" stroke="black" stroke-width="8"/><path d="M 580 200 L 620 180 L 600 240 Z" fill="white" stroke="black" stroke-width="5"/><circle cx="300" cy="260" r="40" fill="white" stroke="black" stroke-width="6"/><circle cx="300" cy="260" r="20" fill="black"/><circle cx="295" cy="255" r="5" fill="white"/></svg>` },
  flower: { name: 'Flor', cat: 'naturaleza', svg: `<svg viewBox="0 0 900 600" xmlns="http://www.w3.org/2000/svg"><path d="M 450 280 L 450 540" stroke="black" stroke-width="8" fill="none"/><ellipse cx="450" cy="200" rx="90" ry="70" fill="white" stroke="black" stroke-width="8"/><ellipse cx="450" cy="200" rx="90" ry="70" fill="white" stroke="black" stroke-width="8" transform="rotate(60 450 200)"/><ellipse cx="450" cy="200" rx="90" ry="70" fill="white" stroke="black" stroke-width="8" transform="rotate(120 450 200)"/><ellipse cx="450" cy="200" rx="90" ry="70" fill="white" stroke="black" stroke-width="8" transform="rotate(180 450 200)"/><ellipse cx="450" cy="200" rx="90" ry="70" fill="white" stroke="black" stroke-width="8" transform="rotate(240 450 200)"/><ellipse cx="450" cy="200" rx="90" ry="70" fill="white" stroke="black" stroke-width="8" transform="rotate(300 450 200)"/><circle cx="450" cy="200" r="50" fill="white" stroke="black" stroke-width="6"/></svg>` },
  sun: { name: 'Sol', cat: 'naturaleza', svg: `<svg viewBox="0 0 900 600" xmlns="http://www.w3.org/2000/svg"><circle cx="450" cy="300" r="140" fill="white" stroke="black" stroke-width="8"/><g stroke="black" stroke-width="8" fill="white" stroke-linecap="round"><path d="M 450 60 L 450 130"/><path d="M 450 470 L 450 540"/><path d="M 210 300 L 280 300"/><path d="M 620 300 L 690 300"/><path d="M 280 130 L 330 180"/><path d="M 570 420 L 620 470"/><path d="M 620 130 L 570 180"/><path d="M 330 420 L 280 470"/></g><circle cx="395" cy="280" r="15" fill="black"/><circle cx="505" cy="280" r="15" fill="black"/><path d="M 390 360 Q 450 410 510 360" fill="none" stroke="black" stroke-width="6"/></svg>` },
  rocket: { name: 'Cohete', cat: 'vehiculos', svg: `<svg viewBox="0 0 900 600" xmlns="http://www.w3.org/2000/svg"><path d="M 450 60 Q 390 120 380 240 L 380 380 L 520 380 L 520 240 Q 510 120 450 60 Z" fill="white" stroke="black" stroke-width="8"/><circle cx="450" cy="200" r="40" fill="white" stroke="black" stroke-width="6"/><path d="M 380 320 L 310 380 L 310 440 L 380 410 Z" fill="white" stroke="black" stroke-width="8"/><path d="M 520 320 L 590 380 L 590 440 L 520 410 Z" fill="white" stroke="black" stroke-width="8"/><path d="M 410 430 L 390 520 L 430 460 Z" fill="#FF9F1C" stroke="black" stroke-width="5"/><path d="M 490 430 L 510 520 L 470 460 Z" fill="#FF9F1C" stroke="black" stroke-width="5"/></svg>` },
  car: { name: 'Coche', cat: 'vehiculos', svg: `<svg viewBox="0 0 900 600" xmlns="http://www.w3.org/2000/svg"><path d="M 120 380 L 160 280 L 280 240 L 520 240 L 640 280 L 680 380 L 680 440 L 120 440 Z" fill="white" stroke="black" stroke-width="8"/><circle cx="250" cy="440" r="55" fill="white" stroke="black" stroke-width="8"/><circle cx="550" cy="440" r="55" fill="white" stroke="black" stroke-width="8"/></svg>` },
  house: { name: 'Casa', cat: 'cosas', svg: `<svg viewBox="0 0 900 600" xmlns="http://www.w3.org/2000/svg"><rect x="250" y="280" width="400" height="240" fill="white" stroke="black" stroke-width="8"/><polygon points="230,280 450,100 670,280" fill="white" stroke="black" stroke-width="8"/><rect x="400" y="380" width="100" height="140" fill="white" stroke="black" stroke-width="6"/><rect x="290" y="320" width="80" height="80" fill="white" stroke="black" stroke-width="6"/><rect x="530" y="320" width="80" height="80" fill="white" stroke="black" stroke-width="6"/></svg>` },
  icecream: { name: 'Helado', cat: 'comida', svg: `<svg viewBox="0 0 900 600" xmlns="http://www.w3.org/2000/svg"><polygon points="300,300 500,300 400,520" fill="white" stroke="black" stroke-width="8" stroke-linejoin="round"/><path d="M 280 300 Q 250 220 320 180 Q 280 100 380 90 Q 420 50 480 100 Q 560 90 540 180 Q 600 220 560 300 Z" fill="white" stroke="black" stroke-width="8"/><circle cx="400" cy="80" r="20" fill="#FF6B6B" stroke="black" stroke-width="5"/></svg>` },
  donut: { name: 'Dona', cat: 'comida', svg: `<svg viewBox="0 0 900 600" xmlns="http://www.w3.org/2000/svg"><ellipse cx="450" cy="300" rx="250" ry="200" fill="white" stroke="black" stroke-width="8"/><ellipse cx="450" cy="300" rx="80" ry="60" fill="white" stroke="black" stroke-width="8"/></svg>` }
};

function renderTemplates() {
  const grid = document.getElementById('templatesGrid');
  grid.innerHTML = '';
  Object.entries(templates).forEach(([key, template]) => {
    if (template.cat !== currentCategory) return;
    const card = document.createElement('div');
    card.className = 'template-card';
    if (currentTemplate === key) card.classList.add('active');
    card.innerHTML = template.svg;
    card.addEventListener('click', () => {
      document.querySelectorAll('.template-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      loadTemplate(key);
      speak(template.name); playSound(700, 0.1);
    });
    grid.appendChild(card);
  });
}

function loadTemplate(key) {
  currentTemplate = key;
  const template = templates[key];
  const blob = new Blob([template.svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url); saveState();
  };
  img.src = url;
}

initCanvas();
updateActiveColorDisplay();
renderTemplates();

setTimeout(() => {
  const firstCard = document.querySelector('.template-card');
  if (firstCard) firstCard.click();
}, 300);