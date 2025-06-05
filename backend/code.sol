// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TicketNFT is ERC721, Ownable {
    /// @dev Lưu giá vé (wei) cho mỗi tokenId; 
    ///      nếu giá = 0 nghĩa là token đó chưa được mint
    mapping(uint256 => uint256) public ticketPrices;

    event TicketPurchased(uint256 indexed tokenId, address indexed buyer, uint256 price);

    constructor() ERC721("EventTicket", "ETKT") Ownable(msg.sender) {}

    /// @dev Bất kỳ ai cũng có thể mint một token mới (tokenId do họ tự chọn).
    ///      Sau khi mint, hợp đồng sẽ giữ token đó và lưu giá priceWei.
    function mint(uint256 tokenId, uint256 priceWei) external {
        // _safeMint(address(this), tokenId): mint token về chính contract
        _safeMint(address(this), tokenId);
        ticketPrices[tokenId] = priceWei;
    }

    /// @dev Bất kỳ ai cũng có thể mint hàng loạt bằng 1 lần gọi.
    ///      tokenIds: mảng các tokenId mà họ muốn mint (số nguyên  > 0).
    function batchMint(uint256[] calldata tokenIds, uint256 priceWei) external {
        uint256 len = tokenIds.length;
        for (uint256 i = 0; i < len; i++) {
            _safeMint(address(this), tokenIds[i]);
            ticketPrices[tokenIds[i]] = priceWei;
        }
    }

    /// @dev Bất kỳ ai cũng có thể mint cố định tokenId = 1.
    ///      Nếu token #1 đã tồn tại, _safeMint sẽ revert (đúng spec ERC-721).
    function mintID1(uint256 priceWei) external {
        _safeMint(address(this), 1);
        ticketPrices[1] = priceWei;
    }

    /// @dev Người mua gọi để mua vé, gửi ETH đúng bằng giá ghi trong ticketPrices[tokenId].
    function purchaseTicket(uint256 tokenId) external payable {
        uint256 price = ticketPrices[tokenId];
        require(price > 0, "Ticket not available");
        require(msg.value >= price, "Not enough ETH");
        require(ownerOf(tokenId) == address(this), "Ticket already sold");

        // Chuyển vé từ contract sang buyer
        _safeTransfer(address(this), msg.sender, tokenId, "");

        // Hoàn phần dư ETH (nếu có)
        if (msg.value > price) {
            payable(msg.sender).transfer(msg.value - price);
        }
        emit TicketPurchased(tokenId, msg.sender, price);
    }

    /// @dev Chỉ chủ hợp đồng mới rút được ETH (đã bán vé) ra khỏi contract.
    function withdrawFunds() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds");
        payable(owner()).transfer(balance);
    }

    /// @dev Lấy giá vé on-chain (return 0 nếu token chưa mint).
    function getTicketPrice(uint256 tokenId) external view returns (uint256) {
        return ticketPrices[tokenId];
    }
}
