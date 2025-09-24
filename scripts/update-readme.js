// scripts/update-readme.js
const fs = require('fs');
const path = require('path');

const repoRoot = process.cwd();
const changelogPath = path.join(repoRoot, 'CHANGELOG.md');
const readmePath = path.join(repoRoot, 'README.md');

if (!fs.existsSync(changelogPath)) {
  console.error('CHANGELOG.md not found. Run standard-version first.');
  process.exit(1);
}

const changelog = fs.readFileSync(changelogPath, 'utf8');

// Extract everything from top to the next "## [" (i.e., latest release header)
// We keep the header line (e.g., "## [1.0.0] - 2025-09-24") and its content up to the next release
const match = changelog.match(/(^# Changelog[\s\S]*?\n)?(^## \[.*?)([\s\S]*?)(?=\n^## \[|\n# |$)/m);

let latestSection = changelog;
if (match) {
  // match[2] is the first "## [x.x.x]..." header
  // match[2] + match[3] is the latest release content
  latestSection = (match[2] || '') + (match[3] || '');
}

// Define markers in README where changelog will be inserted
const startMarker = '<!-- CHANGELOG:START -->';
const endMarker = '<!-- CHANGELOG:END -->';

let readme = '';
if (fs.existsSync(readmePath)) readme = fs.readFileSync(readmePath, 'utf8');
else {
  // create a basic README with markers if none exists
  readme = `# Project Name

Project description...

${startMarker}
<!-- changelog will be inserted here -->
${endMarker}

`;
  fs.writeFileSync(readmePath, readme, 'utf8');
}

const regex = new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`, 'm');
const insertContent = `${startMarker}\n\n${latestSection.trim()}\n\n${endMarker}`;

if (readme.match(regex)) {
  readme = readme.replace(regex, insertContent);
} else {
  // append at end if markers not found
  readme = readme.trimEnd() + '\n\n' + insertContent + '\n';
}

fs.writeFileSync(readmePath, readme, 'utf8');
console.log('README.md updated with latest changelog section.');
