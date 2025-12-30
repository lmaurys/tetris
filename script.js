(() => {
  "use strict";

  const canvas = document.getElementById("board");
  const ctx = canvas.getContext("2d");

  const scoreEl = document.getElementById("score");
  const linesEl = document.getElementById("lines");
  const levelEl = document.getElementById("level");
  const statusEl = document.getElementById("status");

  const COLS = 10;
  const ROWS = 20;
  const BLOCK = 30; // 300x600

  // Sistema de sonido usando Web Audio API
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  
  function playSound(frequency, duration, type = 'sine', volume = 0.15) {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gainNode.gain.value = volume;
    
    oscillator.start(audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    oscillator.stop(audioContext.currentTime + duration);
  }

  function playSoundMove() {
    playSound(300, 0.05, 'square', 0.08);
  }

  function playSoundRotate() {
    playSound(400, 0.06, 'sine', 0.1);
  }

  function playSoundDrop() {
    playSound(200, 0.08, 'triangle', 0.12);
  }

  function playSoundLineClear(count) {
    const frequencies = [523, 659, 784, 1047];
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        playSound(frequencies[i % frequencies.length], 0.15, 'sine', 0.15);
      }, i * 50);
    }
  }

  function playSoundGameOver() {
    setTimeout(() => playSound(440, 0.2, 'sawtooth', 0.15), 0);
    setTimeout(() => playSound(349, 0.2, 'sawtooth', 0.15), 100);
    setTimeout(() => playSound(262, 0.4, 'sawtooth', 0.15), 200);
  }

  function playSoundLevelUp() {
    setTimeout(() => playSound(523, 0.1, 'sine', 0.12), 0);
    setTimeout(() => playSound(659, 0.1, 'sine', 0.12), 100);
    setTimeout(() => playSound(784, 0.15, 'sine', 0.12), 200);
  }

  const COLORS = {
    I: "#22c55e",
    O: "#f59e0b",
    T: "#a855f7",
    S: "#06b6d4",
    Z: "#ef4444",
    J: "#3b82f6",
    L: "#f97316",
  };

  const SHAPES = {
    I: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    O: [
      [1, 1],
      [1, 1],
    ],
    T: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    S: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],
    Z: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ],
    J: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    L: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
    ],
  };

  function cloneMatrix(m) {
    return m.map((row) => row.slice());
  }

  function rotateMatrixCW(m) {
    const rows = m.length;
    const cols = m[0].length;
    const out = Array.from({ length: cols }, () => Array(rows).fill(0));
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        out[x][rows - 1 - y] = m[y][x];
      }
    }
    return out;
  }

  function createBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  }

  function drawCell(x, y, color) {
    // Gradiente para dar profundidad
    const gradient = ctx.createLinearGradient(
      x * BLOCK, 
      y * BLOCK, 
      x * BLOCK + BLOCK, 
      y * BLOCK + BLOCK
    );
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, shadeColor(color, -20));
    
    ctx.fillStyle = gradient;
    ctx.fillRect(x * BLOCK, y * BLOCK, BLOCK, BLOCK);

    // Brillo superior
    ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
    ctx.fillRect(x * BLOCK + 2, y * BLOCK + 2, BLOCK - 4, BLOCK / 3);

    // Sombra inferior
    ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
    ctx.fillRect(x * BLOCK + 2, y * BLOCK + BLOCK - BLOCK / 3 - 2, BLOCK - 4, BLOCK / 3);

    // Borde
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x * BLOCK + 1, y * BLOCK + 1, BLOCK - 2, BLOCK - 2);
  }

  function shadeColor(color, percent) {
    const num = parseInt(color.slice(1), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255))
      .toString(16).slice(1);
  }

  function drawBoard(board) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // grid background lines (more visible)
    ctx.strokeStyle = "rgba(96, 165, 250, 0.1)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * BLOCK + 0.5, 0);
      ctx.lineTo(x * BLOCK + 0.5, ROWS * BLOCK);
      ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * BLOCK + 0.5);
      ctx.lineTo(COLS * BLOCK, y * BLOCK + 0.5);
      ctx.stroke();
    }

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const cell = board[y][x];
        if (cell) drawCell(x, y, cell);
      }
    }
  }

  function drawPiece(piece) {
    const { matrix, x, y, color } = piece;
    for (let py = 0; py < matrix.length; py++) {
      for (let px = 0; px < matrix[py].length; px++) {
        if (!matrix[py][px]) continue;
        const bx = x + px;
        const by = y + py;
        if (by < 0) continue; // allow spawn above
        drawCell(bx, by, color);
      }
    }
  }

  function collides(board, piece, offsetX = 0, offsetY = 0, testMatrix = null) {
    const matrix = testMatrix ?? piece.matrix;
    const nx = piece.x + offsetX;
    const ny = piece.y + offsetY;

    for (let py = 0; py < matrix.length; py++) {
      for (let px = 0; px < matrix[py].length; px++) {
        if (!matrix[py][px]) continue;
        const x = nx + px;
        const y = ny + py;

        if (x < 0 || x >= COLS) return true;
        if (y >= ROWS) return true;
        if (y >= 0 && board[y][x]) return true;
      }
    }

    return false;
  }

  function merge(board, piece) {
    const { matrix, x, y, color } = piece;
    for (let py = 0; py < matrix.length; py++) {
      for (let px = 0; px < matrix[py].length; px++) {
        if (!matrix[py][px]) continue;
        const bx = x + px;
        const by = y + py;
        if (by < 0) continue;
        board[by][bx] = color;
      }
    }
  }

  function clearLines(board) {
    let cleared = 0;

    for (let y = ROWS - 1; y >= 0; y--) {
      const full = board[y].every((c) => c);
      if (!full) continue;

      board.splice(y, 1);
      board.unshift(Array(COLS).fill(null));
      cleared++;
      y++; // re-check same y index after shifting
    }

    return cleared;
  }

  function randomPiece() {
    const keys = Object.keys(SHAPES);
    const type = keys[Math.floor(Math.random() * keys.length)];
    const matrix = cloneMatrix(SHAPES[type]);

    // spawn centered; allow negative y so tall pieces appear smoothly
    const spawnX = Math.floor((COLS - matrix[0].length) / 2);

    return {
      type,
      matrix,
      color: COLORS[type],
      x: spawnX,
      y: -2,
    };
  }

  function computeDropMs(level) {
    // simple: faster each 10 lines
    const base = 650;
    const step = 55;
    return Math.max(100, base - (level - 1) * step);
  }

  let board;
  let current;
  let next;
  let score;
  let lines;
  let level;
  let paused;
  let gameOver;

  let lastTime = 0;
  let dropAccumulator = 0;

  function updateUI() {
    scoreEl.textContent = String(score);
    linesEl.textContent = String(lines);
    levelEl.textContent = String(level);

    if (gameOver) {
      statusEl.textContent = "Game Over — presiona R para reiniciar";
      return;
    }

    statusEl.textContent = paused ? "Pausado" : "";
  }

  function startNewGame() {
    board = createBoard();
    current = randomPiece();
    next = randomPiece();
    score = 0;
    lines = 0;
    level = 1;
    paused = false;
    gameOver = false;
    dropAccumulator = 0;
    lastTime = 0;
    updateUI();
  }

  function lockAndSpawn() {
    merge(board, current);
    playSoundDrop();

    const cleared = clearLines(board);
    if (cleared > 0) {
      playSoundLineClear(cleared);
      // Puntaje simple por líneas; con bonus por múltiple
      // 1:100, 2:300, 3:500, 4:800 (estilo clásico)
      const table = { 1: 100, 2: 300, 3: 500, 4: 800 };
      score += (table[cleared] ?? cleared * 100) * level;
      lines += cleared;

      const newLevel = Math.floor(lines / 10) + 1;
      if (newLevel > level) {
        playSoundLevelUp();
        level = newLevel;
      }
    }

    current = next;
    next = randomPiece();

    // game over check
    if (collides(board, current, 0, 0)) {
      gameOver = true;
      playSoundGameOver();
    }

    updateUI();
  }

  function softDrop() {
    if (!collides(board, current, 0, 1)) {
      current.y += 1;
      return true;
    }

    lockAndSpawn();
    return false;
  }

  function hardDrop() {
    while (!collides(board, current, 0, 1)) {
      current.y += 1;
      score += 1; // pequeño bonus por caída rápida
    }
    lockAndSpawn();
    updateUI();
  }

  function move(dx) {
    if (!collides(board, current, dx, 0)) {
      current.x += dx;
      playSoundMove();
    }
  }

  function rotate() {
    const rotated = rotateMatrixCW(current.matrix);

    // Wall-kick simple: probar offsets laterales
    const kicks = [0, -1, 1, -2, 2];
    for (const k of kicks) {
      if (!collides(board, current, k, 0, rotated)) {
        current.matrix = rotated;
        current.x += k;
        playSoundRotate();
        return;
      }
    }
  }

  function togglePause() {
    if (gameOver) return;
    paused = !paused;
    updateUI();
  }

  function onKeyDown(e) {
    if (e.code === "KeyR") {
      startNewGame();
      return;
    }

    if (e.code === "KeyP") {
      togglePause();
      return;
    }

    if (paused || gameOver) return;

    switch (e.code) {
      case "ArrowLeft":
        e.preventDefault();
        move(-1);
        break;
      case "ArrowRight":
        e.preventDefault();
        move(1);
        break;
      case "ArrowDown":
        e.preventDefault();
        // soft drop manual: +1 punto por celda
        if (!collides(board, current, 0, 1)) {
          current.y += 1;
          score += 1;
          updateUI();
        } else {
          lockAndSpawn();
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        rotate();
        break;
      case "Space":
        e.preventDefault();
        hardDrop();
        break;
    }
  }

  function frame(time) {
    if (!lastTime) lastTime = time;
    const delta = time - lastTime;
    lastTime = time;

    if (!paused && !gameOver) {
      dropAccumulator += delta;
      const dropMs = computeDropMs(level);

      while (dropAccumulator >= dropMs) {
        dropAccumulator -= dropMs;
        softDrop();
        if (gameOver) break;
      }
    }

    drawBoard(board);
    drawPiece(current);

    requestAnimationFrame(frame);
  }

  document.addEventListener("keydown", onKeyDown);

  startNewGame();
  requestAnimationFrame(frame);
})();
