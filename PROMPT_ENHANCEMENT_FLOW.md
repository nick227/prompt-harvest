# Prompt Enhancement Flow Documentation

## Overview
The prompt enhancement system processes user prompts with variables, multipliers, mixup, and mashup features before sending them to image generation.

## Flow Architecture

### 1. Frontend (public/js/images.js)
```
User enters prompt → Frontend collects parameters → Sends to /image/generate
```

**Parameters collected:**
- `prompt`: Raw prompt text (may contain variables like `${cat}`)
- `providers`: Selected image generation providers
- `guidance`: Guidance value for image generation
- `multiplier`: Additional text to add to each prompt part
- `mixup`: Boolean to reorder prompt parts
- `mashup`: Boolean to shuffle individual words
- `customVariables`: Custom variable definitions

### 2. Backend Processing (routes.js)
```
/image/generate endpoint → Variable detection → Prompt building → Image generation
```

**Variable Detection:**
```javascript
const hasVariables = (/\$\{[^}]+\}/).test(prompt);
const needsProcessing = hasVariables || multiplier || mixup || mashup || customVariables;
```

**Prompt Building:**
```javascript
if (needsProcessing) {
    const processedResult = await feed.prompt.build(prompt, multiplier, mixup, mashup, customVariables, req);
    processedPrompt = processedResult.prompt;
    processedPromptId = processedResult.promptId;
}
```

### 3. Core Processing (feed.js)

#### Variable Replacement
- **Pattern**: `${variable_name}` or `$${variable_name}` (persistent)
- **Source**: `word-types.db` database
- **Process**: Random selection from available types

#### Multiplier Enhancement
- **Function**: `multiplyPrompt()`
- **Effect**: Adds multiplier text to each prompt part
- **Example**: `"A cat, A dog" + "lighting"` → `"A cat, lighting, A dog, lighting"`

#### Mixup Enhancement
- **Function**: `shufflePrompt()`
- **Effect**: Reorders comma-separated prompt parts
- **Example**: `"A cat, A dog, A bird"` → `"A bird, A cat, A dog"`

#### Mashup Enhancement
- **Function**: `mashupPrompt()`
- **Effect**: Shuffles individual words, removes commas
- **Example**: `"A cat, A dog"` → `"A dog cat A"`

## Database Integration

### word-types.db Structure
```javascript
{
  word: "cat",
  types: ["Maine Coon", "Siamese Cat", "Bengal Cat", ...]
}
```

### Variable Processing
1. **Extract variable name**: `${cat}` → `cat`
2. **Query database**: `db.find({ word: "cat" })`
3. **Random selection**: `types[Math.floor(Math.random() * types.length)]`
4. **Replacement**: `${cat}` → `"Maine Coon"`

## API Endpoints

### POST /image/generate
**Purpose**: Main image generation endpoint with prompt processing

**Request Body:**
```json
{
  "prompt": "A ${cat} in ${hip chill scenes} art style",
  "providers": ["flux", "juggernaut"],
  "guidance": 10,
  "promptId": "1234567890",
  "original": "A ${cat} in ${hip chill scenes} art style",
  "multiplier": "${brass instruments} lighting",
  "mixup": true,
  "mashup": false,
  "customVariables": "custom_color=red,blue,green"
}
```

**Response:**
```json
{
  "prompt": "A Maine Coon in Urban rooftop party art style, Fanfare Trumpet lighting",
  "providerName": "flux",
  "imageName": "flux-A Maine Coon in Urban rooftop party art style-1234567890.jpg",
  "image": "uploads/flux-A Maine Coon in Urban rooftop party art style-1234567890.jpg",
  "imageId": "abc123",
  "guidance": 10,
  "promptId": "1234567890",
  "original": "A ${cat} in ${hip chill scenes} art style"
}
```

### GET /prompt/build
**Purpose**: Standalone prompt building endpoint

**Query Parameters:**
- `prompt`: Raw prompt text
- `multiplier`: Multiplier text
- `mixup`: Boolean string
- `mashup`: Boolean string
- `customVariables`: Custom variable definitions

## Error Handling

### Graceful Degradation
- **Database errors**: Falls back to original prompt
- **Invalid variables**: Keeps original variable text
- **Processing errors**: Uses original prompt for image generation

### Logging
- **Variable detection**: Logs when variables are found
- **Processing steps**: Logs each enhancement step
- **Error recovery**: Logs fallback to original prompt

## Testing

### Test Coverage
- ✅ Variable replacement with database integration
- ✅ Multiple variables in single prompt
- ✅ Multiplier enhancement
- ✅ Mixup enhancement
- ✅ Mashup enhancement
- ✅ Combined enhancements
- ✅ Error handling and graceful degradation
- ✅ API endpoint integration

### Test File: `tests/prompt-enhancement.test.js`
Comprehensive test suite covering all enhancement features and API flows.

## Performance Considerations

### Optimization
- **Database caching**: Word types cached in memory
- **Regex efficiency**: Single pass variable detection
- **Conditional processing**: Only processes when needed

### Scalability
- **Queue system**: Image generation queued for high load
- **Async processing**: Non-blocking prompt enhancement
- **Database indexing**: Optimized word lookups

## Security

### Input Validation
- **Prompt sanitization**: Removes dangerous characters
- **Variable validation**: Checks against allowed patterns
- **Size limits**: Prevents oversized prompts

### Database Security
- **Read-only access**: Prompt enhancement only reads word-types.db
- **No SQL injection**: Uses parameterized queries
- **Input sanitization**: Validates all user inputs

## Future Enhancements

### Planned Features
- **Custom variable persistence**: Save user-defined variables
- **Variable weighting**: Prioritize certain word types
- **Prompt templates**: Pre-built enhancement combinations
- **Batch processing**: Process multiple prompts simultaneously

### Performance Improvements
- **Redis caching**: Cache frequently used word types
- **Parallel processing**: Process multiple enhancements concurrently
- **Lazy loading**: Load word types on demand
