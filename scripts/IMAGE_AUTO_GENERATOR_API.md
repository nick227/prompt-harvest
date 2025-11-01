# Image Auto Generator API

Developer-friendly API for automated image generation on the server.

## 🚀 Quick Start

### CLI Usage (unchanged)
```bash
node src/scripts/auto-generate-images.js --userId=1 --count=5 --prompt="a cat"
```

### Programmatic Usage (NEW!)
```javascript
import { ImageAutoGenerator } from './src/scripts/auto-generate-images.js';

const generator = new ImageAutoGenerator({ userId: 1, skipCredits: true });
const results = await generator.generate({ prompts: ['a cat', 'a dog'] });

console.log(`Generated ${results.success.length} images`);
```

## 📦 API Reference

### Constructor

```javascript
new ImageAutoGenerator(options)
```

**Options:**
- `userId` (number, required) - User ID to generate images for
- `providers` (string[], optional) - Specific providers to use (default: random)
- `guidance` (number, optional) - Guidance value 0-20 (default: 10)
- `skipCredits` (boolean, optional) - Skip credit checks (default: false)
- `delay` (number, optional) - Delay between generations in ms (default: 1000)
- `silent` (boolean, optional) - Suppress console output (default: false)

### Methods

#### `generate(options)`
Generate images from prompts.

```javascript
const results = await generator.generate({
    prompts: ['prompt1', 'prompt2'],  // required
    providers: ['flux', 'dezgo'],     // optional override
    guidance: 15,                      // optional override
    skipCredits: true,                 // optional override
    delay: 2000                        // optional override
});
```

**Returns:**
```javascript
{
    success: [
        { prompt, imageId, provider, duration }
    ],
    failed: [
        { prompt, error }
    ],
    startTime: Date,
    user: { id, username, email, isAdmin, credits },
    totalCost: number,
    finalCredits: number|null
}
```

#### `getUserInfo()`
Get user information.

```javascript
const user = await generator.getUserInfo();
// { id, username, email, isAdmin, credits }
```

#### `getProviders()`
Get available image generation providers.

```javascript
const providers = await generator.getProviders();
// ['flux', 'dezgo', 'stability', 'pollinations']
```

#### `calculateCost(imageCount)`
Calculate credit cost for N images.

```javascript
const cost = await generator.calculateCost(10);
// 10 (10 images * 1 credit/image)
```

#### `checkCredits(imageCount)`
Check if user has sufficient credits.

```javascript
const check = await generator.checkCredits(10);
// { hasEnough: true, current: 50, required: 10 }
```

## 💡 Usage Examples

### Example 1: Basic Generation
```javascript
const generator = new ImageAutoGenerator({
    userId: 1,
    skipCredits: true
});

const results = await generator.generate({
    prompts: ['a sunset', 'a mountain']
});

console.log(`Success: ${results.success.length}, Failed: ${results.failed.length}`);
```

### Example 2: With Credit Validation
```javascript
const generator = new ImageAutoGenerator({
    userId: 1,
    skipCredits: false  // Will check and deduct credits
});

const prompts = ['a cat', 'a dog', 'a bird'];
const creditCheck = await generator.checkCredits(prompts.length);

if (!creditCheck.hasEnough) {
    console.error(`Need ${creditCheck.required}, have ${creditCheck.current}`);
    return;
}

const results = await generator.generate({ prompts });
console.log(`Final balance: ${results.finalCredits} credits`);
```

### Example 3: Silent Mode
```javascript
const generator = new ImageAutoGenerator({
    userId: 1,
    skipCredits: true,
    silent: true  // No console output
});

const results = await generator.generate({
    prompts: ['prompt1', 'prompt2']
});

// Handle results yourself
results.success.forEach(img => {
    console.log(`Generated: ${img.prompt} (ID: ${img.imageId})`);
});
```

### Example 4: Custom Providers
```javascript
const generator = new ImageAutoGenerator({
    userId: 1,
    providers: ['flux', 'dezgo'],  // Only use these
    guidance: 15,                   // Higher guidance
    delay: 2000,                    // 2 second delay
    skipCredits: true
});

const results = await generator.generate({
    prompts: ['abstract art', 'minimalist design']
});
```

### Example 5: Batch Processing
```javascript
const generator = new ImageAutoGenerator({
    userId: 1,
    skipCredits: true,
    silent: true
});

const batches = [
    ['landscape1', 'landscape2'],
    ['portrait1', 'portrait2'],
    ['abstract1', 'abstract2']
];

for (const batch of batches) {
    const results = await generator.generate({ prompts: batch });
    console.log(`Batch: ${results.success.length} success`);
}
```

### Example 6: Get Provider Information
```javascript
const generator = new ImageAutoGenerator({ userId: 1 });

const user = await generator.getUserInfo();
console.log(`User: ${user.username}, Credits: ${user.credits}`);

const providers = await generator.getProviders();
console.log(`Available: ${providers.join(', ')}`);

const cost = await generator.calculateCost(10);
console.log(`Cost for 10 images: ${cost} credits`);
```

## 🔧 Architecture

### Separation of Concerns

```
ImageAutoGenerator (Core Class)
├── Public API Methods
│   ├── generate()
│   ├── getUserInfo()
│   ├── getProviders()
│   ├── calculateCost()
│   └── checkCredits()
└── Private Methods
    ├── _getUserInfo()
    ├── _getProviders()
    ├── _calculateCost()
    ├── _validateCredits()
    ├── _generateSingle()
    ├── _processPrompt()
    ├── _generateBatch()
    └── _formatDuration()

CLI (Wrapper Class)
├── parseArgs()
├── validateArgs()
├── loadPrompts()
├── setupGenerator()
├── validateProvidersAndLogPlan()
├── checkCreditsSufficient()
├── handleValidationErrors()
├── logPlan()
├── logDryRun()
├── logResults()
└── run()
```

### Key Design Decisions

1. **Class-based core** - Easy to instantiate and reuse
2. **Options objects** - Avoid long parameter lists
3. **Consistent naming** - Public methods are simple, private prefixed with `_`
4. **Silent mode** - Control console output for background jobs
5. **CLI detection** - Only runs CLI when executed directly
6. **Immutable results** - Results don't modify generator state
7. **Error handling** - Throws errors for programmatic use, exits for CLI

## 📁 Files

- `src/scripts/auto-generate-images.js` - Main script with ImageAutoGenerator class + CLI
- `scripts/example-programmatic-usage.js` - 6 complete usage examples
- `scripts/AUTO_GENERATE_README.md` - CLI documentation
- `scripts/IMAGE_AUTO_GENERATOR_API.md` - This API documentation

## 🎯 Use Cases

### Background Jobs
```javascript
// cron-generate-daily.js
import { ImageAutoGenerator } from './auto-generate-images.js';

const generator = new ImageAutoGenerator({
    userId: 1,
    skipCredits: true,
    silent: true
});

const dailyPrompts = loadPromptsFromDatabase();
const results = await generator.generate({ prompts: dailyPrompts });

await saveTodatabase(results);
```

### API Endpoints
```javascript
// routes/admin/bulk-generate.js
app.post('/admin/bulk-generate', async (req, res) => {
    const generator = new ImageAutoGenerator({
        userId: req.user.id,
        skipCredits: req.user.isAdmin
    });

    try {
        const results = await generator.generate({
            prompts: req.body.prompts
        });

        res.json({
            success: true,
            generated: results.success.length,
            failed: results.failed.length,
            results
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
```

### Testing
```javascript
// tests/image-generation.test.js
import { ImageAutoGenerator } from '../auto-generate-images.js';

describe('ImageAutoGenerator', () => {
    test('generates images successfully', async () => {
        const generator = new ImageAutoGenerator({
            userId: 1,
            skipCredits: true,
            silent: true
        });

        const results = await generator.generate({
            prompts: ['test prompt']
        });

        expect(results.success.length).toBeGreaterThan(0);
    });
});
```

## 🔒 Security Notes

- Always validate `userId` before instantiation
- Use `skipCredits: false` in production (except for admin operations)
- Rate limit programmatic access
- Monitor usage patterns
- Log all generation attempts

## 📊 Best Practices

1. **Reuse instances** - Create once, use multiple times
2. **Use silent mode** - For background/API operations
3. **Check credits first** - Before expensive operations
4. **Handle errors** - Wrap in try/catch
5. **Disconnect prisma** - In finally blocks
6. **Batch operations** - Group related generations
7. **Monitor performance** - Track duration in results

## 🚨 Troubleshooting

### "User with ID X not found"
```javascript
// Check user exists first
try {
    const user = await generator.getUserInfo();
} catch (error) {
    console.error('User not found:', error.message);
}
```

### "Insufficient credits"
```javascript
// Always check credits when skipCredits is false
const check = await generator.checkCredits(prompts.length);
if (!check.hasEnough) {
    throw new Error(`Need ${check.required}, have ${check.current}`);
}
```

### Silent mode not working
```javascript
// Ensure silent is set in constructor
const generator = new ImageAutoGenerator({
    userId: 1,
    silent: true  // Must be in constructor
});
```

## 📚 Further Reading

- [CLI Documentation](./AUTO_GENERATE_README.md)
- [Complete Examples](./example-programmatic-usage.js)
- [Main generate.js](../src/generate.js)
- [Image Generation Service](../src/services/EnhancedImageService.js)

## 🤝 Contributing

When adding new features:
1. Add to `ImageAutoGenerator` class
2. Update CLI wrapper if needed
3. Add example to `example-programmatic-usage.js`
4. Update this documentation
5. Add tests

