// ===== IMPORTS =====
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://cxvesachmhwxvubzuejb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4dmVzYWNobWh3eHZ1Ynp1ZWpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNzA4MTMsImV4cCI6MjA5MTk0NjgxM30.mniUJBLfYmurefDTGqy4J8PSrmyHjqb6JUTf2pEpV-Y';
const STORAGE_BUCKET = 'HALUOLAA';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== STATE =====
let adminProducts = [];
let adminDiscounts = JSON.parse(localStorage.getItem('haloula_discounts') || '[]');
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

  if (!email || !pass) { errEl.textContent = '⚠️ أدخل الإيميل وكلمة المرور'; return; }

  btn.textContent = '⏳ جاري الدخول...';
  btn.disabled = true;
  errEl.textContent = '';

  const { error } = await supabase.auth.signInWithPassword({ email, password: pass });

  btn.textContent = 'دخول';
  btn.disabled = false;

  if (error) {
    errEl.textContent = '❌ إيميل أو كلمة مرور غلط';
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
  await loadProducts();
  await loadOrders();
  renderDiscounts();
  initColorsPicker();
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
  document.getElementById(`section-${name}`).classList.remove('d-none');
  event.currentTarget.classList.add('active');
  const titles = { overview:'نظرة عامة', products:'المنتجات', 'add-product':'إضافة منتج', discounts:'الخصومات', orders:'الطلبات', 'reviews-admin':'التقييمات', settings:'الإعدادات', customize:'تخصيص الموقع', 'categories-admin':'الأقسام' };
  document.getElementById('sectionTitle').textContent = titles[name] || name;
  if (name === 'customize') loadCustomizeSettings();
  if (name === 'orders') loadOrders();
  if (name === 'reviews-admin') loadReviews();
  if (name === 'categories-admin') loadAdminCategories();
  // Close mobile sidebar only on small screens
  if (window.innerWidth <= 900) closeMobSidebar();
}

// ===== RECENT PRODUCTS =====
function renderRecentProducts() {
  const list = document.getElementById('recentProductsList');
  list.innerHTML = adminProducts.slice(0,5).map(p => `
    <div class="recent-product-row">
      <img src="${p.image_url || ''}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/50'"/>
      <div class="rp-name">${p.name}</div>
      <span class="rp-cat">${p.category || ''}</span>
      <div class="rp-price">${p.price} ج.م</div>
    </div>
  `).join('');
}

// ===== PRODUCTS TABLE =====
function renderAdminTable(list) {
  const tbody = document.getElementById('adminProductsTable');
  tbody.innerHTML = list.map((p, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><img src="${p.image_url || ''}" alt="${p.name}" style="cursor:zoom-in" onclick="openLightboxAdmin('${p.image_url}')" onerror="this.src='https://via.placeholder.com/55'"/></td>
      <td><strong>${p.name}</strong></td>
      <td><span class="table-badge badge-pink">${p.category || ''}</span></td>
      <td><strong style="color:#e91e8c">${p.price} ج.م</strong>${p.old_price ? `<br/><small style="text-decoration:line-through;color:#aaa">${p.old_price}</small>` : ''}</td>
      <td style="font-size:13px">${p.sizes || ''}</td>
      <td>
        <div class="table-actions">
          <button class="btn-edit" onclick="editProduct(${p.id})"><i class="fas fa-edit"></i> تعديل</button>
          <button class="btn-delete" onclick="deleteProduct(${p.id})"><i class="fas fa-trash"></i> حذف</button>
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
  uploadLabel.textContent = '⏳ جاري الرفع...';
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
    uploadLabel.textContent = '❌ فشل الرفع — جربي تاني';
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

  setTimeout(() => { progressWrap.style.display = 'none'; }, 800);
  uploadLabel.textContent = '✅ تم الرفع بنجاح!';
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
    alert('⚠️ اكمل الحقول المطلوبة: الاسم، القسم، السعر، الصورة');
    return;
  }

  const product = { name: name_en, name_en, category, price, image_url, description, sizes, colors, badge };
  const saveBtn = document.querySelector('.form-actions .btn-admin-primary');
  saveBtn.textContent = '⏳ جاري الحفظ...';

  if (editingId) {
    const { error } = await supabase.from('products').update(product).eq('id', editingId);
    if (error) { alert('❌ خطأ: ' + error.message); saveBtn.innerHTML = '<i class="fas fa-save"></i> حفظ المنتج'; return; }
    alert('✅ تم تعديل المنتج!');
  } else {
    const { error } = await supabase.from('products').insert([product]);
    if (error) { alert('❌ خطأ: ' + error.message); saveBtn.innerHTML = '<i class="fas fa-save"></i> حفظ المنتج'; return; }
    alert('✅ تمت إضافة المنتج!');
  }

  saveBtn.innerHTML = '<i class="fas fa-save"></i> حفظ المنتج';
  clearProductForm();
  await loadProducts();
}

window.editProduct = function(id) {
  const p = adminProducts.find(pr => pr.id == id);
  if (!p) return;
  editingId = id;
  document.getElementById('formTitle').textContent = '✏️ تعديل المنتج';
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
  document.getElementById('sectionTitle').textContent = 'تعديل منتج';
}

window.deleteProduct = async function(id) {
  if (!confirm('هل أنتِ متأكدة من حذف هذا المنتج؟')) return;
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) { alert('❌ خطأ: ' + error.message); return; }
  alert('🗑️ تم الحذف');
  await loadProducts();
}

window.clearProductForm = function() {
  editingId = null;
  document.getElementById('formTitle').textContent = '➕ إضافة منتج جديد';
  ['pNameEn','pCategory','pPrice','pImage','pDescription','pBadge'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  setSizesFromValue('');
  setColorNamesFromValue('');
  const preview = document.getElementById('imagePreview');
  if (preview) { preview.src = ''; preview.style.display = 'none'; }
  const uploadLabel = document.getElementById('uploadLabel');
  if (uploadLabel) { uploadLabel.textContent = '📸 اختاري صورة أو ارفعي من جهازك'; uploadLabel.style.borderColor = ''; uploadLabel.style.color = ''; }
}

// ===== DISCOUNTS =====
window.addDiscount = function() {
  const code = document.getElementById('dCode').value.trim().toUpperCase();
  const percent = parseInt(document.getElementById('dPercent').value);
  const expiry = document.getElementById('dExpiry').value;
  if (!code || !percent) { alert('⚠️ اكملي كود الخصم والنسبة'); return; }
  adminDiscounts.push({ code, percent, expiry, id: Date.now() });
  localStorage.setItem('haloula_discounts', JSON.stringify(adminDiscounts));
  document.getElementById('dCode').value = '';
  document.getElementById('dPercent').value = '';
  document.getElementById('dExpiry').value = '';
  renderDiscounts();
  document.getElementById('totalDiscounts').textContent = adminDiscounts.length;
}

function renderDiscounts() {
  const list = document.getElementById('discountsList');
  if (!adminDiscounts.length) { list.innerHTML = '<p style="color:#888;text-align:center;padding:20px">لا توجد خصومات حالياً</p>'; return; }
  list.innerHTML = adminDiscounts.map(d => `
    <div class="discount-card">
      <div>
        <div class="discount-code">${d.code}</div>
        <div class="discount-info">${d.expiry ? `تنتهي: ${d.expiry}` : 'بدون تاريخ انتهاء'}</div>
      </div>
      <div class="discount-percent">${d.percent}% خصم</div>
      <button class="btn-delete" onclick="deleteDiscount(${d.id})"><i class="fas fa-trash"></i></button>
    </div>
  `).join('');
}

window.deleteDiscount = function(id) {
  adminDiscounts = adminDiscounts.filter(d => d.id !== id);
  localStorage.setItem('haloula_discounts', JSON.stringify(adminDiscounts));
  renderDiscounts();
  document.getElementById('totalDiscounts').textContent = adminDiscounts.length;
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
    : '<span style="color:#aaa;font-size:13px">لم يتم إضافة ألوان بعد</span>';
}

function setColorNamesFromValue(val) {
  selectedColorNames = val ? val.split(',').map(c => c.trim()).filter(Boolean) : [];
  updateColorNamesInput();
  renderColorNameTags();
}

// ===== COLORS PICKER (legacy - kept for compatibility) =====
const PRESET_COLORS = [
  { name: 'أبيض', hex: '#FFFFFF' }, { name: 'أسود', hex: '#000000' },
  { name: 'رمادي', hex: '#808080' }, { name: 'رمادي فاتح', hex: '#D3D3D3' },
  { name: 'وردي', hex: '#FFB6C1' }, { name: 'وردي غامق', hex: '#FF69B4' },
  { name: 'فوشيا', hex: '#FF1493' }, { name: 'أحمر', hex: '#FF0000' },
  { name: 'برتقالي', hex: '#FFA500' }, { name: 'أصفر', hex: '#FFD700' },
  { name: 'أخضر فاتح', hex: '#90EE90' }, { name: 'أخضر', hex: '#008000' },
  { name: 'أزرق فاتح', hex: '#87CEEB' }, { name: 'أزرق', hex: '#0000FF' },
  { name: 'كحلي', hex: '#000080' }, { name: 'بنفسجي', hex: '#800080' },
  { name: 'ليلكي', hex: '#C8A2C8' }, { name: 'بيج', hex: '#F5F5DC' },
  { name: 'كريمي', hex: '#FFFDD0' }, { name: 'بني', hex: '#A52A2A' },
  { name: 'كاكي', hex: '#C3B091' }, { name: 'زيتي', hex: '#808000' },
  { name: 'تركواز', hex: '#40E0D0' }, { name: 'نعناعي', hex: '#98FF98' },
  { name: 'خمري', hex: '#800020' }, { name: 'ذهبي', hex: '#FFD700' },
  { name: 'فضي', hex: '#C0C0C0' }, { name: 'سالمون', hex: '#FA8072' },
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
  if (!selectedColors.length) { wrap.innerHTML = '<span style="color:#aaa;font-size:13px">لم يتم اختيار ألوان بعد</span>'; return; }
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
    list.innerHTML = '<p style="text-align:center;color:#aaa;padding:20px">لا توجد أقسام</p>';
    return;
  }
  list.innerHTML = `
    <table class="admin-table">
      <thead><tr><th>الأيقونة</th><th>الاسم (EN)</th><th>الاسم (AR)</th><th>الترتيب</th><th>الحالة</th><th>إجراء</th></tr></thead>
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
                <span style="font-size:13px;color:${c.is_active ? '#2ecc71' : '#aaa'}">${c.is_active ? 'ظاهر' : 'مخفي'}</span>
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
  if (!nameEn || !nameAr) { alert('⚠️ أدخل اسم القسم بالعربي والإنجليزي'); return; }
  const { error } = await supabase.from('categories').insert([{ name_en: nameEn, name_ar: nameAr, icon, sort_order: order }]);
  if (error) { alert('❌ خطأ: ' + error.message); return; }
  document.getElementById('catNameEn').value = '';
  document.getElementById('catNameAr').value = '';
  document.getElementById('catOrder').value = '';
  await loadAdminCategories();
  alert('✅ تم إضافة القسم!');
}

window.toggleCategory = async function(id, active) {
  await supabase.from('categories').update({ is_active: active }).eq('id', id);
  const cat = adminCategories.find(c => c.id === id);
  if (cat) cat.is_active = active;
  renderAdminCategories();
}

window.deleteCategory = async function(id) {
  if (!confirm('حذف هذا القسم؟')) return;
  await supabase.from('categories').delete().eq('id', id);
  adminCategories = adminCategories.filter(c => c.id !== id);
  renderAdminCategories();
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
  if (!newPass) { alert('⚠️ أدخل كلمة المرور الجديدة'); return; }
  if (newPass.length < 6) { alert('⚠️ كلمة المرور لازم تكون 6 أحرف على الأقل'); return; }

  const btn = document.querySelector('#section-settings .btn-admin-primary');
  btn.textContent = '⏳ جاري التغيير...';
  btn.disabled = true;

  const { error } = await supabase.auth.updateUser({ password: newPass });

  btn.innerHTML = '<i class="fas fa-save"></i> حفظ الإعدادات';
  btn.disabled = false;

  if (error) {
    alert('❌ خطأ: ' + error.message);
    return;
  }

  alert('✅ تم تغيير كلمة المرور بنجاح!');
  document.getElementById('newPassword').value = '';
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
  el.textContent = '✨ تم تطبيق نمط ' + (names[preset] || preset);
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
  if (url) { preview.src = url; preview.style.display = 'block'; }
}

window.uploadHeroImage = async function(input) {
  const file = input.files[0];
  if (!file) return;
  const label = document.getElementById('heroImgLabel');
  label.textContent = '⏳ جاري الرفع...';
  const ext = file.name.split('.').pop();
  const fileName = `hero_${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(fileName, file, { cacheControl: '3600', upsert: false });
  if (error) { label.textContent = '❌ فشل الرفع'; return; }
  const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
  document.getElementById('c_hero_image').value = urlData.publicUrl;
  previewHeroImg(urlData.publicUrl);
  label.textContent = '✅ تم الرفع!';
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
    instapay_link: document.getElementById('c_instapay').value,
    instapay_account: document.getElementById('c_instapay_account')?.value || '',
    instapay_enabled: document.getElementById('c_instapay_enabled')?.checked !== false,
    vodafone_link: document.getElementById('c_vodafone_link')?.value || '',
    vodafone_number: document.getElementById('c_vodafone')?.value || '',
    vodafone_enabled: document.getElementById('c_vodafone_enabled')?.checked !== false,
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
  if (error) { alert('❌ خطأ: ' + error.message); return; }
  currentSettings = { ...currentSettings, ...settings };
  alert('✅ تم حفظ التغييرات! ستظهر على الموقع فوراً');
}

window.resetCustomize = function() {
  if (!confirm('هل تريد إعادة تعيين كل الإعدادات للافتراضي؟')) return;
  applySettingsToForm({
    primary_color: '#e91e8c', secondary_color: '#ff6eb4',
    dark_color: '#1a1a2e', bg_color: '#ffffff', hero_bg: '#fff0f7',
    font_family: 'Tajawal', button_radius: '50px',
    site_title: 'HALOULAA', site_subtitle: 'مصممة أزياء',
    hero_badge: '✨ كولكشن 2026',
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
  if (!presets.length) { grid.innerHTML = '<p style="color:#aaa;font-size:14px">لا توجد ثيمات محفوظة بعد</p>'; return; }
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
      <div class="preset-date">${new Date(p.created_at).toLocaleDateString('ar-EG')}</div>
      <button class="preset-apply" onclick="applyPreset(${p.id})">تطبيق</button>
    </div>
  `).join('');
}

window.saveAsPreset = async function() {
  const name = prompt('اسم الثيم الجديد:');
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
  if (error) { alert('❌ خطأ: ' + error.message); return; }
  alert('✅ تم حفظ الثيم!');
  await loadPresets();
}

window.applyPreset = async function(id) {
  const { data } = await supabase.from('theme_presets').select('*').eq('id', id).single();
  if (data) applySettingsToForm(data);
}

window.deletePreset = async function(id, e) {
  e.stopPropagation();
  if (!confirm('حذف هذا الثيم؟')) return;
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
  awaiting_payment: 'في انتظار الدفع',
  pending: 'جديد ✅',
  processing: 'قيد التجهيز',
  shipped: 'تم الشحن',
  delivered: 'تم التسليم',
  cancelled: 'ملغي'
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
    list.innerHTML = '<div class="orders-empty"><i class="fas fa-shopping-bag"></i><p>لا توجد طلبات</p></div>';
    return;
  }
  list.innerHTML = orders.map(o => {
    const items = (() => { try { return JSON.parse(o.items || '[]'); } catch(e) { return []; } })();
    const color = ORDER_STATUS_COLORS[o.status] || '#888';
    const label = ORDER_STATUS_LABELS[o.status] || o.status;
    const waMsg = `🛍️ *طلب #${o.id} - HALOULAA*\n\n👤 ${o.customer_name}\n📞 ${o.customer_phone}\n📍 ${o.customer_address}\n\n${items.map(i=>`• ${i.name} (${i.size}) ×${i.qty} = ${i.price*i.qty} EGP`).join('\n')}\n\n💰 *الإجمالي: ${o.total?.toLocaleString()} EGP*`;
    return `
    <div class="order-card" id="order-${o.id}" style="border-right:4px solid ${color}">
      <div class="order-head">
        <div>
          <strong style="font-size:15px">طلب #${o.id}</strong>
          <div class="order-date">${new Date(o.created_at).toLocaleString('ar-EG')}</div>
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
        <strong>الإجمالي</strong>
        <strong style="color:var(--pink);font-size:17px">${o.total?.toLocaleString()} EGP</strong>
      </div>
      <div class="order-actions">
        <a class="btn-wa-reply" href="https://wa.me/${o.customer_phone?.replace(/\D/g,'')}?text=${encodeURIComponent(waMsg)}" target="_blank">
          <i class="fab fa-whatsapp"></i> واتساب
        </a>
        <a class="btn-wa-reply" style="background:#0088cc" href="tel:${o.customer_phone}" >
          <i class="fas fa-phone"></i> اتصال
        </a>
        <button class="btn-delete" onclick="deleteOrder(${o.id})"><i class="fas fa-trash"></i></button>
      </div>
    </div>`;
  }).join('');
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
  if (!confirm('حذف هذا الطلب؟')) return;
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
