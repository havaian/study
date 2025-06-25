const cron = require('node-cron');
const User = require('../user/model');
const crypto = require('crypto');

/**
 * Schedule job to rotate JWT secrets for users
 * This enhances security by periodically changing the JWT secrets
 * users need to reauthenticate after their tokens expire
 */
const scheduleJwtSecretRotation = () => {
    // Run weekly at midnight on Sunday
    cron.schedule('0 0 * * 0', async () => {
        try {
            console.log('Running JWT secret rotation job...');

            const monthAgo = new Date();
            monthAgo.setMonth(monthAgo.getMonth() - 1);

            // Find users whose JWT secrets are older than 1 month
            const usersToUpdate = await User.find({
                jwtSecretCreatedAt: { $lt: monthAgo }
            });

            console.log(`Found ${usersToUpdate.length} users that need JWT secret rotation`);

            // Update JWT secrets
            for (const user of usersToUpdate) {
                // Generate new JWT secret
                user.jwtSecret = crypto.randomBytes(32).toString('hex');
                user.jwtSecretCreatedAt = new Date();

                await user.save();
                console.log(`Rotated JWT secret for user ${user._id}`);
            }

            console.log('JWT secret rotation completed');
        } catch (error) {
            console.error('Error in JWT secret rotation job:', error);
        }
    }, {
        timezone: 'Asia/Tashkent' // Adjust timezone as needed
    });
};

module.exports = scheduleJwtSecretRotation;