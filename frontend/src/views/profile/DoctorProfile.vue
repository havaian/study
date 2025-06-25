<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div v-if="loading" class="text-center py-8">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent">
      </div>
      <p class="mt-2 text-gray-600">Loading your profile...</p>
    </div>

    <template v-else-if="user">
      <div class="bg-white shadow rounded-lg overflow-hidden">
        <!-- Profile Header -->
        <div class="p-6 sm:p-8 border-b border-gray-200">
          <div class="flex flex-col sm:flex-row items-center sm:items-start">
            <img :src="user.profilePicture || 'https://via.placeholder.com/150'" :alt="user.firstName"
              class="h-32 w-32 rounded-full object-cover" />
            <div class="mt-4 sm:mt-0 sm:ml-6 text-center sm:text-left flex-1">
              <h1 class="text-2xl font-bold text-gray-900">
                Dr. {{ user.firstName }} {{ user.lastName }}
              </h1>

              <!-- Specializations as tags -->
              <div class="mt-2 flex flex-wrap gap-2 justify-center sm:justify-start">
                <span v-for="spec in user.specializations" :key="spec"
                  class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  {{ spec }}
                </span>
              </div>

              <div class="mt-3 flex flex-wrap gap-2 justify-center sm:justify-start">
                <span
                  class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                  {{ user.experience }} years experience
                </span>
                <span v-for="lang in user.languages" :key="lang"
                  class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                  {{ lang }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Profile Content -->
        <div class="p-6 sm:p-8">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Professional Information -->
            <div>
              <h2 class="text-xl font-semibold text-gray-900 mb-4">Professional Information</h2>
              <dl class="space-y-4">
                <div>
                  <dt class="text-sm font-medium text-gray-500">Email</dt>
                  <dd class="mt-1 text-gray-900">{{ user.email }}</dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-500">Phone</dt>
                  <dd class="mt-1 text-gray-900">{{ user.phone }}</dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-500">License Number</dt>
                  <dd class="mt-1 text-gray-900">{{ user.licenseNumber }}</dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-500">Consultation Fee</dt>
                  <dd class="mt-1 text-gray-900">
                    {{ formatConsultationFee }}
                  </dd>
                </div>
              </dl>
            </div>

            <!-- Education & Experience -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <h2 class="text-xl font-semibold text-gray-900 mb-4">Education</h2>
              <dl class="space-y-4">
                <div v-for="edu in user.education" :key="edu.degree">
                  <dt class="text-sm font-medium text-gray-900">{{ edu.degree }}</dt>
                  <dd class="mt-1 text-gray-500">{{ edu.institution }} ({{ edu.year }})</dd>
                </div>
                <div v-if="!user.education || user.education.length === 0" class="text-gray-500">
                  No education information provided.
                </div>
              </dl>
              
              <h2 class="text-xl font-semibold text-gray-900 mb-4">Certification</h2>
              <dl class="space-y-4">
                <div v-for="cert in user.certifications" :key="cert.issuer">
                  <dt class="text-sm font-medium text-gray-900">{{ cert.issuer }}</dt>
                  <dd class="mt-1 text-gray-500">{{ cert.name }} ({{ cert.year }})</dd>
                </div>
                <div v-if="!user.certification || user.certification.length === 0" class="text-gray-500">
                  No certification information provided.
                </div>
              </dl>
            </div>
          </div>

          <!-- Bio -->
          <div class="mt-8">
            <h2 class="text-xl font-semibold text-gray-900 mb-4">About</h2>
            <p class="text-gray-600">{{ decodedBio }}</p>
          </div>

          <!-- Location -->
          <div class="mt-8">
            <h2 class="text-xl font-semibold text-gray-900 mb-4">Location</h2>
            <p class="text-gray-600">{{ formattedAddress }}</p>
          </div>

          <!-- Availability -->
          <div class="mt-8">
            <h2 class="text-xl font-semibold text-gray-900 mb-4">Availability</h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div v-for="day in availableDays" :key="day.dayOfWeek" class="bg-gray-50 p-4 rounded-lg">
                <h3 class="font-medium text-gray-900">{{ formatDay(day.dayOfWeek) }}</h3>
                <p class="text-gray-600">{{ day.startTime }} - {{ day.endTime }}</p>
              </div>
              <div v-if="availableDays.length === 0" class="bg-gray-50 p-4 rounded-lg">
                <p class="text-gray-500">No availability set. Please update your profile.</p>
              </div>
            </div>
          </div>

          <!-- Edit Profile Button -->
          <div class="mt-8 flex justify-end">
            <router-link :to="{ name: 'profile-edit' }" class="btn-primary">
              Edit Profile
            </router-link>
          </div>
        </div>
      </div>
    </template>

    <div v-else class="text-center py-8">
      <p class="text-gray-600">Profile not found.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import axios from 'axios'

const authStore = useAuthStore()
const user = ref(null)
const loading = ref(true)

const availableDays = computed(() => {
  if (!user.value?.availability) return []
  return user.value.availability.filter(day => day.isAvailable)
})

// Computed property for decoded bio
const decodedBio = computed(() => {
  if (!user.value?.bio) return 'No bio provided.'

  // Create a temporary DOM element to decode HTML entities
  const textarea = document.createElement('textarea')
  textarea.innerHTML = user.value.bio
  return textarea.value
})

// Computed property for formatted consultation fee
const formatConsultationFee = computed(() => {
  const fee = user.value?.consultationFee

  if (!fee) return 'Consultation fee not specified'

  // If fee is an object with amount property
  if (typeof fee === 'object' && fee !== null && 'amount' in fee) {
    return `${new Intl.NumberFormat('uz-UZ').format(fee)} ${fee.currency || 'UZS'}`
  }
  // If it's just a number
  else if (typeof fee === 'number') {
    return `${new Intl.NumberFormat('uz-UZ').format(fee)} UZS`
  }

  return 'Consultation fee not specified'
})

// Computed property for formatted address
const formattedAddress = computed(() => {
  const address = user.value?.address

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
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return days[dayOfWeek]
}

async function fetchUserProfile() {
  try {
    loading.value = true
    const response = await axios.get('/api/users/me')
    user.value = response.data.user
  } catch (error) {
    console.error('Error fetching user profile:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchUserProfile()
})
</script>