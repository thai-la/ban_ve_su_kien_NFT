
const db = require('../db');

async function requireAuth(req, res, next) {
  // In ra cookie và session để debug
  console.log('>>>>> CO 1 REQUEST ĐẾN /purchase <<<<<<');
  console.log('── requireAuth: headers.cookie =', req.headers.cookie);
  console.log('── requireAuth: req.session.walletAddress =', req.session.walletAddress);

  if (!req.session.walletAddress) {
    return res.status(401).json({ error: 'Chưa đăng nhập' });
  }

  const [rows] = await db.query(
    'SELECT user_id FROM users WHERE wallet_address = ?',
    [req.session.walletAddress]
  );

  if (!rows.length) {
    return res.status(404).json({ error: 'User không tồn tại' });
  }

  req.user = { id: rows[0].user_id };

  next();
}

// Bắt buộc phải là admin (đọc cột is_admin từ DB)
async function requireAdmin(req, res, next) {
  const wallet = req.session.walletAddress;
  if (!wallet) {
    return res.status(401).json({ error: 'Chưa đăng nhập' });
  }

  const [rows] = await db.query(
    'SELECT is_admin FROM users WHERE wallet_address = ?',
    [wallet]
  );
  if (!rows.length) {
    return res.status(404).json({ error: 'User không tồn tại' });
  }
  if (rows[0].is_admin !== 1) {
    return res.status(403).json({ error: 'Bạn không có quyền truy cập' });
  }

  next();
}

module.exports = { requireAuth, requireAdmin };
