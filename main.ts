// The Funniest Out-of-Office — entry program.
// Writes the one-line out-of-office auto-reply to <output>/entry.txt.
// Node 22, standard library only; the reply itself lives in LINE.txt.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const LIMIT = 140;
const HERE = dirname(fileURLToPath(import.meta.url));

type Check = { label: string; ok: (text: string) => boolean; why: string };

const CHECKS: Check[] = [
  {
    label: "length",
    ok: (t) => t.length >= 1 && t.length <= LIMIT,
    why: `reply must be 1-${LIMIT} characters`,
  },
  {
    label: "not-blank",
    ok: (t) => t.trim().length > 0,
    why: "reply must not be only whitespace",
  },
  {
    label: "single-line",
    ok: (t) => !/[\r\n]/.test(t),
    why: "reply must be a single line",
  },
  {
    label: "no-control-chars",
    ok: (t) => ![...t].some((c) => (c.codePointAt(0) ?? 0) < 0x20),
    why: "reply must not contain control characters",
  },
  {
    label: "no-padding",
    ok: (t) => t === t.trim(),
    why: "reply must not start or end with whitespace",
  },
  {
    label: "no-link",
    ok: (t) => !/https?:\/\//.test(t) && !/www\./.test(t),
    why: "reply must contain no link (entry is one line of text only)",
  },
  {
    label: "reads-as-ooo",
    ok: (t) => /out of office|away|on leave|back on|gone/i.test(t),
    why: "reply must read as an out-of-office auto-reply",
  },
];

function readReply(): string {
  const raw = readFileSync(join(HERE, "LINE.txt"), "utf-8");
  return raw.replace(/\r\n?/g, "\n").replace(/\n$/, "");
}

function runChecks(reply: string): void {
  const failed = CHECKS.filter((c) => !c.ok(reply));
  if (failed.length > 0) {
    const detail = failed.map((c) => `${c.label}: ${c.why}`).join("; ");
    console.error(`error: invalid reply (${reply.length} chars): ${detail}`);
    process.exit(1);
  }
}

function publish(reply: string): void {
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  mkdirSync(outDir, { recursive: true });
  const target = join(outDir, "entry.txt");
  writeFileSync(target, reply, "utf-8");
  const roundTrip = readFileSync(target, "utf-8");
  if (roundTrip !== reply) {
    console.error("error: read-back mismatch after writing entry.txt");
    process.exit(1);
  }
  const bytes = Buffer.byteLength(reply, "utf-8");
  console.log(`wrote ${target} (${reply.length} characters, ${bytes} bytes)`);
}

const reply = readReply();
runChecks(reply);
publish(reply);
