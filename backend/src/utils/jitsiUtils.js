const jwt = require('jsonwebtoken');

/**
 * Utility functions for Jitsi Meet integration
 */
class JitsiUtils {
    /**
 * Generate a JWT token for Jitsi Meet
 * @param {String} roomName - The room name to join
 * @param {Object} user - User object with id, name, and role
 * @param {Object} options - Additional options like participant limits
 * @returns {String} JWT token
 */
    static generateJitsiToken(roomName, user, options = {}) {
        if (!process.env.JITSI_APP_ID || !process.env.JITSI_SECRET) {
            throw new Error('Jitsi configuration missing in environment variables');
        }

        const payload = {
            context: {
                user: {
                    id: user.id,
                    name: user.name,
                    avatar: user.avatar || '',
                    email: user.email || '',
                    role: user.role
                },
                features: {
                    livestreaming: false,
                    recording: false,
                    transcription: false,
                    outbound_call: false
                },
                room: {
                    regex: false,
                    maxParticipants: options.maxParticipants || 2,
                    allowedParticipants: options.allowedParticipants || []
                }
            },
            aud: process.env.JITSI_APP_ID,
            iss: process.env.JITSI_APP_ID,
            sub: process.env.JITSI_SERVER_URL,
            room: roomName,
            exp: Math.floor(Date.now() / 1000) + 60 * 60 // Token expires in 1 hour
        };

        return jwt.sign(payload, process.env.JITSI_SECRET);
    }

    /**
     * Generate a unique room name for a consultation
     * @param {String} appointmentId - Appointment ID
     * @returns {String} Room name
     */
    static generateRoomName(appointmentId) {
        // Create a deterministic but secure room name
        const crypto = require('crypto');
        const secret = process.env.JITSI_SECRET || 'default-secret';

        // Create a hash of the appointment ID with the secret
        const hash = crypto
            .createHmac('sha256', secret)
            .update(appointmentId)
            .digest('hex');

        // Use a portion of the hash to create a room name
        return `epolyclinic-${hash.substring(0, 12)}`;
    }

    /**
     * Generate Jitsi configuration for a consultation
     * @param {String} appointmentId - Appointment ID
     * @param {Object} user - User object with id, name, and role
     * @returns {Object} Jitsi configuration
     */
    static getJitsiConfig(appointmentId, user) {
        const roomName = this.generateRoomName(appointmentId);
        const token = this.generateJitsiToken(roomName, user);

        return {
            roomName,
            domain: new URL(process.env.JITSI_SERVER_URL).hostname,
            token,
            serverURL: process.env.JITSI_SERVER_URL
        };
    }
}

module.exports = JitsiUtils;