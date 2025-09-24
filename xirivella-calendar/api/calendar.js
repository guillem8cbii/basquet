// api/calendar.js - Vercel Serverless Function
const https = require('https');

function fetchData(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

function base64ToJson(base64String) {
  try {
    const decodedString = Buffer.from(base64String, 'base64').toString('utf-8');
    return JSON.parse(decodedString);
  } catch (error) {
    throw new Error('Error decoding base64 or parsing JSON: ' + error.message);
  }
}

function formatDate(dateStr) {
  // Convertir fecha y hora a formato UTC para .ics
  const date = new Date(dateStr);
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function generateICS(matches) {
  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Xirivella FC//Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Partidos Xirivella',
    'X-WR-TIMEZONE:Europe/Madrid'
  ];

  matches.forEach((match, index) => {
    // Generar un UID único para cada evento
    const uid = `xirivella-${match.id || index}-${Date.now()}@xirivella-calendar`;
    
    // Formatear fecha y hora
    const startDate = formatDate(match.fecha + 'T' + (match.hora || '00:00'));
    const endDate = formatDate(match.fecha + 'T' + (match.hora ? 
      new Date(new Date(match.fecha + 'T' + match.hora).getTime() + 90 * 60000).toTimeString().substr(0,5) : 
      '01:30'));

    // Crear descripción del evento
    const homeTeam = match.equipoLocal || 'Local';
    const awayTeam = match.equipoVisitante || 'Visitante';
    const location = match.campo || match.ubicacion || 'Campo por determinar';
    const competition = match.competicion || match.categoria || 'Competición';
    
    icsContent.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTART:${startDate}`,
      `DTEND:${endDate}`,
      `SUMMARY:${homeTeam} vs ${awayTeam}`,
      `DESCRIPTION:${competition}\\nEquipo Local: ${homeTeam}\\nEquipo Visitante: ${awayTeam}`,
      `LOCATION:${location}`,
      'STATUS:CONFIRMED',
      'TRANSP:OPAQUE',
      `DTSTAMP:${formatDate(new Date().toISOString())}`,
      'END:VEVENT'
    );
  });

  icsContent.push('END:VCALENDAR');
  return icsContent.join('\r\n');
}

function filterXirivellaMatches(data) {
  let matches = [];
  
  // Función recursiva para buscar partidos en la estructura de datos
  function searchMatches(obj) {
    if (Array.isArray(obj)) {
      obj.forEach(item => searchMatches(item));
    } else if (typeof obj === 'object' && obj !== null) {
      // Buscar si es un partido
      if (obj.equipoLocal || obj.equipoVisitante || obj.local || obj.visitante) {
        const homeTeam = obj.equipoLocal || obj.local || '';
        const awayTeam = obj.equipoVisitante || obj.visitante || '';
        
        // Verificar si Xirivella está involucrado
        if (homeTeam.toLowerCase().includes('xirivella') || 
            awayTeam.toLowerCase().includes('xirivella')) {
          matches.push(obj);
        }
      }
      
      // Continuar buscando en las propiedades del objeto
      Object.values(obj).forEach(value => searchMatches(value));
    }
  }
  
  searchMatches(data);
  return matches;
}

module.exports = async (req, res) => {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    console.log('Fetching data from API...');
    
    // Obtener datos de la API
    const apiUrl = 'https://esb.optimalwayconsulting.com/fbcv/1/btz38ZsZlAdaODiH2fGsnJC9mZgSNPeR/FCBQWeb/getAllGamesByGrupWithMatchRecords/1399';
    const response = await fetchData(apiUrl);
    
    console.log('Data received, processing...');
    
    let parsedData;
    
    // Si la respuesta es un string base64, decodificarlo
    if (typeof response === 'string') {
      try {
        parsedData = base64ToJson(response);
      } catch (e) {
        // Si no es base64, intentar como JSON directo
        parsedData = JSON.parse(response);
      }
    } else {
      parsedData = response;
    }
    
    console.log('Filtering Xirivella matches...');
    
    // Filtrar partidos de Xirivella
    const xirivellaMatches = filterXirivellaMatches(parsedData);
    
    console.log(`Found ${xirivellaMatches.length} Xirivella matches`);
    
    if (xirivellaMatches.length === 0) {
      return res.status(404).json({ 
        error: 'No se encontraron partidos de Xirivella',
        debug: 'Verifique que los datos contengan partidos con "Xirivella" en el nombre del equipo'
      });
    }
    
    // Generar archivo ICS
    const icsContent = generateICS(xirivellaMatches);
    
    // Configurar headers para descarga del archivo .ics
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="xirivella-partidos.ics"');
    
    return res.status(200).send(icsContent);
    
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      error: 'Error al procesar los datos',
      message: error.message,
      debug: 'Verifique la URL de la API y el formato de los datos'
    });
  }
};