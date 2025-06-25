<template>
    <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div class="max-w-md w-full text-center">
            <div class="rounded-full bg-red-100 h-24 w-24 flex items-center justify-center mx-auto">
                <svg class="h-12 w-12 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </div>

            <h2 class="mt-6 text-3xl font-extrabold text-gray-900">
                Payment Cancelled
            </h2>
            <p class="mt-2 text-sm text-gray-600">
                Your payment was not completed. No charges were made to your account.
            </p>

            <div class="mt-8 space-y-4">
                <router-link :to="{ name: 'patient-appointments' }" class="btn-primary w-full justify-center">
                    Return to Appointments
                </router-link>

                <router-link to="/" class="btn-secondary w-full justify-center">
                    Go Home
                </router-link>
            </div>
        </div>
    </div>
</template> 