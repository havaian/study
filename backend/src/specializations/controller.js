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

        // Get count of active teachers for each specializations
        const specializationsWithTeacherCount = await Promise.all(
            specializations.map(async (spec) => {
                const teacherCount = await User.countDocuments({
                    role: 'teacher',
                    specializations: spec.name,
                    isActive: true,
                    isVerified: true
                });

                return {
                    ...spec.toObject(),
                    teacherCount
                };
            })
        );

        res.status(200).json({
            specializations: specializationsWithTeacherCount
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

        // Get count of active teachers for this specializations
        const teacherCount = await User.countDocuments({
            role: 'teacher',
            specializations: specializations.name,
            isActive: true,
            isVerified: true
        });

        res.status(200).json({
            specializations: {
                ...specializations.toObject(),
                teacherCount
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
 * Get teachers by specializations
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getTeachersBySpecialization = async (req, res) => {
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

        // Query for teachers with this specializations
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const teachers = await User.find({
            role: 'teacher',
            specializations: specializations.name,
            isActive: true,
            isVerified: true
        })
            .select('firstName lastName profilePicture experience lessonFee bio languages address')
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ experience: -1 });

        const total = await User.countDocuments({
            role: 'teacher',
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
            teachers,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching teachers by specializations:', error);
        res.status(500).json({
            message: 'An error occurred while fetching teachers',
            error: error.message
        });
    }
};