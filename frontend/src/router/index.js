import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import Home from '@/views/Home.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home
    },
    // Auth routes
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/auth/Login.vue'),
      meta: {
        requiresGuest: true
      }
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/auth/Register.vue'),
      meta: {
        requiresGuest: true
      }
    },
    {
      path: '/verify-email/:token',
      name: 'verify-email',
      component: () => import('@/views/auth/VerifyEmail.vue'),
      meta: {
        requiresGuest: true
      }
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: () => import('@/views/auth/ForgotPassword.vue')
    },
    {
      path: '/reset-password/:token',
      name: 'reset-password',
      component: () => import('@/views/auth/ResetPassword.vue')
    },
    // Profile routes
    {
      path: '/profile/student',
      name: 'student-profile',
      component: () => import('@/views/profile/StudentProfile.vue'),
      meta: {
        requiresAuth: true,
        requiresStudent: true
      }
    },
    {
      path: '/profile/teacher',
      name: 'teacher-profile',
      component: () => import('@/views/profile/TeacherProfile.vue'),
      meta: {
        requiresAuth: true,
        requiresTeacher: true
      }
    },
    {
      path: '/profile/edit',
      name: 'profile-edit',
      component: () => import('@/views/profile/EditProfile.vue'),
      meta: {
        requiresAuth: true
      }
    },
    // Teacher routes
    {
      path: '/teachers',
      name: 'teacher-list',
      component: () => import('@/views/teachers/TeacherList.vue')
    },
    {
      path: '/teachers/:id',
      name: 'teacher-profile-view',
      component: () => import('@/views/teachers/TeacherProfile.vue')
    },
    // Appointment routes
    {
      path: '/appointments/book/:teacherId',
      name: 'book-appointment',
      component: () => import('@/views/appointments/BookAppointment.vue'),
      meta: {
        requiresAuth: true,
        requiresStudent: true
      }
    },
    {
      path: '/appointments/student',
      name: 'student-appointments',
      component: () => import('@/views/appointments/StudentAppointments.vue'),
      meta: {
        requiresAuth: true,
        requiresStudent: true
      }
    },
    {
      path: '/appointments/teacher',
      name: 'teacher-appointments',
      component: () => import('@/views/appointments/TeacherAppointments.vue'),
      meta: {
        requiresAuth: true,
        requiresTeacher: true
      }
    },
    {
      path: '/appointments/:id',
      name: 'appointment-details',
      component: () => import('@/views/appointments/AppointmentDetails.vue'),
      meta: {
        requiresAuth: true
      }
    },
    // Payment routes
    {
      path: '/payment/success',
      name: 'payment-success',
      component: () => import('@/views/payments/PaymentSuccess.vue'),
      meta: {
        requiresAuth: true
      }
    },
    {
      path: '/payment/cancel',
      name: 'payment-cancel',
      component: () => import('@/views/payments/PaymentCancel.vue'),
      meta: {
        requiresAuth: true
      }
    },
    // Chat routes
    {
      path: '/chat',
      name: 'chat-inbox',
      component: () => import('@/views/chat/ChatInbox.vue'),
      meta: {
        requiresAuth: true
      }
    },
    {
      path: '/chat/:id',
      name: 'chat-conversation',
      component: () => import('@/views/chat/ChatConversation.vue'),
      meta: {
        requiresAuth: true
      }
    },
    {
      path: '/chat/new/:userId',
      name: 'chat-new',
      component: () => import('@/views/chat/ChatConversation.vue'),
      meta: {
        requiresAuth: true
      }
    },
    // AI Assistant chat route
    {
      path: '/chat/assistant',
      name: 'ai-assistant',
      component: () => import('@/views/chat/AiAssistant.vue'),
      meta: {
        requiresAuth: true
      }
    },
    // Lesson routes
    {
      path: '/lesson/:appointmentId',
      name: 'lesson-room',
      component: () => import('@/views/lessons/LessonRoom.vue'),
      meta: {
        requiresAuth: true,
        hideNavBar: true,
        hideFooter: true
      }
    },
    // Error routes
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFound.vue')
    }
  ]
})

// Navigation guards
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login')
  } else if (to.meta.requiresGuest && authStore.isAuthenticated) {
    next('/')
  } else if (to.meta.requiresStudent && !authStore.isStudent) {
    next('/')
  } else if (to.meta.requiresTeacher && !authStore.isTeacher) {
    next('/')
  } else {
    next()
  }
})

export default router