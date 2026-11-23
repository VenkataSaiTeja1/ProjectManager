const express = require('express');
const {
  submit,
  getTeamUpdates,
  getUpdateById,
  addComment,
  dailyTracker,
  getMyUpdate,
} = require('../controllers/dailyUpdateController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, dailyUpdateSchema, commentSchema } = require('../validators/schemas');

const router = express.Router();

router.use(authenticate);

router.get('/my-update', authorize('student'), getMyUpdate);
router.post('/submit', authorize('student'), validate(dailyUpdateSchema), submit);
router.get('/tracker', authorize('admin'), dailyTracker);
router.get('/team/:team_id', getTeamUpdates);
router.get('/:id', getUpdateById);
router.post('/:id/comments', authorize('admin', 'faculty'), validate(commentSchema), addComment);

module.exports = router;
