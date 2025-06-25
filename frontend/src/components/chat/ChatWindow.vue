<template>
    <div class="flex flex-col h-full">
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

        <!-- Messages -->
        <div ref="messagesContainer" class="flex-1 overflow-y-auto p-4 space-y-4">
            <chat-message v-for="message in messages" :key="message.id" :message="message" :user-initials="userInitials"
                :sender-name="recipientName" :sender-avatar="recipientAvatar" />

            <div v-if="isTyping" class="flex items-center space-x-2 text-gray-500">
                <span>{{ recipientName }} is typing</span>
                <div class="flex space-x-1">
                    <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                    <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.4s"></div>
                </div>
            </div>
        </div>

        <!-- Input Area -->
        <div class="p-4 border-t border-gray-200">
            <chat-input :disabled="disabled" :loading="loading" @submit="handleMessageSubmit" />
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import ChatMessage from './ChatMessage.vue'
import ChatInput from './ChatInput.vue'

const props = defineProps({
    messages: {
        type: Array,
        required: true
    },
    recipientName: {
        type: String,
        required: true
    },
    recipientAvatar: {
        type: String,
        default: '/images/user-placeholder.jpg'
    },
    recipientStatus: {
        type: String,
        default: ''
    },
    userInitials: {
        type: String,
        default: 'U'
    },
    isTyping: {
        type: Boolean,
        default: false
    },
    disabled: {
        type: Boolean,
        default: false
    },
    loading: {
        type: Boolean,
        default: false
    }
})

const emit = defineEmits(['submit'])
const messagesContainer = ref(null)

function scrollToBottom() {
    if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
}

function handleMessageSubmit(message) {
    emit('submit', message)
}

watch(() => props.messages.length, () => {
    nextTick(() => scrollToBottom())
})

onMounted(() => {
    scrollToBottom()
})
</script>