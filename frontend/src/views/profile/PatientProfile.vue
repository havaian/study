<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="bg-white shadow rounded-lg overflow-hidden">
      <!-- Profile Header -->
      <div class="p-6 sm:p-8 border-b border-gray-200">
        <div class="flex flex-col sm:flex-row items-center">
          <img :src="user?.profilePicture || 'https://via.placeholder.com/150'" :alt="user?.firstName"
            class="h-32 w-32 rounded-full object-cover" />
          <div class="mt-4 sm:mt-0 sm:ml-6 text-center sm:text-left">
            <h1 class="text-2xl font-bold text-gray-900">
              {{ user?.firstName }} {{ user?.lastName }}
            </h1>
            <p class="text-gray-600">Patient</p>
          </div>
        </div>
      </div>

      <!-- Profile Content -->
      <div class="p-6 sm:p-8">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Personal Information -->
          <div>
            <h2 class="text-lg font-medium text-gray-900 mb-4">Personal Information</h2>
            <dl class="space-y-4">
              <div>
                <dt class="text-sm font-medium text-gray-500">Email</dt>
                <dd class="mt-1 text-gray-900">{{ user?.email }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500">Phone</dt>
                <dd class="mt-1 text-gray-900">{{ user?.phone }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500">Date of Birth</dt>
                <dd class="mt-1 text-gray-900">{{ formatDate(user?.dateOfBirth) }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500">Gender</dt>
                <dd class="mt-1 text-gray-900">{{ formatGender(user?.gender) }}</dd>
              </div>
            </dl>
          </div>

          <!-- Medical History -->
          <div>
            <h2 class="text-lg font-medium text-gray-900 mb-4">Medical History</h2>
            <dl class="space-y-4">
              <div>
                <dt class="text-sm font-medium text-gray-500">Allergies</dt>
                <dd class="mt-1 text-gray-900">
                  <ul v-if="user?.medicalHistory?.allergies?.length" class="list-disc list-inside">
                    <li v-for="allergy in user.medicalHistory.allergies" :key="allergy">
                      {{ allergy }}
                    </li>
                  </ul>
                  <span v-else class="text-gray-500">None reported</span>
                </dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500">Chronic Conditions</dt>
                <dd class="mt-1 text-gray-900">
                  <ul v-if="user?.medicalHistory?.chronicConditions?.length" class="list-disc list-inside">
                    <li v-for="condition in user.medicalHistory.chronicConditions" :key="condition">
                      {{ condition }}
                    </li>
                  </ul>
                  <span v-else class="text-gray-500">None reported</span>
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <!-- Emergency Contact -->
        <div class="mt-8">
          <h2 class="text-lg font-medium text-gray-900 mb-4">Emergency Contact</h2>
          <dl class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <dt class="text-sm font-medium text-gray-500">Name</dt>
              <dd class="mt-1 text-gray-900">{{ user?.emergencyContact?.name || 'Not provided' }}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-gray-500">Relationship</dt>
              <dd class="mt-1 text-gray-900">{{ user?.emergencyContact?.relationship || 'Not provided' }}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-gray-500">Phone</dt>
              <dd class="mt-1 text-gray-900">{{ user?.emergencyContact?.phone || 'Not provided' }}</dd>
            </div>
          </dl>
        </div>

        <!-- Edit Profile Button -->
        <div class="mt-8 flex justify-end">
          <router-link :to="{ name: 'profile-edit' }" class="btn-primary">
            Edit Profile
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { format } from 'date-fns'
import axios from 'axios'

const authStore = useAuthStore()
const user = ref(null)

const formatDate = (date) => {
  if (!date) return 'Not provided'
  return format(new Date(date), 'MMMM d, yyyy')
}

const formatGender = (gender) => {
  if (!gender) return 'Not specified'
  return gender.charAt(0).toUpperCase() + gender.slice(1)
}

async function fetchUserProfile() {
  try {
    const response = await axios.get('/api/users/me')
    user.value = response.data.user
  } catch (error) {
    console.error('Error fetching user profile:', error)
  }
}

onMounted(() => {
  fetchUserProfile()
})
</script>