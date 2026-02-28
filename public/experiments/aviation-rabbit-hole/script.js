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

  // Tree node structure for branching history
  class HistoryNode {
    constructor(title, pageTitle, html, parent = null) {
      this.id = Date.now() + Math.random().toString(36).substr(2, 9);
      this.title = title;
      this.pageTitle = pageTitle;
      this.html = html;
      this.parent = parent;
      this.children = [];
      this.activeChildIndex = -1; // Which child branch was last visited
    }

    addChild(node) {
      node.parent = this;
      this.children.push(node);
      this.activeChildIndex = this.children.length - 1;
      return node;
    }

    getPath() {
      const path = [];
      let node = this;
      while (node) {
        path.unshift(node);
        node = node.parent;
      }
      return path;
    }

    hasMultipleChildren() {
      return this.children.length > 1;
    }
  }

  // State
  let rootNode = null;
  let currentNode = null;

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
    // New random = completely new tree
    rootNode = null;
    currentNode = null;
    await loadArticle(randomSeed);
  }

  async function loadArticle(title) {
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

      // Create new node
      const newNode = new HistoryNode(cleanTitle, pageTitle, html);

      if (!rootNode) {
        // First article - this is the root
        rootNode = newNode;
        currentNode = newNode;
      } else {
        // Add as child of current node
        currentNode.addChild(newNode);
        currentNode = newNode;
      }

      // Render
      renderArticle(currentNode);
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

  function renderArticle(node) {
    articleContent.innerHTML = `<h1>${node.title}</h1>${node.html}`;

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

      // Load new article as a child of current node
      // This creates a new branch if we're not at a leaf
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
    if (!currentNode) return;

    // Render the full exploration tree from its root
    let root = currentNode;
    while (root.parent) root = root.parent;

    timeline.appendChild(renderSubtree(root));

    // Correct vertical line endpoints for variable-height branches
    fixForkLines();

    // Scroll active dot into view
    setTimeout(() => {
      const activeDot = timeline.querySelector('.timeline-dot.active');
      if (activeDot) {
        activeDot.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }, 100);
  }

  /**
   * Recursively builds the tree DOM.
   *
   * - Leaf / single child: horizontal linear chain
   * - Multiple children: node + fork structure with vertical connecting lines
   *
   *   [Root] ── [X] ──┬── [W (current)]
   *                   ├── [Y]
   *                   └── [Z]
   */
  function renderSubtree(node) {
    if (node.children.length <= 1) {
      const row = document.createElement('div');
      row.className = 'tree-linear';
      row.appendChild(buildTimelineStep(node, node === currentNode));
      if (node.children.length === 1) {
        const conn = document.createElement('div');
        conn.className = 'timeline-connector';
        row.appendChild(conn);
        row.appendChild(renderSubtree(node.children[0]));
      }
      return row;
    }

    // Fork: node ── connector ── [children column with vertical line]
    const group = document.createElement('div');
    group.className = 'tree-fork-group';

    group.appendChild(buildTimelineStep(node, node === currentNode));

    const conn = document.createElement('div');
    conn.className = 'timeline-connector';
    group.appendChild(conn);

    const childrenCol = document.createElement('div');
    childrenCol.className = 'tree-fork-children';

    node.children.forEach(child => {
      const branch = document.createElement('div');
      branch.className = 'tree-fork-branch';
      branch.appendChild(renderSubtree(child));
      childrenCol.appendChild(branch);
    });

    group.appendChild(childrenCol);
    return group;
  }

  /**
   * After the tree is in the DOM, fix the bottom of each fork's vertical line.
   *
   * The CSS fallback (bottom: 10px) is only accurate when all sibling branches
   * have equal height. When the last branch is itself a nested fork — and
   * therefore taller than a single node — the line would overshoot into the
   * sub-fork area. This function measures the real offset and sets
   * --fork-line-bottom precisely so the line ends exactly at the last
   * branch's node centre (always 10px from the branch's own top).
   */
  function fixForkLines() {
    timeline.querySelectorAll('.tree-fork-children').forEach(col => {
      const branches = col.querySelectorAll(':scope > .tree-fork-branch');
      if (branches.length < 2) return;
      const lastBranch = branches[branches.length - 1];
      // lastBranch.offsetTop: distance from col's top to last branch's top.
      // Node centre inside the branch is always 10px from the branch's top.
      // bottom = how far the line's endpoint is from the col's bottom edge.
      const bottom = col.offsetHeight - lastBranch.offsetTop - 10;
      col.style.setProperty('--fork-line-bottom', Math.max(bottom, 0) + 'px');
    });
  }

  function buildTimelineStep(node, isActive) {
    const item = document.createElement('div');
    item.className = 'timeline-item';

    const dot = document.createElement('div');
    dot.className = `timeline-dot ${isActive ? 'active' : 'visited'}`;
    dot.addEventListener('click', () => navigateTo(node));
    item.appendChild(dot);

    const label = document.createElement('span');
    label.className = `timeline-label${isActive ? ' active' : ''}`;
    label.textContent = node.title;
    label.title = node.title;
    label.addEventListener('click', () => navigateTo(node));
    item.appendChild(label);

    return item;
  }

  function navigateTo(node) {
    if (!node || node === currentNode) return;

    currentNode = node;

    renderArticle(node);
    renderTimeline();
    updateButtons();
    scrollToTop();
  }

  function goBack() {
    if (currentNode && currentNode.parent) {
      navigateTo(currentNode.parent);
    }
  }

  function goForward() {
    if (currentNode && currentNode.children.length > 0) {
      // Go to the last active child, or the first child if none
      const childIndex = currentNode.activeChildIndex >= 0 ? currentNode.activeChildIndex : 0;
      navigateTo(currentNode.children[childIndex]);
    }
  }

  function updateButtons() {
    backBtn.disabled = !currentNode || !currentNode.parent;
    forwardBtn.disabled = !currentNode || currentNode.children.length === 0;
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
