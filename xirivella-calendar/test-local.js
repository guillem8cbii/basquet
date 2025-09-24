// test-local.js - Script para probar la funcionalidad localmente
const fs = require('fs');
const path = require('path');

// Importar la función del calendario
const calendarFunction = require('./api/calendar');

// Crear un mock de req y res para testing
const mockReq = {
  method: 'GET',
  url: '/api/calendar'
};

const mockRes = {
  statusCode: 200,
  headers: {},
  
  setHeader(name, value) {
    this.headers[name] = value;
  },
  
  status(code) {
    this.statusCode = code;
    return this;
  },
  
  json(data) {
    console.log('Response JSON:', JSON.stringify(data, null, 2));
    return this;
  },
  
  send(data) {
    if (typeof data === 'string' && data.includes('BEGIN:VCALENDAR')) {
      // Es un archivo ICS, guardarlo para inspección
      const filename = 'xirivella-partidos-test.ics';
      fs.writeFileSync(filename, data);
      console.log(`✅ Archivo ICS generado correctamente: ${filename}`);
      console.log(`📅 Tamaño del archivo: ${data.length} bytes`);
      
      // Mostrar las primeras líneas para verificación
      const lines = data.split('\n').slice(0, 15);
      console.log('\n📋 Primeras líneas del archivo ICS:');
      lines.forEach(line => console.log(line));
      
      if (data.split('\n').length > 15) {
        console.log('...');
        console.log(`(Total: ${data.split('\n').length} líneas)`);
      }
    } else {
      console.log('Response:', data);
    }
    return this;
  },
  
  end() {
    console.log('Response ended');
    return this;
  }
};

// Ejecutar el test
async function testCalendar() {
  console.log('🧪 Iniciando test del calendario de Xirivella...\n');
  
  try {
    await calendarFunction(mockReq, mockRes);
    
    if (mockRes.statusCode === 200) {
      console.log('\n✅ Test completado exitosamente!');
      console.log('📄 Revisa el archivo "xirivella-partidos-test.ics" generado');
      console.log('\n🔗 Para importar en Google Calendar:');
      console.log('1. Ve a Google Calendar');
      console.log('2. Haz clic en "+" junto a "Otros calendarios"');
      console.log('3. Selecciona "Importar"');
      console.log('4. Sube el archivo xirivella-partidos-test.ics');
    } else {
      console.log(`❌ Test falló con código: ${mockRes.statusCode}`);
    }
  } catch (error) {
    console.error('❌ Error durante el test:', error.message);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testCalendar();
}

module.exports = { testCalendar };