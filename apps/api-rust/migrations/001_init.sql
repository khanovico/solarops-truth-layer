create table organizations (
  id uuid primary key,
  name text not null,
  industry text not null,
  created_at timestamptz not null default now()
);

create table sites (
  id uuid primary key,
  organization_id uuid not null references organizations(id),
  name text not null,
  address text,
  city text,
  state text,
  roof_area_sqft integer,
  utility_provider text,
  created_at timestamptz not null default now()
);

create table projects (
  id uuid primary key,
  site_id uuid not null references sites(id),
  name text not null,
  stage text not null,
  health text not null,
  system_size_kw_dc numeric,
  estimated_project_cost_usd numeric,
  estimated_annual_savings_usd numeric,
  estimated_rebate_usd numeric,
  financing_type text,
  ppa_term_years integer,
  target_cod date,
  owner_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table project_milestones (
  id uuid primary key,
  project_id uuid not null references projects(id) on delete cascade,
  milestone_type text not null,
  status text not null,
  planned_date date,
  actual_date date,
  owner_name text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table assets (
  id uuid primary key,
  project_id uuid not null references projects(id) on delete cascade,
  asset_type text not null,
  manufacturer text,
  model text,
  serial_number text,
  capacity_kw numeric,
  status text not null,
  installed_at date,
  created_at timestamptz not null default now()
);

create table evidence_documents (
  id uuid primary key,
  project_id uuid not null references projects(id) on delete cascade,
  evidence_type text not null,
  title text not null,
  summary text not null,
  source_uri text,
  uploaded_by text not null,
  effective_date date,
  created_at timestamptz not null default now()
);

create table claims (
  id uuid primary key,
  project_id uuid not null references projects(id) on delete cascade,
  claim_text text not null,
  claim_type text not null,
  status text not null,
  confidence numeric not null,
  generated_by text not null,
  created_at timestamptz not null default now()
);

create table claim_evidence_links (
  claim_id uuid not null references claims(id) on delete cascade,
  evidence_id uuid not null references evidence_documents(id) on delete cascade,
  support_type text not null,
  primary key (claim_id, evidence_id)
);

create table blockers (
  id uuid primary key,
  project_id uuid not null references projects(id) on delete cascade,
  category text not null,
  severity text not null,
  title text not null,
  description text not null,
  owner_name text,
  status text not null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table activity_events (
  id uuid primary key,
  project_id uuid not null references projects(id) on delete cascade,
  event_type text not null,
  actor text not null,
  description text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table ai_runs (
  id uuid primary key,
  project_id uuid not null references projects(id) on delete cascade,
  question text not null,
  answer text not null,
  model_name text,
  input_record_ids jsonb,
  output_claim_ids jsonb,
  created_at timestamptz not null default now()
);

create index idx_projects_stage on projects(stage);
create index idx_projects_health on projects(health);
create index idx_blockers_project_status on blockers(project_id, status);
create index idx_evidence_project_type on evidence_documents(project_id, evidence_type);
create index idx_claims_project_status on claims(project_id, status);
