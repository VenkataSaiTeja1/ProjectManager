const express = require('express');
const multer = require('multer');
const {
  getAll,
  getById,
  create,
  update,
  resetPassword,
  deactivate,
  bulkImport,
  getImportTemplate,
} = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, createUserSchema, updateUserSchema } = require('../validators/schemas');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

const router = express.Router();

router.use(authenticate);

router.get('/template', authorize('admin'), getImportTemplate);
router.get('/', authorize('admin'), getAll);
router.get('/:id', authorize('admin'), getById);
router.post('/', authorize('admin'), validate(createUserSchema), create);
router.put('/:id', authorize('admin'), validate(updateUserSchema), update);
router.post('/:id/reset-password', authorize('admin'), resetPassword);
router.post('/:id/deactivate', authorize('admin'), deactivate);
router.post('/bulk-import', authorize('admin'), upload.single('file'), bulkImport);

module.exports = router;
