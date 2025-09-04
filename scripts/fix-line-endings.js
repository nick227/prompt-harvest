import fs from 'fs';
import path from 'path';

const testFiles = [
  'tests/e2e/billing-flows.spec.js',
  'tests/e2e/billing.config.js',
  'tests/e2e/setup/billing-setup.js',
  'tests/e2e/setup/billing-teardown.js',
  'tests/e2e/utils/billing-test-utils.js',
  'tests/e2e/BILLING_TEST_GUIDE.md'
];

function fixLineEndings(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const fixedContent = content.replace(/\r\n/g, '\n');
    fs.writeFileSync(filePath, fixedContent, 'utf8');
    console.log(`✅ Fixed line endings in ${filePath}`);
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
  }
}

console.log('🔧 Fixing line endings in test files...');

testFiles.forEach(fixLineEndings);

console.log('🎉 Line endings fixed!');
