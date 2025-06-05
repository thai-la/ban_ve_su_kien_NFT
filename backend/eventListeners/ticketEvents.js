// const { ethers } = require("ethers");
// const db = require('../db'); // cấu hình pool mysql2

// const provider = new ethers.JsonRpcProvider("https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID");
// const contractAddress = "YOUR_CONTRACT_ADDRESS";
// const contractABI = [
//   "event TicketPurchased(uint256 ticketId, address indexed buyer, uint256 price)",
// ];
// const contract = new ethers.Contract(contractAddress, contractABI, provider);

// contract.on("TicketPurchased", async (ticketId, buyer, price) => {
//   try {
//     // Giả sử bạn có bảng purchase: purchase_id, ticket_id, user_id, purchase_date, status
//     await db.query(
//       'INSERT INTO purchase (ticket_id, user_id, purchase_date, status) VALUES (?, ?, NOW(), ?)',
//       [ticketId.toNumber(), buyer, 'Đang chờ']
//     );
//     console.log('Đã lưu giao dịch mua vé:', ticketId.toString(), buyer);
//   } catch (err) {
//     console.error('Lỗi lưu giao dịch mua vé:', err);
//   }
// });
