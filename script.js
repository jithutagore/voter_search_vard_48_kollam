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

const langSel = document.getElementById('language');
const wardSel = document.getElementById('ward');
const searchInput = document.getElementById('search');
const resultsEl = document.getElementById('results');

let allVoters = [];
let useModel;

// Load the Universal Sentence Encoder
async function loadEmbedder() {
  useModel = await useSentenceEncoder.load();
}

// Load data for six wards
async function loadData() {
  allVoters = [];
  const lang = langSel.value;
  const wardNames = new Set();

  for (let w = 1; w <= 6; w++) {
    const resp = await fetch(`data/${w}_${lang}_embedded.json`);
    const { ward, polling_station, voters } = await resp.json();
    voters.forEach(v => {
      allVoters.push({ ward, polling_station, ...v });
      wardNames.add(ward);
    });
  }

  // Populate ward dropdown
  wardSel.innerHTML = '<option value="all">All Wards</option>';
  wardNames.forEach(w => {
    const opt = document.createElement('option');
    opt.value = w;
    opt.textContent = w;
    wardSel.appendChild(opt);
  });

  resultsEl.innerHTML = '';
}

// Initialize on load
window.addEventListener('load', async () => {
  await loadEmbedder();
  await loadData();
});
langSel.addEventListener('change', loadData);
wardSel.addEventListener('change', () => searchInput.dispatchEvent(new Event('input')));

// Handle search input
searchInput.addEventListener('input', async () => {
  const q = searchInput.value.trim();
  if (!q || !useModel) {
    resultsEl.innerHTML = '';
    return;
  }

  // Filter by ward
  const selectedWard = wardSel.value;
  let pool = selectedWard === 'all'
    ? allVoters
    : allVoters.filter(v => v.ward === selectedWard);

  // Embed query
  const embedOut = await useModel.embed([q]);
  const arr = await embedOut.array();
  const qEmb = arr[0];

  // Score and sort top 20
  const results = pool
    .map(v => ({ v, score: cosine(qEmb, v.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);

  // Render rows
  resultsEl.innerHTML = results.map(({ v, score }) => `
    <tr>
      <td>${v.serial}</td>
      <td>${v.ward}</td>
      <td>${v.name}</td>
      <td>${v.guardian}</td>
      <td>${v.house_no}</td>
      <td>${v.house_name}</td>
      <td>${v.gender}</td>
      <td>${v.age}</td>
      <td>${v.id}</td>
      <td>${v.polling_station}</td>
      <td>${(score * 100).toFixed(1)}%</td>
    </tr>
  `).join('');
});