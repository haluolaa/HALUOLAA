// ===== IMPORTS =====
import { fetchProducts, uploadImage, addProduct, updateProduct, deleteProductFromDB } from './supabase-client.js';

const SUPABASE_URL = 'https://cxvesachmhwxvubzuejb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_VwbFeaMWiiZnTGzrg7N-Qg_BrAUGbEf';
const STORAGE_BUCKET = 'HALUOLAA';

// ===== STATE =====
let cart = JSON.parse(localStorage.getItem('haloula_cart') || '[]');
let allProducts = [];
let currentPage = 1;
const PAGE_SIZE = 20;
const WHATSAPP_NUMBER = '201021102607';

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
  updateCartBadge();
  initNavbar();
  initMobileMenu();
  showProductsSkeleton();
  allProducts = await fetchProducts();
  if (!allProducts.length) {
    // fallback to local if supabase empty
    allProducts = typeof PRODUCTS !== 'undefined' ? PRODUCTS : [];
  }
  renderProducts(allProducts);
});

// ===== SKELETON LOADER =====
function showProductsSkeleton() {
  const grid = document.getElementById('productsGrid');
  grid.innerHTML = Array(8).fill(`
    <div class="product-card skeleton-card">
      <div class="skeleton-img"></div>
      <div class="product-info">
        <div class="skeleton-line short"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line medium"></div>
      </div>
    </div>
  `).join('');
}

// ===== NAVBAR SCROLL =====
function initNavbar() {
  window.addEventListener('scroll', () => {
    const nav = document.getElementById('navbar');
    nav.style.boxShadow = window.scrollY > 50
      ? '0 4px 30px rgba(233,30,140,.15)'
      : '0 2px 20px rgba(0,0,0,.08)';
  });
}

// ===== MOBILE MENU =====
function initMobileMenu() {
  document.getElementById('menuBtn').addEventListener('click', () => {
    document.getElementById('navLinks').classList.toggle('open');
  });
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.addEventListener('click', () => document.getElementById('navLinks').classList.remove('open'));
  });
}

// ===== RENDER PRODUCTS WITH PAGINATION =====
function renderProducts(list, page = 1) {
  const grid = document.getElementById('productsGrid');
  currentPage = page;

  const start = (page - 1) * PAGE_SIZE;
  const pageItems = list.slice(0, page * PAGE_SIZE);

  if (!list.length) {
    grid.innerHTML = '<p style="text-align:center;color:#999;grid-column:1/-1;padding:40px">لا توجد منتجات في هذا القسم حالياً</p>';
    return;
  }

  grid.innerHTML = pageItems.map(p => {
    const sizes = typeof p.sizes === 'string' ? p.sizes.split(',') : (p.sizes || []);
    const colors = typeof p.colors === 'string' ? p.colors.split(',') : (p.colors || []);
    const imageUrl = p.image_url || p.image || 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&q=80';

    return `
    <div class="product-card" data-id="${p.id}">
      <div class="product-img" onclick="openLightbox('${imageUrl}','${p.name}')">
        <img src="${imageUrl}" alt="${p.name}" loading="lazy"/>
        ${p.badge ? `<span class="product-badge badge-${p.badge}">${p.badge === 'new' ? '🆕 جديد' : '🔥 خصم'}</span>` : ''}
      </div>
      <div class="product-info">
        <div class="product-cat">${p.category || ''}</div>
        <div class="product-name">${p.name}</div>
        <div class="product-colors">
          ${colors.slice(0,5).map(c => `<div class="color-dot" style="background:${c.trim()}"></div>`).join('')}
        </div>
        <div class="size-selector" id="sizes-${p.id}">
          ${sizes.slice(0,6).map((s,i) => `<button class="size-btn${i===0?' selected':''}" onclick="selectSize('${p.id}','${s.trim()}',this)">${s.trim()}</button>`).join('')}
        </div>
        <div class="product-price-row">
          <div>
            <div class="product-price">${p.price} ج.م</div>
            ${p.old_price || p.oldPrice ? `<div class="product-old-price">${p.old_price || p.oldPrice} ج.م</div>` : ''}
          </div>
          <button class="add-to-cart-btn" onclick="addToCart('${p.id}')">🛒 أضيفي</button>
        </div>
      </div>
    </div>
  `}).join('');

  // Load More Button
  const existing = document.getElementById('loadMoreBtn');
  if (existing) existing.remove();

  if (list.length > page * PAGE_SIZE) {
    const btn = document.createElement('div');
    btn.id = 'loadMoreBtn';
    btn.style.cssText = 'grid-column:1/-1;text-align:center;padding:20px 0';
    btn.innerHTML = `<button class="btn btn-outline" onclick="loadMore()">عرض المزيد (${list.length - page * PAGE_SIZE} منتج)</button>`;
    grid.appendChild(btn);
  }
}

// ===== LOAD MORE =====
window.loadMore = function() {
  const filtered = getCurrentFiltered();
  renderProducts(filtered, currentPage + 1);
}

function getCurrentFiltered() {
  const activeBtn = document.querySelector('.filter-btn.active');
  const cat = activeBtn ? activeBtn.textContent : 'الكل';
  return cat === 'الكل' ? allProducts : allProducts.filter(p => p.category === cat);
}

// ===== SELECT SIZE =====
window.selectSize = function(productId, size, btn) {
  const container = document.getElementById(`sizes-${productId}`);
  container.querySelectorAll('.size-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

function getSelectedSize(productId) {
  const container = document.getElementById(`sizes-${productId}`);
  if (!container) return null;
  const selected = container.querySelector('.size-btn.selected');
  return selected ? selected.textContent : null;
}

// ===== LANGUAGE =====
window.toggleLang = function() {
  const newLang = currentLang === 'ar' ? 'en' : 'ar';
  setLang(newLang);
}

// ===== FILTER =====
window.filterProducts = function(cat) {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.getAttribute('data-cat') === 'all' && (cat === 'all' || cat === 'الكل')) btn.classList.add('active');
    if (btn.getAttribute('data-cat') && btn.querySelector('[data-i18n]')) {
      const key = btn.querySelector('[data-i18n]').getAttribute('data-i18n');
      const arVal = TRANSLATIONS.ar[key];
      if (arVal === cat) btn.classList.add('active');
    }
  });
  const filtered = (cat === 'all' || cat === 'الكل' || cat === 'All')
    ? allProducts
    : allProducts.filter(p => p.category === cat);
  renderProducts(filtered, 1);
  document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
}

// ===== CART =====
window.addToCart = function(productId) {
  const product = allProducts.find(p => String(p.id) === String(productId));
  if (!product) return;
  const size = getSelectedSize(productId) || (product.sizes ? product.sizes.split(',')[0] : 'M');
  const existing = cart.find(i => String(i.id) === String(productId) && i.size === size);
  if (existing) { existing.qty++; }
  else { cart.push({ ...product, size, qty: 1 }); }
  saveCart();
  updateCartBadge();
  showToast(`✅ تمت الإضافة: ${product.name} - ${size}`);
}

window.removeFromCart = function(productId, size) {
  cart = cart.filter(i => !(String(i.id) === String(productId) && i.size === size));
  saveCart();
  updateCartBadge();
  renderCart();
}

function saveCart() { localStorage.setItem('haloula_cart', JSON.stringify(cart)); }

function updateCartBadge() {
  const total = cart.reduce((sum, i) => sum + i.qty, 0);
  document.getElementById('cartBadge').textContent = total;
}

window.toggleCart = function() {
  document.getElementById('cartOverlay').classList.toggle('open');
  document.getElementById('cartSidebar').classList.toggle('open');
  renderCart();
}

function renderCart() {
  const container = document.getElementById('cartItems');
  const footer = document.getElementById('cartFooter');
  if (!cart.length) {
    container.innerHTML = '<p class="cart-empty">السلة فارغة 🛍️</p>';
    footer.style.display = 'none';
    return;
  }
  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  container.innerHTML = cart.map(item => {
    const img = item.image_url || item.image || '';
    return `
    <div class="cart-item">
      <img src="${img}" alt="${item.name}"/>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-size">المقاس: ${item.size} × ${item.qty}</div>
        <div class="cart-item-price">${item.price * item.qty} ج.م</div>
      </div>
      <button class="cart-item-remove" onclick="removeFromCart('${item.id}','${item.size}')">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  `}).join('');
  document.getElementById('cartTotal').textContent = total.toLocaleString('ar-EG');
  footer.style.display = 'block';
}

// ===== CHECKOUT =====
window.checkout = function() {
  if (!cart.length) return;
  document.getElementById('modalOverlay').classList.add('open');
  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  document.getElementById('orderSummary').innerHTML = `
    <div class="order-summary">
      ${cart.map(i => `<div class="order-summary-item"><span>${i.name} (${i.size}) ×${i.qty}</span><span>${i.price * i.qty} ج.م</span></div>`).join('')}
      <div class="order-summary-total"><span>الإجمالي</span><span>${total.toLocaleString('ar-EG')} ج.م</span></div>
    </div>
  `;
}

window.closeModal = function() {
  document.getElementById('modalOverlay').classList.remove('open');
}

window.submitOrder = function() {
  const name = document.getElementById('custName').value.trim();
  const phone = document.getElementById('custPhone').value.trim();
  const address = document.getElementById('custAddress').value.trim();
  const notes = document.getElementById('custNotes').value.trim();
  const payment = document.querySelector('input[name="payment"]:checked').value;

  if (!name || !phone || !address) {
    alert('⚠️ من فضلك اكملي جميع البيانات المطلوبة');
    return;
  }

  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const items = cart.map(i => `▫️ ${i.name} (${i.size}) ×${i.qty} = ${i.price * i.qty} ج.م`).join('\n');
  const paymentLabels = { instapay: 'إنستاباي', whatsapp: 'واتساب', cash: 'كاش عند الاستلام' };

  const msg = `🛍️ *طلب جديد من HALOULA*
━━━━━━━━━━━━━━━
👤 الاسم: ${name}
📞 الهاتف: ${phone}
📍 العنوان: ${address}
${notes ? `📝 ملاحظات: ${notes}` : ''}
━━━━━━━━━━━━━━━
📦 *المنتجات:*
${items}
━━━━━━━━━━━━━━━
💰 *الإجمالي: ${total.toLocaleString('ar-EG')} ج.م*
💳 طريقة الدفع: ${paymentLabels[payment]}
━━━━━━━━━━━━━━━`;

  if (payment === 'instapay') {
    window.open('https://ipn.eg/S/mohandehaben932/instapay/9FLI7y', '_blank');
    setTimeout(() => window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank'), 1000);
  } else {
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  cart = [];
  saveCart();
  updateCartBadge();
  closeModal();
  toggleCart();
  showToast('🎉 تم إرسال الطلب بنجاح! هنواصل معاكي قريباً');
}

// ===== LIGHTBOX =====
window.openLightbox = function(src, alt) {
  document.getElementById('lightboxImg').src = src;
  document.getElementById('lightboxImg').alt = alt || '';
  document.getElementById('lightbox').classList.add('open');
  document.body.style.overflow = 'hidden';
}

window.closeLightbox = function() {
  document.getElementById('lightbox').classList.remove('open');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });

// ===== TOAST =====
function showToast(msg) {
  const toast = document.createElement('div');
  toast.style.cssText = `position:fixed;bottom:30px;right:30px;background:#1a1a2e;color:#fff;padding:14px 24px;border-radius:12px;font-size:15px;font-weight:600;z-index:9999;box-shadow:0 8px 30px rgba(0,0,0,.2);font-family:'Tajawal',sans-serif;`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

document.getElementById('modalOverlay').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    const target = document.querySelector(a.getAttribute('href'));
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  });
});
