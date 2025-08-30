#!/usr/bin/env node

/**
 * Test Script for JavaScript Error Detection
 * Runs the new E2E tests that would catch variable reference issues
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

console.log('🧪 Testing JavaScript Error Detection E2E Tests...\n');

const runTest = async (testFile, description) => {
  console.log(`📋 Running: ${description}`);
  console.log(`📄 File: ${testFile}\n`);

  try {
    const { stdout, stderr } = await execAsync(`npx playwright test ${testFile} --reporter=list`);

    console.log('✅ Test Output:');
    console.log(stdout);

    if (stderr) {
      console.log('⚠️  Stderr:');
      console.log(stderr);
    }

    return { success: true, output: stdout };
  } catch (error) {
    console.log('❌ Test Failed:');
    console.log(error.stdout || error.message);

    return { success: false, error: error.message };
  }
};

const main = async () => {
  const tests = [
    {
      file: 'tests/e2e/javascript-errors.spec.js',
      description: 'JavaScript Runtime Error Detection Tests'
    },
    {
      file: 'tests/e2e/enhanced-auth-flow.spec.js',
      description: 'Enhanced Authentication with Error Monitoring'
    }
  ];

  console.log('🎯 These tests would have caught the issues we just fixed:\n');
  console.log('• ReferenceError: results is not defined');
  console.log('• ReferenceError: user is not defined');
  console.log('• ReferenceError: container is not defined');
  console.log('• SyntaxError: string literal contains an unescaped line break');
  console.log('• Missing configuration constants\n');

  let totalTests = 0;
  let passedTests = 0;

  for (const test of tests) {
    const result = await runTest(test.file, test.description);
    totalTests++;

    if (result.success) {
      passedTests++;
      console.log(`✅ ${test.description} - PASSED\n`);
    } else {
      console.log(`❌ ${test.description} - FAILED\n`);
    }

    console.log('─'.repeat(60) + '\n');
  }

  console.log('📊 SUMMARY:');
  console.log(`   Tests Run: ${totalTests}`);
  console.log(`   Passed: ${passedTests}`);
  console.log(`   Failed: ${totalTests - passedTests}`);

  if (passedTests === totalTests) {
    console.log('\n🎉 All error detection tests passed!');
    console.log('✅ JavaScript error monitoring is working correctly');
    console.log('✅ Variable reference issues would be caught');
    console.log('✅ Syntax errors would be detected');
    console.log('✅ Configuration loading is validated');
  } else {
    console.log('\n⚠️  Some tests failed - review the output above');
  }

  console.log('\n🚀 BENEFITS:');
  console.log('• Catches JavaScript runtime errors automatically');
  console.log('• Validates all configuration constants load correctly');
  console.log('• Monitors for variable reference issues');
  console.log('• Detects syntax errors and string literal problems');
  console.log('• Ensures manager initialization succeeds');
  console.log('• Provides detailed error reporting for debugging');
};

main().catch(console.error);
