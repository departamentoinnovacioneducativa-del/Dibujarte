// ============ SUBIR IMAGEN PROPIA ============
const uploadBtn = document.getElementById('uploadBtn');
const imageLoader = document.getElementById('imageLoader');

uploadBtn.addEventListener('click', () => {
  imageLoader.click();
});

imageLoader.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // Validar que sea una imagen
  if (!file.type.match('image.*')) {
    showToast('Por favor, sube un archivo de imagen (PNG o JPG).', 'fa-triangle-exclamation');
    return;
  }

  const reader = new FileReader();
  
  reader.onload = function(event) {
    const img = new Image();
    img.onload = function() {
      // Limpiar canvas con fondo blanco
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Calcular dimensiones para ajustar la imagen al canvas (sin distorsionar)
      let w = img.width;
      let h = img.height;
      const maxW = canvas.width;
      const maxH = canvas.height;
      const scale = Math.min(maxW / w, maxH / h);
      
      w = Math.floor(w * scale);
      h = Math.floor(h * scale);
      const x = Math.floor((maxW - w) / 2);
      const y = Math.floor((maxH - h) / 2);

      // Dibujar imagen centrada
      ctx.drawImage(img, x, y, w, h);
      saveState();
      
      // Deseleccionar tarjetas de la galería
      currentTemplate = null;
      document.querySelectorAll('.template-card').forEach(c => c.classList.remove('active'));
      showToast('¡Imagen cargada! Ya puedes pintarla.', 'fa-image');
      
      // Resetear el input para poder subir la misma imagen otra vez si se borró
      imageLoader.value = '';
    };
    
    // Manejo de errores si la imagen está corrupta
    img.onerror = function() {
      showToast('Error al cargar la imagen.', 'fa-triangle-exclamation');
      imageLoader.value = '';
    };
    
    img.src = event.target.result;
  };
  
  reader.readAsDataURL(file);
});