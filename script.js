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

    

    
  }

  showLoader() {
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'flex';
  }

  hideLoader() {
    const loader = document.getElementById('loader');
    if (loader) {
        loader.classList.add('hidden');
        setTimeout(() => {
            loader.style.display = 'none';
        }, 400); // matches fade-out duration
    }
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
    const searchTerm = searchInput ? searchInput.value.trim() : '';

    try {
        let results = [];

        if (!searchTerm) {
            // No search term → show all (or first 1000 for performance)
            const stmt = this.db.prepare(`
                SELECT * FROM voters
                ORDER BY ward, serial
                LIMIT 1500
            `);
            while (stmt.step()) results.push(stmt.getAsObject());
            stmt.free();
        } else {
            // With search term → smart bilingual search
            const stmt = this.db.prepare(`
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
                ORDER BY
                    CASE 
                        WHEN name_en LIKE :start OR name_ml LIKE :start THEN 0
                        ELSE 1
                    END,
                    serial
                LIMIT 2000
            `);

            stmt.bind({
                ':search': `%${searchTerm}%`,
                ':start': `${searchTerm}%`
            });

            while (stmt.step()) results.push(stmt.getAsObject());
            stmt.free();
        }

        this.displayResults(results);

    } catch (error) {
        console.error('Error performing search:', error);
        this.showError('An error occurred during search. Please try again.');
    }
}


  displayResults(results) {
    const resultsDiv = document.getElementById('results');
    const resultsCount = document.getElementById('resultsCount');

    if (resultsCount) {
        resultsCount.textContent = `Showing ${results.length} result(s)`;
    }

    if (!results.length) {
        resultsDiv.innerHTML = `<div class="no-results">No voters found.</div>`;
        return;
    }

    resultsDiv.innerHTML = "";

    results.forEach(voter => {
        const card = document.createElement("div");
        card.className = "voter-card";

        card.innerHTML = `
            <div class="card-header">
                <div>
                    <div class="card-name">${voter.name_en || "-"}</div>
                    <div class="card-name-ml">${voter.name_ml || ""}</div>
                </div>
                <div class="serial-box">${voter.serial || "-"}</div>
            </div>

            <!-- ⭐ PRIORITY BLOCK 1 — WARD (HIGHLIGHTED BLUE) -->
            <div class="info-block block-blue">
                <div class="block-title">Ward</div>
                <div class="block-data">${voter.ward}</div>
            </div>

            <!-- ⭐ PRIORITY BLOCK 2 — POLLING STATION -->
            <div class="info-block block-blue">
                <div class="block-title">Polling Station</div>
                <div class="block-data">${voter.polling_station}</div>
            </div>

            <!-- ⭐ PRIORITY BLOCK 3 — VOTER ID -->
            <div class="info-block block-blue">
                <div class="block-title">Voter ID</div>
                <div class="block-data">${voter.voter_id}</div>
            </div>

            <!-- ⭐ HOUSE — LAST BLOCK -->
            <div class="info-block block-green">
                <div class="block-title">House</div>
                <div class="block-data">
                    ${voter.house_no || ""} ${voter.house_name_en || ""}
                    <br>
                    <span style="opacity:0.75">${voter.house_name_ml || ""}</span>
                </div>
            </div>

            <!-- BOTTOM GRID -->
            <div class="bottom-grid">
                <div class="grid-item">
                    <div class="grid-label">Gender & Age</div>
                    <div class="grid-value">${voter.gender} / ${voter.age}</div>
                </div>

                <div class="grid-item">
                    <div class="grid-label">Guardian</div>
                    <div class="grid-value">
                        ${voter.guardian_en || ""}<br>
                        ${voter.guardian_ml || ""}
                    </div>
                </div>

                <div class="grid-item">
                    <div class="grid-label">District</div>
                    <div class="grid-value">${voter.district || "KOLLAM"}</div>
                </div>

                <div class="grid-item">
                    <div class="grid-label">Local Body</div>
                    <div class="grid-value">${voter.local_body || ""}</div>
                </div>

                <div class="grid-item">
                    <div class="grid-label">Ward Name</div>
                    <div class="grid-value">${voter.ward_name || ""}</div>
                </div>
            </div>
        `;

        resultsDiv.appendChild(card);
    });
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