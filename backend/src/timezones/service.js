const Timezone = require('./model');

class TimezoneService {
    static getTimezoneData() {
        return [
            // UTC-12 to UTC-11
            { value: 'Pacific/Kwajalein', label: 'Kwajalein (UTC-12)', offset: -12, region: 'Pacific', abbreviation: 'UTC-12' },
            { value: 'Pacific/Midway', label: 'Midway (UTC-11)', offset: -11, region: 'Pacific', abbreviation: 'UTC-11' },
            
            // UTC-10 to UTC-9
            { value: 'Pacific/Honolulu', label: 'Hawaii (UTC-10)', offset: -10, region: 'Pacific', abbreviation: 'HST' },
            { value: 'America/Anchorage', label: 'Alaska (UTC-9)', offset: -9, region: 'Americas', abbreviation: 'AKST' },
            
            // UTC-8 to UTC-7
            { value: 'America/Los_Angeles', label: 'Pacific Time (UTC-8)', offset: -8, region: 'Americas', abbreviation: 'PST' },
            { value: 'America/Denver', label: 'Mountain Time (UTC-7)', offset: -7, region: 'Americas', abbreviation: 'MST' },
            
            // UTC-6 to UTC-5
            { value: 'America/Chicago', label: 'Central Time (UTC-6)', offset: -6, region: 'Americas', abbreviation: 'CST' },
            { value: 'America/New_York', label: 'Eastern Time (UTC-5)', offset: -5, region: 'Americas', abbreviation: 'EST' },
            
            // UTC-4 to UTC-3
            { value: 'America/Halifax', label: 'Atlantic Time (UTC-4)', offset: -4, region: 'Americas', abbreviation: 'AST' },
            { value: 'America/Sao_Paulo', label: 'Brazil (UTC-3)', offset: -3, region: 'Americas', abbreviation: 'BRT' },
            
            // UTC-2 to UTC-1
            { value: 'America/Noronha', label: 'Fernando de Noronha (UTC-2)', offset: -2, region: 'Americas', abbreviation: 'FNT' },
            { value: 'Atlantic/Cape_Verde', label: 'Cape Verde (UTC-1)', offset: -1, region: 'Atlantic', abbreviation: 'CVT' },
            
            // UTC+0
            { value: 'UTC', label: 'Universal Time (UTC+0)', offset: 0, region: 'Universal', abbreviation: 'UTC' },
            { value: 'Europe/London', label: 'London (UTC+0)', offset: 0, region: 'Europe', abbreviation: 'GMT' },
            { value: 'Africa/Casablanca', label: 'Morocco (UTC+0)', offset: 0, region: 'Africa', abbreviation: 'WET' },
            
            // UTC+1 to UTC+2
            { value: 'Europe/Paris', label: 'Central European Time (UTC+1)', offset: 1, region: 'Europe', abbreviation: 'CET' },
            { value: 'Europe/Berlin', label: 'Berlin (UTC+1)', offset: 1, region: 'Europe', abbreviation: 'CET' },
            { value: 'Africa/Lagos', label: 'West Africa (UTC+1)', offset: 1, region: 'Africa', abbreviation: 'WAT' },
            { value: 'Europe/Athens', label: 'Athens (UTC+2)', offset: 2, region: 'Europe', abbreviation: 'EET' },
            { value: 'Africa/Cairo', label: 'Egypt (UTC+2)', offset: 2, region: 'Africa', abbreviation: 'EET' },
            
            // UTC+3 to UTC+4
            { value: 'Europe/Moscow', label: 'Moscow (UTC+3)', offset: 3, region: 'Europe', abbreviation: 'MSK' },
            { value: 'Asia/Istanbul', label: 'Turkey (UTC+3)', offset: 3, region: 'Asia', abbreviation: 'TRT' },
            { value: 'Asia/Dubai', label: 'UAE (UTC+4)', offset: 4, region: 'Asia', abbreviation: 'GST' },
            
            // UTC+4:30 to UTC+5:30
            { value: 'Asia/Kabul', label: 'Afghanistan (UTC+4:30)', offset: 4.5, region: 'Asia', abbreviation: 'AFT' },
            { value: 'Asia/Karachi', label: 'Pakistan (UTC+5)', offset: 5, region: 'Asia', abbreviation: 'PKT' },
            { value: 'Asia/Tashkent', label: 'Uzbekistan (UTC+5)', offset: 5, region: 'Asia', abbreviation: 'UZT' },
            { value: 'Asia/Kolkata', label: 'India (UTC+5:30)', offset: 5.5, region: 'Asia', abbreviation: 'IST' },
            
            // UTC+5:45 to UTC+6:30
            { value: 'Asia/Kathmandu', label: 'Nepal (UTC+5:45)', offset: 5.75, region: 'Asia', abbreviation: 'NPT' },
            { value: 'Asia/Dhaka', label: 'Bangladesh (UTC+6)', offset: 6, region: 'Asia', abbreviation: 'BST' },
            { value: 'Asia/Yangon', label: 'Myanmar (UTC+6:30)', offset: 6.5, region: 'Asia', abbreviation: 'MMT' },
            
            // UTC+7 to UTC+8
            { value: 'Asia/Bangkok', label: 'Thailand (UTC+7)', offset: 7, region: 'Asia', abbreviation: 'ICT' },
            { value: 'Asia/Shanghai', label: 'China (UTC+8)', offset: 8, region: 'Asia', abbreviation: 'CST' },
            { value: 'Asia/Singapore', label: 'Singapore (UTC+8)', offset: 8, region: 'Asia', abbreviation: 'SGT' },
            
            // UTC+9 to UTC+10
            { value: 'Asia/Tokyo', label: 'Japan (UTC+9)', offset: 9, region: 'Asia', abbreviation: 'JST' },
            { value: 'Asia/Seoul', label: 'South Korea (UTC+9)', offset: 9, region: 'Asia', abbreviation: 'KST' },
            { value: 'Australia/Sydney', label: 'Sydney (UTC+10)', offset: 10, region: 'Australia & Oceania', abbreviation: 'AEST' },
            
            // UTC+12 and beyond
            { value: 'Pacific/Auckland', label: 'New Zealand (UTC+12)', offset: 12, region: 'Pacific', abbreviation: 'NZST' },
        ];
    }

    static async seedDatabase() {
        try {
            const count = await Timezone.countDocuments();
            if (count === 0) {
                const timezones = this.getTimezoneData();
                await Timezone.insertMany(timezones);
                console.log('Timezone database seeded successfully');
            }
        } catch (error) {
            console.error('Error seeding timezone database:', error);
        }
    }

    static getCurrentTimeInTimezone(timezoneValue, offset) {
        const now = new Date();
        const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
        const targetTime = new Date(utcTime + (offset * 3600000));
        
        const year = targetTime.getUTCFullYear();
        const month = (targetTime.getUTCMonth() + 1).toString().padStart(2, '0');
        const day = targetTime.getUTCDate().toString().padStart(2, '0');
        const hours = targetTime.getUTCHours().toString().padStart(2, '0');
        const minutes = targetTime.getUTCMinutes().toString().padStart(2, '0');
        const seconds = targetTime.getUTCSeconds().toString().padStart(2, '0');
        
        const sign = offset >= 0 ? '+' : '';
        const offsetFormatted = `${sign}${Math.abs(offset).toString().padStart(2, '0')}:00`;
        
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetFormatted}`;
    }
}

module.exports = TimezoneService;