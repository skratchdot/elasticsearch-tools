#!/usr/bin/env node
const fs = require('fs');
const { execSync } = require('child_process');

const filename = `${__dirname}/../README.md`;
let contents = fs.readFileSync(filename, 'utf8');

const setSection = (tool, contents) => {
  const re = new RegExp(
    `([\\S\\s]*?)(\\n## Usage: ${tool}\\n\\n### Options\\n\\n\`\`\`bash\\n)([\\S\\s]*?)(\`\`\`)([\\S\\s]*)`
  );
  const output = execSync(`node ${__dirname}/../lib/${tool}.js --help`)
    .toString()
    .trim();
  const help = `${tool} --help\n\n${output}\n`;
  return contents.replace(re, `$1$2${help}$4$5`);
};

['aliases', 'bulk', 'mappings', 'settings'].forEach(key => {
  contents = setSection(`es-import-${key}`, contents);
  contents = setSection(`es-import-${key}`, contents);
});
fs.writeFileSync(filename, contents, 'utf8');
