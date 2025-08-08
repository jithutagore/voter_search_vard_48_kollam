import json
from sentence_transformers import SentenceTransformer

# 1. Load an embedding model (offline)
model = SentenceTransformer('all-MiniLM-L6-v2')

# 2. Process each ward JSON files
for lang in ['english', 'malayalam']:
    for ward in range(1, 7):
        infile  = f'{ward}_{lang}.json'
        outfile = f'data/{ward}_{lang}_embedded.json'

        # Read raw data
        with open(infile, 'r', encoding='utf-8') as f:
            data = json.load(f)

        # Compute embedding for each voter’s name + guardian
        for voter in data['voters']:
            text = f"{voter['name']} {voter.get('guardian', '')}".strip()
            emb = model.encode(text)
            # Attach embedding alongside all original fields
            voter['embedding'] = emb.tolist()

        # Write new embedded JSON file
        with open(outfile, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"Wrote {outfile}: embedded {len(data['voters'])} records")