export const requestLogger = (req, res, next) => {
    const start = Date.now();

    // Log request
    console.log(`📥 ${req.method} ${req.originalUrl} - ${req.ip || 'unknown'}`);

    // Log request body for non-GET requests
    if (req.method !== 'GET' && req.body && Object.keys(req.body).length > 0) {
        console.log('📦 Request Body:', JSON.stringify(req.body, null, 2));
    }

    // Override res.end to log response
    const originalEnd = res.end;

    res.end = function(chunk, encoding) {
        const duration = Date.now() - start;
        const status = res.statusCode;

        // Color code based on status
        let statusColor = '🟢'; // Success

        if (status >= 400 && status < 500) {
            statusColor = '🟡'; // Client error
        }
        if (status >= 500) {
            statusColor = '🔴'; // Server error
        }

        console.log(`${statusColor} ${req.method} ${req.originalUrl} - ${status} (${duration}ms)`);

        originalEnd.call(this, chunk, encoding);
    };

    next();
};

export const errorLogger = (err, req, res, next) => {
    const timestamp = new Date().toISOString();
    const { method } = req;
    const url = req.originalUrl;
    const ip = req.ip || 'unknown';

    console.error(`❌ [${timestamp}] ${method} ${url} - ${ip}`);
    console.error(`❌ Error: ${err.message}`);
    console.error(`❌ Stack: ${err.stack}`);

    next(err);
};

export const performanceLogger = (req, res, next) => {
    const start = process.hrtime.bigint();

    res.on('finish', () => {
        const end = process.hrtime.bigint();
        const duration = Number(end - start) / 1000000; // Convert to milliseconds

        if (duration > 1000) { // Log slow requests (>1 second)
            console.warn(`🐌 Slow request: ${req.method} ${req.originalUrl} took ${duration.toFixed(2)}ms`);
        }
    });

    next();
};
