// ===== LOAD & APPLY SITE SETTINGS FROM SUPABASE =====
(async function() {
  try {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
    const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data } = await sb.from('site_settings').select('*').eq('id', 1).single();
    if (!data) return;

    const root = document.documentElement;

    // Hero image
    if (data.hero_image) {
      const heroImg = document.querySelector('.hero-card img');
      if (heroImg) heroImg.src = data.hero_image;
    }

    // Colors
    if (data.primary_color) {
      root.style.setProperty('--gold', data.primary_color);
      root.style.setProperty('--gradient', `linear-gradient(135deg, ${data.primary_color}, ${data.secondary_color || '#e8d5a3'})`);
    }
    if (data.secondary_color) root.style.setProperty('--gold-light', data.secondary_color);
    if (data.dark_color) root.style.setProperty('--card', data.dark_color);
    if (data.button_radius) root.style.setProperty('--btn-radius', data.button_radius);

    // Font
    if (data.font_family) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${data.font_family.replace(/ /g,'+')}:wght@300;400;500;700;900&display=swap`;
      document.head.appendChild(link);
      document.body.style.fontFamily = `'${data.font_family}', sans-serif`;
    }

    // Texts
    if (data.site_title) {
      document.querySelectorAll('.nav-logo-text, .sidebar-brand, .brand-name, .footer-name').forEach(el => el.textContent = data.site_title);
    }
    if (data.site_subtitle) {
      const subtitle = data.site_subtitle;
      // Always show in English if it's Arabic
      const englishSubtitle = subtitle === 'مصممة أزياء' || subtitle === 'مصمم أزياء' ? 'Fashion Designer' : subtitle;
      document.querySelectorAll('.sidebar-tagline, .brand-tagline').forEach(el => el.textContent = englishSubtitle);
    }

    // Show/Hide Sections
    const sections = ['hero','shop','features','reviews'];
    sections.forEach(sec => {
      if (data[`show_${sec}`] === 0) {
        const el = document.getElementById(sec);
        if (el) el.style.display = 'none';
      }
    });

  } catch(e) { console.log('Settings load skipped:', e.message); }
})();
