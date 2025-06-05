// / js/events.js
import { API_BASE } from './config.js';

export async function loadEvents() {
  const res = await fetch(API_BASE + '/events');
  const events = await res.json();
  const container = document.getElementById('eventsList');
  container.innerHTML = '';
  const now = new Date();

  events.forEach(evt => {
    if (evt.status === 'on_sale' && new Date(evt.sale_start) <= now) {
      const div = document.createElement('div');
      div.className = 'event-card';
      div.innerHTML = `
        <h3>${evt.title}</h3>
        <p>${evt.location}</p>
        <p>Giá vé: ${evt.ticket_price} ETH</p>
        <button onclick="window.location='event.html?event_id=${evt.event_id}'">Xem chi tiết</button>
      `;
      container.append(div);
    }
  });
}
export async function deleteEvent(id) {
  const ok = confirm('Xác nhận xóa sự kiện?');
  if (!ok) return;
  const res = await fetch(`${API_BASE}/events/${id}`, { method:'DELETE' });
  if (res.ok) {
    alert('Xóa thành công');
    window.location.reload();  // hoặc load lại list
  } else {
    const err = await res.json();
    alert('Lỗi: ' + err.error);
  }
}
// Khi load index.html
if (document.getElementById('eventsList')) {
  loadEvents();
}