const User = require('../user/model');
const Appointment = require('../appointment/model');
const Payment = require('../payment/model');
const Specialization = require('../specializations/model');
const mongoose = require('mongoose');
const { redisClient } = require('../utils/redisClient');

/**
 * Get all users with pagination and filtering
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAllUsers = async (req, res) => {
    try {
        const {
            role,
            isActive,
            isVerified,
            search,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            page = 1,
            limit = 20
        } = req.query;

        // Build query
        const query = {};

        if (role) {
            query.role = role;
        }

        if (isActive !== undefined) {
            query.isActive = isActive === 'true';
        }

        if (isVerified !== undefined) {
            query.isVerified = isVerified === 'true';
        }

        if (search) {
            query.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } }
            ];
        }

        // Execute query with pagination
        const sortDirection = sortOrder === 'asc' ? 1 : -1;
        const sortOptions = {};
        sortOptions[sortBy] = sortDirection;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const users = await User.find(query)
            .select('-password -resetPasswordToken -resetPasswordExpire')
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit));

        const total = await User.countDocuments(query);

        res.status(200).json({
            users,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            message: 'An error occurred while fetching users',
            error: error.message
        });
    }
};

/**
 * Get user by ID (admin view with more details)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id)
            .select('-password -resetPasswordToken -resetPasswordExpire');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Get additional statistics if needed
        let stats = {};

        if (user.role === 'doctor') {
            // Doctor stats (appointments, ratings, etc.)
            const appointmentCount = await Appointment.countDocuments({ doctor: id });
            const completedAppointments = await Appointment.countDocuments({ doctor: id, status: 'completed' });
            const canceledAppointments = await Appointment.countDocuments({ doctor: id, status: 'canceled' });

            stats = {
                appointmentCount,
                completedAppointments,
                canceledAppointments,
                completionRate: appointmentCount > 0 ? (completedAppointments / appointmentCount) * 100 : 0
            };
        } else if (user.role === 'patient') {
            // Patient stats (appointments, payments, etc.)
            const appointmentCount = await Appointment.countDocuments({ patient: id });
            const completedAppointments = await Appointment.countDocuments({ patient: id, status: 'completed' });
            const paymentCount = await Payment.countDocuments({ patient: id });
            const successfulPayments = await Payment.countDocuments({ patient: id, status: 'succeeded' });

            stats = {
                appointmentCount,
                completedAppointments,
                paymentCount,
                successfulPayments
            };
        }

        res.status(200).json({
            user,
            stats
        });
    } catch (error) {
        console.error('Error fetching user details:', error);
        res.status(500).json({
            message: 'An error occurred while fetching user details',
            error: error.message
        });
    }
};

/**
 * Update user details (admin can update any user)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            firstName,
            lastName,
            phone,
            role,
            specializations,
            experience,
            consultationFee,
            address,
            bio,
            languages
        } = req.body;

        // Find user
        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update allowed fields
        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;
        if (phone) user.phone = phone;

        // Admin can change role (but be careful with this)
        if (role && ['patient', 'doctor', 'admin'].includes(role)) {
            user.role = role;
        }

        // Doctor-specific fields
        if (user.role === 'doctor') {
            if (specializations) user.specializations = specializations;
            if (experience !== undefined) user.experience = experience;
            if (consultationFee) user.consultationFee = consultationFee;
            if (bio) user.bio = bio;
            if (languages) user.languages = languages;
        }

        // Address for any user
        if (address) user.address = address;

        await user.save();

        res.status(200).json({
            message: 'User updated successfully',
            user: user.getPublicProfile()
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({
            message: 'An error occurred while updating user',
            error: error.message
        });
    }
};

/**
 * Activate/deactivate user account
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;

        if (isActive === undefined) {
            return res.status(400).json({ message: 'isActive status is required' });
        }

        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.isActive = isActive;
        await user.save();

        res.status(200).json({
            message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
            user: user.getPublicProfile()
        });
    } catch (error) {
        console.error('Error updating user status:', error);
        res.status(500).json({
            message: 'An error occurred while updating user status',
            error: error.message
        });
    }
};

/**
 * Manually verify a user (useful for doctors verification)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.verifyUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { isVerified } = req.body;

        if (isVerified === undefined) {
            return res.status(400).json({ message: 'isVerified status is required' });
        }

        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.isVerified = isVerified;
        await user.save();

        res.status(200).json({
            message: `User ${isVerified ? 'verified' : 'unverified'} successfully`,
            user: user.getPublicProfile()
        });
    } catch (error) {
        console.error('Error updating verification status:', error);
        res.status(500).json({
            message: 'An error occurred while updating verification status',
            error: error.message
        });
    }
};

/**
 * Get all appointments with pagination and filtering
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAllAppointments = async (req, res) => {
    try {
        const {
            status,
            type,
            startDate,
            endDate,
            patientId,
            doctorId,
            sortBy = 'dateTime',
            sortOrder = 'desc',
            page = 1,
            limit = 20
        } = req.query;

        // Build query
        const query = {};

        if (status) {
            query.status = status;
        }

        if (type) {
            query.type = type;
        }

        if (startDate || endDate) {
            query.dateTime = {};

            if (startDate) {
                query.dateTime.$gte = new Date(startDate);
            }

            if (endDate) {
                query.dateTime.$lte = new Date(endDate);
            }
        }

        if (patientId) {
            query.patient = patientId;
        }

        if (doctorId) {
            query.doctor = doctorId;
        }

        // Execute query with pagination
        const sortDirection = sortOrder === 'asc' ? 1 : -1;
        const sortOptions = {};
        sortOptions[sortBy] = sortDirection;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const appointments = await Appointment.find(query)
            .populate('patient', 'firstName lastName email phone')
            .populate('doctor', 'firstName lastName specializations')
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Appointment.countDocuments(query);

        res.status(200).json({
            appointments,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching appointments:', error);
        res.status(500).json({
            message: 'An error occurred while fetching appointments',
            error: error.message
        });
    }
};

/**
 * Get appointment by ID (admin view with more details)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAppointmentById = async (req, res) => {
    try {
        const { id } = req.params;

        const appointment = await Appointment.findById(id)
            .populate('patient', 'firstName lastName email phone dateOfBirth gender')
            .populate('doctor', 'firstName lastName email phone specializations experience');

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        // Get payment details if available
        let payment = null;
        if (appointment.payment && appointment.payment.transactionId) {
            payment = await Payment.findById(appointment.payment.transactionId);
        }

        res.status(200).json({
            appointment,
            payment
        });
    } catch (error) {
        console.error('Error fetching appointment details:', error);
        res.status(500).json({
            message: 'An error occurred while fetching appointment details',
            error: error.message
        });
    }
};

/**
 * Update appointment details
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            dateTime,
            type,
            status,
            reasonForVisit,
            consultationSummary
        } = req.body;

        const appointment = await Appointment.findById(id);

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        // Update fields
        if (dateTime) appointment.dateTime = new Date(dateTime);
        if (type) appointment.type = type;
        if (status) appointment.status = status;
        if (reasonForVisit) appointment.reasonForVisit = reasonForVisit;
        if (consultationSummary) appointment.consultationSummary = consultationSummary;

        await appointment.save();

        res.status(200).json({
            message: 'Appointment updated successfully',
            appointment
        });
    } catch (error) {
        console.error('Error updating appointment:', error);
        res.status(500).json({
            message: 'An error occurred while updating appointment',
            error: error.message
        });
    }
};

/**
 * Get all payments with pagination and filtering
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAllPayments = async (req, res) => {
    try {
        const {
            status,
            startDate,
            endDate,
            patientId,
            doctorId,
            minAmount,
            maxAmount,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            page = 1,
            limit = 20
        } = req.query;

        // Build query
        const query = {};

        if (status) {
            query.status = status;
        }

        if (startDate || endDate) {
            query.createdAt = {};

            if (startDate) {
                query.createdAt.$gte = new Date(startDate);
            }

            if (endDate) {
                query.createdAt.$lte = new Date(endDate);
            }
        }

        if (patientId) {
            query.patient = patientId;
        }

        if (doctorId) {
            query.doctor = doctorId;
        }

        if (minAmount || maxAmount) {
            query.amount = {};

            if (minAmount) {
                query.amount.$gte = parseFloat(minAmount);
            }

            if (maxAmount) {
                query.amount.$lte = parseFloat(maxAmount);
            }
        }

        // Execute query with pagination
        const sortDirection = sortOrder === 'asc' ? 1 : -1;
        const sortOptions = {};
        sortOptions[sortBy] = sortDirection;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const payments = await Payment.find(query)
            .populate('patient', 'firstName lastName email')
            .populate('doctor', 'firstName lastName specializations')
            .populate('appointment', 'dateTime type status')
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Payment.countDocuments(query);

        // Calculate totals
        const successfulPayments = await Payment.countDocuments({ ...query, status: 'succeeded' });
        const totalAmount = await Payment.aggregate([
            { $match: { ...query, status: 'succeeded' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const successRate = total > 0 ? (successfulPayments / total) * 100 : 0;
        const totalRevenue = totalAmount.length > 0 ? totalAmount[0].total : 0;

        res.status(200).json({
            payments,
            stats: {
                successRate,
                totalRevenue,
                successfulPayments,
                totalPayments: total
            },
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching payments:', error);
        res.status(500).json({
            message: 'An error occurred while fetching payments',
            error: error.message
        });
    }
};

/**
 * Get dashboard statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getDashboardStats = async (req, res) => {
    try {
        // Time periods
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const thisWeekStart = new Date(today);
        thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());

        const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

        // User stats
        const totalUsers = await User.countDocuments();
        const totalPatients = await User.countDocuments({ role: 'patient' });
        const totalDoctors = await User.countDocuments({ role: 'doctor' });
        const newUsersToday = await User.countDocuments({ createdAt: { $gte: today } });

        // Appointment stats
        const totalAppointments = await Appointment.countDocuments();
        const scheduledAppointments = await Appointment.countDocuments({ status: 'scheduled' });
        const completedAppointments = await Appointment.countDocuments({ status: 'completed' });
        const canceledAppointments = await Appointment.countDocuments({ status: 'canceled' });

        const appointmentsToday = await Appointment.countDocuments({
            dateTime: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) }
        });

        const appointmentsThisWeek = await Appointment.countDocuments({
            dateTime: { $gte: thisWeekStart, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) }
        });

        const appointmentsThisMonth = await Appointment.countDocuments({
            dateTime: { $gte: thisMonthStart, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) }
        });

        // Payment stats
        const totalPayments = await Payment.countDocuments();
        const successfulPayments = await Payment.countDocuments({ status: 'succeeded' });

        const totalRevenue = await Payment.aggregate([
            { $match: { status: 'succeeded' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const revenueToday = await Payment.aggregate([
            { $match: { status: 'succeeded', createdAt: { $gte: today } } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const revenueThisWeek = await Payment.aggregate([
            { $match: { status: 'succeeded', createdAt: { $gte: thisWeekStart } } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const revenueThisMonth = await Payment.aggregate([
            { $match: { status: 'succeeded', createdAt: { $gte: thisMonthStart } } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        // Monthly trend (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        sixMonthsAgo.setHours(0, 0, 0, 0);

        const monthlyAppointments = await Appointment.aggregate([
            { $match: { createdAt: { $gte: sixMonthsAgo } } },
            {
                $group: {
                    _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        const monthlyRevenue = await Payment.aggregate([
            { $match: { status: 'succeeded', createdAt: { $gte: sixMonthsAgo } } },
            {
                $group: {
                    _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } },
                    total: { $sum: '$amount' }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        // Format monthly data for charts
        const months = [];
        const monthlyAppointmentData = [];
        const monthlyRevenueData = [];

        // Fill in the data for the last 6 months
        for (let i = 0; i < 6; i++) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);

            const year = d.getFullYear();
            const month = d.getMonth() + 1;
            const monthName = d.toLocaleString('default', { month: 'short' });

            // Find data for this month
            const appointmentData = monthlyAppointments.find(item =>
                item._id.year === year && item._id.month === month
            );

            const revenueData = monthlyRevenue.find(item =>
                item._id.year === year && item._id.month === month
            );

            // Add to arrays (in reverse order)
            months.unshift(`${monthName} ${year}`);
            monthlyAppointmentData.unshift(appointmentData ? appointmentData.count : 0);
            monthlyRevenueData.unshift(revenueData ? revenueData.total : 0);
        }

        res.status(200).json({
            users: {
                total: totalUsers,
                patients: totalPatients,
                doctors: totalDoctors,
                newToday: newUsersToday
            },
            appointments: {
                total: totalAppointments,
                scheduled: scheduledAppointments,
                completed: completedAppointments,
                canceled: canceledAppointments,
                today: appointmentsToday,
                thisWeek: appointmentsThisWeek,
                thisMonth: appointmentsThisMonth
            },
            payments: {
                total: totalPayments,
                successful: successfulPayments,
                successRate: totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 0,
                totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0,
                today: revenueToday.length > 0 ? revenueToday[0].total : 0,
                thisWeek: revenueThisWeek.length > 0 ? revenueThisWeek[0].total : 0,
                thisMonth: revenueThisMonth.length > 0 ? revenueThisMonth[0].total : 0
            },
            trends: {
                months,
                appointments: monthlyAppointmentData,
                revenue: monthlyRevenueData
            }
        });
    } catch (error) {
        console.error('Error generating dashboard statistics:', error);
        res.status(500).json({
            message: 'An error occurred while generating dashboard statistics',
            error: error.message
        });
    }
};

/**
 * Get system health status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getSystemHealth = async (req, res) => {
    try {
        // MongoDB health check
        let mongoStatus = 'healthy';
        let mongoError = null;

        try {
            const status = await mongoose.connection.db.admin().ping();
            if (!status.ok) {
                mongoStatus = 'unhealthy';
                mongoError = 'Failed to ping MongoDB';
            }
        } catch (error) {
            mongoStatus = 'unhealthy';
            mongoError = error.message;
        }

        // Redis health check
        let redisStatus = 'healthy';
        let redisError = null;

        try {
            const redisResponse = await redisClient.ping();
            if (redisResponse !== 'PONG') {
                redisStatus = 'unhealthy';
                redisError = 'Failed to ping Redis';
            }
        } catch (error) {
            redisStatus = 'unhealthy';
            redisError = error.message;
        }

        // Server health check
        const usedMemory = process.memoryUsage();

        // System status
        const systemStatus = mongoStatus === 'healthy' && redisStatus === 'healthy' ? 'healthy' : 'degraded';

        res.status(200).json({
            timestamp: new Date().toISOString(),
            status: systemStatus,
            services: {
                mongo: {
                    status: mongoStatus,
                    error: mongoError
                },
                redis: {
                    status: redisStatus,
                    error: redisError
                }
            },
            server: {
                uptime: Math.floor(process.uptime()),
                memory: {
                    rss: Math.round(usedMemory.rss / 1024 / 1024), // MB
                    heapTotal: Math.round(usedMemory.heapTotal / 1024 / 1024), // MB
                    heapUsed: Math.round(usedMemory.heapUsed / 1024 / 1024), // MB
                    external: Math.round(usedMemory.external / 1024 / 1024) // MB
                },
                nodeVersion: process.version,
                platform: process.platform
            }
        });
    } catch (error) {
        console.error('Error checking system health:', error);
        res.status(500).json({
            message: 'An error occurred while checking system health',
            error: error.message
        });
    }
};

/**
 * Create a new medical specializations
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createSpecialization = async (req, res) => {
    try {
        const { name, description, icon } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Specialization name is required' });
        }

        // Check if specializations already exists
        const existingSpecialization = await Specialization.findOne({
            name: { $regex: new RegExp(`^${name}$`, 'i') }
        });

        if (existingSpecialization) {
            return res.status(400).json({ message: 'Specialization already exists' });
        }

        // Create new specializations
        const specializations = new Specialization({
            name,
            description,
            icon
        });

        await specializations.save();

        res.status(201).json({
            message: 'Specialization created successfully',
            specializations
        });
    } catch (error) {
        console.error('Error creating specializations:', error);
        res.status(500).json({
            message: 'An error occurred while creating specializations',
            error: error.message
        });
    }
};

/**
 * Get all specializations
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAllSpecializations = async (req, res) => {
    try {
        const specializations = await Specialization.find().sort({ name: 1 });

        // Get stats for each specializations
        const specializationsWithStats = await Promise.all(specializations.map(async (spec) => {
            const doctorCount = await User.countDocuments({
                role: 'doctor',
                specializations: spec.name,
                isActive: true,
                isVerified: true
            });

            const appointmentCount = await Appointment.countDocuments({
                doctor: { $in: await User.find({ specializations: spec.name }).distinct('_id') }
            });

            return {
                ...spec.toObject(),
                doctorCount,
                appointmentCount
            };
        }));

        res.status(200).json({
            specializations: specializationsWithStats
        });
    } catch (error) {
        console.error('Error fetching specializations:', error);
        res.status(500).json({
            message: 'An error occurred while fetching specializations',
            error: error.message
        });
    }
};

/** 
 * Update a specializations 
 * @param {Object} req - Express request object 
 * @param {Object} res - Express response object 
 */
exports.updateSpecialization = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, icon, isActive } = req.body;

        // Find specializations 
        const specializations = await Specialization.findById(id);

        if (!specializations) {
            return res.status(404).json({ message: 'Specialization not found' });
        }

        // Check if new name already exists (if name is being updated) 
        if (name && name !== specializations.name) {
            const existingSpecialization = await Specialization.findOne({
                name: { $regex: new RegExp(`^${name}$`, 'i') },
                _id: { $ne: id }
            });

            if (existingSpecialization) {
                return res.status(400).json({ message: 'Specialization with this name already exists' });
            }

            specializations.name = name;
        }

        // Update other fields 
        if (description !== undefined) specializations.description = description;
        if (icon !== undefined) specializations.icon = icon;
        if (isActive !== undefined) specializations.isActive = isActive;

        await specializations.save();

        res.status(200).json({
            message: 'Specialization updated successfully',
            specializations
        });
    } catch (error) {
        console.error('Error updating specializations:', error);
        res.status(500).json({
            message: 'An error occurred while updating specializations',
            error: error.message
        });
    }
};

/**
 * Delete a specializations
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deleteSpecialization = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if specializations exists
        const specializations = await Specialization.findById(id);

        if (!specializations) {
            return res.status(404).json({ message: 'Specialization not found' });
        }

        // Check if specializations is in use
        const doctorsUsingSpecialization = await User.countDocuments({
            specializations: specializations.name
        });

        if (doctorsUsingSpecialization > 0) {
            return res.status(400).json({
                message: 'Cannot delete specializations that is in use by doctors',
                doctorsCount: doctorsUsingSpecialization
            });
        }

        // Delete specializations
        await specializations.remove();

        res.status(200).json({
            message: 'Specialization deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting specializations:', error);
        res.status(500).json({
            message: 'An error occurred while deleting specializations',
            error: error.message
        });
    }
};