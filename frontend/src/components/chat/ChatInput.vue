<template>
    <form @submit.prevent="handleSubmit" class="flex space-x-2">
        <input v-model="message" type="text" class="input flex-1" placeholder="Type your message..."
            :disabled="disabled" @keydown.enter="handleSubmit" />
        <button type="submit" class="btn-primary" :disabled="disabled || !message.trim()">
            <svg v-if="!loading" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            <svg v-else class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                </path>
            </svg>
        </button>
    </form>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
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
const message = ref('')

function handleSubmit() {
    if (!message.value.trim() || props.disabled) return

    emit('submit', message.value)
    message.value = ''
}
</script>