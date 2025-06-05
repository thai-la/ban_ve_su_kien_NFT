// js/auth.js
import { API_BASE } from './config.js';
const provider = new ethers.BrowserProvider(window.ethereum);

// Hàm chính để thực hiện toàn bộ flow đăng nhập
export async function login() {
  const noticeEl = document.getElementById('loginNotice');

  if (!window.ethereum) {
    noticeEl.textContent = 'Vui lòng cài đặt MetaMask!';
    return;
  }
  noticeEl.textContent = '';

  try {
    // 1. Kết nối MetaMask và tạo provider + signer
    const provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send('eth_requestAccounts', []);
    const signer = await provider.getSigner();
    const walletAddress = await signer.getAddress();

    // 2. Lấy nonce từ backend
    const nonceRes = await fetch(
      `${API_BASE}/users?walletAddress=${walletAddress}`,
      {
        credentials: 'include'
      }
    );
    if (!nonceRes.ok) {
      throw new Error(`Lỗi lấy nonce: ${nonceRes.status}`);
    }
    const { nonce } = await nonceRes.json();

    // 3. Ký message (nonce)
    const signature = await signer.signMessage(nonce);

    // 4. Gửi chữ ký lên backend để xác thực
    const authRes = await fetch(`${API_BASE}/authenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress, signature }),
      credentials: 'include',
    });

    if (authRes.ok) {
      // Đăng nhập thành công
      window.location.href = '/backend/public/event-nft-frontend/dashboard.html';
    } else {
      noticeEl.textContent = 'Xác thực thất bại.';
    }
  } catch (err) {
    console.error('Lỗi trong quá trình đăng nhập:', err);
    noticeEl.textContent = 'Đã có lỗi xảy ra, vui lòng thử lại.';
  }
}

// Gắn sự kiện click lên nút
document
  .getElementById('connectWalletBtn')
  .addEventListener('click', login);
