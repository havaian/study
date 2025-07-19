import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import axios from 'axios'

export const useAuthStore = defineStore('auth', () => {
  // Initialize state from localStorage
  const user = ref(JSON.parse(localStorage.getItem('user')) || null)
  const token = ref(localStorage.getItem('token'))

  const isAuthenticated = computed(() => !!token.value)
  const isTeacher = computed(() => user.value?.role === 'teacher')
  const isStudent = computed(() => user.value?.role === 'student')

  const timezoneInfo = ref(null)
  const timezoneLoading = ref(false)

  async function fetchUserTimezoneInfo() {
    if (!user.value?.timezone) return

    try {
      timezoneLoading.value = true
      const response = await axios.get(`/api/timezones/${user.value.timezone}`)
      if (response.data.success) {
        timezoneInfo.value = response.data.timezone
      }
    } catch (error) {
      console.error('Error fetching user timezone info:', error)
      timezoneInfo.value = null
    } finally {
      timezoneLoading.value = false
    }
  }

  // Watch for timezone changes
  watch(
    () => user.value?.timezone,
    async (newTimezone, oldTimezone) => {
      if (newTimezone && newTimezone !== oldTimezone) {
        await fetchUserTimezoneInfo()
      }
    }
  )

  // Fetch timezone info if user is already logged in (from localStorage)
  if (user.value?.timezone) {
    fetchUserTimezoneInfo()
  }

  async function login(email, password) {
    try {
      const response = await axios.post('/api/users/login', { email, password })
      token.value = response.data.token
      user.value = response.data.user

      await fetchUserTimezoneInfo()

      // Persist to localStorage
      localStorage.setItem('token', token.value)
      localStorage.setItem('user', JSON.stringify(user.value))

      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  }

  async function register(userData) {
    try {
      const response = await axios.post('/api/users/register', userData)
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  }

  function logout() {
    user.value = null
    token.value = null
    timezoneInfo.value = null // Clear timezone info on logout
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  return {
    user,
    token,
    isAuthenticated,
    isTeacher,
    isStudent,
    login,
    register,
    logout,
    timezoneInfo: readonly(timezoneInfo),
    timezoneLoading: readonly(timezoneLoading),
    fetchUserTimezoneInfo
  }
})