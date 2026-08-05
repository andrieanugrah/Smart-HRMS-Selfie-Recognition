import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * @vitest-environment node
 */

const ACTIONS_DIR = path.resolve(import.meta.dirname, '..');
const FILENAMES = [
  'attendance.ts', 'face.ts', 'leave.ts', 'overtime.ts', 'employees.ts',
  'compliance.ts', 'notifications.ts', 'profile.ts', 'images.ts', 'dashboard.ts',
  'announcement.ts', 'payroll.ts', 'reimbursement.ts', 'shift.ts',
];

function extractFunctions(source: string): string[] {
  const matches: string[] = [];
  const re = /export\s+async\s+function\s+(\w+)/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    matches.push(m[1]);
  }
  return matches;
}

function findMatchingParen(source: string, start: number): number {
  let depth = 0;
  for (let i = start; i < source.length; i++) {
    if (source[i] === '(') depth++;
    else if (source[i] === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function getFunctionBody(source: string, name: string): string {
  const declStart = source.indexOf(`export async function ${name}`);
  if (declStart === -1) return '';

  const parenStart = source.indexOf('(', declStart);
  const parenEnd = findMatchingParen(source, parenStart);
  if (parenEnd === -1) return '';

  // Find the opening brace that starts the function body, ignoring
  // object type literals inside generic return types like Promise<X<{ ... }>>
  let openBrace = -1;
  let angleDepth = 0;
  let inString: '"' | "'" | '`' | null = null;
  for (let i = parenEnd + 1; i < source.length; i++) {
    const c = source[i];
    const prev = source[i - 1];
    if (inString) {
      if (c === inString && prev !== '\\') inString = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      inString = c;
      continue;
    }
    if (c === '<') angleDepth++;
    else if (c === '>' && angleDepth > 0) angleDepth--;
    else if (c === '{' && angleDepth === 0) {
      openBrace = i;
      break;
    }
  }
  if (openBrace === -1) return '';

  // Walk to the matching top-level closing brace.
  let braceCount = 0;
  for (let i = openBrace; i < source.length; i++) {
    if (source[i] === '{') braceCount++;
    else if (source[i] === '}') {
      braceCount--;
      if (braceCount === 0) {
        return source.slice(openBrace + 1, i);
      }
    }
  }
  return '';
}

const ALLOWLIST = new Set([
  'getMyFaceDescriptor', 'getMyTodayAttendance', 'getHRDDashboardStats',
]);

describe('auth guards', () => {
  for (const file of FILENAMES) {
    it(`${file} guards every exported action`, () => {
      const source = readFileSync(path.join(ACTIONS_DIR, file), 'utf8');
      const functions = extractFunctions(source);
      const failures: string[] = [];

      for (const fn of functions) {
        if (ALLOWLIST.has(fn)) continue;
        const body = getFunctionBody(source, fn);
        const hasGuard =
          body.includes('requireUser(') || body.includes('requireUser (') ||
          body.includes('requireRole(') || body.includes('requireRole (');
        if (!hasGuard) failures.push(`${file}:${fn}`);
      }

      expect(failures).toEqual([]);
    });
  }
});
