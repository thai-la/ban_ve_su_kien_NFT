const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');
const ethers = require('ethers');  // import nguyên gói

router.post('/', async (req, res) => {
  console.log('Received body:', req.body);

  const { walletAddress, signature } = req.body;
  if (!walletAddress || !signature) return res.status(400).json({ error: 'Thiếu dữ liệu' });

  const [userRows] = await db.query('SELECT * FROM users WHERE wallet_address = ?', [walletAddress]);
  if (!userRows.length) return res.status(404).json({ error: 'User không tồn tại' });

  const nonce = userRows[0].nonce;

  try {
    recovered = ethers.verifyMessage(nonce, signature)
    console.log('Recovered address:', recovered);

    if (recovered.toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(401).json({ error: 'Xác thực thất bại' });
    }
  } catch (e) {
    console.error('Lỗi xác thực:', e);
    return res.status(400).json({ error: 'Chữ ký không hợp lệ' });
  }

  const newNonce = crypto.randomBytes(16).toString('hex');
  await db.query('UPDATE users SET nonce=? WHERE wallet_address=?', [newNonce, walletAddress]);

  req.session.walletAddress = walletAddress;
  req.session.save(err => {
    if (err) {
      console.error('Lỗi khi lưu session:', err);
      console.log('Recovered address:', recovered);
      console.log('Gán session.walletAddress =', req.session.walletAddress);
      return res.status(500).json({ error: 'Lỗi lưu session' });
    }
    res.json({ success: true });
  });
});
console.error('Hoàn thành');
module.exports = router;