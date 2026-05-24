const fs = require('fs');
const inPath = 'src/data/faculdades.json';
const outPath = inPath;

function stripDiacritics(s){
  return s.normalize('NFD').replace(/\p{Diacritic}/gu,'');
}

function canonicalKey(s){
  return stripDiacritics(s).toLowerCase().replace(/[^a-z0-9\s]/g,'').replace(/\s+/g,' ').trim();
}

const smallWords = new Set(['de','do','da','dos','das','e','em','no','na','nos','nas','por','para','com','da(o)']);

function titleCaseName(name){
  const words = name.replace(/\s+/g,' ').trim().split(' ');
  return words.map(token=>{
    if(!token) return '';
    // handle parentheses: if inner is a short token (no spaces, <=5 chars) uppercase it, else title-case
    const paren = token.match(/\(([^)]+)\)/);
    if(paren){
      const inner = paren[1];
      if(!/\s/.test(inner) && inner.replace(/[^A-Za-z0-9]/g,'').length <= 5){
        // uppercase short acronyms
        const upperInner = inner.replace(/[^A-Za-z0-9-]/g,'').toUpperCase();
        return token.replace(paren[1], upperInner);
      }
    }
    const core = token.replace(/[()]/g,'');
    const lower = core.toLowerCase();
    if(smallWords.has(lower)) return lower;
    // Capitalize first letter, keep rest lower
    const cased = lower.charAt(0).toUpperCase() + lower.slice(1);
    return cased;
  }).join(' ');
}

try{
  const raw = fs.readFileSync(inPath,'utf8');
  const list = JSON.parse(raw);
  const map = new Map();
  list.forEach(orig => {
    if(!orig || typeof orig !== 'string') return;
    const s = orig.replace(/\s+/g,' ').trim();
    const key = canonicalKey(s);
    if(!key) return;
    if(map.has(key)){
      const prev = map.get(key);
      // prefer the longer/more descriptive name
      if (s.length > prev.length) map.set(key, s);
    } else {
      map.set(key, s);
    }
  });

  // produce normalized display names
  const normalized = Array.from(map.values()).map(name => {
    // if name already mostly Title/Proper, keep simple normalization
    const cleaned = name.replace(/\s+/g,' ').trim();
    return titleCaseName(cleaned);
  });

  // final dedupe and sort by canonical key
  const finalMap = new Map();
  normalized.forEach(n => {
    const k = canonicalKey(n);
    if(!finalMap.has(k)) finalMap.set(k, n);
  });

  const finalList = Array.from(finalMap.entries()).sort((a,b)=>a[0].localeCompare(b[0],'pt')).map(e=>e[1]);
  fs.writeFileSync(outPath, JSON.stringify(finalList, null, 2), 'utf8');
  console.log('Updated', outPath, 'count=', finalList.length);
}catch(err){
  console.error('ERROR normalizing faculdades:', err && err.message);
  process.exit(1);
}
