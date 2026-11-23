const express = require('express');
const { getAll, getById, create, update, remove } = require('../controllers/paperController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, paperSchema } = require('../validators/schemas');

const router = express.Router();

router.use(authenticate);

router.get('/', getAll);
router.get('/:id', getById);
router.post('/', authorize('admin'), validate(paperSchema), create);
router.put('/:id', authorize('admin'), update);
router.delete('/:id', authorize('admin'), remove);

module.exports = router;
