const express = require('express');
const path = require('path');  // Thêm dòng này
const cors = require('cors');
const session = require('express-session');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;
require('./eventListeners/ticketEvents');

app.use(cors({
  origin: function(origin, callback){
    // Cho phép frontend từ localhost và 127.0.0.1
    if (!origin || origin.startsWith('http://localhost:5500') || origin.startsWith('http://127.0.0.1')) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
}));
app.use(
  '/backend/public/event-nft-frontend',
  express.static(path.join(process.cwd(), 'public/event-nft-frontend'))
);
app.use(express.json());
app.use(session({
  secret: 'batthunhat123',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,  // localhost HTTP nên false
    sameSite: 'lax', // hoặc 'none' nếu dùng HTTPS
  }
}));

// Serve frontend tĩnh ở thư mục public (đảm bảo copy frontend vào đây)
app.use(
  express.static(
    path.join(__dirname, 'public', 'event-nft-frontend')
  )
);

// Routes
const eventRoutes = require('./routes/events');
const ticketRoutes = require('./routes/tickets');
const usersRouter = require('./routes/users');
const authenticateRouter = require('./routes/authenticate');
app.use('/api/authenticate', authenticateRouter);
app.use('/api/users', usersRouter);
app.use('/api/events', eventRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/auth', require('./routes/auth'));   // chứa GET /me
// Chỉ gọi app.listen MỘT LẦN DUY NHẤT!
app.listen(port, () => {
  console.log('\n======================================');
  console.log(`Backend API server đang chạy tại:`);
  console.log(`→ http://localhost:${port}`);
  console.log('Ví dụ API endpoint (nonce):');
  
  console.log(`→ http://localhost:${port}/api/users?walletAddress=0x123...`);
  console.log('======================================\n');
});
