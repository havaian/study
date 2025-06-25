<template>
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="bg-white shadow rounded-lg overflow-hidden h-[600px] flex flex-col">
            <!-- Chat Header -->
            <div class="p-4 border-b border-gray-200">
                <div class="flex items-center">
                    <img :src="recipientAvatar" :alt="recipientName" class="h-10 w-10 rounded-full object-cover" />
                    <div class="ml-3">
                        <h3 class="text-lg font-medium text-gray-900">{{ recipientName }}</h3>
                        <p v-if="recipientStatus" class="text-sm text-gray-500">{{ recipientStatus }}</p>
                    </div>
                </div>
            </div>

            <!-- Messages Container -->
            <div ref="messagesContainer" class="flex-1 overflow-y-auto p-4 space-y-4">
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
                        <div class="rounded-lg px-4 py-2 max-w-[70%] shadow" :class="[
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

                            <!-- Timestamp -->
                            <div class="text-xs mt-1 opacity-70 text-right">
                                {{ formatTime(message.createdAt) }}
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
                    <input v-model="newMessage" type="text" class="input flex-1" placeholder="Type your message..."
                        :disabled="loading || sending" />
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
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
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
    return recipient.value.role === 'doctor' ?
        `Dr. ${recipient.value.firstName} ${recipient.value.lastName}` :
        `${recipient.value.firstName} ${recipient.value.lastName}`
})

const recipientAvatar = computed(() => {
    return recipient.value?.profilePicture || '/images/user-placeholder.jpg'
})

const recipientStatus = computed(() => {
    if (!recipient.value?.isOnline) return 'Offline'
    return 'Online'
})

function formatSenderLabel(sender) {
    return sender.role === 'doctor' ?
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

async function sendMessage(text) {
    if (!newMessage.value.trim() || sending.value || !recipient.value) return

    try {
        sending.value = true
        socket.value.emit('new-message', {
            conversationId: route.params.id,
            receiverId: recipient.value._id,
            text: newMessage.value
        })
        newMessage.value = ''
        await nextTick()
        scrollToBottom()
    } catch (error) {
        console.error('Error sending message:', error)
    } finally {
        sending.value = false
    }
}

function initializeSocket() {
    socket.value = io(import.meta.env.VITE_API_URL, {
        query: { token: authStore.token },
        path: '/socket.io/',
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
    });

    socket.value.on('connect', () => {
        console.log('Socket connected');
        socket.value.emit('join-conversation', route.params.id);
    });

    socket.value.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
    });

    socket.value.on('new-message', async (message) => {
        if (message.conversation === route.params.id) {
            messages.value.push(message);
            await nextTick()
            scrollToBottom()
        }
    });

    socket.value.on('error', (error) => {
        console.error('Socket error:', error);
    });

    socket.value.on('typing', (data) => {
        if (data.userId !== authStore.user._id) {
            isTyping.value = true;
            setTimeout(() => {
                isTyping.value = false;
            }, 3000);
        }
    });

    socket.value.on('stop-typing', (data) => {
        if (data.userId !== authStore.user._id) {
            isTyping.value = false;
        }
    });
}

onMounted(() => {
    fetchConversation()
    initializeSocket()
})

onUnmounted(() => {
    if (socket.value) {
        socket.value.emit('leave-conversation', route.params.id)
        socket.value.disconnect()
    }
})
</script>