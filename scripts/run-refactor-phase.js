/**
 * Refactor Phase Runner
 *
 * This script helps run refactor phases safely with baseline testing.
 * Usage: node scripts/run-refactor-phase.js [phase]
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

class RefactorPhaseRunner {
    constructor() {
        this.phases = {
            '1.1': {
                name: 'Database Connection Redundancy Fix',
                description: 'Remove redundant database connection attempts',
                files: ['server.js'],
                critical: true
            },
            '1.2': {
                name: 'Controller Database Access Fix',
                description: 'Remove direct Prisma client creation in controllers',
                files: ['src/controllers/EnhancedImageController.js', 'src/controllers/ProfileController.js'],
                critical: true
            },
            '1.3': {
                name: 'Middleware Consolidation',
                description: 'Consolidate rate limiting middleware',
                files: ['src/middleware/'],
                critical: false
            }
        };
    }

    async runPhase(phaseId) {
        const phase = this.phases[phaseId];
        if (!phase) {
            console.error(`❌ Unknown phase: ${phaseId}`);
            console.log('Available phases:', Object.keys(this.phases).join(', '));
            return false;
        }

        console.log(`🚀 Starting Phase ${phaseId}: ${phase.name}`);
        console.log(`📝 ${phase.description}`);
        console.log(`⚠️  Critical: ${phase.critical ? 'YES' : 'NO'}\n`);

        try {
            // Step 1: Run baseline test before changes
            console.log('🧪 Running baseline test BEFORE changes...');
            const beforeResult = await this.runBaselineTest();
            if (!beforeResult) {
                console.error('❌ Baseline test failed - cannot proceed with refactor');
                return false;
            }

            // Step 2: Show what will be changed
            console.log('\n📋 Files to be modified:');
            phase.files.forEach(file => {
                console.log(`  - ${file}`);
            });

            // Step 3: Ask for confirmation
            console.log('\n⚠️  Are you sure you want to proceed? (This will modify files)');
            console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...');
            await this.sleep(5000);

            // Step 4: Run the phase implementation
            console.log('\n🔧 Implementing phase changes...');
            await this.implementPhase(phaseId);

            // Step 5: Run baseline test after changes
            console.log('\n🧪 Running baseline test AFTER changes...');
            const afterResult = await this.runBaselineTest();

            if (afterResult) {
                console.log('✅ Phase completed successfully!');
                return true;
            } else {
                console.error('❌ Phase implementation broke the server!');
                console.log('🔄 Consider reverting changes...');
                return false;
            }

        } catch (error) {
            console.error('❌ Phase execution failed:', error.message);
            return false;
        }
    }

    async runBaselineTest() {
        try {
            console.log('Running baseline test...');
            const result = execSync('node tests/baseline-server-test.js', {
                encoding: 'utf8',
                timeout: 60000 // 60 second timeout
            });
            console.log('✅ Baseline test passed');
            return true;
        } catch (error) {
            console.error('❌ Baseline test failed:', error.message);
            return false;
        }
    }

    async implementPhase(phaseId) {
        switch (phaseId) {
            case '1.1':
                await this.implementPhase1_1();
                break;
            case '1.2':
                await this.implementPhase1_2();
                break;
            case '1.3':
                await this.implementPhase1_3();
                break;
            default:
                throw new Error(`Phase ${phaseId} implementation not found`);
        }
    }

    async implementPhase1_1() {
        console.log('🔧 Implementing Phase 1.1: Database Connection Redundancy Fix');

        // Read server.js
        const fs = await import('fs');
        const serverContent = fs.readFileSync('server.js', 'utf8');

        // Remove the redundant prismaClient.$connect() call
        const fixedContent = serverContent.replace(
            /await prismaClient\.\$connect\(\);\s*console\.log\('✅ Prisma client connected and ready'\);/,
            "console.log('✅ Prisma client connected and ready');"
        );

        // Write back the fixed content
        fs.writeFileSync('server.js', fixedContent);
        console.log('✅ Removed redundant database connection call');
    }

    async implementPhase1_2() {
        console.log('🔧 Implementing Phase 1.2: Controller Database Access Fix');

        const fs = await import('fs');

        // Fix EnhancedImageController.js
        const controllerContent = fs.readFileSync('src/controllers/EnhancedImageController.js', 'utf8');
        const fixedController = controllerContent.replace(
            /this\.prisma = new PrismaClient\(\);/,
            '// Removed: this.prisma = new PrismaClient(); // Use databaseClient.getClient() instead'
        );
        fs.writeFileSync('src/controllers/EnhancedImageController.js', fixedController);
        console.log('✅ Fixed EnhancedImageController.js');

        // Fix ProfileController.js
        const profileContent = fs.readFileSync('src/controllers/ProfileController.js', 'utf8');
        const fixedProfile = profileContent.replace(
            /this\.prisma = new PrismaClient\(\);/,
            '// Removed: this.prisma = new PrismaClient(); // Use databaseClient.getClient() instead'
        );
        fs.writeFileSync('src/controllers/ProfileController.js', fixedProfile);
        console.log('✅ Fixed ProfileController.js');
    }

    async implementPhase1_3() {
        console.log('🔧 Implementing Phase 1.3: Middleware Consolidation');
        console.log('⚠️  This phase requires manual implementation - too complex for automated fix');
        console.log('📋 Action items:');
        console.log('  1. Review all rate limiting middleware files');
        console.log('  2. Create unified rate limiting middleware');
        console.log('  3. Update route files to use unified middleware');
        console.log('  4. Remove duplicate middleware files');
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    showHelp() {
        console.log('🔧 Refactor Phase Runner');
        console.log('=======================');
        console.log('');
        console.log('Usage: node scripts/run-refactor-phase.js [phase]');
        console.log('');
        console.log('Available phases:');
        Object.entries(this.phases).forEach(([id, phase]) => {
            console.log(`  ${id}: ${phase.name} ${phase.critical ? '(CRITICAL)' : ''}`);
        });
        console.log('');
        console.log('Examples:');
        console.log('  node scripts/run-refactor-phase.js 1.1');
        console.log('  node scripts/run-refactor-phase.js 1.2');
    }
}

// Run the phase if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const runner = new RefactorPhaseRunner();
    const phaseId = process.argv[2];

    if (!phaseId) {
        runner.showHelp();
        process.exit(1);
    }

    runner.runPhase(phaseId)
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('❌ Phase runner failed:', error);
            process.exit(1);
        });
}

export default RefactorPhaseRunner;
