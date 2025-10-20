#!/usr/bin/env node

/**
 * Populate Railway Word Types Database
 * This script should be run ON Railway (not via Railway CLI)
 */

import { PrismaClient } from '@prisma/client';

// Use Railway's MYSQL_URL environment variable
const databaseUrl = process.env.MYSQL_URL || process.env.DATABASE_URL;

console.log('🚀 Railway Word Types Population Script');
console.log('Environment:', process.env.NODE_ENV || 'undefined');
console.log('Database URL source:', process.env.MYSQL_URL ? 'MYSQL_URL' : 'DATABASE_URL');

if (databaseUrl) {
    console.log('Database URL preview:', `${databaseUrl.substring(0, 50)}...`);
    console.log('Is Railway URL:', databaseUrl.includes('railway.internal') ? 'YES ✅' : 'NO ❌');
} else {
    console.error('❌ No database URL found!');
    process.exit(1);
}

// Set DATABASE_URL for Prisma if using MYSQL_URL
if (process.env.MYSQL_URL && !process.env.DATABASE_URL) {
    process.env.DATABASE_URL = process.env.MYSQL_URL;
}

const prisma = new PrismaClient();

// Full word types data (first 50 records for testing)
const wordTypesData = [
    { word: 'movie lights', types: ['Floodlights', 'Spotlights', 'Strobe lights', 'Gobo lights', 'Dimmable lights', 'LED lights', 'Par lights', 'Moving lights', 'Black lights', 'UV lights', 'Fire lights', 'Flickering lights', 'Neon lights', 'Disco lights', 'Lasers', 'Glow sticks', 'Candle lights', 'Table lights', 'Lamp lights', 'Projector lights', 'Softbox lights', 'Selfie lights', 'Underwater lights', 'Wireless lights', 'Solar lights', 'Flame lights', 'Dance floor lights', 'Chandelier lights', 'Globe lights', 'Fairy lights'] },
    { word: 'event space', types: ['Music Festival', 'Wedding Hall', 'Conference Center', 'Art Gallery', 'Sports Stadium', 'Hotel Ballroom', 'Library Meeting Room', 'Restaurant Private Room', 'Corporate Office', 'Outdoor Park', 'College Auditorium', 'Theater', 'Cinema', 'Nightclub', 'Bar', 'Pub', 'Rooftop', 'Garden', 'Beach', 'Mountain', 'Forest', 'Desert', 'City Square', 'Shopping Mall', 'Museum', 'Gallery', 'Studio', 'Warehouse', 'Factory', 'Church', 'Temple'] },
    { word: 'detailed examples', types: ['Photos', 'Screenshots', 'Examples', 'Samples', 'Demonstrations', 'Illustrations', 'Cases', 'Instances', 'References', 'Models', 'Templates', 'Prototypes', 'Mockups', 'Wireframes', 'Diagrams', 'Charts', 'Graphs', 'Infographics', 'Presentations', 'Tutorials', 'Guides', 'Documentation', 'Specifications', 'Requirements', 'User Stories', 'Test Cases', 'Code Samples', 'API Examples', 'Database Schemas', 'Architecture Diagrams'] },
    { word: 'biblical events', types: ['Creation of the World', 'Adam and Eve in the Garden of Eden', "Cain and Abel's offerings", "Noah's Ark and the flood", 'Tower of Babel', "God's Covenant with Abraham", 'The Birth of Isaac', "Abraham's Sacrifice of Isaac", "Jacob's Ladder", "Joseph's Coat of Many Colors", 'Joseph in Egypt', 'The burning bush', 'Passover', 'Parting of the Red Sea', 'Giving of the Ten Commandments', 'The Golden Calf', 'The Spies in Canaan', 'Joshua and the Battle of Jericho'] },
    { word: 'description modern desk', types: ['This modern desk features a clean, sleek design with a smooth, white finish. It is made of durable materials', 'Contemporary style furniture with minimalist design approach', 'Clean lines and geometric shapes', 'High-quality wood construction', 'Ergonomic design for comfort', 'Built-in storage compartments', 'Cable management system', 'Adjustable height mechanism', 'Glass top surface', 'Metal frame construction', 'Industrial design elements', 'Scandinavian style influences'] },
    { word: 'skirts', types: ['A-line skirt', 'Accordion skirt', 'Asymmetrical skirt', 'Ballerina skirt', 'Bell skirt', 'Box pleat skirt', 'Circle skirt', 'Dirndl skirt', 'Flared skirt', 'Gathered skirt', 'Hobble skirt', 'Kilt', 'Maxi skirt', 'Mini skirt', 'Midi skirt', 'Pencil skirt', 'Pleated skirt', 'Tiered skirt', 'Wrap skirt', 'Tutu', 'Sarong', 'Culottes', 'Skort', 'Pareo'] },
    { word: 'cinestill 800tungsten', types: ['Photos taken under neon lights', 'Night cityscape shots', 'Low light forest photography', 'Sunset photo shoots', 'Candle-lit dinner photographs', 'Moonlit landscapes', 'Portraits under fluorescent lighting', 'Evening street photos', 'Twilight urban shots', 'Night-time beach photography', 'Midnight city views', 'Event photography in ambient light', 'Wedding photography at night', 'Star trail photography', 'Portraits shot under a streetlamp', 'Ghost town photos at night', 'Rainy night city streets', 'Festival lights photography'] },
    { word: 'photography styles', types: ['Portrait photography', 'Landscape photography', 'Street photography', 'Macro photography', 'Architectural photography', 'Fashion photography', 'Wedding photography', 'Event photography', 'Sports photography', 'Wildlife photography', 'Food photography', 'Product photography', 'Documentary photography', 'Fine art photography', 'Black and white photography', 'HDR photography', 'Long exposure photography', 'Time-lapse photography'] },
    { word: 'lighting setups', types: ['Natural lighting', 'Studio lighting', 'Flash photography', 'Continuous lighting', 'LED panels', 'Softbox lighting', 'Ring light', 'Beauty dish', 'Umbrella lighting', 'Strip lighting', 'Accent lighting', 'Back lighting', 'Side lighting', 'Front lighting', 'Rim lighting', 'Fill lighting', 'Key lighting', 'Ambient lighting', 'Practical lighting', 'Colored gel lighting'] },
    { word: 'color palettes', types: ['Warm tones', 'Cool tones', 'Monochromatic', 'Complementary colors', 'Analogous colors', 'Triadic colors', 'Tetradic colors', 'Split-complementary', 'Pastel colors', 'Vibrant colors', 'Earth tones', 'Neutral colors', 'Primary colors', 'Secondary colors', 'Tertiary colors', 'Cool blues', 'Warm oranges', 'Forest greens', 'Sunset colors', 'Ocean blues', 'Autumn colors', 'Spring colors', 'Winter colors', 'Summer colors'] },
    { word: 'textures', types: ['Smooth', 'Rough', 'Soft', 'Hard', 'Glossy', 'Matte', 'Shiny', 'Dull', 'Satin', 'Velvet', 'Silk', 'Cotton', 'Leather', 'Wood grain', 'Metal', 'Glass', 'Stone', 'Fabric', 'Paper', 'Plastic', 'Rubber', 'Ceramic', 'Crystal', 'Marble', 'Granite', 'Brick', 'Concrete', 'Sand', 'Water', 'Fire', 'Ice'] },
    { word: 'materials', types: ['Wood', 'Metal', 'Glass', 'Plastic', 'Fabric', 'Leather', 'Paper', 'Ceramic', 'Stone', 'Crystal', 'Marble', 'Granite', 'Brick', 'Concrete', 'Rubber', 'Silicon', 'Carbon fiber', 'Aluminum', 'Steel', 'Copper', 'Brass', 'Silver', 'Gold', 'Platinum', 'Titanium', 'Bamboo', 'Cork', 'Wool', 'Cotton', 'Silk', 'Linen'] },
    { word: 'shapes', types: ['Circle', 'Square', 'Triangle', 'Rectangle', 'Oval', 'Diamond', 'Heart', 'Star', 'Hexagon', 'Pentagon', 'Octagon', 'Crescent', 'Spiral', 'Wave', 'Zigzag', 'Curved', 'Angular', 'Geometric', 'Organic', 'Symmetrical', 'Asymmetrical', 'Regular', 'Irregular', 'Simple', 'Complex', 'Abstract', 'Concrete', 'Minimalist', 'Ornate', 'Detailed'] },
    { word: 'patterns', types: ['Stripes', 'Dots', 'Checks', 'Plaid', 'Floral', 'Geometric', 'Abstract', 'Animal print', 'Polka dots', 'Paisley', 'Damask', 'Herringbone', 'Twill', 'Basket weave', 'Houndstooth', 'Tartan', 'Gingham', 'Pinstripe', 'Solid', 'Gradient', 'Ombre', 'Tie-dye', 'Batik', 'Ikat', 'Jacquard', 'Brocade', 'Embossed', 'Textured', 'Raised', 'Etched'] },
    { word: 'styles', types: ['Modern', 'Contemporary', 'Traditional', 'Classic', 'Vintage', 'Retro', 'Minimalist', 'Maximalist', 'Industrial', 'Rustic', 'Bohemian', 'Scandinavian', 'Mediterranean', 'Asian', 'Art Deco', 'Art Nouveau', 'Gothic', 'Baroque', 'Rococo', 'Victorian', 'Edwardian', 'Mid-century', 'Post-modern', 'Futuristic', 'Steampunk', 'Grunge', 'Punk', 'Glam', 'Chic', 'Elegant'] }
];

async function populateRailwayWordTypes() {
    try {
        console.log('\n📊 Testing Railway database connection...');
        await prisma.$queryRaw`SELECT 1`;
        console.log('✅ Connected to Railway database');

        // Get database info
        console.log('\n📊 Database information:');
        try {
            const [dbInfo] = await prisma.$queryRaw`SELECT DATABASE() as current_db`;

            console.log('Current database:', dbInfo.current_db);
        } catch (error) {
            console.log('Could not get database info:', error.message);
        }

        // Check current state
        const currentCount = await prisma.word_types.count();

        console.log(`📊 Current word_types count: ${currentCount}`);

        if (currentCount > 0) {
            console.log('🗑️ Clearing existing data...');
            await prisma.word_types.deleteMany({});
            console.log('✅ Existing data cleared');
        }

        // Insert new data
        console.log(`📥 Inserting ${wordTypesData.length} word_types records...`);
        await prisma.word_types.createMany({
            data: wordTypesData,
            skipDuplicates: true
        });

        // Verify insertion
        const newCount = await prisma.word_types.count();

        console.log(`✅ Successfully inserted ${newCount} word_types records`);

        // Show sample records
        console.log('\n📋 Sample records in Railway database:');
        const samples = await prisma.word_types.findMany({
            take: 5,
            select: {
                word: true,
                types: true
            }
        });

        samples.forEach((record, index) => {
            const typesCount = Array.isArray(record.types) ? record.types.length : 'unknown';
            const typesPreview = JSON.stringify(record.types).substring(0, 60);

            console.log(`${index + 1}. "${record.word}" (${typesCount} types) -> ${typesPreview}...`);
        });

        console.log('\n🎉 Railway word_types database populated successfully!');

    } catch (error) {
        console.error('❌ Population failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the population
populateRailwayWordTypes()
    .then(() => {
        console.log('\n✨ All done! Railway now has word_types data.');
        process.exit(0);
    })
    .catch(error => {
        console.error('💥 Population failed:', error);
        process.exit(1);
    });
