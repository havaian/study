<template>
    <form @submit.prevent="handleSubmit" class="space-y-4">
        <div>
            <label for="response" class="block text-sm font-medium text-gray-700">Your Response</label>
            <textarea id="response" v-model="response" rows="3" class="mt-1 input" placeholder="Write your response..."
                required></textarea>
        </div>

        <div class="flex justify-end">
            <button type="submit" class="btn-primary" :disabled="loading || !response.trim()">
                {{ loading ? 'Sending...' : 'Send Response' }}
            </button>
        </div>
    </form>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
    reviewId: {
        type: String,
        required: true
    }
})

const emit = defineEmits(['submit'])

const response = ref('')
const loading = ref(false)

async function handleSubmit() {
    if (!response.value.trim()) return

    loading.value = true
    try {
        emit('submit', {
            reviewId: props.reviewId,
            response: response.value
        })
        response.value = ''
    } finally {
        loading.value = false
    }
}
</script>