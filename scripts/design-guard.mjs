#!/usr/bin/env node
/**
 * Sourceglass — デザインガード
 *
 * デザイン規約の違反を機械的に検出します。人間のレビューに頼らないための仕組みです。
 * 仕様: ai_tasks/20260804_sourceglass_mvp_design/design.md
 *
 *   npm run design:guard        検査する（CI で実行）
 *   npm run design:lock         保護対象ファイルのハッシュを更新する
 *
 * このツールが防ごうとしている事故:
 *   - 良かれと思って色を足す / ✓ を足す
 *   - トークンをコンポーネント側で再定義してデザインが分裂する
 *   - Web フォントを読み込んでプライバシー要件を破る
 *   - テキスト記号がカラー絵文字になってモノクロ設計が壊れる
 */

import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, relative, extname } from 'node:path';
import { existsSync } from 'node:fs';

const ROOT = process.cwd();
const LOCK_PATH = join(ROOT, 'scripts', 'design-lock.json');

/** 編集を禁止するファイル。変更にはハッシュの更新（＝意識的な操作）が必要。 */
const PROTECTED = [
  'src/styles/tokens.css',
  'src/styles/base.css',
  'src/components/Icon.tsx',
];

/** 色リテラルを書いてよい唯一のファイル */
const COLOR_ALLOWED = ['src/styles/tokens.css'];

const SCAN_DIRS = ['src'];
const SCAN_FILES = ['index.html'];
const SCAN_EXT = new Set(['.css', '.ts', '.tsx', '.html']);

const NAMED_COLORS =
  'red|green|blue|orange|yellow|purple|teal|pink|crimson|gold|lime|navy|olive|maroon';

/** @type {{id: string, message: string, hint: string, test: (line: string, file: string) => boolean}[]} */
const RULES = [
  {
    id: 'color-literal',
    message: '色リテラルは tokens.css にしか書けません',
    hint: 'var(--fg) / var(--muted) などのトークンを使ってください。',
    test: (line, file) => {
      if (COLOR_ALLOWED.includes(file)) return false;
      if (/currentColor|transparent|inherit|color-scheme/.test(line)) return false;
      return (
        /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/.test(line) ||
        /\b(?:rgba?|hsla?)\s*\(/.test(line) ||
        new RegExp(`(?::|\\s)(?:${NAMED_COLORS})\\b`).test(line)
      );
    },
  },
  {
    id: 'token-redefinition',
    message: 'トークンの再定義は tokens.css だけで行ってください',
    hint: 'コンポーネント側で :root を定義するとデザインが分裂します。',
    test: (line, file) =>
      !COLOR_ALLOWED.includes(file) && /:root\s*\{/.test(line),
  },
  {
    id: 'webfont',
    message: '外部フォントの読み込みはプライバシー要件違反です',
    hint: 'システムフォントのみを使います。画像は出なくても「利用した事実」が漏れます。',
    test: (line) =>
      /fonts\.(?:googleapis|gstatic)\.com/.test(line) ||
      /@import\s+url\(\s*['"]?https?:/.test(line) ||
      /@font-face/.test(line),
  },
  {
    id: 'check-mark',
    message: '✓ / ✔ / ☑ は使えません',
    hint: '「安全のお墨付き」と誤読されます。Icon コンポーネントを使ってください。',
    test: (line) => /[✓✔☑✅]/.test(line),
  },
  {
    id: 'emoji-symbol',
    message: 'テキスト記号は環境によってカラー絵文字になります',
    hint: '⚠ ⓘ などは使わず、src/components/Icon.tsx を使ってください。',
    test: (line) => /[⚠ⓘℹ️❗❌⛔🚫]/.test(line),
  },
  {
    id: 'radius',
    message: '角丸は 4px 以下です',
    hint: '計測器としての性格を保つため。var(--radius) を使ってください。',
    test: (line, file) => {
      if (file.startsWith('src/styles/')) return false;
      const m = line.match(/border-radius:\s*(\d+)px/);
      return m !== null && Number(m[1]) > 4;
    },
  },
  {
    id: 'probability',
    message: '確率・スコア表示は禁止です',
    hint: 'このツールは推測しません。設計の根幹に関わる違反です。',
    test: (line) =>
      /\b(?:probability|confidence\s*score|likelihood)\b/i.test(line) ||
      /(?:AI|人間|human)[^\n]{0,12}\d{1,3}\s*%/.test(line),
  },
  {
    id: 'safety-claim',
    message: '「安全」「問題なし」と読める断定は禁止です',
    hint: '判定していないものを判定したことになります。copy.md の文言を使ってください。',
    test: (line, file) => {
      if (!file.startsWith('src/i18n/')) return false;
      return /安全|問題ありません|問題なし|クリーンです|AIではありません/.test(line);
    },
  },
];

async function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      await walk(full, out);
    } else if (SCAN_EXT.has(extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

const sha = (text) => createHash('sha256').update(text, 'utf8').digest('hex');

async function buildLock() {
  /** @type {Record<string, string>} */
  const lock = {};
  for (const file of PROTECTED) {
    const path = join(ROOT, file);
    if (!existsSync(path)) continue;
    lock[file] = sha(await readFile(path, 'utf8'));
  }
  return lock;
}

async function main() {
  if (process.argv.includes('--write')) {
    const lock = await buildLock();
    await writeFile(LOCK_PATH, `${JSON.stringify(lock, null, 2)}\n`, 'utf8');
    console.log(`design-lock.json を更新しました（${Object.keys(lock).length} ファイル）`);
    return;
  }

  /** @type {string[]} */
  const problems = [];

  // 1. 保護対象ファイルが改変されていないか
  if (existsSync(LOCK_PATH)) {
    const lock = JSON.parse(await readFile(LOCK_PATH, 'utf8'));
    const current = await buildLock();
    for (const [file, expected] of Object.entries(lock)) {
      if (current[file] === undefined) {
        problems.push(`${file}\n    保護対象のファイルが見つかりません`);
      } else if (current[file] !== expected) {
        problems.push(
          `${file}\n` +
            '    デザイン仕様のファイルが変更されています。\n' +
            '    これは意図した変更ですか？ 色・余白・書体の変更は設計判断です。\n' +
            '    意図的なら `npm run design:lock` でハッシュを更新してください。',
        );
      }
    }
  } else {
    console.warn('design-lock.json がありません。`npm run design:lock` を実行してください。\n');
  }

  // 2. 規約違反の走査
  const files = [...SCAN_FILES.map((f) => join(ROOT, f))];
  for (const dir of SCAN_DIRS) files.push(...(await walk(join(ROOT, dir))));

  for (const path of files) {
    if (!existsSync(path)) continue;
    if ((await stat(path)).isDirectory()) continue;
    const rel = relative(ROOT, path).split('\\').join('/');
    const lines = (await readFile(path, 'utf8')).split('\n');

    lines.forEach((line, i) => {
      if (/design-guard-ignore/.test(line)) return;
      for (const rule of RULES) {
        if (rule.test(line, rel)) {
          problems.push(
            `${rel}:${i + 1}  [${rule.id}] ${rule.message}\n` +
              `    ${rule.hint}\n` +
              `    > ${line.trim().slice(0, 100)}`,
          );
        }
      }
    });
  }

  if (problems.length > 0) {
    console.error(`\nデザインガード: ${problems.length} 件の違反\n`);
    for (const p of problems) console.error(`  ${p}\n`);
    console.error('仕様: ai_tasks/20260804_sourceglass_mvp_design/design.md');
    console.error('判断に迷う場合は、実装せずに相談してください。\n');
    process.exit(1);
  }

  console.log('デザインガード: 違反なし');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
