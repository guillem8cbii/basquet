from flask import Flask, Response
import requests
import base64
import json
from datetime import datetime, timedelta

app = Flask(__name__)

FBCV_URL = "https://esb.optimalwayconsulting.com/fbcv/1/btz38ZsZlAdaODiH2fGsnJC9mZgSNPeR/FCBQWeb/getAllGamesByGrupWithMatchRecords/1399"
TEAM_KEYWORD = "XIRIVELLA"  # filtre només partits de Xirivella

@app.route("/xirivella.ics")
def xirivella_calendar():
    # 1. Cridem a la API
    resp = requests.get(FBCV_URL)
    resp.raise_for_status()
    data = resp.json()

    # 2. Decodifiquem el camp Base64
    decoded = base64.b64decode(data["messageData"]).decode("utf-8")
    matches_data = json.loads(decoded)

    # 3. Creem ICS
    ics_lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH"
    ]

    for round_obj in matches_data["rounds"].values():
        for m in round_obj["matches"].values():
            # Només partits on apareix XIRIVELLA
            names = f"{m.get('nameLocalTeam','')} {m.get('nameVisitorTeam','')}".upper()
            if TEAM_KEYWORD not in names:
                continue

            # Dates
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
    return Response(ics_content, mimetype="text/calendar")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)