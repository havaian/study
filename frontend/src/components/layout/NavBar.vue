<template>
    <nav class="bg-white shadow relative z-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-20">
                <!-- Logo and desktop navigation -->
                <div class="flex">
                    <div class="flex-shrink-0 flex items-center">
                        <router-link to="/" class="flex items-center">
                            <img src="/images/logo-tagline.png" alt="E-Polyclinic" class="h-12 w-auto" />
                        </router-link>
                    </div>
                    <div class="hidden sm:ml-8 sm:flex sm:space-x-8">
                        <router-link to="/" class="inline-flex items-center px-2 pt-2 text-lg font-medium text-gray-900"
                            :class="{ 'border-b-2 border-indigo-500': route.path === '/' }">
                            Home
                        </router-link>
                        <router-link to="/doctors"
                            class="inline-flex items-center px-2 pt-2 text-lg font-medium text-gray-500 hover:text-gray-900"
                            :class="{ 'border-b-2 border-indigo-500': route.path === '/doctors' }">
                            Find Doctors
                        </router-link>
                        <template v-if="authStore.isAuthenticated">
                            <router-link v-if="authStore.isPatient" to="/appointments/patient"
                                class="inline-flex items-center px-2 pt-2 text-lg font-medium text-gray-500 hover:text-gray-900"
                                :class="{ 'border-b-2 border-indigo-500': route.path === '/appointments/patient' }">
                                My Appointments
                            </router-link>
                            <router-link v-if="authStore.isDoctor" to="/appointments/doctor"
                                class="inline-flex items-center px-2 pt-2 text-lg font-medium text-gray-500 hover:text-gray-900"
                                :class="{ 'border-b-2 border-indigo-500': route.path === '/appointments/doctor' }">
                                My Schedule
                            </router-link>
                            <router-link to="/chat/assistant"
                                class="inline-flex items-center px-2 pt-2 text-lg font-medium text-gray-500 hover:text-gray-900"
                                :class="{ 'border-b-2 border-indigo-500': route.path === '/chat/assistant' }">
                                AI Assistant
                            </router-link>
                        </template>
                    </div>
                </div>

                <!-- Mobile menu button -->
                <div class="flex items-center sm:hidden">
                    <button @click="toggleMobileMenu" type="button" 
                        class="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                        aria-controls="mobile-menu" aria-expanded="false">
                        <span class="sr-only">Open main menu</span>
                        <!-- Icon when menu is closed -->
                        <svg v-if="!mobileMenuOpen" class="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                        <!-- Icon when menu is open -->
                        <svg v-else class="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <!-- Desktop profile menu -->
                <div class="hidden sm:flex sm:items-center">
                    <template v-if="authStore.isAuthenticated">
                        <div class="relative">
                            <button @click="toggleProfileMenu"
                                class="flex items-center space-x-3 px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors">
                                <span class="text-sm font-medium text-gray-700">{{ authStore.user?.firstName }}</span>
                                <svg class="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24"
                                    stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                            <div v-if="showProfileMenu"
                                class="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-100">
                                <div class="py-1">
                                    <router-link :to="authStore.isDoctor ? '/doctor-profile' : '/profile'"
                                        class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                        My Profile
                                    </router-link>
                                </div>
                                <div class="py-1">
                                    <button @click="logout"
                                        class="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100">
                                        Sign out
                                    </button>
                                </div>
                            </div>
                        </div>
                    </template>
                    <template v-else>
                        <router-link to="/login"
                            class="ml-3 inline-flex items-center px-6 py-4 border border-transparent text-lg font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
                            Sign in
                        </router-link>
                    </template>
                </div>
            </div>
        </div>

        <!-- Mobile menu, show/hide based on menu state -->
        <div v-if="mobileMenuOpen" class="sm:hidden" id="mobile-menu">
            <div class="pt-2 pb-3 space-y-1">
                <router-link to="/"
                    class="block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
                    :class="route.path === '/' ? 
                        'border-indigo-500 text-indigo-700 bg-indigo-50' : 
                        'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'">
                    Home
                </router-link>
                <router-link to="/doctors"
                    class="block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
                    :class="route.path.includes('/doctors') ? 
                        'border-indigo-500 text-indigo-700 bg-indigo-50' : 
                        'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'">
                    Find Doctors
                </router-link>
                <template v-if="authStore.isAuthenticated">
                    <router-link v-if="authStore.isPatient" to="/appointments/patient"
                        class="block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
                        :class="route.path.includes('/appointments/patient') ? 
                            'border-indigo-500 text-indigo-700 bg-indigo-50' : 
                            'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'">
                        My Appointments
                    </router-link>
                    <router-link v-if="authStore.isDoctor" to="/appointments/doctor"
                        class="block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
                        :class="route.path.includes('/appointments/doctor') ? 
                            'border-indigo-500 text-indigo-700 bg-indigo-50' : 
                            'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'">
                        My Schedule
                    </router-link>
                    <router-link to="/chat/assistant"
                        class="block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
                        :class="route.path.includes('/chat/assistant') ? 
                            'border-indigo-500 text-indigo-700 bg-indigo-50' : 
                            'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'">
                        AI Assistant
                    </router-link>
                </template>
            </div>

            <!-- Mobile profile menu -->
            <div class="pt-4 pb-3 border-t border-gray-200">
                <template v-if="authStore.isAuthenticated">
                    <div class="flex items-center px-4">
                        <div class="flex-shrink-0">
                            <img class="h-10 w-10 rounded-full" 
                                :src="authStore.user?.profilePicture || '/images/user-placeholder.jpg'" 
                                :alt="authStore.user?.firstName" />
                        </div>
                        <div class="ml-3">
                            <div class="text-base font-medium text-gray-800">
                                {{ authStore.user?.firstName }} {{ authStore.user?.lastName }}
                            </div>
                            <div class="text-sm font-medium text-gray-500">
                                {{ authStore.user?.email }}
                            </div>
                        </div>
                    </div>
                    <div class="mt-3 space-y-1">
                        <router-link :to="authStore.isDoctor ? '/doctor-profile' : '/profile'"
                            class="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100">
                            My Profile
                        </router-link>
                        <button @click="logout"
                            class="block w-full text-left px-4 py-2 text-base font-medium text-red-600 hover:text-red-800 hover:bg-gray-100">
                            Sign out
                        </button>
                    </div>
                </template>
                <template v-else>
                    <div class="px-4">
                        <router-link to="/login"
                            class="block py-2 text-base font-medium text-indigo-600 hover:text-indigo-800">
                            Sign in
                        </router-link>
                        <router-link to="/register"
                            class="block py-2 text-base font-medium text-gray-700 hover:text-gray-900">
                            Register
                        </router-link>
                    </div>
                </template>
            </div>
        </div>
    </nav>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const showProfileMenu = ref(false)
const mobileMenuOpen = ref(false)

function toggleProfileMenu() {
    showProfileMenu.value = !showProfileMenu.value
}

function toggleMobileMenu() {
    mobileMenuOpen.value = !mobileMenuOpen.value
}

function handleClickOutside(event) {
    const menu = document.querySelector('.relative')
    if (menu && !menu.contains(event.target)) {
        showProfileMenu.value = false
    }
}

async function logout() {
    authStore.logout()
    showProfileMenu.value = false
    mobileMenuOpen.value = false
    router.push('/login')
}

onMounted(() => {
    document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
})
</script>