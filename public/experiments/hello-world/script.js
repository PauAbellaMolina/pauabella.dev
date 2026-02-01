const colors = [
  '#fff0db',
  '#EEE7FF',
  '#e0f0e3',
  '#ffe0e0',
  '#e0e8ff',
  '#fff5e0'
];

let currentIndex = 0;

document.getElementById('colorBtn').addEventListener('click', () => {
  currentIndex = (currentIndex + 1) % colors.length;
  document.body.style.backgroundColor = colors[currentIndex];
});
