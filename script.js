const langSel = document.getElementById('language');
const wardSel = document.getElementById('ward');
const searchInput = document.getElementById('search');
const searchBtn = document.getElementById('searchBtn');
const resultsEl = document.getElementById('results');
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');
const tableContainer = document.querySelector('.table-container');

// Config
const WARDS = ['048']; // Add more wards if needed
const LANGUAGES = ['english', 'malayalam'];
const POLLING_STATIONS_PER_WARD = 6;
const CACHE_KEY = 'voterCache_v3';

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

// --- Optimized Parallel Data Loader ---
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
    setTimeout(hideLoading, 300);
    return;
  }

  const totalFiles = WARDS.length * POLLING_STATIONS_PER_WARD * LANGUAGES.length;
  let loadedCount = 0;

  const fetchPromises = [];

  for (const lang of LANGUAGES) {
    for (const ward of WARDS) {
      for (let ps = 1; ps <= POLLING_STATIONS_PER_WARD; ps++) {
        const url = `data/${ward}/${ps}_${lang}.json`;
        fetchPromises.push(
          fetch(url)
            .then(resp => (resp.ok ? resp.json() : null))
            .then(data => {
              loadedCount++;
              loadingEl.querySelector('.loading-text').textContent =
                `Loading voter data... (${loadedCount}/${totalFiles})`;

              if (!data) return;
              const enriched = data.voters.map(v => ({
                ...v,
                ward,
                polling_station_no: ps,
                polling_station: data.polling_station
              }));
              if (lang === 'english') votersEn.push(...enriched);
              else votersMl.push(...enriched);
            })
            .catch(() => {
              loadedCount++;
              console.warn(`❌ Failed: ${url}`);
            })
        );
      }
    }
  }

  // Wait for all fetches concurrently
  await Promise.all(fetchPromises);

  localStorage.setItem(CACHE_KEY, JSON.stringify({ votersEn, votersMl }));

  populateWardDropdown();
  renderAllVoters();
  hideLoading();
}

// Dropdown setup
function populateWardDropdown() {
  wardSel.innerHTML = '<option value="all">All Wards</option>';
  WARDS.forEach(w => {
    const opt = document.createElement('option');
    opt.value = w;
    opt.textContent = `Ward ${w}`;
    wardSel.appendChild(opt);
  });
}

// Get pool
function getActiveVoterPool() {
  return langSel.value === 'malayalam' ? votersMl : votersEn;
}

// Render
function renderAllVoters() {
  const ward = wardSel.value;
  let pool = getActiveVoterPool();
  if (ward !== 'all') pool = pool.filter(v => v.ward === ward);

  tableContainer.classList.remove('fade-in');
  resultsEl.innerHTML = pool.map(v => rowHTML(v)).join('');
  requestAnimationFrame(() => tableContainer.classList.add('fade-in'));
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
    </tr>`;
}

// Search
function doSearch() {
  const q = searchInput.value.trim().toLowerCase();
  showLoading('Searching...');
  hideError();

  setTimeout(() => {
    const ward = wardSel.value;
    let pool = getActiveVoterPool();
    if (ward !== 'all') pool = pool.filter(v => v.ward === ward);

    const results = q
      ? pool.filter(v => {
          const text = `${v.serial} ${v.name} ${v.guardian} ${v.house_name} ${v.house_no} ${v.id}`.toLowerCase();
          return text.includes(q);
        }).slice(0, 50)
      : pool;

    hideLoading();

    if (results.length) resultsEl.innerHTML = results.map(rowHTML).join('');
    else {
      resultsEl.innerHTML = '';
      showError('No results found.');
    }
  }, 150);
}

// Events
window.addEventListener('load', loadData);

langSel.addEventListener('change', () => {
  showLoading('Switching language...');
  renderAllVoters();
  hideLoading();
});

wardSel.addEventListener('change', () => {
  showLoading('Filtering...');
  setTimeout(() => {
    renderAllVoters();
    hideLoading();
  }, 200);
});

searchBtn.addEventListener('click', doSearch);
searchInput.addEventListener('keydown', e => e.key === 'Enter' && doSearch());
