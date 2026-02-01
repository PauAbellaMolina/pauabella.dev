const startScreen = document.getElementById('startScreen');
const gameScreen = document.getElementById('gameScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const scoreDisplay = document.getElementById('score');
const finalScore = document.getElementById('finalScore');
const gameOverReason = document.getElementById('gameOverReason');
const colorWord = document.getElementById('colorWord');
const timerBar = document.getElementById('timerBar');
const colorBtns = document.querySelectorAll('.color-btn');

const COLORS = ['red', 'yellow', 'blue', 'green'];
const COLOR_NAMES = { red: 'RED', yellow: 'YELLOW', blue: 'BLUE', green: 'GREEN' };
const ROUND_TIME = 1500;

let score = 0;
let currentColor = null;
let roundTimer = null;
let barAnimFrame = null;
let roundStart = null;
let canClick = false;

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(function (s) {
    s.classList.add('hidden');
  });
  document.getElementById(id).classList.remove('hidden');
}

function startGame() {
  score = 0;
  scoreDisplay.textContent = '0';
  showScreen('gameScreen');
  startRound();
}

function startRound() {
  canClick = true;
  currentColor = COLORS[Math.floor(Math.random() * COLORS.length)];

  // Trigger pop animation by resetting and re-adding
  colorWord.style.animation = 'none';
  void colorWord.offsetWidth;
  colorWord.style.animation = '';
  colorWord.textContent = COLOR_NAMES[currentColor];

  // Animate timer bar
  timerBar.classList.remove('urgent');
  timerBar.style.transition = 'none';
  timerBar.style.width = '100%';
  void timerBar.offsetWidth;

  roundStart = performance.now();
  animateBar();

  roundTimer = setTimeout(function () {
    if (canClick) {
      canClick = false;
      cancelAnimationFrame(barAnimFrame);
      timerBar.style.width = '0%';
      gameOver("Time's up!");
    }
  }, ROUND_TIME);
}

function animateBar() {
  var elapsed = performance.now() - roundStart;
  var remaining = Math.max(0, 1 - elapsed / ROUND_TIME);
  timerBar.style.width = (remaining * 100) + '%';

  if (remaining < 0.35) {
    timerBar.classList.add('urgent');
  }

  if (remaining > 0) {
    barAnimFrame = requestAnimationFrame(animateBar);
  }
}

function handleColorClick(e) {
  if (!canClick) return;
  canClick = false;
  clearTimeout(roundTimer);
  cancelAnimationFrame(barAnimFrame);

  var clicked = e.currentTarget.dataset.color;

  if (clicked === currentColor) {
    e.currentTarget.classList.add('wrong');
    setTimeout(function () {
      e.currentTarget.classList.remove('wrong');
    }, 400);
    gameOver('You tapped the matching color!');
  } else {
    score++;
    scoreDisplay.textContent = score;
    e.currentTarget.classList.add('correct');
    setTimeout(function () {
      e.currentTarget.classList.remove('correct');
      startRound();
    }, 350);
  }
}

function gameOver(reason) {
  gameOverReason.textContent = reason;
  finalScore.textContent = score;
  setTimeout(function () {
    showScreen('gameOverScreen');
  }, 450);
}

colorBtns.forEach(function (btn) {
  btn.addEventListener('click', handleColorClick);
});

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
