// Condense a ui_crawl.mjs output file for the report:
//   node summarize.mjs out.json
// Prints the P0 / P1 / CHECK items in full, and P2 / ENV items grouped by area.
import { readFileSync } from 'node:fs';

const text = readFileSync(process.argv[2] || 'out.json', 'utf8');
const j = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('SUMMARY')));
console.log(`${j.base} role=${j.role} viewport=${j.viewport} clicked=${j.clicked}`);
if (j.externalHosts.length) console.log(`external links (not fetched): ${j.externalHosts.join(', ')}`);
for (const sev of ['P0', 'P1', 'CHECK']) {
  for (const i of j.issues.filter((x) => x.severity === sev)) console.log(`${sev} [${i.area}] ${i.what} @ ${i.where}`);
}
for (const sev of ['P2', 'ENV']) {
  const group = {};
  for (const i of j.issues.filter((x) => x.severity === sev)) (group[i.area] ||= []).push(i.where || i.what);
  for (const [area, list] of Object.entries(group)) console.log(`${sev} [${area}] x${list.length} e.g. ${list.slice(0, 3).join(' ; ')}`);
}
