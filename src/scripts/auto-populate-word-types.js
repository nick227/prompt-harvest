#!/usr/bin/env node

/**
 * Auto-populate word_types on Railway startup
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Essential word types data
const essentialWordTypes = [
    { word: "movie lights", types: ["Floodlights","Spotlights","Strobe lights","Gobo lights","Dimmable lights","LED lights","Par lights","Moving lights","Black lights","UV lights","Fire lights","Flickering lights","Neon lights","Disco lights","Lasers","Glow sticks","Candle lights","Table lights","Lamp lights","Projector lights","Softbox lights","Selfie lights","Underwater lights","Wireless lights","Solar lights","Flame lights","Dance floor lights","Chandelier lights","Globe lights","Fairy lights"] },
    { word: "event space", types: ["Music Festival","Wedding Hall","Conference Center","Art Gallery","Sports Stadium","Hotel Ballroom","Library Meeting Room","Restaurant Private Room","Corporate Office","Outdoor Park","College Auditorium","Theater","Cinema","Nightclub","Bar","Pub","Rooftop","Garden","Beach","Mountain","Forest","Desert","City Square","Shopping Mall","Museum","Gallery","Studio","Warehouse","Factory","Church","Temple"] },
    { word: "detailed examples", types: ["Photos","Screenshots","Examples","Samples","Demonstrations","Illustrations","Cases","Instances","References","Models","Templates","Prototypes","Mockups","Wireframes","Diagrams","Charts","Graphs","Infographics","Presentations","Tutorials","Guides","Documentation","Specifications","Requirements","User Stories","Test Cases","Code Samples","API Examples","Database Schemas","Architecture Diagrams"] },
    { word: "biblical events", types: ["Creation of the World","Adam and Eve in the Garden of Eden","Cain and Abel's offerings","Noah's Ark and the flood","Tower of Babel","God's Covenant with Abraham","The Birth of Isaac","Abraham's Sacrifice of Isaac","Jacob's Ladder","Joseph's Coat of Many Colors","Joseph in Egypt","The burning bush","Passover","Parting of the Red Sea","Giving of the Ten Commandments","The Golden Calf","The Spies in Canaan","Joshua and the Battle of Jericho"] },
    { word: "description modern desk", types: ["This modern desk features a clean, sleek design with a smooth, white finish. It is made of durable materials","Contemporary style furniture with minimalist design approach","Clean lines and geometric shapes","High-quality wood construction","Ergonomic design for comfort","Built-in storage compartments","Cable management system","Adjustable height mechanism","Glass top surface","Metal frame construction","Industrial design elements","Scandinavian style influences"] },
    { word: "skirts", types: ["A-line skirt","Accordion skirt","Asymmetrical skirt","Ballerina skirt","Bell skirt","Box pleat skirt","Circle skirt","Dirndl skirt","Flared skirt","Gathered skirt","Hobble skirt","Kilt","Maxi skirt","Mini skirt","Midi skirt","Pencil skirt","Pleated skirt","Tiered skirt","Wrap skirt","Tutu","Sarong","Culottes","Skort","Pareo"] },
    { word: "cinestill 800tungsten", types: ["Photos taken under neon lights","Night cityscape shots","Low light forest photography","Sunset photo shoots","Candle-lit dinner photographs","Moonlit landscapes","Portraits under fluorescent lighting","Evening street photos","Twilight urban shots","Night-time beach photography","Midnight city views","Event photography in ambient light","Wedding photography at night","Star trail photography","Portraits shot under a streetlamp","Ghost town photos at night","Rainy night city streets","Festival lights photography"] },
    { word: "photography styles", types: ["Portrait photography","Landscape photography","Street photography","Macro photography","Architectural photography","Fashion photography","Wedding photography","Event photography","Sports photography","Wildlife photography","Food photography","Product photography","Documentary photography","Fine art photography","Black and white photography","HDR photography","Long exposure photography","Time-lapse photography"] },
    { word: "lighting setups", types: ["Natural lighting","Studio lighting","Flash photography","Continuous lighting","LED panels","Softbox lighting","Ring light","Beauty dish","Umbrella lighting","Strip lighting","Accent lighting","Back lighting","Side lighting","Front lighting","Rim lighting","Fill lighting","Key lighting","Ambient lighting","Practical lighting","Colored gel lighting"] },
    { word: "color palettes", types: ["Warm tones","Cool tones","Monochromatic","Complementary colors","Analogous colors","Triadic colors","Tetradic colors","Split-complementary","Pastel colors","Vibrant colors","Earth tones","Neutral colors","Primary colors","Secondary colors","Tertiary colors","Cool blues","Warm oranges","Forest greens","Sunset colors","Ocean blues","Autumn colors","Spring colors","Winter colors","Summer colors"] },
    { word: "textures", types: ["Smooth","Rough","Soft","Hard","Glossy","Matte","Shiny","Dull","Satin","Velvet","Silk","Cotton","Leather","Wood grain","Metal","Glass","Stone","Fabric","Paper","Plastic","Rubber","Ceramic","Crystal","Marble","Granite","Brick","Concrete","Sand","Water","Fire","Ice"] },
    { word: "materials", types: ["Wood","Metal","Glass","Plastic","Fabric","Leather","Paper","Ceramic","Stone","Crystal","Marble","Granite","Brick","Concrete","Rubber","Silicon","Carbon fiber","Aluminum","Steel","Copper","Brass","Silver","Gold","Platinum","Titanium","Bamboo","Cork","Wool","Cotton","Silk","Linen"] },
    { word: "shapes", types: ["Circle","Square","Triangle","Rectangle","Oval","Diamond","Heart","Star","Hexagon","Pentagon","Octagon","Crescent","Spiral","Wave","Zigzag","Curved","Angular","Geometric","Organic","Symmetrical","Asymmetrical","Regular","Irregular","Simple","Complex","Abstract","Concrete","Minimalist","Ornate","Detailed"] },
    { word: "patterns", types: ["Stripes","Dots","Checks","Plaid","Floral","Geometric","Abstract","Animal print","Polka dots","Paisley","Damask","Herringbone","Twill","Basket weave","Houndstooth","Tartan","Gingham","Pinstripe","Solid","Gradient","Ombre","Tie-dye","Batik","Ikat","Jacquard","Brocade","Embossed","Textured","Raised","Etched"] },
    { word: "styles", types: ["Modern","Contemporary","Traditional","Classic","Vintage","Retro","Minimalist","Maximalist","Industrial","Rustic","Bohemian","Scandinavian","Mediterranean","Asian","Art Deco","Art Nouveau","Gothic","Baroque","Rococo","Victorian","Edwardian","Mid-century","Post-modern","Futuristic","Steampunk","Grunge","Punk","Glam","Chic","Elegant"] }
];

export async function autoPopulateWordTypes() {
    try {
        // Check if we're on Railway
        const isRailway = process.env.RAILWAY_ENVIRONMENT || process.env.DATABASE_URL?.includes('railway.internal');
        
        if (!isRailway) {
            console.log('ℹ️ Not on Railway, skipping word_types auto-population');
            return;
        }
        
        console.log('🔍 Checking Railway word_types table...');
        
        // Check current count
        const currentCount = await prisma.word_types.count();
        console.log(`📊 Current word_types count: ${currentCount}`);
        
        if (currentCount === 0) {
            console.log('📥 Railway word_types table is empty, populating...');
            
            await prisma.word_types.createMany({
                data: essentialWordTypes,
                skipDuplicates: true
            });
            
            const newCount = await prisma.word_types.count();
            console.log(`✅ Populated Railway word_types with ${newCount} records`);
        } else {
            console.log(`✅ Railway word_types already has ${currentCount} records`);
        }
        
    } catch (error) {
        console.error('❌ Auto-populate word_types failed:', error.message);
        // Don't throw - this shouldn't prevent server startup
    }
}
