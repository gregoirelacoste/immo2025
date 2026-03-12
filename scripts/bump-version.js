#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Parse bump type from args: patch (default), minor, major
const bumpType = process.argv[2] || 'patch';
if (!['patch', 'minor', 'major'].includes(bumpType)) {
  console.error(`Usage: node scripts/bump-version.js [patch|minor|major]`);
  process.exit(1);
}

const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const oldVersion = packageJson.version;

// Bump version
const [major, minor, patch] = oldVersion.split('.').map(Number);
let newVersion;
switch (bumpType) {
  case 'major':
    newVersion = `${major + 1}.0.0`;
    break;
  case 'minor':
    newVersion = `${major}.${minor + 1}.0`;
    break;
  default:
    newVersion = `${major}.${minor}.${patch + 1}`;
}

// Update package.json
packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

// Update src/lib/version.ts
const versionFile = path.join(__dirname, '..', 'src', 'lib', 'version.ts');
fs.writeFileSync(
  versionFile,
  `/** Single source of truth for the app version. Bump this on each release. */\nexport const APP_VERSION = "${newVersion}";\n`
);

// Update android versionName if android project exists
const buildGradlePath = path.join(__dirname, '..', 'android', 'app', 'build.gradle');
if (fs.existsSync(buildGradlePath)) {
  let gradle = fs.readFileSync(buildGradlePath, 'utf8');
  gradle = gradle.replace(/versionName ".*?"/, `versionName "${newVersion}"`);
  const [mj, mn, pt] = newVersion.split('.').map(Number);
  const versionCode = mj * 10000 + mn * 100 + pt;
  gradle = gradle.replace(/versionCode \d+/, `versionCode ${versionCode}`);
  fs.writeFileSync(buildGradlePath, gradle);
}

console.log(`${oldVersion} → ${newVersion} (${bumpType})`);

// Stage only files modified by this script (never git add -A to avoid leaking secrets)
const filesToStage = [packageJsonPath, versionFile];
if (fs.existsSync(buildGradlePath)) {
  filesToStage.push(buildGradlePath);
}
execSync(`git add ${filesToStage.map(f => `"${f}"`).join(' ')}`, { stdio: 'inherit' });

// Tag only if commit succeeds (&&) to avoid orphan tags
execSync(`git commit -m "chore: release v${newVersion}" && git tag v${newVersion}`, { stdio: 'inherit' });

console.log(`Tagged v${newVersion}`);
