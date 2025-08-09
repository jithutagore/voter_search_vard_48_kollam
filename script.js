// DOM Elements
const langSel = document.getElementById('language');
const wardSel = document.getElementById('ward');
const searchInput = document.getElementById('search');
const searchBtn = document.getElementById('searchBtn');
const resultsEl = document.getElementById('results');
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');

// Global state
let allVoters = [];

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

// Load data for six wards
async function loadData() {
  try {
    showLoading('Loading voter data...');
    hideError();
    allVoters = [];
    const lang = langSel.value;
    
    // Populate ward dropdown with numbers 1-6
    wardSel.innerHTML = '<option value="all">All Wards</option>';
    for (let w = 1; w <= 6; w++) {
      const opt = document.createElement('option');
      opt.value = w.toString();
      opt.textContent = `Ward ${w}`;
      wardSel.appendChild(opt);
    }
    
    console.log('Loading data for language:', lang);

    for (let w = 1; w <= 6; w++) {
      try {
        const resp = await fetch(`data/${w}_${lang}.json`);
        if (!resp.ok) throw new Error(`HTTP error! status: ${resp.status}`);
        
        const { polling_station, voters } = await resp.json();
        console.log(`Loaded ward ${w}: ${voters.length} voters`);
        
        // Add ward number instead of ward name
        voters.forEach(v => {
          allVoters.push({ 
            ...v,
            ward: w, // Use ward number
            polling_station
          });
        });
      } catch (err) {
        console.error(`Failed to load ward ${w}:`, err);
        showError(`Failed to load ward ${w}`);
      }
    }

    console.log('Total voters loaded:', allVoters.length);
    renderAllVoters();
  } catch (err) {
    console.error('Failed to load data:', err);
    showError('Failed to load voter data');
  } finally {
    hideLoading();
  }
}

// Render all voters (no search)
function renderAllVoters() {
  try {
    const selectedWard = wardSel.value;
    let pool = selectedWard === 'all'
      ? allVoters
      : allVoters.filter(v => v.ward === parseInt(selectedWard));

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
    let pool = selectedWard === 'all'
      ? allVoters
      : allVoters.filter(v => v.ward === parseInt(selectedWard));

    const results = pool
      .filter(v => {
        const searchText = `${v.name} ${v.guardian} ${v.house_name} ${v.house_no}`
          .toLowerCase();
        return searchText.includes(q);
      })
      .slice(0, 20);

    resultsEl.innerHTML = results.map(v => `
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
  } catch (err) {
    console.error('Search failed:', err);
    showError('Search failed');
  } finally {
    hideLoading();
  }
}

// Initialize on load
window.addEventListener('load', async () => {
  try {
    showLoading('Loading voter data...');
    await loadData();
    console.log('Initialization complete');
  } catch (err) {
    console.error('Failed to initialize:', err);
    showError('Failed to initialize application');
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