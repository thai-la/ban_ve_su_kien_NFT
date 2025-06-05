// File: public/event-nft-frontend/js/admin.js
import { API_BASE } from './config.js';

window.addEventListener('DOMContentLoaded', async () => {
  await loadLayout();
  await loadSidebar();
  await loadEventsList();    // gọi CRUD từ đây
});

// Tính status on-the-fly
function computeStatus(now, saleStart, start, end) {
  if (now < saleStart)           return 'Mới tạo';
  if (now >= saleStart && now < start) return 'Đang mở bán';
  if (now >= start && now <= end)      return 'Đang diễn ra';
  return 'Đã kết thúc';
}

// ======== READ & CONDITIONAL BUTTONS ========
// export async function loadEventsList() {
//   const res = await fetch(`${API_BASE}/events`);
//   const events = await res.json();
//   const now = new Date();
//   const container = document.getElementById('eventsContainer');
//   container.innerHTML = '';

//   events.forEach(evt => {
//     // compute status
//     const saleStart = new Date(evt.ticket_sale_start);
//     const start     = new Date(evt.start_date);
//     const end       = new Date(evt.end_date);
//     const status    = computeStatus(now, saleStart, start, end);
//     const cls       = status
//       .toLowerCase().replace(/ /g,'-'); // "đang mở bán" → "đang-mở-bán"

//     // chỉ show nút khi Là Mới tạo
//     const actions = status === 'Mới tạo'
//       ? `<button onclick="editEvent(${evt.event_id})">Sửa</button>
//          <button onclick="deleteEvent(${evt.event_id})">Xóa</button>`
//       : '';

//     const card = document.createElement('div');
//     card.className = 'event-card';
//     card.innerHTML = `
//       <span class="status ${cls}">${status}</span>
//       <h4>${evt.event_name}</h4>
//       <p>${new Date(evt.start_date).toLocaleString()} – ${evt.location}</p>
//       <div class="actions">${actions}</div>
//     `;
//     container.appendChild(card);
//   });
// }

// ======== CREATE ========
export async function createEvent(form) {
  // 1. Lấy dữ liệu từ form
  const data = Object.fromEntries(new FormData(form));

  // 2. Validation cơ bản
  const errors = [];

  // Trường bắt buộc
  if (!data.event_name?.trim()) {
    errors.push('Tên sự kiện không được để trống.');
  }
  if (!data.start_date) {
    errors.push('Phải chọn thời gian bắt đầu.');
  }
  if (!data.end_date) {
    errors.push('Phải chọn thời gian kết thúc.');
  }
  if (!data.ticket_sale_start) {
    errors.push('Phải chọn thời gian bắt đầu mở bán vé.');
  }

  // Chuyển về Date để so sánh
  const startDate = new Date(data.start_date);
  const endDate   = new Date(data.end_date);
  const saleStart = new Date(data.ticket_sale_start);
  const saleEnd   = data.ticket_sale_end ? new Date(data.ticket_sale_end) : null;

  // Ngày kết thúc phải sau ngày bắt đầu
  if (startDate >= endDate) {
    errors.push('Thời gian kết thúc phải sau thời gian bắt đầu.');
  }
  // Nếu có saleEnd, phải sau saleStart
  if (saleEnd && saleStart >= saleEnd) {
    errors.push('Thời gian kết thúc mở bán vé phải sau thời gian bắt đầu.');
  }

  // Nếu có lỗi, hiển thị và dừng
  if (errors.length) {
    alert(errors.join('\n'));
    return;
  }

  // 3. Gửi request tạo sự kiện có credentials
  try {
    const res = await fetch(`${API_BASE}/events`, {
      method: 'POST',
      credentials: 'include',               // ← thêm dòng này để gửi cookie
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const payload = await res.json();      // parse JSON để xem lỗi chi tiết
    if (res.ok) {
      alert('Tạo sự kiện thành công');
      // window.location.href = '/events.html';
    } else {
      // hiển thị message lỗi từ server (ví dụ 401/403 hay validation)
      alert('Lỗi khi tạo sự kiện:\n' + (payload.error || res.statusText));
      console.error('CREATE EVENT ERROR:', payload);
    }
  } catch (e) {
    alert('Không gửi được yêu cầu. Vui lòng thử lại.');
    console.error(e);
  }
}

// ======== LOAD FOR EDIT ========
export async function loadEventsList() {
  const container = document.getElementById('eventsContainer');
  container.innerHTML = '';

  try {
    const res = await fetch(`${API_BASE}/events`, { credentials: 'include' });
    if (!res.ok) throw new Error('Không lấy dữ liệu sự kiện');
    const events = await res.json();
    const now = new Date();

    events.forEach(evt => {
      // tính status...
      const saleStart = new Date(evt.ticket_sale_start);
      const start     = new Date(evt.start_date);
      const end       = new Date(evt.end_date);
      let status, cls;
      if (now < saleStart)           { status = 'Mới tạo';     cls = 'status-new'; }
      else if (now < start)          { status = 'Đang mở bán'; cls = 'status-selling'; }
      else if (now <= end)           { status = 'Đang diễn ra'; cls = 'status-live'; }
      else                           { status = 'Đã kết thúc';  cls = 'status-ended'; }

      container.innerHTML += `
        <div class="event-card">
          <span class="status ${cls}">${status}</span>
          <h4>${evt.event_name}</h4>
          <p>${new Date(evt.start_date).toLocaleDateString('vi-VN')} – ${evt.location}</p>
          <button onclick="editEvent(${evt.event_id})">Sửa</button>
          <button onclick="deleteEvent(${evt.event_id})">Xóa</button>
        </div>
      `;
    });
  } catch (e) {
    container.innerHTML = `<p>Không tải được sự kiện.</p>`;
    console.error(e);
  }
}

// ======== UPDATE ========
export async function updateEvent(id, form) {
  // 1. Lấy dữ liệu từ form
  const data = Object.fromEntries(new FormData(form));

  // 2. Validation cơ bản
  const errors = [];
  if (!data.event_name?.trim()) {
    errors.push('Tên sự kiện không được để trống.');
  }
  if (!data.start_date) {
    errors.push('Phải chọn thời gian bắt đầu.');
  }
  if (!data.end_date) {
    errors.push('Phải chọn thời gian kết thúc.');
  }
  if (!data.ticket_sale_start) {
    errors.push('Phải chọn thời gian bắt đầu mở bán vé.');
  }

  const startDate = new Date(data.start_date);
  const endDate   = new Date(data.end_date);
  const saleStart = new Date(data.ticket_sale_start);
  const saleEnd   = data.ticket_sale_end ? new Date(data.ticket_sale_end) : null;

  if (startDate >= endDate) {
    errors.push('Thời gian kết thúc phải sau thời gian bắt đầu.');
  }
  if (saleEnd && saleStart >= saleEnd) {
    errors.push('Thời gian kết thúc mở bán vé phải sau thời gian bắt đầu.');
  }

  if (errors.length) {
    alert(errors.join('\n'));
    return;
  }

  // 3. Gửi request cập nhật
  try {
    const res = await fetch(`${API_BASE}/events/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (res.ok) {
      alert('Cập nhật thành công');
      // Ví dụ redirect về danh sách
      // window.location.href = '/events.html';
    } else {
      const err = await res.json();
      alert('Lỗi khi cập nhật:\n' + (err.error || res.statusText));
    }
  } catch (e) {
    alert('Không gửi được yêu cầu. Vui lòng thử lại.');
    console.error(e);
  }
} 

// ======== DELETE ========
export async function deleteEvent(id) {
  if (!confirm('Xác nhận xóa sự kiện?')) return;
  const res = await fetch(`${API_BASE}/events/${id}`, { method: 'DELETE' });
  if (res.ok) {
    alert('Xóa thành công');
    loadEventsList();
  } else {
    const err = await res.json();
    alert('Lỗi: ' + err.error);
  }
}

// Bạn có thể thêm phần quản lý tickets tương tự ở cuối file
