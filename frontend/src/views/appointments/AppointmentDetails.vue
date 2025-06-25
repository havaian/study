<template>
    <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div v-if="loading" class="text-center py-8">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent">
            </div>
            <p class="mt-2 text-gray-600">Loading appointment details...</p>
        </div>

        <template v-else-if="appointment">
            <div class="bg-white shadow rounded-lg overflow-hidden">
                <!-- Header -->
                <div class="p-6 border-b border-gray-200">
                    <div class="flex items-center justify-between">
                        <h1 class="text-2xl font-bold text-gray-900">
                            Appointment Details
                        </h1>
                        <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium" :class="{
                            'bg-green-100 text-green-800': appointment.status === 'completed',
                            'bg-yellow-100 text-yellow-800': appointment.status === 'scheduled',
                            'bg-purple-100 text-purple-800': appointment.status === 'pending-payment',
                            'bg-red-100 text-red-800': appointment.status === 'canceled' || appointment.status === 'no-show'
                        }">
                            {{ formatStatus(appointment.status) }}
                        </span>
                    </div>
                </div>

                <!-- Appointment Info -->
                <div class="p-6 space-y-6">
                    <!-- Participants -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h3 class="text-lg font-medium text-gray-900 mb-4">Doctor</h3>
                            <div class="flex items-center space-x-4">
                                <img :src="appointment.doctor.profilePicture || '/images/user-placeholder.jpg'"
                                    :alt="appointment.doctor.firstName" class="h-12 w-12 rounded-full object-cover" />
                                <div>
                                    <p class="font-medium text-gray-900">
                                        Dr. {{ appointment.doctor.firstName }} {{ appointment.doctor.lastName }}
                                    </p>
                                    <div class="mt-2 flex flex-wrap gap-2">
                                        <span v-for="spec in appointment.doctor.specializations" :key="spec"
                                            class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                                            {{ spec }}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 class="text-lg font-medium text-gray-900 mb-4">Patient</h3>
                            <div class="flex items-center space-x-4">
                                <img :src="appointment.patient.profilePicture || '/images/user-placeholder.jpg'"
                                    :alt="appointment.patient.firstName" class="h-12 w-12 rounded-full object-cover" />
                                <div>
                                    <p class="font-medium text-gray-900">
                                        {{ appointment.patient.firstName }} {{ appointment.patient.lastName }}
                                    </p>
                                    <p class="text-sm text-gray-500">
                                        Age: {{ calculateAge(appointment.patient.dateOfBirth) }}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Appointment Details -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h3 class="text-lg font-medium text-gray-900 mb-4">Date & Time</h3>
                            <p class="text-gray-900">{{ formatDateTime(appointment.dateTime) }}</p>
                        </div>

                        <div>
                            <h3 class="text-lg font-medium text-gray-900 mb-4">Consultation Type</h3>
                            <p class="text-gray-900">
                                {{ appointment.type.charAt(0).toUpperCase() + appointment.type.slice(1) }}
                            </p>
                        </div>
                    </div>

                    <!-- Reason for Visit -->
                    <div>
                        <h3 class="text-lg font-medium text-gray-900 mb-4">Reason for Visit</h3>
                        <p class="text-gray-900">{{ appointment.reasonForVisit }}</p>
                    </div>

                    <!-- Consultation Summary (only for completed appointments) -->
                    <div v-if="appointment.status === 'completed' && appointment.consultationSummary">
                        <h3 class="text-lg font-medium text-gray-900 mb-4">Consultation Summary</h3>
                        <div class="bg-gray-50 p-4 rounded-lg">
                            <p class="text-gray-900 whitespace-pre-line">{{ appointment.consultationSummary }}</p>
                        </div>
                    </div>

                    <!-- Prescriptions (only for completed appointments) -->
                    <div
                        v-if="appointment.status === 'completed' && appointment.prescriptions && appointment.prescriptions.length > 0">
                        <h3 class="text-lg font-medium text-gray-900 mb-4">Prescriptions</h3>
                        <div class="space-y-4">
                            <div v-for="(prescription, index) in appointment.prescriptions" :key="index"
                                class="bg-gray-50 p-4 rounded-lg">
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <p class="text-sm font-medium text-gray-500">Medication</p>
                                        <p class="text-gray-900">{{ prescription.medication }}</p>
                                    </div>
                                    <div>
                                        <p class="text-sm font-medium text-gray-500">Dosage</p>
                                        <p class="text-gray-900">{{ prescription.dosage }}</p>
                                    </div>
                                    <div>
                                        <p class="text-sm font-medium text-gray-500">Frequency</p>
                                        <p class="text-gray-900">{{ prescription.frequency }}</p>
                                    </div>
                                    <div>
                                        <p class="text-sm font-medium text-gray-500">Duration</p>
                                        <p class="text-gray-900">{{ prescription.duration }}</p>
                                    </div>
                                </div>
                                <div v-if="prescription.instructions" class="mt-2">
                                    <p class="text-sm font-medium text-gray-500">Instructions</p>
                                    <p class="text-gray-900">{{ prescription.instructions }}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Follow-up Information (only for completed appointments with follow-up) -->
                    <div
                        v-if="appointment.status === 'completed' && appointment.followUp && appointment.followUp.recommended">
                        <h3 class="text-lg font-medium text-gray-900 mb-4">Follow-up Recommendation</h3>
                        <div class="bg-gray-50 p-4 rounded-lg">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p class="text-sm font-medium text-gray-500">Recommended Date</p>
                                    <p class="text-gray-900">{{ formatDate(appointment.followUp.date) }}</p>
                                </div>
                                <div v-if="appointment.followUp.notes">
                                    <p class="text-sm font-medium text-gray-500">Notes</p>
                                    <p class="text-gray-900">{{ appointment.followUp.notes }}</p>
                                </div>
                            </div>

                            <div v-if="followUpAppointment" class="mt-4 p-3 bg-indigo-50 rounded-lg">
                                <p class="text-sm font-medium text-indigo-800">
                                    Follow-up appointment has been scheduled for
                                    <span class="font-bold">{{ formatDateTime(followUpAppointment.dateTime) }}</span>
                                </p>
                                <div v-if="followUpAppointment.status === 'pending-payment'" class="mt-2">
                                    <button @click="proceedToPayment(followUpAppointment._id)"
                                        class="btn-primary text-sm">
                                        Proceed to Payment
                                    </button>
                                </div>
                            </div>
                            <div v-else-if="authStore.isPatient && appointment.followUp.recommended" class="mt-4">
                                <button @click="findFollowUpAppointment" class="btn-primary text-sm">
                                    View Follow-up Details
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Chat Log (if available) -->
                    <div v-if="appointment.chatLog && appointment.chatLog.length > 0">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="text-lg font-medium text-gray-900">Chat History</h3>
                            <button @click="showChatLog = !showChatLog"
                                class="text-sm text-indigo-600 hover:text-indigo-900">
                                {{ showChatLog ? 'Hide Chat' : 'Show Chat' }}
                            </button>
                        </div>
                        <div v-if="showChatLog" class="bg-gray-50 p-4 rounded-lg max-h-64 overflow-y-auto">
                            <div v-for="(message, index) in appointment.chatLog" :key="index" class="mb-2">
                                <div class="flex">
                                    <span class="font-semibold">{{ message.sender }}:</span>
                                    <span class="ml-2">{{ message.text }}</span>
                                </div>
                                <div class="text-xs text-gray-500">
                                    {{ formatChatTime(message.timestamp) }}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Payment Information for Pending-Payment Appointments -->
                    <div v-if="appointment.status === 'pending-payment'">
                        <h3 class="text-lg font-medium text-gray-900 mb-4">Payment Information</h3>
                        <div class="bg-gray-50 p-4 rounded-lg">
                            <p class="text-gray-700">
                                This appointment requires payment to be confirmed. Once payment is completed, your
                                appointment will be scheduled.
                            </p>
                            <div class="mt-4">
                                <p class="text-sm font-medium text-gray-500">Amount</p>
                                <p class="text-gray-900">{{ formatCurrency(appointment.payment.amount) }} UZS</p>
                            </div>
                            <div class="mt-4">
                                <button @click="proceedToPayment(appointment._id)" class="btn-primary">
                                    Proceed to Payment
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Doctor-patient chat -->
                    <div class="mt-8" v-if="canStartChat">
                        <h3 class="text-lg font-medium text-gray-900 mb-4">Communication</h3>
                        <div class="bg-gray-50 p-4 rounded-lg">
                            <p class="text-gray-600 mb-4">
                                {{ getChatButtonText }}
                            </p>
                            <button @click="startChat" class="btn-primary flex items-center">
                                <svg class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                Start Chat
                            </button>
                        </div>
                    </div>

                    <!-- Actions -->
                    <div class="flex justify-end space-x-4">
                        <button v-if="appointment.status === 'scheduled' && authStore.isPatient"
                            class="btn-secondary text-red-600 hover:text-red-700" @click="cancelAppointment">
                            Cancel Appointment
                        </button>
                        <button v-if="appointment.status === 'scheduled' && isWithinJoinWindow" class="btn-primary"
                            @click="joinConsultation">
                            {{ authStore.isDoctor ? 'Start Consultation' : 'Join Consultation' }}
                        </button>
                        <div v-if="showFollowUpModal"
                            class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
                            <div class="bg-white rounded-lg overflow-hidden shadow-xl max-w-md w-full mx-4">
                                <div class="p-6">
                                    <h3 class="text-lg font-medium text-gray-900 mb-4">Schedule Follow-up Appointment
                                    </h3>

                                    <form @submit.prevent="createFollowUp">
                                        <div class="space-y-4">
                                            <div>
                                                <label for="followUpDate"
                                                    class="block text-sm font-medium text-gray-700">
                                                    Follow-up Date
                                                </label>
                                                <input id="followUpDate" v-model="followUpDate" type="date"
                                                    class="input mt-1" :min="minFollowUpDate" required />
                                            </div>

                                            <div>
                                                <label for="followUpNotes"
                                                    class="block text-sm font-medium text-gray-700">
                                                    Notes
                                                </label>
                                                <textarea id="followUpNotes" v-model="followUpNotes" rows="3"
                                                    class="input mt-1"
                                                    placeholder="Add any notes about the follow-up appointment"></textarea>
                                            </div>
                                        </div>

                                        <div class="mt-6 flex justify-end space-x-3">
                                            <button type="button" class="btn-secondary"
                                                @click="showFollowUpModal = false">
                                                Cancel
                                            </button>
                                            <button type="submit" class="btn-primary" :disabled="submitting">
                                                {{ submitting ? 'Scheduling...' : 'Schedule Follow-up' }}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </template>

        <div v-else class="text-center py-8">
            <p class="text-gray-600">Appointment not found.</p>
        </div>
    </div>
</template>

<script setup>
import { format, parseISO, differenceInYears, isWithinInterval, subMinutes, addMinutes } from 'date-fns'
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePaymentStore } from '@/stores/payment'
import axios from 'axios'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const paymentStore = usePaymentStore()

const appointment = ref(null)
const followUpAppointment = ref(null)
const loading = ref(true)
const showChatLog = ref(false)
const showFollowUpModal = ref(false)
const followUpDate = ref('')
const followUpNotes = ref('')
const submitting = ref(false)

const minFollowUpDate = computed(() => {
    const tomorrow = addDays(new Date(), 1)
    return format(tomorrow, 'yyyy-MM-dd')
})

const formatDateTime = (dateTime) => {
    return format(parseISO(dateTime), 'MMM d, yyyy h:mm a')
}

const formatDate = (date) => {
    if (!date) return 'Not specified'
    return format(parseISO(date), 'MMM d, yyyy')
}

const formatChatTime = (timestamp) => {
    return format(new Date(timestamp), 'MMM d, h:mm a')
}

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('uz-UZ').format(amount)
}

const formatStatus = (status) => {
    if (status === 'pending-payment') return 'Pending Payment'
    return status.charAt(0).toUpperCase() + status.slice(1)
}

const calculateAge = (dateOfBirth) => {
    return differenceInYears(new Date(), parseISO(dateOfBirth))
}

const isWithinJoinWindow = computed(() => {
    if (!appointment.value?.dateTime) return false

    const appointmentTime = parseISO(appointment.value.dateTime)
    const now = new Date()

    return isWithinInterval(now, {
        start: subMinutes(appointmentTime, 5),
        end: addMinutes(appointmentTime, 30)
    })
})

const canStartChat = computed(() => {
    if (!appointment.value) return false

    const isParticipant = authStore.isDoctor ?
        appointment.value.doctor._id === authStore.user._id :
        appointment.value.patient._id === authStore.user._id

    const validStatus = ['scheduled', 'completed']
    return isParticipant && validStatus.includes(appointment.value.status)
})

const getChatButtonText = computed(() => {
    if (!appointment.value) return ''

    const otherParty = authStore.isDoctor ?
        `${appointment.value.patient.firstName} ${appointment.value.patient.lastName}` :
        `Dr. ${appointment.value.doctor.firstName} ${appointment.value.doctor.lastName}`

    return `Chat with ${otherParty} about this appointment`
})

async function fetchAppointment() {
    try {
        loading.value = true
        const response = await axios.get(`/api/appointments/${route.params.id}`)
        appointment.value = response.data.appointment

        // If this appointment has a follow-up recommendation, try to find the follow-up appointment
        if (appointment.value.status === 'completed' &&
            appointment.value.followUp &&
            appointment.value.followUp.recommended) {
            findFollowUpAppointment()
        }
    } catch (error) {
        console.error('Error fetching appointment:', error)
    } finally {
        loading.value = false
    }
}

async function findFollowUpAppointment() {
    try {
        // Get patient's pending-payment appointments
        const response = await axios.get(`/api/appointments/patient/${authStore.user._id}/pending-followups`)

        // Find follow-up for this appointment
        const followUps = response.data.appointments || []
        const followUp = followUps.find(app =>
            app.reasonForVisit.includes(`Follow-up to appointment on`) &&
            app.doctor._id === appointment.value.doctor._id)

        if (followUp) {
            followUpAppointment.value = followUp
        }
    } catch (error) {
        console.error('Error finding follow-up appointment:', error)
    }
}

async function cancelAppointment() {
    if (!confirm('Are you sure you want to cancel this appointment?')) return

    try {
        await axios.patch(`/api/appointments/${appointment.value._id}/status`, {
            status: 'canceled'
        })
        await fetchAppointment()
    } catch (error) {
        console.error('Error canceling appointment:', error)
    }
}

async function joinConsultation() {
    try {
        const response = await axios.get(`/api/consultations/${appointment.value._id}/join`)
        if (response.data.consultation) {
            router.push({
                name: 'consultation-room',
                params: { appointmentId: appointment.value._id }
            })
        }
    } catch (error) {
        console.error('Error joining consultation:', error)
        // If consultation is not ready yet, show the time remaining
        if (error.response && error.response.data && error.response.data.startsInMinutes) {
            alert(`This consultation will be available in ${error.response.data.startsInMinutes} minutes.`)
        } else {
            alert('Unable to join consultation at this time. Please try again later.')
        }
    }
}

async function proceedToPayment(appointmentId) {
    try {
        await paymentStore.createCheckoutSession(appointmentId)
        // Redirect handled by payment store
    } catch (error) {
        console.error('Error creating payment session:', error)
        alert('There was a problem processing your payment. Please try again.')
    }
}

async function startChat() {
    try {
        const participantId = authStore.isDoctor ?
            appointment.value.patient._id :
            appointment.value.doctor._id

        // Create or get existing conversation
        const response = await axios.post('/api/chat/conversations', {
            participantId,
            appointmentId: appointment.value._id
        })

        // Navigate to chat
        router.push({
            name: 'chat-conversation',
            params: { id: response.data.conversation._id }
        })
    } catch (error) {
        console.error('Error starting chat:', error)
    }
}

async function createFollowUp() {
    if (!followUpDate.value) return

    try {
        submitting.value = true
        await axios.post(`/api/appointments/${route.params.id}/follow-up`, {
            followUpDate: followUpDate.value,
            notes: followUpNotes.value
        })

        // Close modal and reset form
        showFollowUpModal.value = false
        followUpDate.value = ''
        followUpNotes.value = ''

        // Refresh appointment data
        await fetchAppointment()
    } catch (error) {
        console.error('Error creating follow-up:', error)
        alert('Failed to schedule follow-up appointment. Please try again.')
    } finally {
        submitting.value = false
    }
}

onMounted(() => {
    fetchAppointment()
})
</script>