import os
import json
from bs4 import BeautifulSoup

input_folder = "before/49"
output_folder = "data/049"

os.makedirs(output_folder, exist_ok=True)

total_voters_all_files = 0
total_files_processed = 0

english_total = 0
malayalam_total = 0

for file_name in os.listdir(input_folder):

    if not file_name.endswith(".html"):
        continue

    input_path = os.path.join(input_folder, file_name)
    base_name = os.path.splitext(file_name)[0]
    output_path = os.path.join(output_folder, f"{base_name}.json")

    print(f"\n📄 Processing: {file_name}")

    # Load HTML
    with open(input_path, "r", encoding="utf-8") as file:
        html = file.read()

    soup = BeautifulSoup(html, "html.parser")

    # --------------------------
    # UNIVERSAL HEADER EXTRACTION
    # --------------------------
    header_map = {
        "DISTRICT": "",
        "LOCAL BODY": "",
        "WARD": "",
        "POLLING STATION": ""
    }

    spans = soup.select(".voters_list_search_result span")

    for i in range(len(spans)):
        label = spans[i].get_text(strip=True).replace(":", "").upper()

        if label in header_map:
            if i + 1 < len(spans):
                header_map[label] = spans[i + 1].get_text(strip=True)

    if "" in header_map.values():
        print(f"❌ Header missing or unreadable in {file_name}, skipping.")
        continue

    district = header_map["DISTRICT"]
    local_body = header_map["LOCAL BODY"]
    ward = header_map["WARD"]
    polling_station = header_map["POLLING STATION"]

    # --------------------------
    # Voter Extraction
    # --------------------------
    voters = []
    voter_rows = soup.select("tbody.voters-list tr")

    for row in voter_rows:
        cols = row.find_all("td")
        if len(cols) < 7:
            continue

        serial = cols[0].text.strip()
        name = cols[1].text.strip()
        guardian = cols[2].text.strip()
        house_no = cols[3].text.strip()
        house_name = cols[4].text.strip()

        gender_age = cols[5].text.strip().split("/")
        gender = gender_age[0].strip()
        age = gender_age[1].strip() if len(gender_age) > 1 else ""

        voter_id = cols[6].text.strip()

        voters.append({
            "serial": int(serial) if serial.isdigit() else serial,
            "name": name,
            "guardian": guardian,
            "house_no": house_no,
            "house_name": house_name,
            "gender": gender,
            "age": int(age) if age.isdigit() else age,
            "id": voter_id
        })

    voter_count = len(voters)
    total_voters_all_files += voter_count
    total_files_processed += 1

    # ---------------------------
    # Language-wise counting
    # ---------------------------
    if "english" in file_name.lower():
        english_total += voter_count
    elif "malayalam" in file_name.lower():
        malayalam_total += voter_count

    print(f"   → Voters found: {voter_count}")

    # Save JSON
    ward_data = {
        "district": district,
        "local_body": local_body,
        "ward": ward,
        "polling_station": polling_station,
        "voters": voters
    }

    with open(output_path, "w", encoding="utf-8") as jf:
        json.dump(ward_data, jf, indent=2, ensure_ascii=False)

    print(f"   ✔ Saved JSON: {output_path}")

# --------------------------------
# FINAL SUMMARY
# --------------------------------
print("\n=============================")
print("           FINAL SUMMARY     ")
print("=============================")
print(f"Total HTML Files Processed : {total_files_processed}")
print(f"Total Voters Extracted     : {total_voters_all_files}")
print("-----------------------------")
print(f"English Voter Total        : {english_total}")
print(f"Malayalam Voter Total      : {malayalam_total}")
print("=============================\n")
