/* Allergen + UI icon set for Sultan Sofrası (hand drawn SVG, 24x24, white on a coloured tile). */
(function () {
  const A = {
    peanut: { name: 'Газрын самар', color: '#E9A93A',
      svg: '<path d="M12 2.6c-2.6 0-4.4 2-4.4 4.4 0 1.5.7 2.4.7 3.3 0 .9-1.5 1.8-1.5 4.6A5.2 5.2 0 0 0 12 20.4a5.2 5.2 0 0 0 5.2-5.5c0-2.8-1.5-3.7-1.5-4.6 0-.9.7-1.8.7-3.3 0-2.4-1.8-4.4-4.4-4.4Z" fill="#fff"/><circle cx="10.6" cy="6.4" r=".9" fill="currentColor"/><circle cx="13.2" cy="8.6" r=".9" fill="currentColor"/><circle cx="10.8" cy="14.6" r=".9" fill="currentColor"/><circle cx="13.4" cy="16.8" r=".9" fill="currentColor"/>' },
    treenut: { name: 'Модны самар', color: '#E07F2E',
      svg: '<path d="M12 2.5v2.2" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/><path d="M4.5 9.2c0-2.6 3.4-4.4 7.5-4.4s7.5 1.8 7.5 4.4v.9h-15Z" fill="#fff"/><path d="M6 11.4h12c0 5.2-2.8 9.4-6 10.1-3.2-.7-6-4.9-6-10.1Z" fill="#fff"/>' },
    crustacean: { name: 'Хавч', color: '#2F78D0',
      svg: '<ellipse cx="12" cy="14" rx="5.2" ry="3.8" fill="#fff"/><path d="M6.6 9.4 4 6.2m0 0L2.6 8.4M4 6.2l2.6-.8M17.4 9.4 20 6.2m0 0 1.4 2.2M20 6.2l-2.6-.8M7 16l-3.4 2.2M7.4 13.2 3.4 12.6M17 16l3.4 2.2M16.6 13.2l4-.6M10 18l-1.4 3M14 18l1.4 3" stroke="#fff" stroke-width="1.6" stroke-linecap="round" fill="none"/><circle cx="10.2" cy="12.6" r=".8" fill="currentColor"/><circle cx="13.8" cy="12.6" r=".8" fill="currentColor"/>' },
    mollusc: { name: 'Нялцгай биет', color: '#22A596',
      svg: '<path d="M12 20.6 3.2 9.6C4.6 5.6 8 3.4 12 3.4s7.4 2.2 8.8 6.2Z" fill="#fff"/><path d="M12 20.4 7.2 5m4.8 15.4V3.6m0 16.8L16.8 5M12 20.4 4.4 8.2m7.6 12.2 7.6-12.2" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/><path d="M9.6 20.6h4.8" stroke="#fff" stroke-width="2" stroke-linecap="round"/>' },
    fish: { name: 'Загас', color: '#1E98D4',
      svg: '<path d="M2.6 12c2.6-4 6-5.8 9.4-5.8 3.6 0 6.4 2.4 7.6 4L22 7.4v9.2l-2.4-2.8c-1.2 1.6-4 4-7.6 4-3.4 0-6.8-1.8-9.4-5.8Z" fill="#fff"/><circle cx="7.6" cy="11" r="1.2" fill="currentColor"/><path d="M11.6 8.8c1 1.8 1 4.6 0 6.4" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linecap="round"/>' },
    egg: { name: 'Өндөг', color: '#D9B300',
      svg: '<path d="M12 3c3.2 0 4.2 2.6 6.4 3.6 2.6 1.2 3.4 4 2.2 6.6-1 2.2-.4 4.6-3.2 6.2-2.6 1.4-4.6.2-6.8.8-2.6.6-5.4-.4-6.4-3.2-.8-2.2-2.4-3.4-1.4-6.4C3.8 7.2 6.4 7 8 5c1-1.2 2-2 4-2Z" fill="#fff"/><circle cx="12" cy="12" r="3.6" fill="currentColor" opacity=".9"/>' },
    milk: { name: 'Сүү', color: '#C98BC2',
      svg: '<path d="M6 2.8h4v2l1.4 2.4v13.6H4.6V7.2L6 4.8Z" fill="#fff"/><path d="M13.4 10.4h6.4l-.8 10.4h-4.8Z" fill="#fff"/><path d="M4.6 11.4h6.8" stroke="currentColor" stroke-width="1.2"/><path d="M13.8 14h5.6" stroke="currentColor" stroke-width="1.2"/>' },
    gluten: { name: 'Цавуулаг', color: '#9A4E2A',
      svg: '<path d="M6 21 17.6 6.4" stroke="#fff" stroke-width="1.7" stroke-linecap="round"/><g fill="#fff"><ellipse cx="17.6" cy="4.6" rx="1.3" ry="2.4" transform="rotate(38 17.6 4.6)"/><ellipse cx="13.4" cy="7.6" rx="1.2" ry="2.4" transform="rotate(-10 13.4 7.6)"/><ellipse cx="17" cy="10" rx="1.2" ry="2.4" transform="rotate(86 17 10)"/><ellipse cx="10.8" cy="11" rx="1.2" ry="2.4" transform="rotate(-10 10.8 11)"/><ellipse cx="14.4" cy="13.4" rx="1.2" ry="2.4" transform="rotate(86 14.4 13.4)"/><ellipse cx="8.2" cy="14.4" rx="1.2" ry="2.4" transform="rotate(-10 8.2 14.4)"/><ellipse cx="11.8" cy="16.8" rx="1.2" ry="2.4" transform="rotate(86 11.8 16.8)"/></g>' },
    soy: { name: 'Шар буурцаг', color: '#2B9446',
      svg: '<path d="M4 18.6C3 15.4 5 12.8 8 11.6c2.6-1 3.2-3.4 5-5.6 2.2-2.6 5.6-3 7-1.6 1.4 1.4 1 4.8-1.6 7-2.2 1.8-4.6 2.4-5.6 5-1.2 3-3.8 5-7 4Z" fill="#fff"/><circle cx="8" cy="16" r="1.6" fill="currentColor"/><circle cx="12.4" cy="11.8" r="1.6" fill="currentColor"/><circle cx="16.6" cy="7.6" r="1.6" fill="currentColor"/>' },
    sesame: { name: 'Кунжут', color: '#EA7F1E',
      svg: '<g fill="#fff"><ellipse cx="12" cy="5.6" rx="1.8" ry="2.8"/><ellipse cx="12" cy="18.4" rx="1.8" ry="2.8"/><ellipse cx="5.6" cy="12" rx="2.8" ry="1.8"/><ellipse cx="18.4" cy="12" rx="2.8" ry="1.8"/><ellipse cx="7.4" cy="7.4" rx="1.6" ry="2.6" transform="rotate(-45 7.4 7.4)"/><ellipse cx="16.6" cy="16.6" rx="1.6" ry="2.6" transform="rotate(-45 16.6 16.6)"/><ellipse cx="16.6" cy="7.4" rx="1.6" ry="2.6" transform="rotate(45 16.6 7.4)"/><ellipse cx="7.4" cy="16.6" rx="1.6" ry="2.6" transform="rotate(45 7.4 16.6)"/></g>' },
    celery: { name: 'Селдерей', color: '#7DBA5A',
      svg: '<path d="M4.4 20.4 15.6 4.4M8 20.6 18.4 6M11.6 20.6l8.6-12" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/><path d="M15.6 4.4c.6-1.4 2.4-2 3.6-1.2.4 1.6-.6 3-2.2 3.4" fill="#fff"/>' },
    mustard: { name: 'Гич', color: '#CF9A35',
      svg: '<path d="M10.2 2.6h3.6l.4 3h-4.4Z" fill="#fff"/><path d="M8.6 7h6.8l1.4 3.4v10.2H7.2V10.4Z" fill="#fff"/><path d="M9.6 13.4h4.8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="19" cy="18.6" r="1.6" fill="#fff"/>' },
    lupin: { name: 'Люпин', color: '#8E74C2',
      svg: '<path d="M12 22V9" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/><g fill="#fff"><ellipse cx="12" cy="3.6" rx="1.6" ry="1.6"/><ellipse cx="9.4" cy="6.4" rx="2" ry="1.3"/><ellipse cx="14.6" cy="6.4" rx="2" ry="1.3"/><ellipse cx="8.8" cy="9.6" rx="2.4" ry="1.4"/><ellipse cx="15.2" cy="9.6" rx="2.4" ry="1.4"/><ellipse cx="8.4" cy="13" rx="2.8" ry="1.5"/><ellipse cx="15.6" cy="13" rx="2.8" ry="1.5"/></g><path d="M12 17.6c-2 0-3.4 1-4 2.4M12 17.6c2 0 3.4 1 4 2.4" stroke="#fff" stroke-width="1.4" fill="none" stroke-linecap="round"/>' },
    sulphite: { name: 'Сульфит', color: '#8A1C26',
      svg: '<path d="M7 2.8h10c.4 4.4-.6 8.6-5 9.4-4.4-.8-5.4-5-5-9.4Z" fill="#fff"/><path d="M12 12.2v6.6M8 20.8h8" stroke="#fff" stroke-width="2" stroke-linecap="round"/><path d="M7.4 6.4h9.2" stroke="currentColor" stroke-width="1.2"/>' }
  };

  const UI = {
    search: '<circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="m16 16 4.5 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    filter: '<path d="M4 5h16l-6.2 7.4V19l-3.6 1.6v-8.2Z" fill="currentColor"/>',
    close: '<path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    pin: '<path d="M12 21.4s-6.6-6.2-6.6-11.4a6.6 6.6 0 0 1 13.2 0c0 5.2-6.6 11.4-6.6 11.4Z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="10" r="2.4" fill="currentColor"/>',
    phone: '<path d="M6.6 3.4h3l1.6 4.2-2 1.4a11 11 0 0 0 5.8 5.8l1.4-2 4.2 1.6v3a2 2 0 0 1-2.2 2C10.4 18.8 5.2 13.6 4.6 5.6a2 2 0 0 1 2-2.2Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
    instagram: '<rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.2" cy="6.8" r="1.2" fill="currentColor"/>',
    clock: '<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 7.2V12l3.2 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/>',
    whatsapp: '<path d="M4 20l1.2-4A8.4 8.4 0 1 1 8.4 19Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 8.6c0 3.4 2.6 6.2 6 6.4l1.2-1.4-2-1-1 .8a4.6 4.6 0 0 1-2.4 0 4.6 4.6 0 0 1-1.2-2.4l.8-1-1-2Z" fill="currentColor"/>',
    wifi: '<path d="M2.8 9.2a13.4 13.4 0 0 1 18.4 0M5.8 12.4a9 9 0 0 1 12.4 0M8.8 15.6a4.6 4.6 0 0 1 6.4 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="19" r="1.4" fill="currentColor"/>',
    flame: '<path d="M12 21.4c-3.8 0-6.4-2.6-6.4-6.2 0-3.6 2.8-5.4 3.4-9.6 2.4 1.4 3.4 3.6 3.4 5.4 1-.6 1.6-1.8 1.6-3 2.6 2 4.4 4.6 4.4 7.2 0 3.6-2.6 6.2-6.4 6.2Z" fill="currentColor"/>',
    leaf: '<path d="M5 19c0-8.4 5.4-13.8 15-14-.2 9.6-5.6 15-14 15" fill="currentColor"/><path d="M4.4 20.4 13 11.6" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/>',
    crown: '<path d="M3.4 8.2 7.8 12 12 5l4.2 7 4.4-3.8-1.8 10.2H5.2Z" fill="currentColor"/><path d="M5.4 20.6h13.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    tea: '<path d="M8 6.6h8l-.6 3.2c1.6.8 1.6 2.2.6 3.2L16.6 20H7.4L8 13c-1-1-1-2.4.6-3.2Z" fill="currentColor"/><path d="M5.2 21h13.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M10.4 2.6c-.8 1 .8 1.6 0 2.8M13.6 2.6c-.8 1 .8 1.6 0 2.8" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linecap="round"/>',
    card: '<rect x="3" y="5.5" width="18" height="13" rx="2.4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3 9.6h18" stroke="currentColor" stroke-width="2.2"/>',
    star: '<path d="m12 2.8 2.2 6.6h7l-5.6 4.2 2.1 6.7L12 16.2l-5.7 4.1 2.1-6.7-5.6-4.2h7Z" fill="currentColor"/>',
    up: '<path d="M6 14.5 12 8.5l6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'
  };

  const svg = (inner, cls = '', label = '') =>
    `<svg class="${cls}" viewBox="0 0 24 24" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true" focusable="false"'}>${inner}</svg>`;

  window.SS_ICONS = {
    allergens: A,
    order: ['peanut', 'treenut', 'crustacean', 'mollusc', 'fish', 'egg', 'milk', 'gluten', 'soy', 'sesame', 'celery', 'mustard', 'lupin', 'sulphite'],
    ui: (name, cls = 'ico') => svg(UI[name] || '', cls),
    allergen: (key, cls = 'alg') => {
      const a = A[key];
      if (!a) return '';
      return `<span class="${cls}" style="--c:${a.color};color:${a.color}" title="${a.name}">${svg(a.svg, '', a.name)}</span>`;
    }
  };
})();
