<template>
    <div class="min-h-screen bg-gray-100">
        <!-- Header -->
        <header class="bg-white shadow">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div class="flex items-center justify-between">
                    <div class="flex items-center">
                        <h1 class="text-xl font-bold text-gray-900">
                            Lesson with {{ lesson?.student?.name ||
                                lesson?.teacher?.name }}
                        </h1>
                        <span class="ml-4 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium" :class="{
                            'bg-green-100 text-green-800': isConnected,
                            'bg-red-100 text-red-800': !isConnected
                        }">
                            {{ isConnected ? 'Connected' : 'Connecting...' }}
                        </span>
                    </div>
                    <button class="btn-secondary text-red-600 hover:text-red-700" @click="showEndLessonConfirm">
                        End Lesson
                    </button>
                </div>
            </div>
        </header>

        <!-- Main Content -->
        <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div class="grid grid-cols-1 gap-8">
                <!-- Video Area -->
                <div class="bg-white shadow rounded-lg overflow-hidden">
                    <!-- Jitsi Meet container -->
                    <div id="jitsi-container" class="w-full h-[600px]"></div>
                </div>
            </div>
        </main>

        <!-- End Lesson Confirmation Modal -->
        <div v-if="showEndConfirmation"
            class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg overflow-hidden shadow-xl max-w-md w-full mx-4">
                <div class="p-6">
                    <h3 class="text-lg font-medium text-gray-900">End Lesson</h3>
                    <p class="mt-2 text-sm text-gray-500">
                        Are you sure you want to end this lesson?
                        {{ isTeacher ? 'You\'ll be asked to provide a summary and homeworks.' : '' }}
                    </p>
                    <div class="mt-4 flex justify-end space-x-3">
                        <button @click="showEndConfirmation = false" class="btn-secondary">
                            Cancel
                        </button>
                        <button @click="confirmEndLesson" class="btn-primary bg-red-600 hover:bg-red-700">
                            End Lesson
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Post-Lesson Form for Teachers -->
        <div v-if="showPostLessonForm && isTeacher"
            class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg overflow-hidden shadow-xl max-w-4xl w-full mx-4 my-8">
                <div class="p-6 max-h-[90vh] overflow-y-auto">
                    <h3 class="text-xl font-bold text-gray-900 mb-4">Lesson Summary</h3>

                    <form @submit.prevent="submitPostLessonForm">
                        <!-- Lesson Summary -->
                        <div class="mb-6">
                            <label for="lessonSummary" class="block text-sm font-medium text-gray-700 mb-1">
                                Lesson Summary
                            </label>
                            <textarea id="lessonSummary" v-model="postLessonData.lessonSummary"
                                rows="4" class="input w-full" required></textarea>
                        </div>

                        <!-- Homeworks -->
                        <div class="mb-6">
                            <div class="flex justify-between items-center mb-2">
                                <h4 class="text-lg font-medium text-gray-900">Homeworks</h4>
                                <button type="button" @click="addHomework"
                                    class="text-sm bg-gradient-to-r from-educational-blue to-educational-purple bg-clip-text text-transparent  hover:text-indigo-900">
                                    + Add Homework
                                </button>
                            </div>

                            <div v-for="(homework, index) in postLessonData.homeworks" :key="index"
                                class="bg-gray-50 p-4 rounded-lg mb-3">
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                                    <div>
                                        <label :for="`medication-${index}`"
                                            class="block text-sm font-medium text-gray-700 mb-1">
                                            Medication
                                        </label>
                                        <input :id="`medication-${index}`" v-model="homework.medication" type="text"
                                            class="input w-full" required />
                                    </div>
                                    <div>
                                        <label :for="`dosage-${index}`"
                                            class="block text-sm font-medium text-gray-700 mb-1">
                                            Dosage
                                        </label>
                                        <input :id="`dosage-${index}`" v-model="homework.dosage" type="text"
                                            class="input w-full" required />
                                    </div>
                                </div>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                                    <div>
                                        <label :for="`frequency-${index}`"
                                            class="block text-sm font-medium text-gray-700 mb-1">
                                            Frequency
                                        </label>
                                        <input :id="`frequency-${index}`" v-model="homework.frequency" type="text"
                                            class="input w-full" required />
                                    </div>
                                    <div>
                                        <label :for="`duration-${index}`"
                                            class="block text-sm font-medium text-gray-700 mb-1">
                                            Duration
                                        </label>
                                        <input :id="`duration-${index}`" v-model="homework.duration" type="text"
                                            class="input w-full" required />
                                    </div>
                                </div>
                                <div class="mb-2">
                                    <label :for="`instructions-${index}`"
                                        class="block text-sm font-medium text-gray-700 mb-1">
                                        Instructions
                                    </label>
                                    <textarea :id="`instructions-${index}`" v-model="homework.instructions" rows="2"
                                        class="input w-full"></textarea>
                                </div>
                                <button type="button" @click="removeHomework(index)"
                                    class="text-sm text-red-600 hover:text-red-900">
                                    Remove
                                </button>
                            </div>

                            <div v-if="postLessonData.homeworks.length === 0"
                                class="bg-gray-50 p-4 rounded-lg text-center text-gray-500">
                                No homeworks added. Click "Add Homework" to add one.
                            </div>
                        </div>

                        <!-- Follow-up Recommendation -->
                        <div class="mb-6">
                            <div class="flex items-center mb-2">
                                <input id="followUpRecommended" v-model="postLessonData.followUp.recommended"
                                    type="checkbox" class="h-4 w-4 bg-gradient-to-r from-educational-blue to-educational-purple bg-clip-text text-transparent  rounded" />
                                <label for="followUpRecommended" class="ml-2 block text-sm font-medium text-gray-700">
                                    Recommend Follow-up Appointment
                                </label>
                            </div>

                            <div v-if="postLessonData.followUp.recommended" class="ml-6 mt-3">
                                <label for="followUpDate" class="block text-sm font-medium text-gray-700 mb-1">
                                    Recommended Follow-up Date
                                </label>
                                <input id="followUpDate" v-model="postLessonData.followUp.date" type="date"
                                    class="input w-full" :min="minFollowUpDate" required />

                                <div class="mt-3">
                                    <label for="followUpNotes" class="block text-sm font-medium text-gray-700 mb-1">
                                        Follow-up Notes
                                    </label>
                                    <textarea id="followUpNotes" v-model="postLessonData.followUp.notes" rows="2"
                                        class="input w-full"></textarea>
                                </div>
                            </div>
                        </div>

                        <!-- Chat Log (if available) -->
                        <div v-if="chatLog.length > 0" class="mb-6">
                            <h4 class="text-lg font-medium text-gray-900 mb-2">Chat Log</h4>
                            <div class="bg-gray-50 p-4 rounded-lg h-40 overflow-y-auto">
                                <div v-for="(message, index) in chatLog" :key="index" class="mb-2">
                                    <span class="font-semibold">{{ message.sender }}:</span> {{ message.text }}
                                    <span class="text-xs text-gray-500 ml-2">{{ message.time }}</span>
                                </div>
                            </div>
                        </div>

                        <div class="mt-6 flex justify-end space-x-3">
                            <button type="button" @click="skipPostLesson" class="btn-secondary">
                                Skip
                            </button>
                            <button type="submit" class="btn-primary" :disabled="submitting">
                                {{ submitting ? 'Saving...' : 'Save and End Lesson' }}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>

        <!-- Follow-up Created Notification -->
        <div v-if="showFollowUpNotification"
            class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg overflow-hidden shadow-xl max-w-md w-full mx-4">
                <div class="p-6">
                    <div class="flex items-center justify-center mb-4">
                        <div class="bg-green-100 rounded-full p-3">
                            <svg class="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                    </div>
                    <h3 class="text-lg font-medium text-gray-900 text-center">Follow-up Appointment Created</h3>
                    <p class="mt-2 text-sm text-gray-500 text-center">
                        A follow-up appointment has been created and is now pending payment.
                        The student will need to pay to confirm the appointment.
                    </p>
                    <div class="mt-4 flex justify-center">
                        <button @click="returnToAppointments" class="btn-primary">
                            Return to Appointments
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { format, addDays } from 'date-fns'
import axios from 'axios'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const isConnected = ref(false)
const lesson = ref(null)
const api = ref(null)
const chatLog = ref([])
const submitting = ref(false)

// Modal states
const showEndConfirmation = ref(false)
const showPostLessonForm = ref(false)
const showFollowUpNotification = ref(false)

// Post-lesson form data
const postLessonData = reactive({
    lessonSummary: '',
    homeworks: [],
    followUp: {
        recommended: false,
        date: '',
        notes: ''
    }
})

const isTeacher = computed(() => authStore.isTeacher)

const minFollowUpDate = computed(() => {
    const tomorrow = addDays(new Date(), 1)
    return format(tomorrow, 'yyyy-MM-dd')
})

function loadJitsiScript() {
    return new Promise((resolve, reject) => {
        if (document.getElementById('jitsi-api-script')) {
            resolve()
            return
        }

        const script = document.createElement('script')
        script.id = 'jitsi-api-script'
        script.src = 'https://meet.jit.si/external_api.js'
        script.async = true
        script.onload = resolve
        script.onerror = reject
        document.body.appendChild(script)
    })
}

async function initializeJitsi() {
    try {
        if (!lesson.value?.jitsi) {
            throw new Error('Jitsi configuration not available')
        }

        await loadJitsiScript()

        // Wait for the JitsiMeetExternalAPI to be available
        if (!window.JitsiMeetExternalAPI) {
            throw new Error('Jitsi Meet External API not loaded')
        }

        const { domain, roomName, token } = lesson.value.jitsi

        // Configure Jitsi options
        const options = {
            roomName,
            jwt: token,
            width: '100%',
            height: '100%',
            parentNode: document.getElementById('jitsi-container'),
            configOverwrite: {
                prejoinPageEnabled: false,
                disableDeepLinking: true,
                startWithAudioMuted: false,
                startWithVideoMuted: false
            },
            interfaceConfigOverwrite: {
                SHOW_JITSI_WATERMARK: false,
                SHOW_WATERMARK_FOR_GUESTS: false,
                DEFAULT_BACKGROUND: '#FFFFFF',
                DEFAULT_REMOTE_DISPLAY_NAME: 'Participant',
                TOOLBAR_BUTTONS: [
                    'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
                    'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
                    'settings', 'raisehand', 'videoquality', 'filmstrip', 'feedback',
                    'stats', 'tileview'
                ]
            },
            userInfo: {
                displayName: authStore.isTeacher ?
                    `Dr. ${authStore.user.firstName} ${authStore.user.lastName}` :
                    `${authStore.user.firstName} ${authStore.user.lastName}`
            }
        }

        // Create Jitsi Meet external API instance
        api.value = new window.JitsiMeetExternalAPI(domain, options)

        // Set event listeners
        api.value.on('videoConferenceJoined', () => {
            isConnected.value = true
        })

        api.value.on('videoConferenceLeft', () => {
            if (isTeacher.value) {
                // If teacher hasn't completed the form yet, show it
                if (!showPostLessonForm.value) {
                    showPostLessonForm.value = true
                }
            } else {
                router.push({ name: 'appointment-details', params: { id: route.params.appointmentId } })
            }
        })

        // Try to capture chat messages
        api.value.on('chatUpdated', (event) => {
            if (event && event.message) {
                chatLog.value.push({
                    sender: event.from || 'Unknown',
                    text: event.message,
                    time: format(new Date(), 'HH:mm')
                })
            }
        })
    } catch (error) {
        console.error('Error initializing Jitsi:', error)
        isConnected.value = false
    }
}

function showEndLessonConfirm() {
    showEndConfirmation.value = true
}

function confirmEndLesson() {
    showEndConfirmation.value = false

    // Dispose Jitsi API 
    if (api.value) {
        // Try to get chat history if possible
        try {
            const messages = api.value.getChatHistory()
            if (messages && Array.isArray(messages)) {
                chatLog.value = messages.map(msg => ({
                    sender: msg.from || 'Unknown',
                    text: msg.message,
                    time: format(new Date(msg.timestamp || Date.now()), 'HH:mm')
                }))
            }
        } catch (e) {
            console.log('Chat history not available:', e)
        }

        api.value.dispose()
    }

    if (isTeacher.value) {
        showPostLessonForm.value = true
    } else {
        router.push({ name: 'appointment-details', params: { id: route.params.appointmentId } })
    }
}

function addHomework() {
    postLessonData.homeworks.push({
        medication: '',
        dosage: '',
        frequency: '',
        duration: '',
        instructions: ''
    })
}

function removeHomework(index) {
    postLessonData.homeworks.splice(index, 1)
}

async function submitPostLessonForm() {
    try {
        submitting.value = true

        // 1. Update appointment status to completed and add lesson summary
        await axios.patch(`/api/appointments/${route.params.appointmentId}/status`, {
            status: 'completed',
            lessonSummary: postLessonData.lessonSummary
        })

        // 2. Add homeworks if any
        if (postLessonData.homeworks.length > 0) {
            await axios.patch(`/api/appointments/${route.params.appointmentId}/homeworks`, {
                homeworks: postLessonData.homeworks
            })
        }

        // 3. Schedule follow-up if recommended
        if (postLessonData.followUp.recommended) {
            await axios.post(`/api/appointments/${route.params.appointmentId}/follow-up`, {
                followUpDate: postLessonData.followUp.date,
                notes: postLessonData.followUp.notes
            })

            // Show follow-up notification
            showPostLessonForm.value = false
            showFollowUpNotification.value = true
        } else {
            returnToAppointments()
        }
    } catch (error) {
        console.error('Error submitting post-lesson data:', error)
        alert('An error occurred while saving the lesson data. Please try again.')
    } finally {
        submitting.value = false
    }
}

function skipPostLesson() {
    // Just end the lesson without saving any data
    router.push({ name: 'teacher-appointments' })
}

function returnToAppointments() {
    router.push(isTeacher.value ?
        { name: 'teacher-appointments' } :
        { name: 'student-appointments' }
    )
}

onMounted(async () => {
    try {
        // Get lesson details
        const response = await axios.get(`/api/lessons/${route.params.appointmentId}/join`)
        lesson.value = response.data.lesson

        await initializeJitsi()
    } catch (error) {
        console.error('Error joining lesson:', error)
        router.push({ name: 'appointment-details', params: { id: route.params.appointmentId } })
    }
})

onUnmounted(() => {
    // Clean up Jitsi
    if (api.value) {
        api.value.dispose()
    }
})
</script>