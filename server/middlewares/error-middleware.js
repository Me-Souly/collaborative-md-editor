import ApiError from '../exceptions/api-error.js';
import securityLogger from '../services/security-logger.js';

const errorMiddleware = function (err, req, res, _next) {
    console.log(`Error middleware: ${err}`);

    // Handle our custom ApiError
    if (err instanceof ApiError) {
        if (err.status === 403) {
            securityLogger.forbidden(req, req.user?.id);
        }
        return res.status(err.status).json({ message: err.message, errors: err.errors });
    }

    // Handle CSRF errors (from csrf-csrf library)
    if (err.code === 'EBADCSRFTOKEN' || err.message === 'invalid csrf token') {
        securityLogger.csrfRejected(req);
        return res
            .status(403)
            .json({ message: 'Invalid CSRF token. Please refresh the page and try again.' });
    }

    // Handle MongoDB connection errors
    if (
        err.name === 'MongoNetworkError' ||
        err.name === 'MongoServerError' ||
        err.message?.includes('MongoDB') ||
        err.message?.includes('buffering timed out')
    ) {
        console.error('[Error Middleware] MongoDB connection error:', err.message);
        return res.status(503).json({
            message: 'Service temporarily unavailable. Please try again in a moment.',
            error: 'Database connection error',
        });
    }

    // Handle other errors with status codes
    if (err.status || err.statusCode) {
        const status = err.status || err.statusCode;
        return res.status(status).json({ message: err.message || 'Error' });
    }

    // Default 500 for unknown errors
    console.error('Unhandled error:', err);
    return res.status(500).json({ message: 'Unexpected server error' });
};

export default errorMiddleware;
