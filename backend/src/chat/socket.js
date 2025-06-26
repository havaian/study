const jwt = require('jsonwebtoken');
const { Message, Conversation } = require('./model');
const User = require('../user/model');
const { redisClient } = require('../utils/redisClient');

/**
 * Initialize socket.io server and set up event handlers
 * @param {Object} io - Socket.io server instance
 */
function initializeSocketIO(io) {
    // Set max listeners to prevent warnings
    io.sockets.setMaxListeners(20);

    // Authentication middleware
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.query.token;
            if (!token) {
                return next(new Error('Authentication error: Token not provided'));
            }

            // Decode token without verification to get user ID
            const decodedUnverified = jwt.decode(token);
            if (!decodedUnverified || !decodedUnverified.id) {
                return next(new Error('Authentication error: Invalid token format'));
            }

            // Find user to get their specific JWT secret
            const user = await User.findById(decodedUnverified.id);
            if (!user || !user.jwtSecret) {
                return next(new Error('Authentication error: User not found'));
            }

            // Now verify token with user's specific secret
            const decoded = jwt.verify(token, user.jwtSecret);

            if (!decoded) {
                return next(new Error('Authentication error: User not found'));
            }

            // Attach user info to the socket
            socket.user = {
                id: user._id.toString(),
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role
            };

            next();
        } catch (error) {
            console.error('Socket authentication error:', error);
            next(new Error('Authentication error: Invalid token'));
        }
    });

    // Connection handler
    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.user.id}`);

        // Join a room with the user's ID for direct messages
        socket.join(socket.user.id);

        // Track online status
        setUserOnlineStatus(socket.user.id, true);

        // Handle user joining specific conversation rooms
        socket.on('join-conversation', (conversationId) => {
            joinConversationRoom(socket, conversationId);
        });

        // Handle user leaving specific conversation rooms
        socket.on('leave-conversation', (conversationId) => {
            leaveConversationRoom(socket, conversationId);
        });

        // Handle new message
        socket.on('new-message', (data, callback) => {
            handleNewMessage(socket, data, callback);
        });

        // Handle typing status
        socket.on('typing', (data) => {
            handleTypingStatus(socket, data, true);
        });

        // Handle stopped typing
        socket.on('stop-typing', (data) => {
            handleTypingStatus(socket, data, false);
        });

        // Handle read receipts
        socket.on('mark-read', (data) => {
            handleMarkAsRead(socket, data);
        });

        // Handle reconnection
        socket.on('reconnect', () => {
            setUserOnlineStatus(socket.user.id, true);
        });

        // Handle disconnection
        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.user.id}`);
            setUserOnlineStatus(socket.user.id, false);
        });
    });

    // Helper functions

    /**
     * Set user online status in Redis
     * @param {String} userId - User ID
     * @param {Boolean} isOnline - Online status
     */
    async function setUserOnlineStatus(userId, isOnline) {
        try {
            if (isOnline) {
                // Set user as online with expiration (auto-offline after inactivity)
                await redisClient.set(`user:online:${userId}`, 'true', 'EX', 300); // 5 minutes

                // Notify user's conversations about online status
                const conversations = await Conversation.find({
                    participants: userId,
                    status: 'active'
                });

                for (const conversation of conversations) {
                    io.to(`conversation:${conversation._id}`).emit('user-status', {
                        userId,
                        isOnline: true
                    });
                }
            } else {
                // Remove online status
                await redisClient.del(`user:online:${userId}`);

                // Update last seen time
                await redisClient.set(`user:last-seen:${userId}`, Date.now().toString());

                // Notify user's conversations about offline status
                const conversations = await Conversation.find({
                    participants: userId,
                    status: 'active'
                });

                for (const conversation of conversations) {
                    io.to(`conversation:${conversation._id}`).emit('user-status', {
                        userId,
                        isOnline: false,
                        lastSeen: Date.now()
                    });
                }
            }
        } catch (error) {
            console.error('Error setting user online status:', error);
        }
    }

    /**
     * Join a conversation room
     * @param {Object} socket - Socket.io socket object
     * @param {String} conversationId - Conversation ID
     */
    async function joinConversationRoom(socket, conversationId) {
        try {
            // Verify user is a participant in this conversation
            const conversation = await Conversation.findById(conversationId);
            if (!conversation) {
                socket.emit('error', { message: 'Conversation not found' });
                return;
            }

            const isParticipant = conversation.participants.some(
                participant => participant.toString() === socket.user.id
            );

            if (!isParticipant) {
                socket.emit('error', { message: 'Not authorized to join this conversation' });
                return;
            }

            // Join the conversation room
            socket.join(`conversation:${conversationId}`);
            console.log(`User ${socket.user.id} joined conversation ${conversationId}`);

            // Get online status of other participants
            const otherParticipants = conversation.participants.filter(
                participant => participant.toString() !== socket.user.id
            );

            const onlineStatuses = {};
            for (const participantId of otherParticipants) {
                const isOnline = await redisClient.get(`user:online:${participantId}`);
                const lastSeen = await redisClient.get(`user:last-seen:${participantId}`);

                onlineStatuses[participantId.toString()] = {
                    isOnline: Boolean(isOnline),
                    lastSeen: lastSeen ? parseInt(lastSeen) : null
                };
            }

            // Send online status to the user
            socket.emit('conversation-participants-status', {
                conversationId,
                statuses: onlineStatuses
            });

            // Notify other participants that this user joined
            socket.to(`conversation:${conversationId}`).emit('user-joined', {
                conversationId,
                userId: socket.user.id,
                isOnline: true
            });

            // Auto-mark messages as read when user joins conversation
            setTimeout(async () => {
                await handleMarkAsRead(socket, { conversationId });
            }, 1000);
        } catch (error) {
            console.error('Error joining conversation room:', error);
            socket.emit('error', { message: 'Failed to join conversation' });
        }
    }

    /**
     * Leave a conversation room
     * @param {Object} socket - Socket.io socket object
     * @param {String} conversationId - Conversation ID
     */
    function leaveConversationRoom(socket, conversationId) {
        socket.leave(`conversation:${conversationId}`);
        console.log(`User ${socket.user.id} left conversation ${conversationId}`);

        // Notify other participants
        socket.to(`conversation:${conversationId}`).emit('user-left', {
            conversationId,
            userId: socket.user.id
        });
    }

    /**
     * Handle new message from socket
     * @param {Object} socket - Socket.io socket object
     * @param {Object} data - Message data
     * @param {Function} callback - Acknowledgment callback
     */
    async function handleNewMessage(socket, data, callback) {
        try {
            const { conversationId, text, receiverId } = data;

            if (!text || (!conversationId && !receiverId)) {
                if (callback) callback({ success: false, message: 'Invalid message data' });
                return;
            }

            let conversation;
            let messageReceiverId;

            // If conversationId is provided, verify it exists and user is a participant
            if (conversationId) {
                conversation = await Conversation.findById(conversationId)
                    .populate('participants', 'firstName lastName profilePicture role');

                if (!conversation) {
                    if (callback) callback({ success: false, message: 'Conversation not found' });
                    return;
                }

                const isParticipant = conversation.participants.some(
                    p => p._id.toString() === socket.user.id
                );

                if (!isParticipant) {
                    if (callback) callback({
                        success: false,
                        message: 'You are not authorized to send messages in this conversation'
                    });
                    return;
                }

                // Find the receiver (the other participant)
                const receiver = conversation.participants.find(
                    p => p._id.toString() !== socket.user.id
                );
                messageReceiverId = receiver._id;
            }
            // If no conversationId, create a new conversation between sender and receiver
            else if (receiverId) {
                // Verify receiver exists
                const receiver = await User.findById(receiverId);
                if (!receiver) {
                    if (callback) callback({ success: false, message: 'Receiver not found' });
                    return;
                }

                // Check if a conversation already exists between these users
                conversation = await Conversation.findOne({
                    participants: { $all: [socket.user.id, receiverId] },
                    status: 'active',
                    appointment: null // No specific appointment
                });

                // If no conversation exists, create a new one
                if (!conversation) {
                    conversation = new Conversation({
                        participants: [socket.user.id, receiverId],
                        status: 'active',
                        unreadCounts: new Map([[receiverId, 0]])
                    });
                    await conversation.save();

                    // Populate for response
                    await conversation.populate('participants', 'firstName lastName profilePicture role');
                }

                messageReceiverId = receiverId;
            }

            // Create the message using the model's static method
            const messageData = {
                sender: socket.user.id,
                receiver: messageReceiverId,
                conversation: conversation._id,
                text,
                isRead: false,
                // Link message to appointment if the conversation is about an appointment
                appointment: conversation.appointment || null
            };

            // Create message and update conversation
            const message = await Message.createAndUpdateConversation(messageData);

            // Populate sender info for the response
            await message.populate('sender', 'firstName lastName profilePicture role');

            // Prepare the message for sending via socket
            const messageForSocket = {
                _id: message._id,
                sender: message.sender,
                text: message.text,
                conversation: message.conversation,
                isRead: message.isRead,
                createdAt: message.createdAt
            };

            // Send message to the conversation room
            io.to(`conversation:${conversation._id}`).emit('new-message', messageForSocket);

            // Also send directly to the receiver's personal room (in case they're not in the conversation room)
            io.to(messageReceiverId.toString()).emit('new-message-notification', {
                message: messageForSocket,
                conversation: {
                    _id: conversation._id,
                    participants: conversation.participants
                }
            });

            // Acknowledge successful sending
            if (callback) callback({ success: true, message: messageForSocket });
        } catch (error) {
            console.error('Error handling new message:', error);
            if (callback) callback({ success: false, message: 'Failed to send message' });
        }
    }

    /**
     * Handle typing status
     * @param {Object} socket - Socket.io socket object
     * @param {Object} data - Typing data
     * @param {Boolean} isTyping - Whether the user is typing or stopped typing
     */
    function handleTypingStatus(socket, data, isTyping) {
        const { conversationId } = data;

        if (!conversationId) return;

        // Broadcast typing status to the conversation room
        socket.to(`conversation:${conversationId}`).emit(
            isTyping ? 'typing' : 'stop-typing',
            {
                conversationId,
                userId: socket.user.id
            }
        );
    }

    /**
     * Handle marking messages as read
     * @param {Object} socket - Socket.io socket object
     * @param {Object} data - Read receipt data
     */
    async function handleMarkAsRead(socket, data) {
        try {
            const { conversationId } = data;

            if (!conversationId) return;

            // Mark messages as read using the model's static method
            await Message.markAsRead(conversationId, socket.user.id);

            // Notify other participants
            socket.to(`conversation:${conversationId}`).emit('messages-read', {
                conversationId,
                userId: socket.user.id
            });
        } catch (error) {
            console.error('Error marking messages as read:', error);
        }
    }
}

module.exports = initializeSocketIO;