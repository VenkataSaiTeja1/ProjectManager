const express = require('express');
const multer = require('multer');
const {
  getAll,
  getById,
  create,
  update,
  remove,
  addMember,
  removeMember,
  bulkImport,
  getTeamImportTemplate,
} = require('../controllers/teamController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, teamSchema } = require('../validators/schemas');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const router = express.Router();

router.use(authenticate);

router.get('/template', authorize('admin'), getTeamImportTemplate);
router.get('/', getAll);
router.get('/:id', getById);
router.post('/', authorize('admin'), validate(teamSchema), create);
router.put('/:id', authorize('admin'), update);
router.delete('/:id', authorize('admin'), remove);
router.post('/:id/members', authorize('admin'), addMember);
router.delete('/:id/members/:userId', authorize('admin'), removeMember);
router.post('/bulk-import', authorize('admin'), upload.single('file'), bulkImport);

module.exports = router;
