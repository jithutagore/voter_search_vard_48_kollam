// Voter Search System - Complete Implementation
class VoterSearch {
  constructor() {
    this.allVoters = [];
    this.currentLanguage = 'english';
    this.wards = {
      '048': 6,
      '049': 5
    };
    this.cacheKey = 'voterData_v1';
    this.cacheDuration = 7 * 24 * 60 * 60 * 1000; // 7 days
    
    this.init();
  }

  async init() {
    this.setupEventListeners();
    await this.loadData();
    this.displayAllData(); // Display all data initially
    this.hideLoader();
  }

  setupEventListeners() {
    // Search button
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
      searchBtn.addEventListener('click', () => this.performSearch());
    }

    // Enter key in search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.performSearch();
        }
      });
    }

    // Language toggle
    const languageToggle = document.getElementById('languageToggle');
    if (languageToggle) {
      languageToggle.addEventListener('change', (e) => {
        this.currentLanguage = e.target.checked ? 'malayalam' : 'english';
        this.performSearch();
      });
    }

    // Ward filter
    const wardFilter = document.getElementById('wardFilter');
    if (wardFilter) {
      wardFilter.addEventListener('change', () => this.performSearch());
    }

    // Clear button
    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearSearch());
    }
  }

  showLoader() {
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'flex';
  }

  hideLoader() {
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'none';
  }

  async loadData() {
    this.showLoader();
    
    try {
      // Check cache first
      const cached = this.getCachedData();
      if (cached) {
        this.allVoters = cached;
        console.log('Loaded data from cache:', cached.length, 'records');
        return;
      }

      // Load fresh data
      const voters = [];
      
      for (const [ward, pollingStations] of Object.entries(this.wards)) {
        for (let ps = 1; ps <= pollingStations; ps++) {
          for (const lang of ['english', 'malayalam']) {
            try {
              const response = await fetch(`data/${ward}/${ps}_${lang}.json`);
              if (response.ok) {
                const data = await response.json();
                if (data.voters && Array.isArray(data.voters)) {
                  data.voters.forEach(voter => {
                    voters.push({
                      ...voter,
                      ward: ward, // Normalized ward number
                      wardName: data.ward,
                      pollingStation: data.polling_station,
                      district: data.district,
                      localBody: data.local_body,
                      language: lang
                    });
                  });
                }
              }
            } catch (err) {
              console.error(`Error loading ${ward}/${ps}_${lang}.json:`, err);
            }
          }
        }
      }

      this.allVoters = voters;
      this.setCachedData(voters);
      console.log(`Loaded ${voters.length} voter records from files`);
      
    } catch (error) {
      console.error('Error loading data:', error);
      this.showError('Failed to load voter data. Please refresh the page.');
    }
  }

  getCachedData() {
    try {
      const cached = localStorage.getItem(this.cacheKey);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      const now = Date.now();

      if (now - timestamp > this.cacheDuration) {
        localStorage.removeItem(this.cacheKey);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error reading cache:', error);
      return null;
    }
  }

  setCachedData(data) {
    try {
      const cacheObject = {
        data: data,
        timestamp: Date.now()
      };
      localStorage.setItem(this.cacheKey, JSON.stringify(cacheObject));
    } catch (error) {
      console.error('Error setting cache:', error);
    }
  }

  displayAllData() {
    // Display all data for current language initially
    const results = this.allVoters.filter(voter => voter.language === this.currentLanguage);
    this.displayResults(results);
  }

  performSearch() {
    const searchInput = document.getElementById('searchInput');
    const wardFilter = document.getElementById('wardFilter');
    
    const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const selectedWard = wardFilter ? wardFilter.value : 'all';

    // Start with voters in current language
    let results = this.allVoters.filter(voter => voter.language === this.currentLanguage);

    // Apply ward filter
    if (selectedWard !== 'all') {
      results = results.filter(voter => voter.ward === selectedWard);
    }

    // Apply search filter only if there's a search term
    if (searchTerm) {
      results = results.filter(voter => {
        const name = (voter.name || '').toLowerCase();
        const guardian = (voter.guardian || '').toLowerCase();
        const houseNo = (voter.house_no || '').toLowerCase();
        const houseName = (voter.house_name || '').toLowerCase();
        const id = (voter.id || '').toLowerCase();

        return name.includes(searchTerm) ||
               guardian.includes(searchTerm) ||
               houseNo.includes(searchTerm) ||
               houseName.includes(searchTerm) ||
               id.includes(searchTerm);
      });
    }

    this.displayResults(results);
  }

  displayResults(results) {
    const resultsDiv = document.getElementById('results');
    const resultsCount = document.getElementById('resultsCount');
    
    if (!resultsDiv) return;

    if (resultsCount) {
      resultsCount.textContent = `Showing ${results.length} voter${results.length !== 1 ? 's' : ''}`;
    }

    if (results.length === 0) {
      resultsDiv.innerHTML = '<div class="no-results">No voters found matching your search criteria.</div>';
      return;
    }

    const table = document.createElement('table');
    table.className = 'results-table';
    
    // Create table header
    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr>
        <th>Serial</th>
        <th>Name</th>
        <th>Guardian</th>
        <th>House No</th>
        <th>House Name</th>
        <th>Gender</th>
        <th>Age</th>
        <th>Voter ID</th>
        <th>Ward</th>
        <th>Polling Station</th>
      </tr>
    `;
    table.appendChild(thead);

    // Create table body
    const tbody = document.createElement('tbody');
    
    results.forEach(voter => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td data-label="Serial">${voter.serial || '-'}</td>
        <td data-label="Name">${this.escapeHtml(voter.name || '-')}</td>
        <td data-label="Guardian">${this.escapeHtml(voter.guardian || '-')}</td>
        <td data-label="House No">${this.escapeHtml(voter.house_no || '-')}</td>
        <td data-label="House Name">${this.escapeHtml(voter.house_name || '-')}</td>
        <td data-label="Gender">${voter.gender || '-'}</td>
        <td data-label="Age">${voter.age || '-'}</td>
        <td data-label="Voter ID">${voter.id || '-'}</td>
        <td data-label="Ward">${this.escapeHtml(voter.wardName || voter.ward || '-')}</td>
        <td data-label="Polling Station">${this.escapeHtml(voter.pollingStation || '-')}</td>
      `;
      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    resultsDiv.innerHTML = '';
    resultsDiv.appendChild(table);
  }

  clearSearch() {
    const searchInput = document.getElementById('searchInput');
    const wardFilter = document.getElementById('wardFilter');

    if (searchInput) searchInput.value = '';
    if (wardFilter) wardFilter.value = 'all';
    
    // Display all data again after clearing
    this.displayAllData();
  }

  showError(message) {
    const resultsDiv = document.getElementById('results');
    if (resultsDiv) {
      resultsDiv.innerHTML = `<div class="error-message">${message}</div>`;
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new VoterSearch();
  });
} else {
  new VoterSearch();
}