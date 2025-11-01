# Auto-Generate Images CLI Script

A powerful CLI tool to automatically generate images on your server using direct backend access, bypassing API authentication.

## Features

- ✅ Direct backend access (no API auth required)
- ✅ Batch image generation
- ✅ Credit validation and tracking
- ✅ Multiple provider support
- ✅ Prompt file support (batch processing)
- ✅ Dry-run mode for testing
- ✅ Admin mode (skip credit checks)
- ✅ Detailed progress reporting
- ✅ Provider breakdown statistics

## Requirements

- Node.js installed
- Access to server with database
- Valid user account with sufficient credits (unless using `--skipCredits`)

## Basic Usage

### Generate a single image

```bash
node src/scripts/auto-generate-images.js \
  --userId=1 \
  --prompt="a beautiful landscape"
```

### Generate multiple images with the same prompt

```bash
node src/scripts/auto-generate-images.js \
  --userId=1 \
  --count=5 \
  --prompt="a futuristic city"
```

### Generate images from a file

```bash
node src/scripts/auto-generate-images.js \
  --userId=1 \
  --promptFile=scripts/prompts-example.txt
```

### Specify providers

```bash
node src/scripts/auto-generate-images.js \
  --userId=1 \
  --count=3 \
  --prompt="a mountain landscape" \
  --providers=flux,dezgo
```

### Dry run (preview without generating)

```bash
node src/scripts/auto-generate-images.js \
  --userId=1 \
  --promptFile=scripts/prompts-example.txt \
  --dryRun
```

### Admin mode (skip credit checks)

```bash
node src/scripts/auto-generate-images.js \
  --userId=1 \
  --count=10 \
  --prompt="test image" \
  --skipCredits
```

## Options

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--userId` | User ID to generate images for | ✅ Yes | - |
| `--count` | Number of images to generate | No | 1 |
| `--prompt` | Single prompt for all generations | Either this or `--promptFile` | - |
| `--promptFile` | File containing prompts (one per line) | Either this or `--prompt` | - |
| `--providers` | Comma-separated provider list | No | random |
| `--guidance` | Guidance value (0-20) | No | 10 |
| `--dryRun` | Preview without generating | No | false |
| `--skipCredits` | Skip credit validation (admin only) | No | false |
| `--delay` | Delay between generations (ms) | No | 1000 |

## Prompt File Format

Create a text file with one prompt per line. Lines starting with `#` are treated as comments.

Example `prompts.txt`:
```
# Landscape prompts
a beautiful mountain landscape at sunrise
a serene beach at sunset

# Urban prompts
a futuristic cityscape with neon lights
```

See `scripts/prompts-example.txt` for more examples.

## Examples

### Basic batch generation

```bash
# Generate 10 images with the same prompt
node src/scripts/auto-generate-images.js \
  --userId=1 \
  --count=10 \
  --prompt="a cat playing with yarn" \
  --delay=2000
```

### Advanced with specific providers

```bash
# Generate images using only Flux and Dezgo providers
node src/scripts/auto-generate-images.js \
  --userId=1 \
  --promptFile=my-prompts.txt \
  --providers=flux,dezgo \
  --guidance=15
```

### Test run before generation

```bash
# First, do a dry run to check everything
node src/scripts/auto-generate-images.js \
  --userId=1 \
  --promptFile=my-prompts.txt \
  --dryRun

# If everything looks good, run for real
node src/scripts/auto-generate-images.js \
  --userId=1 \
  --promptFile=my-prompts.txt
```

### Admin bulk generation

```bash
# Generate 100 images without credit deduction (admin only)
node src/scripts/auto-generate-images.js \
  --userId=1 \
  --promptFile=bulk-prompts.txt \
  --skipCredits \
  --delay=500
```

## Output

The script provides detailed output including:

- User information and current credits
- Generation plan summary
- Credit check results
- Real-time generation progress
- Final statistics:
  - Total images generated
  - Success/failure counts
  - Total time and average per image
  - Provider breakdown
  - Failed prompts with error messages
  - Final credit balance

Example output:
```
🎨 AUTO-GENERATE IMAGES
========================

👤 Fetching user info...
   User: john_doe (john@example.com)
   Admin: No
   Credits: 150

📊 Generation Plan:
   Images to generate: 5
   Providers: random
   Guidance: 10
   Cost per image: 1 credits
   Total cost: 5 credits

💰 Credit Check:
   Current balance: 150 credits
   Required: 5 credits
   ✅ Sufficient credits available

🚀 Starting generation...

[1/5] Generating: a beautiful landscape
   ✅ Success (3.2s) - Provider: flux

[2/5] Generating: a futuristic city
   ✅ Success (2.8s) - Provider: dezgo

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 GENERATION SUMMARY

   Total images: 5
   ✅ Successful: 5
   ❌ Failed: 0
   ⏱️  Total time: 15s
   📈 Avg per image: 3s

🎯 Provider breakdown:
   flux: 3 images
   dezgo: 2 images

✅ Auto-generation complete!

💰 Final credit balance: 145 credits
```

## Finding Your User ID

To find your user ID, you can:

1. **Check the database directly:**
   ```sql
   SELECT id, username, email FROM "User";
   ```

2. **Use a script:**
   ```bash
   node scripts/setup-admin-user.js
   ```

3. **Look in your application logs** when you log in

## Error Handling

The script handles various error scenarios:

- **Invalid user ID**: "User with ID X not found"
- **Insufficient credits**: Shows shortfall and suggests using `--skipCredits`
- **Invalid providers**: Warns about invalid providers and shows available ones
- **Generation failures**: Continues with remaining images and reports failures
- **File not found**: Clear error message if prompt file doesn't exist

## Best Practices

1. **Always test with `--dryRun` first** when using a new prompt file
2. **Use appropriate delays** to avoid overwhelming the system (`--delay=1000` or higher)
3. **Monitor credits** before large batch generations
4. **Use `--skipCredits` only for testing/admin purposes**
5. **Keep prompt files organized** with comments for clarity
6. **Check provider availability** before specifying specific providers

## Troubleshooting

### "User with ID X not found"
- Verify the user ID exists in the database
- Check that you're using the correct database

### "Insufficient credits"
- Add credits to the user account
- Or use `--skipCredits` for testing (admin only)

### "Failed to read prompt file"
- Check that the file path is correct
- Ensure the file exists and is readable
- Use forward slashes in paths (even on Windows)

### Generation failures
- Check provider availability
- Verify network connectivity
- Review error messages in output
- Try with different providers

## Integration with Cron

You can schedule automatic image generation using cron:

```bash
# Generate 10 images daily at 2 AM
0 2 * * * cd /path/to/image-harvest && node src/scripts/auto-generate-images.js --userId=1 --promptFile=daily-prompts.txt >> logs/auto-gen.log 2>&1
```

## Security Notes

- This script has **full server access** and bypasses API authentication
- Only run on trusted servers
- Use `--skipCredits` responsibly (admin/testing only)
- Keep prompt files secure if they contain sensitive content
- Monitor usage to prevent abuse

## Related Scripts

- `scripts/setup-admin-user.js` - Create admin users
- `scripts/add-initial-credits.js` - Add credits to users
- `scripts/check-all-models.js` - Check available models/providers

## Support

For issues or questions:
1. Check the error message and troubleshooting section
2. Review your configuration
3. Check server logs for detailed error information
4. Verify database connectivity

## License

Part of the Image Harvest project.

