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
                        <select id="role" v-model="formData.role" class="input mt-1" required>
                            <option value="patient">Patient</option>
                            <option value="doctor">Doctor</option>
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
                        <input id="password" v-model="formData.password" type="password" required class="input mt-1" />
                    </div>

                    <!-- Removed: Date of Birth and Gender moved to conditional blocks -->

                    <template v-if="formData.role === 'doctor'">
                        <div>
                            <label for="specializations" class="label">Specializations</label>
                            <div class="space-y-2">
                                <div v-for="(spec, index) in formData.specializations" :key="index" class="flex gap-2">
                                    <select v-model="formData.specializations[index]" class="input flex-1">
                                        <option value="">Select Specialization</option>
                                        <option v-for="spec in availableSpecializations" :key="spec" :value="spec">
                                            {{ spec }}
                                        </option>
                                    </select>
                                    <button type="button" @click="removeSpecialization(index)"
                                        class="px-2 py-1 text-red-600 hover:text-red-800">
                                        Remove
                                    </button>
                                </div>
                                <button type="button" @click="addSpecialization"
                                    class="text-sm text-indigo-600 hover:text-indigo-800">
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
                            <label for="consultationFee" class="label">Consultation Fee (UZS)</label>
                            <input id="consultationFee" v-model.number="formData.consultationFee" type="number" min="0"
                                required class="input mt-1" />
                        </div>

                        <div>
                            <label for="languages" class="label">Languages</label>
                            <input id="languages" v-model="languagesInput" type="text" class="input mt-1"
                                placeholder="English, Russian, Uzbek (comma separated)" />
                        </div>
                    </template>

                    <!-- Date of Birth - Only for patients -->
                    <div v-if="formData.role === 'patient'">
                        <label for="dateOfBirth" class="label">Date of Birth</label>
                        <input id="dateOfBirth" v-model="formData.dateOfBirth" type="date" required class="input mt-1"
                            :max="maxDate" />
                    </div>

                    <!-- Gender - Only for patients -->
                    <div v-if="formData.role === 'patient'">
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
                    <button type="submit" class="btn-primary w-full" :disabled="loading">
                        {{ loading ? 'Creating account...' : 'Create account' }}
                    </button>
                </div>
            </form>

            <p class="mt-2 text-center text-sm text-gray-600">
                Already have an account?
                <router-link to="/login" class="font-medium text-indigo-600 hover:text-indigo-500">
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

const formData = reactive({
    role: 'patient',
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
    consultationFee: 0
})

const registrationSuccess = ref(false)
const loading = ref(false)
const error = ref('')

// Calculate max date (18 years ago from today)
const maxDate = computed(() => {
    const date = new Date()
    date.setFullYear(date.getFullYear() - 18)
    return date.toISOString().split('T')[0]
})

// Helper functions for specializations
const addSpecialization = () => {
    formData.specializations.push('')
}

const removeSpecialization = (index) => {
    formData.specializations.splice(index, 1)
}

// Add default empty specialization when switching to doctor role
const watchRole = () => {
    if (formData.role === 'doctor' && formData.specializations.length === 0) {
        formData.specializations.push('')
    }
}

async function handleSubmit() {
    try {
        loading.value = true;
        error.value = '';

        // Create a copy of the formData to modify before sending
        const registrationData = { ...formData };

        if (registrationData.role === 'doctor') {
            // Make sure specializations is processed properly
            registrationData.specializations = formData.specializations.filter(s => s !== "");

            // Process languages for doctor registration
            if (languagesInput.value) {
                registrationData.languages = languagesInput.value.split(',').map(lang => lang.trim()).filter(Boolean);
            } else {
                registrationData.languages = [];
            }

            // Remove patient-only fields for doctor registration
            delete registrationData.dateOfBirth;
            delete registrationData.gender;
        } else {
            // For patient registration, remove all doctor-specific fields
            delete registrationData.specializations;
            delete registrationData.licenseNumber;
            delete registrationData.experience;
            delete registrationData.consultationFee;
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
            'Cardiology',
            'Dermatology',
            'Endocrinology',
            'Family Medicine',
            'Gastroenterology',
            'Neurology',
            'Obstetrics & Gynecology',
            'Ophthalmology',
            'Pediatrics',
            'Psychiatry'
        ]
    }
}

onMounted(() => {
    fetchSpecializations()
})
</script>