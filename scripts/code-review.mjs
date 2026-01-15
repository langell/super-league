import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

/**
 * Custom Code Review Script for Golf League app.
 * Add checks here that go beyond standard linting.
 */

const MAX_FILE_LINES = 400;
const HEX_COLOR_REGEX = /#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})/g;
const CONSOLE_LOG_REGEX = /console\.log\(/g;
const MAGIC_NUMBER_REGEX = /\b(?<!\w)\d+(?!\w)\b/g;
const NON_NULL_ASSERTION_REGEX = /[a-zA-Z0-9_]+!(?=[.\s;,)])/g;

const inputPaths = process.argv.slice(2);

if (inputPaths.length === 0) {
  console.log(chalk.gray('No files to review.'));
  process.exit(0);
}

const filesToReview = [];

function collectFiles(currentPath) {
  if (!fs.existsSync(currentPath)) return;
  const stats = fs.statSync(currentPath);
  
  if (stats.isDirectory()) {
    const files = fs.readdirSync(currentPath);
    files.forEach(file => {
      // Ignore hidden files, node_modules, and tests
      if (file.startsWith('.') || file === 'node_modules' || file === '__tests__') return;
      collectFiles(path.join(currentPath, file));
    });
  } else {
    // Only review JS/TS files, skip tests
    if (currentPath.match(/\.(js|ts|jsx|tsx|mjs)$/) && !currentPath.match(/\.(test|spec)\./)) {
      filesToReview.push(currentPath);
    }
  }
}

inputPaths.forEach(p => collectFiles(p));

if (filesToReview.length === 0) {
  console.log(chalk.gray('No relevant files to review.'));
  process.exit(0);
}

let hasErrors = false;

// Common "non-magic" numbers in a golf app
const ALLOWED_NUMBERS = new Set(['0', '1', '2', '9', '18', '36', '72', '100', '404', '500', '3000']);

filesToReview.forEach(file => {
  if (!fs.existsSync(file)) return;
  
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  const relativePath = file.replace(process.cwd(), '');
  
  // 1. Architecture Consistency
  // Rule: components in src/components should not import db directly. Data should flow via props or actions.
  if (relativePath.includes('src/components') && content.includes('import { db } from "@/db"')) {
    console.log(chalk.red(`❌ [${relativePath}] Architecture Violation: Components should not access the database directly. Pass data via props.`));
    hasErrors = true;
  }

  // 2. No Magic Numbers
  const numbers = content.match(MAGIC_NUMBER_REGEX) || [];
  const magicNumbers = numbers.filter(n => !ALLOWED_NUMBERS.has(n));
  if (magicNumbers.length > 5 && !file.includes('seed.ts') && !file.includes('schema.ts')) {
    console.log(chalk.yellow(`🔢 [${relativePath}] Potential Magic Numbers found: ${[...new Set(magicNumbers)].slice(0, 5).join(', ')}... Use constants for readability.`));
  }

  // 3. Defensive Coding (No Non-Null Assertions)
  if (NON_NULL_ASSERTION_REGEX.test(content) && !file.includes('seed.ts')) {
    console.log(chalk.red(`❌ [${relativePath}] Defensive Coding Violation: Non-null assertions (!) detected. Use optional chaining (?.) or proper null checks instead.`));
    hasErrors = true;
  }

  // 4. DRY: Duplicate String Check (within file)
  const strings = content.match(/"[^"]{10,}"|'[^']{10,}'|`[^`]{10,}`/g) || [];
  const stringFrequency = {};
  strings.forEach(s => {
    // Ignore common false positives like imports or classNames (basic check)
    if (s.includes('@/') || s.includes('flex ') || s.includes('hover:')) return;
    stringFrequency[s] = (stringFrequency[s] || 0) + 1;
  });
  
  const duplicatedStrings = Object.keys(stringFrequency).filter(s => stringFrequency[s] > 2);
  if (duplicatedStrings.length > 0) {
    console.log(chalk.yellow(`🔄 [${relativePath}] DRY Violation: Duplicated strings found. Consider refactoring into constants or components: ${duplicatedStrings[0].slice(0, 30)}...`));
  }
  
  // Existing rules...
  if (lines.length > MAX_FILE_LINES) {
    console.log(chalk.yellow(`⚠️  [${relativePath}] File is quite large (${lines.length} lines). Consider breaking it into smaller components.`));
  }
  
  if (CONSOLE_LOG_REGEX.test(content) && !file.includes('seed.ts') && !file.includes('actions.ts') && !file.includes('logger.ts')) {
     console.log(chalk.red(`❌ [${relativePath}] contains console.log. Please use the structured logger from "@/lib/logger" instead.`));
     hasErrors = true;
  }
  
  if (file.endsWith('.tsx') || file.endsWith('.ts')) {
    const hexMatches = content.match(HEX_COLOR_REGEX);
    if (hexMatches && hexMatches.length > 0) {
        console.log(chalk.yellow(`🎨 [${relativePath}] contains hardcoded hex colors (${hexMatches.join(', ')}). Consider using CSS variables from common.css for better themes.`));
    }
  }

  let loopDepth = 0;
  let maxDepth = 0;
  lines.forEach(line => {
    if (line.includes('.map(') || line.includes('for (') || line.includes('while (')) {
        loopDepth++;
        maxDepth = Math.max(maxDepth, loopDepth);
    }
    if (line.includes(');') || line.includes('}')) {
        if (loopDepth > 0) loopDepth--;
    }
  });

  if (maxDepth > 2) {
    console.log(chalk.yellow(`🌀 [${relativePath}] has nested loops/maps (depth: ${maxDepth}). Watch out for performance issues.`));
  }
});

if (hasErrors) {
  console.log(chalk.red('\n🚨 Code review failed. Please fix the errors before committing.'));
  process.exit(1);
} else {
  console.log(chalk.green('\n✅ Code review passed!'));
  process.exit(0);
}
