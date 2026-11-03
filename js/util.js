// Hàm dùng chung, không phụ thuộc phần nào khác của game.

// Số ngẫu nhiên cố định theo hạt giống: cảnh vẽ ra giống nhau mỗi lần mở.
export function rng(seed) {
  let s = seed >>> 0;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}

export const reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

export const pad2 = n => String(n).padStart(2, '0');

export const hhmm = d => pad2(d.getHours()) + ':' + pad2(d.getMinutes());
export const hhmmss = d => hhmm(d) + ':' + pad2(d.getSeconds());

// Đổi số mili giây thành chữ ngắn gọn: "3 giờ 12 phút", "45 giây".
export function duration(ms) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  if (d) return d + ' ngày ' + h + ' giờ';
  if (h) return h + ' giờ ' + m + ' phút';
  if (m) return m + ' phút';
  return s + ' giây';
}

// Gắn chữ từ bảng chữ vào mọi phần tử có data-t="khóa" (và data-t-label cho nhãn đọc màn hình).
export function applyText(root, T) {
  root.querySelectorAll('[data-t]').forEach(el => {
    const v = T[el.dataset.t];
    if (v != null) el.textContent = v;
  });
  root.querySelectorAll('[data-t-label]').forEach(el => {
    const v = T[el.dataset.tLabel];
    if (v != null) el.setAttribute('aria-label', v);
  });
}
