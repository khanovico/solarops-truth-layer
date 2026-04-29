create index if not exists idx_projects_target_cod_name on projects(target_cod, name);
create index if not exists idx_projects_owner_lower on projects(lower(owner_name));
create index if not exists idx_claims_status_type_created on claims(status, claim_type, created_at desc);
create index if not exists idx_claims_project_created on claims(project_id, created_at desc);
create index if not exists idx_activity_project_created on activity_events(project_id, created_at desc);
create index if not exists idx_ai_runs_project_created on ai_runs(project_id, created_at desc);
create index if not exists idx_milestones_project_planned on project_milestones(project_id, planned_date);
