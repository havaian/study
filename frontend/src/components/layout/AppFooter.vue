<template>
  <footer class="bg-gradient-to-r from-gray-900 to-gray-800 text-white">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
        <!-- Logo and Description -->
        <div class="col-span-1 md:col-span-2">
          <div class="flex items-center space-x-3 mb-6">
            <div>
              <p class="text-sm text-gray-400">Available</p>
              <p class="text-white">24/7 Support</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Section -->
      <div class="border-t border-gray-700 pt-8 flex flex-col md:flex-row justify-between items-center">
        <div class="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-6">
          <p class="text-gray-400 text-sm">
            © {{ new Date().getFullYear() }} ONLINE-POLYCLINIC.COM. All rights reserved.
          </p>
          <div class="flex space-x-6">
            <a href="#" class="text-gray-400 hover:text-medical-blue text-sm transition-colors duration-200">Privacy Policy</a>
            <a href="#" class="text-gray-400 hover:text-medical-blue text-sm transition-colors duration-200">Terms of Service</a>
            <a href="#" class="text-gray-400 hover:text-medical-blue text-sm transition-colors duration-200">HIPAA Compliance</a>
          </div>
        </div>
        
        <!-- Trust Badges -->
        <div class="flex items-center space-x-4 mt-4 md:mt-0">
          <div class="flex items-center space-x-2 bg-gray-800 rounded-lg px-3 py-2">
            <svg class="w-4 h-4 text-medical-green" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            <span class="text-xs text-gray-300">SSL Secured</span>
          </div>
          <div class="flex items-center space-x-2 bg-gray-800 rounded-lg px-3 py-2">
            <svg class="w-4 h-4 text-medical-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
            <span class="text-xs text-gray-300">HIPAA Compliant</span>
          </div>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup>
// No additional logic needed for the footer component
</script>