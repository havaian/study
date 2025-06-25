const Specialization = require('./model');
const User = require('../user/model');

/**
 * Get all active specializations
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getActiveSpecializations = async (req, res) => {
    try {
        const specializations = await Specialization.find({ isActive: true })
            .sort({ name: 1 })
            .select('name description icon');

        // Get count of active doctors for each specializations
        const specializationsWithDoctorCount = await Promise.all(
            specializations.map(async (spec) => {
                const doctorCount = await User.countDocuments({
                    role: 'doctor',
                    specializations: spec.name,
                    isActive: true,
                    isVerified: true
                });

                return {
                    ...spec.toObject(),
                    doctorCount
                };
            })
        );

        res.status(200).json({
            specializations: specializationsWithDoctorCount
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
 * Get specializations by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getSpecializationById = async (req, res) => {
    try {
        const { id } = req.params;

        const specializations = await Specialization.findById(id);

        if (!specializations) {
            return res.status(404).json({ message: 'Specialization not found' });
        }

        if (!specializations.isActive) {
            return res.status(404).json({ message: 'Specialization is not active' });
        }

        // Get count of active doctors for this specializations
        const doctorCount = await User.countDocuments({
            role: 'doctor',
            specializations: specializations.name,
            isActive: true,
            isVerified: true
        });

        res.status(200).json({
            specializations: {
                ...specializations.toObject(),
                doctorCount
            }
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
 * Get doctors by specializations
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getDoctorsBySpecialization = async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 10 } = req.query;

        const specializations = await Specialization.findById(id);

        if (!specializations) {
            return res.status(404).json({ message: 'Specialization not found' });
        }

        if (!specializations.isActive) {
            return res.status(404).json({ message: 'Specialization is not active' });
        }

        // Query for doctors with this specializations
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const doctors = await User.find({
            role: 'doctor',
            specializations: specializations.name,
            isActive: true,
            isVerified: true
        })
            .select('firstName lastName profilePicture experience consultationFee bio languages address')
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ experience: -1 });

        const total = await User.countDocuments({
            role: 'doctor',
            specializations: specializations.name,
            isActive: true,
            isVerified: true
        });

        res.status(200).json({
            specializations: {
                _id: specializations._id,
                name: specializations.name,
                description: specializations.description,
                icon: specializations.icon
            },
            doctors,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching doctors by specializations:', error);
        res.status(500).json({
            message: 'An error occurred while fetching doctors',
            error: error.message
        });
    }
};