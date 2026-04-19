// ===== SUPABASE CLIENT =====
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== FETCH PRODUCTS FROM SUPABASE =====
async function fetchProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching products:', error);
    return [];
  }
  return data || [];
}

// ===== UPLOAD IMAGE TO SUPABASE STORAGE =====
async function uploadImage(file) {
  const ext = file.name.split('.').pop();
  const fileName = `product_${Date.now()}.${ext}`;

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(fileName, file, { cacheControl: '3600', upsert: false });

  if (error) {
    console.error('Upload error:', error);
    return null;
  }

  const { data: urlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}

// ===== ADD PRODUCT =====
async function addProduct(product) {
  const { data, error } = await supabase.from('products').insert([product]).select();
  if (error) { console.error('Insert error:', error); return null; }
  return data[0];
}

// ===== UPDATE PRODUCT =====
async function updateProduct(id, product) {
  const { data, error } = await supabase.from('products').update(product).eq('id', id).select();
  if (error) { console.error('Update error:', error); return null; }
  return data[0];
}

// ===== DELETE PRODUCT =====
async function deleteProductFromDB(id) {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) { console.error('Delete error:', error); return false; }
  return true;
}

export { supabase, fetchProducts, uploadImage, addProduct, updateProduct, deleteProductFromDB };
