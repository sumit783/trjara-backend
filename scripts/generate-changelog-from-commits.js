// scripts/generate-changelog-from-commits.js
// Usage: node scripts/generate-changelog-from-commits.js [since-ref]
// Example: node scripts/generate-changelog-from-commits.js v1.0.2
// If no since-ref provided, it uses the latest tag; if no tags, it uses all commits.

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8' }).trim();
  } catch (err) {
    return '';
  }
}

// Determine range: sinceRef..HEAD
const sinceRef = process.argv[2] || run('git describe --tags --abbrev=0');
let range;
if (!sinceRef) {
  // no tags found -> use all commits
  range = '';
} else {
  // if sinceRef equals HEAD or empty, use just HEAD commits since that tag
  range = `${sinceRef}..HEAD`;
}

// Get commits in format: author||subject||body (body optional)
const gitFormat = '%an||%s';
const gitCmd = range ? `git log ${range} --pretty=format:"${gitFormat}"` : `git log --pretty=format:"${gitFormat}"`;
const raw = run(gitCmd);

if (!raw) {
  console.log('No commits found for the given range.');
  process.exit(0);
}

// Parse commits and group by author
const commits = raw.split('\n').map(line => {
  const [author, subject] = line.split('||').map(s => s ? s.trim() : '');
  return { author, subject };
});

const byAuthor = {};
for (const c of commits) {
  if (!byAuthor[c.author]) byAuthor[c.author] = [];
  byAuthor[c.author].push(c.subject);
}

// Build markdown: a compact table "Name -> commit message" per row
let md = `## Changelog (generated from git commits)\n\n`;
md += `> Range: ${range || 'ALL COMMITS'}\n\n`;

md += `| Developer | Commits |\n`;
md += `|---|---|\n`;

for (const author of Object.keys(byAuthor)) {
  const items = byAuthor[author].map(m => `- ${m}`).join('<br>');
  md += `| **${author}** | ${items} |\n`;
}

// Insert into README between markers
const repoRoot = process.cwd();
const readmePath = path.join(repoRoot, 'README.md');
const startMarker = '<!-- CHANGELOG:START -->';
const endMarker = '<!-- CHANGELOG:END -->';

let readme = '';
if (fs.existsSync(readmePath)) {
  readme = fs.readFileSync(readmePath, 'utf8');
} else {
  // create basic README if missing
  readme = `# Project Name

Project description...

${startMarker}
${endMarker}
`;
}

const block = `${startMarker}\n\n${md}\n${endMarker}`;

const regex = new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`, 'm');
if (readme.match(regex)) {
  readme = readme.replace(regex, block);
} else {
  readme = readme.trimEnd() + '\n\n' + block + '\n';
}

fs.writeFileSync(readmePath, readme, 'utf8');
console.log('README.md updated with generated changelog section.');
