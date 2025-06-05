// routes/auth.js  (ví dụ)
const express = require('express');
const router = express.Router();

router.get('/me', (req, res) => {
  if (!req.session.walletAddress) {
    return res.status(401).json({ error: 'Chưa đăng nhập' });
  }
  res.json({ user: { wallet: req.session.walletAddress } });
});

module.exports = router;
