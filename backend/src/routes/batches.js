const express = require('express');
const { getAll, getById, create, update, remove } = require('../controllers/batchController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, batchSchema } = require('../validators/schemas');

const router = express.Router();

router.use(authenticate);

router.get('/', getAll);
router.get('/:id', getById);
router.post('/', authorize('admin'), validate(batchSchema), create);
router.put('/:id', authorize('admin'), validate(batchSchema), update);
router.delete('/:id', authorize('admin'), remove);

module.exports = router;
