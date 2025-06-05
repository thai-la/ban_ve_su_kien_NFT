// js/purchase.js

import { API_BASE, CONTRACT_ADDRESS, CONTRACT_ABI } from './config.js';

window.addEventListener('DOMContentLoaded', () => {
  const eventInfo    = document.getElementById('eventInfo');
  const ticketsList  = document.getElementById('ticketsBody');
  const filterType   = document.getElementById('filterType');
  const prevPage     = document.getElementById('prevPage');
  const nextPage     = document.getElementById('nextPage');
  const pageInfo     = document.getElementById('pageInfo');

  const urlParams    = new URLSearchParams(window.location.search);
  const eventId      = urlParams.get('event_id');
  let tickets        = [];
  let currentPage    = 1;
  const pageSize     = 10;
  let totalPages     = 1;

  // 1. Khi đổi lọc hoặc phân trang, gọi loadTickets lại
  filterType.addEventListener('change', () => {
    currentPage = 1;
    loadTickets(eventId);
  });
  prevPage.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      loadTickets(eventId);
    }
  });
  nextPage.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      loadTickets(eventId);
    }
  });

  // 2. Load thông tin event, sau đó fetch type + load vé
  async function loadEvent() {
    if (!eventId) {
      alert("Không có ID sự kiện.");
      return;
    }

    try {
      const eventRes = await fetch(`${API_BASE}/events/${eventId}`, { credentials: 'include' });
      if (!eventRes.ok) throw new Error("Không thể lấy thông tin sự kiện");

      const event = await eventRes.json();
      eventInfo.innerHTML = `
        <h2 style="text-align: center;">${event.event_name}</h2>
        <p style="text-align: center;">
          <strong>Thời gian:</strong> ${new Date(event.start_date).toLocaleString()} - ${new Date(event.end_date).toLocaleString()}
        </p>
      `;

      await fetchTicketTypes(eventId);
      await loadTickets(eventId);
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu sự kiện:', error);
      alert('Có lỗi xảy ra, vui lòng thử lại.');
    }
  }

  // 3. Lấy danh sách loại vé (để điền vào <select id="filterType">)
  async function fetchTicketTypes(eventId) {
    try {
      const res = await fetch(`${API_BASE}/tickets/available?event_id=${eventId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Không thể lấy loại vé');

      const data = await res.json();
      const types = new Set(data.map(t => t.ticket_type));

      // Xóa các option cũ (chỉ giữ lại option đầu)
      while (filterType.options.length > 1) {
        filterType.remove(1);
      }
      types.forEach(type => {
        const opt = document.createElement('option');
        opt.value       = type;
        opt.textContent = type;
        filterType.appendChild(opt);
      });
    } catch (err) {
      console.error('Lỗi lấy loại vé:', err);
    }
  }

  // 4. Tải vé (có filter + phân trang), rồi gán nút Mua cho mỗi vé
  async function loadTickets(eventId) {
    if (!eventId) return;

    const selectedType = filterType.value;
    try {
      let url = `${API_BASE}/tickets/available?event_id=${eventId}`;
      if (selectedType) {
        url += `&ticket_type=${encodeURIComponent(selectedType)}`;
      }

      const ticketsRes = await fetch(url, { credentials: 'include' });
      if (!ticketsRes.ok) throw new Error("Không thể lấy vé");

      tickets = await ticketsRes.json();
      const totalCount = tickets.length;
      totalPages = Math.ceil(totalCount / pageSize);
      if (currentPage > totalPages) currentPage = totalPages || 1;

      const startIndex = (currentPage - 1) * pageSize;
      const paged = tickets.slice(startIndex, startIndex + pageSize);

      ticketsList.innerHTML = '';
      if (paged.length === 0) {
        ticketsList.innerHTML = `<tr><td colspan="4" style="text-align:center;">Hết vé.</td></tr>`;
      } else {
        paged.forEach(ticket => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${ticket.ticket_id}</td>
            <td>${ticket.ticket_type}</td>
            <td>${ticket.price}</td>
            <td><button data-ticket-id="${ticket.ticket_id}" class="buyBtn">Mua</button></td>
          `;
          ticketsList.appendChild(tr);
        });
      }

      // Cập nhật nút pagination
      prevPage.disabled = currentPage <= 1;
      nextPage.disabled = currentPage >= totalPages;
      pageInfo.textContent = `Trang ${currentPage} / ${totalPages || 1}`;

      // Gán sự kiện “Mua” (click) cho từng nút .buyBtn
      document.querySelectorAll('.buyBtn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const ticketId = e.target.dataset.ticketId;
          await buyTicket(ticketId);
        });
      });
    } catch (err) {
      console.error('Lỗi khi tải vé:', err);
      ticketsList.innerHTML = `<tr><td colspan="4" style="text-align:center;">Có lỗi xảy ra, vui lòng thử lại.</td></tr>`;
    }
  }

  // 5. Hàm buyTicket (on‐chain + gọi backend), nằm chung scope với loadTickets
  async function buyTicket(tokenId) {
    // 5.1. Lấy thông tin vé từ mảng tickets (DB)
    const ticket = tickets.find(t => t.ticket_id === parseInt(tokenId));
    if (!ticket) {
      alert('Không tìm thấy vé.');
      return;
    }

    // 5.2. Kiểm tra MetaMask
    if (!window.ethereum) {
      alert('Cần cài MetaMask để mua vé');
      return;
    }

    try {
      // Kết nối MetaMask
      await ethereum.request({ method: 'eth_requestAccounts' });
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer   = provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

      // 5.3. Kiểm tra owner on‐chain
      const owner = await contract.ownerOf(tokenId);
      if (owner.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase()) {
        alert('Vé này đã được bán hoặc không thể mua');
        return;
      }

      // 5.4. Lấy giá vé on‐chain (wei)
      const priceWeiOnChain = await contract.ticketPrices(tokenId);
      // Hoặc nếu ABI có getTicketPrice: 
      // const priceWeiOnChain = await contract.getTicketPrice(tokenId);

      // 5.5. Gửi giao dịch mua vé
      const contractWithSigner = contract.connect(signer);
      const tx = await contractWithSigner.purchaseTicket(tokenId, { value: priceWeiOnChain });

      alert('Đang chờ xác nhận giao dịch...');
      await tx.wait();
      alert('Mua vé thành công trên blockchain!');

      // 5.6. Gọi backend để cập nhật DB
      const res = await fetch(`${API_BASE}/tickets/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ticket_id: tokenId }),
      });

      if (!res.ok) {
        const errData = await res.json();
        alert('Lỗi khi xác nhận vé backend: ' + errData.error);
        return;
      }

      alert('Cập nhật vé thành công ở backend!');
      // Sau khi backend thành công, reload danh sách vé
      loadTickets(eventId);
    } catch (error) {
      console.error('Lỗi mua vé:', error);
      alert('Mua vé thất bại: ' + (error.data?.message || error.message || error));
    }
  }

  // Bắt đầu: load event và vé đầu tiên
  loadEvent();
});
