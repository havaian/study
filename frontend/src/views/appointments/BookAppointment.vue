<template>
    <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div v-if="loading" class="text-center py-8">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent">
            </div>
            <p class="mt-2 text-gray-600">Loading...</p>
        </div>

        <template v-else-if="teacher">
            <div class="bg-white shadow rounded-lg overflow-hidden">
                <div class="p-6">
                    <h1 class="text-2xl font-bold text-gray-900">
                        Book Appointment with Dr. {{ teacher.firstName }} {{ teacher.lastName }}
                    </h1>
                    <div class="mt-2 flex flex-wrap gap-2 justify-center sm:justify-start">
                        <span v-for="spec in teacher.specializations" :key="spec"
                            class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                            {{ spec }}
                        </span>
                    </div>

                    <form @submit.prevent="handleSubmit" class="mt-6 space-y-6">
                        <!-- Date Selection -->
                        <div>
                            <label for="date" class="label">Select Date</label>
                            <input id="date" v-model="formData.date" type="date" :min="minDate" :max="maxDate"
                                class="input mt-1" required @change="fetchAvailableSlots"
                                :class="{ 'border-red-500': validationErrors.date }" />
                            <p v-if="validationErrors.date" class="mt-1 text-sm text-red-600">
                                {{ validationErrors.date }}
                            </p>
                        </div>

                        <!-- Time Slots -->
                        <div v-if="formData.date">
                            <label class="label">Available Time Slots</label>
                            <div class="mt-2 grid grid-cols-3 gap-3">
                                <button v-for="slot in availableSlots" :key="slot.start" type="button"
                                    class="btn-secondary"
                                    :class="{ 'ring-2 ring-indigo-500': formData.time === slot.start }"
                                    @click="formData.time = slot.start">
                                    {{ formatTimeDisplay(slot.start) }}
                                </button>
                            </div>
                            <p v-if="availableSlots.length === 0" class="mt-2 text-sm text-gray-500">
                                No available slots for this date.
                            </p>
                            <p v-if="validationErrors.time" class="mt-1 text-sm text-red-600">
                                {{ validationErrors.time }}
                            </p>
                        </div>

                        <!-- Consultation Type -->
                        <div>
                            <label class="label">Consultation Type</label>
                            <div class="mt-2 grid grid-cols-3 gap-3">
                                <button v-for="type in lessonTypes" :key="type.value" type="button"
                                    class="btn-secondary" :class="{
                                        'ring-2 ring-indigo-500': formData.type === type.value,
                                        'border-red-500': validationErrors.type
                                    }" @click="formData.type = type.value">
                                    {{ type.label }}
                                </button>
                            </div>
                            <p v-if="validationErrors.type" class="mt-1 text-sm text-red-600">
                                {{ validationErrors.type }}
                            </p>
                        </div>

                        <!-- Short description -->
                        <div>
                            <label for="description" class="label">Short description</label>
                            <textarea id="description" v-model="formData.shortDescription" rows="3" class="input mt-1" required
                                :class="{ 'border-red-500': validationErrors.shortDescription }"></textarea>
                            <p v-if="validationErrors.shortDescription" class="mt-1 text-sm text-red-600">
                                {{ validationErrors.shortDescription }}
                            </p>
                        </div>

                        <!-- Fee Information -->
                        <div class="bg-gray-50 p-4 rounded-lg">
                            <h3 class="text-lg font-medium text-gray-900">Consultation Fee</h3>
                            <p class="mt-1 text-gray-600">
                                {{ formatFee() }}
                                UZS
                            </p>
                            <p class="mt-2 text-sm text-gray-500">
                                Payment will be processed securely via Stripe after booking.
                            </p>
                        </div>

                        <div>
                            <button type="submit" class="btn-primary w-full" :disabled="submitting">
                                {{ submitting ? 'Processing...' : 'Proceed to Payment' }}
                            </button>
                        </div>

                        <div v-if="error" class="text-sm text-center text-red-600">
                            {{ error }}
                        </div>
                    </form>
                </div>
            </div>
        </template>

        <div v-else class="text-center py-8">
            <p class="text-gray-600">Teacher not found.</p>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { format, addDays, parseISO, subMinutes, addMinutes, isWithinInterval } from 'date-fns'
import { usePaymentStore } from '@/stores/payment'
import axios from 'axios'

const route = useRoute()
const router = useRouter()
const paymentStore = usePaymentStore()

const teacher = ref(null)
const loading = ref(true)
const submitting = ref(false)
const error = ref('')
const availableSlots = ref([])
const validationErrors = reactive({
    date: '',
    time: '',
    type: '',
    shortDescription: ''
})

const lessonTypes = [
    { value: 'video', label: 'Video' },
    { value: 'voice', label: 'Voice' },
    { value: 'chat', label: 'Chat' }
]

const formData = reactive({
    date: '',
    time: '',
    type: 'video',
    shortDescription: ''
})

// Fixed to use UTC+5 timezone
const minDate = computed(() => {
    // Create date in UTC+5 timezone
    const now = new Date()
    const utc5Offset = 5 * 60 // UTC+5 in minutes
    const utc5Date = new Date(now.getTime() + (utc5Offset * 60 * 1000))
    return format(utc5Date, 'yyyy-MM-dd')
})

const maxDate = computed(() => {
    // Create date in UTC+5 timezone and add 30 days
    const now = new Date()
    const utc5Offset = 5 * 60 // UTC+5 in minutes
    const utc5Date = new Date(now.getTime() + (utc5Offset * 60 * 1000))
    const maxDate = addDays(utc5Date, 30)
    return format(maxDate, 'yyyy-MM-dd')
})

// Safe formatting function for currency
const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) {
        return '0'; // Return zero for undefined or null values
    }
    // Ensure amount is treated as a number
    const numAmount = Number(amount);
    // Check if it's a valid number
    if (isNaN(numAmount)) {
        console.error('Invalid fee amount:', amount);
        return '0';
    }
    return new Intl.NumberFormat('uz-UZ').format(numAmount);
}

// Function to safely format the teacher's fee
const formatFee = () => {
    if (!teacher.value) return '0';
    return formatCurrency(teacher.value.lessonFee);
}

// Keep the original format function for other date formatting needs
const formatTime = (time) => {
    return format(parseISO(time), 'h:mm a')
}

// Fixed to display UTC+5 time correctly
const formatTimeDisplay = (timeString) => {
    try {
        // Parse the time string and add 5 hours to convert to UTC+5
        const timeDate = new Date(timeString)
        const utc5Time = new Date(timeDate.getTime() + 0)

        const hours = utc5Time.getUTCHours()
        const minutes = utc5Time.getUTCMinutes()

        // Format manually to avoid timezone conversion
        const period = hours >= 12 ? 'PM' : 'AM'
        const displayHours = hours % 12 || 12 // Convert 0 to 12 for 12 AM
        const displayMinutes = minutes.toString().padStart(2, '0')

        return `${displayHours}:${displayMinutes} ${period}`
    } catch (error) {
        console.error('Error formatting time:', error)
        return timeString // Return original string if parsing fails
    }
}

const isWithinJoinWindow = (dateTime) => {
    const appointmentTime = parseISO(dateTime)
    const now = new Date()
    return isWithinInterval(now, {
        start: subMinutes(appointmentTime, 5),
        end: addMinutes(appointmentTime, 30)
    })
}

async function fetchTeacherProfile() {
    try {
        loading.value = true
        const response = await axios.get(`/api/users/teachers/${route.params.teacherId}`)
        // Assign the teacher property from the response data
        teacher.value = response.data.teacher;
    } catch (error) {
        console.error('Error fetching teacher profile:', error)
    } finally {
        loading.value = false
    }
}

async function fetchAvailableSlots() {
    try {
        const response = await axios.get(`/api/appointments/availability/${route.params.teacherId}`, {
            params: { date: formData.date }
        })
        // Process the slots - don't modify the original time strings
        availableSlots.value = response.data.availableSlots.map(slot => ({
            ...slot,
            // Keep the original UTC time string
            start: slot.start
        }))

        formData.time = '' // Reset selected time when date changes
        // Clear the time validation error when fetching new slots
        validationErrors.time = ''
    } catch (error) {
        console.error('Error fetching available slots:', error)
        availableSlots.value = []
    }
}

function validateForm() {
    // Reset all validation errors
    Object.keys(validationErrors).forEach(key => {
        validationErrors[key] = ''
    })

    let isValid = true

    if (!formData.date) {
        validationErrors.date = 'Please select a date'
        isValid = false
    }

    if (!formData.time) {
        validationErrors.time = 'Please select a time slot'
        isValid = false
    }

    if (!formData.type) {
        validationErrors.type = 'Please select a lesson type'
        isValid = false
    }

    if (!formData.shortDescription.trim()) {
        validationErrors.shortDescription = 'Please provide a short descripion'
        isValid = false
    }

    return isValid
}

// Fixed to send correct UTC+5 time to backend
async function handleSubmit() {
    if (!validateForm()) {
        return
    }

    try {
        submitting.value = true
        error.value = ''

        // Convert the selected time to proper UTC+5 format
        const selectedDateTime = formData.time

        const appointmentData = {
            teacherId: route.params.teacherId,
            dateTime: selectedDateTime, // Send adjusted time
            type: formData.type,
            shortDescription: formData.shortDescription
        }

        const response = await axios.post('/api/appointments', appointmentData)
        await paymentStore.createCheckoutSession(response.data.appointment._id)

        // Note: The redirect to Stripe should be handled by the payment store
    } catch (err) {
        console.error('Error booking appointment:', err)
        error.value = err.response?.data?.message || 'Failed to book appointment'
    } finally {
        submitting.value = false
    }
}

onMounted(() => {
    fetchTeacherProfile()
})
</script>