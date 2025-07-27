// netlify/functions/tts.js
if (typeof fetch === 'undefined') {
  global.fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
}

exports.handler = async (event) => {
  try {
    const { text } = JSON.parse(event.body || '{}');
    if (!text) return { statusCode: 400, body: 'Falta texto' };

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY no definida');
    }

    // Llamada a OpenAI TTS -> devuelve audio/mpeg
    const resp = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'tts-1',
        voice: 'alloy',
        input: text,
        format: 'mp3'
      })
    });

    if (!resp.ok) {
      console.error('[TTS]', resp.status, await resp.text());
      return { statusCode: resp.status, body: 'TTS error' };
    }

    // Leemos el cuerpo como arrayBuffer
    const arrayBuffer = await resp.arrayBuffer();
    // Convertimos ese buffer a base64
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    // Devolvemos un JSON { audio: "<base64>" }
    return {
      statusCode: 200,
      body: JSON.stringify({ audio: base64 })
    };

  } catch (err) {
    console.error('[tts.js] Error:', err);
    return { statusCode: 500, body: err.message };
  }
};
