// Biểu tượng vật phẩm (SVG, hình tạm cùng phong cách nét nâu mềm của game).

import { ITEMS } from './config.js';

const INK = '#3b2f2a';
const SW = 'stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"';

// Màu chính của từng cây, dùng chung cho biểu tượng và bao hạt
export const CROP_COLOR = {
  rau_muong: '#5fa548',
  cai: '#8cc46a',
  hung_que: '#3f8a4a',
  dua_leo: '#4f9a3a',
  ot: '#d8302a',
  ca_chua: '#d8302a'
};

const leafBunch = (col, tie) =>
  `<path d="M20 34 C10 24 8 12 13 6 C17 14 19 22 20 34z" fill="${col}" ${SW}/>` +
  `<path d="M20 34 C30 24 32 12 27 6 C23 14 21 22 20 34z" fill="${col}" ${SW}/>` +
  `<path d="M20 34 C17 22 18 10 20 4 C22 10 23 22 20 34z" fill="${col}" ${SW}/>` +
  `<rect x="15" y="27" width="10" height="5" rx="2" fill="${tie}" ${SW}/>`;

const PRODUCE = {
  rau_muong: leafBunch('#5fa548', '#c98a4b'),
  cai: `<path d="M20 35 C8 33 6 20 12 12 C15 18 17 22 20 35z" fill="#8cc46a" ${SW}/><path d="M20 35 C32 33 34 20 28 12 C25 18 23 22 20 35z" fill="#8cc46a" ${SW}/><path d="M20 35 C13 26 14 12 20 6 C26 12 27 26 20 35z" fill="#a9d68a" ${SW}/><path d="M20 35V14" ${SW}/>`,
  hung_que: leafBunch('#3f8a4a', '#8a6cc0') + `<circle cx="20" cy="6" r="2.4" fill="#a98ad8" ${SW}/>`,
  dua_leo: `<path d="M9 30 C6 26 22 8 30 8 C35 9 33 14 30 17 C24 24 14 33 9 30z" fill="#4f9a3a" ${SW}/><path d="M14 26 l1 1 M19 21 l1 1 M24 16 l1 1" ${SW}/><path d="M30 8 l3 -3" ${SW}/>`,
  ot: `<path d="M24 9 C30 14 26 30 12 34 C20 26 20 16 18 11z" fill="#d8302a" ${SW}/><path d="M18 11 C20 7 24 6 26 7 L24 9z" fill="#4f9a3a" ${SW}/><path d="M25 7 l2 -4" ${SW}/>`,
  ca_chua: `<circle cx="20" cy="22" r="12" fill="#d8302a" ${SW}/><path d="M20 10 l-5 -2 l3 4 l-5 2 l6 0 l1 4 l1 -4 l6 0 l-5 -2 l3 -4z" fill="#4f9a3a" ${SW}/><path d="M14 18 c1 -2 3 -3 4 -3" stroke="#fff" stroke-opacity=".6" stroke-width="2" fill="none" stroke-linecap="round"/>`
};

const seedPacket = crop =>
  `<path d="M8 6 h24 v28 a2 2 0 0 1 -2 2 h-20 a2 2 0 0 1 -2 -2z" fill="#f3e2c3" ${SW}/>` +
  `<path d="M8 6 l3 3 l3 -3 l3 3 l3 -3 l3 3 l3 -3 l3 3 l3 -3" fill="none" ${SW}/>` +
  `<g transform="translate(9 9) scale(.55)">${PRODUCE[crop]}</g>` +
  `<rect x="11" y="29" width="18" height="3" rx="1.5" fill="${CROP_COLOR[crop]}"/>`;

const OTHER = {
  trung_ga: `<ellipse cx="20" cy="22" rx="10" ry="13" fill="#fbf3e4" ${SW}/><path d="M15 16 c1 -2 2 -3 4 -4" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/>`,
  // F06 Vật nuôi khác: thức ăn và sản phẩm
  co_kho: `<path d="M8 30 c4 -10 2 -18 -2 -24 M14 32 c2 -12 4 -18 2 -26 M20 32 c0 -12 2 -20 6 -26 M26 32 c-1 -10 3 -16 8 -20 M32 31 c-2 -8 0 -12 4 -16" fill="none" stroke="#c9a54a" stroke-width="3" stroke-linecap="round"/><path d="M8 30 c4 -10 2 -18 -2 -24 M20 32 c0 -12 2 -20 6 -26 M32 31 c-2 -8 0 -12 4 -16" fill="none" stroke="${INK}" stroke-width="1.2" stroke-linecap="round"/><rect x="9" y="22" width="22" height="5" rx="2" fill="#c98a4b" ${SW}/>`,
  hat_ke: `<path d="M10 12 h20 l-2 22 h-16z" fill="#f3e2c3" ${SW}/><path d="M10 12 l4 -5 h12 l4 5" fill="#e0b85a" ${SW}/>${[[16, 21], [21, 24], [24, 19], [18, 27], [23, 29], [15, 25]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2" fill="#e8b84a" stroke="${INK}" stroke-width="1"/>`).join('')}`,
  cam_ca: `<path d="M10 12 h20 l-2 22 h-16z" fill="#cfe6ef" ${SW}/><path d="M10 12 l4 -5 h12 l4 5" fill="#4f97b8" ${SW}/><path d="M14 23 c3 -4 9 -4 12 0 c-3 4 -9 4 -12 0z" fill="#f28a3a" ${SW}/><path d="M26 23 l3 -3 v6z" fill="#f28a3a" ${SW}/>`,
  long_tho: `<circle cx="15" cy="23" r="7" fill="#fff" ${SW}/><circle cx="25" cy="22" r="7" fill="#fff" ${SW}/><circle cx="20" cy="15" r="7" fill="#fff" ${SW}/><circle cx="20" cy="22" r="6" fill="#fff"/><path d="M14 29 c4 3 9 3 12 0" fill="none" stroke="#e9dccb" stroke-width="2" stroke-linecap="round"/>`,
  trung_bo_cau: `<ellipse cx="15" cy="23" rx="7" ry="9" fill="#fbf6ee" ${SW}/><ellipse cx="26" cy="25" rx="6" ry="8" fill="#fbf6ee" ${SW}/><path d="M12 19 c1 -2 2 -3 3 -3" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/>`,
  ca_con: `<path d="M8 21 c5 -8 17 -8 22 0 c-5 8 -17 8 -22 0z" fill="#f28a3a" ${SW}/><path d="M29 21 l6 -6 v12z" fill="#f28a3a" ${SW}/><circle cx="13" cy="19.5" r="1.6" fill="${INK}"/><path d="M18 15 c2 2 2 10 0 12" fill="none" stroke="#c9602a" stroke-width="1.6"/>`,
  // F07 Trứng ngon: vỏ hồng nâu, có tim nhỏ và ánh lấp lánh
  trung_ga_ngon: `<ellipse cx="19" cy="22" rx="10" ry="13" fill="#e9b98f" ${SW}/><path d="M14 16 c1 -2 2 -3 4 -4" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M19 29 c-5 -3 -6 -6 -4 -7.5 c1.5 -1 3 0 4 1.5 c1 -1.5 2.5 -2.5 4 -1.5 c2 1.5 1 4.5 -4 7.5z" fill="#e2475a" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/><path d="M32 6 l1.2 3 l3 1.2 l-3 1.2 l-1.2 3 l-1.2 -3 l-3 -1.2 l3 -1.2z" fill="#ffd84a" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>`,
  // F04 Phân bón: bao phân có nhãn; lớn nhanh = mầm và mũi tên lên, sai quả = quả cà chua có dấu cộng
  phan_lon_nhanh: `<path d="M9 13 h22 l-2 22 h-18z" fill="#cfe3a6" ${SW}/><path d="M9 13 l4 -6 h14 l4 6" fill="#9cc65a" ${SW}/><path d="M20 31 v-9" ${SW}/><path d="M20 24 c-5 0 -7 -4 -6 -7 c4 0 6 3 6 7z" fill="#5fa548" ${SW}/><path d="M20 22 c4 0 6 -3 5 -6 c-3 0 -5 3 -5 6z" fill="#5fa548" ${SW}/><path d="M27 26 v-6 m-2.5 2.5 l2.5 -2.5 l2.5 2.5" fill="none" ${SW}/>`,
  phan_sai_qua: `<path d="M9 13 h22 l-2 22 h-18z" fill="#f6d2a8" ${SW}/><path d="M9 13 l4 -6 h14 l4 6" fill="#f08a3c" ${SW}/><circle cx="18" cy="25" r="6" fill="#e5533c" ${SW}/><path d="M18 19 l-2 -2 m2 2 l2 -2" ${SW}/><path d="M27 21 v7 M23.5 24.5 h7" ${SW}/>`,
  thuc_an_ga: `<path d="M10 14 h20 l-2 20 h-16z" fill="#d9b77a" ${SW}/><path d="M10 14 l3 -6 h14 l3 6" fill="#c89a5a" ${SW}/><circle cx="17" cy="24" r="1.6" fill="${INK}"/><circle cx="23" cy="27" r="1.6" fill="${INK}"/><circle cx="21" cy="21" r="1.6" fill="${INK}"/>`
};

export function itemIcon(id) {
  const it = ITEMS[id];
  let body = '';
  if (!it) body = '';
  else if (it.kind === 'seed') body = seedPacket(it.crop);
  else if (PRODUCE[id]) body = PRODUCE[id];
  else body = OTHER[id] || '';
  return `<svg viewBox="0 0 40 40" aria-hidden="true">${body}</svg>`;
}
