// js/tickets.js
import { getContract, getAccount } from './web3.js';
import { API_BASE } from './config.js';

// Mua vé trên event.html
export async function buyTicket(eventId) {
  const contract = getContract();
  const wallet = await getAccount();
  const tokenURI = prompt('Nhập metadata URI cho NFT của bạn');
  const tx = await contract.mint(wallet, tokenURI);
  const receipt = await tx.wait();
  const tokenId = receipt.events[0].args.tokenId.toString();

  // Ghi backend
  await fetch(API_BASE + '/tickets', {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ event_id: eventId, buyer_wallet: wallet, token_id: tokenId, tx_hash: receipt.transactionHash })
  });
  alert('Mua vé thành công, token #' + tokenId);
}

// Hiển thị vé trên profile.html
export async function loadMyTickets() {
  const wallet = localStorage.getItem('wallet');
  const res = await (API_BASE + '/tickets/' + wallet);
  const tickets = await res.json();
  const container = document.getElementById('myTickets');
  container.innerHTML = '';
  tickets.forEach(t => {
    const div = document.createElement('div');
    div.className = 'ticket-card';
    div.innerHTML = `
      <h4>${t.title} (#${t.token_id})</h4>
      <p>Sự kiện: ${new Date(t.event_start).toLocaleString()}</p>
    `;
    container.append(div);
  });
}

if (document.getElementById('myTickets')) {
  loadMyTickets();
}