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
/* Global educational design styles */
.educational-gradient {
  background: linear-gradient(135deg, #f0f9ff 0%, #ecfdf5 25%, #f0f9ff 50%, #e0f2fe 75%, #f0f9ff 100%);
}

.pulse-animation {
  animation: pulse 3s ease-in-out infinite;
}

.float-educational {
  animation: floatEducational 4s ease-in-out infinite;
}

body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11';
}

/* Academic heading style */
.academic-heading {
    font-weight: 800;
    letter-spacing: -0.025em;
    line-height: 1.1;
}

/* Scholarly text style */
.scholarly-text {
    font-weight: 500;
    letter-spacing: 0.01em;
    line-height: 1.6;
}

@keyframes floatEducational {

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

/* Custom educational button styles */
.btn-educational-primary {
  @apply px-8 py-4 bg-gradient-to-r from-educational-blue to-educational-purple text-white font-semibold rounded-2xl hover:from-educational-teal hover:to-educational-blue focus:ring-4 focus:ring-educational-blue/30 transition-all shadow-lg;
  box-shadow: 0 20px 40px rgba(14, 165, 233, 0.15);
}

.btn-educational-secondary {
  @apply px-8 py-4 bg-white/90 backdrop-blur-sm text-educational-blue font-semibold rounded-2xl hover:bg-white focus:ring-4 focus:ring-educational-blue/30 transition-all shadow-lg border-2 border-educational-blue/20;
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