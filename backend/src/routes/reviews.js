const express = require('express');
const {
  getAll,
  getById,
  create,
  update,
  remove,
  acknowledge,
  addRemark,
  updateRemark,
  getBatchComments,
  saveBatchComment,
  submitSolution,
  updateSolutionStatus,
} = require('../controllers/reviewController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, weeklyReviewSchema, remarkSchema } = require('../validators/schemas');

const router = express.Router();

router.use(authenticate);

router.get('/', getAll);
router.get('/:id', getById);
router.post('/', authorize('admin'), validate(weeklyReviewSchema), create);
router.put('/:id', authorize('admin'), update);
router.delete('/:id', authorize('admin'), remove);
router.post('/:id/ack', authorize('student'), acknowledge);

// Batch specific comments & solutions
router.get('/:id/batch-comments', getBatchComments);
router.post('/:id/batch-comments', authorize('admin'), saveBatchComment);
router.post('/batch-comments/:commentId/solution', authorize('student', 'faculty', 'admin'), submitSolution);
router.put('/batch-comments/:commentId/status', authorize('admin'), updateSolutionStatus);

// General remarks discussion
router.post('/remarks', authorize('admin', 'faculty', 'student'), validate(remarkSchema), addRemark);
router.put('/remarks/:remarkId', authorize('admin', 'faculty', 'student'), updateRemark);

module.exports = router;
