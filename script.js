// DOM Elements
const langSel = document.getElementById('language');
const wardSel = document.getElementById('ward');
const searchInput = document.getElementById('search');
const searchBtn = document.getElementById('searchBtn');
const resultsEl = document.getElementById('results');
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');

// Configuration
const WARDS = ['048']; // Add more ward numbers if needed
const LANGUAGES = ['en', 'ml']; // English, Malayalam

// Global state
let votersEn = [];
let votersMl = [];

// Loading state handlers
function showLoading(message = 'Loading data, please wait...') {
  const textEl = loadingEl.querySelector('.loading-text');
  textEl.textContent = message;
  loadingEl.classList.add('active');
}
function hideLoading() {
  loadingEl.classList.remove('active');
}
function showError(message) {
  errorEl.textContent = message;
  errorEl.style.display = 'block';
}
function hideError() {
  errorEl.style.display = 'none';
}

// Load data for all wards & all languages
async function loadData() {
  try {
    showLoading('Loading voter data...');
    hideError();

    // Reset
    votersEn = [];
    votersMl = [];

    // Populate ward dropdown
    wardSel.innerHTML = '<option value="all">All Wards</option>';
    WARDS.forEach(ward => {
      const opt = document.createElement('option');
      opt.value = ward;
      opt.textContent = `Ward ${ward}`;
      wardSel.appendChild(opt);
    });

    // Load both language datasets
    for (const lang of LANGUAGES) {
      for (const ward of WARDS) {
        for (let ps = 1; ps <= 6; ps++) {
          try {
            const resp = await fetch(`data/${ward}/${ps}_${lang}.json`);
            if (!resp.ok) throw new Error(`HTTP error! status: ${resp.status}`);

            const { polling_station, voters } = await resp.json();

            const enriched = voters.map(v => ({
              ...v,
              ward,
              polling_station_no: ps,
              polling_station
            }));

            if (lang === 'en') {
              votersEn.push(...enriched);
            } else if (lang === 'ml') {
              votersMl.push(...enriched);
            }

          } catch (err) {
            console.warn(`Failed to load ward ${ward} PS ${ps} (${lang}):`, err);
          }
        }
      }
    }

    console.log('English voters loaded:', votersEn.length);
    console.log('Malayalam voters loaded:', votersMl.length);

    renderAllVoters();
  } catch (err) {
    console.error('Failed to load data:', err);
    showError('Failed to load voter data');
  } finally {
    hideLoading();
  }
}

// Get active language dataset
function getActiveVoterPool() {
  const selectedLang = langSel.value;
  return selectedLang === 'ml' ? votersMl : votersEn;
}

// Render all voters
function renderAllVoters() {
  try {
    const selectedWard = wardSel.value;
    let pool = getActiveVoterPool();

    if (selectedWard !== 'all') {
      pool = pool.filter(v => v.ward === selectedWard);
    }

    resultsEl.innerHTML = pool.map(v => `
      <tr>
        <td data-label="Serial">${v.serial}</td>
        <td data-label="Ward">${v.ward}</td>
        <td data-label="PS No">${v.polling_station_no}</td>
        <td data-label="Name">${v.name}</td>
        <td data-label="Guardian">${v.guardian}</td>
        <td data-label="House No">${v.house_no}</td>
        <td data-label="House Name">${v.house_name}</td>
        <td data-label="Gender">${v.gender}</td>
        <td data-label="Age">${v.age}</td>
        <td data-label="ID">${v.id}</td>
        <td data-label="Polling Station">${v.polling_station}</td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Failed to render voters:', err);
    showError('Failed to display voters');
  }
}

// Search function
async function doSearch() {
  try {
    const q = searchInput.value.trim().toLowerCase();
    if (!q) {
      renderAllVoters();
      return;
    }

    showLoading('Searching voters...');
    hideError();

    const selectedWard = wardSel.value;
    let pool = getActiveVoterPool();

    if (selectedWard !== 'all') {
      pool = pool.filter(v => v.ward === selectedWard);
    }

    const results = pool
      .filter(v => {
        const searchText = `${v.name} ${v.guardian} ${v.house_name} ${v.house_no} ${v.polling_station_no}`
          .toLowerCase();
        return searchText.includes(q);
      })
      .slice(0, 20);

    resultsEl.innerHTML = results.map(v => `
      <tr>
        <td data-label="Serial">${v.serial}</td>
        <td data-label="Ward">${v.ward}</td>
        <td data-label="PS No">${v.polling_station_no}</td>
        <td data-label="Name">${v.name}</td>
        <td data-label="Guardian">${v.guardian}</td>
        <td data-label="House No">${v.house_no}</td>
        <td data-label="House Name">${v.house_name}</td>
        <td data-label="Gender">${v.gender}</td>
        <td data-label="Age">${v.age}</td>
        <td data-label="ID">${v.id}</td>
        <td data-label="Polling Station">${v.polling_station}</td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Search failed:', err);
    showError('Search failed');
  } finally {
    hideLoading();
  }
}

// Initialize
window.addEventListener('load', async () => {
  try {
    await loadData();
    console.log('Initialization complete');
  } catch (err) {
    console.error('Failed to initialize:', err);
    showError('Failed to initialize application');
  }
});

// Event listeners
langSel.addEventListener('change', renderAllVoters);
wardSel.addEventListener('change', renderAllVoters);
searchBtn.addEventListener('click', doSearch);
searchInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') doSearch();
});
