const router = require('express').Router();
const express = require('express');
const ctrl = require('../controllers/ticketController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// 1. Admin-only: list all ticket
router.get('/admin', requireAdmin, ctrl.getAllTickets); // Route admin lấy vé phân trang
// 2. User-only: lấy vé còn trống của event
router.get('/available', requireAuth, ctrl.getAvailableTicketsByEvent);

// 3. User-only: xem vé của chính họ theo wallet
router.get('/:wallet', requireAuth, ctrl.getTicketsByWallet);

// 4. User-only: mua vé
router.post('/purchase', requireAuth, ctrl.purchaseTicket);

router.post('/createBulk', ctrl.createTicketsBulk);

// 2. Rollback nếu mint lỗi (deleteBulk)
router.post('/deleteBulk', ctrl.deleteTicketsBulk);

// 6. Admin-only: thu hồi/xóa vé
router.delete('/:ticketId', requireAdmin, ctrl.revokeTicket);

// router.post('/purchase-confirm', requireAuth, ctrl.confirmPurchase);    

module.exports = router;
