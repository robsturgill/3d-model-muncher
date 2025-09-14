#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 Starting release process...\n');

try {
  // Check if we're on the right branch
  const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
  
  if (currentBranch !== 'main' && currentBranch !== 'master') {
    console.log(`⚠️  Warning: You're on branch '${currentBranch}'. Releases are typically done from 'main' branch.`);
  }

  // Check for uncommitted changes
  try {
    execSync('git diff --exit-code', { stdio: 'ignore' });
    execSync('git diff --cached --exit-code', { stdio: 'ignore' });
  } catch (error) {
    console.log('❌ You have uncommitted changes. Please commit or stash them before releasing.');
    process.exit(1);
  }

  // Fetch latest changes
  console.log('📡 Fetching latest changes...');
  execSync('git fetch origin', { stdio: 'inherit' });

  // Build the project
  console.log('🔨 Building project...');
  execSync('npm run build', { stdio: 'inherit' });

  // Run release
  console.log('📝 Generating release...');
  execSync('npm run release', { stdio: 'inherit' });

  console.log('\n✅ Release process completed!');
  console.log('📋 Next steps:');
  console.log('   1. Review the generated changelog');
  console.log('   2. Push the changes: git push --follow-tags origin main');
  console.log('   3. The GitHub Actions will handle the rest!');

} catch (error) {
  console.error('\n❌ Release process failed:', error.message);
  process.exit(1);
}