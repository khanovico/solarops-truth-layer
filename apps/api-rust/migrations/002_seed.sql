insert into organizations (id, name, industry) values
  ('00000000-0000-0000-0000-000000000001', 'Prairie Mart Holdings', 'Convenience stores'),
  ('00000000-0000-0000-0000-000000000002', 'Southside Community Wellness Network', 'Nonprofit / community centers'),
  ('00000000-0000-0000-0000-000000000003', 'Lakeside Grocery Group', 'Grocery'),
  ('00000000-0000-0000-0000-000000000004', 'Northline Distribution', 'Warehouse / distribution'),
  ('00000000-0000-0000-0000-000000000005', 'Mercy Regional Clinics', 'Healthcare');

insert into sites (id, organization_id, name, address, city, state, roof_area_sqft, utility_provider) values
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 'Prairie Mart #014 - Joliet, IL', '1400 Route 59', 'Joliet', 'IL', 82000, 'ComEd'),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000002', 'Auburn Gresham Community Center', '7900 S Halsted St', 'Chicago', 'IL', 42000, 'ComEd'),
  ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000003', 'Lakeside Grocery - Evanston, IL', '1600 Chicago Ave', 'Evanston', 'IL', 65000, 'ComEd'),
  ('00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000004', 'Northline DC-2', '2450 Logistics Way', 'Joliet', 'IL', 130000, 'ComEd'),
  ('00000000-0000-0000-0000-000000000105', '00000000-0000-0000-0000-000000000005', 'Mercy Clinic West', '5050 Medical Pkwy', 'Naperville', 'IL', 51000, 'ComEd');

insert into projects (
  id, site_id, name, stage, health, system_size_kw_dc, estimated_project_cost_usd,
  estimated_annual_savings_usd, estimated_rebate_usd, financing_type, ppa_term_years,
  target_cod, owner_name
) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000101', 'Small Roof Solar + Storage', 'financing_review', 'yellow', 610, 1720000, 51000, 1180000, 'PPA', 10, '2026-10-15', 'Maya Patel'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000102', 'LED + HVAC + Solar Readiness Retrofit', 'rebate_submitted', 'green', 180, 920000, 118000, 210000, 'ESA', null, '2026-08-01', 'Chris Nguyen'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000103', 'Refrigeration Controls + Rooftop Solar', 'design', 'red', 440, 2400000, 167000, 690000, 'capital_lease', null, '2026-12-15', 'Elena Morales'),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000104', 'Solar + EV Charging Depot', 'permitting', 'yellow', 950, 4850000, 242000, 1300000, 'PACE', null, '2027-01-30', 'Jordan Lee'),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000105', 'Solar + Battery Microgrid', 'site_survey', 'unknown', 300, 3200000, 90000, null, 'TBD', null, null, 'Priya Shah');

insert into evidence_documents (id, project_id, evidence_type, title, summary, source_uri, uploaded_by, effective_date) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'site_survey', 'Prairie Mart site survey', 'Roof survey confirms usable area and basic interconnection point.', 'mock://docs/a-site-survey.pdf', 'Seed', '2026-03-12'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'ppa_term_sheet', 'Prairie Mart PPA term sheet', 'Draft PPA term sheet with ten-year term.', 'mock://docs/a-ppa-term-sheet.pdf', 'Seed', '2026-04-01'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'rebate_application', 'Prairie Mart rebate application', 'Submitted utility rebate application.', 'mock://docs/a-rebate-application.pdf', 'Seed', '2026-04-08'),
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', 'utility_bill', 'Community center utility baseline', 'Twelve-month electricity baseline.', 'mock://docs/b-utility-bill.pdf', 'Seed', '2026-02-01'),
  ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002', 'rebate_application', 'Community center rebate application', 'Submitted incentive package.', 'mock://docs/b-rebate-application.pdf', 'Seed', '2026-02-22'),
  ('20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000002', 'tax_memo', 'Nonprofit tax memo', 'Tax treatment memo for ESA structure.', 'mock://docs/b-tax-memo.pdf', 'Seed', '2026-03-03'),
  ('20000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000002', 'asset_spec_sheet', 'Retrofit asset spec sheet', 'LED, HVAC, and solar readiness equipment summary.', 'mock://docs/b-asset-specs.pdf', 'Seed', '2026-03-08'),
  ('20000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000003', 'site_survey', 'Lakeside design survey', 'Initial refrigeration controls and rooftop survey.', 'mock://docs/c-site-survey.pdf', 'Seed', '2026-03-20'),
  ('20000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000003', 'asset_spec_sheet', 'Conflicting refrigeration specs', 'Asset specs conflict with vendor load schedule.', 'mock://docs/c-asset-specs-v1.pdf', 'Seed', '2026-03-28'),
  ('20000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000004', 'permit_application', 'Warehouse permit application', 'Permit application package submitted.', 'mock://docs/d-permit-application.pdf', 'Seed', '2026-04-11'),
  ('20000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000004', 'asset_spec_sheet', 'EV depot asset spec sheet', 'Solar, inverter, and EV charger equipment summary.', 'mock://docs/d-asset-specs.pdf', 'Seed', '2026-04-14');

insert into blockers (id, project_id, category, severity, title, description, owner_name, status) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'missing_document', 'medium', 'Rebate award letter missing', 'Financing review cannot treat the rebate as secured until the award letter is uploaded.', 'Maya Patel', 'open'),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', 'stale_update', 'medium', 'Utility interval data is stale', 'Interval data is older than the design review threshold.', 'Elena Morales', 'open'),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 'data_conflict', 'high', 'Refrigeration asset specs conflict', 'Vendor controls schedule conflicts with the uploaded refrigeration asset specification.', 'Elena Morales', 'open'),
  ('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', 'interconnection_delay', 'medium', 'Interconnection package not submitted', 'The interconnection package is needed before installation readiness can be verified.', 'Jordan Lee', 'open');

insert into project_milestones (id, project_id, milestone_type, status, planned_date, actual_date, owner_name, notes) values
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'site_survey_completed', 'complete', '2026-03-15', '2026-03-12', 'Maya Patel', 'Survey complete.'),
  ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'rebate_award_received', 'blocked', '2026-05-15', null, 'Maya Patel', 'Awaiting utility award letter.'),
  ('40000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'rebate_application_submitted', 'complete', '2026-02-25', '2026-02-22', 'Chris Nguyen', 'Submitted.'),
  ('40000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000003', 'design_package_completed', 'blocked', '2026-05-30', null, 'Elena Morales', 'Blocked by data conflict.'),
  ('40000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000004', 'permit_submitted', 'complete', '2026-04-15', '2026-04-11', 'Jordan Lee', 'Permit submitted.'),
  ('40000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000004', 'interconnection_submitted', 'not_started', '2026-05-01', null, 'Jordan Lee', 'Not submitted.'),
  ('40000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000005', 'site_survey_completed', 'in_progress', '2026-05-10', null, 'Priya Shah', 'Baseline data missing.');

insert into assets (id, project_id, asset_type, manufacturer, model, serial_number, capacity_kw, status, installed_at) values
  ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'solar_panel', 'HelioMax', 'HM-550', null, 610, 'planned', null),
  ('50000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'battery', 'VoltVault', 'VV-250', null, 250, 'planned', null),
  ('50000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'lighting', 'BrightGrid', 'BG-LED', null, null, 'ordered', null),
  ('50000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000003', 'refrigeration_control', 'CoolLogic', 'CL-RX', null, null, 'issue', null),
  ('50000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000004', 'ev_charger', 'ChargePort', 'CP-180', null, 180, 'planned', null),
  ('50000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000005', 'battery', null, null, null, null, 'planned', null);

insert into claims (id, project_id, claim_text, claim_type, status, confidence, generated_by) values
  ('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'The project has a PPA term sheet.', 'financial', 'verified', 0.95, 'seed'),
  ('60000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'The rebate has been secured.', 'rebate', 'missing_evidence', 0.20, 'seed'),
  ('60000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'The rebate application has been submitted.', 'rebate', 'verified', 0.95, 'seed'),
  ('60000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000003', 'The project can move to rebate submission.', 'readiness', 'contradicted', 0.10, 'seed'),
  ('60000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000004', 'Installation can start.', 'installation', 'missing_evidence', 0.10, 'seed'),
  ('60000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000005', 'The project is financially viable.', 'financial', 'missing_evidence', 0.10, 'seed');

insert into claim_evidence_links (claim_id, evidence_id, support_type) values
  ('60000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'supports'),
  ('60000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000005', 'supports');

insert into activity_events (id, project_id, event_type, actor, description, metadata) values
  ('70000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'seed_created', 'Seed', 'Seeded Prairie Mart project.', '{}'::jsonb),
  ('70000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'seed_created', 'Seed', 'Seeded community center project.', '{}'::jsonb),
  ('70000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 'seed_created', 'Seed', 'Seeded grocery project with data conflict.', '{}'::jsonb),
  ('70000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', 'seed_created', 'Seed', 'Seeded warehouse project with interconnection blocker.', '{}'::jsonb),
  ('70000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000005', 'seed_created', 'Seed', 'Seeded healthcare project with unknown readiness.', '{}'::jsonb);
