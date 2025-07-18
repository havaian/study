<template>
    <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div class="max-w-md w-full space-y-8">
            <div>
                <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">Sign in to your account</h2>
            </div>
            
            <div class="mt-8 space-y-6">
                <div class="rounded-md shadow-sm -space-y-px">
                    <div>
                        <label for="email" class="sr-only">Email address</label>
                        <input 
                            id="email" 
                            v-model="email" 
                            name="email" 
                            type="email" 
                            class="input rounded-t-md"
                            placeholder="Email address" 
                            autocomplete="email"
                            @keydown.enter.prevent="handleSubmit" />
                    </div>
                    <div class="relative">
                        <label for="password" class="sr-only">Password</label>
                        <input 
                            id="password" 
                            v-model="password" 
                            name="password" 
                            :type="showPassword ? 'text' : 'password'" 
                            class="input rounded-b-md pr-10" 
                            placeholder="Password" 
                            autocomplete="current-password"
                            @keydown.enter.prevent="handleSubmit" />
                        <button 
                            type="button" 
                            @click.prevent="togglePassword" 
                            class="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700">
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
                        <button type="button" @click.prevent="forgotPassword" class="font-medium bg-gradient-to-r from-educational-blue to-educational-purple bg-clip-text text-transparent  hover:text-indigo-500 bg-transparent border-none cursor-pointer">
                            Forgot your password?
                        </button>
                    </div>
                </div>

                <div>
                    <button 
                        type="button" 
                        class="btn-primary w-full" 
                        :disabled="loading"
                        @click.prevent.stop="handleSubmit">
                        {{ loading ? 'Signing in...' : 'Sign in' }}
                    </button>
                </div>
            </div>

            <p class="mt-2 text-center text-sm text-gray-600">
                Don't have an account?
                <button type="button" @click.prevent="goToRegister" class="font-medium bg-gradient-to-r from-educational-blue to-educational-purple bg-clip-text text-transparent  hover:text-indigo-500 bg-transparent border-none cursor-pointer">
                    Sign up
                </button>
            </p>

            <div v-if="error"
                class="mt-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm text-center">
                {{ error }}
            </div>
            
            <!-- DEBUG INFO -->
            <div class="mt-4 text-xs text-gray-500 space-y-1">
                <div>Email: {{ email }}</div>
                <div>Password: {{ password ? '***' : 'empty' }}</div>
                <div>Loading: {{ loading }}</div>
                <div>Error: {{ error }}</div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
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
const togglePassword = (event) => {
    if (event) {
        event.preventDefault()
        event.stopPropagation()
    }
    console.log('Toggle password clicked')
    showPassword.value = !showPassword.value
}

async function handleSubmit(event) {
    console.log('=== HANDLE SUBMIT CALLED ===')
    console.log('Event:', event)
    console.log('Email:', email.value)
    console.log('Password length:', password.value?.length || 0)
    console.log('Loading state:', loading.value)
    
    // Prevent any default behavior
    if (event) {
        event.preventDefault()
        event.stopPropagation()
        event.stopImmediatePropagation()
    }
    
    // Prevent double submission
    if (loading.value) {
        console.log('Already loading, skipping...')
        return false
    }
    
    // Basic validation
    if (!email.value || !password.value) {
        console.log('Validation failed - missing fields')
        error.value = 'Please enter both email and password'
        return false
    }
    
    try {
        console.log('Starting login attempt...')
        loading.value = true
        error.value = ''
        
        // Add a small delay to see if the page reloads immediately
        await new Promise(resolve => setTimeout(resolve, 100))
        console.log('After delay, still here...')
        
        // Attempt login
        console.log('Calling authStore.login...')
        const result = await authStore.login(email.value, password.value)
        console.log('Login result:', result)
        
        // If we get here, login was successful
        console.log('Login successful, navigating...')
        
        // Use nextTick to ensure DOM updates before navigation
        await nextTick()
        await router.push({ path: '/' })
        console.log('Navigation complete')
        
    } catch (err) {
        console.log('=== LOGIN ERROR ===')
        console.error('Login error details:', err)
        console.log('Error type:', typeof err)
        console.log('Error message:', err.message)
        console.log('Error response:', err.response?.data)
        
        // Set error message
        error.value = typeof err === 'string' ? err : (err.message || 'Failed to sign in')
        console.log('Set error to:', error.value)
        
        // CRITICAL: Force DOM update and prevent any navigation
        await nextTick()
        console.log('After nextTick, error should be visible')
        
        // Extra protection: Prevent any router navigation on error
        console.log('Current route:', router.currentRoute.value.path)
        
    } finally {
        console.log('Setting loading to false...')
        loading.value = false
        
        // Ensure DOM updates
        await nextTick()
        console.log('handleSubmit function ending...')
    }
    
    // CRITICAL: Prevent any default behavior
    return false
}

function forgotPassword(event) {
    console.log('Forgot password clicked')
    if (event) {
        event.preventDefault()
        event.stopPropagation()
    }
    router.push('/forgot-password')
}

function goToRegister(event) {
    console.log('Go to register clicked')
    if (event) {
        event.preventDefault()
        event.stopPropagation()
    }
    router.push('/register')
}

// Debug: Log when component mounts
console.log('Login component mounted')

// REMOVE THIS - This might be causing the navigation
// Debug: Watch for unexpected navigation
// router.beforeEach((to, from, next) => {
//     console.log('Router navigation:', from.path, '->', to.path)
//     next()
// })
</script>