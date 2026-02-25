import MongoUserRepository from './mongo-user-repository.js';
import MongoRoleRepository from './mongo-role-repository.js';
import MongoTokenRepository from './mongo-token-repository.js';
import MongoTagRepository from './mongo-tag-repository.js';
import MongoNoteRepository from './mongo-note-repository.js';
import MongoCommentRepository from './mongo-comment-repository.js';
import MongoFolderRepository from './mongo-folder-repository.js';
import MongoSharedLinkRepository from './mongo-shared-link-repository.js';

const userRepository = new MongoUserRepository();
const roleRepository = new MongoRoleRepository();
const tokenRepository = new MongoTokenRepository();
const tagRepository = new MongoTagRepository();
const noteRepository = new MongoNoteRepository();
const commentRepository = new MongoCommentRepository();
const folderRepository = new MongoFolderRepository();
const shareLinkRepository = new MongoSharedLinkRepository();

export {
    userRepository,
    roleRepository,
    tokenRepository,
    tagRepository,
    noteRepository,
    commentRepository,
    folderRepository,
    shareLinkRepository,
};
