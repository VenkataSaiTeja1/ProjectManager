const express = require('express');
const { getAll } = require('../controllers/auditController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);
router.use(authorize('admin'));

router.get('/', getAll);

module.exports = router;
