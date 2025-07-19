<template>
    <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="bg-white shadow rounded-lg overflow-hidden">
            <div class="p-6">
                <h1 class="text-2xl font-bold text-gray-900 mb-6">Edit Profile</h1>

                <form @submit.prevent="handleSubmit" class="space-y-6">
                    <!-- Personal Information -->
                    <div>
                        <h2 class="text-lg font-medium text-gray-900 mb-4">Personal Information</h2>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label for="firstName" class="label">First Name</label>
                                <input id="firstName" v-model="formData.firstName" type="text" class="input mt-1"
                                    required />
                            </div>
                            <div>
                                <label for="lastName" class="label">Last Name</label>
                                <input id="lastName" v-model="formData.lastName" type="text" class="input mt-1"
                                    required />
                            </div>
                            <div>
                                <label for="phone" class="label">Phone</label>
                                <input id="phone" v-model="formData.phone" type="tel" class="input mt-1" required />
                            </div>
                            <div>
                                <label for="timezone" class="label">Timezone</label>
                                <select id="timezone" v-model="formData.timezone" class="input mt-1" required>
                                    <option value="">Select Timezone</option>
                                    <option v-for="tz in availableTimezones" :key="tz.value" :value="tz.value">
                                        {{ tz.label }}
                                    </option>
                                </select>
                                <p class="mt-1 text-sm text-gray-500">
                                    Your timezone affects appointment scheduling and availability display.
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- Location -->
                    <div>
                        <h2 class="text-lg font-medium text-gray-900 mb-4">Location</h2>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label for="city" class="label">City</label>
                                <input id="city" v-model="formData.address.city" type="text" class="input mt-1" />
                            </div>
                            <div>
                                <label for="street" class="label">Street</label>
                                <input id="street" v-model="formData.address.street" type="text" class="input mt-1" />
                            </div>
                        </div>
                    </div>

                    <!-- Teacher-specific fields -->
                    <template v-if="authStore.isTeacher">
                        <div>
                            <h2 class="text-lg font-medium text-gray-900 mb-4">Professional Information</h2>

                            <!-- Specializations -->
                            <div class="mb-4">
                                <label class="label">Specializations</label>
                                <div class="space-y-2">
                                    <div v-for="(spec, index) in formData.specializations" :key="index"
                                        class="flex gap-2">
                                        <select v-model="formData.specializations[index]" class="input flex-1">
                                            <option value="">Select Specialization</option>
                                            <option v-for="spec in getAvailableSpecializations(index)" :key="spec"
                                                :value="spec">
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
                                        + Add Another Specialization
                                    </button>
                                </div>
                            </div>

                            <!-- Languages -->
                            <div class="mb-4">
                                <label class="label">Languages</label>
                                <div class="space-y-2">
                                    <div v-for="(lang, index) in formData.languages" :key="index" class="flex gap-2">
                                        <select v-model="formData.languages[index]" class="input flex-1">
                                            <option value="">Select Language</option>
                                            <option v-for="language in getAvailableLanguages(index)" :key="language"
                                                :value="language">
                                                {{ language }}
                                            </option>
                                        </select>
                                        <button type="button" @click="removeLanguage(index)"
                                            class="px-2 py-1 text-red-600 hover:text-red-800">
                                            Remove
                                        </button>
                                    </div>
                                    <button type="button" @click="addLanguage"
                                        class="text-sm bg-gradient-to-r from-educational-blue to-educational-purple bg-clip-text text-transparent  hover:text-indigo-800"
                                        :disabled="availableLanguages.length <= formData.languages.filter(l => l !== '').length">
                                        + Add Language
                                    </button>
                                </div>
                            </div>

                            <!-- Education -->
                            <div class="mb-4">
                                <label class="label">Education</label>
                                <div class="space-y-2">
                                    <div v-for="(edu, index) in formData.education" :key="index"
                                        class="grid grid-cols-1 md:grid-cols-3 gap-2">
                                        <input v-model="edu.degree" type="text" class="input" placeholder="Degree" />
                                        <input v-model="edu.institution" type="text" class="input"
                                            placeholder="Institution" />
                                        <div class="flex gap-2">
                                            <input v-model.number="edu.year" type="number" class="input"
                                                placeholder="Year" />
                                            <button type="button" @click="removeEducation(index)"
                                                class="px-2 py-1 text-red-600 hover:text-red-800">
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                    <button type="button" @click="addEducation"
                                        class="text-sm bg-gradient-to-r from-educational-blue to-educational-purple bg-clip-text text-transparent  hover:text-indigo-800">
                                        + Add Education
                                    </button>
                                </div>
                            </div>

                            <!-- Certifications -->
                            <div class="mb-4">
                                <label class="label">Certifications</label>
                                <div class="space-y-2">
                                    <div v-for="(cert, index) in formData.certifications" :key="index"
                                        class="grid grid-cols-1 md:grid-cols-3 gap-2">
                                        <input v-model="cert.name" type="text" class="input"
                                            placeholder="Certificate Name" />
                                        <input v-model="cert.issuer" type="text" class="input"
                                            placeholder="Issuing Organization" />
                                        <div class="flex gap-2">
                                            <input v-model.number="cert.year" type="number" class="input"
                                                placeholder="Year" />
                                            <button type="button" @click="removeCertification(index)"
                                                class="px-2 py-1 text-red-600 hover:text-red-800">
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                    <button type="button" @click="addCertification"
                                        class="text-sm bg-gradient-to-r from-educational-blue to-educational-purple bg-clip-text text-transparent  hover:text-indigo-800">
                                        + Add Certification
                                    </button>
                                </div>
                            </div>

                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label for="lessonFee" class="label">Lesson Fee (UZS)</label>
                                    <input id="lessonFee" v-model.number="formData.lessonFee" type="number" min="0"
                                        class="input mt-1" required />
                                </div>
                                <div>
                                    <label for="experience" class="label">Years of Experience</label>
                                    <input id="experience" v-model.number="formData.experience" type="number" min="0"
                                        class="input mt-1" required />
                                </div>
                            </div>

                            <div class="mt-4">
                                <label for="bio" class="label">Bio</label>
                                <textarea id="bio" v-model="formData.bio" rows="4" class="input mt-1"></textarea>
                            </div>

                            <!-- Availability -->
                            <div class="mt-4">
                                <label class="label">Availability (in your local time)</label>
                                <p class="text-sm text-gray-500 mb-3">
                                    Set your working hours in your local timezone ({{
                                    getTimezoneDisplay(formData.timezone) }}).
                                    These will be automatically converted for appointment scheduling.
                                </p>
                                <div class="space-y-2">
                                    <div v-for="day in formData.availability" :key="day.dayOfWeek"
                                        class="grid grid-cols-4 gap-4 items-center">
                                        <div class="flex items-center">
                                            <input type="checkbox" v-model="day.isAvailable" class="mr-2" />
                                            <span>{{ formatDay(day.dayOfWeek) }}</span>
                                        </div>
                                        <input type="time" v-model="day.startTime" class="input"
                                            :disabled="!day.isAvailable" />
                                        <input type="time" v-model="day.endTime" class="input"
                                            :disabled="!day.isAvailable" />
                                        <span class="text-sm text-gray-500">
                                            {{ getTimezoneDisplay(formData.timezone) }}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </template>

                    <!-- Student-specific fields -->
                    <template v-else>
                        <div>
                            <h2 class="text-lg font-medium text-gray-900 mb-4">Educational Information</h2>
                            <div class="space-y-4">
                                <div>
                                    <label for="educationalHistory" class="label">Educational Background</label>
                                    <input id="educationalHistory" v-model="educationalHistoryInput" type="text"
                                        class="input mt-1" placeholder="Separate with commas" />
                                </div>
                            </div>
                        </div>

                        <div>
                            <h2 class="text-lg font-medium text-gray-900 mb-4">Emergency Contact</h2>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label for="emergencyName" class="label">Name</label>
                                    <input id="emergencyName" v-model="formData.emergencyContact.name" type="text"
                                        class="input mt-1" />
                                </div>
                                <div>
                                    <label for="emergencyPhone" class="label">Phone</label>
                                    <input id="emergencyPhone" v-model="formData.emergencyContact.phone" type="tel"
                                        class="input mt-1" />
                                </div>
                                <div>
                                    <label for="emergencyRelationship" class="label">Relationship</label>
                                    <input id="emergencyRelationship" v-model="formData.emergencyContact.relationship"
                                        type="text" class="input mt-1" />
                                </div>
                            </div>
                        </div>
                    </template>

                    <div class="flex justify-end space-x-4">
                        <router-link :to="{ name: authStore.isTeacher ? 'teacher-profile' : 'student-profile' }"
                            class="btn-secondary">
                            Cancel
                        </router-link>
                        <button type="submit" class="btn-primary" :disabled="loading">
                            {{ loading ? 'Saving...' : 'Save Changes' }}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import axios from 'axios'

const router = useRouter()
const authStore = useAuthStore()
const loading = ref(false)

// Available timezones with user-friendly labels
const availableTimezones = ref([
    { value: 'Asia/Tashkent', label: 'Asia/Tashkent (UTC+5) - Uzbekistan' },
    { value: 'Asia/Almaty', label: 'Asia/Almaty (UTC+6) - Kazakhstan' },
    { value: 'Asia/Yekaterinburg', label: 'Asia/Yekaterinburg (UTC+5) - Russia' },
    { value: 'Europe/Moscow', label: 'Europe/Moscow (UTC+3) - Russia' },
    { value: 'Asia/Dubai', label: 'Asia/Dubai (UTC+4) - UAE' },
    { value: 'Asia/Karachi', label: 'Asia/Karachi (UTC+5) - Pakistan' },
    { value: 'Asia/Kolkata', label: 'Asia/Kolkata (UTC+5:30) - India' },
    { value: 'Asia/Dhaka', label: 'Asia/Dhaka (UTC+6) - Bangladesh' },
    { value: 'UTC', label: 'UTC (UTC+0) - Universal Time' }
])

const availableSpecializations = ref([])
const availableLanguages = ref(['English', 'Russian', 'Uzbek'])

const formData = reactive({
    firstName: '',
    lastName: '',
    phone: '',
    timezone: 'Asia/Tashkent', // Default timezone
    address: {
        street: '',
        city: ''
    },
    specializations: [],
    languages: [],
    education: [],
    certifications: [],
    lessonFee: 0,
    experience: 0,
    bio: '',
    availability: [
        { dayOfWeek: 1, isAvailable: false, startTime: '09:00', endTime: '17:00' },
        { dayOfWeek: 2, isAvailable: false, startTime: '09:00', endTime: '17:00' },
        { dayOfWeek: 3, isAvailable: false, startTime: '09:00', endTime: '17:00' },
        { dayOfWeek: 4, isAvailable: false, startTime: '09:00', endTime: '17:00' },
        { dayOfWeek: 5, isAvailable: false, startTime: '09:00', endTime: '17:00' },
        { dayOfWeek: 6, isAvailable: false, startTime: '09:00', endTime: '17:00' },
        { dayOfWeek: 7, isAvailable: false, startTime: '09:00', endTime: '17:00' }
    ],
    educationalHistory: '',
    emergencyContact: {
        name: '',
        phone: '',
        relationship: ''
    }
})

const educationalHistoryInput = ref('')

// Get timezone display for availability
const getTimezoneDisplay = (timezone) => {
    if (!timezone) return '(UTC+5)'
    const tz = availableTimezones.value.find(t => t.value === timezone)
    return tz ? tz.label.split(' ')[1] : '(UTC+5)'
}

// Get available specializations for a specific dropdown, excluding already selected ones
const getAvailableSpecializations = (currentIndex) => {
    const selectedSpecializations = formData.specializations
        .filter((spec, index) => index !== currentIndex && spec !== '')

    return availableSpecializations.value.filter(spec =>
        !selectedSpecializations.includes(spec)
    )
}

// Get available languages for a specific dropdown, excluding already selected ones
const getAvailableLanguages = (currentIndex) => {
    const selectedLanguages = formData.languages
        .filter((lang, index) => index !== currentIndex && lang !== '')

    return availableLanguages.value.filter(lang =>
        !selectedLanguages.includes(lang)
    )
}

// Helper functions for arrays
const addSpecialization = () => {
    formData.specializations.push('')
}

const removeSpecialization = (index) => {
    formData.specializations.splice(index, 1)
}

const addLanguage = () => {
    formData.languages.push('')
}

const removeLanguage = (index) => {
    formData.languages.splice(index, 1)
}

const addEducation = () => {
    formData.education.push({ degree: '', institution: '', year: null })
}

const removeEducation = (index) => {
    formData.education.splice(index, 1)
}

const addCertification = () => {
    formData.certifications.push({ name: '', issuer: '', year: null })
}

const removeCertification = (index) => {
    formData.certifications.splice(index, 1)
}

const formatDay = (dayOfWeek) => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    return days[dayOfWeek - 1]
}

async function fetchSpecializations() {
    try {
        const response = await axios.get('/api/specializations')
        availableSpecializations.value = response.data.specializations.map(s => s.name)
    } catch (error) {
        console.error('Error fetching specializations:', error)
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

async function fetchUserProfile() {
    try {
        const response = await axios.get('/api/users/me')
        const user = response.data.user || response.data

        // Update form data
        formData.firstName = user.firstName
        formData.lastName = user.lastName
        formData.phone = user.phone
        formData.timezone = user.timezone || 'Asia/Tashkent'
        formData.address = user.address || { street: '', city: '' }

        if (authStore.isTeacher) {
            formData.specializations = Array.isArray(user.specializations) ?
                user.specializations :
                (user.specialization ? [user.specialization] : [])

            formData.languages = Array.isArray(user.languages) ?
                user.languages : []

            formData.education = user.education || []
            formData.certifications = user.certifications || []
            formData.lessonFee = user.lessonFee || 0
            formData.experience = user.experience || 0
            formData.bio = user.bio || ''
            formData.availability = user.availability || formData.availability
        } else {
            formData.educationalHistory = user.educationalHistory || ''
            formData.emergencyContact = user.emergencyContact || { name: '', phone: '', relationship: '' }
            educationalHistoryInput.value = user.educationalHistory || ''
        }

        // Update auth store with timezone if it changed
        if (authStore.user && authStore.user.timezone !== formData.timezone) {
            authStore.user.timezone = formData.timezone
        }
    } catch (error) {
        console.error('Error fetching user profile:', error)
    }
}

async function handleSubmit() {
    try {
        loading.value = true

        const updateData = {
            firstName: formData.firstName,
            lastName: formData.lastName,
            phone: formData.phone,
            timezone: formData.timezone,
            address: formData.address
        }

        if (authStore.isTeacher) {
            updateData.specializations = formData.specializations.filter(Boolean)
            updateData.languages = formData.languages.filter(Boolean)
            updateData.education = formData.education.filter(e => e.degree && e.institution && e.year)
            updateData.certifications = formData.certifications.filter(c => c.name && c.issuer && c.year)
            updateData.lessonFee = formData.lessonFee
            updateData.experience = formData.experience
            updateData.bio = formData.bio
            updateData.availability = formData.availability
        } else {
            updateData.educationalHistory = educationalHistoryInput.value
            updateData.emergencyContact = formData.emergencyContact
        }

        const response = await axios.patch('/api/users/me', updateData)

        // Update auth store with latest user data including timezone
        if (response.data.user) {
            authStore.user = { ...authStore.user, ...response.data.user }
            localStorage.setItem('user', JSON.stringify(authStore.user))
        }

        router.push({ name: authStore.isTeacher ? 'teacher-profile' : 'student-profile' })
    } catch (error) {
        console.error('Error updating profile:', error)
    } finally {
        loading.value = false
    }
}

onMounted(() => {
    fetchUserProfile()
    if (authStore.isTeacher) {
        fetchSpecializations()
    }
})
</script>