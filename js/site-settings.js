// ===== LOAD & APPLY SITE SETTINGS FROM SUPABASE =====
(async function() {
  try {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
    const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data } = await sb.from('site_settings').select('*').eq('id', 1).single();
    if (!data) return;

    const root = document.documentElement;

    // ===== Hero Image =====
    if (data.hero_image) {
      const heroImg = document.querySelector('.hero-card img');
      if (heroImg) heroImg.src = data.hero_image;
    }

    // ===== Hero Badge =====
    if (data.hero_badge) {
      const pill = document.querySelector('.hero-pill');
      if (pill) pill.textContent = data.hero_badge;
    }

    // ===== Colors =====
    if (data.primary_color) {
      root.style.setProperty('--gold', data.primary_color);
      root.style.setProperty('--gradient', `linear-gradient(135deg, ${data.primary_color}, ${data.secondary_color || '#e8d5a3'})`);
    }
    if (data.secondary_color) root.style.setProperty('--gold-light', data.secondary_color);
    if (data.dark_color) {
      root.style.setProperty('--card', data.dark_color);
      root.style.setProperty('--card2', data.dark_color);
    }
    if (data.bg_color) root.style.setProperty('--bg', data.bg_color);
    if (data.button_radius) {
      root.style.setProperty('--btn-radius', data.button_radius);
      document.querySelectorAll('.btn').forEach(b => b.style.borderRadius = data.button_radius);
    }

    // ===== Font =====
    if (data.font_family) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${data.font_family.replace(/ /g,'+')}:wght@300;400;500;700;900&display=swap`;
      document.head.appendChild(link);
      document.body.style.fontFamily = `'${data.font_family}', sans-serif`;
    }

    // ===== Site Title =====
    if (data.site_title) {
      document.querySelectorAll('.nav-logo-text, .sidebar-brand, .footer-name').forEach(el => el.textContent = data.site_title);
      document.title = `${data.site_title} — Fashion Designer`;
    }

    // ===== Subtitle =====
    if (data.site_subtitle) {
      const sub = data.site_subtitle === 'مصممة أزياء' || data.site_subtitle === 'مصمم أزياء' ? 'Fashion Designer' : data.site_subtitle;
      document.querySelectorAll('.sidebar-tagline').forEach(el => el.textContent = sub);
    }

    // ===== Payment Methods (dynamic) =====
    window._paySettings = {
      instapay_link: data.instapay_link || '',
      instapay_account: data.instapay_account || '',
      instapay_enabled: data.instapay_enabled !== false,
      vodafone_link: data.vodafone_link || '',
      vodafone_number: data.vodafone_number || '',
      vodafone_enabled: data.vodafone_enabled !== false,
    };
    renderPaymentMethods();

    // ===== Show/Hide Sections =====
    const sectionMap = { hero: 'home', shop: 'shop', features: null, reviews: 'reviews' };
    ['hero','shop','features','reviews'].forEach(sec => {
      if (data[`show_${sec}`] === 0) {
        const id = sectionMap[sec] || sec;
        const el = document.getElementById(id) || document.querySelector(`.${sec}`);
        if (el) el.style.display = 'none';
      }
    });

  } catch(e) { console.log('Settings load skipped:', e.message); }
})();
