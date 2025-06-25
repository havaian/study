<template>
    <div class="flex mb-4" :class="message.sender === 'user' ? 'justify-end' : 'justify-start'">
        <!-- Avatar for non-user messages -->
        <div v-if="message.sender !== 'user'" class="flex-shrink-0 mr-3">
            <img :src="senderAvatar" :alt="senderName" class="h-10 w-10 rounded-full object-cover" />
        </div>

        <!-- Message Bubble -->
        <div class="rounded-lg px-4 py-2 max-w-[80%] shadow" :class="message.sender === 'user' ?
            'bg-indigo-600 text-white' :
            'bg-gray-100 text-gray-900'">
            <div class="prose prose-sm max-w-none" v-html="formattedMessage"></div>
            <div class="text-xs mt-1 opacity-70 text-right">
                {{ formatTime(message.timestamp) }}
            </div>
        </div>

        <!-- Avatar for user messages -->
        <div v-if="message.sender === 'user'" class="flex-shrink-0 ml-3">
            <div class="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                {{ userInitials }}
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue'
import { format } from 'date-fns'
import sanitizeHtml from 'sanitize-html'
import { marked } from 'marked'

const props = defineProps({
    message: {
        type: Object,
        required: true
    },
    userInitials: {
        type: String,
        default: 'U'
    },
    senderName: {
        type: String,
        default: ''
    },
    senderAvatar: {
        type: String,
        default: '/images/user-placeholder.jpg'
    }
})

const formattedMessage = computed(() => {
    if (!props.message.text) return ''

    // Convert markdown to HTML
    const html = marked.parse(props.message.text)

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
})

const formatTime = (timestamp) => {
    return format(new Date(timestamp), 'h:mm a')
}
</script>