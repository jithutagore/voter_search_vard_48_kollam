from bs4 import BeautifulSoup
import json

fname = "6_malayalam"

# Load your HTML content from file
with open(f"{fname}.html", "r", encoding="utf-8") as file:
    html = file.read()

soup = BeautifulSoup(html, "html.parser")

# Extract general ward and polling info
ward_info = soup.find("table").find_all("td")
district = ward_info[1].text.strip()
local_body = ward_info[3].text.strip()
ward = ward_info[5].text.strip()
polling_station = ward_info[7].text.strip()

# Parse the voter table
voter_rows = soup.select("tbody.voters-list tr")

voters = []

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
    gender = gender_age[0].strip() if len(gender_age) > 0 else ""
    age = gender_age[1].strip() if len(gender_age) > 1 else ""
    voter_id = cols[6].text.strip()

    voters.append({
        "serial": int(serial),
        "name": name,
        "guardian": guardian,
        "house_no": house_no,
        "house_name": house_name,
        "gender": gender,
        "age": int(age) if age.isdigit() else age,
        "id": voter_id
    })

# Full structured data
ward_data = {
    "district": district,
    "local_body": local_body,
    "ward": ward,
    "polling_station": polling_station,
    "voters": voters
}

# Save to JSON
with open(f"{fname}.json", "w", encoding="utf-8") as json_file:
    json.dump(ward_data, json_file, indent=2, ensure_ascii=False)

print(f"Extracted {len(voters)} voters from {ward}")
