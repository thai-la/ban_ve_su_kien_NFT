
import { ethers } from 'https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.esm.min.js';
import { API_BASE, CONTRACT_ADDRESS, CONTRACT_ABI } from './config.js';
const ticketsBody = document.getElementById('ticketsBody');
const filterEvent = document.getElementById('filterEvent');
const filterStatus = document.getElementById('filterStatus');
const filterType = document.getElementById('filterType');
const btnFilter = document.getElementById('btnFilter');
const btnCreateTicket = document.getElementById('btnCreateTicket');
const createTicketModal = document.getElementById('createTicketModal');
const formCreateTicket = document.getElementById('formCreateTicket');
const selectEventForTicket = document.getElementById('selectEventForTicket');
const btnCancelCreate = document.getElementById('btnCancelCreate');
const prevPage = document.getElementById('prevPage');
const nextPage = document.getElementById('nextPage');
const pageInfo = document.getElementById('pageInfo');

let currentPage = 1;
const pageSize = 30;

let eventsList = [];
let ticketTypes = new Set();

async function fetchEvents() {
  const res = await fetch(`${API_BASE}/events`, { credentials: 'include' });
  if (!res.ok) throw new Error('Lỗi lấy danh sách sự kiện');
  const data = await res.json();
  eventsList = data;
  fillEventFilters();
}

function fillEventFilters() {
  // Dropdown lọc sự kiện
  filterEvent.innerHTML = '<option value="">Tất cả sự kiện</option>';
  selectEventForTicket.innerHTML = '<option value="">Chọn sự kiện</option>';
  eventsList.forEach(evt => {
    const option1 = document.createElement('option');
    option1.value = evt.event_id;
    option1.textContent = evt.event_name;
    filterEvent.appendChild(option1);

    const option2 = document.createElement('option');
    option2.value = evt.event_id;
    option2.textContent = evt.event_name;
    selectEventForTicket.appendChild(option2);
  });
}

async function fetchTickets(page = 1) {
  const eventId = filterEvent.value;
  const status = filterStatus.value;
  const type = filterType.value;

  // build query params
  const params = new URLSearchParams();
  params.append('limit', pageSize);
  params.append('offset', (page - 1) * pageSize);
  if (eventId) params.append('event_id', eventId);
  if (status) params.append('status', status);
  if (type) params.append('ticket_type', type);

  const res = await fetch(`${API_BASE}/tickets/admin?${params.toString()}`, { credentials: 'include' });
  if (!res.ok) throw new Error('Lỗi lấy vé');
  const { tickets, totalCount } = await res.json();

  fillTicketTable(tickets);
  updatePagination(page, totalCount);
  collectTicketTypes(tickets);
}

function fillTicketTable(tickets) {
  ticketsBody.innerHTML = '';
  tickets.forEach(ticket => {
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td>${ticket.ticket_id}</td>
      <td>${ticket.event_name}</td>
      <td>${ticket.ticket_type}</td>
      <td>${ticket.price}</td>
      <td>${ticket.status}</td>
      <td>
        ${ticket.status !== 'Mới tạo' ? `<button data-id="${ticket.ticket_id}" class="btnChangeStatus">Đổi trạng thái</button>` : ''}
      </td>
    `;
    ticketsBody.appendChild(tr);
  });

  // Gán event cho nút đổi trạng thái
  document.querySelectorAll('.btnChangeStatus').forEach(btn => {
    btn.addEventListener('click', async e => {
      const ticketId = e.target.dataset.id;
      await changeTicketStatus(ticketId);
    });
  });
}

function collectTicketTypes(tickets) {
  tickets.forEach(t => ticketTypes.add(t.ticket_type));
  fillTypeFilter();
}

function fillTypeFilter() {
  filterType.innerHTML = '<option value="">Tất cả loại vé</option>';
  [...ticketTypes].forEach(type => {
    const option = document.createElement('option');
    option.value = type;
    option.textContent = type;
    filterType.appendChild(option);
  });
}

function updatePagination(page, totalCount) {
  currentPage = page;
  const totalPages = Math.ceil(totalCount / pageSize);
  pageInfo.textContent = `Trang ${page} / ${totalPages}`;
  prevPage.disabled = page <= 1;
  nextPage.disabled = page >= totalPages;
}

async function changeTicketStatus(ticketId) {
  // Ví dụ toggle trạng thái từ Đang chờ -> Đã xác nhận hoặc Hủy
  // Bạn có thể hiện thực logic khác theo yêu cầu
  const confirmed = confirm('Xác nhận đổi trạng thái vé?');
  if (!confirmed) return;

  try {
    const res = await fetch(`${API_BASE}/tickets/${ticketId}/status`, {
      method: 'PUT',
      credentials: 'include'
    });
    if (res.ok) {
      alert('Đổi trạng thái thành công');
      fetchTickets(currentPage);
    } else {
      const err = await res.json();
      alert('Lỗi đổi trạng thái: ' + (err.error || 'Không xác định'));
    }
  } catch (e) {
    alert('Lỗi mạng khi đổi trạng thái');
  }
}

btnFilter.addEventListener('click', () => fetchTickets(1));
prevPage.addEventListener('click', () => fetchTickets(currentPage - 1));
nextPage.addEventListener('click', () => fetchTickets(currentPage + 1));

btnCreateTicket.addEventListener('click', () => {
  createTicketModal.style.display = 'block';
});

// Hủy tạo vé
btnCancelCreate.addEventListener('click', () => {
  createTicketModal.style.display = 'none';
});

// Xử lý tạo vé
formCreateTicket.addEventListener('submit', async e => {
  e.preventDefault();
  
  // 0. Hiển thị trạng thái loading
  const submitBtn = formCreateTicket.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Đang xử lý...';

  try {
    const formData = new FormData(formCreateTicket);
    const event_id = formData.get('event_id');
    const ticket_type = formData.get('ticket_type');
    const price = formData.get('price');
    const quantity = formData.get('quantity');

    // 1. Gọi backend tạo vé trong DB
    const res = await fetch(`${API_BASE}/tickets/createBulk`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id, ticket_type, price, quantity })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error('Lỗi tạo vé: ' + (err.error || 'Không xác định'));
    }

    const { ticketIds, price: priceStr } = await res.json();
    const tokenIds = ticketIds.map(Number);
    const priceWei = ethers.utils.parseEther(priceStr);

    // 2. Kiểm tra kết nối blockchain
    if (!window.ethereum) {
      throw new Error('Vui lòng cài MetaMask để tiếp tục');
    }

    // 3. Kết nối hợp đồng
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

    // 4. KIỂM TRA QUAN TRỌNG: Xác minh token chưa tồn tại
    const existenceChecks = await Promise.all(
      tokenIds.map(async id => {
        try {
          await contract.ownerOf(id);
          return true;
        } catch {
          return false;
        }
      })
    );

    if (existenceChecks.some(exists => exists)) {
      const existingIds = tokenIds.filter((_, i) => existenceChecks[i]);
      throw new Error(`Token đã tồn tại: ${existingIds.join(', ')}`);
    }

    // 5. Thực hiện mint với gas limit thủ công
    const tx = await contract.batchMint(tokenIds, priceWei, {
      gasLimit: 300000 + (tokenIds.length * 50000) // Ước lượng gas
    });

    // 6. Theo dõi trạng thái giao dịch
    alert('Đang chờ xác nhận giao dịch...');
    const receipt = await tx.wait();
    
    if (receipt.status === 1) {
      alert(`Mint thành công! Giao dịch: ${receipt.transactionHash}`);
      createTicketModal.style.display = 'none';
      fetchTickets(currentPage);
    } else {
      throw new Error('Giao dịch thất bại');
    }
    
  } catch (error) {
    console.error('Lỗi đầy đủ:', error);
    
    // 7. Xử lý lỗi chi tiết
    let errorMessage = error.message;
    
    // Phân tích lỗi revert
    if (error.data?.message?.includes('ERC721: token already minted')) {
      errorMessage = 'Vé đã tồn tại trên blockchain';
    } else if (error.code === 4001) {
      errorMessage = 'Người dùng từ chối giao dịch';
    }
    
    alert(`Lỗi: ${errorMessage}`);
    
    // 8. Rollback an toàn - Chỉ xóa khi đã tạo trong DB
    if (ticketIds && ticketIds.length > 0) {
      try {
        const rollbackRes = await fetch(`${API_BASE}/tickets/deleteBulk`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticketIds })
        });
        
        if (!rollbackRes.ok) {
          console.error('Rollback DB thất bại');
        }
      } catch (rollbackError) {
        console.error('Lỗi rollback:', rollbackError);
      }
    }
  } finally {
    // 9. Luôn khôi phục trạng thái nút
    submitBtn.disabled = false;
    submitBtn.textContent = 'Tạo Vé';
  }
});
// Load ban đầu
(async () => {
  try {
    await fetchEvents();
    await fetchTickets(1);
  } catch (e) {
    alert('Lỗi tải dữ liệu: ' + e.message);
  }
})();
