/**
 * Calculate Dezgo Costs and Establish Credit System
 * This script calculates actual Dezgo costs and establishes a proper credit system
 * based on Flux 1024px 30-steps as the baseline (1 credit)
 */

import DezgoCostCalculator from '../src/services/credit/DezgoCostCalculator.js';

const calculator = new DezgoCostCalculator();

console.log('🔍 DEZGO COST ANALYSIS');
console.log('======================\n');

// Calculate baseline cost (Flux 1024px 30 steps)
const baselineCost = calculator.calculateFluxCost('1024x1024', 30);
console.log(`📊 BASELINE: Flux 1024px 30 steps = $${baselineCost.toFixed(4)} = 1 credit\n`);

// Get all model costs
const allCosts = calculator.getAllModelCosts('1024x1024');

console.log('💰 MODEL COST BREAKDOWN');
console.log('=======================');

// Group by category
const categories = {};
allCosts.forEach(model => {
    if (!categories[model.category]) {
        categories[model.category] = [];
    }
    categories[model.category].push(model);
});

Object.keys(categories).forEach(category => {
    console.log(`\n📁 ${category.toUpperCase()} MODELS:`);
    console.log('─'.repeat(50));

    categories[category].forEach(model => {
        const creditCost = calculator.calculateCreditCost(model.provider);
        const ratio = (model.cost / baselineCost).toFixed(2);

        console.log(`${model.provider.padEnd(20)} $${model.cost.toFixed(4)} ${creditCost} credits (${ratio}x)`);
    });
});

console.log('\n🎯 RECOMMENDED CREDIT SYSTEM');
console.log('============================');

// Create recommended credit system
const creditSystem = allCosts.map(model => ({
    provider: model.provider,
    dezgoCost: model.cost,
    creditCost: calculator.calculateCreditCost(model.provider),
    category: model.category,
    ratio: (model.cost / baselineCost).toFixed(3)
}));

// Sort by credit cost
creditSystem.sort((a, b) => a.creditCost - b.creditCost);

console.log('\n📋 CREDIT SYSTEM (Flux 30-steps = 1 credit baseline):');
console.log('─'.repeat(80));
console.log('Provider'.padEnd(20) + 'Dezgo Cost'.padEnd(12) + 'Credits'.padEnd(8) + 'Ratio'.padEnd(8) + 'Category');
console.log('─'.repeat(80));

creditSystem.forEach(model => {
    console.log(
        model.provider.padEnd(20) +
        `$${model.dezgoCost.toFixed(4)}`.padEnd(12) +
        `${model.creditCost}`.padEnd(8) +
        `${model.ratio}x`.padEnd(8) +
        model.category
    );
});

console.log('\n💡 COST ANALYSIS SUMMARY');
console.log('========================');

// Calculate cost ranges
const costs = allCosts.map(m => m.cost);
const minCost = Math.min(...costs);
const maxCost = Math.max(...costs);
const avgCost = costs.reduce((a, b) => a + b, 0) / costs.length;

console.log(`Minimum cost: $${minCost.toFixed(4)}`);
console.log(`Maximum cost: $${maxCost.toFixed(4)}`);
console.log(`Average cost: $${avgCost.toFixed(4)}`);
console.log(`Cost range: $${(maxCost - minCost).toFixed(4)}`);

// Calculate credit ranges
const credits = creditSystem.map(m => m.creditCost);
const minCredits = Math.min(...credits);
const maxCredits = Math.max(...credits);

console.log(`\nCredit range: ${minCredits} - ${maxCredits} credits`);
console.log(`Credit multiplier range: ${(minCredits / baselineCost).toFixed(2)}x - ${(maxCredits / baselineCost).toFixed(2)}x`);

console.log('\n🎯 PRICING RECOMMENDATIONS');
console.log('==========================');

// Calculate recommended pricing
const targetMargin = 0.6; // 60% margin after Dezgo costs
const hostingCost = 0.002; // Estimated hosting cost per image
const stripeFee = 0.029; // Stripe fee (2.9%)

console.log(`\nTarget margin: ${(targetMargin * 100)}%`);
console.log(`Hosting cost per image: $${hostingCost}`);
console.log(`Stripe fee: ${(stripeFee * 100)}%`);

// Calculate recommended price per credit
const totalCosts = baselineCost + hostingCost;
const recommendedPricePerCredit = totalCosts * (1 + targetMargin) / (1 - stripeFee);

console.log(`\nBaseline cost (Flux): $${baselineCost.toFixed(4)}`);
console.log(`Total costs (incl. hosting): $${totalCosts.toFixed(4)}`);
console.log(`Recommended price per credit: $${recommendedPricePerCredit.toFixed(4)}`);

// Package recommendations
console.log('\n📦 PACKAGE RECOMMENDATIONS');
console.log('==========================');

const packages = [
    { name: 'Starter', credits: 10, discount: 0 },
    { name: 'Pro', credits: 50, discount: 0.15 },
    { name: 'Enterprise', credits: 200, discount: 0.25 }
];

packages.forEach(pkg => {
    const pricePerCredit = recommendedPricePerCredit * (1 - pkg.discount);
    const totalPrice = pkg.credits * pricePerCredit;
    const profitPerCredit = pricePerCredit - totalCosts;
    const profitMargin = (profitPerCredit / pricePerCredit) * 100;

    console.log(`\n${pkg.name} Package (${pkg.credits} credits):`);
    console.log(`  Price per credit: $${pricePerCredit.toFixed(4)}`);
    console.log(`  Total price: $${totalPrice.toFixed(2)}`);
    console.log(`  Profit per credit: $${profitPerCredit.toFixed(4)}`);
    console.log(`  Profit margin: ${profitMargin.toFixed(1)}%`);
    console.log(`  Discount: ${(pkg.discount * 100)}%`);
});

console.log('\n✅ ANALYSIS COMPLETE');
console.log('===================');
console.log('Use these calculations to update your credit system and pricing!');
