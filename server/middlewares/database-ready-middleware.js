import mongoose from 'mongoose';

/**
 * Middleware to check if database is ready before processing requests
 * Returns 503 Service Unavailable if MongoDB is not connected
 */
export const databaseReadyMiddleware = (req, res, next) => {
    // Skip database check for health check endpoint
    if (req.path === '/health') {
        return next();
    }

    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
        console.log(
            '[DB Ready Check] MongoDB not ready, readyState:',
            mongoose.connection.readyState,
        );
        return res.status(503).json({
            message: 'Service temporarily unavailable. Please try again in a moment.',
            error: 'Database not ready',
        });
    }

    next();
};

export default databaseReadyMiddleware;
