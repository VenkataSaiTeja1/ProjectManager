const express = require('express');
const { getAll, create, remove } = require('../controllers/holidayController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, holidaySchema } = require('../validators/schemas');

const router = express.Router();

router.use(authenticate);

router.get('/', getAll);
router.post('/', authorize('admin'), validate(holidaySchema), create);
router.delete('/:id', authorize('admin'), remove);

module.exports = router;
