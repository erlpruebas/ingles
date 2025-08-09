const fetch = require('node-fetch');

exports.handler = async (event) => {
  try {
    const { action, details } = JSON.parse(event.body);
    const ip = event.headers['x-forwarded-for'] || 'desconocida';
    const timestamp = new Date().toISOString();

    const log = {
      timestamp,
      ip,
      action,
      details,
      key: '12345ABC'
    };

    const scriptURL = 'https://script.google.com/macros/s/AKfycby5PqgWR73Ed19XEQOIHLYNEstSs1wWx8o9NUMsn-JEUZU0hPSwsxkm86nzixbWGxq7xQ/exec';

    const response = await fetch(scriptURL, {
      method: 'POST',
      body: JSON.stringify(log),
      headers: { 'Content-Type': 'application/json' }
    });

    const text = await response.text(); // leer como texto, no como JSON
console.log('Respuesta de Google:', text);   // ← AÑADE ESTA LÍNEA


    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, respuestaGoogle: text }) // lo envolvemos como JSON válido
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: String(err) }) // ahora es un JSON válido
    };
  }
};
