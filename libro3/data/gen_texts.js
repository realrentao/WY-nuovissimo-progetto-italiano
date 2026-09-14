const fs=require('fs');
const dir='.';
const files=fs.readdirSync(dir).filter(f=>/^unit-\d\d\.js$/.test(f)).sort();
global.window={};
for(const f of files){
  const code=fs.readFileSync(f,'utf8');
  const fn=new Function('window', code);
  fn(global.window);
}
const units=global.window.NPI.units;
const order=Object.keys(units).sort();
const seen=new Set();
const texts=[];
function add(t){ if(t && String(t).trim() && !seen.has(t)){ seen.add(t); texts.push(t); } }
for(const uid of order){
  const u=units[uid];
  (u.words||[]).forEach(w=>{ if(w.it) add(w.it); if(w.ex) add(w.ex); });
  (u.phrases||[]).forEach(p=>{ if(p.it) add(p.it); if(p.ex) add(p.ex); });
  (u.sections||[]).forEach(s=>{
    if(s.type==='intro') (s.preview||[]).forEach(p=>{ if(p&&p.it) add(p.it); });
    if(s.type==='dialogue') (s.lines||[]).forEach(l=>{ if(l&&l.it) add(l.it); });
    (s.blocks||[]).forEach(b=>{ if(b&&b.kind==='quote') (b.lines||[]).forEach(ln=>{ if(ln) add(ln); }); });
  });
}
fs.writeFileSync('../texts.json', JSON.stringify(texts, null, 0));
console.log('speakable texts:', texts.length, '-> ../texts.json');
