/**
 * Batch import explanations from PDF files into the author tool.
 * Reads PDF explanation files, extracts per-question explanations,
 * and uploads them via the bulk-explanations API.
 *
 * Usage: cd author-tool && node ../scripts/batch-import-explanations.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { PDFParse } = require(path.join(__dirname, '..', 'author-tool', 'node_modules', 'pdf-parse'));

const PDF_DIR = path.join('C:', 'Users', '101024', 'OneDrive', '1. projects (new)', '9. 한능검', '1. 기출문제', '해설집');
const API_BASE = 'http://localhost:3001';

function apiGet(url) {
  return new Promise((resolve, reject) => {
    http.get(API_BASE + url, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`API parse error: ${data.substring(0, 200)}`)); }
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

function apiPut(url, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = http.request(API_BASE + url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`API parse error: ${data.substring(0, 200)}`)); }
      });
      res.on('error', reject);
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function readPdfText(pdfPath) {
  const buf = fs.readFileSync(pdfPath);
  const pdf = new PDFParse({ data: buf });
  await pdf.load();
  const result = await pdf.getText();
  return result.text;
}

// Normalize PDF text: collapse tabs/multiple-spaces to single space
function normalizeText(text) {
  return text
    .replace(/\t+/g, ' ')
    .replace(/ {2,}/g, ' ');
}

// Parse explanations from normalized PDF text
function parseExplanations(rawText) {
  const text = normalizeText(rawText);
  const explanations = {};

  // Split by <문제 해설> marker
  const blocks = text.split(/<문제 해설>/);

  for (let i = 1; i < blocks.length; i++) {
    const prevBlock = blocks[i - 1];

    // Find the last question number before this <문제 해설> block
    // Pattern: "N." at start of line or after period/newline, where N is 1-50
    let qNum = null;

    // Look for question number pattern in previous block
    // The last "N." followed by question text
    const lines = prevBlock.split('\n');
    for (let j = lines.length - 1; j >= 0; j--) {
      const line = lines[j].trim();
      // Match "N." at start of line (question number)
      const m = line.match(/^(\d{1,2})\.\s/);
      if (m) {
        const n = parseInt(m[1]);
        if (n >= 1 && n <= 50) {
          qNum = n;
          break;
        }
      }
    }

    if (!qNum) continue;

    // Extract explanation text: everything from <문제 해설> to the next question
    // The block already starts after <문제 해설>, and ends at the next <문제 해설> (split boundary)
    let explanation = blocks[i];

    // Remove page headers/footers
    explanation = explanation
      .replace(/본\s+해설집은\s+최강.*?변경됩니다\./gs, '')
      .replace(/--\s*\d+\s*of\s*\d+\s*--/g, '')
      .replace(/1과목\s*:\s*과목\s*구분\s*없음/g, '')
      .replace(/전자문제집\s*CBT\s*:\s*www\.comcbt\.com/g, '')
      .replace(/한국사능력검정\s*심화.*?해설집◑/g, '')
      .replace(/기출문제\s+해설은\s+최강.*?변경됩니다\./gs, '');

    // Remove [해설작성자 : ...] patterns (keep content before and after)
    explanation = explanation.replace(/\[해설작성자\s*:\s*[^\]]*\]/g, '');

    // Cut at the next question start — only match the specific next question number
    const nextQNum = qNum + 1;
    explanation = normalizeText(explanation);
    if (nextQNum <= 50) {
      // Cut at "NEXT_Q_NUM. " at start of line (the next question's text)
      const nextQPattern = new RegExp(`\\n${nextQNum}\\.\\s`);
      const nextQMatch = explanation.match(nextQPattern);
      if (nextQMatch) {
        explanation = explanation.substring(0, nextQMatch.index);
      }
    }

    // Also remove any trailing choice markers from the next question (①~⑤ lines at the end)
    explanation = explanation
      .replace(/\n\s*[①②③④⑤]\s.*$/s, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (explanation.length > 0) {
      explanations[qNum] = explanation;
    }
  }

  return explanations;
}

// Find PDF file for a given exam number
function findPdfFile(examNumber) {
  const files = fs.readdirSync(PDF_DIR);
  const pattern = new RegExp(`\\(${examNumber}회\\).*\\.pdf$`, 'i');
  const match = files.find(f => pattern.test(f));
  return match ? path.join(PDF_DIR, match) : null;
}

async function main() {
  // Get exam list
  const { data: exams } = await apiGet('/api/exams');
  const targetExams = exams
    .filter(e => e.examNumber >= 40 && e.examNumber <= 77)
    .sort((a, b) => a.examNumber - b.examNumber);

  console.log(`Processing ${targetExams.length} exams (40-77)...\n`);

  let successCount = 0;
  let failCount = 0;
  let skipCount = 0;
  const results = [];

  for (const exam of targetExams) {
    const pdfPath = findPdfFile(exam.examNumber);
    if (!pdfPath) {
      console.log(`${exam.examNumber}회: PDF 없음 — 건너뜀`);
      skipCount++;
      results.push({ examNumber: exam.examNumber, status: 'no_pdf' });
      continue;
    }

    try {
      const text = await readPdfText(pdfPath);
      if (!text || text.length < 100) {
        console.log(`${exam.examNumber}회: 텍스트 추출 실패`);
        failCount++;
        results.push({ examNumber: exam.examNumber, status: 'no_text' });
        continue;
      }

      const explanations = parseExplanations(text);
      const count = Object.keys(explanations).length;

      if (count === 0) {
        console.log(`${exam.examNumber}회: 해설 파싱 실패 (0개)`);
        failCount++;
        results.push({ examNumber: exam.examNumber, status: 'parse_fail' });
        continue;
      }

      // Upload via bulk-explanations API
      const payload = Object.entries(explanations).map(([qNum, explanation]) => ({
        questionNumber: parseInt(qNum),
        explanation,
      }));

      const result = await apiPut('/api/questions/bulk-explanations', {
        examId: exam.id,
        explanations: payload,
      });

      if (result.success) {
        console.log(`${exam.examNumber}회: ✓ ${count}개 해설 추가`);
        successCount++;
        results.push({ examNumber: exam.examNumber, status: 'ok', count });
      } else {
        console.log(`${exam.examNumber}회: API 오류 — ${result.error}`);
        failCount++;
        results.push({ examNumber: exam.examNumber, status: 'api_error', error: result.error });
      }
    } catch (err) {
      console.log(`${exam.examNumber}회: 오류 — ${err.message}`);
      failCount++;
      results.push({ examNumber: exam.examNumber, status: 'error', error: err.message });
    }
  }

  console.log(`\n완료: 성공 ${successCount}, 실패 ${failCount}, 건너뜀 ${skipCount}`);

  // Show summary of problematic ones
  const problems = results.filter(r => r.status !== 'ok' && r.status !== 'no_pdf');
  if (problems.length > 0) {
    console.log('\n문제 발생 목록:');
    problems.forEach(p => console.log(`  ${p.examNumber}회: ${p.status} ${p.error || ''}`));
  }
}

main().catch(console.error);
