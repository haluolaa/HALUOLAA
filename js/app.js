import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// STATE
let allProducts = [], filteredProducts = [], currentPage = 1;
const PAGE_SIZE = 20;
const WHATSAPP = '201021102607';
let cart = JSON.parse(localStorage.getItem('haloula_cart') || '[]');

// INIT
document.addEventListener('DOMContentLoaded', async () => {
  updateCartBadge();
  initHamburger();
  showSkeleton();
  renderReviews();
  allProducts = await fetchProducts();
  filteredProducts = [...allProducts];
  renderProducts();
  updateCount();
});

// FETCH
async function fetchProducts() {
  const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
  return data || [];
}

// SKELETON
function showSkeleton() {
  document.getElementById('productsGrid').innerHTML = Array(6).fill(`
    <div class="product-card skeleton-card">
      <div class="skeleton-img"></div>
      <div class="skeleton-line short"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line medium"></div>
    </div>`).join('');
}

// HAMBURGER
function initHamburger() {
  document.getElementById('hamburger').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebarOverlay').classList.toggle('open');
  });
}

window.closeSidebar = function() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
}

// FILTER
window.filterCat = function(el, cat) {
  document.querySelectorAll('.sidebar-cats li').forEach(i => i.classList.remove('active'));
  el.classList.add('active');
  filteredProducts = cat === 'all' ? [...allProducts] : allProducts.filter(p => p.category === cat);
  const titles = { all:'All Products', فساتين:'Dresses', بلوزات:'Tops', بناطيل:'Pants', أطقم:'Sets', تيشيرتات:'T-Shirts', جيبات:'Skirts', أطفال:'Kids' };
  document.getElementById('catTitle').textContent = titles[cat] || cat;
  sortProducts();
  updateCount();
  if (window.innerWidth < 1024) closeSidebar();
  document.getElementById('shop').scrollIntoView({ behavior: 'smooth' });
}

function updateCount() {
  document.getElementById('catCount').textContent = `${filteredProducts.length} items`;
}

// SORT
window.sortProducts = function() {
  const val = document.getElementById('sortSel').value;
  const sorted = [...filteredProducts];
  if (val === 'price-asc') sorted.sort((a,b) => a.price - b.price);
  else if (val === 'price-desc') sorted.sort((a,b) => b.price - a.price);
  else if (val === 'newest') sorted.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
  filteredProducts = sorted;
  renderProducts(1);
}

// RENDER
function renderProducts(page = 1) {
  currentPage = page;
  const grid = document.getElementById('productsGrid');
  const items = filteredProducts.slice(0, page * PAGE_SIZE);

  if (!items.length) {
    grid.innerHTML = '<p style="color:#a89880;text-align:center;grid-column:1/-1;padding:60px 0">No products found</p>';
    document.getElementById('loadMoreWrap').style.display = 'none';
    return;
  }

  grid.innerHTML = items.map(p => {
    const img = p.image_url || '';
    const sizes = p.sizes ? p.sizes.split(',').map(s => s.trim()) : [];
    const colors = p.colors ? p.colors.split(',').map(c => c.trim()) : [];
    const name = p.name_en || p.name || '';
    const stock = [3,5,7,2,8,4,6,1,9,3,5,7][p.id % 12] || 5;
    const views = [12,8,23,5,17,31,9,14,6,19,11,25][p.id % 12] || 10;
    const rating = [4.9,4.8,5.0,4.7,4.9,4.8][p.id % 6];
    const count = [124,89,203,67,156,312][p.id % 6];

    return `
    <div class="product-card">
      <div class="product-img" onclick="openLightbox('${img}','${name}')">
        <img src="${img}" alt="${name}" loading="lazy"/>
        ${p.badge ? `<span class="product-badge badge-${p.badge}">${p.badge==='new'?'NEW':'SALE'}</span>` : ''}
        <span class="product-stock ${stock<=3?'stock-low':'stock-ok'}">${stock<=3?`🔥 Only ${stock} left`:'✅ In Stock'}</span>
      </div>
      <div class="product-info">
        <div class="product-cat">${p.category||''}</div>
        <div class="product-name">${name}</div>
        <div class="product-rating">
          <span class="stars">${'★'.repeat(Math.round(rating))}${'☆'.repeat(5-Math.round(rating))}</span>
          <span class="rnum">${rating}</span>
          <span class="rcnt">(${count})</span>
        </div>
        <div class="product-views"><i class="fas fa-eye"></i> ${views} viewing now</div>
        ${colors.length?`<div class="product-colors">${colors.slice(0,5).map(c=>`<div class="color-dot" style="background:${c}"></div>`).join('')}</div>`:''}
        ${sizes.length?`<div class="size-selector" id="sz-${p.id}">${sizes.slice(0,6).map((s,i)=>`<button class="size-btn${i===0?' selected':''}" onclick="selectSize('${p.id}','${s}',this)">${s}</button>`).join('')}</div>`:''}
        <div class="product-price-row">
          <div>
            <div class="product-price">${p.price} EGP</div>
            ${p.old_price?`<div class="product-old-price">${p.old_price} EGP</div>`:''}
          </div>
          <button class="add-btn" onclick="addToCart('${p.id}')">Add +</button>
        </div>
      </div>
    </div>`;
  }).join('');

  document.getElementById('loadMoreWrap').style.display = filteredProducts.length > page * PAGE_SIZE ? 'block' : 'none';
}

window.loadMore = function() { renderProducts(currentPage + 1); }

// SIZE
window.selectSize = function(id, size, btn) {
  document.getElementById(`sz-${id}`)?.querySelectorAll('.size-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

// CART
window.addToCart = function(pid) {
  const p = allProducts.find(x => String(x.id) === String(pid));
  if (!p) return;
  const sizeEl = document.querySelector(`#sz-${pid} .size-btn.selected`);
  const size = sizeEl ? sizeEl.textContent : (p.sizes ? p.sizes.split(',')[0].trim() : '');
  const existing = cart.find(i => String(i.id) === String(pid) && i.size === size);
  if (existing) existing.qty++;
  else cart.push({ ...p, size, qty: 1 });
  saveCart(); updateCartBadge();
  showToast(`Added: ${p.name_en || p.name}`);
}

window.removeFromCart = function(pid, size) {
  cart = cart.filter(i => !(String(i.id) === String(pid) && i.size === size));
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
  if (!cart.length) { container.innerHTML = '<p class="cart-empty">Your bag is empty 🛍️</p>'; footer.style.display = 'none'; return; }
  const total = cart.reduce((s,i) => s + i.price * i.qty, 0);
  container.innerHTML = cart.map(item => `
    <div class="cart-item">
      <img src="${item.image_url||''}" alt="${item.name}"/>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name_en||item.name}</div>
        <div class="cart-item-size">Size: ${item.size} × ${item.qty}</div>
        <div class="cart-item-price">${item.price*item.qty} EGP</div>
      </div>
      <button class="cart-item-remove" onclick="removeFromCart('${item.id}','${item.size}')"><i class="fas fa-trash"></i></button>
    </div>`).join('');
  document.getElementById('cartTotal').textContent = total.toLocaleString();
  footer.style.display = 'block';
}

// CHECKOUT
window.checkout = function() {
  if (!cart.length) return;
  document.getElementById('modalOverlay').classList.add('open');
  const total = cart.reduce((s,i) => s + i.price * i.qty, 0);
  document.getElementById('orderSummary').innerHTML = `
    <div class="order-summary">
      ${cart.map(i=>`<div class="order-summary-item"><span>${i.name_en||i.name} (${i.size}) ×${i.qty}</span><span>${i.price*i.qty} EGP</span></div>`).join('')}
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
  try {
    await supabase.from('orders').insert([{
      customer_name: name, customer_phone: phone, customer_address: address,
      notes, payment_method: payment, total,
      items: JSON.stringify(cart.map(i=>({ id:i.id, name:i.name_en||i.name, size:i.size, qty:i.qty, price:i.price, image:i.image_url }))),
      status: 'pending'
    }]);
  } catch(e) {}
  const items = cart.map(i=>`• ${i.name_en||i.name} (${i.size}) ×${i.qty} = ${i.price*i.qty} EGP`).join('\n');
  const msg = `🛍️ *New Order — HALOULA*\n━━━━━━━━━━━━\n👤 ${name}\n📞 ${phone}\n📍 ${address}\n💳 ${payment}\n━━━━━━━━━━━━\n${items}\n━━━━━━━━━━━━\n💰 Total: ${total.toLocaleString()} EGP`;
  if (payment === 'instapay') {
    window.open('https://ipn.eg/S/mohandehaben932/instapay/9FLI7y', '_blank');
    setTimeout(() => window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank'), 800);
  } else {
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank');
  }
  cart = []; saveCart(); updateCartBadge(); closeModal(); toggleCart();
  showToast('🎉 Order placed successfully!');
}

// REVIEWS
const REVIEWS = [
  { name:'Sarah A.', avatar:'S', stars:5, text:'Amazing quality! The dress fits perfectly and arrived so fast 🌸', product:'Chiffon Dress', date:'2 days ago' },
  { name:'Nour M.', avatar:'N', stars:5, text:'Best online store! Great prices and outstanding quality.', product:'Classic Jeans', date:'1 week ago' },
  { name:'Reem K.', avatar:'R', stars:5, text:'The set is beautiful and exactly like the photos. Fast delivery ❤️', product:'Casual Set', date:'3 days ago' },
  { name:'Mona H.', avatar:'M', stars:4, text:'The top is very soft and comfortable. Size was perfect 👍', product:'Casual Top', date:'2 weeks ago' },
  { name:'Dina K.', avatar:'D', stars:5, text:"The kids dress is so cute! My daughter loves it 🎀", product:'Kids Dress', date:'5 days ago' },
  { name:'Heba S.', avatar:'H', stars:5, text:'Perfect oversized t-shirt! Great quality and very affordable 💕', product:'Oversized T-Shirt', date:'1 day ago' },
];

function renderReviews() {
  const grid = document.getElementById('reviewsGrid');
  if (!grid) return;
  grid.innerHTML = REVIEWS.map(r => `
    <div class="review-card">
      <div class="review-header">
        <div class="review-avatar">${r.avatar}</div>
        <div><div class="review-name">${r.name}</div><div class="review-date">${r.date}</div></div>
      </div>
      <div class="review-stars">${'⭐'.repeat(r.stars)}</div>
      <div class="review-text">${r.text}</div>
      <div class="review-product">🛍️ ${r.product}</div>
      <div class="review-verified"><i class="fas fa-check-circle"></i> Verified Customer</div>
    </div>`).join('');
}

// LIGHTBOX
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

// TOAST
function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// SMOOTH SCROLL
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    const target = document.querySelector(a.getAttribute('href'));
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  });
});
