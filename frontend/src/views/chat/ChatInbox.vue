<template>
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="bg-white shadow rounded-lg overflow-hidden">
            <!-- Header -->
            <div class="p-6 border-b border-gray-200">
                <h1 class="text-2xl font-bold text-gray-900">Messages</h1>
            </div>

            <!-- Conversation List -->
            <div class="divide-y divide-gray-200">
                <div v-if="loading" class="p-6 text-center">
                    <div
                        class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent">
                    </div>
                    <p class="mt-2 text-gray-600">Loading conversations...</p>
                </div>

                <template v-else>
                    <div v-if="conversations.length === 0" class="p-6 text-center text-gray-500">
                        No conversations yet
                    </div>

                    <router-link v-for="conversation in conversations" :key="conversation._id"
                        :to="{ name: 'chat-conversation', params: { id: conversation._id } }"
                        class="block p-6 hover:bg-gray-50">
                        <div class="flex items-center space-x-4">
                            <img :src="getOtherParticipant(conversation).profilePicture || '/images/user-placeholder.jpg'"
                                :alt="getOtherParticipant(conversation).firstName"
                                class="h-12 w-12 rounded-full object-cover" />
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center justify-between">
                                    <p class="text-sm font-medium text-gray-900 truncate">
                                        {{ formatParticipantName(getOtherParticipant(conversation)) }}
                                    </p>
                                    <p class="text-sm text-gray-500">
                                        {{ formatTime(conversation.lastMessage?.createdAt) }}
                                    </p>
                                </div>
                                <p class="mt-1 text-sm text-gray-500 truncate">
                                    {{ conversation.lastMessage?.text || 'No messages yet' }}
                                </p>
                            </div>
                            <div v-if="conversation.unreadCount > 0"
                                class="flex-shrink-0 ml-2 bg-indigo-600 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                                {{ conversation.unreadCount }}
                            </div>
                        </div>
                    </router-link>
                </template>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { format } from 'date-fns'
import axios from 'axios'

const authStore = useAuthStore()
const conversations = ref([])
const loading = ref(true)

function getOtherParticipant(conversation) {
    return conversation.participants.find(p => p._id !== authStore.user._id)
}

function formatParticipantName(participant) {
    if (!participant) return 'Unknown'
    return participant.role === 'doctor' ?
        `Dr. ${participant.firstName} ${participant.lastName}` :
        `${participant.firstName} ${participant.lastName}`
}

function formatTime(timestamp) {
    if (!timestamp) return ''
    return format(new Date(timestamp), 'MMM d, h:mm a')
}

async function fetchConversations() {
    try {
        loading.value = true
        const response = await axios.get('/api/chat/conversations')
        conversations.value = response.data.conversations
    } catch (error) {
        console.error('Error fetching conversations:', error)
    } finally {
        loading.value = false
    }
}

onMounted(() => {
    fetchConversations()
})
</script>