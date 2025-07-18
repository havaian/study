<template>
    <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div class="max-w-md w-full space-y-8">
            <div>
                <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">Create your account</h2>
            </div>

            <div v-if="registrationSuccess" class="rounded-md bg-green-50 p-4">
                <div class="flex">
                    <div class="flex-shrink-0">
                        <svg class="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clip-rule="evenodd" />
                        </svg>
                    </div>
                    <div class="ml-3">
                        <h3 class="text-sm font-medium text-green-800">Registration successful!</h3>
                        <div class="mt-2 text-sm text-green-700">
                            <p>Please check your email to verify your account before logging in.</p>
                        </div>
                        <div class="mt-4">
                            <router-link to="/login" class="text-sm font-medium text-green-600 hover:text-green-500">
                                Go to login page →
                            </router-link>
                        </div>
                    </div>
                </div>
            </div>

            <form v-else class="mt-8 space-y-6" @submit.prevent="handleSubmit">
                <div class="rounded-md shadow-sm space-y-4">
                    <div>
                        <label for="role" class="label">I am a</label>
                        <select id="role" v-model="formData.role" class="input mt-1" required @change="watchRole">
                            <option value="student">Student</option>
                            <option value="teacher">Teacher</option>
                        </select>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label for="firstName" class="label">First Name</label>
                            <input id="firstName" v-model="formData.firstName" type="text" required
                                class="input mt-1" />
                        </div>
                        <div>
                            <label for="lastName" class="label">Last Name</label>
                            <input id="lastName" v-model="formData.lastName" type="text" required class="input mt-1" />
                        </div>
                    </div>

                    <div>
                        <label for="email" class="label">Email address</label>
                        <input id="email" v-model="formData.email" type="email" required class="input mt-1" />
                    </div>

                    <div>
                        <label for="phone" class="label">Phone number</label>
                        <input id="phone" v-model="formData.phone" type="tel" required class="input mt-1"
                            placeholder="+998901234567" />
                    </div>

                    <div>
                        <label for="password" class="label">Password</label>
                        <div class="relative">
                            <input id="password" v-model="formData.password" :type="showPassword ? 'text' : 'password'" 
                                required class="input mt-1 pr-10" @input="validatePassword" />
                            <button type="button" @click="togglePassword" 
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
                        
                        <!-- Password Requirements -->
                        <div class="mt-2 text-sm">
                            <p class="text-gray-600 mb-2">Password must contain:</p>
                            <div class="space-y-1">
                                <div class="flex items-center gap-2">
                                    <svg class="h-4 w-4" :class="passwordValidation.minLength ? 'text-green-500' : 'text-gray-400'" 
                                        fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                    </svg>
                                    <span :class="passwordValidation.minLength ? 'text-green-600' : 'text-gray-500'">
                                        At least 8 characters
                                    </span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <svg class="h-4 w-4" :class="passwordValidation.hasUppercase ? 'text-green-500' : 'text-gray-400'" 
                                        fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                    </svg>
                                    <span :class="passwordValidation.hasUppercase ? 'text-green-600' : 'text-gray-500'">
                                        One uppercase letter
                                    </span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <svg class="h-4 w-4" :class="passwordValidation.hasLowercase ? 'text-green-500' : 'text-gray-400'" 
                                        fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                    </svg>
                                    <span :class="passwordValidation.hasLowercase ? 'text-green-600' : 'text-gray-500'">
                                        One lowercase letter
                                    </span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <svg class="h-4 w-4" :class="passwordValidation.hasNumber ? 'text-green-500' : 'text-gray-400'" 
                                        fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                    </svg>
                                    <span :class="passwordValidation.hasNumber ? 'text-green-600' : 'text-gray-500'">
                                        One number
                                    </span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <svg class="h-4 w-4" :class="passwordValidation.hasSpecialChar ? 'text-green-500' : 'text-gray-400'" 
                                        fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                    </svg>
                                    <span :class="passwordValidation.hasSpecialChar ? 'text-green-600' : 'text-gray-500'">
                                        One special character (!@#$%^&*)
                                    </span>
                                </div>
                            </div>
                            
                            <!-- Password Strength Indicator -->
                            <div class="mt-3">
                                <div class="flex items-center gap-2">
                                    <span class="text-sm text-gray-600">Strength:</span>
                                    <div class="flex-1 bg-gray-200 rounded-full h-2">
                                        <div class="h-2 rounded-full transition-all duration-300" 
                                            :class="passwordStrengthColor" :style="{ width: passwordStrengthWidth }"></div>
                                    </div>
                                    <span class="text-sm font-medium" :class="passwordStrengthTextColor">
                                        {{ passwordStrengthText }}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Removed: Date of Birth and Gender moved to conditional blocks -->

                    <template v-if="formData.role === 'teacher'">
                        <div>
                            <label for="specializations" class="label">Specializations</label>
                            <div class="space-y-2">
                                <div v-for="(spec, index) in formData.specializations" :key="index" class="flex gap-2">
                                    <select v-model="formData.specializations[index]" class="input flex-1">
                                        <option value="">Select Specialization</option>
                                        <option v-for="spec in getAvailableSpecializations(index)" :key="spec" :value="spec">
                                            {{ spec }}
                                        </option>
                                    </select>
                                    <button type="button" @click="removeSpecialization(index)"
                                        class="px-2 py-1 text-red-600 hover:text-red-800">
                                        Remove
                                    </button>
                                </div>
                                <button type="button" @click="addSpecialization"
                                    class="text-sm bg-gradient-to-r from-educational-blue to-educational-purple bg-clip-text text-transparent  hover:text-indigo-800"
                                    :disabled="availableSpecializations.length <= formData.specializations.filter(s => s !== '').length">
                                    + Add Specialization
                                </button>
                            </div>
                        </div>

                        <div>
                            <label for="licenseNumber" class="label">License Number</label>
                            <input id="licenseNumber" v-model="formData.licenseNumber" type="text" required
                                class="input mt-1" />
                        </div>

                        <div>
                            <label for="experience" class="label">Years of Experience</label>
                            <input id="experience" v-model.number="formData.experience" type="number" min="0" required
                                class="input mt-1" />
                        </div>

                        <div>
                            <label for="lessonFee" class="label">Lesson Fee (UZS)</label>
                            <input id="lessonFee" v-model.number="formData.lessonFee" type="number" min="0"
                                required class="input mt-1" />
                        </div>

                        <div>
                            <label for="languages" class="label">Languages</label>
                            <input id="languages" v-model="languagesInput" type="text" class="input mt-1"
                                placeholder="English, Russian, Uzbek (comma separated)" />
                        </div>
                    </template>

                    <!-- Date of Birth - Only for students -->
                    <div v-if="formData.role === 'student'">
                        <label for="dateOfBirth" class="label">Date of Birth</label>
                        <input id="dateOfBirth" v-model="formData.dateOfBirth" type="date" required class="input mt-1"
                            :max="maxDate" />
                    </div>

                    <!-- Gender - Only for students -->
                    <div v-if="formData.role === 'student'">
                        <label for="gender" class="label">Gender</label>
                        <select id="gender" v-model="formData.gender" class="input mt-1" required>
                            <option value="">Select gender</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                            <option value="prefer not to say">Prefer not to say</option>
                        </select>
                    </div>
                </div>

                <div>
                    <button type="submit" class="btn-primary w-full" :disabled="loading || !isPasswordValid">
                        {{ loading ? 'Creating account...' : 'Create account' }}
                    </button>
                    <p v-if="!isPasswordValid && formData.password" class="mt-2 text-sm text-red-600 text-center">
                        Please ensure your password meets all requirements
                    </p>
                </div>
            </form>

            <p class="mt-2 text-center text-sm text-gray-600">
                Already have an account?
                <router-link to="/login" class="font-medium bg-gradient-to-r from-educational-blue to-educational-purple bg-clip-text text-transparent  hover:text-indigo-500">
                    Sign in
                </router-link>
            </p>

            <div v-if="error" class="mt-4 text-sm text-center text-red-600">
                {{ error }}
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import axios from 'axios'

const router = useRouter()
const authStore = useAuthStore()

const availableSpecializations = ref([])
const languagesInput = ref('')
const showPassword = ref(false)

const formData = reactive({
    role: 'student',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    dateOfBirth: '',
    gender: '',
    specializations: [],
    licenseNumber: '',
    experience: 0,
    lessonFee: 0
})

const registrationSuccess = ref(false)
const loading = ref(false)
const error = ref('')

// Password validation state
const passwordValidation = reactive({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false
})

// Calculate max date (18 years ago from today)
const maxDate = computed(() => {
    const date = new Date()
    date.setFullYear(date.getFullYear() - 18)
    return date.toISOString().split('T')[0]
})

// Password strength calculations
const passwordStrengthScore = computed(() => {
    const validations = Object.values(passwordValidation)
    return validations.filter(Boolean).length
})

const passwordStrengthWidth = computed(() => {
    return `${(passwordStrengthScore.value / 5) * 100}%`
})

const passwordStrengthColor = computed(() => {
    const score = passwordStrengthScore.value
    if (score <= 1) return 'bg-red-500'
    if (score <= 2) return 'bg-orange-500'
    if (score <= 3) return 'bg-yellow-500'
    if (score <= 4) return 'bg-blue-500'
    return 'bg-green-500'
})

const passwordStrengthText = computed(() => {
    const score = passwordStrengthScore.value
    if (score <= 1) return 'Very Weak'
    if (score <= 2) return 'Weak'
    if (score <= 3) return 'Fair'
    if (score <= 4) return 'Good'
    return 'Strong'
})

const passwordStrengthTextColor = computed(() => {
    const score = passwordStrengthScore.value
    if (score <= 1) return 'text-red-600'
    if (score <= 2) return 'text-orange-600'
    if (score <= 3) return 'text-yellow-600'
    if (score <= 4) return 'text-blue-600'
    return 'text-green-600'
})

// Check if password meets all requirements
const isPasswordValid = computed(() => {
    return Object.values(passwordValidation).every(Boolean)
})

// Get available specializations for a specific dropdown, excluding already selected ones
const getAvailableSpecializations = (currentIndex) => {
    const selectedSpecializations = formData.specializations
        .filter((spec, index) => index !== currentIndex && spec !== '')
    
    return availableSpecializations.value.filter(spec => 
        !selectedSpecializations.includes(spec)
    )
}

// Password validation function
const validatePassword = () => {
    const password = formData.password
    
    passwordValidation.minLength = password.length >= 8
    passwordValidation.hasUppercase = /[A-Z]/.test(password)
    passwordValidation.hasLowercase = /[a-z]/.test(password)
    passwordValidation.hasNumber = /\d/.test(password)
    passwordValidation.hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)
}

// Toggle password visibility
const togglePassword = () => {
    showPassword.value = !showPassword.value
}

// Helper functions for specializations
const addSpecialization = () => {
    formData.specializations.push('')
}

const removeSpecialization = (index) => {
    formData.specializations.splice(index, 1)
}

// Add default empty specialization when switching to teacher role
const watchRole = () => {
    if (formData.role === 'teacher' && formData.specializations.length === 0) {
        formData.specializations.push('')
    }
}

async function handleSubmit() {
    try {
        loading.value = true;
        error.value = '';

        // Create a copy of the formData to modify before sending
        const registrationData = { ...formData };

        if (registrationData.role === 'teacher') {
            // Make sure specializations is processed properly
            registrationData.specializations = formData.specializations.filter(s => s !== "");

            // Process languages for teacher registration
            if (languagesInput.value) {
                registrationData.languages = languagesInput.value.split(',').map(lang => lang.trim()).filter(Boolean);
            } else {
                registrationData.languages = [];
            }

            // Remove student-only fields for teacher registration
            delete registrationData.dateOfBirth;
            delete registrationData.gender;
        } else {
            // For student registration, remove all teacher-specific fields
            delete registrationData.specializations;
            delete registrationData.licenseNumber;
            delete registrationData.experience;
            delete registrationData.lessonFee;
            delete registrationData.languages;
        }

        await authStore.register(registrationData);
        registrationSuccess.value = true;
    } catch (err) {
        error.value = err.message || 'Failed to create account';
    } finally {
        loading.value = false;
    }
}

async function fetchSpecializations() {
    try {
        const response = await axios.get('/api/specializations')
        availableSpecializations.value = response.data.specializations.map(s => s.name)
    } catch (error) {
        console.error('Error fetching specializations:', error)
        // Set some defaults in case API call fails
        availableSpecializations.value = [
            'Mathematics',
            'Science',
            'Languages',
            'Computer Science',
            'History',
            'Literature',
            'Arts',
            'Music',
            'Business',
            'Test Prep'
        ]
    }
}

onMounted(() => {
    fetchSpecializations()
})
</script>