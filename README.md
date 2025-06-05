<<<<<<< HEAD

# NFT Event Ticket System

## Giới thiệu

Hệ thống Vé Sự Kiện NFT cho phép người dùng mua vé cho các sự kiện thông qua blockchain. Vé được phát hành dưới dạng token ERC721, có thể giao dịch và xác thực trực tuyến thông qua hợp đồng thông minh. Đây là một hệ thống minh bạch, bảo mật, và dễ dàng xác minh.

## Các tính năng chính

- **Đăng nhập với MetaMask**: Người dùng có thể đăng nhập vào hệ thống thông qua ví MetaMask.
- **Mint vé NFT**: Vé được mint trực tiếp trên blockchain, mỗi vé là một token NFT duy nhất.
- **Mua vé bằng ETH**: Người dùng có thể mua vé bằng Ethereum thông qua MetaMask.
- **Cập nhật trạng thái vé**: Vé được đánh dấu là "Đã bán" khi được mua, và không thể mua lại.
- **Xác thực vé**: Vé được xác thực và liên kết trực tiếp với người sở hữu.

## Mục tiêu hệ thống

- Cung cấp một nền tảng mua bán vé trực tuyến minh bạch, không thể giả mạo.
- Tích hợp hệ thống thanh toán qua ETH và giao dịch thông qua MetaMask.
- Hỗ trợ mint, giao dịch và quản lý vé trên blockchain.

## Cấu trúc thư mục

```
.
├── backend
│   ├── controllers
│   ├── db
│   ├── eventListeners
│   ├── routes
│   ├── server.js
│   └── ticketController.js
├── frontend
│   ├── css
│   ├── js
│   ├── public
│   └── index.html
├── contract
│   └── TicketNFT.sol
└── README.md
```

## Cài đặt và cấu hình

### Backend

1. **Cài đặt dependencies**

   Đảm bảo bạn đã cài đặt Node.js. Sau đó cài đặt các dependencies cho backend:

   ```bash
   npm install
   ```

2. **Cấu hình cơ sở dữ liệu**

   - Tạo cơ sở dữ liệu MySQL và các bảng `users`, `tickets`, `purchases`.
   - Cập nhật thông tin kết nối trong `db.js`.

3. **Chạy backend**

   ```bash
   node server.js
   ```

   Mặc định server chạy tại cổng `3001` hoặc cấu hình trong `.env`.

4. **Các API routes**

   - `GET /api/events/:id` - Lấy thông tin sự kiện theo ID.
   - `GET /api/tickets/available` - Lấy danh sách vé còn trống.
   - `POST /api/tickets/purchase` - Thực hiện mua vé.
   - `POST /api/authenticate` - Xác thực người dùng thông qua MetaMask.

### Frontend

1. **Chuẩn bị**

   - Đảm bảo bạn đã cài MetaMask trong trình duyệt.
   - Đảm bảo frontend có kết nối đến backend đúng địa chỉ.

2. **Cài đặt dependencies (nếu có)**

   ```bash
   npm install
   ```

3. **Khởi chạy giao diện**

   - Mở `index.html` bằng trình duyệt.
   - Hoặc dùng tiện ích như Live Server (VS Code).

4. **Các trang chính**

   - `index.html`: Đăng nhập MetaMask.
   - `dashboard.html`: Trang chính sau đăng nhập.
   - `tickets.html`: Danh sách vé và thao tác mua.

### Quy trình đăng nhập

1. Người dùng nhấn "Kết nối ví".
2. MetaMask yêu cầu ký thông điệp (nonce).
3. Server xác thực chữ ký → tạo phiên làm việc (session).
4. Điều hướng sang `dashboard`.

### Quy trình mua vé

1. Người dùng chọn sự kiện + loại vé.
2. Nhấn "Mua vé", gọi hàm `purchaseTicket` trong smart contract.
3. Hệ thống xử lý giao dịch trên blockchain.
4. Giao dịch thành công → đánh dấu vé đã bán → thông báo.

## Hợp đồng thông minh: `TicketNFT.sol`

Hợp đồng được viết bằng Solidity sử dụng chuẩn ERC721.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TicketNFT is ERC721, Ownable {
    mapping(uint256 => uint256) public ticketPrices;

    event TicketPurchased(uint256 indexed tokenId, address indexed buyer, uint256 price);

    constructor() ERC721("EventTicket", "ETKT") Ownable(msg.sender) {}

    function mint(uint256 tokenId, uint256 priceWei) external {
        _safeMint(address(this), tokenId);
        ticketPrices[tokenId] = priceWei;
    }

    function batchMint(uint256[] calldata tokenIds, uint256 priceWei) external {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            _safeMint(address(this), tokenIds[i]);
            ticketPrices[tokenIds[i]] = priceWei;
        }
    }

    function purchaseTicket(uint256 tokenId) external payable {
        uint256 price = ticketPrices[tokenId];
        require(price > 0, "Ticket not available");
        require(msg.value >= price, "Not enough ETH");
        require(ownerOf(tokenId) == address(this), "Ticket already sold");

        _safeTransfer(address(this), msg.sender, tokenId, "");

        if (msg.value > price) {
            payable(msg.sender).transfer(msg.value - price);
        }

        emit TicketPurchased(tokenId, msg.sender, price);
    }

    function withdrawFunds() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds");
        payable(owner()).transfer(balance);
    }

    function getTicketPrice(uint256 tokenId) external view returns (uint256) {
        return ticketPrices[tokenId];
    }
}
```

## Các vấn đề có thể gặp

- **CORS**: Đảm bảo server backend cho phép request từ frontend.
- **MetaMask**: Đảm bảo MetaMask đã cài và chọn đúng network.
- **Gas Limit**: Giao dịch cần đủ gas, đặc biệt khi mint nhiều vé.

## Liên hệ

Nếu bạn có bất kỳ câu hỏi nào hoặc gặp sự cố, vui lòng liên hệ qua email hoặc mở issue trên GitHub repo của dự án.

---

⚠️ **Lưu ý**: Đây là hệ thống mẫu, chưachưa dùng trong môi trường sản xuất hoặc giao dịch tiền thật.
```
=======
# ban_ve_su_kien_NFT
>>>>>>> 1146475bf61ad9c6c5feac8497ba149dc6252636
"# ban_ve_su_kien_hat_NFT" 
