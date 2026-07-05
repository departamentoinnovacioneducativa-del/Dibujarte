// ============ CONFIGURACIÓN INICIAL ============
const canvas = document.getElementById('paintCanvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });

let isDrawing = false;
let lastX = 0, lastY = 0;
let currentTool = 'brush';
let currentColor = '#FF6B6B';
let brushSize = 12;
let undoStack = [];
let currentTemplate = null;
let currentCategory = 'animales';

// ============ COLORES ============
const colors = [
  '#FF6B6B', '#FF9F1C', '#FFD93D', '#FFE66D', '#95E06C', '#6BCB77',
  '#2EC4B6', '#5BC0EB', '#4D96FF', '#4361EE', '#9D4EDD', '#C77DFF',
  '#FF6BCB', '#FF006E', '#8B4513', '#D4A574', '#FFFFFF', '#C0C0C0',
  '#808080', '#000000'
];

const palette = document.getElementById('colorPalette');
colors.forEach((color, i) => {
  const btn = document.createElement('button');
  btn.className = 'color-btn' + (i === 0 ? ' active' : '');
  btn.style.background = color;
  btn.dataset.color = color;
  btn.setAttribute('aria-label', 'Color ' + color);
  btn.addEventListener('click', () => {
    document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentColor = color;
    updateActiveColorDisplay();
    document.getElementById('colorPicker').value = color;
  });
  palette.appendChild(btn);
});

document.getElementById('colorPicker').addEventListener('input', (e) => {
  currentColor = e.target.value;
  document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
  updateActiveColorDisplay();
});

function updateActiveColorDisplay() {
  document.getElementById('activeColorDisplay').style.background = currentColor;
  document.getElementById('sizePreview').style.background = currentColor;
}

// ============ INICIALIZACIÓN DEL CANVAS ============
function initCanvas() {
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  undoStack = [];
  saveState();
}

function saveState() {
  if (undoStack.length >= 25) undoStack.shift();
  try { undoStack.push(canvas.toDataURL()); } catch (e) {}
}

function undo() {
  if (undoStack.length > 1) {
    undoStack.pop();
    const prevState = undoStack[undoStack.length - 1];
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = prevState;
    showToast('¡Deshecho!', 'fa-rotate-left');
  }
}

// ============ DIBUJO ============
function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  let clientX, clientY;
  if (e.touches && e.touches.length > 0) {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  } else {
    clientX = e.clientX;
    clientY = e.clientY;
  }
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  };
}

function startDraw(e) {
  e.preventDefault();
  const pos = getPos(e);
  
  if (currentTool === 'bucket') {
    showToast('¡Rellenando!', 'fa-fill-drip');
    floodFill(Math.floor(pos.x), Math.floor(pos.y), currentColor);
    saveState();
    return;
  }
  
  isDrawing = true;
  lastX = pos.x;
  lastY = pos.y;
  
  if (currentTool === 'spray') {
    sprayPaint(pos.x, pos.y);
  } else {
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, brushSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = currentTool === 'eraser' ? '#FFFFFF' : currentColor;
    ctx.globalAlpha = currentTool === 'marker' ? 0.5 : 1;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function draw(e) {
  if (!isDrawing) return;
  e.preventDefault();
  const pos = getPos(e);
  
  if (currentTool === 'spray') {
    sprayPaint(pos.x, pos.y);
  } else {
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = currentTool === 'eraser' ? '#FFFFFF' : currentColor;
    ctx.lineWidth = brushSize;
    ctx.globalAlpha = currentTool === 'marker' ? 0.5 : 1;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  
  lastX = pos.x;
  lastY = pos.y;
}

function stopDraw() {
  if (isDrawing) {
    isDrawing = false;
    saveState();
  }
}

function sprayPaint(x, y) {
  const density = brushSize * 2;
  const radius = brushSize;
  ctx.fillStyle = currentColor;
  for (let i = 0; i < density; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * radius;
    const dx = Math.cos(angle) * r;
    const dy = Math.sin(angle) * r;
    ctx.beginPath();
    ctx.arc(x + dx, y + dy, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ============ FLOOD FILL (CUBO DE PINTURA) ============
function hexToRgba(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  return [
    parseInt(hex.substring(0, 2), 16),
    parseInt(hex.substring(2, 4), 16),
    parseInt(hex.substring(4, 6), 16),
    255
  ];
}

function floodFill(startX, startY, fillColorHex) {
  if (startX < 0 || startX >= canvas.width || startY < 0 || startY >= canvas.height) return;
  
  const fillColor = hexToRgba(fillColorHex);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const width = canvas.width;
  const height = canvas.height;
  
  const startPos = (startY * width + startX) * 4;
  const startR = data[startPos];
  const startG = data[startPos + 1];
  const startB = data[startPos + 2];
  
  if (startR === fillColor[0] && startG === fillColor[1] && startB === fillColor[2]) return;
  
  const tolerance = 40; // Tolerancia para las líneas anti-aliasing de los SVG
  const stack = [[startX, startY]];
  const visited = new Uint8Array(width * height);
  
  while (stack.length > 0) {
    const [x, y] = stack.pop();
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    
    const idx = y * width + x;
    if (visited[idx]) continue;
    
    const pos = idx * 4;
    const r = data[pos];
    const g = data[pos + 1];
    const b = data[pos + 2];
    
    if (Math.abs(r - startR) > tolerance || 
        Math.abs(g - startG) > tolerance || 
        Math.abs(b - startB) > tolerance) continue;
    
    visited[idx] = 1;
    data[pos] = fillColor[0];
    data[pos + 1] = fillColor[1];
    data[pos + 2] = fillColor[2];
    data[pos + 3] = 255;
    
    stack.push([x + 1, y]);
    stack.push([x - 1, y]);
    stack.push([x, y + 1]);
    stack.push([x, y - 1]);
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
document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tool-btn[data-tool]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentTool = btn.dataset.tool;
    
    if (currentTool === 'bucket') canvas.style.cursor = 'cell';
    else if (currentTool === 'eraser') canvas.style.cursor = 'grab';
    else canvas.style.cursor = 'crosshair';
  });
});

// ============ TAMAÑO ============
const sizeSlider = document.getElementById('sizeSlider');
const sizePreview = document.getElementById('sizePreview');
sizeSlider.addEventListener('input', (e) => {
  brushSize = parseInt(e.target.value);
  const previewSize = Math.min(brushSize, 36);
  sizePreview.style.width = previewSize + 'px';
  sizePreview.style.height = previewSize + 'px';
});

// ============ BOTONES ============
document.getElementById('undoBtn').addEventListener('click', undo);

document.getElementById('newCanvasBtn').addEventListener('click', () => {
  initCanvas();
  currentTemplate = null;
  document.querySelectorAll('.template-card').forEach(c => c.classList.remove('active'));
  showToast('¡Lienzo en blanco!', 'fa-file');
});

document.getElementById('downloadBtn').addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = 'mi-dibujo-pinturitas.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
  showToast('¡Dibujo guardado!', 'fa-download');
  launchConfetti();
});

// ============ TOAST ============
function showToast(msg, icon = 'fa-circle-check') {
  const toast = document.getElementById('toast');
  toast.innerHTML = `<i class="fa-solid ${icon}"></i> ${msg}`;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 2200);
}

// ============ CONFETI ============
function launchConfetti() {
  const colors = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#FF6BCB', '#FF9F1C', '#9D4EDD'];
  for (let i = 0; i < 80; i++) {
    setTimeout(() => {
      const c = document.createElement('div');
      c.className = 'confetti';
      c.style.left = Math.random() * 100 + 'vw';
      c.style.top = '-20px';
      c.style.background = colors[Math.floor(Math.random() * colors.length)];
      c.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
      c.style.width = (8 + Math.random() * 10) + 'px';
      c.style.height = c.style.width;
      c.style.animationDuration = (1.5 + Math.random() * 1.5) + 's';
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 3000);
    }, i * 15);
  }
}

// ============ BIENVENIDA ============
document.getElementById('startBtn').addEventListener('click', () => {
  document.getElementById('welcomeModal').style.display = 'none';
});

// ============ CATEGORÍAS ============
document.querySelectorAll('.category-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentCategory = tab.dataset.cat;
    renderTemplates();
  });
});

// ============================================
// PLANTILLAS SVG - DIBUJOS DETALLADOS
// ============================================
const templates = {
  // ============ ANIMALES ============
  cat: {
    name: 'Gatito', cat: 'animales',
    svg: `<svg viewBox="0 0 900 600" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="450" cy="440" rx="190" ry="120" fill="white" stroke="black" stroke-width="8"/>
      <circle cx="450" cy="260" r="155" fill="white" stroke="black" stroke-width="8"/>
      <polygon points="315,170 305,40 410,150" fill="white" stroke="black" stroke-width="8"/>
      <polygon points="585,170 595,40 490,150" fill="white" stroke="black" stroke-width="8"/>
      <polygon points="330,155 325,80 380,150" fill="#FFC8DD" stroke="black" stroke-width="4"/>
      <polygon points="570,155 575,80 520,150" fill="#FFC8DD" stroke="black" stroke-width="4"/>
      <ellipse cx="385" cy="245" rx="28" ry="35" fill="white" stroke="black" stroke-width="5"/>
      <ellipse cx="515" cy="245" rx="28" ry="35" fill="white" stroke="black" stroke-width="5"/>
      <ellipse cx="390" cy="250" rx="14" ry="20" fill="black"/>
      <ellipse cx="520" cy="250" rx="14" ry="20" fill="black"/>
      <circle cx="395" cy="240" r="5" fill="white"/>
      <circle cx="525" cy="240" r="5" fill="white"/>
      <path d="M 430 295 L 470 295 L 450 315 Z" fill="#FF9F1C" stroke="black" stroke-width="4"/>
      <path d="M 450 315 L 450 330" stroke="black" stroke-width="3" fill="none"/>
      <path d="M 450 330 Q 430 345 415 330" fill="none" stroke="black" stroke-width="4"/>
      <path d="M 450 330 Q 470 345 485 330" fill="none" stroke="black" stroke-width="4"/>
      <line x1="350" y1="290" x2="240" y2="270" stroke="black" stroke-width="3"/>
      <line x1="350" y1="310" x2="240" y2="320" stroke="black" stroke-width="3"/>
      <line x1="550" y1="290" x2="660" y2="270" stroke="black" stroke-width="3"/>
      <line x1="550" y1="310" x2="660" y2="320" stroke="black" stroke-width="3"/>
      <path d="M 640 420 Q 770 400 760 280 Q 755 240 730 240" fill="none" stroke="black" stroke-width="8"/>
      <ellipse cx="390" cy="520" rx="35" ry="20" fill="white" stroke="black" stroke-width="6"/>
      <ellipse cx="510" cy="520" rx="35" ry="20" fill="white" stroke="black" stroke-width="6"/>
    </svg>`
  },
  dog: {
    name: 'Perrito', cat: 'animales',
    svg: `<svg viewBox="0 0 900 600" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="450" cy="430" rx="200" ry="115" fill="white" stroke="black" stroke-width="8"/>
      <ellipse cx="370" cy="380" rx="80" ry="100" fill="white" stroke="black" stroke-width="6" transform="rotate(-30 370 380)"/>
      <ellipse cx="530" cy="380" rx="80" ry="100" fill="white" stroke="black" stroke-width="6" transform="rotate(30 530 380)"/>
      <circle cx="450" cy="270" r="150" fill="white" stroke="black" stroke-width="8"/>
      <ellipse cx="450" cy="320" rx="80" ry="60" fill="white" stroke="black" stroke-width="6"/>
      <ellipse cx="450" cy="300" rx="40" ry="30" fill="white" stroke="black" stroke-width="4"/>
      <circle cx="385" cy="250" r="22" fill="white" stroke="black" stroke-width="5"/>
      <circle cx="515" cy="250" r="22" fill="white" stroke="black" stroke-width="5"/>
      <circle cx="390" cy="255" r="12" fill="black"/>
      <circle cx="520" cy="255" r="12" fill="black"/>
      <ellipse cx="450" cy="295" rx="20" ry="15" fill="black"/>
      <path d="M 450 315 L 450 335" stroke="black" stroke-width="4" fill="none"/>
      <path d="M 450 335 Q 430 350 415 340" fill="none" stroke="black" stroke-width="4"/>
      <path d="M 450 335 Q 470 350 485 340" fill="none" stroke="black" stroke-width="4"/>
      <ellipse cx="395" cy="510" rx="40" ry="25" fill="white" stroke="black" stroke-width="6"/>
      <ellipse cx="505" cy="510" rx="40" ry="25" fill="white" stroke="black" stroke-width="6"/>
      <path d="M 640 420 Q 720 450 700 540 L 670 540 Q 680 470 620 450" fill="white" stroke="black" stroke-width="6"/>
    </svg>`
  },
  fish: {
    name: 'Pez', cat: 'animales',
    svg: `<svg viewBox="0 0 900 600" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="430" cy="300" rx="240" ry="140" fill="white" stroke="black" stroke-width="8"/>
      <polygon points="670,300 800,180 800,420" fill="white" stroke="black" stroke-width="8"/>
      <path d="M 350 175 Q 320 110 380 90 Q 420 130 390 175" fill="white" stroke="black" stroke-width="8"/>
      <path d="M 350 425 Q 320 490 380 510 Q 420 470 390 425" fill="white" stroke="black" stroke-width="8"/>
      <circle cx="290" cy="270" r="35" fill="white" stroke="black" stroke-width="6"/>
      <circle cx="285" cy="270" r="18" fill="black"/>
      <path d="M 380 220 Q 440 260 380 300" fill="none" stroke="black" stroke-width="5"/>
      <path d="M 490 220 Q 550 260 490 300" fill="none" stroke="black" stroke-width="5"/>
      <circle cx="540" cy="260" r="10" fill="black"/>
      <circle cx="590" cy="300" r="10" fill="black"/>
      <circle cx="540" cy="340" r="10" fill="black"/>
    </svg>`
  },
  butterfly: {
    name: 'Mariposa', cat: 'animales',
    svg: `<svg viewBox="0 0 900 600" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="450" cy="300" rx="20" ry="130" fill="white" stroke="black" stroke-width="6"/>
      <path d="M 430 215 Q 230 110 130 250 Q 80 380 240 390 Q 380 370 430 290 Z" fill="white" stroke="black" stroke-width="8"/>
      <path d="M 470 215 Q 670 110 770 250 Q 820 380 660 390 Q 520 370 470 290 Z" fill="white" stroke="black" stroke-width="8"/>
      <path d="M 430 335 Q 290 380 250 480 Q 310 530 400 490 Q 430 440 430 380 Z" fill="white" stroke="black" stroke-width="8"/>
      <path d="M 470 335 Q 610 380 650 480 Q 590 530 500 490 Q 470 440 470 380 Z" fill="white" stroke="black" stroke-width="8"/>
      <circle cx="240" cy="265" r="35" fill="white" stroke="black" stroke-width="5"/>
      <circle cx="660" cy="265" r="35" fill="white" stroke="black" stroke-width="5"/>
      <circle cx="320" cy="450" r="25" fill="white" stroke="black" stroke-width="5"/>
      <circle cx="580" cy="450" r="25" fill="white" stroke="black" stroke-width="5"/>
    </svg>`
  },
  owl: {
    name: 'Búho', cat: 'animales',
    svg: `<svg viewBox="0 0 900 600" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="450" cy="340" rx="200" ry="220" fill="white" stroke="black" stroke-width="8"/>
      <polygon points="310,180 340,50 400,170" fill="white" stroke="black" stroke-width="8"/>
      <polygon points="590,180 560,50 500,170" fill="white" stroke="black" stroke-width="8"/>
      <circle cx="370" cy="260" r="60" fill="white" stroke="black" stroke-width="6"/>
      <circle cx="530" cy="260" r="60" fill="white" stroke="black" stroke-width="6"/>
      <circle cx="370" cy="260" r="18" fill="black"/>
      <circle cx="530" cy="260" r="18" fill="black"/>
      <polygon points="440,310 460,310 450,340" fill="#FF9F1C" stroke="black" stroke-width="4"/>
      <ellipse cx="450" cy="470" rx="70" ry="45" fill="white" stroke="black" stroke-width="5"/>
      <path d="M 320 530 L 300 570 M 340 535 L 330 575" stroke="black" stroke-width="5" fill="none"/>
      <path d="M 580 530 L 600 570 M 560 535 L 570 575" stroke="black" stroke-width="5" fill="none"/>
    </svg>`
  },
  bird: {
    name: 'Pájaro', cat: 'animales',
    svg: `<svg viewBox="0 0 900 600" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="450" cy="350" rx="180" ry="140" fill="white" stroke="black" stroke-width="8"/>
      <circle cx="320" cy="250" r="90" fill="white" stroke="black" stroke-width="8"/>
      <polygon points="240,250 170,230 240,270" fill="#FF9F1C" stroke="black" stroke-width="6"/>
      <circle cx="305" cy="230" r="12" fill="black"/>
      <path d="M 600 300 Q 700 280 750 340 Q 720 380 650 370" fill="white" stroke="black" stroke-width="7"/>
      <path d="M 380 480 L 380 540 L 410 540 L 410 480" fill="white" stroke="black" stroke-width="6"/>
      <path d="M 480 480 L 480 540 L 510 540 L 510 480" fill="white" stroke="black" stroke-width="6"/>
    </svg>`
  },

  // ============ NATURALEZA ============
  flower: {
    name: 'Flor', cat: 'naturaleza',
    svg: `<svg viewBox="0 0 900 600" xmlns="http://www.w3.org/2000/svg">
      <path d="M 450 280 L 450 540" stroke="black" stroke-width="8" fill="none"/>
      <path d="M 450 400 Q 350 380 290 320" fill="white" stroke="black" stroke-width="6"/>
      <path d="M 450 450 Q 550 430 610 370" fill="white" stroke="black" stroke-width="6"/>
      <ellipse cx="450" cy="200" rx="90" ry="70" fill="white" stroke="black" stroke-width="8"/>
      <ellipse cx="450" cy="200" rx="90" ry="70" fill="white" stroke="black" stroke-width="8" transform="rotate(60 450 200)"/>
      <ellipse cx="450" cy="200" rx="90" ry="70" fill="white" stroke="black" stroke-width="8" transform="rotate(120 450 200)"/>
      <ellipse cx="450" cy="200" rx="90" ry="70" fill="white" stroke="black" stroke-width="8" transform="rotate(180 450 200)"/>
      <ellipse cx="450" cy="200" rx="90" ry="70" fill="white" stroke="black" stroke-width="8" transform="rotate(240 450 200)"/>
      <ellipse cx="450" cy="200" rx="90" ry="70" fill="white" stroke="black" stroke-width="8" transform="rotate(300 450 200)"/>
      <circle cx="450" cy="200" r="50" fill="white" stroke="black" stroke-width="6"/>
    </svg>`
  },
  sun: {
    name: 'Sol', cat: 'naturaleza',
    svg: `<svg viewBox="0 0 900 600" xmlns="http://www.w3.org/2000/svg">
      <circle cx="450" cy="300" r="140" fill="white" stroke="black" stroke-width="8"/>
      <g stroke="black" stroke-width="8" fill="white" stroke-linecap="round">
        <path d="M 450 60 L 450 130"/><path d="M 450 470 L 450 540"/>
        <path d="M 210 300 L 280 300"/><path d="M 620 300 L 690 300"/>
        <path d="M 280 130 L 330 180"/><path d="M 570 420 L 620 470"/>
        <path d="M 620 130 L 570 180"/><path d="M 330 420 L 280 470"/>
        <path d="M 360 75 L 390 135"/><path d="M 540 75 L 510 135"/>
        <path d="M 800 230 L 740 250"/><path d="M 800 370 L 740 350"/>
        <path d="M 100 230 L 160 250"/><path d="M 100 370 L 160 350"/>
      </g>
      <circle cx="395" cy="280" r="15" fill="black"/>
      <circle cx="505" cy="280" r="15" fill="black"/>
      <path d="M 390 360 Q 450 410 510 360" fill="none" stroke="black" stroke-width="6"/>
    </svg>`
  },
  rainbow: {
    name: 'Arcoíris', cat: 'naturaleza',
    svg: `<svg viewBox="0 0 900 600" xmlns="http://www.w3.org/2000/svg">
      <path d="M 80 500 Q 80 150 450 150 Q 820 150 820 500" fill="none" stroke="black" stroke-width="8"/>
      <path d="M 130 500 Q 130 200 450 200 Q 770 200 770 500" fill="none" stroke="black" stroke-width="8"/>
      <path d="M 180 500 Q 180 250 450 250 Q 720 250 720 500" fill="none" stroke="black" stroke-width="8"/>
      <path d="M 230 500 Q 230 300 450 300 Q 670 300 670 500" fill="none" stroke="black" stroke-width="8"/>
      <path d="M 280 500 Q 280 350 450 350 Q 620 350 620 500" fill="none" stroke="black" stroke-width="8"/>
      <path d="M 330 500 Q 330 400 450 400 Q 570 400 570 500" fill="none" stroke="black" stroke-width="8"/>
      <path d="M 230 500 Q 260 450 310 500 Z" fill="white" stroke="black" stroke-width="6"/>
      <path d="M 320 500 Q 350 450 400 500 Z" fill="white" stroke="black" stroke-width="6"/>
      <path d="M 410 500 Q 440 450 490 500 Z" fill="white" stroke="black" stroke-width="6"/>
      <path d="M 500 500 Q 530 450 580 500 Z" fill="white" stroke="black" stroke-width="6"/>
      <path d="M 590 500 Q 620 450 670 500 Z" fill="white" stroke="black" stroke-width="6"/>
      <circle cx="150" cy="120" r="50" fill="white" stroke="black" stroke-width="6"/>
    </svg>`
  },
  tree: {
    name: 'Árbol', cat: 'naturaleza',
    svg: `<svg viewBox="0 0 900 600" xmlns="http://www.w3.org/2000/svg">
      <rect x="410" y="350" width="80" height="200" fill="white" stroke="black" stroke-width="8" rx="10"/>
      <circle cx="450" cy="220" r="160" fill="white" stroke="black" stroke-width="8"/>
      <circle cx="320" cy="260" r="100" fill="white" stroke="black" stroke-width="8"/>
      <circle cx="580" cy="260" r="100" fill="white" stroke="black" stroke-width="8"/>
      <circle cx="380" cy="150" r="80" fill="white" stroke="black" stroke-width="8"/>
      <circle cx="520" cy="150" r="80" fill="white" stroke="black" stroke-width="8"/>
      <circle cx="380" cy="200" r="15" fill="#FF6B6B" stroke="black" stroke-width="4"/>
      <circle cx="520" cy="180" r="15" fill="#FF6B6B" stroke="black" stroke-width="4"/>
      <circle cx="450" cy="280" r="15" fill="#FF6B6B" stroke="black" stroke-width="4"/>
    </svg>`
  },
  apple: {
    name: 'Manzana', cat: 'naturaleza',
    svg: `<svg viewBox="0 0 900 600" xmlns="http://www.w3.org/2000/svg">
      <path d="M 450 150 Q 350 140 320 180 Q 250 200 250 300 Q 250 420 350 470 Q 400 490 400 460 Q 400 490 450 470 Q 550 420 550 300 Q 550 200 480 180 Q 450 140 400 150 Z" fill="white" stroke="black" stroke-width="8"/>
      <path d="M 450 150 Q 405 100 440 80" fill="none" stroke="black" stroke-width="6"/>
      <ellipse cx="470" cy="90" rx="40" ry="20" fill="white" stroke="black" stroke-width="6" transform="rotate(-20 470 90)"/>
    </svg>`
  },

  // ============ VEHÍCULOS ============
  rocket: {
    name: 'Cohete', cat: 'vehiculos',
    svg: `<svg viewBox="0 0 900 600" xmlns="http://www.w3.org/2000/svg">
      <path d="M 450 60 Q 390 120 380 240 L 380 380 L 520 380 L 520 240 Q 510 120 450 60 Z" fill="white" stroke="black" stroke-width="8"/>
      <circle cx="450" cy="200" r="40" fill="white" stroke="black" stroke-width="6"/>
      <circle cx="450" cy="200" r="20" fill="#A0E7E5" stroke="black" stroke-width="4"/>
      <path d="M 380 320 L 310 380 L 310 440 L 380 410 Z" fill="white" stroke="black" stroke-width="8"/>
      <path d="M 520 320 L 590 380 L 590 440 L 520 410 Z" fill="white" stroke="black" stroke-width="8"/>
      <rect x="400" y="380" width="100" height="50" fill="white" stroke="black" stroke-width="6"/>
      <path d="M 410 430 L 390 500 L 430 460 Z" fill="#FF9F1C" stroke="black" stroke-width="5"/>
      <path d="M 450 430 L 450 520 L 470 470 Z" fill="#FFD93D" stroke="black" stroke-width="5"/>
      <path d="M 490 430 L 510 500 L 470 460 Z" fill="#FF9F1C" stroke="black" stroke-width="5"/>
    </svg>`
  },
  car: {
    name: 'Coche', cat: 'vehiculos',
    svg: `<svg viewBox="0 0 900 600" xmlns="http://www.w3.org/2000/svg">
      <path d="M 120 380 L 160 280 L 280 240 L 520 240 L 640 280 L 680 380 L 680 440 L 120 440 Z" fill="white" stroke="black" stroke-width="8"/>
      <path d="M 280 240 L 320 290 L 480 290 L 520 240" fill="none" stroke="black" stroke-width="6"/>
      <line x1="400" y1="240" x2="400" y2="290" stroke="black" stroke-width="5"/>
      <circle cx="250" cy="440" r="55" fill="white" stroke="black" stroke-width="8"/>
      <circle cx="250" cy="440" r="25" fill="white" stroke="black" stroke-width="5"/>
      <circle cx="550" cy="440" r="55" fill="white" stroke="black" stroke-width="8"/>
      <circle cx="550" cy="440" r="25" fill="white" stroke="black" stroke-width="5"/>
      <rect x="170" y="320" width="60" height="40" fill="white" stroke="black" stroke-width="5" rx="5"/>
      <rect x="570" y="320" width="60" height="40" fill="white" stroke="black" stroke-width="5" rx="5"/>
      <ellipse cx="660" cy="320" rx="15" ry="8" fill="#FFD93D" stroke="black" stroke-width="4"/>
      <ellipse cx="140" cy="320" rx="15" ry="8" fill="#FF6B6B" stroke="black" stroke-width="4"/>
    </svg>`
  },
  boat: {
    name: 'Barco', cat: 'vehiculos',
    svg: `<svg viewBox="0 0 900 600" xmlns="http://www.w3.org/2000/svg">
      <path d="M 200 380 L 600 380 L 550 460 L 250 460 Z" fill="white" stroke="black" stroke-width="8"/>
      <line x1="400" y1="380" x2="400" y2="100" stroke="black" stroke-width="6"/>
      <path d="M 400 100 L 400 320 L 580 320 Z" fill="white" stroke="black" stroke-width="6"/>
      <path d="M 400 120 L 400 280 L 240 280 Z" fill="white" stroke="black" stroke-width="6"/>
      <circle cx="400" cy="80" r="15" fill="white" stroke="black" stroke-width="4"/>
      <path d="M 380 75 L 420 75 M 400 60 L 400 95" stroke="black" stroke-width="3"/>
      <path d="M 100 480 Q 150 470 200 480 Q 250 490 300 480 Q 350 470 400 480 Q 450 490 500 480 Q 550 470 600 480 Q 650 490 700 480" fill="none" stroke="black" stroke-width="4"/>
    </svg>`
  },
  airplane: {
    name: 'Avión', cat: 'vehiculos',
    svg: `<svg viewBox="0 0 900 600" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="450" cy="300" rx="250" ry="60" fill="white" stroke="black" stroke-width="8"/>
      <polygon points="700,300 820,260 820,340" fill="white" stroke="black" stroke-width="8"/>
      <path d="M 350 270 L 200 150 L 250 150 L 400 270 Z" fill="white" stroke="black" stroke-width="8"/>
      <path d="M 350 330 L 200 450 L 250 450 L 400 330 Z" fill="white" stroke="black" stroke-width="8"/>
      <polygon points="200,300 120,260 120,340" fill="white" stroke="black" stroke-width="8"/>
      <circle cx="780" cy="300" r="12" fill="white" stroke="black" stroke-width="4"/>
      <circle cx="740" cy="300" r="8" fill="white" stroke="black" stroke-width="3"/>
    </svg>`
  },

  // ============ COSAS ============
  house: {
    name: 'Casa', cat: 'cosas',
    svg: `<svg viewBox="0 0 900 600" xmlns="http://www.w3.org/2000/svg">
      <rect x="250" y="280" width="400" height="240" fill="white" stroke="black" stroke-width="8"/>
      <polygon points="230,280 450,100 670,280" fill="white" stroke="black" stroke-width="8"/>
      <rect x="400" y="380" width="100" height="140" fill="white" stroke="black" stroke-width="6"/>
      <circle cx="475" cy="450" r="6" fill="black"/>
      <rect x="290" y="320" width="80" height="80" fill="white" stroke="black" stroke-width="6"/>
      <line x1="330" y1="320" x2="330" y2="400" stroke="black" stroke-width="4"/>
      <line x1="290" y1="360" x2="370" y2="360" stroke="black" stroke-width="4"/>
      <rect x="530" y="320" width="80" height="80" fill="white" stroke="black" stroke-width="6"/>
      <line x1="570" y1="320" x2="570" y2="400" stroke="black" stroke-width="4"/>
      <line x1="530" y1="360" x2="610" y2="360" stroke="black" stroke-width="4"/>
      <rect x="540" y="160" width="50" height="80" fill="white" stroke="black" stroke-width="6"/>
    </svg>`
  },
  robot: {
    name: 'Robot', cat: 'cosas',
    svg: `<svg viewBox="0 0 900 600" xmlns="http://www.w3.org/2000/svg">
      <rect x="300" y="80" width="200" height="40" fill="white" stroke="black" stroke-width="6" rx="10"/>
      <circle cx="400" cy="60" r="20" fill="white" stroke="black" stroke-width="6"/>
      <rect x="250" y="120" width="300" height="200" fill="white" stroke="black" stroke-width="8" rx="15"/>
      <rect x="290" y="160" width="60" height="60" fill="white" stroke="black" stroke-width="5" rx="8"/>
      <rect x="450" y="160" width="60" height="60" fill="white" stroke="black" stroke-width="5" rx="8"/>
      <rect x="320" y="250" width="160" height="30" fill="white" stroke="black" stroke-width="5" rx="5"/>
      <rect x="180" y="180" width="60" height="120" fill="white" stroke="black" stroke-width="6" rx="10"/>
      <rect x="560" y="180" width="60" height="120" fill="white" stroke="black" stroke-width="6" rx="10"/>
      <rect x="290" y="340" width="80" height="160" fill="white" stroke="black" stroke-width="6" rx="10"/>
      <rect x="430" y="340" width="80" height="160" fill="white" stroke="black" stroke-width="6" rx="10"/>
      <ellipse cx="330" cy="520" rx="50" ry="20" fill="white" stroke="black" stroke-width="6"/>
      <ellipse cx="470" cy="520" rx="50" ry="20" fill="white" stroke="black" stroke-width="6"/>
    </svg>`
  },
  castle: {
    name: 'Castillo', cat: 'cosas',
    svg: `<svg viewBox="0 0 900 600" xmlns="http://www.w3.org/2000/svg">
      <rect x="200" y="250" width="500" height="250" fill="white" stroke="black" stroke-width="8"/>
      <rect x="170" y="150" width="100" height="350" fill="white" stroke="black" stroke-width="8"/>
      <rect x="630" y="150" width="100" height="350" fill="white" stroke="black" stroke-width="8"/>
      <rect x="400" y="100" width="100" height="400" fill="white" stroke="black" stroke-width="8"/>
      <polygon points="170,150 220,80 270,150" fill="white" stroke="black" stroke-width="6"/>
      <polygon points="630,150 680,80 730,150" fill="white" stroke="black" stroke-width="6"/>
      <polygon points="400,100 450,30 500,100" fill="white" stroke="black" stroke-width="6"/>
      <rect x="420" y="380" width="60" height="120" fill="white" stroke="black" stroke-width="6"/>
      <rect x="220" y="300" width="50" height="60" fill="white" stroke="black" stroke-width="5"/>
      <rect x="630" y="300" width="50" height="60" fill="white" stroke="black" stroke-width="5"/>
      <path d="M 320 500 Q 340 530 360 500 Q 380 530 400 500 Q 420 530 440 500 Q 460 530 480 500 Q 500 530 520 500 Q 540 530 560 500" fill="none" stroke="black" stroke-width="5"/>
    </svg>`
  },
  crown: {
    name: 'Corona', cat: 'cosas',
    svg: `<svg viewBox="0 0 900 600" xmlns="http://www.w3.org/2000/svg">
      <path d="M 150 400 L 200 200 L 300 350 L 450 150 L 600 350 L 700 200 L 750 400 Z" fill="white" stroke="black" stroke-width="8"/>
      <rect x="150" y="400" width="600" height="80" fill="white" stroke="black" stroke-width="8"/>
      <circle cx="200" cy="200" r="20" fill="white" stroke="black" stroke-width="5"/>
      <circle cx="450" cy="150" r="25" fill="white" stroke="black" stroke-width="5"/>
      <circle cx="700" cy="200" r="20" fill="white" stroke="black" stroke-width="5"/>
      <circle cx="300" cy="440" r="15" fill="#FF6B6B" stroke="black" stroke-width="4"/>
      <circle cx="450" cy="440" r="15" fill="#4D96FF" stroke="black" stroke-width="4"/>
      <circle cx="600" cy="440" r="15" fill="#6BCB77" stroke="black" stroke-width="4"/>
    </svg>`
  },

  // ============ COMIDA ============
  icecream: {
    name: 'Helado', cat: 'comida',
    svg: `<svg viewBox="0 0 900 600" xmlns="http://www.w3.org/2000/svg">
      <polygon points="300,300 500,300 400,520" fill="white" stroke="black" stroke-width="8"/>
      <line x1="320" y1="340" x2="480" y2="340" stroke="black" stroke-width="4"/>
      <line x1="340" y1="380" x2="460" y2="380" stroke="black" stroke-width="4"/>
      <line x1="360" y1="420" x2="440" y2="420" stroke="black" stroke-width="4"/>
      <path d="M 280 300 Q 250 220 320 180 Q 280 100 380 90 Q 420 50 480 100 Q 560 90 540 180 Q 600 220 560 300 Z" fill="white" stroke="black" stroke-width="8"/>
      <circle cx="340" cy="200" r="15" fill="black"/>
      <circle cx="460" cy="200" r="15" fill="black"/>
      <circle cx="400" cy="80" r="15" fill="#FF6B6B" stroke="black" stroke-width="5"/>
    </svg>`
  },
  donut: {
    name: 'Dona', cat: 'comida',
    svg: `<svg viewBox="0 0 900 600" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="450" cy="300" rx="250" ry="200" fill="white" stroke="black" stroke-width="8"/>
      <ellipse cx="450" cy="300" rx="80" ry="60" fill="white" stroke="black" stroke-width="8"/>
      <rect x="250" y="150" width="30" height="60" fill="#FF6B6B" stroke="black" stroke-width="4" transform="rotate(30 265 180)"/>
      <rect x="350" y="120" width="30" height="60" fill="#4D96FF" stroke="black" stroke-width="4"/>
      <rect x="500" y="130" width="30" height="60" fill="#6BCB77" stroke="black" stroke-width="4" transform="rotate(15 515 160)"/>
      <rect x="600" y="200" width="30" height="60" fill="#FFD93D" stroke="black" stroke-width="4" transform="rotate(45 615 230)"/>
      <rect x="280" y="400" width="30" height="60" fill="#9D4EDD" stroke="black" stroke-width="4" transform="rotate(-30 295 430)"/>
      <rect x="550" y="420" width="30" height="60" fill="#FF9F1C" stroke="black" stroke-width="4" transform="rotate(20 565 450)"/>
    </svg>`
  },
  cupcake: {
    name: 'Magdalena', cat: 'comida',
    svg: `<svg viewBox="0 0 900 600" xmlns="http://www.w3.org/2000/svg">
      <path d="M 250 350 L 300 500 L 600 500 L 650 350 Z" fill="white" stroke="black" stroke-width="8"/>
      <line x1="350" y1="350" x2="370" y2="500" stroke="black" stroke-width="4"/>
      <line x1="450" y1="350" x2="450" y2="500" stroke="black" stroke-width="4"/>
      <line x1="550" y1="350" x2="530" y2="500" stroke="black" stroke-width="4"/>
      <path d="M 200 350 Q 200 200 350 200 Q 400 150 500 200 Q 700 200 700 350 Z" fill="white" stroke="black" stroke-width="8"/>
      <circle cx="450" cy="120" r="30" fill="#FF6B6B" stroke="black" stroke-width="5"/>
      <circle cx="350" cy="220" r="10" fill="black"/>
      <circle cx="550" cy="220" r="10" fill="black"/>
      <path d="M 380 260 Q 450 300 520 260" fill="none" stroke="black" stroke-width="4"/>
    </svg>`
  },
  pizza: {
    name: 'Pizza', cat: 'comida',
    svg: `<svg viewBox="0 0 900 600" xmlns="http://www.w3.org/2000/svg">
      <path d="M 450 80 L 120 520 L 780 520 Z" fill="white" stroke="black" stroke-width="8"/>
      <path d="M 450 150 L 200 510 L 700 510 Z" fill="none" stroke="black" stroke-width="4" stroke-dasharray="10,10"/>
      <circle cx="350" cy="350" r="25" fill="white" stroke="black" stroke-width="5"/>
      <circle cx="550" cy="300" r="25" fill="white" stroke="black" stroke-width="5"/>
      <circle cx="450" cy="450" r="25" fill="white" stroke="black" stroke-width="5"/>
      <circle cx="300" cy="450" r="15" fill="black"/>
      <circle cx="600" cy="420" r="15" fill="black"/>
      <circle cx="400" cy="250" r="15" fill="black"/>
    </svg>`
  }
};

// ============ RENDERIZAR PLANTILLAS ============
function renderTemplates() {
  const grid = document.getElementById('templatesGrid');
  grid.innerHTML = '';
  
  Object.entries(templates).forEach(([key, template]) => {
    if (template.cat !== currentCategory) return;
    
    const card = document.createElement('div');
    card.className = 'template-card';
    card.dataset.template = key;
    if (currentTemplate === key) card.classList.add('active');
    
    card.innerHTML = template.svg + `<div class="tpl-label">${template.name}</div>`;
    
    card.addEventListener('click', () => {
      document.querySelectorAll('.template-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      loadTemplate(key);
    });
    
    grid.appendChild(card);
  });
}

function loadTemplate(key) {
  currentTemplate = key;
  const template = templates[key];
  const svgString = template.svg;
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const img = new Image();
  img.onload = () => {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    saveState();
    showToast(`¡${template.name} cargado!`, 'fa-image');
  };
  img.src = url;
}

// ============ INICIALIZACIÓN ============
initCanvas();
updateActiveColorDisplay();
renderTemplates();

// Cargar primer dibujo automáticamente
setTimeout(() => {
  const firstCard = document.querySelector('.template-card');
  if (firstCard) firstCard.click();
}, 500);

// Mensaje de bienvenida
setTimeout(() => {
  showToast('¡Bienvenido a Pinturitas! 🎨', 'fa-hand-sparkles');
}, 1000);