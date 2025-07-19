<template>
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div v-if="loading" class="text-center py-8">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent">
            </div>
            <p class="mt-2 text-gray-600">Loading teacher profile...</p>
        </div>

        <template v-else-if="teacher">
            <div class="bg-white shadow rounded-lg overflow-hidden">
                <!-- Header -->
                <div class="p-6 sm:p-8 border-b border-gray-200">
                    <div class="flex flex-col sm:flex-row items-center sm:items-start">
                        <img :src="teacher.profilePicture || '/images/default-avatar.png'" :alt="teacher.firstName"
                            class="h-32 w-32 rounded-full object-cover bg-gray-200" />
                        <div class="mt-4 sm:mt-0 sm:ml-6 text-center sm:text-left">
                            <h1 class="text-2xl font-bold text-gray-900">
                                {{ teacher.firstName }} {{ teacher.lastName }}
                            </h1>

                            <!-- Specializations as tags -->
                            <div class="mt-2 flex flex-wrap gap-2 justify-center sm:justify-start">
                                <span v-for="spec in teacher.specializations" :key="spec"
                                    class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                                    {{ spec }}
                                </span>
                            </div>

                            <div class="mt-3 flex flex-wrap gap-2 justify-center sm:justify-start">
                                <span
                                    class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                                    {{ teacher.experience }} years experience
                                </span>
                                <span v-for="lang in teacher.languages" :key="lang"
                                    class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                                    {{ lang }}
                                </span>
                                <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                    <span>{{ teacherTimezoneAbbr }}</span>
                                    <div v-if="timezoneLoading" class="ml-2 animate-spin rounded-full h-3 w-3 border border-green-600 border-t-transparent"></div>
                                </span>
                            </div>
                        </div>

                        <div v-if="hasUpcomingAppointment" class="mt-4">
                            <button @click="startChat" class="btn-secondary w-full flex items-center justify-center">
                                <svg class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                Chat with Teacher
                            </button>
                        </div>

                        <div class="mt-4 sm:mt-0 sm:ml-auto">
                            <router-link v-if="authStore.isStudent"
                                :to="{ name: 'book-appointment', params: { teacherId: teacher._id } }"
                                class="btn-primary">
                                Book Appointment
                            </router-link>
                        </div>
                    </div>
                </div>

                <!-- Details -->
                <div class="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <h2 class="text-xl font-semibold text-gray-900 mb-4">About</h2>
                        <p class="text-gray-600">{{ decodedBio }}</p>

                        <h3 class="text-lg font-semibold text-gray-900 mt-6 mb-2">Education</h3>
                        <ul class="space-y-2">
                            <li v-for="edu in teacher.education" :key="edu.degree" class="text-gray-600">
                                {{ edu.degree }} - {{ edu.institution }} ({{ edu.year }})
                            </li>
                            <li v-if="!teacher.education || teacher.education.length === 0" class="text-gray-500">
                                No education information provided.
                            </li>
                        </ul>

                        <h3 class="text-lg font-semibold text-gray-900 mt-6 mb-2">Certifications</h3>
                        <ul class="space-y-2">
                            <li v-for="cert in teacher.certifications" :key="cert.issuer" class="text-gray-600">
                                {{ cert.issuer }} - {{ cert.name }} ({{ cert.year }})
                            </li>
                            <li v-if="!teacher.certifications || teacher.certifications.length === 0"
                                class="text-gray-500">
                                No certification information provided.
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h2 class="text-xl font-semibold text-gray-900 mb-4">Lesson Details</h2>
                        <div class="space-y-4">
                            <div>
                                <h3 class="font-medium text-gray-900">Fee</h3>
                                <p class="text-gray-600">{{ formatLessonFee }}</p>
                            </div>

                            <div>
                                <h3 class="font-medium text-gray-900">Teacher's Timezone</h3>
                                <div class="flex items-center space-x-2">
                                    <span class="text-gray-600">{{ teacherTimezoneDisplay }}</span>
                                    <div v-if="timezoneLoading" class="animate-spin rounded-full h-4 w-4 border-2 border-indigo-600 border-t-transparent"></div>
                                </div>
                                <p v-if="teacherCurrentTime" class="text-xs text-gray-500 mt-1">
                                    Teacher's current time: {{ teacherCurrentTime }}
                                </p>
                            </div>

                            <div>
                                <h3 class="font-medium text-gray-900">Available Days</h3>
                                <p class="text-sm text-gray-500 mb-2">
                                    Times shown in teacher's timezone
                                </p>
                                <ul class="mt-2 space-y-2">
                                    <li v-for="day in availableDays" :key="day.dayOfWeek" class="text-gray-600">
                                        {{ formatDay(day.dayOfWeek) }}: {{ day.startTime }} - {{ day.endTime }}
                                    </li>
                                    <li v-if="availableDays.length === 0" class="text-gray-500">
                                        No availability information provided.
                                    </li>
                                </ul>
                            </div>

                            <div>
                                <h3 class="font-medium text-gray-900">Location</h3>
                                <p class="text-gray-600">{{ formattedAddress }}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Reviews Section - Only show if reviews exist or review system is working -->
                <div v-if="reviewsLoaded" class="p-6 sm:p-8 border-t border-gray-200">
                    <h2 class="text-xl font-semibold text-gray-900 mb-4">Student Reviews</h2>
                    
                    <!-- No reviews yet -->
                    <div v-if="reviews.length === 0" class="text-center py-8">
                        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <h3 class="mt-2 text-sm font-medium text-gray-900">No reviews yet</h3>
                        <p class="mt-1 text-sm text-gray-500">Be the first to leave a review for this teacher!</p>
                    </div>
                    
                    <!-- Reviews list -->
                    <div v-else class="space-y-6">
                        <div v-for="review in reviews" :key="review._id"
                            class="border-b border-gray-200 pb-6 last:border-0">
                            <div class="flex items-start">
                                <div class="flex-1">
                                    <div class="flex items-center">
                                        <div class="flex">
                                            <span v-for="i in 5" :key="i"
                                                :class="i <= review.rating ? 'text-yellow-400' : 'text-gray-300'"
                                                class="text-lg">★</span>
                                        </div>
                                        <span class="ml-2 text-sm text-gray-600">{{ review.rating }}/5</span>
                                    </div>
                                    <p class="mt-1 text-gray-900">{{ review.comment }}</p>
                                    <p class="mt-1 text-sm text-gray-500">
                                        {{ review.student?.firstName }} {{ review.student?.lastName }} •
                                        {{ formatDate(review.createdAt) }}
                                    </p>
                                </div>
                            </div>
                            <div v-if="review.teacherResponse" class="mt-4 ml-6 p-4 bg-gray-50 rounded-lg">
                                <p class="text-sm text-gray-900">
                                    <span class="font-medium">Teacher's response:</span>
                                    {{ review.teacherResponse.text }}
                                </p>
                                <p class="mt-1 text-xs text-gray-500">
                                    {{ formatDate(review.teacherResponse.respondedAt) }}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </template>

        <div v-else class="text-center py-8">
            <p class="text-gray-600">Teacher not found.</p>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { format } from 'date-fns'
import axios from 'axios'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const teacher = ref(null)
const reviews = ref([])
const loading = ref(true)
const reviewsLoaded = ref(false)
const hasUpcomingAppointment = ref(false)
const teacherTimezoneInfo = ref(null)
const timezoneLoading = ref(false)

const availableDays = computed(() => {
    if (!teacher.value?.availability) return []
    return teacher.value.availability.filter(day => day.isAvailable)
})

const teacherTimezoneDisplay = computed(() => {
    if (!teacher.value?.timezone) return 'Asia/Tashkent (UTC+5) - Uzbekistan'
    if (teacherTimezoneInfo.value) {
        return teacherTimezoneInfo.value.label
    }
    return `${teacher.value.timezone} (Loading...)`
})

const teacherTimezoneAbbr = computed(() => {
    if (!teacherTimezoneInfo.value) return 'UTC+5'
    
    const offset = teacherTimezoneInfo.value.offset
    const sign = offset >= 0 ? '+' : ''
    const hours = Math.floor(Math.abs(offset))
    const minutes = Math.abs(offset) % 1 === 0.5 ? ':30' : (Math.abs(offset) % 1 === 0.75 ? ':45' : '')
    
    return `UTC${sign}${offset === 0 ? '0' : offset > 0 ? hours + minutes : '-' + hours + minutes}`
})

const teacherCurrentTime = computed(() => {
    if (!teacherTimezoneInfo.value?.currentTime) return null
    return format(new Date(teacherTimezoneInfo.value.currentTime), 'MMM d, h:mm a')
})

// Computed property for decoded bio
const decodedBio = computed(() => {
    if (!teacher.value?.bio) return 'No bio provided.'

    // Create a temporary DOM element to decode HTML entities
    const textarea = document.createElement('textarea')
    textarea.innerHTML = teacher.value.bio
    return textarea.value
})

// Computed property for formatted lesson fee
const formatLessonFee = computed(() => {
    const fee = teacher.value?.lessonFee

    if (!fee) return 'Lesson fee not specified'

    // If fee is an object with amount property
    if (typeof fee === 'object' && fee !== null && 'amount' in fee) {
        return `${new Intl.NumberFormat('uz-UZ').format(fee.amount)} ${fee.currency || 'UZS'}`
    }
    // If it's just a number
    else if (typeof fee === 'number') {
        return `${new Intl.NumberFormat('uz-UZ').format(fee)} UZS`
    }

    return 'Lesson fee not specified'
})

// Computed property for formatted address
const formattedAddress = computed(() => {
    const address = teacher.value?.address

    if (!address) return 'Address not provided'

    const parts = []
    if (address.street) parts.push(address.street)
    if (address.city) parts.push(address.city)
    if (address.state) parts.push(address.state)
    if (address.zipCode) parts.push(address.zipCode)
    if (address.country) parts.push(address.country)

    return parts.length > 0 ? parts.join(', ') : 'Address not provided'
})

const formatDay = (dayOfWeek) => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    return days[dayOfWeek - 1]
}

const formatDate = (date) => {
    if (!date) return ''
    return format(new Date(date), 'MMM d, yyyy')
}

async function fetchTimezoneInfo(timezone) {
    if (!timezone) return
    
    try {
        timezoneLoading.value = true
        const response = await axios.get(`/api/timezones/info/${encodeURIComponent(timezone)}`)
        if (response.data.success) {
            teacherTimezoneInfo.value = response.data.timezone
        }
    } catch (error) {
        console.error('Error fetching timezone info:', error)
        teacherTimezoneInfo.value = null
    } finally {
        timezoneLoading.value = false
    }
}

async function fetchTeacherProfile() {
    try {
        loading.value = true
        const response = await axios.get(`/api/users/teachers/${route.params.id}`)
        teacher.value = response.data.teacher

        // Fetch timezone info after teacher data is loaded
        if (teacher.value?.timezone) {
            await fetchTimezoneInfo(teacher.value.timezone)
        }

        // After teacher is loaded, check appointments and fetch reviews
        await Promise.all([
            checkUpcomingAppointments(),
            fetchReviews()
        ])
    } catch (error) {
        console.error('Error fetching teacher profile:', error)
    } finally {
        loading.value = false
    }
}

async function fetchReviews() {
    try {
        const reviewsResponse = await axios.get(`/api/reviews/teacher/${route.params.id}`)
        reviews.value = reviewsResponse.data.reviews || []
        reviewsLoaded.value = true
    } catch (reviewError) {
        console.error('Error fetching reviews:', reviewError)
        // Only show reviews section if the endpoint exists (not 404)
        if (reviewError.response?.status === 404) {
            reviewsLoaded.value = false // Don't show reviews section at all
        } else {
            reviewsLoaded.value = true // Show section but with empty reviews
            reviews.value = []
        }
    }
}

async function checkUpcomingAppointments() {
    // Check if user is authenticated and teacher is loaded
    if (!authStore.isAuthenticated || !authStore.isStudent || !teacher.value?._id) {
        return
    }

    try {
        const response = await axios.get(`/api/appointments/student/${authStore.user._id}`, {
            params: { 
                status: 'scheduled', 
                teacher: teacher.value._id  // Use teacher filter instead of teacherId
            }
        })
        hasUpcomingAppointment.value = response.data.appointments.length > 0
    } catch (error) {
        console.error('Error checking appointments:', error)
    }
}

async function startChat() {
    if (!teacher.value?._id) {
        console.error('Teacher not loaded')
        return
    }

    try {
        const response = await axios.post('/api/chat/conversations', {
            participantId: teacher.value._id
        })

        router.push({
            name: 'chat-conversation',
            params: { id: response.data.conversation._id }
        })
    } catch (error) {
        console.error('Error starting chat:', error)
    }
}

onMounted(() => {
    fetchTeacherProfile()
})
</script>