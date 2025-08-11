const langSel = document.getElementById('language');
const wardSel = document.getElementById('ward');
const searchInput = document.getElementById('search');
const searchBtn = document.getElementById('searchBtn');
const resultsEl = document.getElementById('results');
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');

// Config
const WARDS = ['048']; // Add more wards here
const LANGUAGES = ['english', 'malayalam'];
const POLLING_STATIONS_PER_WARD = 6;
const CACHE_KEY = 'voterCache_v1';

// Data
let votersEn = [];
let votersMl = [];

// UI helpers
function showLoading(message = 'Loading...') {
  loadingEl.querySelector('.loading-text').textContent = message;
  loadingEl.classList.add('active');
}
function hideLoading() {
  loadingEl.classList.remove('active');
}
function showError(msg) {
  errorEl.textContent = msg;
  errorEl.style.display = 'block';
}
function hideError() {
  errorEl.style.display = 'none';
}

// Load voters (with caching)
async function loadData() {
  showLoading('Loading voter data...');
  hideError();

  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    const parsed = JSON.parse(cached);
    votersEn = parsed.votersEn;
    votersMl = parsed.votersMl;
    populateWardDropdown();
    renderAllVoters();
    hideLoading();
    return;
  }

  votersEn = [];
  votersMl = [];

  populateWardDropdown();

  for (const lang of LANGUAGES) {
    for (const ward of WARDS) {
      for (let ps = 1; ps <= POLLING_STATIONS_PER_WARD; ps++) {
        try {
          const resp = await fetch(`data/${ward}/${ps}_${lang}.json`);
          if (!resp.ok) continue;
          const { polling_station, voters } = await resp.json();
          const enriched = voters.map(v => ({
            ...v,
            ward,
            polling_station_no: ps,
            polling_station
          }));
          if (lang === 'english') votersEn.push(...enriched);
          else votersMl.push(...enriched);
        } catch (err) {
          console.warn(`Failed to load ${ward}/${ps}_${lang}.json`);
        }
      }
    }
  }

  // Save cache
  localStorage.setItem(CACHE_KEY, JSON.stringify({ votersEn, votersMl }));

  renderAllVoters();
  hideLoading();
}

// Populate ward dropdown
function populateWardDropdown() {
  wardSel.innerHTML = '<option value="all">All Wards</option>';
  WARDS.forEach(w => {
    const opt = document.createElement('option');
    opt.value = w;
    opt.textContent = `Ward ${w}`;
    wardSel.appendChild(opt);
  });
}

// Get active language pool
function getActiveVoterPool() {
  return langSel.value === 'malayalam' ? votersMl : votersEn;
}

// Render all voters
function renderAllVoters() {
  const ward = wardSel.value;
  let pool = getActiveVoterPool();
  if (ward !== 'all') pool = pool.filter(v => v.ward === ward);
  resultsEl.innerHTML = pool.map(v => rowHTML(v)).join('');
}

// Row HTML
function rowHTML(v) {
  return `
    <tr>
      <td>${v.serial}</td>
      <td>${v.ward}</td>
      <td>${v.polling_station_no}</td>
      <td>${v.name}</td>
      <td>${v.guardian}</td>
      <td>${v.house_no}</td>
      <td>${v.house_name}</td>
      <td>${v.gender}</td>
      <td>${v.age}</td>
      <td>${v.id}</td>
      <td>${v.polling_station}</td>
    </tr>
  `;
}

// Search
function doSearch() {
  const q = searchInput.value.trim().toLowerCase();
  if (!q) return renderAllVoters();

  showLoading('Searching...');
  hideError();

  const ward = wardSel.value;
  let pool = getActiveVoterPool();
  if (ward !== 'all') pool = pool.filter(v => v.ward === ward);

  const results = pool.filter(v => {
    const text = `${v.serial} ${v.name} ${v.guardian} ${v.house_name} ${v.house_no} ${v.polling_station_no} ${v.id}`.toLowerCase();
    return text.includes(q);
  }).slice(0, 50);

  hideLoading();

  if (results.length) {
    resultsEl.innerHTML = results.map(v => rowHTML(v)).join('');
  } else {
    resultsEl.innerHTML = '';
    showError('No results found.');
  }
}

// Events
window.addEventListener('load', loadData);
langSel.addEventListener('change', renderAllVoters);
wardSel.addEventListener('change', renderAllVoters);
searchBtn.addEventListener('click', doSearch);
searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
