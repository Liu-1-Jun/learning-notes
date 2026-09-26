// 生成索引.mjs —— 扫描笔记目录里的 YY.MM.DD.md 笔记，重新生成 README.md 索引
//
// 用法（路径含中文，建议加引号）：
//   node "C:\Users\刘艺军\Desktop\学习笔记\scripts\生成索引.mjs"
// 或者在 学习笔记 目录下：
//   node scripts/生成索引.mjs
//
// 规则：
//   - 只认文件名严格形如 26.09.26.md 的笔记（YY.MM.DD，补零）
//   - 自动跳过 README.md、未命名.md、笔记润色要求.md、*.原始备份.md 和 .obsidian
//   - 每次运行都是「全量扫描 + 整体重写 README」，所以不用手动维护索引
//   - README 的版式写在本文件里；想改 README 就改这里再重新运行，别直接改 README.md

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
// 脚本放在 学习笔记/scripts/ 下，所以笔记目录是它的上一级
const notesDir = path.dirname(scriptDir);
const readmePath = path.join(notesDir, "README.md");

const NOTE_PATTERN = /^(\d{2})\.(\d{2})\.(\d{2})\.md$/;
const EXCLUDED = new Set(["README.md", "未命名.md", "笔记润色要求.md"]);

/** 从笔记正文里取第一个一级标题当主题；取不到就用文件名 */
function extractTopic(filePath, fallback) {
  try {
    const text = readFileSync(filePath, "utf8");
    const line = text.split(/\r?\n/).find((l) => /^#\s+\S/.test(l.trim()));
    if (!line) return fallback;
    const heading = line.trim().replace(/^#\s+/, "").trim();
    // 去掉标题里的日期前缀，例如「2026.09.26 学习笔记」→「学习笔记」
    const cleaned = heading
      .replace(/^\d{2,4}[./-]\d{1,2}[./-]\d{1,2}\s*/, "")
      .replace(/^学习笔记\s*[-—:：]?\s*/, "")
      .trim();
    return cleaned || fallback;
  } catch {
    return fallback;
  }
}

function collectNotes() {
  const entries = [];
  for (const name of readdirSync(notesDir)) {
    const match = NOTE_PATTERN.exec(name);
    if (!match || EXCLUDED.has(name) || name.endsWith(".原始备份.md")) continue;
    const [, yy, mm, dd] = match;
    const year = 2000 + Number(yy);
    const month = Number(mm);
    const day = Number(dd);
    entries.push({
      year,
      month,
      day,
      sortKey: year * 10000 + month * 100 + day,
      label: `${year}.${mm}.${dd}`,
      fileName: name,
      topic: extractTopic(path.join(notesDir, name), "（未命名）"),
    });
  }
  return entries.sort((a, b) => b.sortKey - a.sortKey);
}

function buildReadme(notes) {
  const lines = [];

  // ---- 开头介绍 ----
  lines.push("新手小白做的学习笔记，主要记的是每天学习到的知识还有踩过的坑，如有错误感谢指出。");
  lines.push("");

  // ---- 目录 ----
  lines.push("目录：");
  lines.push("");
  lines.push("<!-- 目录由 scripts/生成索引.mjs 自动生成，别直接改 README.md；要改版式请改脚本 -->");
  lines.push("");

  if (notes.length === 0) {
    lines.push("（暂无笔记）");
    lines.push("");
  } else {
    const years = [...new Set(notes.map((n) => n.year))].sort((a, b) => b - a);
    for (const year of years) {
      const yearNotes = notes.filter((n) => n.year === year);
      const months = [...new Set(yearNotes.map((n) => n.month))].sort((a, b) => b - a);
      for (const month of months) {
        const monthNotes = yearNotes.filter((n) => n.month === month);
        lines.push(`### ${year} 年 ${month} 月（里面打开可以锁定具体天数）`);
        lines.push("");
        for (const note of monthNotes) {
          lines.push(`- ${note.label} · ${note.topic} — [打开](${encodeURI(note.fileName)})`);
        }
        lines.push("");
      }
    }
  }

  // ---- 结尾说明 ----
  lines.push("---");
  lines.push("");
  lines.push("笔记按日期命名（`YY.MM.DD.md`，如 `26.09.26.md` 就是 2026 年 9 月 26 日），一天一篇。加完新笔记后在笔记目录下运行 `node scripts/生成索引.mjs` 更新本页目录。");
  lines.push("");

  return lines.join("\n");
}

const notes = collectNotes();
writeFileSync(readmePath, buildReadme(notes), "utf8");
console.log(`已生成索引：${readmePath}`);
console.log(`收录笔记 ${notes.length} 篇：`);
for (const note of notes) {
  console.log(`  ${note.label} · ${note.topic}`);
}
