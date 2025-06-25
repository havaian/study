<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="space-y-8">
      <!-- Search and filters -->
      <div class="bg-white shadow rounded-lg p-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label for="search" class="label">Search by name</label>
            <input id="search" v-model="filters.name" type="text" class="input mt-1" placeholder="Search doctors..."
              @input="handleSearch" />
          </div>
          <div>
            <label for="specializations" class="label">Specialization</label>
            <select id="specializations" v-model="filters.specializations" class="input mt-1" @change="handleSearch">
              <option value="">All Specializations</option>
              <option v-for="spec in specializations" :key="spec" :value="spec">
                {{ spec }}
              </option>
            </select>
          </div>
          <div>
            <label for="city" class="label">City</label>
            <select id="city" v-model="filters.city" class="input mt-1" @change="handleSearch">
              <option value="">All Cities</option>
              <option v-for="city in cities" :key="city" :value="city">
                {{ city }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <!-- Doctor list -->
      <div class="space-y-4">
        <div v-if="loading" class="text-center py-8">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent">
          </div>
          <p class="mt-2 text-gray-600">Loading doctors...</p>
        </div>

        <template v-else>
          <div v-if="doctors.length === 0" class="text-center py-8">
            <p class="text-gray-600">No doctors found matching your criteria.</p>
          </div>

          <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div v-for="doctor in doctors" :key="doctor._id" class="bg-white shadow rounded-lg overflow-hidden">
              <div class="p-6">
                <div class="flex items-center space-x-4">
                  <img :src="doctor.profilePicture || '/images/user-placeholder.jpg'" :alt="doctor.firstName"
                    class="h-16 w-16 rounded-full object-cover" />
                  <div>
                    <h3 class="text-lg font-medium text-gray-900">
                      Dr. {{ doctor.firstName }} {{ doctor.lastName }}
                    </h3>
                    <div class="mt-2 flex flex-wrap gap-2 justify-center sm:justify-start">
                      <span v-for="spec in doctor.specializations" :key="spec"
                        class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        {{ spec }}
                      </span>
                    </div>
                  </div>
                </div>

                <div class="mt-4 space-y-2">
                  <p class="text-sm">
                    <span class="font-medium">Experience:</span>
                    {{ doctor.experience }} years
                  </p>
                  <p class="text-sm">
                    <span class="font-medium">Consultation Fee:</span>
                    {{ formatCurrency(doctor.consultationFee) }} {{ doctor.consultationFee.currency || 'UZS' }}
                  </p>
                  <p class="text-sm">
                    <span class="font-medium">Languages:</span>
                    {{ doctor.languages?.join(', ') || 'Not specified' }}
                  </p>
                </div>

                <div class="mt-6">
                  <router-link :to="{ name: 'doctor-profile-view', params: { id: doctor._id } }"
                    class="btn-primary w-full justify-center">
                    View Profile
                  </router-link>
                </div>
              </div>
            </div>
          </div>

          <!-- Pagination -->
          <div v-if="totalPages > 1" class="flex justify-center space-x-2 mt-8">
            <button v-for="page in totalPages" :key="page" class="btn-secondary"
              :class="{ 'bg-indigo-600 text-white': currentPage === page }" @click="handlePageChange(page)">
              {{ page }}
            </button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'

const router = useRouter()

const specializations = [
  'Cardiology',
  'Dermatology',
  'Endocrinology',
  'Family Medicine',
  'Gastroenterology',
  'Neurology',
  'Obstetrics & Gynecology',
  'Ophthalmology',
  'Pediatrics',
  'Psychiatry',
  'Pulmonology',
  'Urology'
]

const cities = [
  'Tashkent',
  'Namangan',
  'Andijan',
  'Fergana',
  'Samarkand',
  'Bukhara'
]

const doctors = ref([])
const loading = ref(false)
const currentPage = ref(1)
const totalPages = ref(1)
const filters = reactive({
  name: '',
  specializations: '',
  city: ''
})

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('uz-UZ').format(amount)
}

async function fetchDoctors() {
  try {
    loading.value = true
    const params = {
      page: currentPage.value,
      limit: 9,
      ...filters
    }

    const response = await axios.get('/api/users/doctors', { params })
    doctors.value = response.data.doctors
    totalPages.value = Math.ceil(response.data.pagination.total / response.data.pagination.limit)
  } catch (error) {
    console.error('Error fetching doctors:', error)
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  currentPage.value = 1
  fetchDoctors()
}

function handlePageChange(page) {
  currentPage.value = page
  fetchDoctors()
}

onMounted(() => {
  fetchDoctors()
})
</script>