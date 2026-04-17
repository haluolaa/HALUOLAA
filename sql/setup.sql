-- Site Settings Table
create table if not exists site_settings (
  id int primary key default 1,
  primary_color text default '#e91e8c',
  secondary_color text default '#ff6eb4',
  dark_color text default '#1a1a2e',
  bg_color text default '#ffffff',
  font_family text default 'Tajawal',
  hero_bg text default '#fff0f7',
  button_radius text default '50px',
  site_title text default 'HALOULA',
  site_subtitle text default 'مصممة أزياء',
  hero_badge text default '✨ كولكشن 2025',
  about_title text default 'براند مصري بنفس عصري',
  about_desc text default 'HALOULA هو براند ملابس بناتي مصري',
  whatsapp text default '201021102607',
  instapay_link text default 'https://ipn.eg/S/mohandehaben932/instapay/9FLI7y',
  show_hero int default 1,
  show_categories int default 1,
  show_products int default 1,
  show_features int default 1,
  show_about int default 1,
  show_reviews int default 1,
  show_contact int default 1,
  updated_at timestamp default now()
);

-- Theme Presets Table
create table if not exists theme_presets (
  id bigint generated always as identity primary key,
  name text not null,
  primary_color text,
  secondary_color text,
  dark_color text,
  bg_color text,
  font_family text,
  hero_bg text,
  button_radius text,
  created_at timestamp default now()
);

-- Insert default settings
insert into site_settings (id) values (1) on conflict do nothing;

-- RLS
alter table site_settings enable row level security;
alter table theme_presets enable row level security;

create policy "Public read settings" on site_settings for select using (true);
create policy "Admin update settings" on site_settings for update using (true);
create policy "Public read presets" on theme_presets for select using (true);
create policy "Admin insert presets" on theme_presets for insert with check (true);
create policy "Admin delete presets" on theme_presets for delete using (true);
