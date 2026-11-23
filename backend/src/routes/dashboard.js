const express = require('express');
const {
  adminDashboard,
  facultyDashboard,
  studentDashboard,
} = require('../controllers/dashboardController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/admin', authorize('admin'), adminDashboard);
router.get('/faculty', authorize('faculty'), facultyDashboard);
router.get('/student', authorize('student'), studentDashboard);

module.exports = router;
