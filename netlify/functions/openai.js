// netlify/functions/openai.js
// Serverless function: recibe un prompt y devuelve la respuesta de OpenAI

// --- Polyfill opcional ----------------------------------------------------
if (typeof fetch === 'undefined') {
  global.fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
}

// -------------------------------------------------------------------------
exports.handler = async (event) => {
  try {
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

    const model = process.env.OPENAI_MODEL || 'gpt-4.1-nano';


    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        max_tokens: 2000,
        messages: [
          { role: 'system', content: 'Eres un profesor de inglés experto. Crea ejercicios progresivos que consoliden conocimientos previos e introduzcan nuevos conceptos gradualmente.' },
          { role: 'user',   content: prompt }
        ]
      })
    });

    if (!response.ok) {
      const txt = await response.text();
      throw new Error(`OpenAI API error ${response.status}: ${txt}`);
    }

    const data = await response.json();
    return {
      statusCode: 200,
      body: JSON.stringify({ content: data.choices[0].message.content })
    };
  } catch (err) {
    console.error('[openai.js] Error:', err);
    return { statusCode: 500, body: err.message };
  }
};
