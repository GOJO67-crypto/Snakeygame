// ===== Game configuration =====
const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

const tileSize = 20;
const tilesX = canvas.width / tileSize;
const tilesY = canvas.height / tileSize;

let snake;
let direction;
let nextDirection;
let food;
let score = 0;
let bestScore = 0;
let gameInterval = null;
let gameSpeed = 120; // ms
let isRunning = false;
let isGameOver = false;

// DOM elements
const scoreEl = document.getElementById("score");
const bestScoreEl = document.getElementById("best-score");
const startPauseBtn = document.getElementById("start-pause-btn");
const restartBtn = document.getElementById("restart-btn");
const snakeColorInput = document.getElementById("snake-color");
const foodStyleSelect = document.getElementById("food-style");
const leaderboardList = document.getElementById("leaderboard-list");

// ===== Leaderboard handling (localStorage) =====
const LEADERBOARD_KEY = "snake_leaderboard_v1";
const BEST_SCORE_KEY = "snake_best_score_v1";
const LEADERBOARD_LIMIT = 5;

function loadLeaderboard() {
  const raw = localStorage.getItem(LEADERBOARD_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveLeaderboard(board) {
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(board));
}

function updateLeaderboardDisplay() {
  const board = loadLeaderboard();
  leaderboardList.innerHTML = "";

  board
    .sort((a, b) => b.score - a.score)
    .slice(0, LEADERBOARD_LIMIT)
    .forEach((entry) => {
      const li = document.createElement("li");
      const scoreSpan = document.createElement("span");
      scoreSpan.className = "score";
      scoreSpan.textContent = entry.score;

      const dateSpan = document.createElement("span");
      dateSpan.className = "date";
      dateSpan.textContent = entry.date;

      li.appendChild(scoreSpan);
      li.appendChild(dateSpan);
      leaderboardList.appendChild(li);
    });
}

function addScoreToLeaderboard(score) {
  if (score <= 0) return;
  const board = loadLeaderboard();
  const now = new Date();
  const entry = {
    score,
    date: now.toLocaleDateString() + " " + now.toLocaleTimeString(),
  };
  board.push(entry);
  saveLeaderboard(board);
  updateLeaderboardDisplay();
}

// Best score storage
function loadBestScore() {
  const raw = localStorage.getItem(BEST_SCORE_KEY);
  if (!raw) return 0;
  const val = parseInt(raw, 10);
  return isNaN(val) ? 0 : val;
}

function saveBestScore(val) {
  localStorage.setItem(BEST_SCORE_KEY, String(val));
}

// ===== Game reset & initialization =====
function initGame() {
  snake = [
    { x: Math.floor(tilesX / 2), y: Math.floor(tilesY / 2) },
    { x: Math.floor(tilesX / 2) - 1, y: Math.floor(tilesY / 2) },
  ];
  direction = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };
  score = 0;
  isGameOver = false;
  scoreEl.textContent = score;
  spawnFood();
  draw();
}

function resetGame() {
  stopGameLoop();
  isRunning = false;
  startPauseBtn.textContent = "Start";
  initGame();
}

// ===== Food logic =====
function randomPosition() {
  return {
    x: Math.floor(Math.random() * tilesX),
    y: Math.floor(Math.random() * tilesY),
  };
}

function spawnFood() {
  while (true) {
    const pos = randomPosition();
    const onSnake = snake.some((segment) => segment.x === pos.x && segment.y === pos.y);
    if (!onSnake) {
      food = pos;
      break;
    }
  }
}

// ===== Drawing helpers =====
function clearCanvas() {
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawSnake() {
  const snakeColor = snakeColorInput.value || "#00ff00";
  ctx.fillStyle = snakeColor;
  snake.forEach((segment, index) => {
    // slightly brighter head
    if (index === 0) {
      ctx.fillStyle = lightenColor(snakeColor, 40);
    } else {
      ctx.fillStyle = snakeColor;
    }
    ctx.fillRect(segment.x * tileSize, segment.y * tileSize, tileSize, tileSize);
  });
}

function lightenColor(hex, amount) {
  const col = hex.replace("#", "");
  const num = parseInt(col, 16);
  let r = (num >> 16) + amount;
  let g = ((num >> 8) & 0x00ff) + amount;
  let b = (num & 0x0000ff) + amount;

  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));

  return "#" + (b | (g << 8) | (r << 16)).toString(16).padStart(6, "0");
}

function drawFood() {
  const style = foodStyleSelect.value;

  let color = "#ff0000";
  let shape = "square";

  if (style === "red-square") {
    color = "#ff0000";
    shape = "square";
  } else if (style === "blue-circle") {
    color = "#00aaff";
    shape = "circle";
  } else if (style === "yellow-diamond") {
    color = "#ffdd33";
    shape = "diamond";
  } else if (style === "random") {
    color = randomColor();
    shape = "square";
  }

  const x = food.x * tileSize;
  const y = food.y * tileSize;
  const half = tileSize / 2;

  ctx.fillStyle = color;
  ctx.strokeStyle = color;

  if (shape === "square") {
    ctx.fillRect(x, y, tileSize, tileSize);
  } else if (shape === "circle") {
    ctx.beginPath();
    ctx.arc(x + half, y + half, tileSize / 2.2, 0, Math.PI * 2);
    ctx.fill();
  } else if (shape === "diamond") {
    ctx.beginPath();
    ctx.moveTo(x + half, y);
    ctx.lineTo(x + tileSize, y + half);
    ctx.lineTo(x + half, y + tileSize);
    ctx.lineTo(x, y + half);
    ctx.closePath();
    ctx.fill();
  }
}

function randomColor() {
  const r = Math.floor(Math.random() * 200) + 30;
  const g = Math.floor(Math.random() * 200) + 30;
  const b = Math.floor(Math.random() * 200) + 30;
  return `rgb(${r}, ${g}, ${b})`;
}

function drawGrid() {
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 1;
  for (let x = 0; x <= tilesX; x++) {
    ctx.beginPath();
    ctx.moveTo(x * tileSize, 0);
    ctx.lineTo(x * tileSize, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= tilesY; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * tileSize);
    ctx.lineTo(canvas.width, y * tileSize);
    ctx.stroke();
  }
}

function drawGameOver() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ffffff";
  ctx.font = "32px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("Game Over", canvas.width / 2, canvas.height / 2 - 10);

  ctx.font = "18px system-ui";
  ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 + 20);
  ctx.fillText("Press Restart or Space to play again", canvas.width / 2, canvas.height / 2 + 50);
}

// ===== Game update logic =====
function update() {
  if (isGameOver) return;

  direction = nextDirection;

  const head = { ...snake[0] };
  head.x += direction.x;
  head.y += direction.y;

  // Wall collision
  if (head.x < 0 || head.x >= tilesX || head.y < 0 || head.y >= tilesY) {
    handleGameOver();
    return;
  }

  // Self collision
  if (snake.some((segment) => segment.x === head.x && segment.y === head.y)) {
    handleGameOver();
    return;
  }

  // Move snake
  snake.unshift(head);

  // Eat food
  if (head.x === food.x && head.y === food.y) {
    score += 10;
    scoreEl.textContent = score;

    if (score > bestScore) {
      bestScore = score;
      bestScoreEl.textContent = bestScore;
      saveBestScore(bestScore);
    }

    spawnFood();
  } else {
    snake.pop();
  }

  draw();
}

function handleGameOver() {
  isGameOver = true;
  stopGameLoop();
  startPauseBtn.textContent = "Start";
  addScoreToLeaderboard(score);
  draw();
  drawGameOver();
}

// ===== Game loop control =====
function startGameLoop() {
  if (gameInterval) return;
  gameInterval = setInterval(update, gameSpeed);
}

function stopGameLoop() {
  if (gameInterval) {
    clearInterval(gameInterval);
    gameInterval = null;
  }
}

function toggleStartPause() {
  if (isGameOver) {
    resetGame();
    isRunning = true;
    startPauseBtn.textContent = "Pause";
    startGameLoop();
    return;
  }

  if (!isRunning) {
    isRunning = true;
    startPauseBtn.textContent = "Pause";
    startGameLoop();
  } else {
    isRunning = false;
    startPauseBtn.textContent = "Start";
    stopGameLoop();
  }
}

// ===== Drawing whole scene =====
function draw() {
  clearCanvas();
  drawGrid();
  drawFood();
  drawSnake();
}

// ===== Input handling =====
document.addEventListener("keydown", (e) => {
  switch (e.key) {
    case "ArrowUp":
    case "w":
    case "W":
      if (direction.y !== 1) nextDirection = { x: 0, y: -1 };
      break;
    case "ArrowDown":
    case "s":
    case "S":
      if (direction.y !== -1) nextDirection = { x: 0, y: 1 };
      break;
    case "ArrowLeft":
    case "a":
    case "A":
      if (direction.x !== 1) nextDirection = { x: -1, y: 0 };
      break;
    case "ArrowRight":
    case "d":
    case "D":
      if (direction.x !== -1) nextDirection = { x: 1, y: 0 };
      break;
    case " ":
      // Space = start/pause or restart if game over
      e.preventDefault();
      if (isGameOver) {
        resetGame();
        isRunning = true;
        startPauseBtn.textContent = "Pause";
        startGameLoop();
      } else {
        toggleStartPause();
      }
      break;
  }
});

// Buttons
startPauseBtn.addEventListener("click", () => {
  toggleStartPause();
});

restartBtn.addEventListener("click", () => {
  resetGame();
});

// ===== Initial setup on load =====
(function init() {
  bestScore = loadBestScore();
  bestScoreEl.textContent = bestScore;
  updateLeaderboardDisplay();
  initGame();
})();
