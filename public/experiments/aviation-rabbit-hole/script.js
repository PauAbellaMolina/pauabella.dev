(function() {
  'use strict';

  // Aviation-related categories and seed articles
  const AVIATION_SEEDS = [
    'Boeing_747',
    'Airbus_A380',
    'Wright_brothers',
    'Concorde',
    'F-22_Raptor',
    'Lockheed_SR-71_Blackbird',
    'Aviation',
    'Helicopter',
    'Amelia_Earhart',
    'Charles_Lindbergh',
    'Boeing',
    'Airbus',
    'Jet_engine',
    'Aircraft_carrier',
    'Spitfire_(aircraft)',
    'Douglas_DC-3',
    'Air_traffic_control',
    'Black_box_(aviation)',
    'Autopilot',
    'Cessna_172',
    'Antonov_An-225_Mriya',
    'Space_Shuttle',
    'Apollo_11',
    'Chuck_Yeager',
    'Red_Bull_Air_Race',
    'Blue_Angels',
    'Aerobatics',
    'Glider_(aircraft)',
    'Hot_air_balloon',
    'Zeppelin',
    'P-51_Mustang',
    'B-52_Stratofortress',
    'Airship',
    'Turbofan',
    'Wing_(aircraft)',
    'Landing_gear',
    'Cockpit',
    'Flight_simulator',
    'Mach_number',
    'Sound_barrier'
  ];

  const WIKIPEDIA_API = 'https://en.wikipedia.org/api/rest_v1';
  const WIKIPEDIA_PARSE_API = 'https://en.wikipedia.org/w/api.php';

  // State
  let history = [];
  let currentIndex = -1;

  // DOM elements
  const startScreen = document.getElementById('start-screen');
  const app = document.getElementById('app');
  const startBtn = document.getElementById('start-btn');
  const timeline = document.getElementById('timeline');
  const timelineContainer = document.getElementById('timeline-container');
  const articleContent = document.getElementById('article-content');
  const loading = document.getElementById('loading');
  const backBtn = document.getElementById('back-btn');
  const forwardBtn = document.getElementById('forward-btn');
  const randomBtn = document.getElementById('random-btn');

  // Initialize
  function init() {
    startBtn.addEventListener('click', startJourney);
    backBtn.addEventListener('click', goBack);
    forwardBtn.addEventListener('click', goForward);
    randomBtn.addEventListener('click', loadRandomArticle);

    // Handle link clicks in article
    articleContent.addEventListener('click', handleArticleClick);
  }

  function startJourney() {
    startScreen.classList.add('hidden');
    app.classList.remove('hidden');
    loadRandomArticle();
  }

  async function loadRandomArticle() {
    const randomSeed = AVIATION_SEEDS[Math.floor(Math.random() * AVIATION_SEEDS.length)];
    await loadArticle(randomSeed, true);
  }

  async function loadArticle(title, isNewBranch = false) {
    showLoading(true);

    try {
      // Fetch article summary first for clean title
      const summaryUrl = `${WIKIPEDIA_API}/page/summary/${encodeURIComponent(title)}`;
      const summaryResponse = await fetch(summaryUrl);

      if (!summaryResponse.ok) {
        throw new Error('Article not found');
      }

      const summaryData = await summaryResponse.json();
      const cleanTitle = summaryData.title;
      const pageTitle = summaryData.titles?.canonical || title;

      // Fetch full article HTML
      const parseUrl = `${WIKIPEDIA_PARSE_API}?` + new URLSearchParams({
        action: 'parse',
        page: pageTitle,
        format: 'json',
        origin: '*',
        prop: 'text',
        disableeditsection: 'true',
        disabletoc: 'true'
      });

      const parseResponse = await fetch(parseUrl);
      const parseData = await parseResponse.json();

      if (parseData.error) {
        throw new Error(parseData.error.info);
      }

      const html = parseData.parse.text['*'];

      // Update history
      if (isNewBranch) {
        // Starting a new rabbit hole or clicking "New Random"
        // Truncate forward history if we're not at the end
        if (currentIndex < history.length - 1) {
          history = history.slice(0, currentIndex + 1);
        }
      }

      // Add to history if it's a new article (not navigating back/forward)
      const article = {
        title: cleanTitle,
        pageTitle: pageTitle,
        html: html
      };

      history.push(article);
      currentIndex = history.length - 1;

      // Render
      renderArticle(article);
      renderTimeline();
      updateButtons();
      scrollToTop();

    } catch (error) {
      console.error('Error loading article:', error);
      articleContent.innerHTML = `
        <h1>Oops!</h1>
        <p>Couldn't load that article. Try clicking another link or start fresh with a random article.</p>
      `;
    }

    showLoading(false);
  }

  function renderArticle(article) {
    articleContent.innerHTML = `<h1>${article.title}</h1>${article.html}`;

    // Process images to use HTTPS and handle lazy loading
    const images = articleContent.querySelectorAll('img');
    images.forEach(img => {
      const src = img.getAttribute('src');
      if (src && src.startsWith('//')) {
        img.setAttribute('src', 'https:' + src);
      }
      img.setAttribute('loading', 'lazy');
      img.removeAttribute('width');
      img.removeAttribute('height');
    });

    // Remove unwanted elements
    const unwanted = articleContent.querySelectorAll(
      '.mw-editsection, .reference, .noprint, .sistersitebox, ' +
      '.side-box, .navbox, .vertical-navbox, .metadata, .ambox, ' +
      '.tmbox, .mbox-small, .portal, #coordinates, .authority-control, ' +
      '.mw-empty-elt, .geo-nondefault, style, script'
    );
    unwanted.forEach(el => el.remove());
  }

  function handleArticleClick(event) {
    const link = event.target.closest('a');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href) return;

    event.preventDefault();

    // Check if it's a Wikipedia article link
    if (href.startsWith('/wiki/')) {
      const articleName = href.replace('/wiki/', '').split('#')[0];

      // Skip special pages, files, categories, etc.
      if (articleName.includes(':')) {
        return;
      }

      // Truncate forward history when diving into a new link
      if (currentIndex < history.length - 1) {
        history = history.slice(0, currentIndex + 1);
      }

      loadArticle(decodeURIComponent(articleName));
    } else if (href.startsWith('#')) {
      // Handle anchor links
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (href.startsWith('http')) {
      // External link - open in new tab
      window.open(href, '_blank', 'noopener');
    }
  }

  function renderTimeline() {
    timeline.innerHTML = '';

    history.forEach((article, index) => {
      const item = document.createElement('div');
      item.className = 'timeline-item';

      // Add connector before (except first item)
      if (index > 0) {
        const connector = document.createElement('div');
        connector.className = 'timeline-connector';
        item.appendChild(connector);
      }

      // Dot
      const dot = document.createElement('div');
      dot.className = 'timeline-dot';
      if (index === currentIndex) {
        dot.classList.add('active');
      } else if (index < currentIndex) {
        dot.classList.add('visited');
      }
      dot.addEventListener('click', () => navigateTo(index));
      item.appendChild(dot);

      // Label
      const label = document.createElement('span');
      label.className = 'timeline-label';
      if (index === currentIndex) {
        label.classList.add('active');
      }
      label.textContent = article.title;
      label.title = article.title;
      label.addEventListener('click', () => navigateTo(index));
      item.appendChild(label);

      timeline.appendChild(item);
    });

    // Scroll timeline to show current item
    setTimeout(() => {
      const activeItem = timeline.querySelector('.timeline-dot.active');
      if (activeItem) {
        activeItem.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }, 100);
  }

  function navigateTo(index) {
    if (index < 0 || index >= history.length || index === currentIndex) return;

    currentIndex = index;
    const article = history[currentIndex];

    renderArticle(article);
    renderTimeline();
    updateButtons();
    scrollToTop();
  }

  function goBack() {
    if (currentIndex > 0) {
      navigateTo(currentIndex - 1);
    }
  }

  function goForward() {
    if (currentIndex < history.length - 1) {
      navigateTo(currentIndex + 1);
    }
  }

  function updateButtons() {
    backBtn.disabled = currentIndex <= 0;
    forwardBtn.disabled = currentIndex >= history.length - 1;
  }

  function showLoading(show) {
    if (show) {
      loading.classList.remove('hidden');
      articleContent.style.opacity = '0.3';
    } else {
      loading.classList.add('hidden');
      articleContent.style.opacity = '1';
    }
  }

  function scrollToTop() {
    const container = document.getElementById('article-container');
    container.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Start
  init();
})();
