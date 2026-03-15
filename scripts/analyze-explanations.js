const http = require('http');
function apiGet(url) {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:3001' + url, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    }).on('error', reject);
  });
}
async function main() {
  const {data: exams} = await apiGet('/api/exams');
  const eraTopics = {};
  for (const exam of exams.sort((a,b) => a.examNumber - b.examNumber)) {
    const {data: qs} = await apiGet('/api/questions?examId=' + exam.id);
    for (const q of qs) {
      if (!q.explanation) continue;
      if (!eraTopics[q.era]) eraTopics[q.era] = [];
      // Extract 2+ char Korean words from explanation
      const words = q.explanation.replace(/[^가-힣\s]/g, ' ').split(/\s+/).filter(w => w.length >= 2);
      eraTopics[q.era].push(...words);
    }
  }
  for (const era of Object.keys(eraTopics)) {
    const freq = {};
    eraTopics[era].forEach(w => { freq[w] = (freq[w] || 0) + 1; });
    const top = Object.entries(freq).sort((a,b) => b[1] - a[1]).slice(0, 40);
    console.log('\n=== ' + era + ' ===');
    console.log(top.map(([w,c]) => w + '(' + c + ')').join(', '));
  }
}
main().catch(console.error);
