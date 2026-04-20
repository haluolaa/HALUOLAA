import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== STATE =====
let allProducts = [], filteredProducts = [], currentPage = 1;
const PAGE_SIZE = 20;
let cart = JSON.parse(localStorage.getItem('haloula_cart') || '[]');

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
  updateCartBadge();
  initHamburger();
  initStarRating();
  showSkeleton();
  loadCategories();
  renderReviews(); // async - runs in background
  allProducts = await fetchProducts();
  filteredProducts = [...allProducts];
  renderProducts();
  updateCount();

  // Modal close on overlay click
  document.getElementById('modalOverlay')?.addEventListener('click', function(e) {
    if (e.target === this) closeModal();
  });
  document.getElementById('reviewModalOverlay')?.addEventListener('click', function(e) {
    if (e.target === this) closeReviewModal();
  });

  // ESC key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeLightbox(); closeModal(); closeReviewModal(); closeDevCard(); }
  });
});

// ===== FETCH CATEGORIES =====
const CAT_EN = { 'فساتين':'Dresses','بلوزات':'Tops','بناطيل':'Pants','أطقم':'Sets','تيشيرتات':'T-Shirts','جيبات':'Skirts','أطفال':'Kids' };

async function loadCategories() {
  try {
    const { data } = await supabase.from('categories').select('*').eq('is_active', true).order('sort_order');
    if (!data || !data.length) return;
    const list = document.getElementById('sidebarCats');
    if (!list) return;
    const allItem = list.querySelector('[data-cat="all"]');
    list.innerHTML = '';
    if (allItem) list.appendChild(allItem);
    data.forEach(cat => {
      const li = document.createElement('li');
      li.dataset.cat = cat.name_ar;
      li.onclick = function() { filterCat(this, cat.name_ar); };
      const displayName = cat.name_en || CAT_EN[cat.name_ar] || cat.name_ar;
      li.innerHTML = `<i class="${cat.icon}"></i> ${displayName}`;
      list.appendChild(li);
    });
    updateCategorySelect(data);
  } catch(e) {}
}

function updateCategorySelect(cats) {
  window._catTitles = { all: 'All Products' };
  cats.forEach(c => { window._catTitles[c.name_ar] = c.name_en || CAT_EN[c.name_ar] || c.name_ar; });
}

// ===== FETCH =====
async function fetchProducts() {
  const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
  return data || [];
}

// ===== SKELETON =====
function showSkeleton() {
  document.getElementById('productsGrid').innerHTML = Array(6).fill(`
    <div class="product-card skeleton-card">
      <div class="skeleton-img"></div>
      <div class="skeleton-line short"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line medium"></div>
    </div>`).join('');
}

// ===== HAMBURGER =====
function initHamburger() {
  document.getElementById('hamburger')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebarOverlay').classList.toggle('open');
  });
}

window.closeSidebar = function() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
}

// ===== SEARCH =====
window.searchProducts = function(q) {
  const clearBtn = document.getElementById('searchClear');
  if (clearBtn) clearBtn.style.display = q ? 'flex' : 'none';

  const query = q.trim().toLowerCase();
  if (!query) {
    // restore current category filter
    const activeCat = document.querySelector('.sidebar-cats li.active')?.dataset.cat || 'all';
    filteredProducts = activeCat === 'all' ? [...allProducts] : allProducts.filter(p => p.category === activeCat);
  } else {
    filteredProducts = allProducts.filter(p => {
      const name = (p.name_en || p.name || '').toLowerCase();
      const nameAr = (p.name || '').toLowerCase();
      const cat = (p.category || '').toLowerCase();
      return name.includes(query) || nameAr.includes(query) || cat.includes(query);
    });
    // Update title
    document.getElementById('catTitle').textContent = `"${q}"`;
  }
  updateCount();
  renderProducts(1);
}

window.clearSearch = function() {
  const input = document.getElementById('productSearch');
  if (input) input.value = '';
  searchProducts('');
  input?.focus();
}

// ===== FILTER =====
window.filterCat = function(el, cat) {
  document.querySelectorAll('.sidebar-cats li').forEach(i => i.classList.remove('active'));
  el.classList.add('active');
  // Clear search
  const searchInput = document.getElementById('productSearch');
  if (searchInput) searchInput.value = '';
  const clearBtn = document.getElementById('searchClear');
  if (clearBtn) clearBtn.style.display = 'none';

  filteredProducts = cat === 'all' ? [...allProducts] : allProducts.filter(p => p.category === cat);
  const titles = window._catTitles || { all:'All Products', فساتين:'Dresses', بلوزات:'Tops', بناطيل:'Pants', أطقم:'Sets', تيشيرتات:'T-Shirts', جيبات:'Skirts', أطفال:'Kids' };
  document.getElementById('catTitle').textContent = titles[cat] || cat;
  sortProducts();
  updateCount();
  if (window.innerWidth < 1024) closeSidebar();
  document.getElementById('shop').scrollIntoView({ behavior: 'smooth' });
}

function updateCount() {
  document.getElementById('catCount').textContent = `${filteredProducts.length} items`;
}

// ===== SORT =====
window.sortProducts = function() {
  const val = document.getElementById('sortSel').value;
  const sorted = [...filteredProducts];
  if (val === 'price-asc') sorted.sort((a,b) => a.price - b.price);
  else if (val === 'price-desc') sorted.sort((a,b) => b.price - a.price);
  else if (val === 'newest') sorted.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
  filteredProducts = sorted;
  renderProducts(1);
}

// ===== RENDER PRODUCTS =====
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
        <div class="product-cat">${CAT_EN[p.category] || p.category||''}</div>
        <div class="product-name">${name}</div>
        <div class="product-rating">
          <span class="stars">${'★'.repeat(Math.round(rating))}${'☆'.repeat(5-Math.round(rating))}</span>
          <span class="rnum">${rating}</span>
          <span class="rcnt">(${count})</span>
        </div>
        <div class="product-views"><i class="fas fa-eye"></i> ${views} viewing now</div>
        ${colors.length?`<div class="product-colors">${colors.slice(0,5).map(c=>{
          // Support both hex colors and Arabic color names
          const isHex = /^#[0-9A-Fa-f]{3,6}$/.test(c) || /^rgb/.test(c);
          const colorMap = {'أبيض':'#fff','أسود':'#000','أحمر':'#e74c3c','أزرق':'#3498db','أخضر':'#2ecc71','أصفر':'#f1c40f','وردي':'#ff69b4','بنفسجي':'#9b59b6','برتقالي':'#e67e22','بني':'#a0522d','رمادي':'#95a5a6','بيج':'#f5f5dc','كحلي':'#000080','زيتي':'#808000','خمري':'#800020','تركواز':'#40e0d0','ذهبي':'#ffd700','فضي':'#c0c0c0','كريمي':'#fffdd0','فوشيا':'#ff1493'};
          const bg = isHex ? c : (colorMap[c] || '#c9a96e');
          return `<div class="color-dot" style="background:${bg}" title="${c}"></div>`;
        }).join('')}</div>`:''}
        ${sizes.length?`<div class="size-selector" id="sz-${p.id}">${sizes.slice(0,6).map((s,i)=>`<button class="size-btn${i===0?' selected':''}" onclick="selectSize('${p.id}','${s}',this)">${s}</button>`).join('')}</div>`:''}
        <div class="product-price-row">
          <div>
            <div class="product-price">${p.price} EGP</div>
            ${p.old_price?`<div class="product-old-price">${p.old_price} EGP</div>`:''}
          </div>
          <button class="add-btn" onclick="addToCart('${p.id}', this)">Add +</button>
        </div>
      </div>
    </div>`;
  }).join('');

  document.getElementById('loadMoreWrap').style.display = filteredProducts.length > page * PAGE_SIZE ? 'block' : 'none';
}

window.loadMore = function() { renderProducts(currentPage + 1); }

// ===== SIZE =====
window.selectSize = function(id, size, btn) {
  document.getElementById(`sz-${id}`)?.querySelectorAll('.size-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

// ===== CART FLY ANIMATION =====
function flyToCart(btnEl, imgSrc) {
  const cartBtn = document.querySelector('.cart-btn');
  if (!cartBtn) return;

  const btnRect = btnEl.getBoundingClientRect();
  const cartRect = cartBtn.getBoundingClientRect();

  // Start position
  const startX = btnRect.left + btnRect.width / 2;
  const startY = btnRect.top + btnRect.height / 2;
  const endX   = cartRect.left + cartRect.width / 2;
  const endY   = cartRect.top  + cartRect.height / 2;

  // Create flying element
  const fly = document.createElement('div');
  fly.className = 'fly-item';
  fly.style.cssText = `left:${startX - 25}px;top:${startY - 25}px;width:50px;height:50px;`;

  if (imgSrc) {
    fly.innerHTML = `<img src="${imgSrc}" style="width:100%;height:100%;object-fit:cover;"/>`;
  } else {
    fly.innerHTML = `<i class="fas fa-shopping-bag" style="color:var(--gold);font-size:20px;"></i>`;
  }

  document.body.appendChild(fly);

  // Arc animation using JS keyframes
  const duration = 700;
  const start = performance.now();

  // Control point for bezier arc (goes up then curves to cart)
  const cpX = (startX + endX) / 2 + (endX > startX ? -80 : 80);
  const cpY = Math.min(startY, endY) - 120;

  function animate(now) {
    const t = Math.min((now - start) / duration, 1);
    const ease = t < 0.5 ? 2*t*t : -1+(4-2*t)*t; // ease in-out

    // Quadratic bezier
    const x = (1-ease)*(1-ease)*startX + 2*(1-ease)*ease*cpX + ease*ease*endX;
    const y = (1-ease)*(1-ease)*startY + 2*(1-ease)*ease*cpY + ease*ease*endY;

    const size = 50 - ease * 32; // shrinks from 50 to 18
    const opacity = t > 0.8 ? 1 - (t - 0.8) * 5 : 1;

    fly.style.left    = (x - size/2) + 'px';
    fly.style.top     = (y - size/2) + 'px';
    fly.style.width   = size + 'px';
    fly.style.height  = size + 'px';
    fly.style.opacity = opacity;

    if (t < 1) {
      requestAnimationFrame(animate);
    } else {
      fly.remove();
      cartBtn.classList.add('cart-shake');
      setTimeout(() => cartBtn.classList.remove('cart-shake'), 500);
    }
  }

  requestAnimationFrame(animate);
}

// ===== CART =====
window.addToCart = function(pid, btnEl) {
  const p = allProducts.find(x => String(x.id) === String(pid));
  if (!p) return;
  const sizeEl = document.querySelector(`#sz-${pid} .size-btn.selected`);
  const size = sizeEl ? sizeEl.textContent : (p.sizes ? p.sizes.split(',')[0].trim() : '');
  const existing = cart.find(i => String(i.id) === String(pid) && i.size === size);
  if (existing) existing.qty++;
  else cart.push({ ...p, size, qty: 1 });
  saveCart(); updateCartBadge();
  showToast(`Added: ${p.name_en || p.name}`);
  // Vibration feedback
  if (navigator.vibrate) navigator.vibrate([30, 10, 30]);
  // Fly animation
  if (btnEl) flyToCart(btnEl, p.image_url || '');
}

window.removeFromCart = function(pid, size) {
  cart = cart.filter(i => !(String(i.id) === String(pid) && i.size === size));
  saveCart(); updateCartBadge(); renderCart();
}

window.changeQty = function(pid, size, delta) {
  const item = cart.find(i => String(i.id) === String(pid) && i.size === size);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cart = cart.filter(i => !(String(i.id) === String(pid) && i.size === size));
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
  if (!cart.length) {
    container.innerHTML = '<p class="cart-empty">Your bag is empty 🛍️</p>';
    footer.style.display = 'none';
    return;
  }
  const total = cart.reduce((s,i) => s + i.price * i.qty, 0);
  container.innerHTML = cart.map(item => `
    <div class="cart-item">
      <img src="${item.image_url||''}" alt="${item.name}"/>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name_en||item.name}</div>
        <div class="cart-item-size">Size: ${item.size}</div>
        <div class="cart-item-qty-row">
          <button class="qty-btn" onclick="changeQty('${item.id}','${item.size}',-1)">−</button>
          <span class="qty-num">${item.qty}</span>
          <button class="qty-btn" onclick="changeQty('${item.id}','${item.size}',1)">+</button>
          <div class="cart-item-price">${item.price*item.qty} EGP</div>
        </div>
      </div>
      <button class="cart-item-remove" onclick="removeFromCart('${item.id}','${item.size}')"><i class="fas fa-trash"></i></button>
    </div>`).join('');
  document.getElementById('cartTotal').textContent = total.toLocaleString();
  footer.style.display = 'block';
}

// ===== PAYMENT METHODS (dynamic from settings) =====
window.renderPaymentMethods = function() {
  const el = document.getElementById('paymentMethods');
  if (!el) return;
  const s = window._paySettings || {};
  let html = '';

  // Vodafone Cash — صورة = زر مباشر
  if (s.vodafone_enabled && (s.vodafone_link || s.vodafone_number)) {
    const href = s.vodafone_link || `vodafonecash://send?msisdn=${s.vodafone_number}`;
    const isDeepLink = !s.vodafone_link;
    html += `
    <div class="pay-card">
      <div style="font-size:12px;color:var(--muted);margin-bottom:8px;font-weight:600;text-align:center">
        <i class="fas fa-mobile-alt" style="color:#e60000;margin-left:4px"></i> Vodafone Cash
      </div>
      ${s.vodafone_number ? `
      <button class="pay-action-btn" onclick="copyText('${s.vodafone_number}')" style="width:100%;justify-content:center;margin-bottom:8px;font-size:14px;padding:12px;border-color:rgba(230,0,0,.3);color:var(--text)">
        <i class="fas fa-copy" style="color:#e60000"></i>
        Copy Number — <strong style="color:#e60000;font-family:monospace">${s.vodafone_number}</strong>
      </button>` : ''}
      <a href="${href}" ${isDeepLink ? `onclick="handleVFCash(event,'${s.vodafone_number}')"` : 'target="_blank"'} 
        style="display:flex;align-items:center;justify-content:center;gap:10px;padding:12px;background:linear-gradient(135deg,#e60000,#cc0000);border-radius:10px;text-decoration:none;color:#fff;font-weight:700;font-size:14px;transition:opacity .2s"
        onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">
        <img src="https://i.ibb.co/0y6yKR65/image.png" alt="Vodafone Cash" style="height:24px;width:auto;object-fit:contain;filter:brightness(0) invert(1)"/>
        Open Vodafone Cash App
      </a>
    </div>`;
  }

  // InstaPay — صورة = زر مباشر
  if (s.instapay_enabled && s.instapay_link) {
    html += `
    <div class="pay-card">
      <a href="${s.instapay_link}" target="_blank" class="pay-img-btn">
        <img src="https://i.ibb.co/gFtK0qQB/insta.png" alt="InstaPay"/>
        <span class="pay-img-label"><i class="fas fa-external-link-alt"></i> Open InstaPay</span>
      </a>
      ${s.instapay_account ? `
      <div class="pay-card-info">
        <div class="pay-info-row">
          <span>Account</span>
          <span class="pay-val">${s.instapay_account}</span>
        </div>
      </div>
      <div class="pay-card-btns">
        <button class="pay-action-btn" onclick="copyText('${s.instapay_account}')">
          <i class="fas fa-copy"></i> Copy Account
        </button>
      </div>` : ''}
    </div>`;
  }

  if (!html) {
    html = `<p style="text-align:center;color:var(--muted);padding:20px 0;font-size:14px">
      No payment methods available — contact us on
      <a href="https://ig.me/m/haloula_designer" target="_blank" style="color:var(--gold)">Instagram</a>
    </p>`;
  }

  el.innerHTML = html;
}

window.handleVFCash = function(e, number) {
  e.preventDefault();
  const deepLink = `vodafonecash://send?msisdn=${number}`;
  const fallback = 'https://play.google.com/store/apps/details?id=com.vodafone.myvodafone';
  const start = Date.now();
  window.location = deepLink;
  setTimeout(() => { if (Date.now() - start < 2000) window.open(fallback, '_blank'); }, 1500);
}

// ===== CHECKOUT =====
window.checkout = function() {
  if (!cart.length) return;
  document.getElementById('modalOverlay').classList.add('open');
  document.getElementById('step1').style.display = 'block';
  document.getElementById('step2').style.display = 'none';
  const total = cart.reduce((s,i) => s + i.price * i.qty, 0);
  document.getElementById('orderSummaryPreview').innerHTML = `
    <div class="order-step-summary">
      ${cart.map(i=>`<div class="s-item"><span>${i.name_en||i.name} (${i.size}) ×${i.qty}</span><span>${i.price*i.qty} EGP</span></div>`).join('')}
      <div class="s-total"><span>Total</span><span>${total.toLocaleString()} EGP</span></div>
    </div>`;
}

window.closeModal = function() {
  document.getElementById('modalOverlay').classList.remove('open');
}

window.backToStep1 = function() {
  document.getElementById('step1').style.display = 'block';
  document.getElementById('step2').style.display = 'none';
}

window.submitDetails = async function() {
  const name = document.getElementById('custName').value.trim();
  const phone = document.getElementById('custPhone').value.trim();
  const address = document.getElementById('custAddress').value.trim();
  const notes = document.getElementById('custNotes').value.trim();

  if (!name) { showToast('Please enter your name'); return; }
  if (!phone || phone.length < 10) { showToast('Please enter a valid phone number'); return; }
  if (!address) { showToast('Please enter your address'); return; }

  const total = cart.reduce((s,i) => s + i.price * i.qty, 0);
  try {
    const { data } = await supabase.from('orders').insert([{
      customer_name: name, customer_phone: phone, customer_address: address,
      notes, payment_method: 'pending', total,
      items: JSON.stringify(cart.map(i=>({ id:i.id, name:i.name_en||i.name, size:i.size, qty:i.qty, price:i.price, image:i.image_url }))),
      status: 'awaiting_payment'
    }]).select();
    if (data) window._pendingOrderId = data[0]?.id;
  } catch(e) {}

  document.getElementById('step1').style.display = 'none';
  document.getElementById('step2').style.display = 'block';
  document.getElementById('orderSummaryFinal').innerHTML = document.getElementById('orderSummaryPreview').innerHTML;
  // Render payment methods
  if (window.renderPaymentMethods) renderPaymentMethods();
}

window.copyText = function(text) {
  navigator.clipboard.writeText(text).then(() => showToast('✅ Copied!'));
}

window.confirmPaid = async function() {
  if (window._pendingOrderId) {
    try {
      await supabase.from('orders').update({ status: 'pending', payment_confirmed_by_customer: true }).eq('id', window._pendingOrderId);
    } catch(e) {}
  }

  // Show confirmation with payment buttons still visible
  const modal = document.querySelector('.order-modal');
  modal.innerHTML = `
    <div style="text-align:center;padding:10px 0 20px">
      <div style="font-size:56px;margin-bottom:12px">🎉</div>
      <h3 style="color:var(--gold);font-size:20px;margin-bottom:8px">Order Confirmed!</h3>
      <p style="color:#f0e6d3;font-size:14px;line-height:1.7;margin-bottom:20px">We'll contact you on Instagram to confirm payment & shipping 📦</p>
      <div style="background:rgba(201,169,110,.08);border:1px solid rgba(201,169,110,.2);border-radius:12px;padding:14px;margin-bottom:20px">
        <p style="color:var(--gold);font-size:13px;font-weight:600">📲 Contact us on Instagram to complete your order</p>
        <a href="https://ig.me/m/haloula_designer" target="_blank" class="btn btn-primary w-full" style="margin-top:10px;display:flex;align-items:center;justify-content:center;gap:8px;text-decoration:none">
          <i class="fab fa-instagram"></i> Contact on Instagram
        </a>
      </div>
      <p style="color:var(--muted);font-size:13px;margin-bottom:14px">Or pay now and send receipt on Instagram:</p>
      <div id="confirmPayMethods"></div>
      <button class="btn btn-outline w-full" onclick="closeModal()" style="margin-top:16px">Continue Shopping</button>
    </div>`;

  // Render payment buttons
  renderPaymentMethods();
  const pm = document.getElementById('paymentMethods');
  const confirmPm = document.getElementById('confirmPayMethods');
  if (pm && confirmPm) confirmPm.innerHTML = pm.innerHTML;

  cart = []; saveCart(); updateCartBadge();
  window._pendingOrderId = null;
}

// ===== REVIEWS =====
const STATIC_REVIEWS = [
  { name:'Sarah A.', avatar:'S', stars:5, text:'Amazing quality! The dress fits perfectly and arrived so fast 🌸', product:'Chiffon Dress', date:'2 days ago' },
  { name:'Nour M.', avatar:'N', stars:5, text:'Best online store! Great prices and outstanding quality.', product:'Classic Jeans', date:'1 week ago' },
  { name:'Reem K.', avatar:'R', stars:5, text:'The set is beautiful and exactly like the photos. Fast delivery ❤️', product:'Casual Set', date:'3 days ago' },
  { name:'Mona H.', avatar:'M', stars:4, text:'The top is very soft and comfortable. Size was perfect 👍', product:'Casual Top', date:'2 weeks ago' },
  { name:'Dina K.', avatar:'D', stars:5, text:"The kids dress is so cute! My daughter loves it 🎀", product:'Kids Dress', date:'5 days ago' },
  { name:'Heba S.', avatar:'H', stars:5, text:'Perfect oversized t-shirt! Great quality and very affordable 💕', product:'Oversized T-Shirt', date:'1 day ago' },
];

async function renderReviews() {
  const grid = document.getElementById('reviewsGrid');
  if (!grid) return;

  // Fetch approved reviews from Supabase
  let dbReviews = [];
  try {
    const { data } = await supabase.from('reviews').select('*').eq('status','approved').order('created_at', { ascending: false }).limit(12);
    dbReviews = data || [];
  } catch(e) {}

  // Static first, then real ones
  const staticHTML = STATIC_REVIEWS.map(r => `
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

  const dbHTML = dbReviews.map(r => {
    const initial = (r.customer_name || '?')[0].toUpperCase();
    const stars = Math.min(5, Math.max(1, r.rating || 5));
    const date = new Date(r.created_at).toLocaleDateString('en-GB', { day:'numeric', month:'short' });
    return `
    <div class="review-card review-card-real">
      <div class="review-header">
        <div class="review-avatar">${initial}</div>
        <div><div class="review-name">${r.customer_name}</div><div class="review-date">${date}</div></div>
      </div>
      <div class="review-stars">${'⭐'.repeat(stars)}</div>
      <div class="review-text">${r.comment}</div>
      ${r.product_name ? `<div class="review-product">🛍️ ${r.product_name}</div>` : ''}
      <div class="review-verified"><i class="fas fa-check-circle"></i> Verified Customer</div>
    </div>`;
  }).join('');

  grid.innerHTML = staticHTML + dbHTML;
}

// ===== REVIEW MODAL =====
function initStarRating() {
  document.querySelectorAll('.rstar').forEach(star => {
    star.addEventListener('click', () => {
      const val = parseInt(star.getAttribute('data-val'));
      document.getElementById('rv_rating').value = val;
      document.querySelectorAll('.rstar').forEach(s => {
        const sv = parseInt(s.getAttribute('data-val'));
        s.classList.toggle('active', sv <= val);
        s.classList.toggle('inactive', sv > val);
      });
    });
  });
}

window.openReviewModal = function() {
  document.getElementById('reviewModalOverlay').classList.add('open');
  document.getElementById('reviewForm').style.display = 'block';
  document.getElementById('reviewSuccess').style.display = 'none';
  if (window.innerWidth < 1024) closeSidebar();
}

window.closeReviewModal = function() {
  document.getElementById('reviewModalOverlay').classList.remove('open');
  document.getElementById('reviewForm').reset();
  document.getElementById('rv_rating').value = '5';
  document.querySelectorAll('.rstar').forEach(s => { s.classList.add('active'); s.classList.remove('inactive'); });
}

window.submitReview = async function(e) {
  e.preventDefault();
  const name = document.getElementById('rv_name').value.trim();
  const phone = document.getElementById('rv_phone').value.trim();
  const product = document.getElementById('rv_product').value.trim();
  const rating = parseInt(document.getElementById('rv_rating').value);
  const comment = document.getElementById('rv_comment').value.trim();
  if (!name || !comment) { showToast('Please fill in your name and review'); return; }
  const btn = document.getElementById('reviewSubmitBtn');
  btn.textContent = 'Submitting...';
  btn.disabled = true;
  try {
    await supabase.from('reviews').insert([{ customer_name: name, customer_phone: phone, product_name: product, rating, comment, status: 'pending' }]);
    document.getElementById('reviewForm').style.display = 'none';
    document.getElementById('reviewSuccess').style.display = 'block';
  } catch(err) {
    showToast('Error submitting. Please try again.');
    btn.textContent = 'Submit Review ✨';
    btn.disabled = false;
  }
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

// ===== TOAST =====
function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// ===== SMOOTH SCROLL =====
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    const target = document.querySelector(a.getAttribute('href'));
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  });
});

// ===== DEV CARD =====
window.triggerDevCard = function(btn) {
  openDevCard();
}

window.openDevCard = function() {
  document.getElementById('devCardOverlay').classList.add('open');
  if (window.innerWidth < 1024) closeSidebar();
}
window.closeDevCard = function() {
  document.getElementById('devCardOverlay').classList.remove('open');
}

// ===== BACK TO TOP =====
window.scrollToTop = function() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.addEventListener('scroll', () => {
  const btn = document.getElementById('backToTop');
  if (btn) btn.classList.toggle('visible', window.scrollY > 400);
});
