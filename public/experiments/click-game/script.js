const gameArea = document.getElementById('gameArea');
const target = document.getElementById('target');
const scoreDisplay = document.getElementById('score');
const timeDisplay = document.getElementById('time');
const startScreen = document.getElementById('startScreen');
const gameOver = document.getElementById('gameOver');
const finalScore = document.getElementById('finalScore');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');

let score = 0;
let timeLeft = 30;
let gameInterval;
let timerInterval;
let isPlaying = false;

function startGame() {
  score = 0;
  timeLeft = 30;
  isPlaying = true;

  scoreDisplay.textContent = score;
  timeDisplay.textContent = timeLeft;

  startScreen.classList.add('hidden');
  gameOver.style.display = 'none';
  target.style.display = 'block';

  moveTarget();

  timerInterval = setInterval(() => {
    timeLeft--;
    timeDisplay.textContent = timeLeft;

    if (timeLeft <= 0) {
      endGame();
    }
  }, 1000);
}

function endGame() {
  isPlaying = false;
  clearInterval(timerInterval);

  target.style.display = 'none';
  gameOver.style.display = 'block';
  finalScore.textContent = score;
}

function moveTarget() {
  if (!isPlaying) return;

  const areaRect = gameArea.getBoundingClientRect();
  const targetSize = 60;
  const padding = 20;

  const maxX = areaRect.width - targetSize - padding;
  const maxY = areaRect.height - targetSize - padding;

  const randomX = Math.floor(Math.random() * maxX) + padding;
  const randomY = Math.floor(Math.random() * maxY) + padding;

  target.style.left = randomX + 'px';
  target.style.top = randomY + 'px';
}

target.addEventListener('click', () => {
  if (!isPlaying) return;

  score++;
  scoreDisplay.textContent = score;

  target.classList.add('hit');

  setTimeout(() => {
    target.classList.remove('hit');
    moveTarget();
  }, 150);
});

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
