#!/usr/bin/env node

/**
 * Master Batch Processing Runner
 * Executes both image generation and blog creation batch processes
 */

import { BatchImageGenerator } from './batch-image-generator.js';
import { BatchBlogCreator } from './batch-blog-creator.js';
import fs from 'fs';
import path from 'path';

class BatchProcessor {
    constructor() {
        this.results = {
            images: null,
            blogs: null
        };
    }

    async runImageBatch(options = {}) {
        console.log('🖼️ Starting Image Generation Batch Processing');
        console.log('============================================\n');

        const generator = new BatchImageGenerator();
        const imageRequests = await this.loadImageRequests();

        const results = await generator.processBatch(imageRequests, {
            delayBetweenRequests: 3000,
            maxConcurrent: 1,
            saveResults: true,
            outputFile: `batch-image-results-${Date.now()}.json`,
            ...options
        });

        this.results.images = results;
        return results;
    }

    async runBlogBatch(options = {}) {
        console.log('\n📝 Starting Blog Post Creation Batch Processing');
        console.log('===============================================\n');

        const creator = new BatchBlogCreator();
        const blogRequests = await this.loadBlogRequests();

        const results = await creator.processBatch(blogRequests, {
            delayBetweenRequests: 1000,
            maxConcurrent: 1,
            saveResults: true,
            outputFile: `batch-blog-results-${Date.now()}.json`,
            ...options
        });

        this.results.blogs = results;
        return results;
    }

    async runBothBatches(options = {}) {
        console.log('🚀 Starting Complete Batch Processing');
        console.log('====================================\n');

        const startTime = Date.now();

        // Run image generation first
        await this.runImageBatch(options.images);

        // Wait a bit between batches
        console.log('\n⏳ Waiting 5 seconds before starting blog creation...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Run blog creation
        await this.runBlogBatch(options.blogs);

        // Generate combined summary
        this.generateCombinedSummary(startTime);

        return this.results;
    }

    async loadImageRequests() {
        const imageRequestsPath = path.join(process.cwd(), 'scripts', 'batch-processing', 'image-requests.json');

        try {
            if (fs.existsSync(imageRequestsPath)) {
                const data = JSON.parse(await fs.promises.readFile(imageRequestsPath, 'utf8'));
                return data.requests || data;
            }
        } catch (error) {
            console.log(`⚠️ Error loading custom image requests: ${error.message}`);
        }

        return null; // Will use defaults
    }

    async loadBlogRequests() {
        const blogRequestsPath = path.join(process.cwd(), 'scripts', 'batch-processing', 'blog-requests.json');

        try {
            if (fs.existsSync(blogRequestsPath)) {
                const data = JSON.parse(await fs.promises.readFile(blogRequestsPath, 'utf8'));
                return data.requests || data;
            }
        } catch (error) {
            console.log(`⚠️ Error loading custom blog requests: ${error.message}`);
        }

        return null; // Will use defaults
    }

    generateCombinedSummary(startTime) {
        const totalTime = Date.now() - startTime;

        console.log('\n🎉 Combined Batch Processing Summary');
        console.log('====================================');
        console.log(`⏱️ Total processing time: ${(totalTime / 1000).toFixed(1)}s`);

        if (this.results.images) {
            const imageSummary = this.results.images.summary;
            console.log(`\n🖼️ Image Generation:`);
            console.log(`   ✅ Successful: ${imageSummary.successful}/${imageSummary.totalRequests}`);
            console.log(`   ❌ Failed: ${imageSummary.failed}/${imageSummary.totalRequests}`);
            console.log(`   📊 Success rate: ${imageSummary.successRate.toFixed(1)}%`);
            console.log(`   ⚡ Average time: ${imageSummary.averageTime.toFixed(0)}ms per image`);
        }

        if (this.results.blogs) {
            const blogSummary = this.results.blogs.summary;
            console.log(`\n📝 Blog Creation:`);
            console.log(`   ✅ Successful: ${blogSummary.successful}/${blogSummary.totalRequests}`);
            console.log(`   ❌ Failed: ${blogSummary.failed}/${blogSummary.totalRequests}`);
            console.log(`   📊 Success rate: ${blogSummary.successRate.toFixed(1)}%`);
            console.log(`   ⚡ Average time: ${blogSummary.averageTime.toFixed(0)}ms per blog`);
        }

        // Overall statistics
        const totalSuccessful = (this.results.images?.summary.successful || 0) + (this.results.blogs?.summary.successful || 0);
        const totalFailed = (this.results.images?.summary.failed || 0) + (this.results.blogs?.summary.failed || 0);
        const totalRequests = totalSuccessful + totalFailed;
        const overallSuccessRate = totalRequests > 0 ? (totalSuccessful / totalRequests) * 100 : 0;

        console.log(`\n📊 Overall Statistics:`);
        console.log(`   ✅ Total successful: ${totalSuccessful}`);
        console.log(`   ❌ Total failed: ${totalFailed}`);
        console.log(`   📊 Overall success rate: ${overallSuccessRate.toFixed(1)}%`);
    }

    async saveCombinedResults() {
        const outputPath = path.join(process.cwd(), 'scripts', 'batch-processing', `combined-batch-results-${Date.now()}.json`);

        const outputData = {
            timestamp: new Date().toISOString(),
            results: this.results,
            summary: {
                images: this.results.images?.summary || null,
                blogs: this.results.blogs?.summary || null
            }
        };

        try {
            await fs.promises.writeFile(outputPath, JSON.stringify(outputData, null, 2));
            console.log(`\n💾 Combined results saved to: ${outputPath}`);
        } catch (error) {
            console.log(`\n❌ Failed to save combined results: ${error.message}`);
        }
    }
}

// Command line interface
async function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'both';

    const processor = new BatchProcessor();

    switch (command) {
        case 'images':
            console.log('🖼️ Running image generation batch only...\n');
            await processor.runImageBatch();
            break;

        case 'blogs':
            console.log('📝 Running blog creation batch only...\n');
            await processor.runBlogBatch();
            break;

        case 'both':
        default:
            console.log('🚀 Running both image generation and blog creation batches...\n');
            await processor.runBothBatches();
            await processor.saveCombinedResults();
            break;
    }

    console.log('\n🎉 Batch processing completed!');
}

// Help function
function showHelp() {
    console.log('🚀 Batch Processing Script');
    console.log('==========================\n');
    console.log('Usage: node run-batch-processing.js [command]\n');
    console.log('Commands:');
    console.log('  images  - Run image generation batch only');
    console.log('  blogs   - Run blog creation batch only');
    console.log('  both    - Run both batches (default)');
    console.log('  help    - Show this help message\n');
    console.log('Examples:');
    console.log('  node run-batch-processing.js images');
    console.log('  node run-batch-processing.js blogs');
    console.log('  node run-batch-processing.js both\n');
    console.log('Configuration:');
    console.log('  - Custom image requests: scripts/batch-processing/image-requests.json');
    console.log('  - Custom blog requests: scripts/batch-processing/blog-requests.json');
    console.log('  - Results saved to: scripts/batch-processing/');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    if (process.argv.includes('help') || process.argv.includes('--help') || process.argv.includes('-h')) {
        showHelp();
    } else {
        main().catch(console.error);
    }
}

export { BatchProcessor, main, showHelp };
