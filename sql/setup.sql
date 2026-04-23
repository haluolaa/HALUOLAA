-- ============================================================
-- HALOULAA — Complete Supabase Database Setup
-- Run this entire file in Supabase SQL Editor
-- ============================================================


-- ============================================================
-- 1. PRODUCTS TABLE
-- ============================================================
create table if not exists products (
  id          bigint generated always as identity primary key,
  name        text not null,
  name_en     text,
  category    text,
  price       numeric(10,2) not null default 0,
  old_price   numeric(10,2),
  image_url   text,
  description text,
  sizes       text,
  colors      text,
  badge       text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_updated_at on products;
create trigger products_updated_at
  before update on products
  for each row execute function update_updated_at();


-- ============================================================
-- 2. CATEGORIES TABLE
-- ============================================================
create table if not exists categories (
  id          bigint generated always as identity primary key,
  name_en     text not null,
  name_ar     text not null,
  icon        text not null default 'fas fa-tag',
  sort_order  int  not null default 1,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Insert default categories only if table is empty
insert into categories (name_en, name_ar, icon, sort_order, is_active)
select * from (values
  ('Dresses',  'فساتين',    'fas fa-female',      1, true),
  ('Tops',     'بلوزات',    'fas fa-tshirt',      2, true),
  ('Pants',    'بناطيل',    'fas fa-stream',      3, true),
  ('Sets',     'أطقم',      'fas fa-layer-group', 4, true),
  ('T-Shirts', 'تيشيرتات',  'fas fa-tshirt',      5, true),
  ('Skirts',   'جيبات',     'fas fa-circle',      6, true),
  ('Kids',     'أطفال',     'fas fa-child',       7, true)
) as v(name_en, name_ar, icon, sort_order, is_active)
where not exists (select 1 from categories limit 1);


-- ============================================================
-- 3. ORDERS TABLE
-- ============================================================
create table if not exists orders (
  id                            bigint generated always as identity primary key,
  customer_name                 text not null,
  customer_phone                text not null,
  customer_address              text not null,
  notes                         text,
  items                         text,
  total                         numeric(10,2) not null default 0,
  payment_method                text not null default 'pending',
  status                        text not null default 'awaiting_payment',
  payment_confirmed_by_customer boolean default false,
  discount_code                 text,
  discount_amount               numeric(10,2) default 0,
  admin_reply                   text,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now()
);

drop trigger if exists orders_updated_at on orders;
create trigger orders_updated_at
  before update on orders
  for each row execute function update_updated_at();


-- ============================================================
-- 4. REVIEWS TABLE
-- ============================================================
create table if not exists reviews (
  id             bigint generated always as identity primary key,
  customer_name  text not null,
  customer_phone text,
  product_name   text,
  rating         int  not null default 5 check (rating between 1 and 5),
  comment        text not null,
  status         text not null default 'pending',
  created_at     timestamptz not null default now()
);


-- ============================================================
-- 5. DISCOUNTS TABLE
-- ============================================================
create table if not exists discounts (
  id         bigint generated always as identity primary key,
  code       text not null unique,
  percent    int  not null check (percent between 1 and 100),
  expiry     date,
  is_active  boolean not null default true,
  used_count int not null default 0,
  created_at timestamptz not null default now()
);


-- ============================================================
-- 6. SITE SETTINGS TABLE  (single row, id = 1)
-- ============================================================
create table if not exists site_settings (
  id int primary key default 1,

  -- Branding
  site_title          text    default 'HALOULAA',
  site_subtitle       text    default 'Fashion Designer',

  -- Colors
  primary_color       text    default '#c9a96e',
  secondary_color     text    default '#e8d5a3',
  dark_color          text    default '#1a1610',
  bg_color            text    default '#0f0d0a',
  hero_bg             text    default '#1a1610',

  -- Typography
  font_family         text    default 'Poppins',
  font_heading        text    default 'Poppins',
  font_body           text    default 'Poppins',
  font_size_heading   int     default 62,
  font_size_base      int     default 16,
  font_weight_heading text    default '900',
  letter_spacing      text    default '0px',

  -- Layout
  button_radius       text    default '50px',

  -- Hero
  hero_image          text    default '',
  hero_badge          text    default '✨ Collection 2026',
  show_hero_card      int     default 1,

  -- Custom Texts
  text_hero_title       text  default '',
  text_hero_desc        text  default '',
  text_hero_btn1        text  default '',
  text_hero_btn2        text  default '',
  text_features_1_title text  default '',
  text_features_1_desc  text  default '',
  text_features_2_title text  default '',
  text_features_2_desc  text  default '',
  text_features_3_title text  default '',
  text_features_3_desc  text  default '',
  text_features_4_title text  default '',
  text_features_4_desc  text  default '',
  text_reviews_title    text  default '',
  text_reviews_desc     text  default '',
  text_footer_desc      text  default '',

  -- Payment Methods
  instapay_link         text    default '',
  instapay_account      text    default '',
  instapay_enabled      boolean default true,
  vodafone_link         text    default '',
  vodafone_number       text    default '',
  vodafone_enabled      boolean default true,

  -- Section Visibility (1 = show, 0 = hide)
  show_hero             int default 1,
  show_categories       int default 1,
  show_products         int default 1,
  show_features         int default 1,
  show_about            int default 1,
  show_reviews          int default 1,
  show_contact          int default 1,
  show_shop             int default 1,

  updated_at timestamptz default now()
);

insert into site_settings (id) values (1)
on conflict (id) do nothing;


-- ============================================================
-- 7. THEME PRESETS TABLE
-- ============================================================
create table if not exists theme_presets (
  id              bigint generated always as identity primary key,
  name            text not null,
  primary_color   text,
  secondary_color text,
  dark_color      text,
  bg_color        text,
  hero_bg         text,
  font_family     text,
  button_radius   text,
  created_at      timestamptz not null default now()
);


-- ============================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- PRODUCTS
alter table products enable row level security;
drop policy if exists "Public can read products"          on products;
drop policy if exists "Authenticated can manage products" on products;
create policy "Public can read products"
  on products for select using (true);
create policy "Authenticated can manage products"
  on products for all using (auth.role() = 'authenticated');

-- CATEGORIES
alter table categories enable row level security;
drop policy if exists "Public can read categories"          on categories;
drop policy if exists "Authenticated can manage categories" on categories;
create policy "Public can read categories"
  on categories for select using (true);
create policy "Authenticated can manage categories"
  on categories for all using (auth.role() = 'authenticated');

-- ORDERS
alter table orders enable row level security;
drop policy if exists "Anyone can insert orders"        on orders;
drop policy if exists "Authenticated can manage orders" on orders;
create policy "Anyone can insert orders"
  on orders for insert with check (true);
create policy "Authenticated can manage orders"
  on orders for all using (auth.role() = 'authenticated');

-- REVIEWS
alter table reviews enable row level security;
drop policy if exists "Anyone can insert reviews"        on reviews;
drop policy if exists "Public can read approved reviews" on reviews;
drop policy if exists "Authenticated can manage reviews" on reviews;
create policy "Anyone can insert reviews"
  on reviews for insert with check (true);
create policy "Public can read approved reviews"
  on reviews for select using (status = 'approved');
create policy "Authenticated can manage reviews"
  on reviews for all using (auth.role() = 'authenticated');

-- DISCOUNTS
alter table discounts enable row level security;
drop policy if exists "Public can read active discounts"   on discounts;
drop policy if exists "Anyone can insert discounts"        on discounts;
drop policy if exists "Authenticated can manage discounts" on discounts;
create policy "Public can read active discounts"
  on discounts for select using (is_active = true);
create policy "Anyone can insert discounts"
  on discounts for insert with check (true);
create policy "Authenticated can manage discounts"
  on discounts for all using (auth.role() = 'authenticated');

-- SITE SETTINGS
alter table site_settings enable row level security;
drop policy if exists "Public can read settings"          on site_settings;
drop policy if exists "Authenticated can update settings" on site_settings;
create policy "Public can read settings"
  on site_settings for select using (true);
create policy "Authenticated can update settings"
  on site_settings for update using (auth.role() = 'authenticated');

-- THEME PRESETS
alter table theme_presets enable row level security;
drop policy if exists "Public can read presets"          on theme_presets;
drop policy if exists "Authenticated can manage presets" on theme_presets;
create policy "Public can read presets"
  on theme_presets for select using (true);
create policy "Authenticated can manage presets"
  on theme_presets for all using (auth.role() = 'authenticated');


-- ============================================================
-- 9. STORAGE BUCKET
-- ============================================================
insert into storage.buckets (id, name, public)
values ('HALUOLAA', 'HALUOLAA', true)
on conflict (id) do nothing;

drop policy if exists "Public can view images"          on storage.objects;
drop policy if exists "Authenticated can upload images" on storage.objects;
drop policy if exists "Authenticated can delete images" on storage.objects;

create policy "Public can view images"
  on storage.objects for select
  using (bucket_id = 'HALUOLAA');
create policy "Authenticated can upload images"
  on storage.objects for insert
  with check (bucket_id = 'HALUOLAA' and auth.role() = 'authenticated');
create policy "Authenticated can delete images"
  on storage.objects for delete
  using (bucket_id = 'HALUOLAA' and auth.role() = 'authenticated');


-- ============================================================
-- 10. INDEXES
-- ============================================================
create index if not exists idx_products_category   on products  (category);
create index if not exists idx_products_created_at on products  (created_at desc);
create index if not exists idx_orders_status       on orders    (status);
create index if not exists idx_orders_created_at   on orders    (created_at desc);
create index if not exists idx_reviews_status      on reviews   (status);
create index if not exists idx_categories_sort     on categories(sort_order);
create index if not exists idx_discounts_code      on discounts (code);


-- ============================================================
-- DONE ✅
-- 7 Tables: products, categories, orders, reviews,
--           discounts, site_settings, theme_presets
-- ============================================================
