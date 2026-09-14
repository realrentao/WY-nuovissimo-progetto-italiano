const fs=require('fs');
const files=fs.readdirSync('.').filter(f=>/^unit-\d\d\.js$/.test(f)).sort();
let bad=0;
for(const f of files){
  try{
    const code=fs.readFileSync(f,'utf8');
    const sandbox={window:{}};
    const fn=new Function('window', code+'; return window.NPI;');
    const NPI=fn(sandbox.window);
    const u=NPI.units[f.match(/\d\d/)[0]];
    if(!u){console.log(f,'NO UNIT');bad++;continue;}
    const w=(u.words||[]).length, p=(u.phrases||[]).length, s=(u.sections||[]).length;
    if(w<35||w>50||p<10||p>16||s<5){console.log(f,`WARN words=${w} phrases=${p} sections=${s}`);}
    else console.log(f,`OK words=${w} phrases=${p} sections=${s}`);
  }catch(e){console.log(f,'ERR',e.message);bad++;}
}
console.log('files:',files.length,'errors:',bad);
