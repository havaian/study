// src/timezones/routes.js
const express = require('express');
const User = require('../user/model');
const router = express.Router();

/**
 * Get all supported timezones with display names and offsets
 * GET /api/timezones
 */
router.get('/', (req, res) => {
    try {
        // Get all supported timezones from the User model
        const supportedTimezones = User.getSupportedTimezones();
        
        // Create timezone data with display names and offsets
        const timezoneData = supportedTimezones.map(timezone => {
            // Create a temporary user instance to access timezone methods
            const tempUser = new User({ timezone });
            
            return {
                value: timezone,
                label: tempUser.getTimezoneDisplayName(),
                offset: tempUser.getTimezoneOffset(),
                region: getTimezoneRegion(timezone)
            };
        });

        // Sort timezones by offset for better UX
        timezoneData.sort((a, b) => a.offset - b.offset);

        res.status(200).json({
            success: true,
            timezones: timezoneData,
            total: timezoneData.length
        });
    } catch (error) {
        console.error('Error fetching timezones:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch timezone data',
            error: error.message
        });
    }
});

/**
 * Get timezones grouped by region
 * GET /api/timezones/grouped/regions
 */
router.get('/grouped/regions', (req, res) => {
    try {
        const supportedTimezones = User.getSupportedTimezones();
        
        const timezonesByRegion = supportedTimezones.reduce((acc, timezone) => {
            const tempUser = new User({ timezone });
            const region = getTimezoneRegion(timezone);
            
            if (!acc[region]) {
                acc[region] = [];
            }
            
            acc[region].push({
                value: timezone,
                label: tempUser.getTimezoneDisplayName(),
                offset: tempUser.getTimezoneOffset()
            });
            
            return acc;
        }, {});

        // Sort timezones within each region by offset
        Object.keys(timezonesByRegion).forEach(region => {
            timezonesByRegion[region].sort((a, b) => a.offset - b.offset);
        });

        res.status(200).json({
            success: true,
            timezonesByRegion,
            regions: Object.keys(timezonesByRegion).sort()
        });
    } catch (error) {
        console.error('Error fetching grouped timezones:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch grouped timezone data',
            error: error.message
        });
    }
});

/**
 * Convert time between timezones
 * POST /api/timezones/convert
 * Body: { fromTimezone, toTimezone, dateTime }
 */
router.post('/convert', (req, res) => {
    try {
        const { fromTimezone, toTimezone, dateTime } = req.body;
        
        if (!fromTimezone || !toTimezone || !dateTime) {
            return res.status(400).json({
                success: false,
                message: 'fromTimezone, toTimezone, and dateTime are required'
            });
        }

        const supportedTimezones = User.getSupportedTimezones();
        if (!supportedTimezones.includes(fromTimezone) || !supportedTimezones.includes(toTimezone)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid timezone provided'
            });
        }

        // Create temporary user instances for conversion
        const fromUser = new User({ timezone: fromTimezone });
        const toUser = new User({ timezone: toTimezone });

        // Convert from source timezone to UTC, then to target timezone
        const utcTime = fromUser.convertLocalTimeToUTC(dateTime);
        const convertedTime = toUser.convertUTCToLocalTime(utcTime);

        res.status(200).json({
            success: true,
            conversion: {
                originalTime: dateTime,
                fromTimezone: {
                    value: fromTimezone,
                    label: fromUser.getTimezoneDisplayName()
                },
                toTimezone: {
                    value: toTimezone,
                    label: toUser.getTimezoneDisplayName()
                },
                convertedTime: convertedTime.toISOString(),
                utcTime: utcTime.toISOString()
            }
        });
    } catch (error) {
        console.error('Error converting timezone:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to convert timezone',
            error: error.message
        });
    }
});

/**
 * Get timezone information by timezone ID
 * GET /api/timezones/info/:timezoneId
 * This route handles URL-encoded timezone names like Asia%2FTashkent
 */
router.get('/info/:region/:city', (req, res) => {
    try {
        const timezoneId = `${req.params.region}/${req.params.city}`;
        
        console.log('Received timezone request for:', timezoneId);
        
        // Validate timezone
        const supportedTimezones = User.getSupportedTimezones();
        if (!supportedTimezones.includes(timezoneId)) {
            return res.status(404).json({
                success: false,
                message: 'Timezone not found',
                requested: timezoneId
            });
        }

        const tempUser = new User({ timezone: timezoneId });
        
        const timezoneInfo = {
            value: timezoneId,
            label: tempUser.getTimezoneDisplayName(),
            offset: tempUser.getTimezoneOffset(),
            region: getTimezoneRegion(timezoneId),
            currentTime: getCurrentTimeInTimezone(timezoneId, tempUser.getTimezoneOffset())
        };

        res.status(200).json({
            success: true,
            timezone: timezoneInfo
        });
    } catch (error) {
        console.error('Error fetching timezone info:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch timezone information',
            error: error.message
        });
    }
});

// Helper function to determine timezone region
function getTimezoneRegion(timezone) {
    if (timezone.startsWith('America/')) return 'Americas';
    if (timezone.startsWith('Europe/')) return 'Europe';
    if (timezone.startsWith('Asia/')) return 'Asia';
    if (timezone.startsWith('Africa/')) return 'Africa';
    if (timezone.startsWith('Australia/')) return 'Australia & Oceania';
    if (timezone.startsWith('Pacific/')) return 'Pacific';
    if (timezone.startsWith('Atlantic/')) return 'Atlantic';
    if (timezone === 'UTC') return 'Universal';
    return 'Other';
}

// Helper function to get current time in a specific timezone
function getCurrentTimeInTimezone(timezone, offset) {
    const now = new Date();
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const targetTime = new Date(utcTime + (offset * 3600000));
    
    // Format with UTC offset postfix
    const hours = targetTime.getUTCHours().toString().padStart(2, '0');
    const minutes = targetTime.getUTCMinutes().toString().padStart(2, '0');
    const seconds = targetTime.getUTCSeconds().toString().padStart(2, '0');
    const year = targetTime.getUTCFullYear();
    const month = (targetTime.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = targetTime.getUTCDate().toString().padStart(2, '0');
    
    const sign = offset >= 0 ? '+' : '';
    const offsetFormatted = `${sign}${offset.toString().padStart(2, '0')}:00`;
    
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetFormatted}`;
}

module.exports = router;