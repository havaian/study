<template>
    <div class="bg-white shadow rounded-lg p-6">
        <h2 class="text-lg font-medium text-gray-900">Link Telegram Account</h2>
        <p class="mt-1 text-sm text-gray-500">
            Receive appointment notifications and updates via Telegram
        </p>

        <div v-if="!linked" class="mt-4">
            <form @submit.prevent="handleSubmit" class="space-y-4">
                <div>
                    <label for="email" class="label">Confirm your email</label>
                    <input id="email" v-model="email" type="email" class="input mt-1" required />
                </div>

                <div v-if="verificationSent">
                    <label for="code" class="label">Enter verification code</label>
                    <input id="code" v-model="verificationCode" type="text" class="input mt-1" required />
                </div>

                <button type="submit" class="btn-primary w-full" :disabled="loading">
                    {{ loading ? 'Processing...' : verificationSent ? 'Verify Code' : 'Send Code' }}
                </button>
            </form>

            <div v-if="error" class="mt-2 text-sm text-red-600">
                {{ error }}
            </div>
        </div>

        <div v-else class="mt-4">
            <div class="flex items-center justify-between">
                <span class="text-sm text-gray-600">Telegram account linked</span>
                <button class="btn-secondary text-red-600 hover:text-red-700" @click="handleUnlink">
                    Unlink
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import axios from 'axios'

const props = defineProps({
    linked: {
        type: Boolean,
        default: false
    }
})

const emit = defineEmits(['update:linked'])

const email = ref('')
const verificationCode = ref('')
const verificationSent = ref(false)
const loading = ref(false)
const error = ref('')

async function handleSubmit() {
    try {
        loading.value = true
        error.value = ''

        if (!verificationSent.value) {
            // Request verification code
            await axios.post('/api/telegram/verification', {
                email: email.value
            })
            verificationSent.value = true
        } else {
            // Verify code
            await axios.post('/api/users/link-telegram', {
                verificationCode: verificationCode.value
            })
            emit('update:linked', true)
        }
    } catch (err) {
        error.value = err.response?.data?.message || 'An error occurred'
    } finally {
        loading.value = false
    }
}

async function handleUnlink() {
    try {
        loading.value = true
        error.value = ''

        await axios.post('/api/users/unlink-telegram')
        emit('update:linked', false)
    } catch (err) {
        error.value = err.response?.data?.message || 'Failed to unlink account'
    } finally {
        loading.value = false
    }
}
</script>