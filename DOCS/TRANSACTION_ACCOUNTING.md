# Transaction Accounting System

## Overview

The transaction accounting system tracks AI image generation costs and usage statistics using the existing Image table. This approach provides cost tracking without requiring additional database tables while maintaining all necessary data for analytics.

## Architecture

### Data Model
- **Uses existing Image table**: No new tables required
- **Tracks**: userId, provider, model, timestamp, guidance
- **Calculates costs**: Based on provider-specific cost matrix

### Cost Matrix
Located in `src/config/costMatrix.js`:

```javascript
export const COST_MATRIX = {
    // High-quality providers (more expensive)
    dalle: 0.02,        // $0.02 per generation
    flux: 0.015,        // $0.015 per generation
    juggernaut: 0.012,  // $0.012 per generation

    // Mid-tier providers
    redshift: 0.008,    // $0.008 per generation
    absolute: 0.008,

    // Standard providers
    dreamshaper: 0.005, // $0.005 per generation

    // Budget providers
    tshirt: 0.003,      // $0.003 per generation
    // ... more providers
};
```

## API Endpoints

### User Statistics
- `GET /api/transactions/user/stats` - Get user's generation statistics
- `GET /api/transactions/user/provider-usage` - Get provider usage breakdown
- `GET /api/transactions/user/daily-usage` - Get daily usage for last 30 days

### Cost Estimation
- `POST /api/transactions/estimate-cost` - Estimate cost for generation request
- `GET /api/transactions/cost-matrix` - Get current cost matrix (public)

### Admin Only
- `GET /api/transactions/system/stats` - System-wide statistics

## Usage Examples

### Get User Stats
```javascript
// Get all-time stats
const response = await fetch('/api/transactions/user/stats');
const stats = await response.json();

// Get stats for specific period
const response = await fetch('/api/transactions/user/stats?startDate=2024-01-01&endDate=2024-01-31');
```

### Estimate Generation Cost
```javascript
const response = await fetch('/api/transactions/estimate-cost', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        providers: ['dalle', 'flux', 'dreamshaper']
    })
});

const estimate = await response.json();
// Returns: { estimatedCost: 0.04, costBreakdown: [...] }
```

### Get Provider Usage
```javascript
const response = await fetch('/api/transactions/user/provider-usage');
const usage = await response.json();
// Returns breakdown by provider with counts and costs
```

## Response Formats

### User Stats Response
```json
{
    "success": true,
    "data": {
        "userId": "user123",
        "generationCount": 150,
        "totalCost": 0.75,
        "averageCostPerGeneration": 0.005,
        "providerBreakdown": {
            "dalle": 0.2,
            "flux": 0.3,
            "dreamshaper": 0.25
        },
        "period": {
            "startDate": "2024-01-01T00:00:00.000Z",
            "endDate": "2024-01-31T23:59:59.999Z"
        }
    }
}
```

### Cost Estimate Response
```json
{
    "success": true,
    "data": {
        "providers": ["dalle", "flux"],
        "estimatedCost": 0.035,
        "costBreakdown": [
            { "provider": "dalle", "cost": 0.02 },
            { "provider": "flux", "cost": 0.015 }
        ]
    }
}
```

## Implementation Details

### Services
- **TransactionService**: Core business logic for cost calculations and analytics
- **Cost Matrix**: Centralized pricing configuration

### Controllers
- **TransactionController**: API endpoint handlers with proper error handling

### Routes
- **transactionRoutes.js**: Route definitions with authentication and rate limiting

## Benefits

1. **Minimal Code Impact**: Uses existing Image table
2. **Retroactive Analysis**: Can calculate costs for historical data
3. **Real-time Tracking**: Costs calculated on-demand
4. **Flexible Pricing**: Easy to update cost matrix
5. **Comprehensive Analytics**: User, provider, and system-level statistics

## Future Enhancements

1. **Caching**: Cache frequently accessed statistics
2. **Real-time Updates**: WebSocket updates for live cost tracking
3. **Advanced Analytics**: Trend analysis, cost predictions
4. **Billing Integration**: Connect to external billing systems
5. **Usage Limits**: Implement cost-based usage limits

## Testing

Run the transaction accounting tests:
```bash
npm test tests/transaction.test.js
```

Tests cover:
- Cost matrix calculations
- User cost calculations
- Date range filtering
- Service methods
- Provider coverage validation
