const express = require('express');
const router = express.Router();
const chatController = require('./controller');
const { authenticateUser, restrictChatDuringCall } = require('../auth');

// Apply authentication to all chat routes
router.use(authenticateUser);

/**
 * @route GET /api/chat/conversations
 * @desc Get all conversations for the current user
 * @access Private
 */
router.get('/conversations', chatController.getConversations);

/**
 * @route GET /api/chat/conversations/:id
 * @desc Get conversation details and messages by ID
 * @access Private
 */
router.get('/conversations/:id', chatController.getConversationById);

/**
 * @route POST /api/chat/conversations
 * @desc Create a new conversation
 * @access Private
 */
router.post('/conversations', chatController.createConversation);

/**
 * @route POST /api/chat/messages
 * @desc Send a message in a conversation
 * @access Private
 */
router.post('/messages', restrictChatDuringCall, chatController.sendMessage);

/**
 * @route PATCH /api/chat/conversations/:conversationId/read
 * @desc Mark all messages in a conversation as read
 * @access Private
 */
router.patch('/conversations/:conversationId/read', chatController.markMessagesAsRead);

/**
 * @route PATCH /api/chat/conversations/:conversationId/archive
 * @desc Archive a conversation
 * @access Private
 */
router.patch('/conversations/:conversationId/archive', chatController.archiveConversation);

/**
 * @route GET /api/chat/unread
 * @desc Get unread messages count for the current user
 * @access Private
 */
router.get('/unread', chatController.getUnreadMessagesCount);

module.exports = router;