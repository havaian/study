const { MedicalAssistant } = require('./index');
const User = require('../user/model');
const { redisClient } = require('../utils/redisClient');

/**
 * Chat with the medical assistant
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.chatWithAssistant = async (req, res) => {
    try {
        const { message, chatId } = req.body;
        // Use authenticated user ID if available, otherwise require it in request body
        const userId = req.user ? req.user.id : req.body.userId;

        if (!message) {
            return res.status(400).json({ message: 'Message is required' });
        }

        // Only fallback to request body userId if user is not authenticated
        if (!userId) {
            return res.status(400).json({ message: 'User authentication required' });
        }

        // Generate response from AI assistant
        const result = await MedicalAssistant.generateResponse(message, userId, chatId);

        // Create or update chat session
        let sessionId = chatId;
        if (!sessionId) {
            // Generate a new session ID if not provided
            sessionId = `chat_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

            // Store the first message in the conversation
            await redisClient.set(`assistant:session:${sessionId}:messages`, JSON.stringify([
                { role: 'user', content: message, timestamp: Date.now() },
                { role: 'assistant', content: result.reply, timestamp: Date.now() }
            ]));

            // Link the session to the user
            await redisClient.set(`assistant:user:${userId}:sessions`, JSON.stringify([sessionId]));
        } else {
            // Get existing messages
            const existingMessagesStr = await redisClient.get(`assistant:session:${sessionId}:messages`);
            let existingMessages = [];

            if (existingMessagesStr) {
                existingMessages = JSON.parse(existingMessagesStr);
            }

            // Add new message and response
            existingMessages.push({ role: 'user', content: message, timestamp: Date.now() });
            existingMessages.push({ role: 'assistant', content: result.reply, timestamp: Date.now() });

            // Update messages in the session
            await redisClient.set(`assistant:session:${sessionId}:messages`, JSON.stringify(existingMessages));

            // Make sure this session is linked to the user
            const userSessionsStr = await redisClient.get(`assistant:user:${userId}:sessions`);
            let userSessions = [];

            if (userSessionsStr) {
                userSessions = JSON.parse(userSessionsStr);
                if (!userSessions.includes(sessionId)) {
                    userSessions.push(sessionId);
                    await redisClient.set(`assistant:user:${userId}:sessions`, JSON.stringify(userSessions));
                }
            } else {
                await redisClient.set(`assistant:user:${userId}:sessions`, JSON.stringify([sessionId]));
            }
        }

        res.status(200).json({
            reply: result.reply,
            chatId: sessionId
        });
    } catch (error) {
        console.error('Error in assistant chat:', error);
        res.status(500).json({
            message: 'An error occurred while processing your request',
            error: error.message
        });
    }
};

/**
 * Get chat history with the assistant
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getChatHistory = async (req, res) => {
    try {
        const userId = req.user.id;

        // Get user's chat sessions
        const userSessionsStr = await redisClient.get(`assistant:user:${userId}:sessions`);

        if (!userSessionsStr) {
            return res.status(200).json({
                success: true,
                messages: [],
                chatId: null
            });
        }

        const userSessions = JSON.parse(userSessionsStr);

        // Use the most recent session
        const latestSessionId = userSessions[userSessions.length - 1];

        // Get messages for the latest session
        const messagesStr = await redisClient.get(`assistant:session:${latestSessionId}:messages`);
        const messages = messagesStr ? JSON.parse(messagesStr) : [];

        res.status(200).json({
            success: true,
            messages,
            chatId: latestSessionId
        });
    } catch (error) {
        console.error('Error getting chat history:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while retrieving chat history',
            error: error.message
        });
    }
};

/**
 * Clear conversation history with the assistant
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.clearConversationHistory = async (req, res) => {
    try {
        // Use authenticated user ID only
        const userId = req.user.id;

        // Get user's chat sessions
        const userSessionsStr = await redisClient.get(`assistant:user:${userId}:sessions`);

        if (userSessionsStr) {
            const userSessions = JSON.parse(userSessionsStr);

            // Delete all session messages
            for (const sessionId of userSessions) {
                await redisClient.del(`assistant:session:${sessionId}:messages`);
            }

            // Clear the sessions list
            await redisClient.del(`assistant:user:${userId}:sessions`);
        }

        // Clear conversation history in the AI assistant
        await MedicalAssistant.clearConversationHistory(userId);

        res.status(200).json({
            success: true,
            message: 'Conversation history cleared successfully'
        });
    } catch (error) {
        console.error('Error clearing conversation history:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while clearing conversation history',
            error: error.message
        });
    }
};

/**
 * Get health information about a specific topic
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getHealthInfo = async (req, res) => {
    try {
        const { topic } = req.params;
        // Use authenticated user ID if available, otherwise use anonymous
        const userId = req.user ? req.user.id : 'anonymous';

        if (!topic) {
            return res.status(400).json({ message: 'Topic is required' });
        }

        // Construct a message asking for information about the topic
        const message = `Can you provide general information about ${topic}?`;

        // Generate response from AI assistant
        const result = await MedicalAssistant.generateResponse(message, userId);

        res.status(200).json({
            topic,
            information: result.reply,
            success: true
        });
    } catch (error) {
        console.error('Error getting health information:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while fetching health information',
            error: error.message
        });
    }
};

/**
 * Check symptoms (basic guidance only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.checkSymptoms = async (req, res) => {
    try {
        const { symptoms } = req.body;
        // Use authenticated user ID if available, otherwise require it
        const userId = req.user ? req.user.id : req.body.userId;

        if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
            return res.status(400).json({ message: 'Valid symptoms array is required' });
        }

        if (!userId) {
            return res.status(400).json({ message: 'User authentication required' });
        }

        // Construct a message asking about the symptoms
        const message = `I'm experiencing the following symptoms: ${symptoms.join(', ')}. What could this mean and what should I do?`;

        // Generate response from AI assistant
        const result = await MedicalAssistant.generateResponse(message, userId);

        res.status(200).json({
            symptoms,
            guidance: result.reply,
            disclaimer: 'This information is for educational purposes only and is not a substitute for professional medical advice. Please consult with a qualified healthcare provider for diagnosis and treatment.',
            success: true
        });
    } catch (error) {
        console.error('Error checking symptoms:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while checking symptoms',
            error: error.message
        });
    }
};

/**
 * Submit feedback for an assistant message
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.submitFeedback = async (req, res) => {
    try {
        const { messageId, feedback, feedbackText } = req.body;
        const userId = req.user.id;

        if (!messageId || !feedback) {
            return res.status(400).json({ message: 'Message ID and feedback type are required' });
        }

        // Validate feedback type
        if (!['thumbs_up', 'thumbs_down'].includes(feedback)) {
            return res.status(400).json({ message: 'Invalid feedback type' });
        }

        // Store feedback in Redis
        const feedbackData = {
            userId,
            messageId,
            feedback,
            feedbackText: feedbackText || '',
            timestamp: Date.now()
        };

        await redisClient.set(`assistant:feedback:${messageId}`, JSON.stringify(feedbackData));

        // Optionally, you could aggregate feedback for analytics
        // For example, increment counter for thumbs up or down
        const counterKey = `assistant:feedback:counter:${feedback === 'thumbs_up' ? 'positive' : 'negative'}`;
        await redisClient.incr(counterKey);

        res.status(200).json({
            success: true,
            message: 'Feedback submitted successfully'
        });
    } catch (error) {
        console.error('Error submitting feedback:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while submitting feedback',
            error: error.message
        });
    }
};