import { defineStore } from 'pinia'
import { ref, computed, watch, readonly } from 'vue'
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

  // Create computed properties for easy access
  const userTimezoneDisplay = computed(() => {
    return timezoneInfo.value?.label || 'Asia/Tashkent (UTC+5) - Uzbekistan'
  })

  const userCurrentTime = computed(() => {
    if (!timezoneInfo.value?.currentTime) return null
    const date = new Date(timezoneInfo.value.currentTime)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  })

  const formatTimeInUserTimezone = (utcTimeString) => {
    if (!timezoneInfo.value || !utcTimeString) return utcTimeString
    
    try {
      const utcDate = new Date(utcTimeString)
      const userOffset = timezoneInfo.value.offset || 0
      const localHour = (utcDate.getUTCHours() + userOffset + 24) % 24
      const localMinute = utcDate.getUTCMinutes()
      
      const period = localHour >= 12 ? 'PM' : 'AM'
      const displayHours = localHour % 12 || 12
      const displayMinutes = localMinute.toString().padStart(2, '0')
      
      return `${displayHours}:${displayMinutes} ${period}`
    } catch (error) {
      console.error('Error formatting time:', error)
      return utcTimeString
    }
  }

  async function fetchUserTimezoneInfo() {
    if (!user.value?.timezone) return

    try {
      timezoneLoading.value = true
      const [region, city] = user.value.timezone.split('/')
      const response = await axios.get(`/api/timezones/info/${region}/${city}`)
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
    timezoneInfo.value = null
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
    userTimezoneDisplay: readonly(userTimezoneDisplay),
    userCurrentTime: readonly(userCurrentTime),
    formatTimeInUserTimezone,
    fetchUserTimezoneInfo
  }
})