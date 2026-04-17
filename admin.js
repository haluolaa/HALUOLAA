// ===== IMPORTS =====
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://cxvesachmhwxvubzuejb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_VwbFeaMWiiZnTGzrg7N-Qg_BrAUGbEf';
const STORAGE_BUCKET = 'HALUOLAA';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== STATE =====
const ADMIN_PASSWORD = 'haloula2025';
let adminProducts = [];
let adminDiscounts = JSON.parse(localStorage.getItem('haloula_discounts') || '[]');
let editingId = null;

// ===== LOGIN =====
document.getElementById('adminPass').addEventListener('keydown', e => {
  if (e.key === 'Enter') adminLogin();
});

window.adminLogin = async function() {
  const pass = document.getElementById('adminPass').value;
  const savedPass = localStorage.getItem('haloula_admin_pass') || ADMIN_PASSWORD;
  if (pass === savedPass) {
    document.getElementById('loginScreen').classList.add('d-none');
    document.getElementById('dashboard').classList.remove('d-none');
    await loadDashboard();
  } else {
    document.getElementById('loginError').textContent = '❌ كلمة مرور خاطئة';
    document.getElementById('adminPass').style.borderColor = '#ff4757';
  }
}

window.adminLogout = function() {
  document.getElementById('dashboard').classList.add('d-none');
  document.getElementById('loginScreen').classList.remove('d-none');
  document.getElementById('adminPass').value = '';
  document.getElementById('loginError').textContent = '';
}

// ===== LOAD DASHBOARD =====
async function loadDashboard() {
  await loadProducts();
  renderDiscounts();
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
  const titles = { overview:'نظرة عامة', products:'المنتجات', 'add-product':'إضافة منتج', discounts:'الخصومات', orders:'الطلبات', settings:'الإعدادات' };
  document.getElementById('sectionTitle').textContent = titles[name] || name;
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
      <td><img src="${p.image_url || ''}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/55'"/></td>
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
  const name = document.getElementById('pName').value.trim();
  const category = document.getElementById('pCategory').value;
  const price = parseInt(document.getElementById('pPrice').value);
  const old_price = parseInt(document.getElementById('pOldPrice').value) || null;
  const image_url = document.getElementById('pImage').value.trim();
  const description = document.getElementById('pDescription').value.trim();
  const sizes = document.getElementById('pSizes').value.trim();
  const colors = document.getElementById('pColors').value.trim();
  const badge = document.getElementById('pBadge').value || null;

  if (!name || !category || !price || !image_url) {
    alert('⚠️ اكملي الحقول المطلوبة: الاسم، القسم، السعر، الصورة');
    return;
  }

  const product = { name, category, price, old_price, image_url, description, sizes, colors, badge };
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
  document.getElementById('pName').value = p.name || '';
  document.getElementById('pCategory').value = p.category || '';
  document.getElementById('pPrice').value = p.price || '';
  document.getElementById('pOldPrice').value = p.old_price || '';
  document.getElementById('pImage').value = p.image_url || '';
  document.getElementById('pDescription').value = p.description || '';
  document.getElementById('pSizes').value = p.sizes || '';
  document.getElementById('pColors').value = p.colors || '';
  document.getElementById('pBadge').value = p.badge || '';
  const preview = document.getElementById('imagePreview');
  if (p.image_url) { preview.src = p.image_url; preview.style.display = 'block'; }
  // Navigate to form
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
  ['pName','pCategory','pPrice','pOldPrice','pImage','pDescription','pSizes','pColors','pBadge'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const preview = document.getElementById('imagePreview');
  if (preview) { preview.src = ''; preview.style.display = 'none'; }
  const uploadLabel = document.getElementById('uploadLabel');
  if (uploadLabel) uploadLabel.textContent = '📸 اختاري صورة أو ارفعي من جهازك';
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

// ===== SETTINGS =====
window.saveSettings = function() {
  const newPass = document.getElementById('newPassword').value.trim();
  if (newPass) { localStorage.setItem('haloula_admin_pass', newPass); }
  alert('✅ تم حفظ الإعدادات!');
  document.getElementById('newPassword').value = '';
}
