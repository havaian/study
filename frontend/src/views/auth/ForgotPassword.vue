<template>
    <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div class="max-w-md w-full space-y-8">
            <div v-if="!success">
                <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    Forgot your password?
                </h2>
                <p class="mt-2 text-center text-sm text-gray-600">
                    Enter your email address and we'll send you a link to reset your password.
                </p>

                <form class="mt-8 space-y-6" @submit.prevent="handleSubmit">
                    <div>
                        <label for="email" class="sr-only">Email address</label>
                        <input id="email" v-model="email" name="email" type="email" required class="input rounded-md"
                            placeholder="Email address" />
                    </div>

                    <div>
                        <button type="submit" class="btn-primary w-full" :disabled="loading">
                            {{ loading ? 'Sending...' : 'Send Reset Link' }}
                        </button>
                    </div>

                    <div v-if="error" class="text-sm text-center text-red-600">
                        {{ error }}
                    </div>
                </form>

                <div class="text-sm text-center">
                    <router-link to="/login" class="font-medium text-indigo-600 hover:text-indigo-500">
                        Back to login
                    </router-link>
                </div>
            </div>

            <div v-else class="text-center">
                <div class="rounded-full bg-green-100 h-24 w-24 flex items-center justify-center mx-auto">
                    <svg class="h-12 w-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                </div>

                <h2 class="mt-6 text-3xl font-extrabold text-gray-900">
                    Check your email
                </h2>
                <p class="mt-2 text-sm text-gray-600">
                    We've sent password reset instructions to {{ email }}
                </p>

                <div class="mt-8 space-y-4">
                    <router-link to="/login" class="btn-primary w-full inline-block text-center">
                        Return to Login
                    </router-link>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import axios from 'axios'

const email = ref('')
const loading = ref(false)
const error = ref('')
const success = ref(false)

async function handleSubmit() {
    try {
        loading.value = true
        error.value = ''

        await axios.post('/api/users/forgot-password', { email: email.value })
        success.value = true
    } catch (err) {
        error.value = err.response?.data?.message || 'Failed to process request'
    } finally {
        loading.value = false
    }
}
</script>