<template>
  <div class="min-h-screen">
    <nav-bar v-if="showNavBar" />
    <main>
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
    <app-footer v-if="showFooter" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import NavBar from '@/components/layout/NavBar.vue'
import AppFooter from '@/components/layout/AppFooter.vue'

const route = useRoute()

const showNavBar = computed(() => !route.meta.hideNavBar)
const showFooter = computed(() => !route.meta.hideFooter)
</script>

<style>
/* Global medical design styles */
.medical-gradient {
  background: linear-gradient(135deg, #f0f9ff 0%, #ecfdf5 25%, #f0f9ff 50%, #e0f2fe 75%, #f0f9ff 100%);
}

.pulse-animation {
  animation: pulse 3s ease-in-out infinite;
}

.float-medical {
  animation: floatMedical 4s ease-in-out infinite;
}

@keyframes floatMedical {

  0%,
  100% {
    transform: translateY(0px) rotate(0deg);
  }

  25% {
    transform: translateY(-10px) rotate(1deg);
  }

  50% {
    transform: translateY(-15px) rotate(0deg);
  }

  75% {
    transform: translateY(-10px) rotate(-1deg);
  }
}

.slide-in {
  animation: slideIn 1.2s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(50px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.glow-effect {
  box-shadow: 0 20px 40px rgba(14, 165, 233, 0.15);
}

.card-hover {
  transition: all 0.3s ease;
}

.card-hover:hover {
  transform: translateY(-5px);
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.1);
}

.heartbeat {
  animation: heartbeat 2s ease-in-out infinite;
}

@keyframes heartbeat {

  0%,
  100% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.1);
  }
}

/* Custom medical button styles */
.btn-medical-primary {
  @apply px-8 py-4 bg-gradient-to-r from-medical-blue to-medical-teal text-white font-semibold rounded-2xl hover:from-medical-teal hover:to-medical-blue focus:ring-4 focus:ring-medical-blue/30 transition-all shadow-lg;
  box-shadow: 0 20px 40px rgba(14, 165, 233, 0.15);
}

.btn-medical-secondary {
  @apply px-8 py-4 bg-white/90 backdrop-blur-sm text-medical-blue font-semibold rounded-2xl hover:bg-white focus:ring-4 focus:ring-medical-blue/30 transition-all shadow-lg border-2 border-medical-blue/20;
}

/* Page transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>