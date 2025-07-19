<template>
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 class="text-2xl font-bold text-gray-900 mb-8">My Schedule</h1>

        <!-- Tab Navigation -->
        <div class="border-b border-gray-200 mb-8">
            <nav class="-mb-px flex space-x-8">
                <button @click="activeTab = 'pending'" :class="[
                    'py-2 px-1 border-b-2 font-medium text-sm',
                    activeTab === 'pending'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                ]">
                    Pending Confirmations
                    <span v-if="pendingCount > 0" class="ml-2 bg-red-100 text-red-600 py-0.5 px-2 rounded-full text-xs">
                        {{ pendingCount }}
                    </span>
                </button>
                <button @click="activeTab = 'scheduled'" :class="[
                    'py-2 px-1 border-b-2 font-medium text-sm',
                    activeTab === 'scheduled'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                ]">
                    Scheduled Appointments
                </button>
            </nav>
        </div>

        <!-- Pending Confirmations Tab -->
        <div v-if="activeTab === 'pending'">
            <PendingConfirmations @appointment-confirmed="refreshPendingCount" />
        </div>

        <!-- Scheduled Appointments Tab -->
        <div v-if="activeTab === 'scheduled'">
            <!-- Filters -->
            <div class="bg-white shadow rounded-lg p-6 mb-8">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label for="date" class="label">Date</label>
                        <input id="date" v-model="filters.date" type="date" class="input mt-1"
                            @change="fetchAppointments" />
                    </div>
                    <div>
                        <label for="status" class="label">Status</label>
                        <select id="status" v-model="filters.status" class="input mt-1" @change="fetchAppointments">
                            <option value="">All Status</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="completed">Completed</option>
                            <option value="canceled">Canceled</option>
                            <option value="no-show">No Show</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- Appointments List -->
            <div class="space-y-6">
                <div v-if="loading" class="text-center py-8">
                    <div
                        class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent">
                    </div>
                    <p class="mt-2 text-gray-600">Loading appointments...</p>
                </div>

                <template v-else>
                    <div v-if="appointments.length === 0" class="text-center py-8">
                        <p class="text-gray-600">No appointments found.</p>
                    </div>

                    <div v-else class="space-y-4">
                        <div v-for="appointment in appointments" :key="appointment._id"
                            class="bg-white shadow rounded-lg overflow-hidden">
                            <div class="p-6">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center space-x-4">
                                        <div class="flex-shrink-0">
                                            <img v-if="appointment.student.profilePicture"
                                                :src="appointment.student.profilePicture"
                                                :alt="`${appointment.student.firstName} ${appointment.student.lastName}`"
                                                class="h-12 w-12 rounded-full object-cover" />
                                            <div v-else
                                                class="h-12 w-12 rounded-full bg-gray-300 flex items-center justify-center">
                                                <span class="text-sm font-medium text-gray-700">
                                                    {{ appointment.student.firstName.charAt(0) }}{{
                                                        appointment.student.lastName.charAt(0) }}
                                                </span>
                                            </div>
                                        </div>
                                        <div>
                                            <h3 class="text-lg font-semibold text-gray-900">
                                                {{ appointment.student.firstName }} {{ appointment.student.lastName }}
                                            </h3>
                                            <p class="text-sm text-gray-500">
                                                Age: {{ calculateAge(appointment.student.dateOfBirth) }} years
                                            </p>
                                        </div>
                                    </div>
                                    <div class="text-right">
                                        <span
                                            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                                            :class="getStatusClass(appointment.status)">
                                            {{ appointment.status.charAt(0).toUpperCase() +
                                                appointment.status.slice(1).replace('-', ' ') }}
                                        </span>
                                    </div>
                                </div>

                                <div class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <p class="text-sm text-gray-500">Date & Time</p>
                                        <p class="text-gray-900 font-medium">{{ formatTimeDisplay(appointment.dateTime) }}
                                        </p>
                                        <p class="text-xs text-gray-500">{{ userTimezone }}</p>
                                    </div>
                                    <div>
                                        <p class="text-sm text-gray-500">Lesson Type</p>
                                        <p class="text-gray-900">{{ appointment.type.charAt(0).toUpperCase() +
                                            appointment.type.slice(1) }}</p>
                                    </div>
                                    <div class="md:col-span-2">
                                        <p class="text-sm text-gray-500">Short description</p>
                                        <p class="text-gray-900">{{ appointment.shortDescription }}</p>
                                    </div>
                                </div>

                                <div class="mt-6 flex justify-end space-x-4">
                                    <router-link :to="{ name: 'appointment-details', params: { id: appointment._id } }"
                                        class="btn-secondary">
                                        View Details
                                    </router-link>
                                    <button v-if="appointment.status === 'scheduled'"
                                        class="btn-secondary text-red-600 hover:text-red-700"
                                        @click="markAsNoShow(appointment._id)">
                                        Mark as No-Show
                                    </button>
                                    <button
                                        v-if="appointment.status === 'scheduled' && isWithinJoinWindow(appointment.dateTime)"
                                        class="btn-primary" @click="joinLesson(appointment._id)">
                                        Start Lesson
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Pagination -->
                    <div v-if="totalPages > 1" class="flex justify-center space-x-2 mt-8">
                        <button v-for="page in totalPages" :key="page" class="btn-secondary"
                            :class="{ 'bg-indigo-600 text-white': currentPage === page }"
                            @click="handlePageChange(page)">
                            {{ page }}
                        </button>
                    </div>
                </template>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { parseISO, differenceInYears, isWithinInterval, subMinutes, addMinutes } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import axios from 'axios'
import PendingConfirmations from '@/components/appointments/PendingConfirmations.vue'

const router = useRouter()
const authStore = useAuthStore()

// Reactive data
const activeTab = ref('pending') // Start with pending tab to highlight urgent items
const appointments = ref([])
const loading = ref(false)
const currentPage = ref(1)
const totalPages = ref(1)
const pendingCount = ref(0)
const filters = reactive({
    date: formatInTimeZone(new Date(), authStore.user?.timezone || 'Asia/Tashkent', 'yyyy-MM-dd'),
    status: ''
})

// Get user's timezone
const userTimezone = computed(() => {
    return authStore.user?.timezone || 'Asia/Tashkent'
})

// Utility functions
const formatTimeDisplay = (utcTimeString) => {
    try {
        const utcDate = new Date(utcTimeString)
        
        // If we have timezone info from store, use it to convert time
        if (authStore.timezoneInfo) {
            const userOffset = authStore.timezoneInfo.offset || 0
            const localHour = (utcDate.getUTCHours() + userOffset + 24) % 24
            const localMinute = utcDate.getUTCMinutes()
            
            const period = localHour >= 12 ? 'PM' : 'AM'
            const displayHours = localHour % 12 || 12
            const displayMinutes = localMinute.toString().padStart(2, '0')
            
            return `${displayHours}:${displayMinutes} ${period}`
        }
        
        // Fallback to standard formatting
        return format(parseISO(utcTimeString), 'h:mm a')
    } catch (error) {
        console.error('Error formatting time:', error)
        return utcTimeString
    }
}

const calculateAge = (dateOfBirth) => {
    return differenceInYears(new Date(), parseISO(dateOfBirth))
}

const isWithinJoinWindow = (dateTime) => {
    const appointmentTime = parseISO(dateTime)
    const now = new Date()
    return isWithinInterval(now, {
        start: subMinutes(appointmentTime, 5),
        end: addMinutes(appointmentTime, 30)
    })
}

const getStatusClass = (status) => {
    const classes = {
        'scheduled': 'bg-blue-100 text-blue-800',
        'completed': 'bg-green-100 text-green-800',
        'canceled': 'bg-red-100 text-red-800',
        'no-show': 'bg-gray-100 text-gray-800',
        'pending-teacher-confirmation': 'bg-yellow-100 text-yellow-800'
    }
    return classes[status] || 'bg-gray-100 text-gray-800'
}

// API functions
async function fetchAppointments() {
    try {
        loading.value = true
        const params = {
            page: currentPage.value,
            limit: 10,
            ...filters
        }

        const response = await axios.get(`/api/appointments/teacher/${authStore.user._id}`, { params })
        appointments.value = response.data.appointments
        totalPages.value = Math.ceil(response.data.pagination.total / response.data.pagination.limit)

        // Ensure timezone info is loaded from store
        if (!authStore.timezoneInfo && authStore.user?.timezone) {
            await authStore.fetchUserTimezoneInfo()
        }
    } catch (error) {
        console.error('Error fetching appointments:', error)
    } finally {
        loading.value = false
    }
}

async function fetchPendingCount() {
    try {
        const response = await axios.get(`/api/appointments/pending-confirmation/teacher/${authStore.user._id}`, {
            params: { limit: 1 } // Just get count, not all data
        })
        pendingCount.value = response.data.pagination.total
    } catch (error) {
        console.error('Error fetching pending count:', error)
        pendingCount.value = 0
    }
}

async function markAsNoShow(appointmentId) {
    if (!confirm('Are you sure you want to mark this appointment as no-show?')) return

    try {
        await axios.patch(`/api/appointments/${appointmentId}/status`, {
            status: 'no-show'
        })
        await fetchAppointments()
    } catch (error) {
        console.error('Error updating appointment status:', error)
    }
}

async function joinLesson(appointmentId) {
    try {
        const response = await axios.get(`/api/lessons/${appointmentId}/join`)
        if (response.data.lesson) {
            router.push({
                name: 'lesson-room',
                params: { appointmentId }
            })
        }
    } catch (error) {
        console.error('Error joining lesson:', error)
    }
}

function handlePageChange(page) {
    currentPage.value = page
    fetchAppointments()
}

function refreshPendingCount() {
    fetchPendingCount()
    // If we're on the pending tab and an appointment was confirmed, 
    // we might want to refresh that view too
}

// Lifecycle
onMounted(() => {
    fetchPendingCount()
    if (activeTab.value === 'scheduled') {
        fetchAppointments()
    }

    // Set up interval to refresh pending count
    const refreshInterval = setInterval(() => {
        fetchPendingCount()
    }, 60000) // Refresh every minute

    // Clean up interval
    onBeforeUnmount(() => {
        clearInterval(refreshInterval)
    })
})

// Watch for tab changes
watch(activeTab, (newTab) => {
    if (newTab === 'scheduled') {
        fetchAppointments()
    }
})
</script>