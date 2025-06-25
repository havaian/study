<template>
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="bg-white shadow rounded-lg overflow-hidden">
            <!-- Chat Header -->
            <div class="p-4 border-b border-gray-200">
                <h1 class="text-lg font-medium text-gray-900">AI Medical Assistant</h1>
                <p class="mt-1 text-sm text-gray-500">
                    Ask general health questions and get instant guidance
                </p>
            </div>

            <!-- Chat Messages -->
            <div class="h-[600px] overflow-y-auto p-4" ref="chatContainer">
                <div class="space-y-4">
                    <template v-if="messages.length === 0">
                        <div class="text-center text-gray-500">
                            <p>👋 Hi! I'm your AI medical assistant.</p>
                            <p>I can provide general health information and guidance.</p>
                            <p>How can I help you today?</p>
                        </div>
                    </template>

                    <div v-for="message in messages" :key="message.id" class="flex mb-4"
                        :class="message.sender === 'user' ? 'justify-end' : 'justify-start'">

                        <!-- Assistant Avatar -->
                        <div v-if="message.sender === 'assistant'" class="flex-shrink-0 mr-3">
                            <div class="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                <svg class="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24"
                                    stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                </svg>
                            </div>
                        </div>

                        <!-- Message Bubble -->
                        <div class="rounded-lg px-4 py-2 max-w-[80%] shadow" :class="message.sender === 'user' ?
                            'bg-indigo-600 text-white' :
                            'bg-gray-100 text-gray-900'">
                            <div v-if="message.sender === 'assistant'" class="prose prose-sm max-w-none"
                                v-html="formatMessage(message.text)">
                            </div>
                            <div v-else>{{ message.text }}</div>
                            <div class="text-xs mt-1 opacity-70 text-right">
                                {{ formatTime(message.timestamp) }}
                            </div>
                        </div>

                        <!-- User Avatar -->
                        <div v-if="message.sender === 'user'" class="flex-shrink-0 ml-3">
                            <div
                                class="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                                {{ getUserInitials() }}
                            </div>
                        </div>
                    </div>

                    <!-- Typing indicator -->
                    <div v-if="isTyping" class="flex justify-start mb-4">
                        <div class="flex-shrink-0 mr-3">
                            <div class="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                <svg class="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24"
                                    stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                </svg>
                            </div>
                        </div>
                        <div class="rounded-lg px-4 py-2 bg-gray-100 text-gray-900 shadow">
                            <div class="typing-indicator">
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Input Area -->
            <div class="p-4 border-t border-gray-200">
                <form @submit.prevent="sendMessage" class="flex space-x-2">
                    <input v-model="newMessage" type="text" class="input flex-1" placeholder="Type your message..."
                        :disabled="loading" @keydown.enter="sendMessage" />
                    <button type="submit" class="btn-primary" :disabled="loading || !newMessage.trim()">
                        <svg v-if="!loading" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M12 19l9 2-9-18-9 18l9-2zm0 0v-8" />
                        </svg>
                        <svg v-else class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none"
                            viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4">
                            </circle>
                            <path class="opacity-75" fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                            </path>
                        </svg>
                    </button>
                </form>

                <div class="mt-3 flex justify-between items-center">
                    <p class="text-xs text-gray-500">
                        Note: This is for general information only. Always consult a doctor for medical advice.
                    </p>

                    <div class="flex space-x-2">
                        <button @click="clearChat" class="text-xs text-gray-500 hover:text-gray-700 flex items-center">
                            <svg class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Clear chat
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Feedback Modal -->
        <div v-if="showFeedbackModal"
            class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg p-6 max-w-md w-full">
                <h3 class="text-lg font-medium mb-4">How helpful was this response?</h3>

                <div class="flex justify-center space-x-4 mb-4">
                    <button @click="submitFeedback('thumbs_up')" class="p-2 rounded-full hover:bg-green-100"
                        :class="{ 'bg-green-100': feedback === 'thumbs_up' }">
                        <svg class="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                        </svg>
                    </button>
                    <button @click="submitFeedback('thumbs_down')" class="p-2 rounded-full hover:bg-red-100"
                        :class="{ 'bg-red-100': feedback === 'thumbs_down' }">
                        <svg class="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2" />
                        </svg>
                    </button>
                </div>

                <div v-if="feedback === 'thumbs_down'" class="mb-4">
                    <label for="feedback-text" class="block text-sm font-medium text-gray-700 mb-1">
                        How can we improve?
                    </label>
                    <textarea id="feedback-text" v-model="feedbackText" rows="3" class="input w-full"
                        placeholder="Please tell us what was wrong..."></textarea>
                </div>

                <div class="flex justify-end space-x-3">
                    <button @click="cancelFeedback" class="btn-secondary">
                        Cancel
                    </button>
                    <button @click="saveFeedback" class="btn-primary" :disabled="feedbackSubmitting">
                        {{ feedbackSubmitting ? 'Sending...' : 'Submit' }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { format } from 'date-fns'
import axios from 'axios'
import sanitizeHtml from 'sanitize-html'
import { marked } from 'marked'

const authStore = useAuthStore()
const chatContainer = ref(null)
const messages = ref([])
const newMessage = ref('')
const loading = ref(false)
const isTyping = ref(false)
const currentChatId = ref(null)

// Feedback state
const showFeedbackModal = ref(false)
const feedback = ref(null)
const feedbackText = ref('')
const feedbackSubmitting = ref(false)
const lastMessageId = ref(null)

// Format timestamp
const formatTime = (timestamp) => {
    return format(new Date(timestamp || Date.now()), 'h:mm a')
}

// Get user initials for avatar
const getUserInitials = () => {
    const user = authStore.user
    if (!user) return 'U'

    const firstInitial = user.firstName ? user.firstName.charAt(0) : ''
    const lastInitial = user.lastName ? user.lastName.charAt(0) : ''

    return (firstInitial + lastInitial).toUpperCase() || 'U'
}

// Format message with markdown and sanitize HTML
const formatMessage = (text) => {
    if (!text) return ''

    // Convert markdown to HTML
    const html = marked.parse(text)

    // Sanitize HTML with strict options
    const clean = sanitizeHtml(html, {
        allowedTags: [
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'ul', 'ol', 'li',
            'b', 'i', 'strong', 'em', 'strike', 'code', 'hr', 'br', 'blockquote'
        ],
        allowedAttributes: {
            'a': ['href', 'target', 'rel']
        },
        allowedSchemes: ['http', 'https', 'mailto'],
        transformTags: {
            'a': (tagName, attribs) => ({
                tagName,
                attribs: {
                    ...attribs,
                    target: '_blank',
                    rel: 'noopener noreferrer'
                }
            })
        }
    })

    return clean
}

// Load previous chat messages
const loadChatHistory = async () => {
    try {
        loading.value = true
        const response = await axios.get('/api/assistant/history')

        if (response.data.success && response.data.messages) {
            messages.value = response.data.messages.map(msg => ({
                id: msg.id || Date.now(),
                text: msg.content,
                sender: msg.role === 'user' ? 'user' : 'assistant',
                timestamp: msg.timestamp || Date.now()
            }))

            if (response.data.chatId) {
                currentChatId.value = response.data.chatId
            }

            // Scroll to bottom
            await nextTick()
            scrollToBottom()
        }
    } catch (error) {
        console.error('Error loading chat history:', error)
    } finally {
        loading.value = false
    }
}

// Scroll chat to bottom
const scrollToBottom = () => {
    if (chatContainer.value) {
        chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
}

// Send message
async function sendMessage() {
    if (!newMessage.value.trim() || loading.value) return

    const messageText = newMessage.value
    newMessage.value = ''

    // Add user message
    const userMessage = {
        id: Date.now(),
        text: messageText,
        sender: 'user',
        timestamp: Date.now()
    }

    messages.value.push(userMessage)

    // Scroll to bottom
    await nextTick()
    scrollToBottom()

    try {
        loading.value = true
        isTyping.value = true

        // Send message to AI assistant
        const response = await axios.post('/api/assistant/chat', {
            message: messageText,
            userId: authStore.user.id,
            chatId: currentChatId.value
        })

        // Update chat ID if new
        if (response.data.chatId) {
            currentChatId.value = response.data.chatId
        }

        isTyping.value = false

        // Add assistant response
        const assistantMessage = {
            id: Date.now(),
            text: response.data.reply,
            sender: 'assistant',
            timestamp: Date.now()
        }

        messages.value.push(assistantMessage)
        lastMessageId.value = assistantMessage.id

        // Delay showing feedback option
        setTimeout(() => {
            showFeedbackModal.value = true
        }, 1000)

        // Scroll to bottom
        await nextTick()
        scrollToBottom()
    } catch (error) {
        console.error('Error sending message:', error)
        isTyping.value = false

        messages.value.push({
            id: Date.now(),
            text: 'Sorry, I encountered an error. Please try again.',
            sender: 'assistant',
            timestamp: Date.now()
        })

        // Scroll to bottom
        await nextTick()
        scrollToBottom()
    } finally {
        loading.value = false
    }
}

// Clear chat history
async function clearChat() {
    if (!confirm('Are you sure you want to clear the chat history?')) return

    try {
        await axios.delete('/api/assistant/history')
        messages.value = []
        currentChatId.value = null
    } catch (error) {
        console.error('Error clearing chat history:', error)
    }
}

// Feedback functions
function submitFeedback(type) {
    feedback.value = type
    if (type === 'thumbs_up') {
        saveFeedback()
    }
}

function cancelFeedback() {
    showFeedbackModal.value = false
    feedback.value = null
    feedbackText.value = ''
}

async function saveFeedback() {
    if (!feedback.value) return

    try {
        feedbackSubmitting.value = true

        await axios.post('/api/assistant/feedback', {
            messageId: lastMessageId.value,
            feedback: feedback.value,
            feedbackText: feedbackText.value
        })

        // Close modal
        showFeedbackModal.value = false

        // Reset feedback state
        feedback.value = null
        feedbackText.value = ''
    } catch (error) {
        console.error('Error submitting feedback:', error)
    } finally {
        feedbackSubmitting.value = false
    }
}

onMounted(() => {
    loadChatHistory()
})
</script>

<style scoped>
.typing-indicator {
    width: 60px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.typing-indicator span {
    height: 10px;
    width: 10px;
    margin: 0 3px;
    background-color: #6366f1;
    border-radius: 50%;
    display: inline-block;
    animation: typing 1.4s ease-in-out infinite;
}

.typing-indicator span:nth-child(1) {
    animation-delay: 0s;
}

.typing-indicator span:nth-child(2) {
    animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
    animation-delay: 0.4s;
}

@keyframes typing {
    0% {
        transform: translateY(0px);
        background-color: #6366f1;
    }

    28% {
        transform: translateY(-7px);
        background-color: #818cf8;
    }

    44% {
        transform: translateY(0px);
        background-color: #6366f1;
    }
}

/* Add TailwindCSS class for markdown content */
.prose h1,
.prose h2,
.prose h3 {
    margin-top: 1em;
    margin-bottom: 0.5em;
    font-weight: 600;
}

.prose p {
    margin-top: 0.5em;
    margin-bottom: 0.5em;
}

.prose ul {
    list-style-type: disc;
    padding-left: 1.5em;
    margin: 0.5em 0;
}

.prose ol {
    list-style-type: decimal;
    padding-left: 1.5em;
    margin: 0.5em 0;
}

.prose a {
    color: #6366f1;
    text-decoration: underline;
}

.prose blockquote {
    border-left: 4px solid #e5e7eb;
    padding-left: 1em;
    margin: 0.5em 0;
    font-style: italic;
}

.prose code {
    font-family: monospace;
    background-color: #f3f4f6;
    padding: 0.2em 0.4em;
    border-radius: 0.25em;
}

.prose pre {
    background-color: #f3f4f6;
    padding: 1em;
    border-radius: 0.5em;
    overflow-x: auto;
    margin: 0.5em 0;
}

.prose pre code {
    background-color: transparent;
    padding: 0;
}
</style>