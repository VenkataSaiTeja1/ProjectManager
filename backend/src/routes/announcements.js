const express = require('express');
const { getAll, create, update, remove } = require('../controllers/announcementController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, announcementSchema } = require('../validators/schemas');

const router = express.Router();

router.use(authenticate);

router.get('/', getAll);
router.post('/', authorize('admin'), validate(announcementSchema), create);
router.put('/:id', authorize('admin'), update);
router.delete('/:id', authorize('admin'), remove);

module.exports = router;
