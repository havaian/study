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

                    <!-- Doctor-specific fields -->
                    <template v-if="authStore.isDoctor">
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
                                            <option v-for="spec in availableSpecializations" :key="spec" :value="spec">{{ spec }}
                                            </option>
                                        </select>
                                        <button type="button" @click="removeSpecialization(index)"
                                            class="px-2 py-1 text-red-600 hover:text-red-800">
                                            Remove
                                        </button>
                                    </div>
                                    <button type="button" @click="addSpecialization"
                                        class="text-sm text-indigo-600 hover:text-indigo-800">
                                        + Add Another Specialization
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
                                        class="text-sm text-indigo-600 hover:text-indigo-800">
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
                                        class="text-sm text-indigo-600 hover:text-indigo-800">
                                        + Add Certification
                                    </button>
                                </div>
                            </div>

                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label for="consultationFee" class="label">Consultation Fee (UZS)</label>
                                    <input id="consultationFee" v-model.number="formData.consultationFee" type="number"
                                        min="0" class="input mt-1" required />
                                </div>
                                <div>
                                    <label for="experience" class="label">Years of Experience</label>
                                    <input id="experience" v-model.number="formData.experience" type="number" min="0"
                                        class="input mt-1" required />
                                </div>
                            </div>

                            <div class="mt-4">
                                <label for="languages" class="label">Languages</label>
                                <input id="languages" v-model="languagesInput" type="text" class="input mt-1"
                                    placeholder="English, Russian, Uzbek (comma separated)" />
                            </div>

                            <div class="mt-4">
                                <label for="bio" class="label">Bio</label>
                                <textarea id="bio" v-model="formData.bio" rows="4" class="input mt-1"></textarea>
                            </div>

                            <!-- Availability -->
                            <div class="mt-4">
                                <label class="label">Availability</label>
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
                                    </div>
                                </div>
                            </div>
                        </div>
                    </template>

                    <!-- Patient-specific fields -->
                    <template v-else>
                        <div>
                            <h2 class="text-lg font-medium text-gray-900 mb-4">Medical Information</h2>
                            <div class="space-y-4">
                                <div>
                                    <label for="allergies" class="label">Allergies</label>
                                    <input id="allergies" v-model="allergiesInput" type="text" class="input mt-1"
                                        placeholder="Separate with commas" />
                                </div>
                                <div>
                                    <label for="chronicConditions" class="label">Chronic Conditions</label>
                                    <input id="chronicConditions" v-model="conditionsInput" type="text"
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
                        <router-link :to="{ name: authStore.isDoctor ? 'doctor-profile' : 'patient-profile' }"
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
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import axios from 'axios'

const router = useRouter()
const authStore = useAuthStore()
const loading = ref(false)

// Replace the hardcoded specializations with a ref to be filled from API
const availableSpecializations = ref([])

const formData = reactive({
    firstName: '',
    lastName: '',
    phone: '',
    address: {
        street: '',
        city: ''
    },
    specializations: [],
    education: [],
    certifications: [],
    consultationFee: 0,
    experience: 0,
    languages: [],
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
    medicalHistory: {
        allergies: [],
        chronicConditions: []
    },
    emergencyContact: {
        name: '',
        phone: '',
        relationship: ''
    }
})

const languagesInput = ref('')
const allergiesInput = ref('')
const conditionsInput = ref('')

// Helper functions for arrays
const addSpecialization = () => {
    formData.specializations.push('')
}

const removeSpecialization = (index) => {
    formData.specializations.splice(index, 1)
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

// Added function to fetch specializations from the API
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

async function fetchUserProfile() {
    try {
        const response = await axios.get('/api/users/me')
        const user = response.data.user

        // Update form data
        formData.firstName = user.firstName
        formData.lastName = user.lastName
        formData.phone = user.phone
        formData.address = user.address || { street: '', city: '' }

        if (authStore.isDoctor) {
            // Handle specializations properly as an array
            formData.specializations = Array.isArray(user.specializations) ? 
                user.specializations : 
                (user.specialization ? [user.specialization] : [])
                
            formData.education = user.education || []
            formData.certifications = user.certifications || []
            formData.consultationFee = user.consultationFee || 0
            formData.experience = user.experience || 0
            formData.languages = user.languages || []
            formData.bio = user.bio || ''
            formData.availability = user.availability || formData.availability

            // Update input fields
            languagesInput.value = user.languages?.join(', ') || ''
        } else {
            formData.medicalHistory = user.medicalHistory || { allergies: [], chronicConditions: [] }
            formData.emergencyContact = user.emergencyContact || { name: '', phone: '', relationship: '' }

            // Update input fields
            allergiesInput.value = user.medicalHistory?.allergies?.join(', ') || ''
            conditionsInput.value = user.medicalHistory?.chronicConditions?.join(', ') || ''
        }
    } catch (error) {
        console.error('Error fetching user profile:', error)
    }
}

async function handleSubmit() {
    try {
        loading.value = true

        // Prepare update data
        const updateData = {
            firstName: formData.firstName,
            lastName: formData.lastName,
            phone: formData.phone,
            address: formData.address
        }

        if (authStore.isDoctor) {
            // Ensure specializations is an array of non-empty strings
            updateData.specializations = formData.specializations.filter(Boolean)
            updateData.education = formData.education.filter(e => e.degree && e.institution && e.year)
            updateData.certifications = formData.certifications.filter(c => c.name && c.issuer && c.year)
            updateData.consultationFee = formData.consultationFee
            updateData.experience = formData.experience
            updateData.languages = languagesInput.value.split(',').map(lang => lang.trim()).filter(Boolean)
            updateData.bio = formData.bio
            updateData.availability = formData.availability
        } else {
            updateData.medicalHistory = {
                allergies: allergiesInput.value.split(',').map(item => item.trim()).filter(Boolean),
                chronicConditions: conditionsInput.value.split(',').map(item => item.trim()).filter(Boolean)
            }
            updateData.emergencyContact = formData.emergencyContact
        }

        await axios.patch('/api/users/me', updateData)
        router.push({ name: authStore.isDoctor ? 'doctor-profile' : 'patient-profile' })
    } catch (error) {
        console.error('Error updating profile:', error)
    } finally {
        loading.value = false
    }
}

onMounted(() => {
    fetchUserProfile()
    // Fetch specializations if user is a doctor
    if (authStore.isDoctor) {
        fetchSpecializations()
    }
})
</script>