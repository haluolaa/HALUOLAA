// ===== LOAD & APPLY SITE SETTINGS FROM SUPABASE =====
(async function() {
  try {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
    const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data } = await sb.from('site_settings').select('*').eq('id', 1).single();
    if (!data) return;

    const root = document.documentElement;

    // Apply Colors
    if (data.primary_color) {
      root.style.setProperty('--pink', data.primary_color);
      root.style.setProperty('--gradient', `linear-gradient(135deg, ${data.primary_color}, ${data.secondary_color || '#ff6eb4'})`);
    }
    if (data.secondary_color) root.style.setProperty('--pink-light', data.secondary_color);
    if (data.dark_color) root.style.setProperty('--dark', data.dark_color);
    if (data.bg_color) { root.style.setProperty('--white', data.bg_color); document.body.style.background = data.bg_color; }
    if (data.hero_bg) root.style.setProperty('--hero-bg', data.hero_bg);
    if (data.button_radius) root.style.setProperty('--btn-radius', data.button_radius);

    // Apply Font
    if (data.font_family) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${data.font_family.replace(/ /g,'+')}:wght@300;400;500;700;900&display=swap`;
      document.head.appendChild(link);
      document.body.style.fontFamily = `'${data.font_family}', sans-serif`;
    }

    // Apply Texts
    if (data.site_title) document.querySelectorAll('.logo').forEach(el => el.textContent = data.site_title);
    if (data.site_subtitle) document.querySelectorAll('[data-i18n="hero_subtitle"]').forEach(el => el.textContent = data.site_subtitle);
    if (data.hero_badge) document.querySelectorAll('[data-i18n="hero_badge"]').forEach(el => el.textContent = data.hero_badge);
    if (data.about_title) document.querySelectorAll('[data-i18n="about_title"]').forEach(el => el.textContent = data.about_title);
    if (data.about_desc) document.querySelectorAll('[data-i18n="about_desc"]').forEach(el => el.textContent = data.about_desc);

    // Show/Hide Sections
    const sections = ['hero','categories','products','features','about','reviews','contact'];
    sections.forEach(sec => {
      if (data[`show_${sec}`] === 0) {
        const el = document.getElementById(sec);
        if (el) el.style.display = 'none';
      }
    });

  } catch(e) { console.log('Settings load skipped:', e.message); }
})();
