const express = require('express');
const { getAll, create, remove } = require('../controllers/followupController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, followupSchema } = require('../validators/schemas');

const router = express.Router();

router.use(authenticate);

router.get('/', authorize('admin'), getAll);
router.post('/', authorize('admin'), validate(followupSchema), create);
router.delete('/:id', authorize('admin'), remove);

module.exports = router;
