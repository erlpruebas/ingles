<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Curso de Inglés</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    :root{--bg:#121212;--surface:#1e1e1e;--text:#e0e0e0;--primary:#bb86fc;--accent:#03dac6;--rad:12px}
    *{box-sizing:border-box}
    body{margin:0;font-family:'Segoe UI',Roboto,sans-serif;background:var(--bg);color:var(--text);line-height:1.6;padding:1rem}
    h1,h2{color:var(--primary)}
    section{background:var(--surface);border-radius:var(--rad);padding:1rem 1.5rem;margin-bottom:2rem;box-shadow:0 4px 12px rgba(0,0,0,.5)}
    button{background:var(--primary);color:var(--text);border:none;padding:.5rem 1rem;border-radius:var(--rad);cursor:pointer;font-size:1rem;margin-top:.5rem}
    button:hover{background:var(--accent)}
    .hidden{display:none}
    .item{margin-bottom:.9rem}
    .example{font-style:italic;font-size:.95rem}
    .example strong{color:var(--accent)}
    .note{margin:0 0 .5rem;color:var(--accent);font-size:.9rem}
    #finish-btn{display:block;margin:2rem auto}
    #status{color:var(--accent);margin-bottom:1rem;min-height:1.4em}
    #review-list{display:grid;grid-template-columns:1fr 1fr;gap:.75rem}
    #chat-box{max-height:220px;overflow-y:auto;padding:1rem;border:1px solid #555;border-radius:var(--rad);background:var(--surface);font-size:.95rem;margin-bottom:1rem}
    #chat-box div{margin-bottom:.5rem}
    .speak{cursor:pointer;margin-left:.4rem}
    /*----- diccionario en 4 columnas -----*/
    #dict-box{column-count:4;column-gap:1rem}
    /* botones extra */
    #clear-dict{background:#e35353}
    @media (max-width:600px){
      body{padding:.5rem}
      section{padding:.75rem 1rem;margin-bottom:1.2rem}
      h1{font-size:1.4rem;text-align:center}
      h2{font-size:1.1rem}
      #review-list{grid-template-columns:1fr}
      button{width:100%}
    }
  </style>
</head>
<body>
<h1>Curso de Inglés</h1>
<p id="status"></p>

<section><h2>Vocabulario</h2><p class="note">Copia 10&nbsp;veces cada palabra en tu cuaderno para aprenderlas.</p><div id="vocab-list"></div></section>
<section><h2>Ejercicios</h2><p class="note">Traduce al inglés en tu cuaderno y, si encuentras palabras que no conoces, cópialas diez veces para aprenderlas.</p><div id="exercise-list"></div></section>
<section><h2>Repaso</h2><p class="note">Traduce estas palabras al inglés en tu cuaderno y, si alguna no te la sabes, cópiala diez veces para aprenderla.</p><div id="review-list"></div></section>

<section>
  <h2>Pregúntame si tienes dudas</h2>
  <div id="chat-box"></div>
  <input id="chat-input" placeholder="Escribe tu pregunta…" style="width:100%;padding:.5rem;border-radius:var(--rad);border:none">
  <button id="chat-send">Enviar</button>
</section>

<button id="finish-btn">Dar por terminada la lección</button>

<!-- ---------- Diccionario completo ---------- -->
<section id="dict-section">
  <div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap">
    <button id="show-dict">Ver diccionario completo</button>
    <button id="clear-dict" class="hidden">Borrar diccionario</button>
  </div>
  <div id="dict-box" class="hidden" style="margin-top:.8rem;white-space:pre-wrap;font-size:.95rem"></div>
</section>

<!-- ---------- Sobre la aplicación ---------- -->
<section id="about-section">
  <h2 style="margin-bottom:0">
    <button id="toggle-about" style="all:unset;cursor:pointer;color:var(--primary)">▸ Sobre la aplicación</button>
  </h2>
  <p id="about-text" class="hidden" style="margin-top:.5rem">
    <em>Curso de Inglés</em> es un pequeño experimento de programación
    utilizando Inteligencia Artificial,<br>creado por <strong>Emilio Rodríguez</strong>.
  </p>
</section>

<script>
/* ---------- configuración ---------- */
const DICT_KEY='curso_ingles_diccionario';
const ENDPOINT='/.netlify/functions/openai';
const TTS_ENDPOINT='/.netlify/functions/tts';

/* ---------- referencias DOM ---------- */
const vocabEl=document.getElementById('vocab-list');
const exEl=document.getElementById('exercise-list');
const repEl=document.getElementById('review-list');
const statusEl=document.getElementById('status');
const chatBox=document.getElementById('chat-box');
const chatInp=document.getElementById('chat-input');
const dictBox=document.getElementById('dict-box');
const btnShow=document.getElementById('show-dict');
const btnClear=document.getElementById('clear-dict');
const aboutText=document.getElementById('about-text');
const toggleAbout=document.getElementById('toggle-about');

/* ---------- estado ---------- */
let dictionary=JSON.parse(localStorage.getItem(DICT_KEY)||'[]');
let currentLesson=null;
function setStatus(msg){ statusEl.textContent=msg; }

/* ---------- controlar restauración de scroll ---------- */
if ('scrollRestoration' in history) history.scrollRestoration='manual';

/* ---------- utilidades ---------- */
function decodeEmojis(s=''){return String(s).replace(/\\u([\\da-fA-F]{4})/g,(_,h)=>String.fromCharCode(parseInt(h,16)));}
function stripEmojis(s){return decodeEmojis(s).replace(/\p{Extended_Pictographic}/gu,'').trim();}
function safeJSON(t){try{return JSON.parse(t.replace(/```json|```/gi,'').trim());}catch{const m=t.match(/\{[\s\S]*\}/);if(m)try{return JSON.parse(m[0]);}catch{};return null;}}
async function askOpenAI(prompt){const r=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt})});if(!r.ok)throw new Error(r.statusText);return (await r.json()).content.trim();}

/* ---------- TTS ---------- */
const audioCache=new Map();
async function speak(el,txt){if(audioCache.has(txt)){new Audio(audioCache.get(txt)).play();return;}el.textContent='⏳';try{const r=await fetch(TTS_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:txt})});if(!r.ok)throw new Error('TTS error');const b64=(await r.json()).audio;const blob=await fetch(`data:audio/mp3;base64,${b64}`).then(r=>r.blob());const url=URL.createObjectURL(blob);audioCache.set(txt,url);el.textContent='🔊';new Audio(url).play();}catch(e){el.textContent='❌';console.error(e);}}
const speakIcon=t=>` <span class="speak" data-text="${t}">🔊</span>`;

/* ---------- generación de datos ---------- */
async function fetchNewWords(){
  setStatus('🔎 Obteniendo palabras…');
  const banned=dictionary.map(w=>w.en).join(', ');
  const prompt=`Devuélveme SOLO JSON {"vocabulario":[{en,es}]×10}. Palabras útiles del día a día (incluye verbos y sustantivos comunes). No repitas ninguna de estas: ${banned}.`;
  for(let i=0;i<3;i++){
    const obj=safeJSON(await askOpenAI(prompt));
    if(obj?.vocabulario?.length===10){
      const arr=obj.vocabulario.map(o=>({en:o.en.trim(),es:o.es.trim()})).filter(w=>w.en&&w.es);
      if(arr.length===10) return arr;
    }
  }
  throw new Error('No se obtuvieron 10 palabras válidas');
}

async function fetchLesson(words){
  setStatus('🛠️ Generando ejercicios…');
  const listado=words.map(w=>`${w.en}:${w.es}`).join(', ');
  const extra=dictionary.filter(d=>!words.some(w=>w.en===d.en)).slice(0,10).map(d=>`${d.en}:${d.es}`).join(', ');
  const prompt=`Tienes estas 10 palabras nuevas: ${listado}.
Devuelve SOLO JSON:
1) "vocabulario": 10 objetos {en,es,ej_en,ej_es}. ej_es termina con 1 emoji.
2) "ejercicios": 10 objetos {es,en}.  
   – Frases simples, nivel principiante, independientes (sin historia).  
   – 5 en presente, 3 en pasado, 2 en futuro.  
   – EXACTAMENTE 2 negativas y 2 interrogativas.  
   – Cada ES usa una palabra nueva (todas deben aparecer) y termina con un emoji.  
   – EN es la traducción y termina con el MISMO emoji.  
3) "repaso": 20 objetos {es,en} (10 nuevas + 10 del resto del diccionario).`;
  const obj=safeJSON(await askOpenAI(prompt));
  if(!obj) throw new Error('JSON lección inválido');
  ['vocabulario','ejercicios','repaso'].forEach(k=>{
    if(!obj[k]) return;
    if(Array.isArray(obj[k])) return;
    const valObj=obj[k];
    if(k==='repaso'){
      const sample=Object.values(valObj)[0];
      obj[k]=typeof sample==='string'
        ? Object.entries(valObj).map(([es,en])=>({es,en}))
        : Object.values(valObj);
    }else obj[k]=Object.values(valObj);
  });
  return obj;
}

/* ---------- render ---------- */
function renderLesson(les){
  vocabEl.innerHTML=exEl.innerHTML=repEl.innerHTML='';
  les.vocabulario.forEach(w=>{
    vocabEl.insertAdjacentHTML('beforeend',
      `<div class="item"><strong>${w.es}</strong> – ${w.en}${speakIcon(w.en)}<br>
       <span class="example">${decodeEmojis(w.ej_es)}<br>
       <strong>${stripEmojis(w.ej_en)}</strong>${speakIcon(w.ej_en)}</span></div>`);
  });
  les.ejercicios.forEach((f,i)=>{
    exEl.insertAdjacentHTML('beforeend',
      `<div class="item">${i+1}. ${decodeEmojis(f.es)}
         <button class="show">Solución</button>
         <span class="hidden">${stripEmojis(f.en)}${speakIcon(f.en)}</span></div>`);
  });
  les.repaso.forEach(p=>{
    const esTxt=p.es??p.espanol??(Array.isArray(p)?p[0]:Object.values(p)[0]);
    const enTxt=p.en??p.ingles ??(Array.isArray(p)?p[1]:Object.values(p)[1]??'');
    repEl.insertAdjacentHTML('beforeend',
      `<div class="item">${decodeEmojis(esTxt)}
         <button class="show">Solución</button>
         <span class="hidden">${decodeEmojis(enTxt)}${speakIcon(enTxt)}</span></div>`);
  });
  currentLesson=les;
}

/* ---------- eventos ---------- */
document.addEventListener('click',e=>{
  if(e.target.classList.contains('speak')) speak(e.target,e.target.dataset.text);
  if(e.target.classList.contains('show'))  e.target.nextElementSibling.classList.toggle('hidden');
});

/* ---------- flujo principal ---------- */
async function generate(){
  try{
    const words  = await fetchNewWords();
    const lesson = await fetchLesson(words);
    const extra  = dictionary.filter(d=>!words.some(w=>w.en===d.en)).sort(()=>Math.random()-0.5).slice(0,10).map(d=>({es:d.es,en:d.en}));
    lesson.repaso=[...words.map(w=>({es:w.es,en:w.en})), ...extra];
    renderLesson(lesson);
    setStatus('✅ Lección lista');
  }catch(e){
    console.error(e);
    setStatus('Cargando página…');
    setTimeout(()=>location.reload(),1500);
  }
}
window.addEventListener('load',()=>navigator.onLine?generate():setStatus('Sin conexión'));

/* ---------- botón FIN ---------- */
document.getElementById('finish-btn').addEventListener('click',()=>{
  if(!currentLesson) return;
  currentLesson.vocabulario.forEach(w=>{
    if(!dictionary.some(d=>d.en===w.en)) dictionary.push({en:w.en,es:w.es});
  });
  localStorage.setItem(DICT_KEY,JSON.stringify(dictionary));
  document.querySelectorAll('.item span:not(.hidden)').forEach(el=>el.classList.add('hidden'));
  dictBox.classList.add('hidden'); btnClear.classList.add('hidden'); btnShow.textContent='Ver diccionario completo';
  aboutText.classList.add('hidden'); toggleAbout.textContent='▸ Sobre la aplicación';
  window.scrollTo({top:0,left:0,behavior:'smooth'});
  setTimeout(()=>location.reload(),500);
});

/* ---------- CHAT ---------- */
document.getElementById('chat-send').onclick=sendChat;
chatInp.addEventListener('keypress',e=>{if(e.key==='Enter')sendChat();});
async function sendChat(){
  const q=chatInp.value.trim(); if(!q) return; chatInp.value='';
  chatBox.insertAdjacentHTML('beforeend',`<div><strong>Tú:</strong> ${q}</div>`); chatBox.scrollTop=chatBox.scrollHeight;
  try{
    const a=await askOpenAI(`Actúa como profesor de inglés (niños 10‑11 años). Responde brevemente: ${q}`);
    chatBox.insertAdjacentHTML('beforeend',`<div><strong>ChatGPT:</strong> ${a}</div>`); chatBox.scrollTop=chatBox.scrollHeight;
  }catch(e){chatBox.insertAdjacentHTML('beforeend',`<div style="color:#ff6b6b;">Error: ${e.message}</div>`);}
}

/* ---------- Diccionario completo ---------- */
btnShow.addEventListener('click',()=>{
  if(dictBox.classList.contains('hidden')){
    const list=JSON.parse(localStorage.getItem(DICT_KEY)||'[]');
    dictBox.textContent=list.length?list.map((w,i)=>`${i+1}. ${w.es} – ${w.en}`).join('\n'):'(diccionario vacío)';
    dictBox.classList.remove('hidden'); btnClear.classList.remove('hidden'); btnShow.textContent='Ocultar diccionario';
  }else{
    dictBox.classList.add('hidden'); btnClear.classList.add('hidden'); btnShow.textContent='Ver diccionario completo';
  }
});
btnClear.addEventListener('click',()=>{
  if(confirm('¿Borrar todo el diccionario guardado?')){localStorage.removeItem(DICT_KEY);dictionary=[];dictBox.textContent='(diccionario borrado)';}
});

/* ---------- Sobre la aplicación ---------- */
toggleAbout.addEventListener('click',()=>{
  const open=!aboutText.classList.toggle('hidden');
  toggleAbout.textContent=(open?'▾':'▸')+' Sobre la aplicación';
});
</script>
</body>
</html>
