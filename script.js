// ============ CONFIGURACIÓN INICIAL ============
const canvas = document.getElementById('paintCanvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });

let isDrawing = false;
let lastX = 0, lastY = 0;
let currentTool = 'brush';
let currentColor = '#FF0000';
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
    utterance.rate = 1.2; utterance.pitch = 1.5;
    window.speechSynthesis.speak(utterance);
  }
}

// ============ COLORES Y PEGATINAS ============
const colors = [
  '#FF0000', '#FF8000', '#FFFF00', '#00FF00',
  '#00FFFF', '#0000FF', '#8000FF', '#FF00FF',
  '#8B4513', '#FFFFFF', '#A0A0A0', '#000000'
];

const stickers = ['⭐', '❤️', '😊', '🌸', '🎈', '👑'];

const colorGrid = document.getElementById('colorGrid');
const stickerGrid = document.getElementById('stickerGrid');

// Renderizar Colores (12 en 3 filas de 4)
colors.forEach((color, i) => {
  const btn = document.createElement('div');
  btn.className = 'color-btn' + (i === 0 ? ' active' : '');
  btn.style.background = color;
  btn.dataset.color = color;
  btn.addEventListener('click', () => {
    document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentColor = color;
    document.getElementById('sizePreview').style.background = color;
    if (currentTool === 'sticker') {
      document.querySelector('[data-tool="brush"]').click();
    }
    playSound(600, 0.05);
  });
  colorGrid.appendChild(btn);
});

// Renderizar Pegatinas (6 en 2 filas de 3)
stickers.forEach((st, i) => {
  const btn = document.createElement('div');
  btn.className = 'sticker-btn' + (i === 0 ? ' active' : '');
  btn.textContent = st;
  btn.dataset.sticker = st;
  btn.addEventListener('click', () => {
    document.querySelectorAll('.sticker-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentSticker = st;
    document.querySelector('[data-tool="sticker"]').click();
    playSound(1200, 0.05);
  });
  stickerGrid.appendChild(btn);
});

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

// ============ HERRAMIENTAS ============
document.querySelectorAll('.tool-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentTool = btn.dataset.tool;
    
    const name = btn.dataset.name;
    speak(name);
    playSound(800, 0.1);
    showToast(name, 'fa-hand-pointer');
    
    if (currentTool === 'sticker') canvas.style.cursor = 'copy';
    else if (currentTool === 'eraser') canvas.style.cursor = 'grab';
    else if (currentTool === 'bucket') canvas.style.cursor = 'cell';
    else canvas.style.cursor = 'crosshair';
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
      ctx.drawImage(img, Math.floor((