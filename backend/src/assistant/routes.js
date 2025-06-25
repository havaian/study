const express = require('express');
const router = express.Router();
const assistantController = require('./controller');
const { authenticateUser } = require('../auth/index');

/**
 * @route POST /api/assistant/chat
 * @desc Chat with the medical assistant
 * @access Private (uses authenticated user ID when available)
 */
router.post('/chat', authenticateUser, assistantController.chatWithAssistant);

/**
 * @route DELETE /api/assistant/conversation
 * @desc Clear conversation history with the assistant
 * @access Private (must be authenticated - uses user ID from token)
 */
router.delete('/history', authenticateUser, assistantController.clearConversationHistory);

/**
 * @route GET /api/assistant/history
 * @desc Get chat history with the assistant
 * @access Private (must be authenticated)
 */
router.get('/history', authenticateUser, assistantController.getChatHistory);

/**
 * @route GET /api/assistant/health/:topic
 * @desc Get health information about a specific topic
 * @access Public (tracks user ID if authenticated)
 */
router.get('/health/:topic', assistantController.getHealthInfo);

/**
 * @route POST /api/assistant/symptoms
 * @desc Check symptoms (basic guidance only)
 * @access Private (uses authenticated user ID when available)
 */
router.post('/symptoms', assistantController.checkSymptoms);

/**
 * @route POST /api/assistant/feedback
 * @desc Submit feedback for an assistant message
 * @access Private (must be authenticated)
 */
router.post('/feedback', authenticateUser, assistantController.submitFeedback);

module.exports = router;