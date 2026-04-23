// ===== IMPORTS =====
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://cxvesachmhwxvubzuejb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4dmVzYWNobWh3eHZ1Ynp1ZWpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNzA4MTMsImV4cCI6MjA5MTk0NjgxM30.mniUJBLfYmurefDTGqy4J8PSrmyHjqb6JUTf2pEpV-Y';
const STORAGE_BUCKET = 'HALUOLAA';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== STATE =====
let adminProducts = [];
let adminDiscounts = [];
let editingId = null;

// ===== AUTH CHECK ON LOAD =====
(async function() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    document.getElementById('loginScreen').classList.add('d-none');
    document.getElementById('dashboard').classList.remove('d-none');
    await loadDashboard();
  }
})();

// ===== LOGIN =====
document.getElementById('adminEmail').addEventListener('keydown', e => { if (e.key === 'Enter') adminLogin(); });
document.getElementById('adminPass').addEventListener('keydown', e => { if (e.key === 'Enter') adminLogin(); });

window.adminLogin = async function() {
  const email = document.getElementById('adminEmail').value.trim();
  const pass  = document.getElementById('adminPass').value;
  const errEl = document.getElementById('loginError');
  const btn   = document.querySelector('.login-form button');

  if (!email || !pass) { errEl.textContent = '⚠️ Enter email and password'; return; }

  btn.textContent = '⏳ Logging in...';
  btn.disabled = true;
  errEl.textContent = '';

  const { error } = await supabase.auth.signInWithPassword({ email, password: pass });

  btn.textContent = 'Login';
  btn.disabled = false;

  if (error) {
    errEl.textContent = '❌ Wrong email or password';
    document.getElementById('adminPass').style.borderColor = '#ff4757';
    document.getElementById('adminEmail').style.borderColor = '#ff4757';
    return;
  }

  document.getElementById('loginScreen').classList.add('d-none');
  document.getElementById('dashboard').classList.remove('d-none');
  await loadDashboard();
}

window.adminLogout = async function() {
  await supabase.auth.signOut();
  document.getElementById('dashboard').classList.add('d-none');
  document.getElementById('loginScreen').classList.remove('d-none');
  document.getElementById('adminPass').value = '';
  document.getElementById('adminEmail').value = '';
  document.getElementById('loginError').textContent = '';
}

window.toggleMobSidebar = function() {
  const sidebar = document.getElementById('adminSidebar');
  const overlay = document.getElementById('mobSidebarOverlay');
  sidebar.classList.toggle('mob-open');
  overlay.classList.toggle('mob-open');
  // Prevent body scroll when sidebar open
  document.body.style.overflow = sidebar.classList.contains('mob-open') ? 'hidden' : '';
}

function closeMobSidebar() {
  document.getElementById('adminSidebar')?.classList.remove('mob-open');
  document.getElementById('mobSidebarOverlay')?.classList.remove('mob-open');
  document.body.style.overflow = '';
}

// Auto-close sidebar when any nav item clicked
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('#adminSidebar .nav-item').forEach(item => {
    item.addEventListener('click', () => {
      if (window.innerWidth <= 900) closeMobSidebar();
    });
  });
});

// ===== LOAD DASHBOARD =====
async function loadDashboard() {
  await loadCategoryDropdowns();
  await loadProducts();
  await loadOrders();
  await loadDiscounts();
  initColorsPicker();
}

// ===== CATEGORY DROPDOWNS (dynamic from Supabase) =====
const DEFAULT_CATS = [
  { name_ar: 'فساتين',   name_en: 'Dresses'   },
  { name_ar: 'بلوزات',   name_en: 'Tops'      },
  { name_ar: 'بناطيل',   name_en: 'Pants'     },
  { name_ar: 'أطقم',     name_en: 'Sets'      },
  { name_ar: 'تيشيرتات', name_en: 'T-Shirts'  },
  { name_ar: 'جيبات',    name_en: 'Skirts'    },
  { name_ar: 'أطفال',    name_en: 'Kids'      },
];

async function loadCategoryDropdowns() {
  let cats = [];
  try {
    const { data } = await supabase.from('categories').select('*').neq('is_active', false).order('sort_order');
    cats = (data && data.length) ? data : DEFAULT_CATS;
  } catch(e) {
    cats = DEFAULT_CATS;
  }

  // Update CAT_LABELS dynamically
  cats.forEach(c => { CAT_LABELS[c.name_ar] = c.name_en; });

  const pCatSel      = document.getElementById('pCategory');
  const filterCatSel = document.getElementById('filterCategory');

  if (pCatSel) {
    pCatSel.innerHTML = '<option value="">Select Category</option>' +
      cats.map(c => `<option value="${c.name_ar}">${c.name_en} (${c.name_ar})</option>`).join('');
  }

  if (filterCatSel) {
    filterCatSel.innerHTML = '<option value="">All Categories</option>' +
      cats.map(c => `<option value="${c.name_ar}">${c.name_en}</option>`).join('');
  }
}

async function loadProducts() {
  const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
  adminProducts = data || [];
  document.getElementById('totalProducts').textContent = adminProducts.length;
  document.getElementById('totalDiscounts').textContent = adminDiscounts.length;
  renderRecentProducts();
  renderAdminTable(adminProducts);
}

// ===== SECTIONS =====
window.showSection = function(name) {
  document.querySelectorAll('.dash-section').forEach(s => s.classList.add('d-none'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const section = document.getElementById(`section-${name}`);
  if (section) section.classList.remove('d-none');
  const navItem = event.currentTarget.closest('.nav-item') || event.currentTarget;
  navItem.classList.add('active');
  const titles = { overview:'Overview', products:'Products', 'add-product':'Add Product', discounts:'Discounts', orders:'Orders', 'reviews-admin':'Reviews', settings:'Settings', customize:'Customize Site', 'categories-admin':'Categories' };
  document.getElementById('sectionTitle').textContent = titles[name] || name;

  // Close sidebar first, then load data
  if (window.innerWidth <= 900) {
    closeMobSidebar();
    setTimeout(() => loadSectionData(name), 50);
  } else {
    loadSectionData(name);
  }
}

function loadSectionData(name) {
  if (name === 'customize') loadCustomizeSettings();
  if (name === 'settings') loadSettingsSection();
  if (name === 'orders') loadOrders();
  if (name === 'reviews-admin') loadReviews();
  if (name === 'categories-admin') loadAdminCategories();
  if (name === 'discounts') loadDiscounts();
}

async function loadSettingsSection() {
  const { data } = await supabase.from('site_settings').select('*').eq('id', 1).single();
  if (!data) return;
  if (data.instapay_link) { const el = document.getElementById('c_instapay'); if (el) el.value = data.instapay_link; }
  if (data.instapay_account) { const el = document.getElementById('c_instapay_account'); if (el) el.value = data.instapay_account; }
  const ipEnabled = document.getElementById('c_instapay_enabled');
  if (ipEnabled) ipEnabled.checked = data.instapay_enabled !== false;
  if (data.vodafone_link) { const el = document.getElementById('c_vodafone_link'); if (el) el.value = data.vodafone_link; }
  if (data.vodafone_number) { const el = document.getElementById('c_vodafone'); if (el) el.value = data.vodafone_number; }
  const vfEnabled = document.getElementById('c_vodafone_enabled');
  if (vfEnabled) vfEnabled.checked = data.vodafone_enabled !== false;
}

// ===== RECENT PRODUCTS =====
function renderRecentProducts() {
  const list = document.getElementById('recentProductsList');
  list.innerHTML = adminProducts.slice(0,5).map(p => `
    <div class="recent-product-row">
      <img src="${p.image_url || ''}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/50'"/>
      <div class="rp-name">${p.name}</div>
      <span class="rp-cat">${CAT_LABELS[p.category] || p.category || ''}</span>
      <div class="rp-price">${p.price} EGP</div>
    </div>
  `).join('');
}

const CAT_LABELS = { 'فساتين':'Dresses','بلوزات':'Tops','بناطيل':'Pants','أطقم':'Sets','تيشيرتات':'T-Shirts','جيبات':'Skirts','أطفال':'Kids' };

function renderAdminTable(list) {
  const tbody = document.getElementById('adminProductsTable');
  tbody.innerHTML = list.map((p, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><img src="${p.image_url || ''}" alt="${p.name}" style="cursor:zoom-in" onclick="openLightboxAdmin('${p.image_url}')" onerror="this.src='https://via.placeholder.com/55'"/></td>
      <td><strong>${p.name}</strong></td>
      <td><span class="table-badge badge-pink">${CAT_LABELS[p.category] || p.category || ''}</span></td>
      <td><strong style="color:#e91e8c">${p.price} EGP</strong>${p.old_price ? `<br/><small style="text-decoration:line-through;color:#aaa">${p.old_price}</small>` : ''}</td>
      <td style="font-size:13px">${p.sizes || ''}</td>
      <td>
        <div class="table-actions">
          <button class="btn-edit" onclick="editProduct(${p.id})"><i class="fas fa-edit"></i> Edit</button>
          <button class="btn-delete" onclick="deleteProduct(${p.id})"><i class="fas fa-trash"></i> Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

window.searchAdminProducts = function() {
  const q = document.getElementById('searchProducts').value.toLowerCase();
  const cat = document.getElementById('filterCategory').value;
  const filtered = adminProducts.filter(p => {
    const matchQ = !q || p.name.toLowerCase().includes(q);
    const matchCat = !cat || p.category === cat;
    return matchQ && matchCat;
  });
  renderAdminTable(filtered);
}

window.filterAdminProducts = window.searchAdminProducts;

// ===== IMAGE UPLOAD =====
window.handleImageUpload = async function(input) {
  const file = input.files[0];
  if (!file) return;

  const preview = document.getElementById('imagePreview');
  const uploadLabel = document.getElementById('uploadLabel');
  const progressWrap = document.getElementById('uploadProgress');
  const progressBar = document.getElementById('uploadProgressBar');
  const progressText = document.getElementById('uploadProgressText');

  // Show progress
  uploadLabel.textContent = '⏳ Uploading...';
  uploadLabel.style.opacity = '0.7';
  progressWrap.style.display = 'block';
  progressBar.style.width = '0%';
  progressText.textContent = '0%';

  // Animate progress
  let prog = 0;
  const interval = setInterval(() => {
    prog += Math.random() * 15;
    if (prog > 85) prog = 85;
    progressBar.style.width = prog + '%';
    progressText.textContent = Math.round(prog) + '%';
  }, 200);

  const ext = file.name.split('.').pop();
  const fileName = `product_${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(fileName, file, { cacheControl: '3600', upsert: false });

  clearInterval(interval);

  if (error) {
    progressWrap.style.display = 'none';
    uploadLabel.textContent = '❌ Upload failed — try again';
    uploadLabel.style.opacity = '1';
    uploadLabel.style.borderColor = '#ff4757';
    uploadLabel.style.color = '#ff4757';
    return;
  }

  // Complete progress
  progressBar.style.width = '100%';
  progressText.textContent = '100%';

  const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
  document.getElementById('pImage').value = urlData.publicUrl;

  // Show preview
  preview.src = urlData.publicUrl;
  preview.style.display = 'block';
  document.getElementById('clearImageBtn').style.display = 'inline-block';

  setTimeout(() => { progressWrap.style.display = 'none'; }, 800);
  uploadLabel.textContent = '✅ Uploaded successfully!';
  uploadLabel.style.opacity = '1';
  uploadLabel.style.borderColor = '#2ecc71';
  uploadLabel.style.color = '#2ecc71';
}

// ===== SAVE PRODUCT =====
window.saveProduct = async function() {
  const name_en = document.getElementById('pNameEn').value.trim();
  const category = document.getElementById('pCategory').value;
  const price = parseInt(document.getElementById('pPrice').value);
  const image_url = document.getElementById('pImage').value.trim();
  const description = document.getElementById('pDescription').value.trim();
  const sizes = document.getElementById('pSizes').value.trim();
  const colors = document.getElementById('pColors').value.trim();
  const badge = document.getElementById('pBadge').value || null;

  if (!name_en || !category || !price || !image_url) {
    alert('⚠️ Please fill required fields: name, category, price, image');
    return;
  }

  const product = { name: name_en, name_en, category, price, image_url, description, sizes, colors, badge };
  const saveBtn = document.querySelector('.form-actions .btn-admin-primary');
  saveBtn.textContent = '⏳ Saving...';

  if (editingId) {
    const { error } = await supabase.from('products').update(product).eq('id', editingId);
    if (error) { alert('❌ Error: ' + error.message); saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Product'; return; }
    alert('✅ Product updated!');
  } else {
    const { error } = await supabase.from('products').insert([product]);
    if (error) { alert('❌ Error: ' + error.message); saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Product'; return; }
    alert('✅ Product added!');
  }

  saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Product';
  clearProductForm();
  await loadProducts();
}

window.editProduct = function(id) {
  const p = adminProducts.find(pr => pr.id == id);
  if (!p) return;
  editingId = id;
  document.getElementById('formTitle').textContent = '✏️ Edit Product';
  document.getElementById('pNameEn').value = p.name_en || p.name || '';
  document.getElementById('pCategory').value = p.category || '';
  document.getElementById('pPrice').value = p.price || '';
  document.getElementById('pImage').value = p.image_url || '';
  document.getElementById('pDescription').value = p.description || '';
  document.getElementById('pBadge').value = p.badge || '';
  setSizesFromValue(p.sizes || '');
  setColorNamesFromValue(p.colors || '');
  const preview = document.getElementById('imagePreview');
  if (p.image_url) { preview.src = p.image_url; preview.style.display = 'block'; }
  document.querySelectorAll('.dash-section').forEach(s => s.classList.add('d-none'));
  document.getElementById('section-add-product').classList.remove('d-none');
  document.getElementById('sectionTitle').textContent = 'Edit Product';
}

window.deleteProduct = async function(id) {
  if (!confirm('Are you sure you want to delete this product?')) return;
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) { alert('❌ Error: ' + error.message); return; }
  alert('🗑️ Deleted successfully');
  await loadProducts();
}

window.previewPastedImage = function(url) {
  const preview = document.getElementById('imagePreview');
  const clearBtn = document.getElementById('clearImageBtn');
  if (url) {
    preview.src = url; preview.style.display = 'block';
    if (clearBtn) clearBtn.style.display = 'inline-block';
  } else {
    preview.style.display = 'none';
    if (clearBtn) clearBtn.style.display = 'none';
  }
}

window.toggleHeroCard = function(show) {
  const card = document.querySelector('.hero-visual');
  // Save to settings
  document.getElementById('c_show_hero_card').checked = show;
}

window.clearProductImage = function() {
  document.getElementById('pImage').value = '';
  const preview = document.getElementById('imagePreview');
  preview.src = ''; preview.style.display = 'none';
  document.getElementById('clearImageBtn').style.display = 'none';
  const label = document.getElementById('uploadLabel');
  label.textContent = '📸 Choose image or upload from device';
  label.style.borderColor = ''; label.style.color = '';
}

window.clearHeroImage = function() {
  document.getElementById('c_hero_image').value = '';
  const preview = document.getElementById('heroImgPreview');
  preview.src = ''; preview.style.display = 'none';
  document.getElementById('clearHeroImgBtn').style.display = 'none';
  document.getElementById('heroImgLabel').textContent = '🖼️ Upload Hero Image';
}

window.clearProductForm = function() {
  editingId = null;
  document.getElementById('formTitle').textContent = '➕ Add New Product';
  ['pNameEn','pCategory','pPrice','pImage','pDescription','pBadge'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  setSizesFromValue('');
  setColorNamesFromValue('');
  const preview = document.getElementById('imagePreview');
  if (preview) { preview.src = ''; preview.style.display = 'none'; }
  const uploadLabel = document.getElementById('uploadLabel');
  if (uploadLabel) { uploadLabel.textContent = '📸 Choose image or upload from device'; uploadLabel.style.borderColor = ''; uploadLabel.style.color = ''; }
}

// ===== DISCOUNTS =====
async function loadDiscounts() {
  const { data } = await supabase.from('discounts').select('*').order('created_at', { ascending: false });
  adminDiscounts = data || [];
  document.getElementById('totalDiscounts').textContent = adminDiscounts.length;
  renderDiscounts();
}

window.addDiscount = async function() {
  const code    = document.getElementById('dCode').value.trim().toUpperCase();
  const percent = parseInt(document.getElementById('dPercent').value);
  const expiry  = document.getElementById('dExpiry').value || null;

  if (!code || !percent) { alert('⚠️ Please fill in discount code and percentage'); return; }

  const btn = document.querySelector('#section-discounts .btn-admin-primary');
  btn.textContent = '⏳ Saving...';
  btn.disabled = true;

  const { error } = await supabase.from('discounts').insert([{ code, percent, expiry, is_active: true }]);

  btn.innerHTML = '<i class="fas fa-plus"></i> Add Code';
  btn.disabled = false;

  if (error) {
    if (error.code === '23505') alert('⚠️ This code already exists!');
    else alert('❌ Error: ' + error.message);
    return;
  }

  document.getElementById('dCode').value    = '';
  document.getElementById('dPercent').value = '';
  document.getElementById('dExpiry').value  = '';
  await loadDiscounts();
}

function renderDiscounts() {
  const list = document.getElementById('discountsList');
  if (!adminDiscounts.length) {
    list.innerHTML = '<p style="color:#888;text-align:center;padding:20px">No discounts yet</p>';
    return;
  }
  list.innerHTML = adminDiscounts.map(d => `
    <div class="discount-card">
      <div>
        <div class="discount-code">${d.code}</div>
        <div class="discount-info">${d.expiry ? `Expires: ${d.expiry}` : 'No expiry date'} · Used: ${d.used_count || 0}x</div>
      </div>
      <div class="discount-percent">${d.percent}% off</div>
      <button class="btn-delete" onclick="deleteDiscount(${d.id})"><i class="fas fa-trash"></i></button>
    </div>
  `).join('');
}

window.deleteDiscount = async function(id) {
  if (!confirm('Delete this discount code?')) return;
  await supabase.from('discounts').delete().eq('id', id);
  adminDiscounts = adminDiscounts.filter(d => d.id !== id);
  document.getElementById('totalDiscounts').textContent = adminDiscounts.length;
  renderDiscounts();
}

// ===== LIGHTBOX =====
window.openLightboxAdmin = function(src) {
  if (!src) return;
  const lb = document.getElementById('adminLightbox');
  document.getElementById('adminLightboxImg').src = src;
  lb.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

window.closeAdminLightbox = function() {
  document.getElementById('adminLightbox').style.display = 'none';
  document.body.style.overflow = '';
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAdminLightbox(); });

// ===== SIZES PICKER =====
window.toggleSize = function(el) {
  el.classList.toggle('selected');
  updateSizesInput();
}

function updateSizesInput() {
  const selected = [...document.querySelectorAll('.size-option.selected')].map(el => el.textContent);
  document.getElementById('pSizes').value = selected.join(',');
}

function setSizesFromValue(val) {
  document.querySelectorAll('.size-option').forEach(el => el.classList.remove('selected'));
  if (!val) return;
  val.split(',').forEach(s => {
    document.querySelectorAll('.size-option').forEach(el => {
      if (el.textContent.trim() === s.trim()) el.classList.add('selected');
    });
  });
}

// ===== PRODUCT NAME SUGGESTIONS =====
const NAME_SUGGESTIONS = {
  'فساتين': ['Chiffon Dress','Casual Dress','Evening Dress','Summer Dress','Maxi Dress','Mini Dress','Floral Dress','Wrap Dress'],
  'بلوزات': ['Casual Top','Sleeveless Top','Crop Top','Blouse','Shirt','Printed Top','Basic Top'],
  'بناطيل': ['Casual Pants','Jeans','Wide Leg Pants','Jogger Pants','Linen Pants','Palazzo Pants'],
  'أطقم':   ['Casual Set','Two Piece Set','Matching Set','Loungewear Set','Summer Set'],
  'تيشيرتات':['Oversized T-Shirt','Basic T-Shirt','Printed T-Shirt','Crop T-Shirt','V-Neck T-Shirt'],
  'جيبات':  ['Mini Skirt','Midi Skirt','Maxi Skirt','Pleated Skirt','Floral Skirt'],
  'أطفال':  ['Kids Dress','Girls Top','Kids Set','Girls Skirt','Kids Pants'],
};

window.showNameSuggestions = function() {
  const cat = document.getElementById('pCategory').value;
  const val = document.getElementById('pNameEn').value;
  filterNameSuggestions(val, cat);
}

window.filterNameSuggestions = function(val, cat) {
  cat = cat || document.getElementById('pCategory').value;
  const list = NAME_SUGGESTIONS[cat] || Object.values(NAME_SUGGESTIONS).flat();
  const filtered = val
    ? list.filter(s => s.toLowerCase().includes(val.toLowerCase()))
    : list;
  const box = document.getElementById('nameSuggestions');
  if (!box) return;
  if (!filtered.length) { box.style.display = 'none'; return; }
  box.innerHTML = filtered.map(s =>
    `<div class="name-suggestion-item" onmousedown="selectNameSuggestion('${s}')">${s}</div>`
  ).join('');
  box.style.display = 'block';
}

window.selectNameSuggestion = function(name) {
  document.getElementById('pNameEn').value = name;
  hideNameSuggestions();
}

window.hideNameSuggestions = function() {
  const box = document.getElementById('nameSuggestions');
  if (box) box.style.display = 'none';
}

// ===== CAMERA COLOR PICKER =====
let _cameraStream = null;
let _cameraInterval = null;
let _capturedColor = null;

window.openColorCamera = async function() {
  const wrap = document.getElementById('colorCameraWrap');
  const video = document.getElementById('colorCameraVideo');
  wrap.style.display = 'block';
  try {
    _cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    video.srcObject = _cameraStream;
    startColorSampling();
  } catch(e) {
    alert('Cannot open camera — check camera permission');
    wrap.style.display = 'none';
  }
}

function startColorSampling() {
  const video = document.getElementById('colorCameraVideo');
  const countdown = document.getElementById('colorCameraCountdown');
  const preview = document.getElementById('colorCameraPreview');
  const nameEl = document.getElementById('colorCameraName');
  const hexEl = document.getElementById('colorCameraHex');
  let count = 5;
  countdown.textContent = `📷 ${count}s`;

  _cameraInterval = setInterval(() => {
    // Sample color from center of video
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const cx = Math.floor(canvas.width / 2);
    const cy = Math.floor(canvas.height / 2);
    // Average 10x10 pixels from center
    let r=0,g=0,b=0,n=0;
    for(let dx=-5;dx<=5;dx++) for(let dy=-5;dy<=5;dy++) {
      const px = ctx.getImageData(cx+dx, cy+dy, 1, 1).data;
      r+=px[0]; g+=px[1]; b+=px[2]; n++;
    }
    r=Math.round(r/n); g=Math.round(g/n); b=Math.round(b/n);
    const hex = '#' + [r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');
    const name = rgbToColorName(r,g,b);
    preview.style.background = hex;
    nameEl.textContent = name;
    hexEl.textContent = hex;
    _capturedColor = { hex, name };

    count--;
    if (count > 0) {
      countdown.textContent = `📷 ${count}s`;
    } else {
      countdown.textContent = '✅ Done!';
      clearInterval(_cameraInterval);
    }
  }, 1000);
}

window.addColorFromCamera = function() {
  if (!_capturedColor) return;
  addColorName(_capturedColor.name);
  closeColorCamera();
}

window.closeColorCamera = function() {
  if (_cameraStream) { _cameraStream.getTracks().forEach(t => t.stop()); _cameraStream = null; }
  if (_cameraInterval) { clearInterval(_cameraInterval); _cameraInterval = null; }
  document.getElementById('colorCameraWrap').style.display = 'none';
  document.getElementById('colorCameraCountdown').textContent = '';
}

function rgbToColorName(r, g, b) {
  const colors = [
    { name:'White', r:255,g:255,b:255 }, { name:'Black', r:0,g:0,b:0 },
    { name:'Red', r:220,g:50,b:50 }, { name:'Dark Red', r:139,g:0,b:0 },
    { name:'Pink', r:255,g:182,b:193 }, { name:'Hot Pink', r:255,g:105,b:180 },
    { name:'Fuchsia', r:255,g:0,b:255 }, { name:'Purple', r:128,g:0,b:128 },
    { name:'Violet', r:148,g:0,b:211 }, { name:'Lavender', r:200,g:162,b:200 },
    { name:'Blue', r:0,g:0,b:255 }, { name:'Navy', r:0,g:0,b:128 },
    { name:'Sky Blue', r:135,g:206,b:235 }, { name:'Teal', r:0,g:128,b:128 },
    { name:'Turquoise', r:64,g:224,b:208 }, { name:'Cyan', r:0,g:255,b:255 },
    { name:'Green', r:0,g:128,b:0 }, { name:'Lime', r:0,g:255,b:0 },
    { name:'Olive', r:128,g:128,b:0 }, { name:'Mint', r:152,g:255,b:152 },
    { name:'Yellow', r:255,g:255,b:0 }, { name:'Gold', r:255,g:215,b:0 },
    { name:'Orange', r:255,g:165,b:0 }, { name:'Dark Orange', r:255,g:140,b:0 },
    { name:'Brown', r:139,g:69,b:19 }, { name:'Beige', r:245,g:245,b:220 },
    { name:'Cream', r:255,g:253,b:208 }, { name:'Khaki', r:195,g:176,b:145 },
    { name:'Gray', r:128,g:128,b:128 }, { name:'Light Gray', r:211,g:211,b:211 },
    { name:'Dark Gray', r:64,g:64,b:64 }, { name:'Silver', r:192,g:192,b:192 },
    { name:'Maroon', r:128,g:0,b:0 }, { name:'Salmon', r:250,g:128,b:114 },
    { name:'Coral', r:255,g:127,b:80 }, { name:'Peach', r:255,g:218,b:185 },
  ];
  let closest = colors[0], minDist = Infinity;
  colors.forEach(c => {
    const d = Math.sqrt((r-c.r)**2 + (g-c.g)**2 + (b-c.b)**2);
    if (d < minDist) { minDist = d; closest = c; }
  });
  return closest.name;
}

// ===== COLOR NAMES PICKER =====
let selectedColorNames = [];

window.addColorByName = function() {
  const input = document.getElementById('colorNameInput');
  const val = input.value.trim();
  if (!val) return;
  val.split(/[,،]/).map(v => v.trim()).filter(Boolean).forEach(addColorName);
  input.value = '';
  input.focus();
}

window.addColorName = function(name) {
  if (!name || selectedColorNames.includes(name)) return;
  selectedColorNames.push(name);
  updateColorNamesInput();
  renderColorNameTags();
}

window.removeColorName = function(name) {
  selectedColorNames = selectedColorNames.filter(c => c !== name);
  updateColorNamesInput();
  renderColorNameTags();
}

window.addColorOnEnter = function(e) {
  if (e.key === 'Enter') { e.preventDefault(); addColorByName(); }
}

function updateColorNamesInput() {
  const el = document.getElementById('pColors');
  if (el) el.value = selectedColorNames.join(',');
}

function renderColorNameTags() {
  const wrap = document.getElementById('selectedColorNames');
  if (!wrap) return;
  wrap.innerHTML = selectedColorNames.length
    ? selectedColorNames.map(n => `
        <div class="color-name-tag">
          ${n}
          <span class="remove-tag" onclick="removeColorName('${n}')">×</span>
        </div>`).join('')
    : '<span style="color:#aaa;font-size:13px">No colors added yet</span>';
}

function setColorNamesFromValue(val) {
  selectedColorNames = val ? val.split(',').map(c => c.trim()).filter(Boolean) : [];
  updateColorNamesInput();
  renderColorNameTags();
}

// ===== COLORS PICKER (legacy - kept for compatibility) =====
const PRESET_COLORS = [
  { name: 'White', hex: '#FFFFFF' }, { name: 'Black', hex: '#000000' },
  { name: 'Gray', hex: '#808080' }, { name: 'Light Gray', hex: '#D3D3D3' },
  { name: 'Pink', hex: '#FFB6C1' }, { name: 'Dark Pink', hex: '#FF69B4' },
  { name: 'Fuchsia', hex: '#FF1493' }, { name: 'Red', hex: '#FF0000' },
  { name: 'Orange', hex: '#FFA500' }, { name: 'Yellow', hex: '#FFD700' },
  { name: 'Light Green', hex: '#90EE90' }, { name: 'Green', hex: '#008000' },
  { name: 'Light Blue', hex: '#87CEEB' }, { name: 'Blue', hex: '#0000FF' },
  { name: 'Navy', hex: '#000080' }, { name: 'Purple', hex: '#800080' },
  { name: 'Lavender', hex: '#C8A2C8' }, { name: 'Beige', hex: '#F5F5DC' },
  { name: 'Cream', hex: '#FFFDD0' }, { name: 'Brown', hex: '#A52A2A' },
  { name: 'Khaki', hex: '#C3B091' }, { name: 'Olive', hex: '#808000' },
  { name: 'Turquoise', hex: '#40E0D0' }, { name: 'Mint', hex: '#98FF98' },
  { name: 'Maroon', hex: '#800020' }, { name: 'Gold', hex: '#FFD700' },
  { name: 'Silver', hex: '#C0C0C0' }, { name: 'Salmon', hex: '#FA8072' },
];

let selectedColors = [];

function initColorsPicker() {
  renderColorsGrid(PRESET_COLORS);
  renderSelectedColors();
}

function renderColorsGrid(colors) {
  const grid = document.getElementById('colorsPicker');
  if (!grid) return;
  grid.innerHTML = colors.map(c => `
    <div class="color-swatch ${selectedColors.includes(c.hex) ? 'selected' : ''}"
      style="background:${c.hex}"
      onclick="toggleColor('${c.hex}','${c.name}')"
      title="${c.name}">
      <span class="color-tooltip">${c.name}</span>
    </div>
  `).join('');
}

window.searchColors = function(q) {
  const filtered = PRESET_COLORS.filter(c => c.name.includes(q) || c.hex.toLowerCase().includes(q.toLowerCase()));
  renderColorsGrid(filtered);
}

window.toggleColor = function(hex, name) {
  if (selectedColors.includes(hex)) {
    selectedColors = selectedColors.filter(c => c !== hex);
  } else {
    selectedColors.push(hex);
  }
  updateColorsInput();
  renderColorsGrid(PRESET_COLORS);
  renderSelectedColors();
}

window.addCustomColor = function(hex) {
  if (!selectedColors.includes(hex)) {
    selectedColors.push(hex);
    updateColorsInput();
    renderSelectedColors();
  }
}

window.removeColor = function(hex) {
  selectedColors = selectedColors.filter(c => c !== hex);
  updateColorsInput();
  renderColorsGrid(PRESET_COLORS);
  renderSelectedColors();
}

function updateColorsInput() {
  document.getElementById('pColors').value = selectedColors.join(',');
}

function renderSelectedColors() {
  const wrap = document.getElementById('selectedColors');
  if (!wrap) return;
  if (!selectedColors.length) { wrap.innerHTML = '<span style="color:#aaa;font-size:13px">No colors selected yet</span>'; return; }
  wrap.innerHTML = selectedColors.map(hex => `
    <div class="selected-color-chip">
      <div class="chip-dot" style="background:${hex}"></div>
      <span>${hex}</span>
      <span class="chip-remove" onclick="removeColor('${hex}')">×</span>
    </div>
  `).join('');
}

function setColorsFromValue(val) {
  selectedColors = val ? val.split(',').map(c => c.trim()).filter(Boolean) : [];
  updateColorsInput();
  renderColorsGrid(PRESET_COLORS);
  renderSelectedColors();
}

// ===== CATEGORIES ADMIN =====
let adminCategories = [];

async function loadAdminCategories() {
  const { data } = await supabase.from('categories').select('*').order('sort_order');
  adminCategories = data || [];
  renderAdminCategories();
}

function renderAdminCategories() {
  const list = document.getElementById('categoriesList');
  if (!list) return;
  if (!adminCategories.length) {
    list.innerHTML = '<p style="text-align:center;color:#aaa;padding:20px">No categories yet</p>';
    return;
  }
  list.innerHTML = `
    <table class="admin-table">
      <thead><tr><th>Icon</th><th>Name (EN)</th><th>Name (AR)</th><th>Order</th><th>Status</th><th>Action</th></tr></thead>
      <tbody>
        ${adminCategories.map(c => `
          <tr>
            <td style="font-size:20px;text-align:center"><i class="${c.icon}"></i></td>
            <td><strong>${c.name_en}</strong></td>
            <td>${c.name_ar}</td>
            <td>${c.sort_order}</td>
            <td>
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
                <input type="checkbox" ${c.is_active ? 'checked' : ''} class="toggle-switch"
                  onchange="toggleCategory(${c.id}, this.checked)"/>
                <span style="font-size:13px;color:${c.is_active ? '#2ecc71' : '#aaa'}">${c.is_active ? 'Visible' : 'Hidden'}</span>
              </label>
            </td>
            <td>
              <button class="btn-delete" onclick="deleteCategory(${c.id})"><i class="fas fa-trash"></i></button>
            </td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

window.addCategory = async function() {
  const nameEn = document.getElementById('catNameEn').value.trim();
  const nameAr = document.getElementById('catNameAr').value.trim();
  const icon   = document.getElementById('catIcon').value.trim() || 'fas fa-tag';
  const order  = parseInt(document.getElementById('catOrder').value) || adminCategories.length + 1;
  if (!nameEn || !nameAr) { alert('⚠️ Enter category name in both languages'); return; }
  const { error } = await supabase.from('categories').insert([{ name_en: nameEn, name_ar: nameAr, icon, sort_order: order, is_active: true }]);
  if (error) { alert('❌ Error: ' + error.message); return; }
  document.getElementById('catNameEn').value = '';
  document.getElementById('catNameAr').value = '';
  document.getElementById('catOrder').value = '';
  await loadAdminCategories();
  await loadCategoryDropdowns();
  alert('✅ Category added!');
}

window.toggleCategory = async function(id, active) {
  await supabase.from('categories').update({ is_active: active }).eq('id', id);
  const cat = adminCategories.find(c => c.id === id);
  if (cat) cat.is_active = active;
  renderAdminCategories();
  await loadCategoryDropdowns();
}

window.deleteCategory = async function(id) {
  if (!confirm('Delete this category?')) return;
  await supabase.from('categories').delete().eq('id', id);
  adminCategories = adminCategories.filter(c => c.id !== id);
  renderAdminCategories();
  await loadCategoryDropdowns();
}

window.previewCatIcon = function(val) {
  const preview = document.getElementById('catIconPreview');
  if (preview) preview.innerHTML = `<i class="${val}"></i>`;
}

window.setCatIcon = function(icon) {
  document.getElementById('catIcon').value = icon;
  previewCatIcon(icon);
}

// ===== SETTINGS =====
window.saveSettings = async function() {
  const newPass = document.getElementById('newPassword').value.trim();

  // Save payment settings
  const paySettings = {
    instapay_link: document.getElementById('c_instapay')?.value || '',
    instapay_account: document.getElementById('c_instapay_account')?.value || '',
    instapay_enabled: document.getElementById('c_instapay_enabled')?.checked !== false,
    vodafone_link: document.getElementById('c_vodafone_link')?.value || '',
    vodafone_number: document.getElementById('c_vodafone')?.value || '',
    vodafone_enabled: document.getElementById('c_vodafone_enabled')?.checked !== false,
  };
  await supabase.from('site_settings').update(paySettings).eq('id', 1);

  // Change password if provided
  if (newPass) {
    if (newPass.length < 6) { alert('⚠️ Password must be at least 6 characters'); return; }
    const btn = document.querySelector('#section-settings .btn-admin-primary');
    btn.textContent = '⏳ Changing...';
    btn.disabled = true;
    const { error } = await supabase.auth.updateUser({ password: newPass });
    btn.innerHTML = '<i class="fas fa-save"></i> Save Settings';
    btn.disabled = false;
    if (error) { alert('❌ Error: ' + error.message); return; }
    alert('✅ Settings saved & password changed!');
    document.getElementById('newPassword').value = '';
  } else {
    alert('✅ Settings saved!');
  }
}

// ===== CUSTOMIZE =====
const FONTS = [
  'Tajawal','Cairo','Almarai','Noto Sans Arabic','Amiri',
  'Lateef','Scheherazade New','Reem Kufi','Mada','Changa',
  'Poppins','Roboto','Montserrat','Playfair Display','Raleway',
  'Nunito','Lato','Open Sans','Oswald','Dancing Script'
];

const NAMED_COLORS = {
  'وردي': '#FFB6C1', 'أحمر': '#FF0000', 'أزرق': '#0000FF',
  'أخضر': '#008000', 'أصفر': '#FFD700', 'بنفسجي': '#800080',
  'برتقالي': '#FFA500', 'أسود': '#000000', 'أبيض': '#FFFFFF',
  'رمادي': '#808080', 'بني': '#A52A2A', 'تركواز': '#40E0D0',
  'كحلي': '#000080', 'فوشيا': '#FF1493', 'ذهبي': '#FFD700',
  'pink': '#FFB6C1', 'red': '#FF0000', 'blue': '#0000FF',
  'green': '#008000', 'yellow': '#FFD700', 'purple': '#800080',
  'orange': '#FFA500', 'black': '#000000', 'white': '#FFFFFF',
  'gray': '#808080', 'brown': '#A52A2A', 'teal': '#008080',
  'navy': '#000080', 'gold': '#FFD700', 'silver': '#C0C0C0',
  'beige': '#F5F5DC', 'maroon': '#800020', 'olive': '#808000',
  'turquoise': '#40E0D0', 'fuchsia': '#FF1493', 'lavender': '#C8A2C8',
};

let currentSettings = {};

async function loadCustomizeSettings() {
  const { data } = await supabase.from('site_settings').select('*').eq('id', 1).single();
  if (data) {
    currentSettings = data;
    applySettingsToForm(data);
  }
  await loadPresets();
  renderFontGrid('fontsHeadingGrid', 'c_font_heading', document.getElementById('c_font_heading')?.value || 'Poppins');
  renderFontGrid('fontsBodyGrid', 'c_font_body', document.getElementById('c_font_body')?.value || 'Poppins');
}

function applySettingsToForm(s) {
  if (s.primary_color) { document.getElementById('c_primary').value = s.primary_color; document.getElementById('c_primary_hex').value = s.primary_color; }
  if (s.secondary_color) { document.getElementById('c_secondary').value = s.secondary_color; document.getElementById('c_secondary_hex').value = s.secondary_color; }
  if (s.dark_color) { document.getElementById('c_dark').value = s.dark_color; document.getElementById('c_dark_hex').value = s.dark_color; }
  if (s.bg_color) { document.getElementById('c_bg').value = s.bg_color; document.getElementById('c_bg_hex').value = s.bg_color; }
  if (s.hero_bg) { document.getElementById('c_hero_bg').value = s.hero_bg; document.getElementById('c_hero_bg_hex').value = s.hero_bg; }
  if (s.font_heading) {
    document.getElementById('c_font_heading').value = s.font_heading;
    renderFontGrid('fontsHeadingGrid', 'c_font_heading', s.font_heading);
    const hBox = document.getElementById('headingPreviewBox');
    if (hBox) hBox.style.fontFamily = `'${s.font_heading}', sans-serif`;
  }
  if (s.font_body) {
    document.getElementById('c_font_body').value = s.font_body;
    renderFontGrid('fontsBodyGrid', 'c_font_body', s.font_body);
    const bBox = document.getElementById('bodyPreviewBox');
    if (bBox) bBox.style.fontFamily = `'${s.font_body}', sans-serif`;
  }
  if (s.font_size_heading) { document.getElementById('c_size_heading').value = s.font_size_heading; document.getElementById('sizeHeadingVal').textContent = s.font_size_heading + 'px'; }
  if (s.font_size_base) { document.getElementById('c_size_body').value = s.font_size_base; document.getElementById('sizeBodyVal').textContent = s.font_size_base + 'px'; }
  if (s.font_weight_heading) document.getElementById('c_weight_heading').value = s.font_weight_heading;
  if (s.letter_spacing) { document.getElementById('c_letter_spacing').value = parseFloat(s.letter_spacing); document.getElementById('letterSpacingVal').textContent = s.letter_spacing; }
  if (s.button_radius) { const r = parseInt(s.button_radius); document.getElementById('c_radius').value = r; document.getElementById('radiusVal').textContent = r + 'px'; }
  if (s.site_title) document.getElementById('c_site_title').value = s.site_title;
  if (s.hero_badge) document.getElementById('c_hero_badge').value = s.hero_badge;
  const textFields = ['hero_title','hero_desc','hero_btn1','hero_btn2','features_1_title','features_1_desc','features_2_title','features_2_desc','features_3_title','features_3_desc','features_4_title','features_4_desc','reviews_title','reviews_desc','footer_desc'];
  textFields.forEach(f => {
    const el = document.getElementById(`c_text_${f}`) || document.getElementById(`c_feat${f.replace('features_','').replace('_title','').replace('_desc','')}_${f.includes('title')?'title':'desc'}`);
    const val = s[`text_${f}`];
    if (el && val) el.value = val;
  });
  if (s.instapay_link) document.getElementById('c_instapay').value = s.instapay_link;
  if (s.instapay_account) { const el = document.getElementById('c_instapay_account'); if (el) el.value = s.instapay_account; }
  const ipEnabled = document.getElementById('c_instapay_enabled');
  if (ipEnabled) ipEnabled.checked = s.instapay_enabled !== false;
  if (s.vodafone_link) { const el = document.getElementById('c_vodafone_link'); if (el) el.value = s.vodafone_link; }
  if (s.vodafone_number) { const vf = document.getElementById('c_vodafone'); if (vf) vf.value = s.vodafone_number; }
  const vfEnabled = document.getElementById('c_vodafone_enabled');
  if (vfEnabled) vfEnabled.checked = s.vodafone_enabled !== false;
  // Sections
  ['hero','categories','products','features','about','reviews','contact'].forEach(sec => {
    const el = document.getElementById(`show_${sec}`);
    if (el) el.checked = s[`show_${sec}`] !== 0;
  });
  updateGradientBars();
}

function updateGradientBars() {
  const p = document.getElementById('c_primary').value;
  const s = document.getElementById('c_secondary').value;
  const gp = document.getElementById('grad_primary');
  const gs = document.getElementById('grad_secondary');
  if (gp) gp.style.background = `linear-gradient(to right, #000, ${p}, #fff)`;
  if (gs) gs.style.background = `linear-gradient(to right, #000, ${s}, #fff)`;
}

window.previewColor = function(type, val) {
  const hexMap = { primary: 'c_primary_hex', secondary: 'c_secondary_hex', dark: 'c_dark_hex', bg: 'c_bg_hex', hero_bg: 'c_hero_bg_hex' };
  if (hexMap[type]) document.getElementById(hexMap[type]).value = val;
  updateGradientBars();
  applyLivePreview();
}

window.syncColorFromText = function(type, val) {
  if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
    const pickerMap = { primary: 'c_primary', secondary: 'c_secondary', dark: 'c_dark', bg: 'c_bg', hero_bg: 'c_hero_bg' };
    if (pickerMap[type]) document.getElementById(pickerMap[type]).value = val;
    updateGradientBars();
    applyLivePreview();
  }
}

window.searchNamedColor = function(type, q) {
  if (!q) return;
  const match = NAMED_COLORS[q.trim()];
  if (match) {
    const pickerMap = { primary: 'c_primary', secondary: 'c_secondary' };
    const hexMap = { primary: 'c_primary_hex', secondary: 'c_secondary_hex' };
    if (pickerMap[type]) document.getElementById(pickerMap[type]).value = match;
    if (hexMap[type]) document.getElementById(hexMap[type]).value = match;
    updateGradientBars();
    applyLivePreview();
  }
}

window.applyQuickColor = function(primary, secondary) {
  document.getElementById('c_primary').value = primary;
  document.getElementById('c_primary_hex').value = primary;
  document.getElementById('c_secondary').value = secondary;
  document.getElementById('c_secondary_hex').value = secondary;
  updateGradientBars();
  applyLivePreview();
}

// ===== RANDOM PALETTE GENERATOR =====
window.generateRandomPalette = function() {
  // HSL-based harmonious palette generation
  const hue = Math.floor(Math.random() * 360);
  const analogousHue = (hue + 30 + Math.floor(Math.random() * 20)) % 360;

  // Primary: vivid saturated color
  const primary = hslToHex(hue, 70 + Math.floor(Math.random() * 20), 45 + Math.floor(Math.random() * 15));
  // Secondary: lighter/analogous version
  const secondary = hslToHex(analogousHue, 60 + Math.floor(Math.random() * 20), 60 + Math.floor(Math.random() * 15));
  // Dark: very dark version of primary hue
  const dark = hslToHex(hue, 30 + Math.floor(Math.random() * 20), 10 + Math.floor(Math.random() * 10));
  // Hero bg: very light tint of primary
  const heroBg = hslToHex(hue, 40 + Math.floor(Math.random() * 20), 94 + Math.floor(Math.random() * 4));

  // Apply all colors
  const fields = [
    ['c_primary', 'c_primary_hex', primary],
    ['c_secondary', 'c_secondary_hex', secondary],
    ['c_dark', 'c_dark_hex', dark],
    ['c_hero_bg', 'c_hero_bg_hex', heroBg],
  ];

  fields.forEach(([picker, hex, val]) => {
    const p = document.getElementById(picker);
    const h = document.getElementById(hex);
    if (p) p.value = val;
    if (h) h.value = val;
  });

  updateGradientBars();
  applyLivePreview();

  // Show preview strip
  showPalettePreview(primary, secondary, dark, heroBg);
}

function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function showPalettePreview(p, s, d, bg) {
  let preview = document.getElementById('palettePreview');
  if (!preview) {
    preview = document.createElement('div');
    preview.id = 'palettePreview';
    preview.className = 'palette-preview';
    const card = document.querySelector('#section-customize .customize-card');
    card?.querySelector('h4')?.after(preview);
  }
  preview.innerHTML = `
    <div class="palette-strip">
      <div class="palette-swatch" style="background:${p}" title="أساسي"></div>
      <div class="palette-swatch" style="background:${s}" title="ثانوي"></div>
      <div class="palette-swatch" style="background:${d}" title="داكن"></div>
      <div class="palette-swatch" style="background:${bg};border:1px solid #ddd" title="خلفية"></div>
      <span class="palette-label">✨ تنسيق جديد</span>
    </div>
    <div class="site-mini-preview">
      <div class="mini-navbar" style="background:${d}">
        <div class="mini-logo" style="background:linear-gradient(135deg,${p},${s});-webkit-background-clip:text;-webkit-text-fill-color:transparent">HALOULAA</div>
        <div class="mini-cart" style="color:${p}">🛍</div>
      </div>
      <div class="mini-hero" style="background:${bg}">
        <div class="mini-pill" style="background:linear-gradient(135deg,${p},${s})"></div>
        <div class="mini-title" style="background:${d};border-radius:3px"></div>
        <div class="mini-title short" style="background:${d};opacity:.5;border-radius:3px"></div>
        <div class="mini-btn" style="background:linear-gradient(135deg,${p},${s})"></div>
      </div>
      <div class="mini-products">
        ${[1,2,3].map(() => `
          <div class="mini-card" style="background:#fff;border:1px solid ${p}22">
            <div class="mini-img" style="background:linear-gradient(135deg,${p}33,${s}33)"></div>
            <div class="mini-line" style="background:${d};opacity:.15;border-radius:2px"></div>
            <div class="mini-price" style="color:${p}">EGP</div>
          </div>`).join('')}
      </div>
    </div>
  `;
}

// ===== TYPOGRAPHY SYSTEM =====
const ALL_FONTS = [
  // Arabic
  'Tajawal','Cairo','Almarai','Noto Sans Arabic','Amiri','Reem Kufi','Mada','Changa',
  // English
  'Poppins','Roboto','Montserrat','Playfair Display','Raleway','Nunito','Lato',
  'Open Sans','Oswald','Dancing Script','Inter','DM Sans','Space Grotesk',
  'Bebas Neue','Abril Fatface','Cormorant Garamond','Josefin Sans','Quicksand',
];

const TYPO_PRESETS = {
  modern:  { heading: 'Montserrat',        body: 'Inter',            sizeH: 62, sizeB: 16, weight: '900', spacing: 0 },
  elegant: { heading: 'Playfair Display',  body: 'Lato',             sizeH: 58, sizeB: 16, weight: '700', spacing: 1 },
  arabic:  { heading: 'Cairo',             body: 'Tajawal',          sizeH: 60, sizeB: 17, weight: '900', spacing: 0 },
  minimal: { heading: 'Raleway',           body: 'Open Sans',        sizeH: 56, sizeB: 15, weight: '300', spacing: 3 },
  bold:    { heading: 'Oswald',            body: 'Roboto',           sizeH: 68, sizeB: 16, weight: '700', spacing: 2 },
  classic: { heading: 'Cormorant Garamond',body: 'Lato',             sizeH: 60, sizeB: 16, weight: '600', spacing: 1 },
};

function renderFontGrid(gridId, hiddenId, currentFont) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  grid.innerHTML = ALL_FONTS.map(f => `
    <div class="font-option ${f === currentFont ? 'selected' : ''}"
      style="font-family:'${f}'"
      onclick="selectFontFor('${gridId}','${hiddenId}','${f}')">
      ${f}
    </div>`).join('');
  // Load fonts
  ALL_FONTS.forEach(f => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${f.replace(/ /g,'+')}:wght@300;400;600;700;900&display=swap`;
    document.head.appendChild(link);
  });
}

window.selectFontFor = function(gridId, hiddenId, font) {
  document.getElementById(hiddenId).value = font;
  document.querySelectorAll(`#${gridId} .font-option`).forEach(el => {
    el.classList.toggle('selected', el.textContent.trim() === font);
  });
  // Update preview
  if (gridId === 'fontsHeadingGrid') {
    const box = document.getElementById('headingPreviewBox');
    if (box) box.style.fontFamily = `'${font}', sans-serif`;
  } else {
    const box = document.getElementById('bodyPreviewBox');
    if (box) box.style.fontFamily = `'${font}', sans-serif`;
  }
  applyLivePreview();
}

window.searchFontFor = function(type, q) {
  const gridId = type === 'heading' ? 'fontsHeadingGrid' : 'fontsBodyGrid';
  const hiddenId = type === 'heading' ? 'c_font_heading' : 'c_font_body';
  const current = document.getElementById(hiddenId)?.value || 'Poppins';
  const filtered = q ? ALL_FONTS.filter(f => f.toLowerCase().includes(q.toLowerCase())) : ALL_FONTS;
  const grid = document.getElementById(gridId);
  if (!grid) return;
  grid.innerHTML = filtered.map(f => `
    <div class="font-option ${f === current ? 'selected' : ''}"
      style="font-family:'${f}'"
      onclick="selectFontFor('${gridId}','${hiddenId}','${f}')">
      ${f}
    </div>`).join('');
}

window.previewTypo = function() {
  const sizeH = document.getElementById('c_size_heading')?.value || 62;
  const sizeB = document.getElementById('c_size_body')?.value || 16;
  const weight = document.getElementById('c_weight_heading')?.value || '900';
  const spacing = document.getElementById('c_letter_spacing')?.value || 0;
  document.getElementById('sizeHeadingVal').textContent = sizeH + 'px';
  document.getElementById('sizeBodyVal').textContent = sizeB + 'px';
  document.getElementById('letterSpacingVal').textContent = spacing + 'px';
  const headingBox = document.getElementById('headingPreviewBox');
  if (headingBox) {
    headingBox.style.fontSize = sizeH > 50 ? '24px' : sizeH + 'px';
    headingBox.style.fontWeight = weight;
    headingBox.style.letterSpacing = spacing + 'px';
  }
  applyLivePreview();
}

window.applyTypoPreset = function(preset) {
  const p = TYPO_PRESETS[preset];
  if (!p) return;
  document.getElementById('c_font_heading').value = p.heading;
  document.getElementById('c_font_body').value = p.body;
  document.getElementById('c_size_heading').value = p.sizeH;
  document.getElementById('c_size_body').value = p.sizeB;
  document.getElementById('c_weight_heading').value = p.weight;
  document.getElementById('c_letter_spacing').value = p.spacing;
  renderFontGrid('fontsHeadingGrid', 'c_font_heading', p.heading);
  renderFontGrid('fontsBodyGrid', 'c_font_body', p.body);
  previewTypo();
  const headingBox = document.getElementById('headingPreviewBox');
  const bodyBox = document.getElementById('bodyPreviewBox');
  if (headingBox) headingBox.style.fontFamily = `'${p.heading}', sans-serif`;
  if (bodyBox) bodyBox.style.fontFamily = `'${p.body}', sans-serif`;
}

window.generateRandomTypography = function() {
  const presetKeys = Object.keys(TYPO_PRESETS);
  const random = presetKeys[Math.floor(Math.random() * presetKeys.length)];
  applyTypoPreset(random);
  showTypoToast(random);
}

function showTypoToast(preset) {
  const names = { modern:'Modern ✨', elegant:'Elegant 💎', arabic:'Arabic 🌙', minimal:'Minimal 🤍', bold:'Bold 💪', classic:'Classic 📖' };
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#1a1410;color:#c9a96e;padding:12px 24px;border-radius:20px;font-size:14px;font-weight:700;z-index:9999;border:1px solid #c9a96e;';
  el.textContent = '✨ Applied style ' + (names[preset] || preset);
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

// Fonts (legacy)
function renderFontsGrid(fonts) {
  const grid = document.getElementById('fontsGrid');
  if (!grid) return;
  const current = document.getElementById('c_font')?.value || 'Tajawal';
  grid.innerHTML = fonts.map(f => `
    <div class="font-option ${f === current ? 'selected' : ''}" style="font-family:'${f}'" onclick="selectFont('${f}')">${f}</div>
  `).join('');
}

window.searchFont = function(q) {
  const filtered = FONTS.filter(f => f.toLowerCase().includes(q.toLowerCase()));
  renderFontsGrid(filtered);
}

window.selectFont = function(font) {
  document.getElementById('c_font').value = font;
  renderFontsGrid(FONTS);
  updateFontPreview(font);
  applyLivePreview();
}

function updateFontPreview(font) {
  const preview = document.getElementById('fontPreviewText');
  if (preview) { preview.style.fontFamily = `'${font}'`; }
  // Load font
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${font.replace(/ /g,'+')}&display=swap`;
  document.head.appendChild(link);
}

window.previewRadius = function(val) {
  document.getElementById('radiusVal').textContent = val + 'px';
  applyLivePreview();
}

window.previewText = function() { applyLivePreview(); }

window.previewHeroImg = function(url) {
  const preview = document.getElementById('heroImgPreview');
  const clearBtn = document.getElementById('clearHeroImgBtn');
  if (url) {
    preview.src = url; preview.style.display = 'block';
    if (clearBtn) clearBtn.style.display = 'inline-block';
  } else {
    preview.style.display = 'none';
    if (clearBtn) clearBtn.style.display = 'none';
  }
}

window.uploadHeroImage = async function(input) {
  const file = input.files[0];
  if (!file) return;
  const label = document.getElementById('heroImgLabel');
  label.textContent = '⏳ Uploading...';
  const ext = file.name.split('.').pop();
  const fileName = `hero_${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(fileName, file, { cacheControl: '3600', upsert: false });
  if (error) { label.textContent = '❌ Upload failed'; return; }
  const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
  document.getElementById('c_hero_image').value = urlData.publicUrl;
  previewHeroImg(urlData.publicUrl);
  document.getElementById('clearHeroImgBtn').style.display = 'inline-block';
  label.textContent = '✅ Uploaded!';
  label.style.borderColor = '#2ecc71';
  label.style.color = '#2ecc71';
}

window.previewSection = function(sec, show) {
  // Visual feedback only in admin
}

function applyLivePreview() {
  // Apply to admin preview
  const p = document.getElementById('c_primary')?.value;
  const s = document.getElementById('c_secondary')?.value;
  if (p) document.documentElement.style.setProperty('--pink', p);
  if (s) document.documentElement.style.setProperty('--pink-light', s);
}

// Save
window.saveCustomize = async function() {
  const settings = {
    primary_color: document.getElementById('c_primary').value,
    secondary_color: document.getElementById('c_secondary').value,
    dark_color: document.getElementById('c_dark').value,
    bg_color: document.getElementById('c_bg').value,
    hero_bg: document.getElementById('c_hero_bg').value,
    font_family: document.getElementById('c_font_heading')?.value || 'Poppins',
    font_heading: document.getElementById('c_font_heading')?.value || 'Poppins',
    font_body: document.getElementById('c_font_body')?.value || 'Poppins',
    font_size_heading: parseInt(document.getElementById('c_size_heading')?.value) || 62,
    font_size_base: parseInt(document.getElementById('c_size_body')?.value) || 16,
    font_weight_heading: document.getElementById('c_weight_heading')?.value || '900',
    letter_spacing: (document.getElementById('c_letter_spacing')?.value || '0') + 'px',
    button_radius: document.getElementById('c_radius').value + 'px',
    hero_image: document.getElementById('c_hero_image')?.value || '',
    site_title: document.getElementById('c_site_title').value,
    hero_badge: document.getElementById('c_hero_badge').value,
    text_hero_title: document.getElementById('c_text_hero_title')?.value || '',
    text_hero_desc: document.getElementById('c_text_hero_desc')?.value || '',
    text_hero_btn1: document.getElementById('c_text_hero_btn1')?.value || '',
    text_hero_btn2: document.getElementById('c_text_hero_btn2')?.value || '',
    text_features_1_title: document.getElementById('c_feat1_title')?.value || '',
    text_features_1_desc: document.getElementById('c_feat1_desc')?.value || '',
    text_features_2_title: document.getElementById('c_feat2_title')?.value || '',
    text_features_2_desc: document.getElementById('c_feat2_desc')?.value || '',
    text_features_3_title: document.getElementById('c_feat3_title')?.value || '',
    text_features_3_desc: document.getElementById('c_feat3_desc')?.value || '',
    text_features_4_title: document.getElementById('c_feat4_title')?.value || '',
    text_features_4_desc: document.getElementById('c_feat4_desc')?.value || '',
    text_reviews_title: document.getElementById('c_reviews_title')?.value || '',
    text_reviews_desc: document.getElementById('c_reviews_desc')?.value || '',
    text_footer_desc: document.getElementById('c_footer_desc')?.value || '',
    instapay_link: document.getElementById('c_instapay').value,
    instapay_account: document.getElementById('c_instapay_account')?.value || '',
    instapay_enabled: document.getElementById('c_instapay_enabled')?.checked !== false,
    vodafone_link: document.getElementById('c_vodafone_link')?.value || '',
    vodafone_number: document.getElementById('c_vodafone')?.value || '',
    vodafone_enabled: document.getElementById('c_vodafone_enabled')?.checked !== false,
    show_hero_card: document.getElementById('c_show_hero_card')?.checked !== false ? 1 : 0,
    show_hero: document.getElementById('show_hero').checked ? 1 : 0,
    show_categories: document.getElementById('show_categories').checked ? 1 : 0,
    show_products: document.getElementById('show_products').checked ? 1 : 0,
    show_features: document.getElementById('show_features').checked ? 1 : 0,
    show_about: document.getElementById('show_about').checked ? 1 : 0,
    show_reviews: document.getElementById('show_reviews').checked ? 1 : 0,
    show_contact: document.getElementById('show_contact').checked ? 1 : 0,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase.from('site_settings').update(settings).eq('id', 1);
  if (error) { alert('❌ Error: ' + error.message); return; }
  currentSettings = { ...currentSettings, ...settings };
  alert('✅ Changes saved! They will appear on the site immediately');
}

window.resetCustomize = function() {
  if (!confirm('Reset all settings to default?')) return;
  applySettingsToForm({
    primary_color: '#c9a96e',
    secondary_color: '#e8d5a3',
    dark_color: '#1a1610',
    bg_color: '#0f0d0a',
    hero_bg: '#1a1610',
    font_heading: 'Poppins',
    font_body: 'Poppins',
    font_size_heading: 62,
    font_size_base: 16,
    font_weight_heading: '900',
    letter_spacing: '0px',
    button_radius: '50px',
    site_title: 'HALOULAA',
    hero_badge: '✨ Collection 2026',
    show_hero: 1, show_categories: 1, show_products: 1,
    show_features: 1, show_about: 1, show_reviews: 1, show_contact: 1
  });
}

// Presets
async function loadPresets() {
  const { data } = await supabase.from('theme_presets').select('*').order('created_at', { ascending: false });
  renderPresets(data || []);
}

function renderPresets(presets) {
  const grid = document.getElementById('presetsGrid');
  if (!grid) return;
  if (!presets.length) { grid.innerHTML = '<p style="color:#aaa;font-size:14px">No saved themes yet</p>'; return; }
  grid.innerHTML = presets.map(p => `
    <div class="preset-card">
      <button class="preset-delete" onclick="deletePreset(${p.id},event)"><i class="fas fa-trash"></i></button>
      <div class="preset-colors">
        <div class="preset-color-dot" style="background:${p.primary_color || '#e91e8c'}"></div>
        <div class="preset-color-dot" style="background:${p.secondary_color || '#ff6eb4'}"></div>
        <div class="preset-color-dot" style="background:${p.dark_color || '#1a1a2e'}"></div>
        <div class="preset-color-dot" style="background:${p.bg_color || '#fff'}"></div>
      </div>
      <div class="preset-name">${p.name}</div>
      <div class="preset-font"><i class="fas fa-font"></i> ${p.font_family || 'Tajawal'}</div>
      <div class="preset-date">${new Date(p.created_at).toLocaleDateString('en-GB')}</div>
      <button class="preset-apply" onclick="applyPreset(${p.id})">Apply</button>
    </div>
  `).join('');
}

window.saveAsPreset = async function() {
  const name = prompt('New theme name:');
  if (!name) return;
  const preset = {
    name,
    primary_color: document.getElementById('c_primary').value,
    secondary_color: document.getElementById('c_secondary').value,
    dark_color: document.getElementById('c_dark').value,
    bg_color: document.getElementById('c_bg').value,
    hero_bg: document.getElementById('c_hero_bg').value,
    font_family: document.getElementById('c_font_heading')?.value || 'Poppins',
    button_radius: document.getElementById('c_radius').value + 'px',
  };
  const { error } = await supabase.from('theme_presets').insert([preset]);
  if (error) { alert('❌ Error: ' + error.message); return; }
  alert('✅ Theme saved successfully!');
  await loadPresets();
}

window.applyPreset = async function(id) {
  const { data } = await supabase.from('theme_presets').select('*').eq('id', id).single();
  if (data) applySettingsToForm(data);
}

window.deletePreset = async function(id, e) {
  e.stopPropagation();
  if (!confirm('Delete this theme?')) return;
  await supabase.from('theme_presets').delete().eq('id', id);
  await loadPresets();
}

// ===== ORDERS =====
let allOrders = [];

async function loadOrders() {
  const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
  allOrders = data || [];
  document.getElementById('totalOrders').textContent = allOrders.length;
  renderOrders(allOrders);
}

window.filterOrders = function(status, btn) {
  document.querySelectorAll('#section-orders .order-filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const filtered = status === 'all' ? allOrders : allOrders.filter(o => o.status === status);
  renderOrders(filtered);
}

const ORDER_STATUS_LABELS = {
  awaiting_payment: 'Awaiting Payment',
  pending: 'New ✅',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled'
};
const ORDER_STATUS_COLORS = {
  awaiting_payment: '#f39c12',
  pending: '#3498db',
  processing: '#9b59b6',
  shipped: '#1abc9c',
  delivered: '#2ecc71',
  cancelled: '#e74c3c'
};

function renderOrders(orders) {
  const list = document.getElementById('ordersList');
  if (!orders.length) {
    list.innerHTML = '<div class="orders-empty"><i class="fas fa-shopping-bag"></i><p>No orders yet</p></div>';
    return;
  }
  list.innerHTML = orders.map(o => {
    const items = (() => { try { return JSON.parse(o.items || '[]'); } catch(e) { return []; } })();
    const color = ORDER_STATUS_COLORS[o.status] || '#888';
    const label = ORDER_STATUS_LABELS[o.status] || o.status;
    const waMsg = `🛍️ *Order #${o.id} - HALOULAA*\n\n👤 ${o.customer_name}\n📞 ${o.customer_phone}\n📍 ${o.customer_address}\n\n${items.map(i=>`• ${i.name} (${i.size}) ×${i.qty} = ${i.price*i.qty} EGP`).join('\n')}\n\n💰 *Total: ${o.total?.toLocaleString()} EGP*`;
    return `
    <div class="order-card" id="order-${o.id}" style="border-right:4px solid ${color}">
      <div class="order-head">
        <div>
          <strong style="font-size:15px">Order #${o.id}</strong>
          <div class="order-date">${new Date(o.created_at).toLocaleString('en-GB')}</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <select class="order-status-sel" onchange="updateOrderStatus(${o.id},this.value)" style="border-color:${color}">
            ${Object.entries(ORDER_STATUS_LABELS).map(([v,l])=>`<option value="${v}" ${o.status===v?'selected':''}>${l}</option>`).join('')}
          </select>
          <span class="order-status" style="background:${color}20;color:${color};border:1px solid ${color}">${label}</span>
        </div>
      </div>
      <div class="order-customer">
        <div class="order-customer-item"><i class="fas fa-user"></i> ${o.customer_name}</div>
        <div class="order-customer-item"><i class="fas fa-phone"></i> ${o.customer_phone}</div>
        <div class="order-customer-item"><i class="fas fa-map-marker-alt"></i> ${o.customer_address}</div>
        ${o.notes ? `<div class="order-customer-item"><i class="fas fa-sticky-note"></i> ${o.notes}</div>` : ''}
      </div>
      <div class="order-items-list">
        ${items.map(i=>`
          <div class="order-item-row">
            ${i.image ? `<img src="${i.image}" onerror="this.style.display='none'"/>` : ''}
            <span>${i.name} (${i.size}) ×${i.qty}</span>
            <span style="color:var(--pink);font-weight:700">${(i.price*i.qty).toLocaleString()} EGP</span>
          </div>`).join('')}
      </div>
      <div class="order-total-row">
        <strong>Total</strong>
        <strong style="color:var(--pink);font-size:17px">${o.total?.toLocaleString()} EGP</strong>
      </div>
      ${o.discount_code ? `
      <div style="background:rgba(46,204,113,.08);border:1px solid rgba(46,204,113,.2);border-radius:8px;padding:8px 12px;margin-bottom:12px;font-size:13px;display:flex;justify-content:space-between">
        <span style="color:#2ecc71">🏷️ Discount: ${o.discount_code}</span>
        <span style="color:#2ecc71">-${o.discount_amount?.toLocaleString()} EGP</span>
      </div>` : ''}
      <div class="order-actions">
        <a class="btn-wa-reply" href="https://wa.me/${o.customer_phone?.replace(/\D/g,'')}?text=${encodeURIComponent(waMsg)}" target="_blank">
          <i class="fab fa-whatsapp"></i> WhatsApp
        </a>
        <a class="btn-wa-reply" style="background:#0088cc" href="tel:${o.customer_phone}">
          <i class="fas fa-phone"></i> Call
        </a>
        <button class="btn-delete" onclick="deleteOrder(${o.id})"><i class="fas fa-trash"></i></button>
      </div>
      <div style="margin-top:12px">
        <textarea id="reply-${o.id}" placeholder="Admin reply to customer..." style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-family:'Tajawal',sans-serif;font-size:13px;resize:vertical;min-height:60px">${o.admin_reply||''}</textarea>
        <button class="btn-admin-primary small" style="margin-top:6px" onclick="saveAdminReply(${o.id})">
          <i class="fas fa-save"></i> Save Reply
        </button>
      </div>
    </div>`;
  }).join('');
}

window.saveAdminReply = async function(id) {
  const reply = document.getElementById(`reply-${id}`)?.value.trim() || '';
  const { error } = await supabase.from('orders').update({ admin_reply: reply }).eq('id', id);
  if (error) { alert('❌ Error: ' + error.message); return; }
  const o = allOrders.find(x => x.id === id);
  if (o) o.admin_reply = reply;
  showAdminToast('✅ Reply saved!');
}

function showAdminToast(msg) {
  const t = document.createElement('div');
  t.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#1a1410;color:#c9a96e;padding:12px 24px;border-radius:20px;font-size:14px;font-weight:700;z-index:9999;border:1px solid #c9a96e;';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

window.updateOrderStatus = async function(id, status) {
  await supabase.from('orders').update({ status }).eq('id', id);
  const o = allOrders.find(x => x.id === id);
  if (o) o.status = status;
  // Re-render just that card's border color
  const card = document.getElementById(`order-${id}`);
  if (card) {
    const color = ORDER_STATUS_COLORS[status] || '#888';
    card.style.borderRightColor = color;
    const badge = card.querySelector('.order-status');
    if (badge) { badge.style.background = color+'20'; badge.style.color = color; badge.style.borderColor = color; badge.textContent = ORDER_STATUS_LABELS[status] || status; }
    const sel = card.querySelector('.order-status-sel');
    if (sel) sel.style.borderColor = color;
  }
}

window.deleteOrder = async function(id) {
  if (!confirm('Delete this order?')) return;
  await supabase.from('orders').delete().eq('id', id);
  allOrders = allOrders.filter(o => o.id !== id);
  renderOrders(allOrders);
  document.getElementById('totalOrders').textContent = allOrders.length;
}

// ===== REVIEWS ADMIN =====
let allReviews = [];

async function loadReviews() {
  const { data } = await supabase.from('reviews').select('*').order('created_at', { ascending: false });
  allReviews = data || [];
  renderReviews(allReviews);
}

window.filterReviews = function(status, btn) {
  document.querySelectorAll('.order-filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const filtered = status === 'all' ? allReviews : allReviews.filter(r => r.status === status);
  renderReviews(filtered);
}

function renderReviews(reviews) {
  const list = document.getElementById('reviewsList');
  if (!reviews.length) {
    list.innerHTML = '<div class="orders-empty"><i class="fas fa-star"></i><p>No reviews yet</p></div>';
    return;
  }
  list.innerHTML = reviews.map(r => `
    <div class="order-card ${r.status}" id="review-${r.id}" style="border-right-color:${r.status==='approved'?'#2ecc71':r.status==='rejected'?'#e74c3c':'#f39c12'}">
      <div class="order-head">
        <div>
          <div style="font-size:18px;color:var(--pink)">${'★'.repeat(r.rating||5)}${'☆'.repeat(5-(r.rating||5))}</div>
          <div class="order-date">${new Date(r.created_at).toLocaleString('en-GB')}</div>
        </div>
        <span class="order-status status-${r.status||'pending'}">${(r.status||'pending').toUpperCase()}</span>
      </div>
      <div class="order-customer">
        <div class="order-customer-item"><i class="fas fa-user"></i> ${r.customer_name}</div>
        ${r.customer_phone ? `<div class="order-customer-item"><i class="fas fa-phone"></i> ${r.customer_phone}</div>` : ''}
        ${r.product_name ? `<div class="order-customer-item"><i class="fas fa-tshirt"></i> ${r.product_name}</div>` : ''}
      </div>
      <div style="background:#f8f8f8;border-radius:10px;padding:14px;margin-bottom:14px;font-size:14px;color:#333;line-height:1.6">
        "${r.comment}"
      </div>
      <div class="order-actions">
        <button class="btn-wa-reply" style="background:#2ecc71" onclick="updateReviewStatus(${r.id},'approved')">
          <i class="fas fa-check"></i> Approve
        </button>
        <button class="btn-wa-reply" style="background:#e74c3c" onclick="updateReviewStatus(${r.id},'rejected')">
          <i class="fas fa-times"></i> Reject
        </button>
        <button class="btn-delete" onclick="deleteReview(${r.id})"><i class="fas fa-trash"></i></button>
      </div>
    </div>`).join('');
}

window.updateReviewStatus = async function(id, status) {
  await supabase.from('reviews').update({ status }).eq('id', id);
  const r = allReviews.find(x => x.id === id);
  if (r) r.status = status;
  renderReviews(allReviews);
}

window.deleteReview = async function(id) {
  if (!confirm('Delete this review?')) return;
  await supabase.from('reviews').delete().eq('id', id);
  allReviews = allReviews.filter(r => r.id !== id);
  renderReviews(allReviews);
}
