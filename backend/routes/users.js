// File: backend/routes/users.js
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const path = require('path');
const multer = require('multer');
const db = require('../db'); // pool mysql2

// Setup Multer storage for avatar uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Save avatars in public/event-nft-frontend/images
    cb(null, path.join(__dirname, '../public/event-nft-frontend/images'));
  },
  filename: (req, file, cb) => {
    // Unique filename: user_wallet_timestamp.ext
    const wallet = req.session.walletAddress || 'anon';
    const ext = path.extname(file.originalname);
    cb(null, `${wallet}_${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

function generateNonce() {
  return crypto.randomBytes(16).toString('hex');
}

function autoUsername(wallet) {
  const clean = wallet.replace(/^0x/i, '');
  const first4 = clean.slice(0, 4);
  const last3 = clean.slice(-3);
  return `user_${first4}_${last3}`;
}

// GET /users?walletAddress=0x...
router.get('/', async (req, res) => {
  const wallet = req.query.walletAddress;
  if (!wallet) return res.status(400).json({ error: 'Thiếu walletAddress' });

  const [user] = await db.query(
    'SELECT * FROM users WHERE wallet_address = ?',
    [wallet]
  );
  if (user.length > 0) {
    return res.json({ nonce: user[0].nonce });
  } else {
    const nonce = generateNonce();
    const username = autoUsername(wallet);
    await db.query(
      'INSERT INTO users (wallet_address, nonce, username) VALUES (?, ?, ?)',
      [wallet, nonce, username]
    );
    return res.json({ nonce });
  }
});

// PUT /users/update-profile (multipart/form-data for avatar)
router.put('/update-profile', upload.single('avatarFile'), async (req, res) => {
  const walletAddress = req.session.walletAddress;  // Lấy trực tiếp từ session
  if (!walletAddress) {
    return res.status(401).json({ error: 'Chưa đăng nhập' });
  }

  const { username, email, dob } = req.body;
  if (!username || !email || !dob) {
    return res.status(400).json({ error: 'Không được để trống trường nào' });
  }
  // Validation email, dob tương tự như trước...

  const avatarFilename = req.file ? req.file.filename : null;

  const fields = [];
  const params = [];

  fields.push('username = ?'); params.push(username);
  fields.push('email = ?');    params.push(email);
  fields.push('dob = ?');      params.push(dob);
  if (avatarFilename) {
    fields.push('avatar_url = ?');
    params.push(avatarFilename);
  }
  params.push(walletAddress);

  const sql = `UPDATE users SET ${fields.join(', ')} WHERE wallet_address = ?`;
  try {
    await db.query(sql, params);
    res.json({ success: true });
  } catch (e) {
    console.error('Lỗi update profile:', e);
    res.status(500).json({ error: 'Cập nhật thất bại' });
  }
});

// GET /users/profile
router.get('/profile', async (req, res) => {
  const walletAddress = req.session.walletAddress;
  if (!walletAddress) {
    return res.status(401).json({ error: 'Chưa đăng nhập' });
  }

  const [userRows] = await db.query(
    'SELECT user_id, wallet_address, username, email, dob, created_at, updated_at, avatar_url, is_admin FROM users WHERE wallet_address = ?',
    [walletAddress]
  );
  if (!userRows.length) {
    return res.status(404).json({ error: 'User không tồn tại' });
  }

  const u = userRows[0];
  // Construct avatar URL
  const avatar = u.avatar_url
    ? `/backend/public/event-nft-frontend/images/${u.avatar_url}`
    : '/backend/public/event-nft-frontend/images/avatar-placeholder.jpg';

  res.json({
    user_id: u.user_id,
    wallet_address: u.wallet_address,
    username: u.username,
    email: u.email,
    dob: u.dob,
    created_at: u.created_at,
    updated_at: u.updated_at,
    avatar_url: avatar,
    isAdmin: u.is_admin === 1
  });
});

// POST /users/logout
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ error: 'Đăng xuất thất bại' });
    }
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

module.exports = router;