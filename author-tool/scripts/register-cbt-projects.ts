/**
 * Register all CBT categories as projects in the author tool.
 * Reads _categories.json from R2 and creates a project for each category.
 *
 * Usage:
 *   cd author-tool && npx tsx scripts/register-cbt-projects.ts [--dry-run]
 *
 * Features:
 *   - Skips categories that already have a project (by categoryCode)
 *   - Directly writes to data/projects/index.json (no server needed)
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DRY_RUN = process.argv.includes('--dry-run');
const PROJECTS_PATH = path.resolve(__dirname, '../../data/projects/index.json');
const CATEGORIES_PATH = path.resolve(__dirname, '../../cbt_data/json/_categories.json');

interface Project {
  id: string;
  name: string;
  icon: string;
  createdAt: string;
  type: 'korean-history' | 'cbt';
  categoryCode?: string;
  examCount?: number;
  questionCount?: number;
}

interface Category {
  name: string;
  url: string;
}

function slugify(name: string): string {
  return name.trim().replace(/\s+/g, '-').replace(/[^\w가-힣\-]/g, '').toLowerCase();
}

function pickIcon(name: string): string {
  if (name.includes('기능사')) return '🔧';
  if (name.includes('산업기사')) return '🏭';
  if (name.includes('기사')) return '📐';
  if (name.includes('기능장')) return '🏅';
  if (name.includes('공무원')) return '📋';
  if (name.includes('수능')) return '📖';
  return '📝';
}

async function main() {
  console.log(`\n📋 Register CBT Projects`);
  if (DRY_RUN) console.log(`  ⚠️  DRY RUN\n`);

  // Read existing projects
  let projects: Project[] = [];
  try {
    const raw = await fs.readFile(PROJECTS_PATH, 'utf-8');
    projects = JSON.parse(raw);
  } catch {
    projects = [];
  }

  const existingCodes = new Set(projects.filter((p) => p.categoryCode).map((p) => p.categoryCode));
  console.log(`  Existing projects: ${projects.length} (${existingCodes.size} CBT)\n`);

  // Read categories
  const rawCats: Category[] = JSON.parse(await fs.readFile(CATEGORIES_PATH, 'utf-8'));

  // Read enriched data from category files for exam/question counts
  let added = 0;
  let skipped = 0;

  for (const cat of rawCats) {
    const code = slugify(cat.name);

    if (existingCodes.has(code)) {
      skipped++;
      continue;
    }

    // Get exam/question count from category file
    let examCount = 0;
    let questionCount = 0;
    try {
      const catFilePath = path.resolve(__dirname, '../../cbt_data/json', cat.name.replace(/ /g, '_') + '.json');
      const catData = JSON.parse(await fs.readFile(catFilePath, 'utf-8'));
      const exams = catData.exams || [];
      examCount = exams.length;
      questionCount = exams.reduce((sum: number, e: any) => sum + (e.question_count || e.questions?.length || 0), 0);
    } catch {}

    const project: Project = {
      id: `proj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: cat.name,
      icon: pickIcon(cat.name),
      createdAt: new Date().toISOString(),
      type: 'cbt',
      categoryCode: code,
      examCount,
      questionCount,
    };

    projects.push(project);
    added++;

    if (added % 100 === 0) console.log(`  ... ${added} added`);
  }

  console.log(`\n  Added: ${added}`);
  console.log(`  Skipped (already exists): ${skipped}`);
  console.log(`  Total projects: ${projects.length}`);

  if (!DRY_RUN) {
    await fs.writeFile(PROJECTS_PATH, JSON.stringify(projects, null, 2), 'utf-8');
    console.log(`  ✅ Saved to ${PROJECTS_PATH}`);
  }
}

main().catch((err) => {
  console.error('❌ Fatal:', err);
  process.exit(1);
});
