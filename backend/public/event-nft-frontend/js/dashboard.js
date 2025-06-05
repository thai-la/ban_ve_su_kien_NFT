// File: public/event-nft-frontend/js/dashboard.js
import { API_BASE } from './config.js';
import { loadLayout, initHeader } from './layout.js';

const eventsContainer = document.getElementById('eventsContainer');
const defaultImage = 'https://via.placeholder.com/320x180?text=No+Image';

function formatDateTime(datetimeStr) {
  const options = {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  };
  return new Date(datetimeStr).toLocaleDateString('vi-VN', options);
}

async function loadEvents() {
  try {
    const res = await fetch(`${API_BASE}/events`, { credentials: 'include' });
    if (!res.ok) throw new Error('Không thể lấy dữ liệu sự kiện');
    const events = await res.json();

    eventsContainer.innerHTML = '';

    events.forEach(evt => {
      const imgSrc = evt.image_url || defaultImage;
      const mainContentHtml = evt.main_content
        ? `<div class="event-main-content">${evt.main_content.split('\n').join('<br>')}</div>`
        : '';
      const targetAudienceHtml = evt.target_audience
        ? `<div class="event-extra"><strong>Đối tượng:</strong><br>${evt.target_audience.split('\n').join('<br>')}</div>`
        : '';
      const organizerHtml = evt.organizer
        ? `<div class="event-extra"><strong>Tổ chức:</strong><br>${evt.organizer.split('\n').join('<br>')}</div>`
        : '';

      eventsContainer.innerHTML += `
        <div class="event-card" onclick="window.location.href='event-detail.html?event_id=${evt.event_id}'">
          <img src="${imgSrc}" class="event-image" alt="Ảnh sự kiện" />
          <div class="event-content">
            <div class="event-title">${evt.event_name}</div>
            <div class="event-datetime">
              ${formatDateTime(evt.start_date)} – ${formatDateTime(evt.end_date)}
            </div>
            ${evt.location ? `<div class="event-location"><strong>Địa điểm:</strong> ${evt.location}</div>` : ''}
            ${mainContentHtml}
            ${targetAudienceHtml}
            ${organizerHtml}
          </div>
        </div>
      `;
    });
  } catch (err) {
    eventsContainer.innerHTML = `<p>Không tải được dữ liệu sự kiện.</p>`;
    console.error(err);
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  await loadLayout();
  await initHeader();
  await loadEvents();
});
