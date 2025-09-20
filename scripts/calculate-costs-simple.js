/**
 * Calculate Dezgo Costs and Establish Credit System (Simple Version)
 */

// Pricing from pricing.md - Dezgo API costs
const pricing = {
    // Flux models (1024x1024, 30 steps)
    flux: {
        megapixels: 1.05, // 1024x1024 = 1,048,576 pixels = 1.05 megapixels
        steps: 30,
        costPerMegapixelPerStep: 0.000725, // >= 4 steps
        calculatedCost: 0.000725 * 1.05 * 30 // = $0.0228
    },

    // Stable Diffusion XL models (1024x1024, 20 steps)
    sdxl: {
        steps: 20,
        calculatedCost: 0.0075 // From pricing table: $0.0075 for 20 steps
    },

    // Stable Diffusion 1/2 models
    sd1024: {
        costPerImage: 0.0181
    },
    sd512: {
        costPerImage: 0.0019
    },

    // DALL-E 3 (OpenAI pricing)
    dalle3: {
        costPerImage: 0.02 // Approximate OpenAI cost
    }
};

// Model configurations
const models = {
    flux: { category: 'Flux', cost: pricing.flux.calculatedCost },
    juggernaut: { category: 'SDXL', cost: pricing.sdxl.calculatedCost },
    dreamshaper: { category: 'SDXL', cost: pricing.sdxl.calculatedCost },
    dreamshaperlighting: { category: 'SDXL', cost: pricing.sdxl.calculatedCost },
    bluepencil: { category: 'SDXL', cost: pricing.sdxl.calculatedCost },
    tshirt: { category: 'SDXL', cost: pricing.sdxl.calculatedCost },
    absolute: { category: 'SD 1/2', cost: pricing.sd1024.costPerImage },
    realisticvision: { category: 'SD 1/2', cost: pricing.sd1024.costPerImage },
    icbinp: { category: 'SD 1/2', cost: pricing.sd1024.costPerImage },
    icbinp_seco: { category: 'SD 1/2', cost: pricing.sd1024.costPerImage },
    hasdx: { category: 'SD 1/2', cost: pricing.sd1024.costPerImage },
    redshift: { category: 'SD 1/2', cost: pricing.sd1024.costPerImage },
    analogmadness: { category: 'SD 1/2', cost: pricing.sd1024.costPerImage },
    portraitplus: { category: 'SD 1/2', cost: pricing.sd1024.costPerImage },
    nightmareshaper: { category: 'SD 1/2', cost: pricing.sd1024.costPerImage },
    openjourney: { category: 'SD 1/2', cost: pricing.sd1024.costPerImage },
    abyssorange: { category: 'SD 1/2', cost: pricing.sd1024.costPerImage },
    cyber: { category: 'SD 1/2', cost: pricing.sd1024.costPerImage },
    disco: { category: 'SD 1/2', cost: pricing.sd1024.costPerImage },
    synthwave: { category: 'SD 1/2', cost: pricing.sd1024.costPerImage },
    lowpoly: { category: 'SD 1/2', cost: pricing.sd1024.costPerImage },
    ink: { category: 'SD 1/2', cost: pricing.sd1024.costPerImage },
    dalle3: { category: 'DALL-E', cost: pricing.dalle3.costPerImage },
    dalle: { category: 'DALL-E', cost: pricing.dalle3.costPerImage }
};

function roundToCreditIncrement(creditCost) {
    if (creditCost <= 0.25) return 0.25;
    if (creditCost <= 0.5) return 0.5;
    if (creditCost <= 0.75) return 0.75;
    if (creditCost <= 1) return 1;
    if (creditCost <= 1.5) return 1.5;
    if (creditCost <= 2) return 2;
    if (creditCost <= 2.5) return 2.5;
    if (creditCost <= 3) return 3;
    if (creditCost <= 4) return 4;
    return Math.ceil(creditCost);
}

console.log('🔍 DEZGO COST ANALYSIS');
console.log('======================\n');

// Calculate baseline cost (Flux 1024px 30 steps)
const baselineCost = pricing.flux.calculatedCost;
console.log(`📊 BASELINE: Flux 1024px 30 steps = $${baselineCost.toFixed(4)} = 1 credit\n`);

console.log('💰 MODEL COST BREAKDOWN');
console.log('=======================');

// Group by category
const categories = {};
Object.keys(models).forEach(provider => {
    const model = models[provider];
    if (!categories[model.category]) {
        categories[model.category] = [];
    }
    categories[model.category].push({ provider, ...model });
});

Object.keys(categories).forEach(category => {
    console.log(`\n📁 ${category.toUpperCase()} MODELS:`);
    console.log('─'.repeat(50));

    categories[category].forEach(model => {
        const creditCost = roundToCreditIncrement(model.cost / baselineCost);
        const ratio = (model.cost / baselineCost).toFixed(2);

        console.log(`${model.provider.padEnd(20)} $${model.cost.toFixed(4)} ${creditCost} credits (${ratio}x)`);
    });
});

console.log('\n🎯 RECOMMENDED CREDIT SYSTEM');
console.log('============================');

// Create recommended credit system
const creditSystem = Object.keys(models).map(provider => {
    const model = models[provider];
    return {
        provider,
        dezgoCost: model.cost,
        creditCost: roundToCreditIncrement(model.cost / baselineCost),
        category: model.category,
        ratio: (model.cost / baselineCost).toFixed(3)
    };
});

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
const costs = Object.values(models).map(m => m.cost);
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
