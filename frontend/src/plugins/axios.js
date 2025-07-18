import axios from 'axios'
import { useAuthStore } from '@/stores/auth'

axios.defaults.baseURL = 'https://dev.e-stud.uz'; 

axios.interceptors.request.use(config => {
  const authStore = useAuthStore()
  if (authStore.token) {
    config.headers.Authorization = `Bearer ${authStore.token}`
  }
  return config
})

axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      const authStore = useAuthStore()
      
      // CRITICAL: Only redirect if we're NOT already on the login page
      // and if the request was NOT a login attempt
      const isLoginAttempt = error.config.url?.includes('/api/users/login')
      const isOnLoginPage = router.currentRoute.value.path === '/login'
      
      if (!isLoginAttempt && !isOnLoginPage) {
        // This is an expired token scenario - logout and redirect
        authStore.logout()
        router.push('/login')
      }
    }
    return Promise.reject(error)
  }
)

export default axios