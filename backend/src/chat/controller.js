const { Message, Conversation } = require('./model');
const User = require('../user/model');
const mongoose = require('mongoose');
const { NotificationService } = require('../notification');

/**
 * Get all conversations for the current user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getConversations = async (req, res) => {
    try {
        const userId = req.user.id;

        // Get all conversations where the user is a participant
        const conversations = await Conversation.findForUser(userId);

        res.status(200).json({
            success: true,
            conversations
        });
    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while fetching conversations',
            error: error.message
        });
    }
};

/**
 * Get conversation details by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getConversationById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = (req.user.id).toString();

        // Check if conversation exists and user is a participant
        const conversation = await Conversation.findById(id)
            .populate('participants', 'firstName lastName profilePicture role')
            .populate('appointment');

        if (!conversation) {
            return res.status(404).json({ message: 'Conversation not found' });
        }

        // Check if user is a participant
        if (!conversation.participants.some(p => p._id.toString() === userId)) {
            return res.status(403).json({ message: 'You are not authorized to access this conversation' });
        }

        // Get messages for this conversation with pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const messages = await Message.find({ conversation: id })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('sender', 'firstName lastName profilePicture role');

        // Mark messages as read for this user
        await Message.markAsRead(id, userId);

        res.status(200).json({
            success: true,
            conversation,
            messages: messages.reverse(), // Reverse to show oldest messages first
            pagination: {
                page,
                limit,
                hasMore: messages.length === limit
            }
        });
    } catch (error) {
        console.error('Error fetching conversation:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while fetching conversation',
            error: error.message
        });
    }
};

/**
 * Send a message in a conversation
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.sendMessage = async (req, res) => {
    try {
        const { conversationId, text, receiverId } = req.body;
        const userId = (req.user.id).toString();

        if (!text) {
            return res.status(400).json({ message: 'Message text is required' });
        }

        let conversation;

        // If conversationId is provided, verify it exists and user is a participant
        if (conversationId) {
            conversation = await Conversation.findById(conversationId);

            if (!conversation) {
                return res.status(404).json({ message: 'Conversation not found' });
            }

            if (!conversation.participants.some(p => p.toString() === userId)) {
                return res.status(403).json({ message: 'You are not authorized to send messages in this conversation' });
            }
        }
        // If no conversationId, create a new conversation between sender and receiver
        else if (receiverId) {
            // Verify receiver exists
            const receiver = await User.findById(receiverId);
            if (!receiver) {
                return res.status(404).json({ message: 'Receiver not found' });
            }

            // Check if a conversation already exists between these users
            conversation = await Conversation.findOne({
                participants: { $all: [userId, receiverId] },
                status: 'active',
                appointment: null // No specific appointment
            });

            // If no conversation exists, create a new one
            if (!conversation) {
                conversation = new Conversation({
                    participants: [userId, receiverId],
                    status: 'active',
                    unreadCounts: new Map([[receiverId, 0]])
                });
                await conversation.save();
            }
        } else {
            return res.status(400).json({ message: 'Either conversationId or receiverId is required' });
        }

        // Create the message
        const messageData = {
            sender: userId,
            receiver: conversationId ? conversation.participants.find(p => p.toString() !== userId) : receiverId,
            conversation: conversation._id,
            text,
            // Link message to appointment if the conversation is about an appointment
            appointment: conversation.appointment || null
        };

        const message = await Message.createAndUpdateConversation(messageData);

        // Populate sender info for the response
        await message.populate('sender', 'firstName lastName profilePicture role');

        // Handle real-time notification (will be implemented with WebSockets)
        // Send notification to the receiver

        res.status(201).json({
            success: true,
            message,
            conversation
        });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while sending the message',
            error: error.message
        });
    }
};

/**
 * Create a new conversation
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createConversation = async (req, res) => {
    try {
        const { participantId, appointmentId } = req.body;
        const userId = req.user.id;

        if (!participantId) {
            return res.status(400).json({ message: 'Participant ID is required' });
        }

        // Verify participant exists
        const participant = await User.findById(participantId);
        if (!participant) {
            return res.status(404).json({ message: 'Participant not found' });
        }

        // Check if a conversation already exists between these users
        let query = {
            participants: { $all: [userId, participantId] },
            status: 'active'
        };

        // If appointmentId is provided, include it in the query
        if (appointmentId) {
            query.appointment = appointmentId;
        } else {
            // If no appointmentId, make sure we're looking for general conversations
            query.appointment = null;
        }

        let conversation = await Conversation.findOne(query);

        // If no conversation exists, create a new one
        if (!conversation) {
            conversation = new Conversation({
                participants: [userId, participantId],
                appointment: appointmentId || null,
                status: 'active',
                unreadCounts: new Map([[participantId, 0]])
            });
            await conversation.save();
        }

        // Populate conversation details for response
        await conversation.populate('participants', 'firstName lastName profilePicture role');

        if (conversation.appointment) {
            await conversation.populate('appointment');
        }

        res.status(201).json({
            success: true,
            conversation
        });
    } catch (error) {
        console.error('Error creating conversation:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while creating the conversation',
            error: error.message
        });
    }
};

/**
 * Mark messages in a conversation as read
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.markMessagesAsRead = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = (req.user.id).toString();

        // Check if conversation exists and user is a participant
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ message: 'Conversation not found' });
        }

        if (!conversation.participants.some(p => p.toString() === userId)) {
            return res.status(403).json({ message: 'You are not authorized to access this conversation' });
        }

        // Mark messages as read
        await Message.markAsRead(conversationId, userId);

        res.status(200).json({
            success: true,
            message: 'Messages marked as read'
        });
    } catch (error) {
        console.error('Error marking messages as read:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while marking messages as read',
            error: error.message
        });
    }
};

/**
 * Archive a conversation
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.archiveConversation = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = (req.user.id).toString();

        // Check if conversation exists and user is a participant
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ message: 'Conversation not found' });
        }

        if (!conversation.participants.some(p => p.toString() === userId)) {
            return res.status(403).json({ message: 'You are not authorized to archive this conversation' });
        }

        // Archive the conversation
        conversation.status = 'archived';
        await conversation.save();

        res.status(200).json({
            success: true,
            message: 'Conversation archived successfully'
        });
    } catch (error) {
        console.error('Error archiving conversation:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while archiving the conversation',
            error: error.message
        });
    }
};

/**
 * Get unread messages count for user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getUnreadMessagesCount = async (req, res) => {
    try {
        const userId = (req.user.id).toString();

        // Get all conversations where the user is a participant
        const conversations = await Conversation.find({
            participants: userId,
            status: 'active'
        });

        // Calculate total unread messages
        let totalUnread = 0;
        const conversationCounts = {};

        // Loop through conversations and get unread counts
        for (const conversation of conversations) {
            const unreadCount = conversation.unreadCounts.get(userId) || 0;
            totalUnread += unreadCount;
            conversationCounts[conversation._id] = unreadCount;
        }

        res.status(200).json({
            success: true,
            totalUnread,
            conversationCounts
        });
    } catch (error) {
        console.error('Error getting unread messages count:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while getting unread messages count',
            error: error.message
        });
    }
};