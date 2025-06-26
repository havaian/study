<template>
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="bg-white shadow rounded-lg overflow-hidden h-[600px] flex flex-col">
            <!-- Chat Header -->
            <div class="p-4 border-b border-gray-200">
                <div class="flex items-center">
                    <div class="relative">
                        <img :src="recipientAvatar" :alt="recipientName" class="h-10 w-10 rounded-full object-cover" />
                        <!-- Online Status Indicator -->
                        <div v-if="recipientOnlineStatus.isOnline"
                            class="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full">
                        </div>
                        <div v-else
                            class="absolute bottom-0 right-0 w-3 h-3 bg-gray-400 border-2 border-white rounded-full">
                        </div>
                    </div>
                    <div class="ml-3">
                        <h3 class="text-lg font-medium text-gray-900">{{ recipientName }}</h3>
                        <p class="text-sm text-gray-500">{{ recipientStatus }}</p>
                    </div>
                </div>
            </div>

            <!-- Messages Container -->
            <div ref="messagesContainer" class="flex-1 overflow-y-auto p-4 space-y-4" @scroll="handleScroll">
                <template v-for="message in messages" :key="message._id">
                    <!-- Message Bubble -->
                    <div class="flex mb-4" :class="[
                        message.sender._id === authStore.user._id ? 'justify-end' : 'justify-start',
                    ]">
                        <!-- Other Person's Avatar -->
                        <div v-if="message.sender._id !== authStore.user._id" class="flex-shrink-0 mr-3">
                            <img :src="message.sender.profilePicture || '/images/user-placeholder.jpg'"
                                :alt="message.sender.firstName" class="h-10 w-10 rounded-full object-cover" />
                        </div>

                        <!-- Message Content -->
                        <div class="rounded-lg px-4 py-2 max-w-[70%] shadow relative" :class="[
                            message.sender._id === authStore.user._id
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-100 text-gray-900'
                        ]">
                            <!-- Sender Label -->
                            <div class="text-xs opacity-75 mb-1">
                                {{ formatSenderLabel(message.sender) }}
                            </div>

                            <!-- Message Text -->
                            <div class="text-sm">{{ message.text }}</div>

                            <!-- Timestamp and Read Status -->
                            <div class="flex items-center justify-between mt-1">
                                <div class="text-xs opacity-70">
                                    {{ formatTime(message.createdAt) }}
                                </div>

                                <!-- Read Status (only for sent messages) -->
                                <div v-if="message.sender._id === authStore.user._id" class="ml-2">
                                    <div v-if="message.isRead" class="flex items-center space-x-0.5">
                                        <svg class="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                                        </svg>
                                        <svg class="w-4 h-4 text-gray-300 -ml-1" fill="currentColor" viewBox="0 0 20 20">
                                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                                        </svg>
                                    </div>
                                    <svg v-else class="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd"
                                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                            clip-rule="evenodd" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <!-- User's Avatar -->
                        <div v-if="message.sender._id === authStore.user._id" class="flex-shrink-0 ml-3">
                            <div
                                class="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                                {{ userInitials }}
                            </div>
                        </div>
                    </div>
                </template>

                <!-- Typing Indicator -->
                <div v-if="isTyping" class="flex items-center space-x-2 text-gray-500">
                    <span>{{ recipientName }} is typing</span>
                    <div class="flex space-x-1">
                        <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s">
                        </div>
                        <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.4s">
                        </div>
                    </div>
                </div>
            </div>

            <!-- Input Area -->
            <div class="p-4 border-t border-gray-200">
                <form @submit.prevent="sendMessage" class="flex space-x-2">
                    <input v-model="newMessage" @input="handleTyping" @keydown="handleKeyDown" type="text"
                        class="input flex-1" placeholder="Type your message..." :disabled="loading || sending" />
                    <button type="submit" class="btn-primary" :disabled="loading || sending || !newMessage.trim()">
                        <svg v-if="!sending" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { format } from 'date-fns'
import axios from 'axios'
import io from 'socket.io-client'

const route = useRoute()
const authStore = useAuthStore()

const messages = ref([])
const conversation = ref(null)
const loading = ref(true)
const sending = ref(false)
const isTyping = ref(false)
const socket = ref(null)
const newMessage = ref('')
const messagesContainer = ref(null)

// Online status and read receipts
const recipientOnlineStatus = ref({ isOnline: false, lastSeen: null })
const typingTimeout = ref(null)
const isUserTyping = ref(false)

const userInitials = computed(() => {
    const user = authStore.user
    if (!user) return 'U'
    return (user.firstName.charAt(0) + user.lastName.charAt(0)).toUpperCase()
})

const recipient = computed(() => {
    if (!conversation.value) return null
    return conversation.value.participants.find(p => p._id !== authStore.user._id)
})

const recipientName = computed(() => {
    if (!recipient.value) return ''
    return recipient.value.role === 'teacher' ?
        `Dr. ${recipient.value.firstName} ${recipient.value.lastName}` :
        `${recipient.value.firstName} ${recipient.value.lastName}`
})

const recipientAvatar = computed(() => {
    return recipient.value?.profilePicture || '/images/user-placeholder.jpg'
})

const recipientStatus = computed(() => {
    if (recipientOnlineStatus.value.isOnline) {
        return 'Online'
    } else if (recipientOnlineStatus.value.lastSeen) {
        const lastSeenDate = new Date(recipientOnlineStatus.value.lastSeen)
        const now = new Date()
        const diffMinutes = Math.floor((now - lastSeenDate) / (1000 * 60))

        if (diffMinutes < 1) return 'Last seen just now'
        if (diffMinutes < 60) return `Last seen ${diffMinutes}m ago`
        if (diffMinutes < 1440) return `Last seen ${Math.floor(diffMinutes / 60)}h ago`
        return `Last seen ${Math.floor(diffMinutes / 1440)}d ago`
    }
    return 'Offline'
})

function formatSenderLabel(sender) {
    return sender.role === 'teacher' ?
        `Dr. ${sender.firstName} ${sender.lastName}` :
        `${sender.firstName} ${sender.lastName}`
}

function formatTime(timestamp) {
    return format(new Date(timestamp), 'h:mm a')
}

function scrollToBottom() {
    if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
}

// Handle scroll to mark messages as read
function handleScroll() {
    if (messagesContainer.value) {
        const { scrollTop, scrollHeight, clientHeight } = messagesContainer.value
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100

        if (isNearBottom && socket.value) {
            socket.value.emit('mark-read', { conversationId: route.params.id })
        }
    }
}

// Handle typing indicators
function handleTyping() {
    if (!socket.value || !recipient.value) return

    if (!isUserTyping.value) {
        isUserTyping.value = true
        socket.value.emit('typing', { conversationId: route.params.id })
    }

    // Clear existing timeout
    if (typingTimeout.value) {
        clearTimeout(typingTimeout.value)
    }

    // Set new timeout to stop typing
    typingTimeout.value = setTimeout(() => {
        if (isUserTyping.value) {
            isUserTyping.value = false
            socket.value.emit('stop-typing', { conversationId: route.params.id })
        }
    }, 2000)
}

function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        sendMessage()
    }
}

async function fetchConversation() {
    try {
        loading.value = true
        const response = await axios.get(`/api/chat/conversations/${route.params.id}`)
        conversation.value = response.data.conversation
        messages.value = response.data.messages
        await nextTick()
        scrollToBottom()
    } catch (error) {
        console.error('Error fetching conversation:', error)
    } finally {
        loading.value = false
    }
}

async function sendMessage() {
    const messageText = newMessage.value.trim()

    if (!messageText || sending.value || !recipient.value) {
        console.log('Cannot send message:', {
            messageText: !!messageText,
            sending: sending.value,
            recipient: !!recipient.value,
            socketConnected: socket.value?.connected
        })
        return
    }

    if (!socket.value || !socket.value.connected) {
        console.error('Socket not connected')
        alert('Connection lost. Please refresh the page.')
        return
    }

    try {
        sending.value = true

        // Stop typing indicator
        if (isUserTyping.value) {
            isUserTyping.value = false
            socket.value.emit('stop-typing', { conversationId: route.params.id })
        }

        const messageData = {
            conversationId: route.params.id,
            receiverId: recipient.value._id,
            text: messageText
        }

        console.log('Sending message:', messageData)

        // Add acknowledgment callback to confirm message was received by server
        socket.value.emit('new-message', messageData, (response) => {
            if (response && response.success) {
                console.log('Message sent successfully')
            } else {
                console.error('Failed to send message:', response)
                alert('Failed to send message. Please try again.')
            }
        })

        newMessage.value = ''
        await nextTick()
        scrollToBottom()
    } catch (error) {
        console.error('Error sending message:', error)
        alert('Error sending message. Please try again.')
    } finally {
        sending.value = false
    }
}

function initializeSocket() {
    const token = authStore.token

    if (!token) {
        console.error('No authentication token available')
        return
    }

    console.log('Initializing socket connection...')

    socket.value = io('http://localhost:6633', {
        query: { token },
        path: '/socket.io/',
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000,
        forceNew: true
    })

    socket.value.on('connect', () => {
        console.log('Socket connected successfully')
        socket.value.emit('join-conversation', route.params.id)
    })

    socket.value.on('connect_error', (error) => {
        console.error('Socket connection error:', error)
    })

    socket.value.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason)
    })

    socket.value.on('error', (error) => {
        console.error('Socket error:', error)
    })

    socket.value.on('new-message', async (message) => {
        console.log('Received new message:', message)
        if (message.conversation === route.params.id) {
            messages.value.push(message)
            await nextTick()
            scrollToBottom()

            // Auto-mark as read if user is at bottom of chat
            setTimeout(() => {
                handleScroll()
            }, 100)
        }
    })

    socket.value.on('new-message-notification', (data) => {
        console.log('Received message notification:', data)
        // Handle notifications for messages in other conversations
        // You could show a toast notification here
    })

    // Online status events
    socket.value.on('conversation-participants-status', (data) => {
        console.log('Participants status:', data)
        if (data.conversationId === route.params.id && recipient.value) {
            const status = data.statuses[recipient.value._id]
            if (status) {
                recipientOnlineStatus.value = status
            }
        }
    })

    socket.value.on('user-status', (data) => {
        console.log('User status update:', data)
        if (recipient.value && data.userId === recipient.value._id) {
            recipientOnlineStatus.value = {
                isOnline: data.isOnline,
                lastSeen: data.lastSeen || recipientOnlineStatus.value.lastSeen
            }
        }
    })

    socket.value.on('user-joined', (data) => {
        console.log('User joined conversation:', data)
        if (recipient.value && data.userId === recipient.value._id) {
            recipientOnlineStatus.value.isOnline = true
        }
    })

    socket.value.on('user-left', (data) => {
        console.log('User left conversation:', data)
        if (recipient.value && data.userId === recipient.value._id) {
            recipientOnlineStatus.value.isOnline = data.isOnline || false
        }
    })

    // Typing events
    socket.value.on('typing', (data) => {
        if (data.userId !== authStore.user._id) {
            isTyping.value = true
            setTimeout(() => {
                isTyping.value = false
            }, 3000)
        }
    })

    socket.value.on('stop-typing', (data) => {
        if (data.userId !== authStore.user._id) {
            isTyping.value = false
        }
    })

    // Read receipts
    socket.value.on('messages-read', (data) => {
        console.log('Messages marked as read:', data)
        if (data.conversationId === route.params.id) {
            // Update read status for messages sent by current user
            messages.value = messages.value.map(message => {
                if (message.sender._id === authStore.user._id) {
                    return { ...message, isRead: true }
                }
                return message
            })
        }
    })
}

// Watch for conversation changes to update online status
watch(() => recipient.value, (newRecipient) => {
    if (newRecipient && socket.value) {
        // Reset online status when switching conversations
        recipientOnlineStatus.value = { isOnline: false, lastSeen: null }
    }
}, { immediate: true })

onMounted(() => {
    fetchConversation()
    initializeSocket()
})

onUnmounted(() => {
    if (socket.value) {
        socket.value.emit('leave-conversation', route.params.id)

        if (isUserTyping.value) {
            socket.value.emit('stop-typing', { conversationId: route.params.id })
        }

        socket.value.disconnect()
    }

    if (typingTimeout.value) {
        clearTimeout(typingTimeout.value)
    }
})
</script>