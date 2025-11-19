import sqlite3
import json
import os

def create_database():
    # Create/connect to database
    conn = sqlite3.connect('voters.db')
    cursor = conn.cursor()
    
    # Create table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS voters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            serial INTEGER,
            name TEXT,
            guardian TEXT,
            house_no TEXT,
            house_name TEXT,
            gender TEXT,
            age INTEGER,
            voter_id TEXT,
            ward TEXT,
            ward_name TEXT,
            polling_station TEXT,
            district TEXT,
            local_body TEXT,
            language TEXT
        )
    ''')
    
    # Create indexes for faster searching
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_name ON voters(name)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_guardian ON voters(guardian)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_house_no ON voters(house_no)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_voter_id ON voters(voter_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_ward ON voters(ward)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_language ON voters(language)')
    
    # Ward configuration
    wards = {
        '048': 6,
        '049': 5
    }
    
    # Process each JSON file
    total_records = 0
    for ward, polling_stations in wards.items():
        for ps in range(1, polling_stations + 1):
            for lang in ['english', 'malayalam']:
                filepath = f'data/{ward}/{ps}_{lang}.json'
                
                if os.path.exists(filepath):
                    try:
                        with open(filepath, 'r', encoding='utf-8') as f:
                            data = json.load(f)
                            
                            # Extract ward number from ward field (e.g., "049-KAIKULANGARA" -> "049")
                            ward_num = data['ward'].split('-')[0] if '-' in data['ward'] else ward
                            
                            # Insert voters
                            for voter in data.get('voters', []):
                                cursor.execute('''
                                    INSERT INTO voters (
                                        serial, name, guardian, house_no, house_name,
                                        gender, age, voter_id, ward, ward_name,
                                        polling_station, district, local_body, language
                                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                                ''', (
                                    voter.get('serial'),
                                    voter.get('name'),
                                    voter.get('guardian'),
                                    voter.get('house_no'),
                                    voter.get('house_name'),
                                    voter.get('gender'),
                                    voter.get('age'),
                                    voter.get('id'),
                                    ward_num,
                                    data.get('ward'),
                                    data.get('polling_station'),
                                    data.get('district'),
                                    data.get('local_body'),
                                    lang
                                ))
                                total_records += 1
                        
                        print(f"✓ Processed {filepath}")
                    except Exception as e:
                        print(f"✗ Error processing {filepath}: {e}")
                else:
                    print(f"⚠ File not found: {filepath}")
    
    conn.commit()
    conn.close()
    
    print(f"\n✓ Database created successfully!")
    print(f"✓ Total records: {total_records}")
    print(f"✓ Database file: voters.db")

if __name__ == '__main__':
    create_database()