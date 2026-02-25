import { Router } from 'express';
import { body } from 'express-validator';
import {
    authMiddleware,
    optionalAuthMiddleware,
    moderatorMiddleware,
    activatedMiddleware,
    checkUserActive,
    databaseReadyMiddleware,
    csrfTokenGenerator,
    csrfProtection,
    authLimiter,
    registrationLimiter,
    passwordResetLimiter,
    generalLimiter,
    createContentLimiter,
    csrfTokenLimiter,
} from '../middlewares/index.js';

import {
    userController,
    authController,
    activationController,
    passwordController,
    folderController,
    noteController,
    noteAccessController,
    commentController,
} from '../controllers/index.js';
import { getNotePresence } from '../yjs/yjs-server.js';

const router = Router();

// Проверяем готовность базы данных перед обработкой запросов
router.use(databaseReadyMiddleware);

// Применяем общий rate limiter ко всем запросам
router.use(generalLimiter);

//
//  health check
//
router.get('/health', async (req, res) => {
    const mongoose = await import('mongoose');
    const readyStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    const dbState = mongoose.default.connection.readyState;
    const dbStatus = readyStates[dbState] || 'unknown';

    const isHealthy = dbState === 1; // 1 = connected

    res.status(isHealthy ? 200 : 503).json({
        status: isHealthy ? 'ok' : 'unavailable',
        timestamp: new Date().toISOString(),
        database: {
            status: dbStatus,
            ready: isHealthy,
        },
    });
});

//
//  CSRF token generation
//
router.get('/csrf-token', csrfTokenLimiter, csrfTokenGenerator, (req, res) => {
    res.json({ csrfToken: req.csrfToken });
});

//
//  auth
//
router.post('/login', authLimiter, csrfProtection, authController.login);
router.post('/logout', csrfProtection, authController.logout);
router.post('/refresh', csrfProtection, authController.refresh);

//
//  activation
//
router.get('/activate/:token', activationController.activate);
router.post(
    '/activation/resend',
    authMiddleware,
    checkUserActive,
    activationController.resendActivation,
);

//
//  user control
//
router.post(
    '/users/registration',
    registrationLimiter,
    body('email', 'Email is incorrect').isEmail(),
    body('username', 'Minimal username length is 2').isLength({ min: 2 }),
    body('password', 'Password length should be between 3 and 32').isLength({ min: 3, max: 32 }),
    userController.registration,
);

router.get('/users', authMiddleware, checkUserActive, activatedMiddleware, userController.getUsers);

router.get('/users/:identifier', userController.getUserByIdentifier);

router.patch('/users/me', authMiddleware, checkUserActive, userController.updateUser);

router.delete('/users/me', authMiddleware, checkUserActive, userController.deleteUser);

//
//  password
//
router.post('/password/change', authMiddleware, checkUserActive, passwordController.changePassword);

router.post(
    '/password/request-reset',
    passwordResetLimiter,
    body('email', 'Email is incorrect').isEmail(),
    passwordController.requestReset,
);

router.get('/password/reset/:token', passwordController.validateReset);
router.post('/password/reset', passwordResetLimiter, passwordController.resetPassword);

//
//  folders
//
router.get('/folders', authMiddleware, checkUserActive, folderController.getAll);
router.get('/folders/:id', authMiddleware, checkUserActive, folderController.getById);
router.post(
    '/folders',
    createContentLimiter,
    authMiddleware,
    checkUserActive,
    activatedMiddleware,
    folderController.create,
);
router.put(
    '/folders/:id',
    authMiddleware,
    checkUserActive,
    activatedMiddleware,
    folderController.update,
);
router.delete(
    '/folders/:id',
    authMiddleware,
    checkUserActive,
    activatedMiddleware,
    folderController.delete,
);

//
//  notes
//
router.get('/notes', authMiddleware, checkUserActive, noteController.getUserNotes);
router.get('/notes/shared', authMiddleware, checkUserActive, noteController.getSharedNotes);
router.get('/notes/public', noteController.getAllPublicNotes);
router.get('/notes/:id', optionalAuthMiddleware, noteController.getById);
router.post(
    '/notes',
    createContentLimiter,
    authMiddleware,
    checkUserActive,
    activatedMiddleware,
    noteController.create,
);
router.put(
    '/notes/:id',
    authMiddleware,
    checkUserActive,
    activatedMiddleware,
    noteController.update,
);
router.delete(
    '/notes/:id',
    authMiddleware,
    checkUserActive,
    activatedMiddleware,
    noteController.delete,
);
router.patch(
    '/notes/:id/restore',
    authMiddleware,
    checkUserActive,
    activatedMiddleware,
    noteController.restore,
);

router.get('/folders/:id/notes', authMiddleware, checkUserActive, noteController.getNotesInFolder);

// Presence по заметкам (кто сейчас подключен по WS к документу)
router.get('/notes/:id/presence', authMiddleware, checkUserActive, (req, res) => {
    const noteId = req.params.id;
    const userIds = getNotePresence(noteId);
    return res.json({ userIds });
});

router.get(
    '/search/notes',
    authMiddleware,
    checkUserActive,
    activatedMiddleware,
    noteController.searchOwn,
);
router.get('/search/notes/public', noteController.searchPublic);

//
// notes access (прямое управление доступом)
//
router.post(
    '/notes/:id/access',
    authMiddleware,
    checkUserActive,
    activatedMiddleware,
    noteAccessController.addAccess,
);
router.get(
    '/notes/:id/access',
    authMiddleware,
    checkUserActive,
    noteAccessController.getAccessList,
);
router.patch(
    '/notes/:id/access/:userId',
    authMiddleware,
    checkUserActive,
    activatedMiddleware,
    noteAccessController.updateAccess,
);
router.delete(
    '/notes/:id/access/:userId',
    authMiddleware,
    checkUserActive,
    activatedMiddleware,
    noteAccessController.removeAccess,
);

//
// share links (управление share-ссылками)
//
router.post(
    '/notes/:id/share-link',
    authMiddleware,
    checkUserActive,
    activatedMiddleware,
    noteAccessController.createShareLink,
);
router.get(
    '/notes/:id/share-links',
    authMiddleware,
    checkUserActive,
    noteAccessController.getShareLinks,
);
router.post(
    '/share-link/connect',
    authMiddleware,
    checkUserActive,
    activatedMiddleware,
    noteAccessController.connectByShareLink,
);
router.get('/share-link/:token/info', noteAccessController.getShareLinkInfo);
router.delete(
    '/share-link/:token',
    authMiddleware,
    checkUserActive,
    activatedMiddleware,
    noteAccessController.deleteShareLink,
);

//
//  comments
//
router.get('/notes/:noteId/comments', authMiddleware, checkUserActive, commentController.getByNote);

router.post(
    '/notes/:noteId/comments',
    createContentLimiter,
    authMiddleware,
    checkUserActive,
    activatedMiddleware,
    body('content', 'Comment cannot be empty').isLength({ min: 1 }),
    commentController.create,
);

router.delete(
    '/comments/:commentId',
    authMiddleware,
    checkUserActive,
    activatedMiddleware,
    commentController.delete,
);

router.post(
    '/comments/:commentId/react',
    authMiddleware,
    checkUserActive,
    activatedMiddleware,
    body('type', 'Invalid reaction type').isIn([
        'like',
        'dislike',
        'heart',
        'laugh',
        'sad',
        'angry',
    ]),
    commentController.react,
);

//
//  moderator
//
router.get(
    '/moderator/public-notes',
    authMiddleware,
    checkUserActive,
    moderatorMiddleware,
    noteController.getModeratorPublicNotes,
);

router.delete(
    '/moderator/notes/:id',
    authMiddleware,
    checkUserActive,
    moderatorMiddleware,
    noteController.deleteNoteAsModerator,
);

router.post(
    '/moderator/notes/:id/block',
    authMiddleware,
    checkUserActive,
    moderatorMiddleware,
    noteController.blockNoteAsModerator,
);

export default router;
