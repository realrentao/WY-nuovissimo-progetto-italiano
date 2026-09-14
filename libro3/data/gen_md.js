const fs=require('fs');
const ids=process.argv.slice(2);
for(const id of ids){
  const f=`unit-${id}.js`;
  if(!fs.existsSync(f)){console.log('MISSING',f);continue;}
  const code=fs.readFileSync(f,'utf8');
  const sandbox={window:{}};
  const fn=new Function('window', code+'; return window.NPI;');
  const NPI=fn(sandbox.window);
  const u=NPI.units[id];
  let md=`# Unità ${id} — ${u.title}\n\n`;
  md+=`> ${u.titleZh||''}\n\n`;
  if(u.tema) md+=`**Tema:** ${u.tema}\n\n`;
  // words
  md+=`## 词汇（Words）\n\n`;
  md+=`| Italiano | 词性 | 中文 | 例句 |\n|---|---|---|---|\n`;
  for(const w of u.words||[]){
    md+=`| ${w.it} | ${w.pos||''} | ${w.zh||''} | ${w.ex||''} |\n`;
  }
  md+=`\n`;
  // phrases
  md+=`## 实用句型（Phrases）\n\n`;
  md+=`| Italiano | 中文 |\n|---|---|\n`;
  for(const p of u.phrases||[]){
    md+=`| ${p.it} | ${p.zh||''} |\n`;
  }
  md+=`\n`;
  // sections
  let secN=0;
  for(const s of u.sections||[]){
    secN++;
    md+=`## ${secN}. ${s.title} _(${s.type})_\n\n`;
    if(s.goals){ md+=`**Obiettivi:**\n\n`+s.goals.map(g=>`- ${g}`).join('\n')+`\n\n`; }
    if(s.lines){
      md+=`${s.lines.map(l=>`- **${l.who?l.who+': ':''}${l.it}** — ${l.zh||''}`).join('\n')}\n\n`;
    }
    if(s.body){ md+=`${s.body}\n\n`; }
    if(s.blocks){
      for(const b of s.blocks){
        if(b.title) md+=`### ${b.title}\n\n`;
        if(b.kind==='table'){
          md+=`| ${b.head.join(' | ')} |\n| ${b.head.map(()=>'---').join(' | ')} |\n`+
            b.rows.map(r=>'| '+r.join(' | ')+' |').join('\n')+`\n\n`;
        } else if(b.kind==='quote'){
          md+=`> ${b.lines.join('\n> ')}\n\n`;
        } else if(b.text){
          md+=`${b.text}\n\n`;
        }
      }
    }
    if(s.table){
      for(const t of s.table){
        md+=`| ${t.head.join(' | ')} |\n| ${t.head.map(()=>'---').join(' | ')} |\n`+
          t.rows.map(r=>'| '+r.join(' | ')+' |').join('\n')+`\n\n`;
      }
    }
    if(s.items){ md+=s.items.map(i=>`- ${i}`).join('\n')+`\n\n`; }
  }
  fs.writeFileSync(`../npi3_md/clean/unit-${id}.md`, md);
  console.log('wrote unit-'+id+'.md ('+md.length+' chars)');
}
