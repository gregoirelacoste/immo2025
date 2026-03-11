#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')
);
const version = packageJson.version;

// Update src/lib/version.ts
const versionFile = path.join(__dirname, '..', 'src', 'lib', 'version.ts');
fs.writeFileSync(
  versionFile,
  `/** Single source of truth for the app version. Bump this on each release. */\nexport const APP_VERSION = "${version}";\n`
);

// Update android versionName if android project exists
const buildGradlePath = path.join(__dirname, '..', 'android', 'app', 'build.gradle');
if (fs.existsSync(buildGradlePath)) {
  let gradle = fs.readFileSync(buildGradlePath, 'utf8');
  gradle = gradle.replace(/versionName ".*?"/, `versionName "${version}"`);
  // Increment versionCode based on version parts
  const [major, minor, patch] = version.split('.').map(Number);
  const versionCode = major * 10000 + minor * 100 + patch;
  gradle = gradle.replace(/versionCode \d+/, `versionCode ${versionCode}`);
  fs.writeFileSync(buildGradlePath, gradle);
}

console.log(`Version synced to ${version}`);

// Stage and commit
execSync('git add -A', { stdio: 'inherit' });
execSync(`git commit -m "chore: bump version to ${version}"`, { stdio: 'inherit' });
execSync(`git tag v${version}`, { stdio: 'inherit' });

console.log(`Tagged v${version}`);
