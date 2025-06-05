// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TicketNFT is ERC721, Ownable {
    mapping(uint256 => uint256) public ticketPrices;
    event TicketPurchased(uint256 indexed tokenId, address indexed buyer, uint256 price);

    // Gọi Ownable(msg.sender) để owner on-chain = ví deploy
    constructor() ERC721("EventTicket", "ETKT") Ownable(msg.sender) {}

    // Bất kỳ ai cũng có thể mint
    function mint(uint256 tokenId, uint256 priceWei) external {
        _mint(address(this), tokenId);
        ticketPrices[tokenId] = priceWei;
    }

    // Bất kỳ ai cũng có thể batch mint
    function batchMint(uint256[] calldata tokenIds, uint256 priceWei) external {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            _mint(address(this), tokenIds[i]);
            ticketPrices[tokenIds[i]] = priceWei;
        }
    }

    // Bất kỳ ai cũng có thể mint ID = 1
    function mintID1(uint256 priceWei) external {
        _mint(address(this), 1);
        ticketPrices[1] = priceWei;
    }

    // Người mua gọi để mua vé
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

    // Chỉ owner mới rút ETH
    function withdrawFunds() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds");
        payable(owner()).transfer(balance);
    }

    function getTicketPrice(uint256 tokenId) external view returns (uint256) {
        return ticketPrices[tokenId];
    }
}
