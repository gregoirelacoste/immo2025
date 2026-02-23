-- Create properties table
create table if not exists public.properties (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,

  -- Infos du bien
  address text default '',
  city text not null,
  purchase_price numeric not null default 0,
  surface numeric not null default 0,
  property_type text not null default 'ancien' check (property_type in ('ancien', 'neuf')),
  description text default '',

  -- Prêt
  loan_amount numeric not null default 0,
  interest_rate numeric not null default 3.5,
  loan_duration integer not null default 20,
  personal_contribution numeric default 0,
  insurance_rate numeric default 0.34,
  loan_fees numeric default 0,

  -- Frais de notaire
  notary_fees numeric default 0,

  -- Location classique
  monthly_rent numeric default 0,
  condo_charges numeric default 0,
  property_tax numeric default 0,
  vacancy_rate numeric default 5,

  -- Airbnb
  airbnb_price_per_night numeric default 0,
  airbnb_occupancy_rate numeric default 60,
  airbnb_charges numeric default 0,

  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for fast user queries
create index if not exists idx_properties_user_id on public.properties(user_id);

-- RLS (Row Level Security)
alter table public.properties enable row level security;

-- Users can only see their own properties
create policy "Users can view own properties"
  on public.properties for select
  using (auth.uid() = user_id);

create policy "Users can insert own properties"
  on public.properties for insert
  with check (auth.uid() = user_id);

create policy "Users can update own properties"
  on public.properties for update
  using (auth.uid() = user_id);

create policy "Users can delete own properties"
  on public.properties for delete
  using (auth.uid() = user_id);

-- Auto-update updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_properties_updated
  before update on public.properties
  for each row execute function public.handle_updated_at();
