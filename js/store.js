import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== STATE =====
let allProducts = [];
let filteredProducts = [];
let currentCat = 'all';
let currentPage = 1;
const PAGE_SIZE = 20;
const WHATSAPP = '201021102607';
let cart = JSON.parse(localStorage.getItem('haloula_cart') || '[]');

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
  updateCartUI();
  showSkeleton();
  allProducts = await fetchProducts();
  filteredProducts = allProducts;
  renderProducts();
  updateCount();
  initMenuToggle();
});

async function fetchProducts() {
  const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
  if (error) return [];
  return data || [];
}

// ===== SKELETON =====
function showSkeleton() {
  document.getElementById('productsGrid').innerHTML = Array(8).fill(`
    <div class="product-card skeleton-card">
      <div class="skeleton-img"></div>
      <div class="skeleton-line short"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line medium"></div>
    </div>`).join('');
}

// ===== RENDER =====
function renderProducts(page = 1) {
  currentPage = page;
  const grid = document.getElementById('productsGrid');
  const items = filteredProducts.slice(0, page * PAGE_SIZE);

  if (!items.length) {
    grid.innerHTML = '<p style="color:#8a7a6a;text-align:center;grid-column:1/-1;padding:60px 0;font-size:15px">No products found</p>';
    document.getElementById('loadMoreWrap').style.display = 'none';
    return;
  }

  grid.innerHTML = items.map(p => {
    const img = p.image_url || '';
    const sizes = p.sizes ? p.sizes.split(',').map(s => s.trim()) : [];
    const colors = p.colors ? p.colors.split(',').map(c => c.trim()) : [];
    const stock = getFakeStock(p.id);
    const views = getFakeViews(p.id);
    const { rating, count } = getFakeRating(p.id);
    const stockClass = stock <= 3 ? 'stock-low' : 'stock-ok';
    const stockText = stock <= 3 ? `Only ${stock} left!` : `In Stock`;

    return `
    <div class="product-card">
      <div class="product-img-wrap" onclick="openLightbox('${img}','${p.name}')">
        <img src="${img}" alt="${p.name}" loading="lazy"/>
        ${p.badge ? `<span class="product-badge badge-${p.badge}">${p.badge === 'new' ? 'NEW' : 'SALE'}</span>` : ''}
        <span class="product-stock-badge ${stockClass}">${stockText}</span>
      </div>
      <div class="product-info">
        <div class="product-cat-tag">${p.category || ''}</div>
        <div class="product-title">${p.name_en || p.name}</div>
        <div class="product-rating-row">
          <span class="stars">${'★'.repeat(Math.round(rating))}${'☆'.repeat(5 - Math.round(rating))}</span>
          <span class="rating-val">${rating}</span>
          <span class="rating-cnt">(${count})</span>
        </div>
        <div class="product-views-row"><i class="fas fa-eye"></i> ${views} viewing now</div>
        ${colors.length ? `<div class="product-colors-row">${colors.slice(0,5).map(c => `<div class="color-dot" style="background:${c}"></div>`).join('')}</div>` : ''}
        ${sizes.length ? `<div class="product-sizes-row" id="sizes-${p.id}">${sizes.slice(0,6).map((s,i) => `<span class="size-chip${i===0?' selected':''}" onclick="selectSize('${p.id}','${s}',this)">${s}</span>`).join('')}</div>` : ''}
        <div class="product-price-row">
          <div class="price-wrap">
            <div class="price">${p.price} EGP</div>
            ${p.old_price ? `<div class="old-price">${p.old_price} EGP</div>` : ''}
          </div>
          <button class="add-btn" onclick="addToCart('${p.id}')">Add to Bag</button>
        </div>
      </div>
    </div>`;
  }).join('');

  const wrap = document.getElementById('loadMoreWrap');
  wrap.style.display = filteredProducts.length > page * PAGE_SIZE ? 'block' : 'none';
}

// ===== FAKE DATA =====
function getFakeStock(id) { return [3,5,7,2,8,4,6,1,9,3,5,7][id % 12] || 5; }
function getFakeViews(id) { return [12,8,23,5,17,31,9,14,6,19,11,25][id % 12] || 10; }
function getFakeRating(id) {
  return { rating: [4.9,4.8,5.0,4.7,4.9,4.8][id % 6], count: [124,89,203,67,156,312][id % 6] };
}

// ===== SIZE SELECT =====
window.selectSize = function(pid, size, el) {
  document.querySelectorAll(`#sizes-${pid} .size-chip`).forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
}

// ===== FILTER =====
window.filterCat = function(el, cat) {
  document.querySelectorAll('.cat-item').forEach(i => i.classList.remove('active'));
  el.classList.add('active');
  currentCat = cat;
  filteredProducts = cat === 'all' ? allProducts : allProducts.filter(p => p.category === cat);
  sortProducts();
  updateCount();
  const titles = { all:'All Products', فساتين:'Dresses', بلوزات:'Tops', بناطيل:'Pants', أطقم:'Sets', تيشيرتات:'T-Shirts', جيبات:'Skirts', أطفال:'Kids' };
  document.getElementById('currentCatTitle').textContent = titles[cat] || cat;
  if (window.innerWidth < 1024) closeSidebar();
}

function updateCount() {
  document.getElementById('productsCount').textContent = `${filteredProducts.length} items`;
}

// ===== SORT =====
window.sortProducts = function() {
  const val = document.getElementById('sortSelect').value;
  let sorted = [...filteredProducts];
  if (val === 'price-asc') sorted.sort((a,b) => a.price - b.price);
  else if (val === 'price-desc') sorted.sort((a,b) => b.price - a.price);
  else if (val === 'newest') sorted.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
  filteredProducts = sorted;
  renderProducts(1);
}

// ===== LOAD MORE =====
window.loadMore = function() { renderProducts(currentPage + 1); }

// ===== SIDEBAR =====
function initMenuToggle() {
  document.getElementById('menuToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebarOverlay').classList.toggle('open');
  });
}

window.closeSidebar = function() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
}

// ===== CART =====
window.addToCart = function(pid) {
  const p = allProducts.find(x => String(x.id) === String(pid));
  if (!p) return;
  const sizeEl = document.querySelector(`#sizes-${pid} .size-chip.selected`);
  const size = sizeEl ? sizeEl.textContent : (p.sizes ? p.sizes.split(',')[0].trim() : '');
  const existing = cart.find(i => String(i.id) === String(pid) && i.size === size);
  if (existing) existing.qty++;
  else cart.push({ ...p, size, qty: 1 });
  saveCart();
  updateCartUI();
  showToast(`Added: ${p.name_en || p.name}`);
}

window.removeFromCart = function(pid, size) {
  cart = cart.filter(i => !(String(i.id) === String(pid) && i.size === size));
  saveCart();
  updateCartUI();
  renderCartItems();
}

function saveCart() { localStorage.setItem('haloula_cart', JSON.stringify(cart)); }

function updateCartUI() {
  const total = cart.reduce((s,i) => s + i.qty, 0);
  document.getElementById('cartBadge').textContent = total;
  document.getElementById('cartCount').textContent = total;
}

window.toggleCart = function() {
  document.getElementById('cartOverlay').classList.toggle('open');
  document.getElementById('cartDrawer').classList.toggle('open');
  renderCartItems();
}

function renderCartItems() {
  const container = document.getElementById('cartItems');
  const footer = document.getElementById('cartFooter');
  if (!cart.length) {
    container.innerHTML = '<div class="cart-empty-msg">Your bag is empty 🛍️</div>';
    footer.style.display = 'none';
    return;
  }
  const total = cart.reduce((s,i) => s + i.price * i.qty, 0);
  container.innerHTML = cart.map(item => `
    <div class="cart-item">
      <img src="${item.image_url || ''}" alt="${item.name}"/>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name_en || item.name}</div>
        <div class="cart-item-meta">Size: ${item.size} × ${item.qty}</div>
        <div class="cart-item-price">${item.price * item.qty} EGP</div>
      </div>
      <button class="cart-item-remove" onclick="removeFromCart('${item.id}','${item.size}')">
        <i class="fas fa-trash"></i>
      </button>
    </div>`).join('');
  document.getElementById('cartTotal').textContent = total.toLocaleString();
  footer.style.display = 'block';
}

// ===== CHECKOUT =====
window.checkout = function() {
  if (!cart.length) return;
  document.getElementById('modalOverlay').classList.add('open');
  const total = cart.reduce((s,i) => s + i.price * i.qty, 0);
  document.getElementById('orderSummary').innerHTML = `
    <div class="order-summary-box">
      ${cart.map(i => `<div class="order-summary-item"><span>${i.name_en || i.name} (${i.size}) ×${i.qty}</span><span>${i.price * i.qty} EGP</span></div>`).join('')}
      <div class="order-summary-total"><span>Total</span><span>${total.toLocaleString()} EGP</span></div>
    </div>`;
}

window.closeModal = function() { document.getElementById('modalOverlay').classList.remove('open'); }

window.submitOrder = async function() {
  const name = document.getElementById('custName').value.trim();
  const phone = document.getElementById('custPhone').value.trim();
  const address = document.getElementById('custAddress').value.trim();
  const notes = document.getElementById('custNotes').value.trim();
  const payment = document.querySelector('input[name="payment"]:checked').value;

  if (!name || !phone || !address) { showToast('Please fill in all required fields'); return; }

  const total = cart.reduce((s,i) => s + i.price * i.qty, 0);

  // Save order to Supabase
  const orderData = {
    customer_name: name,
    customer_phone: phone,
    customer_address: address,
    notes,
    payment_method: payment,
    total,
    items: JSON.stringify(cart.map(i => ({ id: i.id, name: i.name_en || i.name, size: i.size, qty: i.qty, price: i.price, image: i.image_url }))),
    status: 'pending'
  };

  try {
    await supabase.from('orders').insert([orderData]);
  } catch(e) {}

  // Send WhatsApp
  const items = cart.map(i => `• ${i.name_en || i.name} (${i.size}) ×${i.qty} = ${i.price * i.qty} EGP`).join('\n');
  const msg = `🛍️ *New Order — HALOULA*\n━━━━━━━━━━━━━━━\n👤 ${name}\n📞 ${phone}\n📍 ${address}${notes ? `\n📝 ${notes}` : ''}\n━━━━━━━━━━━━━━━\n${items}\n━━━━━━━━━━━━━━━\n💰 Total: ${total.toLocaleString()} EGP\n💳 Payment: ${payment}`;

  if (payment === 'instapay') {
    window.open('https://ipn.eg/S/mohandehaben932/instapay/9FLI7y', '_blank');
    setTimeout(() => window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank'), 800);
  } else {
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  cart = [];
  saveCart();
  updateCartUI();
  closeModal();
  toggleCart();
  showToast('Order placed successfully! 🎉');
}

// ===== LIGHTBOX =====
window.openLightbox = function(src, alt) {
  document.getElementById('lightboxImg').src = src;
  document.getElementById('lightbox').classList.add('open');
  document.body.style.overflow = 'hidden';
}
window.closeLightbox = function() {
  document.getElementById('lightbox').classList.remove('open');
  document.body.style.overflow = '';
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeLightbox(); closeModal(); } });
document.getElementById('modalOverlay').addEventListener('click', function(e) { if (e.target === this) closeModal(); });

// ===== TOAST =====
function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}
