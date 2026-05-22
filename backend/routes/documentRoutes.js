const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  createDocument,
  getDocumentById,
  updateDocument,
  getAllDocuments,
  deleteDocument,
  shareDocument,
  getChatHistory,
} = require('../controllers/documentController');

router.use(authMiddleware);

router.route("/").post(createDocument).get(getAllDocuments);
router.route("/:id").get(getDocumentById).put(updateDocument).delete(deleteDocument);
router.route("/share/:id").post(shareDocument);
router.route("/:id/chat").get(getChatHistory);

module.exports = router;
