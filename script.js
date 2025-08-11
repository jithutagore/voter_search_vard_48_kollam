const langSel = document.getElementById('language');
const wardSel = document.getElementById('ward');
const searchInput = document.getElementById('search');
const searchBtn = document.getElementById('searchBtn');
const resultsEl = document.getElementById('results');
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');

// --- CONFIG ---
const WARDS = ['048']; // Add more wards if needed
const LANGUAGES = ['english', 'malayalam'];
const POLLING_STATIONS_PER_WARD = 6; // change if needed

let votersEn = [];
let votersMl = [];

// --- UI HELPERS ---
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

// --- LOAD ALL VOTERS ---
async function loadData() {
  try {
    showLoading('Loading voter data...');
    hideError();
    votersEn = [];
    votersMl = [];

    // Populate wards in dropdown
    wardSel.innerHTML = '<option value="all">All Wards</option>';
    WARDS.forEach(w => {
      const opt = document.createElement('option');
      opt.value = w;
      opt.textContent = `Ward ${w}`;
      wardSel.appendChild(opt);
    });

    // Fetch each ward / polling station / language file
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

    renderAllVoters();
  } catch {
    showError('Failed to load voter data');
  } finally {
    hideLoading();
  }
}

// --- GET CURRENT LANGUAGE POOL ---
function getActiveVoterPool() {
  return langSel.value === 'malayalam' ? votersMl : votersEn;
}

// --- RENDER ALL VOTERS ---
function renderAllVoters() {
  const ward = wardSel.value;
  let pool = getActiveVoterPool();
  if (ward !== 'all') pool = pool.filter(v => v.ward === ward);
  resultsEl.innerHTML = pool.map(v => rowHTML(v)).join('');
}

// --- RENDER ONE ROW ---
function rowHTML(v) {
  return `
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
  `;
}

// --- SEARCH FUNCTION ---
async function doSearch() {
  const q = searchInput.value.trim().toLowerCase();
  if (!q) return renderAllVoters();

  showLoading('Searching...');
  hideError();

  const ward = wardSel.value;
  let pool = getActiveVoterPool();
  if (ward !== 'all') pool = pool.filter(v => v.ward === ward);

  // Search across all major fields
  const results = pool.filter(v => {
    const text = `${v.serial} ${v.name} ${v.guardian} ${v.house_name} ${v.house_no} ${v.polling_station_no} ${v.id}`
      .toLowerCase();
    return text.includes(q);
  }).slice(0, 50); // limit results for performance

  hideLoading();

  if (results.length) {
    resultsEl.innerHTML = results.map(v => rowHTML(v)).join('');
  } else {
    resultsEl.innerHTML = '';
    showError('No results found.');
  }
}

// --- EVENT LISTENERS ---
window.addEventListener('load', loadData);
langSel.addEventListener('change', renderAllVoters);
wardSel.addEventListener('change', renderAllVoters);
searchBtn.addEventListener('click', doSearch);
searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
