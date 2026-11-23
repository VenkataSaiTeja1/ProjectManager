const express = require('express');
const {
  dailySubmissionReport,
  teamProgressReport,
  papersReport,
  usersReport,
  reviewsReport,
  followupsReport,
  reviewAcksReport,
} = require('../controllers/reportController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);
router.use(authorize('admin'));

router.get('/daily-submissions', dailySubmissionReport);
router.get('/team-progress', teamProgressReport);
router.get('/papers', papersReport);
router.get('/users', usersReport);
router.get('/reviews', reviewsReport);
router.get('/followups', followupsReport);
router.get('/review-acks', reviewAcksReport);

module.exports = router;
