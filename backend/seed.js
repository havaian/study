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

// Non-destructive seed function
async function seedDatabase() {
    try {
        console.log('🔄 [db seed] Connecting to database...');
        await connectDB();
        
        console.log('🔍 [db seed] Checking existing specializations...');
        
        // Get all existing specializations
        const existingSpecializations = await Specialization.find({}).maxTimeMS(30000);
        const existingNames = existingSpecializations.map(spec => spec.name);
        
        console.log(`📋 [db seed] Found ${existingSpecializations.length} existing specializations: ${existingNames.join(', ')}`);
        
        // Filter out specializations that already exist
        const missingSpecializations = specializations.filter(spec => 
            !existingNames.includes(spec.name)
        );
        
        if (missingSpecializations.length === 0) {
            console.log('✅ [db seed] All specializations already exist - no changes needed');
            return;
        }
        
        console.log(`🌱 [db seed] Adding ${missingSpecializations.length} missing specializations...`);
        console.log(`📝 [db seed] Missing: ${missingSpecializations.map(s => s.name).join(', ')}`);
        
        // Create only the missing specializations
        const createdSpecializations = await Specialization.insertMany(missingSpecializations);
        console.log(`✅ [db seed] Successfully created ${createdSpecializations.length} new specializations`);
        
        // Show final count
        const totalSpecializations = await Specialization.countDocuments();
        console.log(`📊 [db seed] Total specializations in database: ${totalSpecializations}`);
        
    } catch (error) {
        console.error('❌ [db seed] Seeding error:', error);
        
        // Additional error context
        if (error.name === 'MongoTimeoutError') {
            console.error('💡 [db seed] Timeout error - check MongoDB connection and network');
        } else if (error.code === 11000) {
            console.error('💡 [db seed] Duplicate key error - specialization names must be unique');
        }
    } finally {
        // Always disconnect
        try {
            await mongoose.disconnect();
            console.log('🔌 [db seed] Disconnected from MongoDB');
        } catch (disconnectError) {
            console.error('[db seed] Error disconnecting:', disconnectError);
        }
    }
}

// Run the seeder
seedDatabase();