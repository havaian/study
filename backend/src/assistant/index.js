const axios = require('axios');
const { redisClient } = require('../utils/redisClient');

/**
 * AI Medical Assistant
 * Provides basic medical information and guidance
 */
class MedicalAssistant {
    constructor() {
        this.openaiKey = process.env.OPENAI_API_KEY;
        this.modelName = 'gpt-4.5-turbo';
        this.cacheTTL = 0; // No cache for responses
    }

    /**
     * Generate system prompt for the assistant
     * @returns {String} System prompt
     */
    getSystemPrompt() {
        return `You are an AI medical assistant for E-polyclinic.uz, an online medical consultation platform in Uzbekistan.
Your role is to provide general health information, basic medical guidance, and answer common health-related questions.

Important guidelines:
1. Provide general health information based on established medical knowledge.
2. Always include disclaimers when appropriate about consulting a real doctor for personal medical advice.
3. Avoid making definitive diagnoses or specific treatment recommendations.
4. When answering questions about serious symptoms, always advise the user to consult a healthcare professional.
5. Provide information about common preventive measures and healthy lifestyle choices.
6. Be respectful, concise, and helpful in your responses.
7. If asked about medications, only provide general information about common uses and side effects.
8. If unsure about a response, acknowledge limitations and suggest consulting a doctor.
9. Keep responses concise and focused on providing accurate health information.
10. Be familiar with basic healthcare services in Uzbekistan.

Remember that your primary role is to provide general information, not personal medical advice.`;
    }

    /**
     * Generate conversation with context for improved responses
     * @param {String} userId User ID for context retrieval
     * @param {String} message Current user message
     * @returns {Array} Messages array for OpenAI API
     */
    async generateConversationContext(userId, message) {
        const cacheKey = `assistant:context:${userId}`;
        let conversationHistory = [];

        // Try to get conversation history from Redis
        try {
            const cachedHistory = await redisClient.get(cacheKey);
            if (cachedHistory) {
                conversationHistory = JSON.parse(cachedHistory);
            }
        } catch (error) {
            console.error('Error fetching conversation history from Redis:', error);
        }

        // Start with system message
        const messages = [
            { role: 'system', content: this.getSystemPrompt() }
        ];

        // Add conversation history (limited to last 5 exchanges)
        const recentHistory = conversationHistory.slice(-10);
        messages.push(...recentHistory);

        // Add current user message
        messages.push({ role: 'user', content: message });

        return messages;
    }

    /**
     * Update conversation history in Redis
     * @param {String} userId User ID
     * @param {String} userMessage User message
     * @param {String} assistantReply Assistant reply
     */
    async updateConversationHistory(userId, userMessage, assistantReply) {
        const cacheKey = `assistant:context:${userId}`;

        try {
            // Get existing history or create new
            let conversationHistory = [];
            const cachedHistory = await redisClient.get(cacheKey);

            if (cachedHistory) {
                conversationHistory = JSON.parse(cachedHistory);
            }

            // Add new messages
            conversationHistory.push({ role: 'user', content: userMessage });
            conversationHistory.push({ role: 'assistant', content: assistantReply });

            // Keep only recent history (last 20 messages)
            if (conversationHistory.length > 20) {
                conversationHistory = conversationHistory.slice(-20);
            }

            // Store updated history
            await redisClient.set(cacheKey, JSON.stringify(conversationHistory), {
                EX: 86400 // Expire after 24 hours
            });
        } catch (error) {
            console.error('Error updating conversation history in Redis:', error);
        }
    }

    /**
     * Generate response to user message
     * @param {String} message User message
     * @param {String} userId User ID for context
     * @returns {String} AI assistant response
     */
    async generateResponse(message, userId) {
        try {
            // Check cache for identical question
            const cacheKey = `assistant:response:${message.toLowerCase().trim()}`;

            try {
                const cachedResponse = await redisClient.get(cacheKey);
                if (cachedResponse) {
                    console.log('Returning cached response');

                    // Still update conversation history even when using cached response
                    await this.updateConversationHistory(userId, message, cachedResponse);

                    return cachedResponse;
                }
            } catch (error) {
                console.error('Error checking cache:', error);
            }

            // Generate conversation context
            const messages = await this.generateConversationContext(userId, message);

            // Call OpenAI API
            const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: this.modelName,
                    messages,
                    temperature: 0.7,
                    max_tokens: 500
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.openaiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const reply = response.data.choices[0].message.content.trim();

            // Cache the response
            try {
                await redisClient.set(cacheKey, reply, {
                    EX: this.cacheTTL
                });
            } catch (error) {
                console.error('Error caching response:', error);
            }

            // Update conversation history
            await this.updateConversationHistory(userId, message, reply);

            return reply;
        } catch (error) {
            console.error('Error generating AI response:', error.response?.data || error.message);
            throw new Error('Failed to generate response from AI assistant');
        }
    }

    /**
     * Clear conversation history for a user
     * @param {String} userId User ID
     */
    async clearConversationHistory(userId) {
        const cacheKey = `assistant:context:${userId}`;

        try {
            await redisClient.del(cacheKey);
        } catch (error) {
            console.error('Error clearing conversation history:', error);
        }
    }
}

// Create singleton instance
const medicalAssistant = new MedicalAssistant();

module.exports = {
    MedicalAssistant: medicalAssistant
};