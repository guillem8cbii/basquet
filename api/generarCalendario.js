const fs = require('fs');
import https from 'https';
import { Buffer } from 'buffer';
const { ICalCalendar } = require('ical-generator');

const URL = 'https://esb.optimalwayconsulting.com/fbcv/1/btz38ZsZlAdaODiH2fGsnJC9mZgSNPeR/FCBQWeb/getAllGamesByGrupWithMatchRecords/1399';
const TEAM_NAME = 'CB XIRIVELLA- CARNICAS EMBUENA';

function fetchBase64(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

function parseMatches(decodedText) {
    const matches = [];
    const regex = /idMatch\s+(\d+)[\s\S]*?nameLocalTeam\s+(.*?)\s+.*?nameVisitorTeam\s+(.*?)\s+.*?matchDay\s+(\d{4}-\d{2}-\d{2})\s+(\d{})[\s\S]*?nameField\s+(.*?)\s+adressField\s+(.*?)\s+postalCodeField\s+(\d+)[\s\S]*?nameTown\s+(.*?)\s+/g;

    let match;
    while ((match = regex.exec(decodedText)) !== null) {
        const [_, id, local, visitor, date, time, field, address, postal, town] = match;
        if (local.includes(TEAM_NAME) || visitor.includes(TEAM_NAME)) {
            matches.push({
                id,
                local,
                visitor,
                town
            });
        }
    }

    return matches;
}

function createICS(matches) {
    const cal = new ICalCalendar({ name: 'Partidos CB XIRIVELLA' });

    matches.forEach(match => {
        const start = new Date(`${match.date}T${match.time}`);
        const end = new Date(start.getTime() + 2 * 60 * 60 * 1000); // 2 horas

        cal.createEvent({
            start,
            end,
            summary: `${match.local} vs ${match.visitor}`,
            location: `${match.field}, ${match.address}, ${match.postal} ${match.town}`,
            description: `Partido de la Fase Regular - Grupo B`
        });
    });

    fs.writeFileSync('partidos_xirivella.ics', cal.toString());
    console.log('✅ Archivo partidos_xirivella.ics generado con éxito.');
}

(async () => {
    try {
        const base64 = await fetchBase64(URL);
        const decoded = Buffer.from(base64, 'base64').toString('utf-8');
        const matches = parseMatches(decoded);
        createICS(matches);
    } catch (err) {
        console.error('❌ Error:', err);
    }
})();
