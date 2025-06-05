// File: backend/controllers/ticketController.js
const db = require('../db'); // kết nối mysql2/promise pool
const { ethers } = require('ethers');
const { CONTRACT_ADDRESS, CONTRACT_ABI } = require('../contractConfig'); 
// 1. Admin: lấy tất cả vé (có filter, phân trang)
exports.getAllTickets = async (req, res) => {
  try {
    const { event_id, status, ticket_type, limit = 30, offset = 0 } = req.query;
    let whereClauses = [];
    let params = [];

    if (event_id) {
      whereClauses.push('t.event_id = ?');
      params.push(event_id);
    }
    if (status) {
      whereClauses.push('t.status = ?');
      params.push(status);
    }
    if (ticket_type) {
      whereClauses.push('t.ticket_type = ?');
      params.push(ticket_type);
    }

    const whereSQL = whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : '';

    // Lấy tổng số vé
    const [countRows] = await db.query(`SELECT COUNT(*) as total FROM tickets t ${whereSQL}`, params);
    const totalCount = countRows[0].total;

    // Lấy vé cùng tên sự kiện (join bảng events)
    const sql = `
      SELECT t.ticket_id, t.event_id, t.ticket_type, t.price, t.status, e.event_name
      FROM tickets t
      JOIN events e ON t.event_id = e.event_id
      ${whereSQL}
      ORDER BY t.ticket_id DESC
      LIMIT ? OFFSET ?
    `;
    params.push(parseInt(limit, 10), parseInt(offset, 10));
    const [tickets] = await db.query(sql, params);

    res.json({ tickets, totalCount });
  } catch (err) {
    console.error('Lỗi getAllTickets:', err);
    res.status(500).json({ error: 'Lỗi server khi lấy vé' });
  }
};

// 2. User: lấy vé theo wallet (vé user đã mua)
exports.getTicketsByWallet = async (req, res) => {
  try {
    const wallet = req.params.wallet;
    const sql = `
      SELECT t.ticket_id, t.event_id, t.ticket_type, t.price, t.status, e.event_name
      FROM tickets t
      JOIN events e ON t.event_id = e.event_id
      JOIN purchases p ON t.ticket_id = p.ticket_id
      JOIN users u ON p.user_id = u.user_id
      WHERE u.wallet_address = ?
      ORDER BY p.purchase_date DESC
    `;
    const [tickets] = await db.query(sql, [wallet]);
    res.json(tickets);
  } catch (err) {
    console.error('Lỗi getTicketsByWallet:', err);
    res.status(500).json({ error: 'Lỗi server khi lấy vé người dùng' });
  }
};

// 3. User: mua vé
exports.purchaseTicket = async (req, res) => {
  console.log('<<<<< REQUEST XONG /purchase');
  const wallet = req.session.walletAddress;
  const { ticket_id } = req.body;
  const userId = req.user.id;  
  console.log('── purchaseTicket: req.session.walletAddress =', wallet);
  console.log('── purchaseTicket: req.body =', req.body);

  if (!wallet) {
    return res.status(401).json({ error: 'Chưa đăng nhập' });
  }
  if (!ticket_id) {
    return res.status(400).json({ error: 'Thiếu ticket_id' });
  }

  try {
    // Kiểm tra vé tồn tại và chưa bán
    const [rows] = await db.query(
      'SELECT status FROM tickets WHERE ticket_id = ?',
      [ticket_id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Vé không tồn tại' });
    }
    if (rows[0].status !== 'Mới tạo') {
      return res.status(400).json({ error: 'Vé đã được bán hoặc không thể mua' });
    }
    await db.query(
      'UPDATE tickets SET status = ? WHERE ticket_id = ?',
      ['Đã bán', ticket_id] 
    );

    // Bây giờ INSERT vào purchases phải có cả user_id
    await db.query(
      'INSERT INTO purchases (user_id, wallet, ticket_id, status) VALUES (?, ?, ?, ?)',
      [userId, wallet, ticket_id, 'Đang chờ']
    );
    return res.json({ success: true });
  } catch (error) {
    console.error('Lỗi purchaseTicket:', error);
    return res.status(500).json({ error: 'Lỗi server khi mua vé' });
  }
};


// 4. Admin: thu hồi/xóa vé (cập nhật trạng thái thành Hủy)
exports.revokeTicket = async (req, res) => {
  try {
    const ticketId = req.params.ticketId;
    await db.query('UPDATE tickets SET status = ? WHERE ticket_id = ?', ['Hủy', ticketId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Lỗi revokeTicket:', err);
    res.status(500).json({ error: 'Lỗi server khi thu hồi vé' });
  }
};

// backend/controllers/ticketController.js

exports.createTicketsBulk = async (req, res) => {
  try {
    const { event_id, ticket_type, price, quantity } = req.body;
    if (!event_id || !ticket_type || price == null || quantity == null) {
      return res.status(400).json({ error: 'Thiếu thông tin tạo vé' });
    }
    const qty = parseInt(quantity, 10);
    if (qty <= 0) return res.status(400).json({ error: 'Số lượng phải > 0' });

    // 1. Chuẩn bị mảng insertValue và insert vào DB
    const insertValues = [];
    for (let i = 0; i < qty; i++) {
      insertValues.push([event_id, ticket_type, price, 'Mới tạo']);
    }
    const [result] = await db.query(
      'INSERT INTO tickets (event_id, ticket_type, price, status) VALUES ?',
      [insertValues]
    );
    // Lấy ID của bản ghi đầu tiên trong batch
    const firstInsertId = result.insertId;
    // Tạo mảng ticketIds vừa insert: [firstInsertId, firstInsertId+1, ..., firstInsertId+qty-1]
    const ticketIds = [];
    for (let i = 0; i < qty; i++) {
      ticketIds.push(firstInsertId + i);
    }

    // 2. Trả về danh sách ticketIds và giá (price) để frontend mint
    return res.json({ success: true, ticketIds, price });
  } catch (err) {
    console.error('Lỗi createTicketsBulk:', err.message, err.stack);
    return res.status(500).json({ error: 'Lỗi server khi tạo vé' });
  }
};

// 6. Admin: cập nhật trạng thái vé
exports.updateTicketStatus = async (req, res) => {
  try {
    const ticketId = req.params.ticketId;
    const { newStatus } = req.body;

    const validStatuses = ['Mới tạo', 'Đã bán', 'Hủy', 'Đang chờ', 'Đã xác nhận'];
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({ error: 'Trạng thái vé không hợp lệ' });
    }

    await db.query('UPDATE tickets SET status = ? WHERE ticket_id = ?', [newStatus, ticketId]);
    res.json({ success: true, newStatus });
  } catch (err) {
    console.error('Lỗi updateTicketStatus:', err);
    res.status(500).json({ error: 'Lỗi server khi cập nhật trạng thái vé' });
  }
};

exports.getAvailableTicketsByEvent = async (req, res) => {
  try {
    const eventId = req.query.event_id;
    if (!eventId) return res.status(400).json({ error: 'Thiếu event_id' });

    const [tickets] = await db.query(
      "SELECT ticket_id, ticket_type, price FROM tickets WHERE event_id = ? AND status = 'Mới tạo'",
      [eventId]
    );

    res.json(tickets);
  } catch (err) {
    console.error('Lỗi lấy vé:', err);
    res.status(500).json({ error: 'Lỗi lấy vé' });
  }
};

exports.deleteTicketsBulk = async (req, res) => {
  try {
    const { ticketIds } = req.body;
    if (!Array.isArray(ticketIds) || ticketIds.length === 0) {
      return res.status(400).json({ error: 'Thiếu ticketIds để xóa' });
    }
    // Sử dụng query dạng "DELETE FROM tickets WHERE ticket_id IN (?)"
    await db.query('DELETE FROM tickets WHERE ticket_id IN (?)', [ticketIds]);
    return res.json({ success: true, deleted: ticketIds.length });
  } catch (err) {
    console.error('Lỗi deleteTicketsBulk:', err);
    return res.status(500).json({ error: 'Lỗi server khi xóa vé' });
  }
};