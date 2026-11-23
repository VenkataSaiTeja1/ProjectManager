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
router.post('/remarks', authorize('admin', 'faculty'), validate(remarkSchema), addRemark);
router.put('/remarks/:remarkId', authorize('admin', 'faculty'), updateRemark);

module.exports = router;
