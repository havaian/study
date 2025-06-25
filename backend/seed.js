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
    { name: 'Cardiology', description: 'Heart and cardiovascular system specialists', icon: 'fa-heart' },
    { name: 'Pediatrics', description: 'Child healthcare specialists', icon: 'fa-child' },
    { name: 'Dermatology', description: 'Skin, hair, and nail specialists', icon: 'fa-hand-holding-medical' },
    { name: 'Neurology', description: 'Nervous system specialists', icon: 'fa-brain' },
    { name: 'Orthopedics', description: 'Musculoskeletal system specialists', icon: 'fa-bone' },
    { name: 'Gynecology', description: 'Women\'s health specialists', icon: 'fa-female' },
    { name: 'Psychiatry', description: 'Mental health specialists', icon: 'fa-head-side-virus' },
    { name: 'Ophthalmology', description: 'Eye care specialists', icon: 'fa-eye' },
    { name: 'General Medicine', description: 'General practitioners and family medicine', icon: 'fa-user-md' },
    { name: 'Endocrinology', description: 'Hormone and metabolic disorder specialists', icon: 'fa-dna' }
];

const adminUser = {
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@e-polyclinic.uz',
    password: 'Admin123!',
    phone: '+998901234567',
    role: 'admin',
    isActive: true,
    isVerified: true
};

const sampleDoctors = [
    {
        firstName: 'John',
        lastName: 'Smith',
        email: 'john.smith@e-polyclinic.uz',
        password: 'Doctor123!',
        phone: '+998901234568',
        role: 'doctor',
        specializations: ['Cardiology'],
        licenseNumber: 'MD12345',
        experience: 15,
        bio: 'Experienced cardiologist with 15 years of practice in treating heart conditions.',
        languages: ['English', 'Russian', 'Uzbek'],
        consultationFee: 150000,
        isActive: true,
        isVerified: true,
        availability: [
            { dayOfWeek: 1, isAvailable: true, startTime: '09:00', endTime: '17:00' },
            { dayOfWeek: 2, isAvailable: true, startTime: '09:00', endTime: '17:00' },
            { dayOfWeek: 3, isAvailable: true, startTime: '09:00', endTime: '17:00' },
            { dayOfWeek: 4, isAvailable: true, startTime: '09:00', endTime: '17:00' },
            { dayOfWeek: 5, isAvailable: true, startTime: '09:00', endTime: '17:00' },
            { dayOfWeek: 6, isAvailable: false, startTime: null, endTime: null },
            { dayOfWeek: 0, isAvailable: false, startTime: null, endTime: null }
        ]
    },
    {
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah.johnson@e-polyclinic.uz',
        password: 'Doctor123!',
        phone: '+998901234569',
        role: 'doctor',
        specializations: ['Pediatrics'],
        licenseNumber: 'MD54321',
        experience: 10,
        bio: 'Dedicated pediatrician specializing in child development and preventive care.',
        languages: ['English', 'Uzbek'],
        consultationFee: 120000,
        isActive: true,
        isVerified: true,
        availability: [
            { dayOfWeek: 1, isAvailable: true, startTime: '08:00', endTime: '16:00' },
            { dayOfWeek: 2, isAvailable: true, startTime: '08:00', endTime: '16:00' },
            { dayOfWeek: 3, isAvailable: true, startTime: '08:00', endTime: '16:00' },
            { dayOfWeek: 4, isAvailable: true, startTime: '08:00', endTime: '16:00' },
            { dayOfWeek: 5, isAvailable: true, startTime: '08:00', endTime: '16:00' },
            { dayOfWeek: 6, isAvailable: true, startTime: '09:00', endTime: '13:00' },
            { dayOfWeek: 0, isAvailable: false, startTime: null, endTime: null }
        ]
    }
];

const samplePatient = {
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane.doe@gmail.com',
    password: 'Patient123!',
    phone: '+998901234570',
    role: 'patient',
    dateOfBirth: new Date('1990-01-15'),
    gender: 'female',
    isActive: true,
    isVerified: true,
    medicalHistory: {
        allergies: ['Penicillin'],
        chronicConditions: ['Hypertension'],
        currentMedications: ['Lisinopril']
    },
    emergencyContact: {
        name: 'John Doe',
        relationship: 'Husband',
        phone: '+998901234571'
    }
};

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

        console.log('👤 [db seed] Creating admin user...');
        
        // Hash admin password
        const salt = await bcrypt.genSalt(10);
        adminUser.password = await bcrypt.hash(adminUser.password, salt);
        
        // Create admin user
        const admin = await User.create(adminUser);
        console.log('✅ [db seed] Admin user created');

        console.log('👨‍⚕️ [db seed] Creating doctor accounts...');
        
        // Create doctor accounts
        for (const doctor of sampleDoctors) {
            // Hash password
            doctor.password = await bcrypt.hash(doctor.password, salt);
            
            // Create doctor
            const createdDoctor = await User.create(doctor);
            console.log(`✅ [db seed] Created doctor: ${createdDoctor.firstName} ${createdDoctor.lastName}`);
        }

        console.log('👩‍🦰 [db seed] Creating patient account...');
        
        // Hash patient password
        samplePatient.password = await bcrypt.hash(samplePatient.password, salt);
        
        // Create patient
        const patient = await User.create(samplePatient);
        console.log('✅ [db seed] Patient account created');

        console.log('\n🎉 [db seed] Database seeded successfully!');
        console.log('\n📝 [db seed] Login credentials:');
        console.log('[db seed] Admin: admin@e-polyclinic.uz / Admin123!');
        console.log('[db seed] Doctor 1: john.smith@e-polyclinic.uz / Doctor123!');
        console.log('[db seed] Doctor 2: sarah.johnson@e-polyclinic.uz / Doctor123!');
        console.log('[db seed] Patient: jane.doe@gmail.com / Patient123!');

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