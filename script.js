// Voter Search System - Single Table with Bilingual Fields
class VoterSearch {
  constructor() {
    this.db = null;
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
        ORDER BY ward, serial
        LIMIT 1000
      `);
      
      const results = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.free();
      
      this.displayResults(results);
    } catch (error) {
      console.error('Error displaying data:', error);
      this.showError('Error reading database');
    }
  }

  performSearch() {
    if (!this.db) return;
    
    const searchInput = document.getElementById('searchInput');
    const wardFilter = document.getElementById('wardFilter');
    
    const searchTerm = searchInput ? searchInput.value.trim() : '';
    const selectedWard = wardFilter ? wardFilter.value : 'all';

    try {
      let query = `
        SELECT * FROM voters
        WHERE (
          name_en LIKE :search OR
          name_ml LIKE :search OR
          guardian_en LIKE :search OR
          guardian_ml LIKE :search OR
          house_no LIKE :search OR
          house_name_en LIKE :search OR
          house_name_ml LIKE :search OR
          voter_id LIKE :search
        )
      `;
      
      const params = { ':search': `%${searchTerm}%` };

      // Add ward filter
      if (selectedWard !== 'all') {
        query += ` AND ward = :ward`;
        params[':ward'] = selectedWard;
      }

      query += ' ORDER BY ward, serial LIMIT 2000';

      // If no search term but ward selected, show ward-only results
      if (!searchTerm && selectedWard !== 'all') {
        query = `
          SELECT * FROM voters
          WHERE ward = :ward
          ORDER BY serial
          LIMIT 2000
        `;
        delete params[':search'];
      } else if (!searchTerm && selectedWard === 'all') {
        // No search, no filter - show all
        this.displayAllData();
        return;
      }

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
        <th>Name (EN / ML)</th>
        <th>Guardian (EN / ML)</th>
        <th>House No</th>
        <th>House Name (EN / ML)</th>
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
      
      // Name with both languages
      const nameHtml = `
        <div class="bilingual-field">
          <div class="lang-en">${this.escapeHtml(voter.name_en || '-')}</div>
          ${voter.name_ml ? `<div class="lang-ml">${this.escapeHtml(voter.name_ml)}</div>` : ''}
        </div>
      `;
      
      // Guardian with both languages
      const guardianHtml = `
        <div class="bilingual-field">
          <div class="lang-en">${this.escapeHtml(voter.guardian_en || '-')}</div>
          ${voter.guardian_ml ? `<div class="lang-ml">${this.escapeHtml(voter.guardian_ml)}</div>` : ''}
        </div>
      `;
      
      // House Name with both languages
      const houseNameHtml = `
        <div class="bilingual-field">
          <div class="lang-en">${this.escapeHtml(voter.house_name_en || '-')}</div>
          ${voter.house_name_ml ? `<div class="lang-ml">${this.escapeHtml(voter.house_name_ml)}</div>` : ''}
        </div>
      `;
      
      row.innerHTML = `
        <td data-label="Serial">${voter.serial || '-'}</td>
        <td data-label="Name">${nameHtml}</td>
        <td data-label="Guardian">${guardianHtml}</td>
        <td data-label="House No">${this.escapeHtml(voter.house_no || '-')}</td>
        <td data-label="House Name">${houseNameHtml}</td>
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
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
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