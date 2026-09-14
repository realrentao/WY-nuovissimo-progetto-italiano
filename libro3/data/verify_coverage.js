const fs=require('fs');
const mcode=fs.readFileSync('audio-manifest.js','utf8');
const AUDIO={};
const sandbox={window:{NPI_AUDIO:{}}};
new Function('window', mcode)(sandbox.window);
Object.assign(AUDIO, sandbox.window.NPI_AUDIO);
for(const f of fs.readdirSync('.')){
  if(/^audio-manifest-\d+\.js$/.test(f)){
    const s={window:{NPI_AUDIO:{}}};
    new Function('window', fs.readFileSync(f,'utf8'))(s.window);
    Object.assign(AUDIO, s.window.NPI_AUDIO);
  }
}
const units={};
for(const f of fs.readdirSync('.').filter(x=>/^unit-\d\d\.js$/.test(x))){
  const s={window:{}};
  new Function('window', fs.readFileSync(f,'utf8'))(s.window);
  Object.assign(units, s.window.NPI.units);
}
const seen=new Set();
const texts=[];
function add(t){ if(t&&String(t).trim()&&!seen.has(t)){seen.add(t);texts.push(t);} }
for(const uid of Object.keys(units).sort()){
  const u=units[uid];
  (u.words||[]).forEach(w=>{ if(w.it) add(w.it); if(w.ex) add(w.ex); });
  (u.phrases||[]).forEach(p=>{ if(p.it) add(p.it); if(p.ex) add(p.ex); });
  (u.sections||[]).forEach(s=>{
    if(s.type==='intro')(s.preview||[]).forEach(p=>{ if(p&&p.it) add(p.it); });
    if(s.type==='dialogue')(s.lines||[]).forEach(l=>{ if(l&&l.it) add(l.it); });
    (s.blocks||[]).forEach(b=>{ if(b&&b.kind==='quote')(b.lines||[]).forEach(ln=>{ if(ln) add(ln); }); });
  });
}
let missing=0;
const miss=[];
for(const t of texts){
  if(!AUDIO[t]){ missing++; if(miss.length<20) miss.push(t); }
}
console.log('speakable 文本总数:', texts.length);
console.log('manifest 键数:', Object.keys(AUDIO).length);
console.log('未覆盖(朗读将 404):', missing);
if(missing) console.log('缺失样例:', miss);
console.log(missing===0 ? 'OK 覆盖率 100%，朗读 0 未解析' : 'FAIL 需补音频');
process.exit(missing===0?0:1);
