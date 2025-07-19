<template>
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="flex justify-between items-center mb-8">
            <h1 class="text-2xl font-bold text-gray-900">Pending Confirmations</h1>
            <div class="text-sm text-gray-500">
                {{ pendingCount }} appointment{{ pendingCount !== 1 ? 's' : '' }} awaiting confirmation
            </div>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="text-center py-8">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent">
            </div>
            <p class="mt-2 text-gray-600">Loading pending confirmations...</p>
        </div>

        <!-- Empty State -->
        <div v-else-if="!loading && appointments.length === 0" class="text-center py-12">
            <div class="mx-auto h-12 w-12 text-gray-400">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
            </div>
            <h3 class="mt-2 text-sm font-medium text-gray-900">No pending confirmations</h3>
            <p class="mt-1 text-sm text-gray-500">All appointments have been processed.</p>
        </div>

        <!-- Appointments List -->
        <div v-else class="space-y-6">
            <div v-for="appointment in appointments" :key="appointment._id"
                class="bg-white shadow rounded-lg overflow-hidden"
                :class="getUrgencyBorderClass(appointment.timeRemaining)">
                <div class="p-6">
                    <!-- Header with urgency indicator -->
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center space-x-3">
                            <div class="flex-shrink-0">
                                <img v-if="appointment.student.profilePicture" :src="appointment.student.profilePicture"
                                    :alt="`${appointment.student.firstName} ${appointment.student.lastName}`"
                                    class="h-10 w-10 rounded-full object-cover" />
                                <div v-else class="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
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

                        <!-- Urgency Badge -->
                        <div class="flex flex-col items-end">
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                                :class="getUrgencyBadgeClass(appointment.timeRemaining)">
                                {{ getUrgencyText(appointment.timeRemaining) }}
                            </span>
                            <span class="text-xs text-gray-500 mt-1">
                                {{ formatTimeRemaining(appointment.timeRemaining) }} left
                            </span>
                        </div>
                    </div>

                    <!-- Appointment Details -->
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div>
                            <p class="text-sm text-gray-500">Appointment Date & Time</p>
                            <p class="text-gray-900 font-medium">{{ formatDateTime(appointment.dateTime) }}</p>
                        </div>
                        <div>
                            <p class="text-sm text-gray-500">Duration</p>
                            <p class="text-gray-900">{{ appointment.duration || 30 }} minutes</p>
                        </div>
                        <div>
                            <p class="text-sm text-gray-500">Lesson Type</p>
                            <p class="text-gray-900">
                                {{ appointment.type.charAt(0).toUpperCase() + appointment.type.slice(1) }}
                            </p>
                        </div>
                        <div>
                            <p class="text-sm text-gray-500">Payment Status</p>
                            <span
                                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Paid
                            </span>
                        </div>
                    </div>

                    <!-- Short description -->
                    <div class="mb-6">
                        <p class="text-sm text-gray-500 mb-2">Short description</p>
                        <p class="text-gray-900 bg-gray-50 p-3 rounded-md">{{ appointment.shortDescription }}</p>
                    </div>

                    <!-- Student Contact Info -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-md">
                        <div v-if="appointment.student.email">
                            <p class="text-sm text-gray-500">Email</p>
                            <p class="text-gray-900">{{ appointment.student.email }}</p>
                        </div>
                        <div v-if="appointment.student.phone">
                            <p class="text-sm text-gray-500">Phone</p>
                            <p class="text-gray-900">{{ appointment.student.phone }}</p>
                        </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="flex justify-end space-x-4">
                        <button @click="showRejectModal(appointment)"
                            :disabled="processingAppointments.has(appointment._id)"
                            class="px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                            <span v-if="processingAppointments.has(appointment._id)" class="flex items-center">
                                <div
                                    class="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-red-700 border-t-transparent rounded-full">
                                </div>
                                Processing...
                            </span>
                            <span v-else>Reject</span>
                        </button>

                        <button @click="confirmAppointment(appointment)"
                            :disabled="processingAppointments.has(appointment._id)"
                            class="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                            <span v-if="processingAppointments.has(appointment._id)" class="flex items-center">
                                <div
                                    class="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full">
                                </div>
                                Confirming...
                            </span>
                            <span v-else>Confirm Appointment</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="flex justify-center space-x-2 mt-8">
            <button v-for="page in totalPages" :key="page" @click="handlePageChange(page)"
                class="px-3 py-2 border rounded-md"
                :class="currentPage === page ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'">
                {{ page }}
            </button>
        </div>

        <!-- Reject Confirmation Modal -->
        <div v-if="showRejectModalFlag"
            class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div class="mt-3">
                    <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                        <svg class="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </div>
                    <div class="mt-5 text-center">
                        <h3 class="text-lg leading-6 font-medium text-gray-900">Reject Appointment</h3>
                        <div class="mt-2">
                            <p class="text-sm text-gray-500">
                                Are you sure you want to reject this appointment? This action cannot be undone and the
                                student will be notified.
                            </p>
                        </div>
                        <div class="mt-4">
                            <textarea v-model="rejectionReason" placeholder="Optional: Provide a short descriptionrejection"
                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                rows="3"></textarea>
                        </div>
                    </div>
                </div>
                <div class="flex justify-end space-x-3 mt-5">
                    <button @click="closeRejectModal"
                        class="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400">
                        Cancel
                    </button>
                    <button @click="rejectAppointment" :disabled="processingRejection"
                        class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50">
                        <span v-if="processingRejection">Rejecting...</span>
                        <span v-else>Reject Appointment</span>
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, onBeforeUnmount } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { format, parseISO, differenceInYears } from 'date-fns'
import axios from 'axios'

const authStore = useAuthStore()

// Reactive data
const appointments = ref([])
const loading = ref(false)
const currentPage = ref(1)
const totalPages = ref(1)
const processingAppointments = ref(new Set())
const showRejectModalFlag = ref(false)
const selectedAppointment = ref(null)
const rejectionReason = ref('')
const processingRejection = ref(false)

// Computed properties
const pendingCount = computed(() => appointments.value.length)

// Utility functions
const formatDateTime = (dateTime) => {
    try {
        const utcDate = new Date(dateTime)
        
        // If we have timezone info from store, use it to convert time
        if (authStore.timezoneInfo) {
            const userOffset = authStore.timezoneInfo.offset || 0
            const localHour = (utcDate.getUTCHours() + userOffset + 24) % 24
            const localMinute = utcDate.getUTCMinutes()
            
            const period = localHour >= 12 ? 'PM' : 'AM'
            const displayHours = localHour % 12 || 12
            const displayMinutes = localMinute.toString().padStart(2, '0')
            
            const day = format(parseISO(dateTime), 'MMM d, yyyy')
            return `${day} ${displayHours}:${displayMinutes} ${period}`
        }
        
        // Fallback to standard formatting
        return format(parseISO(dateTime), 'MMM d, yyyy h:mm a')
    } catch (error) {
        console.error('Error formatting time:', error)
        return dateTime
    }
}

const calculateAge = (dateOfBirth) => {
    return differenceInYears(new Date(), parseISO(dateOfBirth))
}

const formatTimeRemaining = (timeRemaining) => {
    if (!timeRemaining) return 'Unknown'
    const { hours, minutes } = timeRemaining
    if (hours > 0) {
        return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
}

const getUrgencyText = (timeRemaining) => {
    if (!timeRemaining) return 'Unknown'
    const totalMinutes = timeRemaining.hours * 60 + timeRemaining.minutes

    if (totalMinutes <= 60) return 'URGENT'
    if (totalMinutes <= 180) return 'HIGH'
    if (totalMinutes <= 360) return 'MEDIUM'
    return 'LOW'
}

const getUrgencyBorderClass = (timeRemaining) => {
    if (!timeRemaining) return 'border-gray-300'
    const totalMinutes = timeRemaining.hours * 60 + timeRemaining.minutes

    if (totalMinutes <= 60) return 'border-red-500'
    if (totalMinutes <= 180) return 'border-orange-500'
    if (totalMinutes <= 360) return 'border-yellow-500'
    return 'border-green-500'
}

const getUrgencyBadgeClass = (timeRemaining) => {
    if (!timeRemaining) return 'bg-gray-100 text-gray-800'
    const totalMinutes = timeRemaining.hours * 60 + timeRemaining.minutes

    if (totalMinutes <= 60) return 'bg-red-100 text-red-800'
    if (totalMinutes <= 180) return 'bg-orange-100 text-orange-800'
    if (totalMinutes <= 360) return 'bg-yellow-100 text-yellow-800'
    return 'bg-green-100 text-green-800'
}

// API functions
async function fetchPendingConfirmations() {
    try {
        loading.value = true
        const params = {
            page: currentPage.value,
            limit: 10
        }

        const response = await axios.get(`/api/appointments/pending-confirmation/teacher/${authStore.user._id}`, { params })
        appointments.value = response.data.appointments
        totalPages.value = Math.ceil(response.data.pagination.total / response.data.pagination.limit)
    } catch (error) {
        console.error('Error fetching pending confirmations:', error)
        // Show user-friendly error message
        alert('Failed to load pending confirmations. Please refresh the page.')
    } finally {
        loading.value = false
    }
}

async function confirmAppointment(appointment) {
    if (!confirm(`Confirm appointment with ${appointment.student.firstName} ${appointment.student.lastName}?`)) {
        return
    }

    try {
        processingAppointments.value.add(appointment._id)

        await axios.post(`/api/appointments/${appointment._id}/confirm`)

        // Remove from list after successful confirmation
        appointments.value = appointments.value.filter(app => app._id !== appointment._id)

        // Show success message
        alert('Appointment confirmed successfully! The student has been notified.')

    } catch (error) {
        console.error('Error confirming appointment:', error)

        // Handle specific error cases
        if (error.response?.status === 400 && error.response.data?.message?.includes('deadline')) {
            alert('This appointment confirmation has expired and has been automatically canceled.')
            // Remove from list since it's been canceled
            appointments.value = appointments.value.filter(app => app._id !== appointment._id)
        } else {
            alert('Failed to confirm appointment. Please try again.')
        }
    } finally {
        processingAppointments.value.delete(appointment._id)
    }
}

function showRejectModal(appointment) {
    selectedAppointment.value = appointment
    showRejectModalFlag.value = true
    rejectionReason.value = ''
}

function closeRejectModal() {
    showRejectModalFlag.value = false
    selectedAppointment.value = null
    rejectionReason.value = ''
}

async function rejectAppointment() {
    if (!selectedAppointment.value) return

    try {
        processingRejection.value = true

        // Use the updateAppointmentStatus endpoint to cancel the appointment
        await axios.patch(`/api/appointments/${selectedAppointment.value._id}/status`, {
            status: 'canceled',
            cancellationReason: rejectionReason.value || 'Rejected by teacher'
        })

        // Remove from list after successful rejection
        appointments.value = appointments.value.filter(app => app._id !== selectedAppointment.value._id)

        closeRejectModal()
        alert('Appointment rejected successfully. The student has been notified and refunded.')

    } catch (error) {
        console.error('Error rejecting appointment:', error)
        alert('Failed to reject appointment. Please try again.')
    } finally {
        processingRejection.value = false
    }
}

function handlePageChange(page) {
    currentPage.value = page
    fetchPendingConfirmations()
}

// Lifecycle
onMounted(async () => {
    if (!authStore.timezoneInfo && authStore.user?.timezone) {
        await authStore.fetchUserTimezoneInfo()
    }

    fetchPendingConfirmations()

    // Auto-refresh every 2 minutes to keep data current
    const refreshInterval = setInterval(() => {
        fetchPendingConfirmations()
    }, 120000) // 2 minutes

    // Clean up interval on component unmount
    onBeforeUnmount(() => {
        clearInterval(refreshInterval)
    })
})
</script>