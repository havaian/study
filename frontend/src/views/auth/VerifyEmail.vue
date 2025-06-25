<template>
    <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div class="max-w-md w-full text-center">
            <div v-if="loading" class="flex flex-col items-center">
                <div class="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
                <p class="mt-4 text-gray-600">Verifying your email...</p>
            </div>

            <template v-else>
                <div v-if="success" class="space-y-6">
                    <div class="rounded-full bg-green-100 h-24 w-24 flex items-center justify-center mx-auto">
                        <svg class="h-12 w-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>

                    <h2 class="text-3xl font-extrabold text-gray-900">
                        Email Verified!
                    </h2>
                    <p class="mt-2 text-sm text-gray-600">
                        Your email has been verified successfully. You can now log in to your account.
                    </p>

                    <div class="mt-8">
                        <router-link to="/login" class="btn-primary w-full justify-center">
                            Go to Login
                        </router-link>
                    </div>
                </div>

                <div v-else class="space-y-6">
                    <div class="rounded-full bg-red-100 h-24 w-24 flex items-center justify-center mx-auto">
                        <svg class="h-12 w-12 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>

                    <h2 class="text-3xl font-extrabold text-gray-900">
                        Verification Failed
                    </h2>
                    <p class="mt-2 text-sm text-gray-600">
                        {{ error || 'The verification link is invalid or has expired.' }}
                    </p>

                    <div class="mt-8">
                        <router-link to="/login" class="btn-primary w-full justify-center">
                            Return to Login
                        </router-link>
                    </div>
                </div>
            </template>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const success = ref(false)
const error = ref('')

onMounted(async () => {
    try {
        const token = route.params.token
        await axios.get(`/api/users/verify/${token}`)
        success.value = true
    } catch (err) {
        error.value = err.response?.data?.message || 'Failed to verify email'
        success.value = false
    } finally {
        loading.value = false
    }
})
</script>