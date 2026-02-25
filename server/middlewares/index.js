import authMiddleware from './auth-middleware.js';
import optionalAuthMiddleware from './optional-auth-middleware.js';
import moderatorMiddleware from './moderator-middleware.js';
import errorMiddleware from './error-middleware.js';
import activatedMiddleware from './activated-middleware.js';
import checkUserActive from './check-user-active-middleware.js';
import databaseReadyMiddleware from './database-ready-middleware.js';
import { csrfTokenGenerator, csrfProtection } from './csrf-middleware.js';
import {
    authLimiter,
    registrationLimiter,
    passwordResetLimiter,
    generalLimiter,
    authenticatedLimiter,
    createContentLimiter,
    csrfTokenLimiter,
} from './rate-limit-middleware.js';

export {
    authMiddleware,
    optionalAuthMiddleware,
    moderatorMiddleware,
    errorMiddleware,
    activatedMiddleware,
    checkUserActive,
    databaseReadyMiddleware,
    csrfTokenGenerator,
    csrfProtection,
    // Rate limiters
    authLimiter,
    registrationLimiter,
    passwordResetLimiter,
    generalLimiter,
    authenticatedLimiter,
    createContentLimiter,
    csrfTokenLimiter,
};
