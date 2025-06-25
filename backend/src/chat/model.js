const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Schema for individual chat messages
const messageSchema = new Schema({
    sender: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiver: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    conversation: {
        type: Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true
    },
    text: {
        type: String,
        required: true,
        trim: true
    },
    isRead: {
        type: Boolean,
        default: false
    },
    // Optional appointment reference if the chat is about a specific appointment
    appointment: {
        type: Schema.Types.ObjectId,
        ref: 'Appointment'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Schema for conversations (groups related messages)
const conversationSchema = new Schema({
    participants: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    // Track last message for preview and sorting
    lastMessage: {
        type: Schema.Types.ObjectId,
        ref: 'Message'
    },
    // Indicates if this conversation is related to a specific appointment
    appointment: {
        type: Schema.Types.ObjectId,
        ref: 'Appointment'
    },
    // Unread count for each participant
    unreadCounts: {
        type: Map,
        of: Number,
        default: new Map()
    },
    // Status of the conversation
    status: {
        type: String,
        enum: ['active', 'archived'],
        default: 'active'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Create indexes for efficient queries
messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ receiver: 1 });

conversationSchema.index({ participants: 1 });
conversationSchema.index({ appointment: 1 });
conversationSchema.index({ updatedAt: -1 });

// Pre-save middleware to update updatedAt
conversationSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Static method to find user's conversations
conversationSchema.statics.findForUser = function (userId) {
    return this.find({
        participants: userId,
        status: 'active'
    })
        .populate('participants', 'firstName lastName profilePicture role')
        .populate('lastMessage')
        .sort({ updatedAt: -1 });
};

// Static method to create a new message and update the conversation
messageSchema.statics.createAndUpdateConversation = async function (messageData) {
    const Message = this;
    const Conversation = mongoose.model('Conversation');

    // Create the message
    const message = new Message(messageData);
    await message.save();

    // Update the conversation's lastMessage and unreadCounts
    const conversation = await Conversation.findById(message.conversation);
    conversation.lastMessage = message._id;

    // Increment unread count for the receiver
    const receiverId = message.receiver.toString();
    const currentCount = conversation.unreadCounts.get(receiverId) || 0;
    conversation.unreadCounts.set(receiverId, currentCount + 1);

    // Update conversation timestamp
    conversation.updatedAt = Date.now();
    await conversation.save();

    return message;
};

// Static method to mark messages as read
messageSchema.statics.markAsRead = async function (conversationId, userId) {
    const Message = this;
    const Conversation = mongoose.model('Conversation');

    // Update all unread messages in this conversation where the user is the receiver
    await Message.updateMany(
        {
            conversation: conversationId,
            receiver: userId,
            isRead: false
        },
        { isRead: true }
    );

    // Reset unread counter for this user in the conversation
    const conversation = await Conversation.findById(conversationId);
    if (conversation) {
        conversation.unreadCounts.set(userId.toString(), 0);
        await conversation.save();
    }
};

const Message = mongoose.model('Message', messageSchema);
const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = {
    Message,
    Conversation
};