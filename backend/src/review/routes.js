// backend/src/review/routes.js
const express = require('express');
const router = express.Router();
const reviewController = require('./controller');
const { authenticateUser, authorizeRoles } = require('../auth');

/**
 * @route POST /api/reviews
 * @desc Create a new review for a completed appointment
 * @access Private (Student only)
 */
router.post('/',
    authenticateUser,
    authorizeRoles(['student']),
    reviewController.createReview
);

/**
 * @route GET /api/reviews/teacher/:teacherId
 * @desc Get all reviews for a specific teacher
 * @access Public
 */
router.get('/teacher/:teacherId',
    reviewController.getTeacherReviews
);

/**
 * @route GET /api/reviews/teacher/:teacherId/statistics
 * @desc Get review statistics for a teacher (rating distribution, averages)
 * @access Public
 */
router.get('/teacher/:teacherId/statistics',
    reviewController.getReviewStatistics
);

/**
 * @route GET /api/reviews/student/:studentId
 * @desc Get all reviews written by a specific student
 * @access Private (Student can only see own reviews, teachers/admins can see all)
 */
router.get('/student/:studentId',
    authenticateUser,
    reviewController.getStudentReviews
);

/**
 * @route PUT /api/reviews/:reviewId
 * @desc Update a review (only by the student who wrote it, within 24 hours)
 * @access Private (Student only)
 */
router.put('/:reviewId',
    authenticateUser,
    authorizeRoles(['student']),
    reviewController.updateReview
);

/**
 * @route POST /api/reviews/:reviewId/respond
 * @desc Teacher responds to a review
 * @access Private (Teacher only)
 */
router.post('/:reviewId/respond',
    authenticateUser,
    authorizeRoles(['teacher']),
    reviewController.respondToReview
);

/**
 * @route POST /api/reviews/:reviewId/flag
 * @desc Flag a review for inappropriate content
 * @access Private (Any authenticated user)
 */
router.post('/:reviewId/flag',
    authenticateUser,
    reviewController.flagReview
);

/**
 * @route POST /api/reviews/:reviewId/moderate
 * @desc Admin: Moderate a flagged review (approve, hide, or delete)
 * @access Private (Admin only)
 */
router.post('/:reviewId/moderate',
    authenticateUser,
    authorizeRoles(['admin']),
    reviewController.moderateReview
);

module.exports = router;