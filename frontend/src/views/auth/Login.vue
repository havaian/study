<template>
    <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div class="max-w-md w-full space-y-8">
            <div>
                <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">Sign in to your account</h2>
            </div>
            
            <!-- Using div instead of form to prevent any default form behavior -->
            <div class="mt-8 space-y-6">
                <div class="rounded-md shadow-sm -space-y-px">
                    <div>
                        <label for="email" class="sr-only">Email address</label>
                        <input 
                            id="email" 
                            v-model="email" 
                            name="email" 
                            type="email" 
                            required 
                            class="input rounded-t-md"
                            placeholder="Email address" 
                            autocomplete="email"
                            @keydown.enter="handleSubmit" />
                    </div>
                    <div class="relative">
                        <label for="password" class="sr-only">Password</label>
                        <input 
                            id="password" 
                            v-model="password" 
                            name="password" 
                            :type="showPassword ? 'text' : 'password'" 
                            required
                            class="input rounded-b-md pr-10" 
                            placeholder="Password" 
                            autocomplete="current-password"
                            @keydown.enter="handleSubmit" />
                        <button 
                            type="button" 
                            @click="togglePassword" 
                            class="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700"
                            tabindex="-1">
                            <svg v-if="showPassword" class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"></path>
                            </svg>
                            <svg v-else class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                            </svg>
                        </button>
                    </div>
                </div>

                <div class="flex items-center justify-between">
                    <div class="text-sm">
                        <a href="#" @click.prevent="forgotPassword" class="font-medium bg-gradient-to-r from-educational-blue to-educational-purple bg-clip-text text-transparent  hover:text-indigo-500">
                            Forgot your password?
                        </a>
                    </div>
                </div>

                <div>
                    <button 
                        type="button" 
                        class="btn-primary w-full" 
                        :disabled="loading"
                        @click="handleSubmit">
                        {{ loading ? 'Signing in...' : 'Sign in' }}
                    </button>
                </div>
            </div>

            <p class="mt-2 text-center text-sm text-gray-600">
                Don't have an account?
                <a href="#" @click.prevent="goToRegister" class="font-medium bg-gradient-to-r from-educational-blue to-educational-purple bg-clip-text text-transparent  hover:text-indigo-500">
                    Sign up
                </a>
            </p>

            <div v-if="error"
                class="mt-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm text-center">
                {{ error }}
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const showPassword = ref(false)

// Toggle password visibility
const togglePassword = () => {
    showPassword.value = !showPassword.value
}

async function handleSubmit() {
    // Prevent double submission
    if (loading.value) return
    
    // Basic validation
    if (!email.value || !password.value) {
        error.value = 'Please enter both email and password'
        return
    }
    
    try {
        loading.value = true
        error.value = ''
        
        // Attempt login
        await authStore.login(email.value, password.value)
        
        // If we get here, login was successful, so navigate
        router.push({ path: '/' })
    } catch (err) {
        console.error('Login error:', err)
        // Set error message - no page reload will happen
        error.value = typeof err === 'string' ? err : (err.message || 'Failed to sign in')
    } finally {
        loading.value = false
    }
}

function forgotPassword() {
    router.push('/forgot-password')
}

function goToRegister() {
    router.push('/register')
}
</script>