// backend/seed.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import models
const User = require('./src/user/model');
const Specialization = require('./src/specializations/model');

// Set longer timeout for MongoDB operations
mongoose.set('bufferTimeoutMS', 30000);

// MongoDB connection with options to avoid buffering issues
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        console.log('✅ [db seed] Connected to MongoDB');
    } catch (err) {
        console.error('❌ [db seed] MongoDB connection error:', err);
        process.exit(1);
    }
};

// Seed data
const specializations = [
    { name: 'Mathematics', description: 'Advanced mathematics and calculus specialists', icon: 'fa-calculator' },
    { name: 'Science', description: 'Physics, Chemistry, Biology specialists', icon: 'fa-atom' },
    { name: 'Languages', description: 'English, Spanish, French language specialists', icon: 'fa-language' },
    { name: 'Computer Science', description: 'Programming and technology specialists', icon: 'fa-code' },
    { name: 'History', description: 'World history and social studies specialists', icon: 'fa-landmark' },
    { name: 'Literature', description: 'Creative writing and literature specialists', icon: 'fa-book' },
    { name: 'Arts', description: 'Visual arts and design specialists', icon: 'fa-palette' },
    { name: 'Music', description: 'Music theory and instrument specialists', icon: 'fa-music' },
    { name: 'Business', description: 'Economics and business studies specialists', icon: 'fa-chart-line' },
    { name: 'Test Prep', description: 'SAT, ACT, and standardized test preparation', icon: 'fa-graduation-cap' }
];

// Seed function with better error handling
async function seedDatabase() {
    try {
        console.log('🔄 [db seed] Connecting to database...');
        await connectDB();
        
        console.log('🧹 [db seed] Cleaning existing data...');
        
        // Clear existing data with timeout handling
        await Promise.all([
            User.deleteMany({}).maxTimeMS(30000),
            Specialization.deleteMany({}).maxTimeMS(30000)
        ]);
        
        console.log('🌱 [db seed] Seeding specializations...');
        
        // Create specializations
        const createdSpecializations = await Specialization.insertMany(specializations);
        console.log(`✅ [db seed] Created ${createdSpecializations.length} specializations`);
    } catch (error) {
        console.error('❌ [db seed] Seeding error:', error);
    } finally {
        // Always disconnect
        try {
            await mongoose.disconnect();
            console.log('🔌 [db seed] Disconnected from MongoDB');
        } catch (disconnectError) {
            console.error('[db seed] Error disconnecting:', disconnectError);
        }
        process.exit(0);
    }
}

// Run the seeder
seedDatabase();