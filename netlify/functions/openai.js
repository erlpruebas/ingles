// netlify/functions/openai.js
// Serverless function: recibe un prompt y devuelve la respuesta de OpenAI
// ---------------------------------------------------------------
// 1.  Incluimos un polyfill opcional para "fetch" por compatibilidad con
//     versiones antiguas de Node (ej. el entorno por defecto de Netlify
//     que todavía puede estar en Node 16).
// 2.  Lanzamos un error claro si la variable de entorno no existe.
// 3.  Añadimos console.error en el catch para ver el mensaje real cuando
//     estemos probando con `netlify dev`.

// --- Polyfill opcional ----------------------------------------------------
if (typeof fetch === 'undefined') {
  global.fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
}

// -------------------------------------------------------------------------
exports.handler = async (event) => {
  try {
    // Aseguramos que existe la clave de API antes de hacer la llamada
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY no está configurada');
    }

    const { prompt } = JSON.parse(event.body || '{}');

    if (!prompt) {
      return {
        statusCode: 400,
        body: 'Falta el parámetro "prompt" en el body'
      };
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.7,
        messages: [
          { role: 'system', content: 'Eres un profesor de inglés para niños españoles de 10‑11 años.' },
          { role: 'user',   content: prompt }
        ]
      })
    });

    if (!response.ok) {
      // Propagamos el mensaje de error original para depuración
      const txt = await response.text();
      throw new Error(`OpenAI API error ${response.status}: ${txt}`);
    }

    const data = await response.json();
    return {
      statusCode: 200,
      body: JSON.stringify({ content: data.choices[0].message.content })
    };
  } catch (err) {
    // Importante: mostramos el error en consola para depurar en local
    console.error('[openai.js] Error:', err);
    return { statusCode: 500, body: err.message };
  }
};
