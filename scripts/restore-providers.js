import { STATIC_MODELS } from '../src/config/static-models.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function restoreProviders() {
    try {
        console.log('🔄 Starting providers/models restoration...');

        // Get all static models
        const staticModels = Object.values(STATIC_MODELS);
        console.log(`📊 Found ${staticModels.length} models to restore`);

        let successCount = 0;
        let errorCount = 0;
        let skippedCount = 0;

        // Clear existing models data
        console.log('🗑️ Clearing existing models data...');
        await prisma.model.deleteMany({});

        // Process each model
        for (const model of staticModels) {
            try {
                // Check if model already exists (shouldn't happen after deleteMany, but just in case)
                const existingModel = await prisma.model.findUnique({
                    where: {
                        provider_name: {
                            provider: model.provider,
                            name: model.name
                        }
                    }
                });

                if (existingModel) {
                    console.log(`⏭️ Skipping existing model: ${model.provider}/${model.name}`);
                    skippedCount++;
                    continue;
                }

                // Insert into MySQL database
                await prisma.model.create({
                    data: {
                        provider: model.provider,
                        name: model.name,
                        displayName: model.displayName,
                        description: model.description,
                        costPerImage: model.costPerImage,
                        isActive: model.isActive,
                        apiUrl: model.apiUrl,
                        apiModel: model.apiModel,
                        apiSize: model.apiSize,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                });

                successCount++;

                // Progress indicator
                if (successCount % 10 === 0) {
                    console.log(`✅ Processed ${successCount} models...`);
                }

            } catch (modelError) {
                console.error(`❌ Error processing model ${model.provider}/${model.name}:`, modelError.message);
                errorCount++;
            }
        }

        console.log('\n🎉 Providers/models restoration completed!');
        console.log(`✅ Successfully restored: ${successCount} models`);
        console.log(`⏭️ Skipped: ${skippedCount} models`);
        console.log(`❌ Errors encountered: ${errorCount} models`);

        // Verify the restoration
        const totalCount = await prisma.model.count();
        console.log(`📊 Total models in database: ${totalCount}`);

        // Show provider breakdown
        const providerBreakdown = await prisma.model.groupBy({
            by: ['provider'],
            _count: {
                provider: true
            }
        });

        console.log('\n📈 Provider breakdown:');
        providerBreakdown.forEach(provider => {
            console.log(`  ${provider.provider}: ${provider._count.provider} models`);
        });

    } catch (error) {
        console.error('💥 Fatal error during restoration:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the restoration
restoreProviders()
    .then(() => {
        console.log('✨ Restoration script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Restoration script failed:', error);
        process.exit(1);
    });

export { restoreProviders };
