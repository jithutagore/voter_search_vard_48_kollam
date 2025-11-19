#!/usr/bin/env python3
"""
convert_json_to_sqlite.py

Creates a single SQLite DB (voters.db) with bilingual fields.
Only name, guardian, and house_name have separate English and Malayalam columns.
All other fields (serial, age, gender, voter_id, etc.) are stored once.

Expected folder structure:
data/
  048/
    1_english.json
    1_malayalam.json
    2_english.json
    2_malayalam.json
    ...
  049/
    1_english.json
    1_malayalam.json
    ...
"""

import sqlite3
import json
import os

DB_PATH = "voters.db"

def create_database():
    # Create/connect to database
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create single table with bilingual fields
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS voters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            serial INTEGER,
            name_en TEXT,
            name_ml TEXT,
            guardian_en TEXT,
            guardian_ml TEXT,
            house_no TEXT,
            house_name_en TEXT,
            house_name_ml TEXT,
            gender TEXT,
            age INTEGER,
            voter_id TEXT UNIQUE,
            ward TEXT,
            ward_name TEXT,
            polling_station TEXT,
            district TEXT,
            local_body TEXT
        )
    ''')
    
    # Create indexes for faster searching
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_name_en ON voters(name_en)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_name_ml ON voters(name_ml)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_guardian_en ON voters(guardian_en)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_guardian_ml ON voters(guardian_ml)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_house_no ON voters(house_no)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_house_name_en ON voters(house_name_en)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_house_name_ml ON voters(house_name_ml)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_voter_id ON voters(voter_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_ward ON voters(ward)')
    
    conn.commit()
    
    # Ward configuration
    wards = {
        '048': 6,
        '049': 5
    }
    
    # Dictionary to accumulate voter data by voter_id
    voters_map = {}
    
    # Process each JSON file
    for ward, polling_stations in wards.items():
        for ps in range(1, polling_stations + 1):
            for lang in ['english', 'malayalam']:
                filepath = os.path.join('data', ward, f'{ps}_{lang}.json')
                
                if not os.path.exists(filepath):
                    print(f"⚠ File not found: {filepath}")
                    continue
                
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    
                    # Extract ward number from ward field (e.g., "049-KAIKULANGARA" -> "049")
                    ward_field = data.get('ward', ward)
                    ward_num = ward_field.split('-')[0] if isinstance(ward_field, str) and '-' in ward_field else ward
                    
                    # Process voters
                    for voter in data.get('voters', []):
                        voter_id = voter.get('id')
                        
                        if not voter_id:
                            print(f"⚠ Skipping voter without ID in {filepath}")
                            continue
                        
                        # Initialize voter entry if not exists
                        if voter_id not in voters_map:
                            voters_map[voter_id] = {
                                'serial': voter.get('serial'),
                                'name_en': None,
                                'name_ml': None,
                                'guardian_en': None,
                                'guardian_ml': None,
                                'house_no': voter.get('house_no'),
                                'house_name_en': None,
                                'house_name_ml': None,
                                'gender': voter.get('gender'),
                                'age': voter.get('age'),
                                'voter_id': voter_id,
                                'ward': ward_num,
                                'ward_name': ward_field,
                                'polling_station': data.get('polling_station'),
                                'district': data.get('district'),
                                'local_body': data.get('local_body')
                            }
                        
                        # Fill language-specific fields
                        if lang == 'english':
                            voters_map[voter_id]['name_en'] = voter.get('name')
                            voters_map[voter_id]['guardian_en'] = voter.get('guardian')
                            voters_map[voter_id]['house_name_en'] = voter.get('house_name')
                        else:  # malayalam
                            voters_map[voter_id]['name_ml'] = voter.get('name')
                            voters_map[voter_id]['guardian_ml'] = voter.get('guardian')
                            voters_map[voter_id]['house_name_ml'] = voter.get('house_name')
                    
                    print(f"✓ Processed {filepath}")
                    
                except Exception as e:
                    print(f"✗ Error processing {filepath}: {e}")
    
    # Insert all voters into database
    inserted = 0
    updated = 0
    
    for voter_id, voter_data in voters_map.items():
        try:
            cursor.execute('''
                INSERT OR REPLACE INTO voters (
                    serial, name_en, name_ml, guardian_en, guardian_ml,
                    house_no, house_name_en, house_name_ml, gender, age,
                    voter_id, ward, ward_name, polling_station, district, local_body
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                voter_data['serial'],
                voter_data['name_en'],
                voter_data['name_ml'],
                voter_data['guardian_en'],
                voter_data['guardian_ml'],
                voter_data['house_no'],
                voter_data['house_name_en'],
                voter_data['house_name_ml'],
                voter_data['gender'],
                voter_data['age'],
                voter_data['voter_id'],
                voter_data['ward'],
                voter_data['ward_name'],
                voter_data['polling_station'],
                voter_data['district'],
                voter_data['local_body']
            ))
            inserted += 1
            
        except sqlite3.IntegrityError as e:
            print(f"⚠ Integrity error for voter_id {voter_id}: {e}")
            updated += 1
        except Exception as e:
            print(f"✗ Error inserting voter_id {voter_id}: {e}")
    
    conn.commit()
    conn.close()
    
    # Print summary
    print(f"\n{'='*60}")
    print(f"✓ Database created successfully!")
    print(f"{'='*60}")
    print(f"✓ Total unique voters: {len(voters_map)}")
    print(f"✓ Records inserted: {inserted}")
    print(f"✓ Records updated: {updated}")
    print(f"✓ Database file: {DB_PATH}")
    print(f"\n📊 Table Structure:")
    print(f"   - Single table: 'voters'")
    print(f"   - Bilingual fields: name, guardian, house_name")
    print(f"   - Single fields: serial, age, gender, voter_id, etc.")
    print(f"{'='*60}\n")

def main():
    # Check if data folder exists
    if not os.path.isdir('data'):
        print("✗ Error: 'data' folder not found!")
        print("Please create the folder structure:")
        print("  data/")
        print("    048/")
        print("      1_english.json")
        print("      1_malayalam.json")
        print("      ...")
        print("    049/")
        print("      1_english.json")
        print("      1_malayalam.json")
        print("      ...")
        return
    
    create_database()

if __name__ == '__main__':
    main()