import { readFile,writeFile } from 'node:fs/promises';
const lock=JSON.parse(await readFile('package-lock.json','utf8'));
const rows=Object.entries(lock.packages).filter(([path])=>path.startsWith('node_modules/')).map(([path,p])=>({name:path.slice(13),version:p.version,license:p.license??'See package distribution'}));
rows.sort((a,b)=>a.name.localeCompare(b.name));
await writeFile('THIRD_PARTY_NOTICES.md','# Third party dependency licenses\n\nDirect and transitive package licenses reported by the checked-in npm lockfile. Package distributions contain authoritative notices. RepoRecode original artwork is MIT; Google Fonts retain their respective font licenses.\n\n| Package | Version | Reported license |\n| --- | --- | --- |\n'+rows.map(r=>`| ${r.name} | ${r.version} | ${r.license} |`).join('\n')+'\n');
console.log(`Recorded ${rows.length} package license entries.`);
