<template>
    <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div v-if="loading" class="text-center py-8">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent">
            </div>
            <p class="mt-2 text-gray-600">Loading...</p>
        </div>

        <template v-else-if="doctor">
            <div class="bg-white shadow rounded-lg overflow-hidden">
                <div class="p-6">
                    <h1 class="text-2xl font-bold text-gray-900">
                        Book Appointment with Dr. {{ doctor.firstName }} {{ doctor.lastName }}
                    </h1>
                    <div class="mt-2 flex flex-wrap gap-2 justify-center sm:justify-start">
                        <span v-for="spec in doctor.specializations" :key="spec"
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
                                <button v-for="type in consultationTypes" :key="type.value" type="button"
                                    class="btn-secondary"
                                    :class="{ 
                                        'ring-2 ring-indigo-500': formData.type === type.value,
                                        'border-red-500': validationErrors.type 
                                    }"
                                    @click="formData.type = type.value">
                                    {{ type.label }}
                                </button>
                            </div>
                            <p v-if="validationErrors.type" class="mt-1 text-sm text-red-600">
                                {{ validationErrors.type }}
                            </p>
                        </div>

                        <!-- Reason for Visit -->
                        <div>
                            <label for="reason" class="label">Reason for Visit</label>
                            <textarea id="reason" v-model="formData.reasonForVisit" rows="3" class="input mt-1"
                                required :class="{ 'border-red-500': validationErrors.reasonForVisit }"></textarea>
                            <p v-if="validationErrors.reasonForVisit" class="mt-1 text-sm text-red-600">
                                {{ validationErrors.reasonForVisit }}
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
            <p class="text-gray-600">Doctor not found.</p>
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

const doctor = ref(null)
const loading = ref(true)
const submitting = ref(false)
const error = ref('')
const availableSlots = ref([])
const validationErrors = reactive({
    date: '',
    time: '',
    type: '',
    reasonForVisit: ''
})

const consultationTypes = [
    { value: 'video', label: 'Video' },
    { value: 'voice', label: 'Voice' },
    { value: 'chat', label: 'Chat' }
]

const formData = reactive({
    date: '',
    time: '',
    type: 'video',
    reasonForVisit: ''
})

const minDate = computed(() => format(new Date(), 'yyyy-MM-dd'))
const maxDate = computed(() => format(addDays(new Date(), 30), 'yyyy-MM-dd'))

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

// Function to safely format the doctor's fee
const formatFee = () => {
    if (!doctor.value) return '0';
    return formatCurrency(doctor.value.consultationFee);
}

// Keep the original format function for other date formatting needs
const formatTime = (time) => {
    return format(parseISO(time), 'h:mm a')
}

// Updated function to display UTC times correctly without timezone conversion
const formatTimeDisplay = (timeString) => {
    try {
        // Parse the ISO string
        const timeDate = new Date(timeString)
        
        // Extract hours and minutes directly from the UTC time
        const hours = timeDate.getUTCHours()
        const minutes = timeDate.getUTCMinutes()
        
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

async function fetchDoctorProfile() {
    try {
        loading.value = true
        const response = await axios.get(`/api/users/doctors/${route.params.doctorId}`)
        // Assign the doctor property from the response data
        doctor.value = response.data.doctor;
    } catch (error) {
        console.error('Error fetching doctor profile:', error)
    } finally {
        loading.value = false
    }
}

async function fetchAvailableSlots() {
    try {
        const response = await axios.get(`/api/appointments/availability/${route.params.doctorId}`, {
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
        validationErrors.type = 'Please select a consultation type'
        isValid = false
    }
    
    if (!formData.reasonForVisit.trim()) {
        validationErrors.reasonForVisit = 'Please provide a reason for your visit'
        isValid = false
    }
    
    return isValid
}

async function handleSubmit() {
    if (!validateForm()) {
        return
    }
    
    try {
        submitting.value = true
        error.value = ''

        // Create appointment (patientId will be automatically set from auth token in backend)
        const appointmentData = {
            doctorId: route.params.doctorId,
            dateTime: formData.time, // Send the original time string from the backend
            type: formData.type,
            reasonForVisit: formData.reasonForVisit
        }

        const response = await axios.post('/api/appointments', appointmentData)

        // Create checkout session and redirect to payment
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
    fetchDoctorProfile()
})
</script>