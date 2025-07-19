const Timezone = require('./model');
const TimezoneService = require('./service');

// Get all timezones
exports.getAllTimezones = async (req, res) => {
    try {
        const timezones = await Timezone.find().sort({ offset: 1, label: 1 });
        
        res.status(200).json({
            success: true,
            timezones,
            total: timezones.length
        });
    } catch (error) {
        console.error('Error fetching timezones:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch timezone data'
        });
    }
};

// Get timezones grouped by region
exports.getTimezonesByRegion = async (req, res) => {
    try {
        const timezones = await Timezone.find().sort({ offset: 1, label: 1 });
        
        const timezonesByRegion = timezones.reduce((acc, timezone) => {
            if (!acc[timezone.region]) {
                acc[timezone.region] = [];
            }
            acc[timezone.region].push(timezone);
            return acc;
        }, {});

        res.status(200).json({
            success: true,
            timezonesByRegion,
            regions: Object.keys(timezonesByRegion).sort()
        });
    } catch (error) {
        console.error('Error fetching grouped timezones:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch grouped timezone data'
        });
    }
};

// Get timezone by region/city (e.g., Asia/Tashkent)
exports.getTimezoneByValue = async (req, res) => {
    try {
        const { region, city } = req.params;
        const timezoneValue = `${region}/${city}`;
        
        console.log('Received timezone request for:', timezoneValue);
        
        // Add these debug logs
        console.log('Searching for timezone in database...');
        const timezoneData = await Timezone.findOne({ value: timezoneValue });
        
        console.log('Database query result:', timezoneData);
        
        if (!timezoneData) {
            // Also check what's actually in the database
            const allTimezones = await Timezone.find({ value: { $regex: 'Africa' } });
            console.log('All Africa timezones in DB:', allTimezones);
            
            return res.status(404).json({
                success: false,
                message: 'Timezone not found',
                requested: timezoneValue
            });
        }

        console.log('Found timezone data:', timezoneData);

        const currentTime = TimezoneService.getCurrentTimeInTimezone(
            timezoneData.value, 
            timezoneData.offset
        );

        res.status(200).json({
            success: true,
            timezone: {
                ...timezoneData.toObject(),
                currentTime
            }
        });
    } catch (error) {
        console.error('Error fetching timezone info:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch timezone information'
        });
    }
};

// Convert time between timezones
exports.convertTime = async (req, res) => {
    try {
        const { fromTimezone, toTimezone, dateTime } = req.body;
        
        if (!fromTimezone || !toTimezone || !dateTime) {
            return res.status(400).json({
                success: false,
                message: 'fromTimezone, toTimezone, and dateTime are required'
            });
        }

        const fromTz = await Timezone.findOne({ value: fromTimezone });
        const toTz = await Timezone.findOne({ value: toTimezone });
        
        if (!fromTz || !toTz) {
            return res.status(400).json({
                success: false,
                message: 'Invalid timezone provided'
            });
        }

        // Convert to UTC first, then to target timezone
        const inputTime = new Date(dateTime);
        const utcTime = new Date(inputTime.getTime() - (fromTz.offset * 60 * 60 * 1000));
        const convertedTime = new Date(utcTime.getTime() + (toTz.offset * 60 * 60 * 1000));

        res.status(200).json({
            success: true,
            conversion: {
                originalTime: dateTime,
                fromTimezone: fromTz,
                toTimezone: toTz,
                convertedTime: convertedTime.toISOString(),
                utcTime: utcTime.toISOString()
            }
        });
    } catch (error) {
        console.error('Error converting timezone:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to convert timezone'
        });
    }
};