#!/usr/bin/env node

/**
 * Model Cleanup Script
 *
 * Removes invalid models from the static configuration based on validation results.
 * This helps keep the model list clean and focused on working models.
 */

import fs from 'fs';
import { getAllStaticModels } from './src/config/static-models.js';

class ModelCleanup {
    constructor() {
        this.staticModelsPath = './src/config/static-models.js';
        this.validationResultsPath = './model-validation-results.json';
    }

    /**
     * Load validation results
     */
    loadValidationResults() {
        if (!fs.existsSync(this.validationResultsPath)) {
            throw new Error(`Validation results not found at ${this.validationResultsPath}. Run test-models.js first.`);
        }

        const data = fs.readFileSync(this.validationResultsPath, 'utf8');
        return JSON.parse(data);
    }

    /**
     * Get list of invalid models to remove
     */
    getInvalidModels(validationResults) {
        return validationResults.results.invalid.map(model => model.model);
    }

    /**
     * Get list of slow models to consider removing
     */
    getSlowModels(validationResults) {
        return validationResults.results.slow.map(model => model.model);
    }

    /**
     * Clean up static models configuration
     */
    cleanupStaticModels(invalidModels, slowModels = []) {
        console.log('🧹 Cleaning up static models configuration...');

        const currentModels = getAllStaticModels();
        console.log(`📊 Current models: ${currentModels.length}`);

        // Filter out invalid models
        const validModels = currentModels.filter(model => !invalidModels.includes(model.name));
        console.log(`✅ Valid models: ${validModels.length}`);
        console.log(`❌ Removed invalid models: ${invalidModels.length}`);

        // Show slow models for review
        if (slowModels.length > 0) {
            console.log(`\n⚠️  Slow models to review: ${slowModels.length}`);
            slowModels.forEach(model => {
                console.log(`  • ${model}`);
            });
        }

        return validModels;
    }

    /**
     * Generate new static models configuration
     */
    generateNewConfig(validModels) {
        const config = `/**
 * Static Model Configuration
 *
 * This file serves as:
 * 1. Fallback configuration when database is unavailable
 * 2. Seed data source for initial database population
 * 3. Single source of truth for model definitions
 *
 * When adding new models, update this file first, then the database
 * will be automatically updated through seeding scripts.
 *
 * Last cleaned: ${new Date().toISOString()}
 */

export const STATIC_MODELS = {
${validModels.map(model => this.generateModelConfig(model)).join(',\n')}
};

// Helper functions
export function getAllStaticModels() {
    return Object.values(STATIC_MODELS);
}

export function getStaticModel(modelName) {
    return STATIC_MODELS[modelName] || null;
}

export function getStaticModelsByProvider(provider) {
    return Object.values(STATIC_MODELS).filter(model => model.provider === provider);
}

export function getStaticImageGeneratorConfig(modelName) {
    const model = getStaticModel(modelName);
    if (!model || !model.isActive) return null;

    return {
        type: model.provider,
        url: model.apiUrl,
        model: model.apiModel,
        size: model.apiSize
    };
}

export function getStaticCreditCost(modelName) {
    const model = getStaticModel(modelName);
    return model ? model.costPerImage : 1;
}

export function getStaticValidModelNames() {
    return Object.values(STATIC_MODELS)
        .filter(model => model.isActive)
        .map(model => model.name);
}

export function getStaticFrontendProviderList() {
    return Object.values(STATIC_MODELS)
        .filter(model => model.isActive)
        .map(model => ({
            value: model.name,
            label: model.displayName
        }));
}

export function isStaticModelValid(modelName) {
    const model = getStaticModel(modelName);
    return model && model.isActive;
}

export function getStaticCostBreakdown() {
    const models = getAllStaticModels();
    const breakdown = {};

    models.forEach(model => {
        const usdCost = model.costPerImage * 0.0228; // Flux baseline
        breakdown[model.name] = {
            credits: model.costPerImage,
            usd: usdCost,
            provider: model.provider
        };
    });

    return breakdown;
}
`;

        return config;
    }

    /**
     * Generate model configuration string
     */
    generateModelConfig(model) {
        return `    ${model.name}: {
        provider: '${model.provider}',
        name: '${model.name}',
        displayName: '${model.displayName}',
        description: '${model.description}',
        costPerImage: ${model.costPerImage},
        isActive: ${model.isActive},
        apiUrl: '${model.apiUrl}',
        apiModel: '${model.apiModel}',
        apiSize: '${model.apiSize}'
    }`;
    }

    /**
     * Create backup of current configuration
     */
    createBackup() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = `./src/config/static-models.backup.${timestamp}.js`;

        if (fs.existsSync(this.staticModelsPath)) {
            fs.copyFileSync(this.staticModelsPath, backupPath);
            console.log(`💾 Backup created: ${backupPath}`);
        }
    }

    /**
     * Write new configuration
     */
    writeNewConfig(config) {
        fs.writeFileSync(this.staticModelsPath, config);
        console.log(`✅ Updated configuration: ${this.staticModelsPath}`);
    }

    /**
     * Run cleanup process
     */
    async run() {
        try {
            console.log('🧹 Starting model cleanup process...\n');

            // Load validation results
            const validationResults = this.loadValidationResults();
            console.log(`📊 Loaded validation results from ${validationResults.timestamp}`);

            // Get models to remove
            const invalidModels = this.getInvalidModels(validationResults);
            const slowModels = this.getSlowModels(validationResults);

            if (invalidModels.length === 0) {
                console.log('✅ No invalid models found. Nothing to clean up!');
                return;
            }

            // Create backup
            this.createBackup();

            // Clean up models
            const validModels = this.cleanupStaticModels(invalidModels, slowModels);

            // Generate new configuration
            const newConfig = this.generateNewConfig(validModels);

            // Write new configuration
            this.writeNewConfig(newConfig);

            console.log('\n✅ Cleanup completed successfully!');
            console.log('\n📋 Summary:');
            console.log(`  • Removed ${invalidModels.length} invalid models`);
            console.log(`  • Kept ${validModels.length} valid models`);
            if (slowModels.length > 0) {
                console.log(`  • ${slowModels.length} slow models flagged for review`);
            }

        } catch (error) {
            console.error('❌ Cleanup failed:', error.message);
            process.exit(1);
        }
    }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
    const cleanup = new ModelCleanup();
    cleanup.run();
}
