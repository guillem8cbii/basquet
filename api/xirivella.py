# api/xirivella.py
import requests
import base64
import json
from datetime import datetime, timedelta

TEAM_KEYWORD = "XIRIVELLA"
FBCV_URL = "https://esb.optimalwayconsulting.com/fbcv/1/btz38ZsZlAdaODiH2fGsnJC9mZgSNPeR/FCBQWeb/getAllGamesByGrupWithMatchRecords/1399"

def handler(request):
    # 1. Llamada a la API
    resp = requests.get(FBCV_URL)
    resp.raise_for_status()
    data = resp.json()

    # 2. Decodificar Base64
    decoded = base64.b64decode(data["messageData"]).decode("utf-8")
    matches_data = json.loads(decoded)

    # 3. Crear ICS
    ics_lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH"
    ]

    for round_obj in matches_data["rounds"].values():
        for m in round_obj["matches"].values():
            names = f"{m.get('nameLocalTeam','')} {m.get('nameVisitorTeam','')}".upper()
            if TEAM_KEYWORD not in names:
                continue

            dt = datetime.strptime(m["matchDay"], "%Y-%m-%d %H:%M:%S")
            dtstart = dt.strftime("%Y%m%dT%H%M%S")
            dtend = (dt + timedelta(hours=2)).strftime("%Y%m%dT%H%M%S")

            summary = f"{m['nameLocalTeam']} vs {m['nameVisitorTeam']}"
            location = m.get("nameField") or m.get("nameTown", "")

            ics_lines += [
                "BEGIN:VEVENT",
                f"UID:{m['idMatch']}@xirivella",
                f"DTSTAMP:{datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')}",
                f"DTSTART;TZID=Europe/Madrid:{dtstart}",
                f"DTEND;TZID=Europe/Madrid:{dtend}",
                f"SUMMARY:{summary}",
                f"LOCATION:{location}",
                "END:VEVENT"
            ]

    ics_lines.append("END:VCALENDAR")
    ics_content = "\r\n".join(ics_lines)

    # 4. Devuelve la respuesta como calendar
    return {
        "statusCode": 200,
        "body": ics_content,
        "headers": {
            "Content-Type": "text/calendar"
        }
    }
