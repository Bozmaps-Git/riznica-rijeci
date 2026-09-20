#!/usr/bin/env node
/**
 * Rebuilds data.js from the upstream source Amila edits.
 *
 * Usage:  node scripts/sync.mjs [--dry]
 *
 * Reads the public read-only API of the authoring site, validates the result,
 * and only rewrites data.js when the pull is complete and sane. A partial or
 * failed scrape exits non-zero and leaves the committed data untouched, so a
 * bad night can never blank the live site.
 */

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const SOURCE =
  process.env.SYNC_SOURCE ||
  "https://bosanski-rjecnik.guhdijaamila.chatgpt.site";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "data.js");
const DRY = process.argv.includes("--dry");

// Floors, not exact counts: content is allowed to grow, never to collapse.
const MIN_WORDS = 4800;
const MIN_LESSONS = 120;
const GRADES = 8;

const log = (...a) => console.log(...a);

async function getJSON(path, tries = 4) {
  const url = `${SOURCE}${path}`;
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(45_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (attempt === tries) throw new Error(`${path} failed: ${err.message}`);
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
}

async function fetchWords() {
  const first = await getJSON("/api/words?page=1&size=100");
  const pages = first.pages;
  const byId = new Map(first.items.map((w) => [w.id, w]));

  for (let page = 2; page <= pages; page++) {
    const d = await getJSON(`/api/words?page=${page}&size=100`);
    for (const w of d.items) byId.set(w.id, w);
    if (page % 10 === 0) log(`    page ${page}/${pages}`);
  }

  const words = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
  return { words, expected: first.total, pages };
}

function validate({ words, expected }, grammar, content, cms) {
  const problems = [];

  if (words.length < MIN_WORDS)
    problems.push(`only ${words.length} words (floor ${MIN_WORDS})`);
  if (words.length !== expected)
    problems.push(`got ${words.length} words, API reported ${expected}`);

  const grades = new Set(words.map((w) => w.grade));
  if (grades.size !== GRADES)
    problems.push(`${grades.size} word grades, expected ${GRADES}`);

  if (words.some((w) => !w.headword || !w.english))
    problems.push("some words are missing headword/english");

  const gg = grammar?.grades ?? [];
  const lessons = gg.reduce((n, g) => n + (g.lessons?.length ?? 0), 0);
  if (gg.length !== GRADES)
    problems.push(`${gg.length} grammar grades, expected ${GRADES}`);
  if (lessons < MIN_LESSONS)
    problems.push(`only ${lessons} lessons (floor ${MIN_LESSONS})`);

  if (!content?.hero_title) problems.push("content payload looks empty");
  if (!cms?.theme?.primary) problems.push("cms theme payload looks empty");

  const questions = gg.reduce(
    (n, g) =>
      n + (g.lessons ?? []).reduce((m, l) => m + (l.quiz?.length ?? 0), 0),
    0,
  );

  return { problems, lessons, questions };
}

async function main() {
  log(`Source: ${SOURCE}`);

  log("  words...");
  const wordData = await fetchWords();

  log("  grammar, content, theme...");
  const [grammar, content, cms] = await Promise.all([
    getJSON("/api/grammar"),
    getJSON("/api/content"),
    getJSON("/api/cms"),
  ]);

  const { problems, lessons, questions } = validate(
    wordData,
    grammar,
    content,
    cms,
  );

  log(
    `\n  ${wordData.words.length} words · ${lessons} lessons · ${questions} questions`,
  );

  if (problems.length) {
    console.error("\nREFUSING TO WRITE — upstream pull looks wrong:");
    for (const p of problems) console.error(`  - ${p}`);
    console.error("\ndata.js left untouched.");
    process.exit(1);
  }

  const db = { words: wordData.words, grammar, content, cms };
  const next = `const __DB=${JSON.stringify(db)};\n`;

  const prev = await readFile(OUT, "utf8").catch(() => "");
  if (prev.trim() === next.trim()) {
    log("\nNo change upstream. data.js already current.");
    // 0 = success-but-nothing-to-do; the workflow checks git status, not this.
    return;
  }

  const before = (() => {
    try {
      return JSON.parse(prev.slice(prev.indexOf("=") + 1).trim().replace(/;$/, ""));
    } catch {
      return null;
    }
  })();

  if (before) {
    const delta = db.words.length - before.words.length;
    log(
      `\nChanged: ${delta >= 0 ? "+" : ""}${delta} words vs committed copy.`,
    );
  }

  if (DRY) {
    log("--dry set, not writing.");
    return;
  }

  await writeFile(OUT, next, "utf8");
  log(`Wrote ${OUT}`);
}

main().catch((err) => {
  console.error(`\nSync failed: ${err.message}`);
  console.error("data.js left untouched.");
  process.exit(1);
});
