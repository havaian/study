<template>
    <div class="space-y-6">
        <div v-for="review in reviews" :key="review._id" class="bg-white shadow rounded-lg p-6">
            <div class="flex items-start">
                <div class="flex-1">
                    <div class="flex items-center">
                        <div class="flex items-center">
                            <template v-for="i in 5" :key="i">
                                <svg class="h-5 w-5" :class="i <= review.rating ? 'text-yellow-400' : 'text-gray-300'"
                                    fill="currentColor" viewBox="0 0 20 20">
                                    <path
                                        d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                            </template>
                        </div>
                        <span class="ml-2 text-sm text-gray-600">{{ formatDate(review.createdAt) }}</span>
                    </div>
                    <p class="mt-2 text-gray-900">{{ review.comment }}</p>
                    <p class="mt-1 text-sm text-gray-600">
                        - {{ review.patient.firstName }} {{ review.patient.lastName }}
                    </p>
                </div>
            </div>
            <div v-if="review.doctorResponse" class="mt-4 bg-gray-50 rounded-lg p-4">
                <p class="text-sm text-gray-900">
                    <span class="font-medium">Doctor's response:</span>
                    {{ review.doctorResponse.text }}
                </p>
                <p class="mt-1 text-xs text-gray-500">
                    {{ formatDate(review.doctorResponse.respondedAt) }}
                </p>
            </div>
        </div>
    </div>
</template>

<script setup>
import { format } from 'date-fns'

const props = defineProps({
    reviews: {
        type: Array,
        required: true
    }
})

const formatDate = (date) => {
    return format(new Date(date), 'MMM d, yyyy')
}
</script>