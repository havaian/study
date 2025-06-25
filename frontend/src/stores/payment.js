import { defineStore } from 'pinia'
import { ref } from 'vue'
import { loadStripe } from '@stripe/stripe-js'
import axios from 'axios'

export const usePaymentStore = defineStore('payment', () => {
    const stripe = ref(null)
    const loading = ref(false)
    const error = ref(null)

    async function initializeStripe() {
        try {
            if (!stripe.value) {
                stripe.value = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
            }
            return stripe.value
        } catch (err) {
            console.error('Error initializing Stripe:', err)
            throw err
        }
    }

    async function createCheckoutSession(appointmentId) {
        try {
            loading.value = true
            error.value = null

            const response = await axios.post('/api/payments/create-checkout', {
                appointmentId
            })

            // Redirect to Stripe Checkout
            window.location.href = response.data.checkoutUrl
        } catch (err) {
            error.value = err.response?.data?.message || 'Failed to create checkout session'
            throw error.value
        } finally {
            loading.value = false
        }
    }

    async function verifyPayment(sessionId) {
        try {
            loading.value = true
            error.value = null

            const response = await axios.get(`/api/payments/session/${sessionId}`)
            return response.data
        } catch (err) {
            error.value = err.response?.data?.message || 'Failed to verify payment'
            throw error.value
        } finally {
            loading.value = false
        }
    }

    return {
        loading,
        error,
        initializeStripe,
        createCheckoutSession,
        verifyPayment
    }
})