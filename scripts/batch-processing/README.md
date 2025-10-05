# Batch Processing Scripts

This folder contains scripts for processing arrays of image generation requests and blog post creation requests through the admin API.

## 📁 Files Overview

### **Core Scripts**
- `batch-image-generator.js` - Processes arrays of image generation requests
- `batch-blog-creator.js` - Processes arrays of blog post creation requests
- `run-batch-processing.js` - Master script to run both processes

### **Configuration Files**
- `image-requests.json` - Custom image generation requests
- `blog-requests.json` - Custom blog post requests

### **Output Files**
- `batch-image-results-*.json` - Image generation results
- `batch-blog-results-*.json` - Blog creation results
- `combined-batch-results-*.json` - Combined results from both processes

## 🚀 Quick Start

### **Run Both Processes**
```bash
cd scripts/batch-processing
node run-batch-processing.js
```

### **Run Image Generation Only**
```bash
cd scripts/batch-processing
node run-batch-processing.js images
```

### **Run Blog Creation Only**
```bash
cd scripts/batch-processing
node run-batch-processing.js blogs
```

### **Show Help**
```bash
cd scripts/batch-processing
node run-batch-processing.js help
```

## 📋 Configuration

### **Custom Image Requests**
Edit `image-requests.json` to customize image generation requests:

```json
[
    {
        "prompt": "Your custom prompt here",
        "providers": ["flux"],
        "guidance": 7,
        "model": "flux-dev",
        "size": "1024x1024",
        "tags": ["tag1", "tag2"]
    }
]
```

### **Custom Blog Requests**
Edit `blog-requests.json` to customize blog post requests:

```json
[
    {
        "title": "Your Blog Post Title",
        "content": "Your blog post content...",
        "excerpt": "Short description",
        "thumbnail": "https://example.com/thumb.jpg",
        "tags": ["tag1", "tag2"],
        "isPublished": false,
        "isFeatured": false,
        "metadata": {
            "category": "Technology",
            "readingTime": "5 minutes"
        }
    }
]
```

## 🔧 Script Options

### **Image Generation Options**
```javascript
{
    delayBetweenRequests: 3000,  // 3 seconds between requests
    maxConcurrent: 1,            // Process one at a time
    saveResults: true,           // Save results to file
    outputFile: 'results.json'   // Output filename
}
```

### **Blog Creation Options**
```javascript
{
    delayBetweenRequests: 1000,  // 1 second between requests
    maxConcurrent: 1,            // Process one at a time
    saveResults: true,           // Save results to file
    outputFile: 'results.json'  // Output filename
}
```

## 📊 Output Format

### **Image Generation Results**
```json
{
    "timestamp": "2025-10-05T13:30:00.000Z",
    "summary": {
        "totalRequests": 5,
        "successful": 4,
        "failed": 1,
        "successRate": 80.0,
        "totalTime": 15000,
        "averageTime": 3000
    },
    "results": [
        {
            "index": 1,
            "success": true,
            "id": "image_id_123",
            "prompt": "A beautiful landscape...",
            "provider": "flux",
            "model": "flux-dev",
            "imageUrl": "https://example.com/image.jpg",
            "duration": 3000,
            "requestId": "req_123",
            "timestamp": "2025-10-05T13:30:00.000Z"
        }
    ],
    "errors": [
        {
            "index": 2,
            "success": false,
            "prompt": "Failed prompt...",
            "error": "Provider not available",
            "statusCode": 400
        }
    ]
}
```

### **Blog Creation Results**
```json
{
    "timestamp": "2025-10-05T13:30:00.000Z",
    "summary": {
        "totalRequests": 3,
        "successful": 3,
        "failed": 0,
        "successRate": 100.0,
        "totalTime": 5000,
        "averageTime": 1667
    },
    "results": [
        {
            "index": 1,
            "success": true,
            "id": "blog_id_123",
            "title": "Blog Post Title",
            "slug": "blog-post-title",
            "authorId": "user_id_123",
            "isPublished": false,
            "isFeatured": false,
            "duration": 1500,
            "requestId": "req_123",
            "timestamp": "2025-10-05T13:30:00.000Z"
        }
    ],
    "errors": []
}
```

## 🎯 Features

### **Image Generation Features**
- ✅ **Multiple Providers**: Support for Flux, OpenAI, etc.
- ✅ **Custom Prompts**: Flexible prompt configuration
- ✅ **Model Selection**: Choose specific models
- ✅ **Size Options**: Various image sizes
- ✅ **Guidance Control**: Fine-tune generation parameters
- ✅ **Error Handling**: Robust error handling and retry logic
- ✅ **Progress Tracking**: Real-time progress updates
- ✅ **Result Saving**: Automatic result persistence

### **Blog Creation Features**
- ✅ **Rich Content**: Full blog post content support
- ✅ **Metadata**: Custom metadata and tags
- ✅ **Publishing Control**: Draft vs published posts
- ✅ **Featured Posts**: Mark posts as featured
- ✅ **Thumbnails**: Image thumbnail support
- ✅ **SEO Fields**: Excerpt and slug generation
- ✅ **Error Handling**: Comprehensive error handling
- ✅ **Result Tracking**: Detailed result logging

### **Batch Processing Features**
- ✅ **Sequential Processing**: Controlled request timing
- ✅ **Error Recovery**: Continue processing despite errors
- ✅ **Progress Monitoring**: Real-time status updates
- ✅ **Result Aggregation**: Combined statistics
- ✅ **File Output**: Automatic result saving
- ✅ **Custom Configuration**: Flexible request customization

## 🔍 Monitoring

### **Real-time Progress**
```
🖼️ Generating image 1/5:
   Prompt: A beautiful cyberpunk cityscape...
   Provider: flux
   Model: flux-dev
   Size: 1024x1024
   Guidance: 7
   ✅ Success - ID: cmgdqr7mf0001utrcipe9kpng
   📊 Duration: 3000ms
   ⏳ Waiting 3000ms before next request...
```

### **Summary Statistics**
```
📊 Batch Processing Summary
==========================
✅ Successful: 4/5 (80.0%)
❌ Failed: 1/5
⏱️ Total time: 15.0s
⚡ Average time per request: 3.0s
📈 Average generation time: 3000ms
```

## 🛠️ Troubleshooting

### **Common Issues**

1. **Authentication Errors**
   - Ensure server is running on port 3200
   - Check JWT_SECRET environment variable
   - Verify user credentials

2. **Connection Errors**
   - Check server status
   - Verify BASE_URL configuration
   - Check network connectivity

3. **Provider Errors**
   - Ensure image providers are configured
   - Check provider API keys
   - Verify provider availability

4. **File Errors**
   - Check file permissions
   - Verify directory structure
   - Ensure sufficient disk space

### **Debug Mode**
Add debug logging by setting environment variables:
```bash
DEBUG=true node run-batch-processing.js
```

## 📈 Performance Tips

1. **Adjust Delays**: Modify `delayBetweenRequests` based on provider limits
2. **Monitor Resources**: Watch CPU and memory usage during processing
3. **Batch Size**: Process smaller batches for better reliability
4. **Error Handling**: Implement retry logic for failed requests
5. **Result Storage**: Use efficient storage for large result sets

## 🎉 Success Metrics

### **Expected Performance**
- **Image Generation**: 2-10 seconds per image
- **Blog Creation**: 1-3 seconds per blog post
- **Success Rate**: 80-95% depending on provider availability
- **Error Recovery**: Automatic continuation on failures

### **Monitoring Output**
```
🎉 Batch processing completed!
📊 Overall Statistics:
   ✅ Total successful: 7
   ❌ Total failed: 1
   📊 Overall success rate: 87.5%
```

The batch processing scripts provide a robust, scalable solution for processing large arrays of image generation and blog creation requests through the admin API! 🚀
