// ───────────────────────────────────────────────────────
// Aviation Rabbit Hole — script.js
// ───────────────────────────────────────────────────────

const AVIATION_SEEDS = [
  'Concorde',
  'SR-71 Blackbird',
  'Wright brothers',
  'Charles Lindbergh',
  'Amelia Earhart',
  'F-22 Raptor',
  'Bell X-1',
  'Hindenburg disaster',
  'Air France Flight 447',
  'Tenerife airport disaster',
  'Chuck Yeager',
  'Boeing 747',
  'Airbus A380',
  'Battle of Britain',
  'Manfred von Richthofen',
  'Doolittle Raid',
  'Douglas DC-3',
  'Supermarine Spitfire',
  'North American P-51 Mustang',
  'Boeing B-29 Superfortress',
  'Voyager (aircraft)',
  'Solar Impulse',
  'Blue Angels',
  'Thunderbirds (United States Air Force)',
  'Barnes Wallis',
  'Barnes Wallis',
  'Dambusters raid',
  'Lockheed U-2',
  'Area 51',
  'Apollo 11',
  'Space Shuttle Challenger disaster',
  'Bermuda Triangle',
  'Howard Hughes',
  'Charles de Gaulle',
  'Kitty Hawk, North Carolina',
  'Anthony Fokker',
  'Glenn Curtiss',
  'Sikorsky R-4',
  'De Havilland Mosquito',
  'Avro Lancaster',
];

// ───────────────────────────────────────────────────────
// State
// ───────────────────────────────────────────────────────

let nodes = {};          // id -> node
let currentNodeId = null;
let nodeCounter = 0;
let fetchController = null; // AbortController for in-flight fetches

// ───────────────────────────────────────────────────────
// Tree data helpers
// ───────────────────────────────────────────────────────

function createNode(title, wikiSlug, parentId) {
  const id = ++nodeCounter;
  nodes[id] = {
    id,
    title,
    wikiSlug,
    parentId,
    children: [],   // array of child node ids (in order of visit)
    content: null,  // cached rendered HTML string
    wikiUrl: null,  // full Wikipedia URL
  };
  if (parentId !== null) {
    nodes[parentId].children.push(id);
  }
  return nodes[id];
}

/**
 * Returns a Set of node ids that are ancestors of (or equal to) the given node.
 * Used to determine which nodes are on the "active path".
 */
function getAncestorSet(nodeId) {
  const set = new Set();
  let cur = nodeId;
  while (cur !== null) {
    set.add(cur);
    cur = nodes[cur].parentId;
  }
  return set;
}

/** Depth of a node (root = 0). */
function getDepth(nodeId) {
  let depth = 0;
  let cur = nodes[nodeId].parentId;
  while (cur !== null) {
    depth++;
    cur = nodes[cur].parentId;
  }
  return depth;
}

/** Return root-to-current path as array of ids. */
function getCurrentPath() {
  const path = [];
  let cur = currentNodeId;
  while (cur !== null) {
    path.unshift(cur);
    cur = nodes[cur].parentId;
  }
  return path;
}

/** Find all root nodes. */
function getRoots() {
  return Object.values(nodes).filter(n => n.parentId === null);
}

// ───────────────────────────────────────────────────────
// Wikipedia API
// ───────────────────────────────────────────────────────

async function fetchWikipedia(wikiSlug, signal) {
  const encodedSlug = encodeURIComponent(wikiSlug.replace(/ /g, '_'));
  const apiUrl =
    `https://en.wikipedia.org/w/api.php` +
    `?action=parse` +
    `&page=${encodedSlug}` +
    `&prop=text|displaytitle` +
    `&format=json` +
    `&origin=*`;

  const response = await fetch(apiUrl, { signal });
  if (!response.ok) throw new Error(`Network error: ${response.status}`);

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.info || 'Wikipedia API error');
  }

  const rawTitle = data.parse.displaytitle.replace(/<[^>]+>/g, '');
  const rawHtml = data.parse.text['*'];

  return {
    title: rawTitle,
    slug: data.parse.title,
    html: processWikiHtml(rawHtml),
    wikiUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(data.parse.title.replace(/ /g, '_'))}`,
  };
}

function processWikiHtml(html) {
  // Fix protocol-relative URLs so resources load
  html = html.replace(/src="\/\//g, 'src="https://');
  html = html.replace(/srcset="\/\//g, 'srcset="https://');
  html = html.replace(/href="\/\//g, 'href="https://');
  return html;
}

// ───────────────────────────────────────────────────────
// Navigation
// ───────────────────────────────────────────────────────

/**
 * Navigate to a new Wikipedia article, creating a child node under the current one.
 */
async function navigateTo(wikiSlug, title) {
  // Abort any in-flight fetch
  if (fetchController) fetchController.abort();
  fetchController = new AbortController();

  // Create a new child node immediately
  const node = createNode(title, wikiSlug, currentNodeId);
  currentNodeId = node.id;

  showLoading();
  renderTree();
  updateDepthBadge();

  try {
    const result = await fetchWikipedia(wikiSlug, fetchController.signal);
    node.title = result.title;
    node.wikiSlug = result.slug;
    node.content = result.html;
    node.wikiUrl = result.wikiUrl;

    displayArticle(node);
    renderTree(); // refresh with corrected title
  } catch (err) {
    if (err.name === 'AbortError') return; // navigation cancelled — don't update UI
    showError(err.message);
    // Remove the failed node from the tree
    if (node.parentId !== null) {
      const parent = nodes[node.parentId];
      parent.children = parent.children.filter(id => id !== node.id);
    }
    delete nodes[node.id];
    currentNodeId = node.parentId;
    nodeCounter--;
    renderTree();
    updateDepthBadge();
  }
}

/**
 * Navigate to an already-visited node (from tree click).
 * Content is cached — instant.
 */
function goToNode(nodeId) {
  if (nodeId === currentNodeId) return;

  // Abort any in-flight fetch
  if (fetchController) fetchController.abort();
  fetchController = null;

  currentNodeId = nodeId;
  const node = nodes[nodeId];

  renderTree();
  updateDepthBadge();

  if (node.content) {
    displayArticle(node);
  } else {
    // Shouldn't normally happen (node was created but fetch failed), but handle gracefully
    navigateTo(node.wikiSlug, node.title);
  }
}

/**
 * Go back one step in the current path (to parent node).
 */
function goBack() {
  if (currentNodeId === null) return;
  const parent = nodes[currentNodeId].parentId;
  if (parent !== null) {
    goToNode(parent);
  }
}

// ───────────────────────────────────────────────────────
// UI — article display
// ───────────────────────────────────────────────────────

function displayArticle(node) {
  hideLoading();
  hideError();

  const wrapper = document.getElementById('article-wrapper');
  const titleEl = document.getElementById('article-title');
  const contentEl = document.getElementById('article-content');
  const wikiLink = document.getElementById('article-wiki-link');

  titleEl.textContent = node.title;
  contentEl.innerHTML = node.content;

  if (node.wikiUrl) {
    wikiLink.href = node.wikiUrl;
  }

  // Intercept link clicks via event delegation (efficient for many links)
  contentEl.onclick = (e) => {
    const link = e.target.closest('a');
    if (!link) return;
    e.preventDefault();

    const href = link.getAttribute('href') || '';

    // Internal Wikipedia article link — dive in!
    if (href.startsWith('/wiki/') && !href.includes(':')) {
      const rawSlug = decodeURIComponent(href.replace('/wiki/', ''));
      const title = link.textContent.trim() || rawSlug.replace(/_/g, ' ');
      navigateTo(rawSlug, title);
    }
    // Everything else (external, special pages): open in new tab
    else if (href.startsWith('http')) {
      window.open(href, '_blank', 'noopener noreferrer');
    }
    // Anchor / relative links: ignore
  };

  // Scroll back to the top
  wrapper.scrollTop = 0;
  wrapper.classList.remove('hidden');

  // Trigger re-animation
  wrapper.style.animation = 'none';
  void wrapper.offsetHeight;
  wrapper.style.animation = '';
}

// ───────────────────────────────────────────────────────
// UI — tree rendering
// ───────────────────────────────────────────────────────

function renderTree() {
  const treeEl = document.getElementById('tree');
  const ancestorSet = getAncestorSet(currentNodeId);

  treeEl.innerHTML = '';
  getRoots().forEach(root => {
    treeEl.appendChild(buildNodeEl(root.id, ancestorSet));
  });
}

function buildNodeEl(nodeId, ancestorSet) {
  const node = nodes[nodeId];
  const isCurrent = nodeId === currentNodeId;
  const isOnPath = ancestorSet.has(nodeId);

  const nodeEl = document.createElement('div');
  nodeEl.className = 'tree-node' +
    (isCurrent ? ' current' : '') +
    (isOnPath ? ' on-path' : '');
  nodeEl.setAttribute('role', 'treeitem');
  nodeEl.setAttribute('aria-selected', isCurrent ? 'true' : 'false');

  // Label row
  const labelEl = document.createElement('div');
  labelEl.className = 'tree-node-label';
  labelEl.title = node.title;

  const dotEl = document.createElement('span');
  dotEl.className = 'tree-dot';
  dotEl.setAttribute('aria-hidden', 'true');

  const textEl = document.createElement('span');
  textEl.className = 'tree-label-text';
  textEl.textContent = node.title;

  labelEl.appendChild(dotEl);
  labelEl.appendChild(textEl);
  labelEl.addEventListener('click', () => goToNode(nodeId));

  nodeEl.appendChild(labelEl);

  // Children (all branches rendered, not collapsed)
  if (node.children.length > 0) {
    const childrenEl = document.createElement('div');
    childrenEl.className = 'tree-children';
    childrenEl.setAttribute('role', 'group');

    node.children.forEach(childId => {
      childrenEl.appendChild(buildNodeEl(childId, ancestorSet));
    });

    nodeEl.appendChild(childrenEl);
  }

  return nodeEl;
}

// ───────────────────────────────────────────────────────
// UI — state helpers
// ───────────────────────────────────────────────────────

function showLoading() {
  document.getElementById('loading-state').classList.remove('hidden');
  document.getElementById('error-state').classList.add('hidden');
  document.getElementById('article-wrapper').classList.add('hidden');
}

function hideLoading() {
  document.getElementById('loading-state').classList.add('hidden');
}

function showError(message) {
  hideLoading();
  document.getElementById('article-wrapper').classList.add('hidden');
  document.getElementById('error-message').textContent = message || 'Couldn\'t load this article.';
  document.getElementById('error-state').classList.remove('hidden');
}

function hideError() {
  document.getElementById('error-state').classList.add('hidden');
}

function updateDepthBadge() {
  const depth = currentNodeId !== null ? getDepth(currentNodeId) + 1 : 1;
  document.getElementById('depth-badge').textContent = depth;
}

// ───────────────────────────────────────────────────────
// UI — sidebar toggle (mobile)
// ───────────────────────────────────────────────────────

function openSidebar() {
  document.getElementById('tree-panel').classList.add('open');
  document.getElementById('tree-backdrop').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeSidebar() {
  document.getElementById('tree-panel').classList.remove('open');
  document.getElementById('tree-backdrop').classList.add('hidden');
  document.body.style.overflow = '';
}

// ───────────────────────────────────────────────────────
// Start / reset
// ───────────────────────────────────────────────────────

function startDive() {
  // Reset state
  nodes = {};
  currentNodeId = null;
  nodeCounter = 0;
  if (fetchController) fetchController.abort();
  fetchController = null;

  // Pick a random seed
  const slug = AVIATION_SEEDS[Math.floor(Math.random() * AVIATION_SEEDS.length)];

  // Show app
  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');

  // Navigate to seed (parentId = null — this is a root node)
  const rootNode = createNode(slug.replace(/_/g, ' '), slug, null);
  currentNodeId = rootNode.id;

  showLoading();
  renderTree();
  updateDepthBadge();

  fetchWikipedia(slug, new AbortController().signal)
    .then(result => {
      rootNode.title = result.title;
      rootNode.wikiSlug = result.slug;
      rootNode.content = result.html;
      rootNode.wikiUrl = result.wikiUrl;
      displayArticle(rootNode);
      renderTree();
    })
    .catch(err => {
      showError(err.message);
    });
}

// ───────────────────────────────────────────────────────
// Init
// ───────────────────────────────────────────────────────

document.getElementById('start-btn').addEventListener('click', startDive);

document.getElementById('new-dive-btn').addEventListener('click', startDive);

document.getElementById('tree-toggle').addEventListener('click', openSidebar);

document.getElementById('tree-close').addEventListener('click', closeSidebar);

document.getElementById('tree-backdrop').addEventListener('click', closeSidebar);

document.getElementById('error-back-btn').addEventListener('click', goBack);
