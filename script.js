// DOM Elements
const langSel = document.getElementById('language');
const wardSel = document.getElementById('ward');
const searchInput = document.getElementById('search');
const searchBtn = document.getElementById('searchBtn');
const resultsEl = document.getElementById('results');
const loadingEl = document.getElementById('loading');

// Global state
let allVoters = [];
let useModel;

// Loading state handlers
function showLoading(message = 'Loading data, please wait...') {
  const textEl = loadingEl.querySelector('.loading-text');
  textEl.textContent = message;
  loadingEl.classList.add('active');
}

function hideLoading() {
  loadingEl.classList.remove('active');
}

// Cosine similarity between two vectors
function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / Math.sqrt(na * nb);
}

// Load the Universal Sentence Encoder
async function loadEmbedder() {
  try {
    console.log('Loading Universal Sentence Encoder...');
    showLoading('Loading AI model...');
    useModel = await use.load();
    console.log('Encoder loaded successfully');
  } catch (err) {
    console.error('Failed to load encoder:', err);
    throw err;
  }
}

// Load data for six wards
async function loadData() {
  try {
    showLoading('Loading voter data...');
    allVoters = [];
    const lang = langSel.value;
    const wardNames = new Set();
    
    console.log('Loading data for language:', lang);

    for (let w = 1; w <= 6; w++) {
      try {
        const resp = await fetch(`data/${w}_${lang}_embedded.json`);
        if (!resp.ok) throw new Error(`HTTP error! status: ${resp.status}`);
        
        const { ward, polling_station, voters } = await resp.json();
        console.log(`Loaded ward ${w}: ${voters.length} voters`);
        
        voters.forEach(v => {
          allVoters.push({ ward, polling_station, ...v });
          wardNames.add(ward);
        });
      } catch (err) {
        console.error(`Failed to load ward ${w}:`, err);
      }
    }

    // Populate ward dropdown
    wardSel.innerHTML = '<option value="all">All Wards</option>';
    Array.from(wardNames).sort().forEach(w => {
      const opt = document.createElement('option');
      opt.value = w;
      opt.textContent = w;
      wardSel.appendChild(opt);
    });

    console.log('Total voters loaded:', allVoters.length);
    renderAllVoters();
  } catch (err) {
    console.error('Failed to load data:', err);
    throw err;
  } finally {
    hideLoading();
  }
}

// Render all voters (no search)
function renderAllVoters() {
  const selectedWard = wardSel.value;
  let pool = selectedWard === 'all'
    ? allVoters
    : allVoters.filter(v => v.ward === selectedWard);

  resultsEl.innerHTML = pool.map(v => `
    <tr>
      <td data-label="Serial">${v.serial}</td>
      <td data-label="Ward">${v.ward}</td>
      <td data-label="Name">${v.name}</td>
      <td data-label="Guardian">${v.guardian}</td>
      <td data-label="House No">${v.house_no}</td>
      <td data-label="House Name">${v.house_name}</td>
      <td data-label="Gender">${v.gender}</td>
      <td data-label="Age">${v.age}</td>
      <td data-label="ID">${v.id}</td>
      <td data-label="Polling Station">${v.polling_station}</td>
      <td data-label="Score"></td>
    </tr>
  `).join('');
}

// Search function
async function doSearch() {
  try {
    const q = searchInput.value.trim();
    if (!q || !useModel) {
      renderAllVoters();
      return;
    }

    showLoading('Searching voters...');
    const selectedWard = wardSel.value;
    let pool = selectedWard === 'all'
      ? allVoters
      : allVoters.filter(v => v.ward === selectedWard);

    const embedOut = await useModel.embed([q]);
    const arr = await embedOut.array();
    const qEmb = arr[0];

    const results = pool
      .map(v => ({ v, score: cosine(qEmb, v.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    resultsEl.innerHTML = results.map(({ v, score }) => `
      <tr>
        <td data-label="Serial">${v.serial}</td>
        <td data-label="Ward">${v.ward}</td>
        <td data-label="Name">${v.name}</td>
        <td data-label="Guardian">${v.guardian}</td>
        <td data-label="House No">${v.house_no}</td>
        <td data-label="House Name">${v.house_name}</td>
        <td data-label="Gender">${v.gender}</td>
        <td data-label="Age">${v.age}</td>
        <td data-label="ID">${v.id}</td>
        <td data-label="Polling Station">${v.polling_station}</td>
        <td data-label="Score">${(score * 100).toFixed(1)}%</td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Search failed:', err);
  } finally {
    hideLoading();
  }
}

// Initialize on load
window.addEventListener('load', async () => {
  try {
    showLoading('Initializing application...');
    await loadEmbedder();
    await loadData();
    console.log('Initialization complete');
  } catch (err) {
    console.error('Failed to initialize:', err);
  } finally {
    hideLoading();
  }
});

// Event listeners
langSel.addEventListener('change', loadData);
wardSel.addEventListener('change', renderAllVoters);
searchBtn.addEventListener('click', doSearch);
searchInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') doSearch();
});