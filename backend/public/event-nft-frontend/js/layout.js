import { API_BASE } from './config.js';

window.addEventListener('DOMContentLoaded', async () => {
  await loadLayout();
  await initHeader();
});

export async function loadLayout() {
  try {
    const [headerRes, footerRes] = await Promise.all([
      fetch('layout/header.html'),
      fetch('layout/footer.html')
    ]);

    const header = headerRes.ok ? await headerRes.text() : '';
    const footer = footerRes.ok ? await footerRes.text() : '';

    const headerEl = document.getElementById('header');
    if (headerEl) headerEl.innerHTML = header;

    const footerEl = document.getElementById('footer');
    if (footerEl) footerEl.innerHTML = footer;
  } catch (error) {
    console.error("Error loading layout:", error);
  }
}

export async function initHeader() {
  const adminBtn = document.getElementById('adminBtn');
  const userMenu = document.getElementById('userMenu');
  const adminMenu = document.getElementById('adminMenu');
  const avatarBtn = document.getElementById('avatarBtn');
  const usernameEl = document.querySelector('.user-info .username');
  const avatarImg = avatarBtn;

  try {
    const res = await fetch(`${API_BASE}/users/profile`, {
      credentials: 'include'
    });
    if (!res.ok) throw new Error('Không lấy được thông tin người dùng');

    const user = await res.json();

    usernameEl.textContent = user.username || 'Người dùng';
    avatarImg.src = user.avatar_url || '/images/avatar-placeholder.png';

    if (user.isAdmin) {
      adminBtn.classList.remove('hidden');
    } else {
      adminBtn.classList.add('hidden');
    }
  } catch (error) {
    console.error('Lỗi khi tải thông tin user:', error);
    usernameEl.textContent = 'Khách';
    avatarImg.src = '/images/avatar-placeholder.jpg';
    if (adminBtn) adminBtn.classList.add('hidden');
  }

  avatarBtn?.addEventListener('click', () => {
    userMenu?.classList.toggle('hidden');
    adminMenu?.classList.add('hidden');
  });

  adminBtn?.addEventListener('click', () => {
    adminMenu?.classList.toggle('hidden');
    userMenu?.classList.add('hidden');
  });

  document.addEventListener('click', (e) => {
    if (!avatarBtn?.contains(e.target) && !userMenu?.contains(e.target)) {
      userMenu?.classList.add('hidden');
    }
    if (!adminBtn?.contains(e.target) && !adminMenu?.contains(e.target)) {
      adminMenu?.classList.add('hidden');
    }
  });

  const logoutBtn = document.getElementById('logoutBtn');
  logoutBtn?.addEventListener('click', async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        localStorage.clear();
        window.location.href = '/login.html';
      } else {
        alert('Đăng xuất thất bại!');
      }
    } catch {
      alert('Lỗi mạng khi đăng xuất');
    }
  });
}
