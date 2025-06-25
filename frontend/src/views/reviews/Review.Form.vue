<template>
    <form @submit.prevent="handleSubmit" class="space-y-6">
        <div>
            <label class="block text-sm font-medium text-gray-700">Rating</label>
            <div class="mt-1 flex items-center space-x-1">
                <button v-for="i in 5" :key="i" type="button" class="p-1 focus:outline-none" @click="rating = i">
                    <svg class="h-8 w-8" :class="i <= rating ? 'text-yellow-400' : 'text-gray-300'" fill="currentColor"
                        viewBox="0 0 20 20">
                        <path
                            d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                </button>
            </div>
        </div>

        <div>
            <label for="comment" class="block text-sm font-medium text-gray-700">Your Review</label>
            <textarea id="comment" v-model="comment" rows="4" class="mt-1 input" placeholder="Share your experience..."
                required></textarea>
        </div>

        <div class="flex justify-end">
            <button type="submit" class="btn-primary" :disabled="loading || !isValid">
                {{ loading ? 'Submitting...' : 'Submit Review' }}
            </button>
        </div>
    </form>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
    appointmentId: {
        type: String,
        required: true
    }
})

const emit = defineEmits(['submit'])

const rating = ref(0)
const comment = ref('')
const loading = ref(false)

const isValid = computed(() => {
    return rating.value > 0 && comment.value.trim().length > 0
})

async function handleSubmit() {
    if (!isValid.value) return

    loading.value = true
    try {
        emit('submit', {
            appointmentId: props.appointmentId,
            rating: rating.value,
            comment: comment.value
        })
        rating.value = 0
        comment.value = ''
    } finally {
        loading.value = false
    }
}
</script>