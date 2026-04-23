// ===== LOAD & APPLY SITE SETTINGS FROM SUPABASE =====
(async function() {
  try {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
    const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data } = await sb.from('site_settings').select('*').eq('id', 1).single();
    if (!data) return;

    const root = document.documentElement;

    // ===== Hero Card Visibility =====
    if (data.show_hero_card === 0) {
      const heroVisual = document.querySelector('.hero-visual');
      if (heroVisual) heroVisual.style.display = 'none';
    }

    // ===== Hero Image =====
    if (data.hero_image) {
      const heroImg = document.querySelector('.hero-card img');
      if (heroImg) {
        heroImg.src = data.hero_image;
        heroImg.style.display = 'block';
      }
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
    const fontHeading = data.font_heading || data.font_family || 'Poppins';
    const fontBody = data.font_body || data.font_family || 'Poppins';

    // Load fonts
    [fontHeading, fontBody].filter((f,i,a) => a.indexOf(f) === i).forEach(font => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${font.replace(/ /g,'+')}:wght@300;400;600;700;900&display=swap`;
      document.head.appendChild(link);
    });

    // Apply heading font to h1, h2, h3
    const headingStyle = document.createElement('style');
    headingStyle.id = 'dynamic-typo';
    document.getElementById('dynamic-typo')?.remove();
    const sizeH = data.font_size_heading || 62;
    const sizeB = data.font_size_base || 16;
    const weightH = data.font_weight_heading || '900';
    const spacing = data.letter_spacing || '0px';
    headingStyle.textContent = `
      h1, h2, .hero-text h1, .section-head h2, .cat-title {
        font-family: '${fontHeading}', sans-serif !important;
        font-weight: ${weightH} !important;
        letter-spacing: ${spacing} !important;
      }
      .hero-text h1 { font-size: ${sizeH}px !important; }
      body, p, button, input, select, textarea, .btn {
        font-family: '${fontBody}', sans-serif !important;
        font-size: ${sizeB}px;
      }
    `;
    document.head.appendChild(headingStyle);

    // ===== Site Title =====
    if (data.site_title) {
      document.querySelectorAll('.nav-logo-text, .sidebar-brand, .footer-name').forEach(el => el.textContent = data.site_title);
      document.title = `${data.site_title} — Fashion Designer`;
    }

    // ===== Custom Texts =====
    const setText = (selector, val) => { if (!val) return; document.querySelectorAll(selector).forEach(el => el.textContent = val); };
    if (data.text_hero_title) setText('.hero-text h1', data.text_hero_title);
    if (data.text_hero_desc) setText('.hero-text p', data.text_hero_desc);
    if (data.text_hero_btn1) { const b = document.querySelector('.hero-btns .btn-primary'); if (b) b.textContent = data.text_hero_btn1; }
    if (data.text_hero_btn2) { const b = document.querySelector('.hero-btns .btn-outline'); if (b) b.textContent = data.text_hero_btn2; }
    // Features
    const featureCards = document.querySelectorAll('.feature-card');
    if (featureCards.length >= 4) {
      if (data.text_features_1_title) featureCards[0].querySelector('h4').textContent = data.text_features_1_title;
      if (data.text_features_1_desc) featureCards[0].querySelector('p').textContent = data.text_features_1_desc;
      if (data.text_features_2_title) featureCards[1].querySelector('h4').textContent = data.text_features_2_title;
      if (data.text_features_2_desc) featureCards[1].querySelector('p').textContent = data.text_features_2_desc;
      if (data.text_features_3_title) featureCards[2].querySelector('h4').textContent = data.text_features_3_title;
      if (data.text_features_3_desc) featureCards[2].querySelector('p').textContent = data.text_features_3_desc;
      if (data.text_features_4_title) featureCards[3].querySelector('h4').textContent = data.text_features_4_title;
      if (data.text_features_4_desc) featureCards[3].querySelector('p').textContent = data.text_features_4_desc;
    }
    if (data.text_reviews_title) setText('.reviews .section-head h2', data.text_reviews_title);
    if (data.text_reviews_desc) setText('.reviews .section-head p', data.text_reviews_desc);
    if (data.text_footer_desc) setText('.footer-brand p', data.text_footer_desc);

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
        const el = document.getElementById(id) || document.querySelector(`.${sec}-section`) || document.querySelector(`.${sec}`);
        if (el) el.style.display = 'none';
      }
    });

  } catch(e) { console.log('Settings load skipped:', e.message); }
})();
