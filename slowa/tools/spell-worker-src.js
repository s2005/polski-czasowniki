// Исходник slowa/spell-worker.js — проверка орфографии Hunspell (WASM) в Web Worker.
// Сборка (из папки slowa/tools):
//   npm i hunspell-asm@4.0.2 esbuild
//   npx esbuild spell-worker-src.js --bundle --minify --format=iife --platform=browser --outfile=../spell-worker.js
// Словарь: npm-пакет dictionary-pl@2.0.0 (SJP.PL), index.aff → ../pl_aff.txt, index.dic → ../pl_dic.txt.
const { loadModule } = require('hunspell-asm/dist/cjs/index.js');
let h = null;
const ready = (async () => {
  const [f, aff, dic] = await Promise.all([
    loadModule(),
    fetch('pl_aff.txt').then(r => { if (!r.ok) throw new Error('aff ' + r.status); return r.arrayBuffer(); }),
    fetch('pl_dic.txt').then(r => { if (!r.ok) throw new Error('dic ' + r.status); return r.arrayBuffer(); }),
  ]);
  const a = f.mountBuffer(new Uint8Array(aff), 'pl.aff');
  const d = f.mountBuffer(new Uint8Array(dic), 'pl.dic');
  h = f.create(a, d);
})();
ready.then(() => postMessage({ type: 'ready' }), e => postMessage({ type: 'error', message: String(e && e.message || e) }));
onmessage = async ({ data }) => {
  await ready.catch(() => {});
  if (!h) return;
  if (data.type === 'check') {
    const res = {};
    for (const w of data.words) res[w] = h.spell(w);
    postMessage({ type: 'checked', res });
  } else if (data.type === 'suggest') {
    postMessage({ type: 'suggested', word: data.word, list: h.suggest(data.word).slice(0, 6) });
  }
};
