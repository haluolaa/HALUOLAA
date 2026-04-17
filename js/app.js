// ===== IMPORTS =====
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== STATE =====
let cart = JSON.parse(localStorage.getItem('haloula_cart') || '[]');
let allProducts = [];
let filteredProducts = [];
let currentPage = 1;
const PAGE_SIZE = 20;
const WHATSAPP = '201021102607';

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
  updateCartBadge();
  initNavbar();
  initSidebar();
  showSkeleton();
  allProducts = await fetchProducts();
  filteredProducts = [...allProducts];
  renderProducts(filteredProducts);
  updateCategoryCounts();
});

// ===== FETCH =====
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

// ===== NAVBAR =====
function initNavbar() {
  window.addEventListener('scroll', () => {
    document.getElementById('navbar').style.borderBottomColor = window.scrollY > 20 ? '#2a2a2a' : 'transparent';
  });
  document.getElementById('searchToggle').addEventListener('click', () => {
    document.getElementById('searchBar').classList.toggle('open');
    if (document.getElementById('searchBar').classList.contains('open')) {
      document.getElementById('searchInput').focus();
    }
  });
}

window.closeSearch = function() {
  document.getElementById('searchBar').classList.remove('open');
  document.getElementById('searchInput').value = '';
  filteredProducts = [...allProducts];
  renderProducts(filteredProducts);
}

// ===== SIDEBAR =====
function initSidebar() {
  document.getElementById('menuBtn').addEventListener('click', openSidebar);
  document.getElementById('sidebarClose').addEventListener('click', closeSidebar);
}

function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebarOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

window.closeSidebar = function() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

// ===== CATEGORY COUNTS =====
function updateCategoryCounts() {
  document.getElementById('count-all').textContent = allProducts.length;
  const cats = ['Dresses','Tops','Pants','Sets','T-Shirts','Skirts','Kids'];
  cats.forEach(cat => {
    const el = document.getElementById(`count-${cat}`);
    if (el) el.textContent = allProducts.filter(p => p.category === cat).length;
  });
}

// ===== FILTER =====
window.filterProducts = function(cat, el) {
  document.querySelectorAll('.cat-item').forEach(i => i.classList.remove('active'));
  if (el) el.classList.add('active');
  const minP = parseInt(document.getElementById('minPrice').value) || 0;
  const maxP = parseInt(document.getElementById('maxPrice').value) || Infinity;
  filteredProducts = (cat === 'all' ? allProducts : allProducts.filter(p => p.category === cat))
    .filter(p => p.price >= minP && p.price <= maxP);
  currentPage = 1;
  renderProducts(filteredProducts);
  if (window.innerWidth < 1024) closeSidebar();
}

window.filterByPrice = function() {
  const activeCat = document.querySelector('.cat-item.active')?.getAttribute('data-cat') || 'all';
  filterProducts(activeCat, document.querySelector('.cat-item.active'));
}

window.searchProducts = function(q) {
  const activeCat = document.querySelector('.cat-item.active')?.getAttribute('data-cat') || 'all';
  const base = activeCat === 'all' ? allProducts : allProducts.filter(p => p.category === activeCat);
  filteredProducts = q ? base.filter(p => p.name.toLowerCase().includes(q.toLowerCase()) || (p.name_en && p.name_en.toLowerCase().includes(q.toLowerCase()))) : base;
  currentPage = 1;
  renderProducts(filteredProducts);
}

// ===== SORT =====
window.sortProducts = function(val) {
  const sorted = [...filteredProducts];
  if (val === 'price-asc') sorted.sort((a,b) => a.price - b.price);
  else if (val === 'price-desc') sorted.sort((a,b) => b.price - a.price);
  else if (val === 'newest') sorted.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
  renderProducts(sorted);
}

// ===== RENDER =====
function renderProducts(list, page = 1) {
  currentPage = page;
  const grid = document.getElementById('productsGrid');
  const pageItems = list.slice(0, page * PAGE_SIZE);
  document.getElementById('productsCount').textContent = `${list.length} Products`;

  if (!list.length) {
    grid.innerHTML = '<p style="color:#8a7a6a;text-align:center;grid-column:1/-1;padding:60px 0;font-size:16px">No products found</p>';
    document.getElementById('loadMoreWrap').style.display = 'none';
    return;
  }

  grid.innerHTML = pageItems.map(p => {
    const sizes = typeof p.sizes === 'string' ? p.sizes.split(',') : (p.sizes || []);
    const colors = typeof p.colors === 'string' ? p.colors.split(',') : (p.colors || []);
    const img = p.image_url || p.image || '';
    const name = p.name_en || p.name || '';
    const stock = getFakeStock(p.id);
    const views = getFakeViews(p.id);
    const { rating, count } = getFakeRating(p.id);
    const stockClass = stock <= 3 ? 'stock-low' : 'stock-ok';
    const stockText = stock <= 3 ? `🔥 Only ${stock} left!` : `✅ In Stock`;

    return `
    <div class="product-card">
      <div class="product-img" onclick="openLightbox('${img}','${name}')">
        <img src="${img}" alt="${name}" loading="lazy"/>
        ${p.badge ? `<span class="product-badge badge-${p.badge}">${p.badge === 'new' ? 'NEW' : 'SALE'}</span>` : ''}
      </div>
      <div class="product-info">
        <div class="product-cat">${p.category || ''}</div>
        <div class="product-name">${name}</div>
        <div class="product-rating">
          <span class="stars">${'★'.repeat(Math.round(rating))}${'☆'.repeat(5-Math.round(rating))}</span>
          <span class="rating-num">${rating}</span>
          <span class="rating-count">(${count})</span>
        </div>
        <div class="product-views"><i class="fas fa-eye"></i> ${views} viewing now</div>
        <span class="product-stock ${stockClass}">${stockText}</span>
        <div class="product-colors">
          ${colors.slice(0,5).map(c=>`<div class="color-dot" style="background:${c.trim()}"></div>`).join('')}
        </div>
        <div class="size-selector" id="sizes-${p.id}">
          ${sizes.slice(0,6).map((s,i)=>`<button class="size-btn${i===0?' selected':''}" onclick="selectSize('${p.id}','${s.trim()}',this)">${s.trim()}</button>`).join('')}
        </div>
        <div class="product-price-row">
          <div>
            <div class="product-price">${p.price} EGP</div>
            ${p.old_price ? `<div class="product-old-price">${p.old_price} EGP</div>` : ''}
          </div>
          <button class="add-to-cart-btn" onclick="addToCart('${p.id}')">Add +</button>
        </div>
      </div>
    </div>`
  }).join('');

  const wrap = document.getElementById('loadMoreWrap');
  wrap.style.display = list.length > page * PAGE_SIZE ? 'block' : 'none';
}

window.loadMore = function() {
  renderProducts(filteredProducts, currentPage + 1);
}

// ===== SIZE =====
window.selectSize = function(id, size, btn) {
  document.getElementById(`sizes-${id}`)?.querySelectorAll('.size-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

function getSelectedSize(id) {
  return document.getElementById(`sizes-${id}`)?.querySelector('.size-btn.selected')?.textContent || null;
}

// ===== FAKE DATA =====
function getFakeStock(id) { return [3,5,7,2,8,4,6,1,9,3,5,7][id % 12] || 5; }
function getFakeViews(id) { return [12,8,23,5,17,31,9,14,6,19,11,25][id % 12] || 10; }
function getFakeRating(id) {
  return { rating: [4.9,4.8,5.0,4.7,4.9,4.8,5.0,4.6][id%8], count: [124,89,203,67,156,312,94,178][id%8] };
}

// ===== CART =====
window.addToCart = function(productId) {
  const p = allProducts.find(p => String(p.id) === String(productId));
  if (!p) return;
  const size = getSelectedSize(productId) || (p.sizes ? p.sizes.split(',')[0] : 'M');
  const existing = cart.find(i => String(i.id) === String(productId) && i.size === size);
  if (existing) existing.qty++;
  else cart.push({ ...p, size, qty: 1 });
  saveCart();
  updateCartBadge();
  showToast(`Added: ${p.name_en || p.name} — ${size}`);
}

window.removeFromCart = function(id, size) {
  cart = cart.filter(i => !(String(i.id) === String(id) && i.size === size));
  saveCart(); updateCartBadge(); renderCart();
}

function saveCart() { localStorage.setItem('haloula_cart', JSON.stringify(cart)); }

function updateCartBadge() {
  document.getElementById('cartBadge').textContent = cart.reduce((s,i) => s+i.qty, 0);
}

window.toggleCart = function() {
  document.getElementById('cartOverlay').classList.toggle('open');
  document.getElementById('cartSidebar').classList.toggle('open');
  renderCart();
}

function renderCart() {
  const container = document.getElementById('cartItems');
  const footer = document.getElementById('cartFooter');
  if (!cart.length) { container.innerHTML = '<p class="cart-empty">Your cart is empty 🛍️</p>'; footer.style.display = 'none'; return; }
  const total = cart.reduce((s,i) => s + i.price * i.qty, 0);
  container.innerHTML = cart.map(item => `
    <div class="cart-item">
      <img src="${item.image_url || item.image || ''}" alt="${item.name}"/>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name_en || item.name}</div>
        <div class="cart-item-size">Size: ${item.size} × ${item.qty}</div>
        <div class="cart-item-price">${item.price * item.qty} EGP</div>
      </div>
      <button class="cart-item-remove" onclick="removeFromCart('${item.id}','${item.size}')"><i class="fas fa-trash"></i></button>
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
    <div class="order-summary">
      ${cart.map(i => `<div class="order-summary-item"><span>${i.name_en||i.name} (${i.size}) ×${i.qty}</span><span>${i.price*i.qty} EGP</span></div>`).join('')}
      <div class="order-summary-total"><span>Total</span><span>${total.toLocaleString()} EGP</span></div>
    </div>`;
}

window.closeModal = function() { document.getElementById('modalOverlay').classList.remove('open'); }

window.submitOrder = async function() {
  const name = document.getElementById('custName').value.trim();
  const phone = document.getElementById('custPhone').value.trim();
  const address = document.getElementById('custAddress').value.trim();
  const payment = document.getElementById('custPayment').value;
  const notes = document.getElementById('custNotes').value.trim();

  if (!name || !phone || !address) { alert('Please fill in all required fields'); return; }

  const total = cart.reduce((s,i) => s + i.price * i.qty, 0);
  const items = cart.map(i => ({ id: i.id, name: i.name_en||i.name, size: i.size, qty: i.qty, price: i.price, image: i.image_url||i.image }));

  // Save to Supabase
  try {
    await supabase.from('orders').insert([{
      customer_name: name, customer_phone: phone,
      customer_address: address, payment_method: payment,
      notes, total, items: JSON.stringify(items), status: 'pending'
    }]);
  } catch(e) { console.log('Order save error:', e); }

  // Send WhatsApp
  const itemsText = cart.map(i => `• ${i.name_en||i.name} (${i.size}) ×${i.qty} = ${i.price*i.qty} EGP`).join('\n');
  const msg = `🛍️ *New Order — HALOULA*\n━━━━━━━━━━━━\n👤 ${name}\n📞 ${phone}\n📍 ${address}\n💳 ${payment}\n━━━━━━━━━━━━\n${itemsText}\n━━━━━━━━━━━━\n💰 Total: ${total.toLocaleString()} EGP`;

  if (payment === 'instapay') {
    window.open('https://ipn.eg/S/mohandehaben932/instapay/9FLI7y', '_blank');
    setTimeout(() => window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank'), 800);
  } else {
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  cart = []; saveCart(); updateCartBadge(); closeModal(); toggleCart();
  showToast('🎉 Order placed successfully!');
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
