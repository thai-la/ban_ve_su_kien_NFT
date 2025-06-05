const router = require('express').Router();
const ctrl   = require('../controllers/eventController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Xem danh sách / chi tiết (có thể bắt login nếu muốn)
router.get('/',    /* requireAuth, */ ctrl.getAllEvents);
router.get('/:id', /* requireAuth, */ ctrl.getEventById);

// ADMIN-ONLY: tạo / sửa / xóa
router.post('/',    requireAdmin, ctrl.createEvent);
router.put('/:id',  requireAdmin, ctrl.updateEvent);
router.delete('/:id', requireAdmin, ctrl.deleteEvent);

module.exports = router;
