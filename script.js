// Voter Search System - SQLite Implementation
class VoterSearch {
  constructor() {
    this.db = null;
    this.currentLanguage = 'english';
    this.SQL = null;
    
    this.init();
  }

  async init() {
    this.setupEventListeners();
    await this.loadDatabase();
    this.displayAllData();
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

  async loadDatabase() {
    this.showLoader();
    
    try {
      // Load sql.js library
      this.SQL = await initSqlJs({
        locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
      });
      
      // Load database file
      const response = await fetch('voters.db');
      const buffer = await response.arrayBuffer();
      this.db = new this.SQL.Database(new Uint8Array(buffer));
      
      console.log('Database loaded successfully');
      
    } catch (error) {
      console.error('Error loading database:', error);
      this.showError('Failed to load voter database. Please refresh the page.');
    }
  }

  displayAllData() {
    if (!this.db) return;
    
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM voters 
        WHERE language = :language
        ORDER BY ward, serial
      `);
      
      stmt.bind({ ':language': this.currentLanguage });
      
      const results = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.free();
      
      this.displayResults(results);
    } catch (error) {
      console.error('Error displaying data:', error);
    }
  }

  performSearch() {
    if (!this.db) return;
    
    const searchInput = document.getElementById('searchInput');
    const wardFilter = document.getElementById('wardFilter');
    
    const searchTerm = searchInput ? searchInput.value.trim() : '';
    const selectedWard = wardFilter ? wardFilter.value : 'all';

    try {
      let query = 'SELECT * FROM voters WHERE language = :language';
      const params = { ':language': this.currentLanguage };

      // Add ward filter
      if (selectedWard !== 'all') {
        query += ' AND ward = :ward';
        params[':ward'] = selectedWard;
      }

      // Add search filter
      if (searchTerm) {
        query += ` AND (
          name LIKE :search OR
          guardian LIKE :search OR
          house_no LIKE :search OR
          house_name LIKE :search OR
          voter_id LIKE :search
        )`;
        params[':search'] = `%${searchTerm}%`;
      }

      query += ' ORDER BY ward, serial';

      const stmt = this.db.prepare(query);
      stmt.bind(params);
      
      const results = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.free();
      
      this.displayResults(results);
      
    } catch (error) {
      console.error('Error performing search:', error);
      this.showError('An error occurred during search. Please try again.');
    }
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
        <td data-label="Voter ID">${voter.voter_id || '-'}</td>
        <td data-label="Ward">${this.escapeHtml(voter.ward_name || voter.ward || '-')}</td>
        <td data-label="Polling Station">${this.escapeHtml(voter.polling_station || '-')}</td>
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