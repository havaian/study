const express = require('express');
const router = express.Router();
const timezoneController = require('./controller');

// Get all timezones
router.get('/', timezoneController.getAllTimezones);

// Get timezones grouped by region
router.get('/grouped/regions', timezoneController.getTimezonesByRegion);

// Get specific timezone info
router.get('/info/:region/:city', timezoneController.getTimezoneByValue);

// Convert time between timezones
router.post('/convert', timezoneController.convertTime);

module.exports = router;