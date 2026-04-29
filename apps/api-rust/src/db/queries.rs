use std::collections::HashMap;

use chrono::NaiveDate;
use serde_json::json;
use sqlx::{PgPool, Postgres, Transaction};
use uuid::Uuid;

use crate::{
    ai_client::AiAnswer,
    db::models::{
        ActivityEvent, AiRun, Asset, Blocker, BlockerUpdateRequest, Claim, ClaimEvidenceLink,
        ClaimFilters, ClaimReverifyRequest, ClaimWithEvidence, EvidenceCreateRequest,
        EvidenceDocument, GlobalClaim, GlobalClaimRow, LinkedEvidence, LinkedEvidenceRow,
        Milestone, Organization, PaginatedResponse, PortfolioHealth, ProjectDetail, ProjectFilters,
        ProjectRecord, ProjectSummary, ProjectSummaryRow, Site, StageUpdateRequest,
    },
    domain::{
        claim_verification,
        project_health::{
            compute_project_health, is_overdue, is_valid_evidence_type, is_valid_stage,
            missing_required_evidence_count,
        },
    },
    error::{AppError, AppResult},
};

const MAX_REVERIFY_CLAIMS_PER_EVIDENCE_UPLOAD: i64 = 25;

pub async fn portfolio_health(pool: &PgPool) -> AppResult<PortfolioHealth> {
    let row = sqlx::query_as::<_, PortfolioHealth>(
        r#"
        with project_flags as (
          select
            p.*,
            bool_or(b.id is not null) as has_open_blocker,
            count(b.id) filter (where b.severity = 'high')::bigint as high_severity_blockers,
            bool_or(b.category in ('stale_update', 'data_conflict')) as has_stale_or_conflict
          from projects p
          left join blockers b on b.project_id = p.id and b.status = 'open'
          group by p.id
        )
        select
          count(*)::bigint as total_projects,
          count(*) filter (where p.health = 'green')::bigint as green,
          count(*) filter (where p.health = 'yellow')::bigint as yellow,
          count(*) filter (where p.health = 'red')::bigint as red,
          count(*) filter (where p.health = 'unknown')::bigint as unknown,
          count(*) filter (where p.has_open_blocker)::bigint as blocked_projects,
          coalesce(sum(p.high_severity_blockers), 0)::bigint as high_severity_blockers,
          count(*) filter (
            where p.stage in ('financing_review', 'rebate_submitted')
              and not exists (
                select 1 from evidence_documents ev
                where ev.project_id = p.id and ev.evidence_type in ('ppa_term_sheet', 'rebate_award_letter')
              )
          )::bigint as missing_financing_evidence,
          count(*) filter (where p.has_stale_or_conflict)::bigint as stale_or_conflicting_projects,
          coalesce(sum(p.estimated_annual_savings_usd), 0)::float8 as estimated_annual_savings_usd,
          coalesce(sum(p.estimated_rebate_usd), 0)::float8 as estimated_rebates_usd,
          (
            select count(*)::bigint
            from projects ready
            where ready.estimated_project_cost_usd is not null
              and ready.estimated_annual_savings_usd is not null
              and ready.financing_type is not null
              and exists (
                select 1 from evidence_documents ev
                where ev.project_id = ready.id and ev.evidence_type = 'ppa_term_sheet'
              )
              and (
                ready.estimated_rebate_usd is null
                or exists (
                  select 1 from evidence_documents ev
                  where ev.project_id = ready.id and ev.evidence_type = 'rebate_award_letter'
                )
              )
              and not exists (
                select 1 from blockers hb
                where hb.project_id = ready.id and hb.status = 'open' and hb.severity = 'high'
              )
          ) as projects_ready_for_financing_review
        from project_flags p
        "#,
    )
    .fetch_one(pool)
    .await?;

    Ok(row)
}

pub async fn list_projects(
    pool: &PgPool,
    filters: &ProjectFilters,
) -> AppResult<PaginatedResponse<ProjectSummary>> {
    let limit = normalized_limit(filters.limit);
    let offset = cursor_offset(filters.cursor.as_deref());
    let rows = sqlx::query_as::<_, ProjectSummaryRow>(
        r#"
        with project_rows as (
          select
            p.id,
            p.name,
            o.name as organization_name,
            s.name as site_name,
            p.stage,
            p.health,
            p.estimated_annual_savings_usd::float8 as estimated_annual_savings_usd,
            p.estimated_rebate_usd::float8 as estimated_rebate_usd,
            p.owner_name,
            count(distinct b.id) filter (where b.status = 'open')::bigint as open_blocker_count,
            p.target_cod,
            coalesce(array_remove(array_agg(distinct e.evidence_type), null), array[]::text[]) as evidence_types
          from projects p
          join sites s on s.id = p.site_id
          join organizations o on o.id = s.organization_id
          left join blockers b on b.project_id = p.id
          left join evidence_documents e on e.project_id = p.id
          where ($1::text is null or p.stage = $1)
            and ($2::text is null or p.health = $2)
            and ($3::text is null or lower(p.owner_name) like '%' || lower($3) || '%')
          group by p.id, o.name, s.name
          having (
            $4::bool is null
            or ($4 = true and count(distinct b.id) filter (where b.status = 'open') > 0)
            or ($4 = false and count(distinct b.id) filter (where b.status = 'open') = 0)
          )
        )
        select *, count(*) over()::bigint as total_count
        from project_rows
        order by
          case health
            when 'red' then 0
            when 'yellow' then 1
            when 'unknown' then 2
            when 'green' then 3
            else 4
          end,
          target_cod nulls last,
          name
        limit $5
        offset $6
        "#,
    )
    .bind(&filters.stage)
    .bind(&filters.health)
    .bind(&filters.owner)
    .bind(filters.has_open_blockers)
    .bind(limit + 1)
    .bind(offset)
    .fetch_all(pool)
    .await?;

    let total = rows.first().map_or(0, |row| row.total_count);
    let limit_usize = usize::try_from(limit).unwrap_or(100);
    let has_next = rows.len() > limit_usize;
    let items = rows
        .into_iter()
        .take(limit_usize)
        .map(|row| ProjectSummary {
            id: row.id,
            name: row.name,
            organization_name: row.organization_name,
            site_name: row.site_name,
            stage: row.stage.clone(),
            health: row.health,
            estimated_annual_savings_usd: row.estimated_annual_savings_usd,
            estimated_rebate_usd: row.estimated_rebate_usd,
            owner_name: row.owner_name,
            open_blocker_count: row.open_blocker_count,
            missing_evidence_count: missing_required_evidence_count(
                &row.stage,
                &row.evidence_types,
            ),
            target_cod: row.target_cod,
        })
        .collect();

    Ok(PaginatedResponse {
        items,
        next_cursor: has_next.then(|| (offset + limit).to_string()),
        total,
    })
}

pub async fn project_detail(pool: &PgPool, project_id: Uuid) -> AppResult<ProjectDetail> {
    let project = project_record(pool, project_id).await?;
    let organization = sqlx::query_as::<_, Organization>(
        r#"
        select o.id, o.name, o.industry
        from organizations o
        join sites s on s.organization_id = o.id
        join projects p on p.site_id = s.id
        where p.id = $1
        "#,
    )
    .bind(project_id)
    .fetch_optional(pool)
    .await?
    .ok_or(AppError::ProjectNotFound)?;
    let site = sqlx::query_as::<_, Site>(
        r#"
        select s.id, s.organization_id, s.name, s.address, s.city, s.state, s.roof_area_sqft, s.utility_provider
        from sites s
        join projects p on p.site_id = s.id
        where p.id = $1
        "#,
    )
    .bind(project_id)
    .fetch_optional(pool)
    .await?
    .ok_or(AppError::ProjectNotFound)?;
    let milestones = milestones(pool, project_id).await?;
    let assets = sqlx::query_as::<_, Asset>(
        "select id, project_id, asset_type, manufacturer, model, serial_number, capacity_kw::float8 as capacity_kw, status, installed_at, created_at from assets where project_id = $1 order by asset_type, created_at",
    )
    .bind(project_id)
    .fetch_all(pool)
    .await?;
    let evidence = evidence_documents(pool, project_id, 100).await?;
    let claims = claims_with_evidence(pool, project_id).await?;
    let claim_evidence_links = sqlx::query_as::<_, ClaimEvidenceLink>(
        r#"
        select l.claim_id, l.evidence_id, l.support_type
        from claim_evidence_links l
        join claims c on c.id = l.claim_id
        where c.project_id = $1
        order by c.created_at desc
        "#,
    )
    .bind(project_id)
    .fetch_all(pool)
    .await?;
    let blockers = blockers(pool, project_id).await?;
    let activity_events = sqlx::query_as::<_, ActivityEvent>(
        "select id, project_id, event_type, actor, description, metadata, created_at from activity_events where project_id = $1 order by created_at desc limit 50",
    )
    .bind(project_id)
    .fetch_all(pool)
    .await?;
    let ai_runs = sqlx::query_as::<_, AiRun>(
        "select id, project_id, question, answer, model_name, input_record_ids, output_claim_ids, created_at from ai_runs where project_id = $1 order by created_at desc limit 10",
    )
    .bind(project_id)
    .fetch_all(pool)
    .await?;

    Ok(ProjectDetail {
        project,
        organization,
        site,
        milestones,
        assets,
        evidence,
        claims,
        claim_evidence_links,
        blockers,
        activity_events,
        ai_runs,
    })
}

pub async fn update_stage(
    pool: &PgPool,
    project_id: Uuid,
    request: StageUpdateRequest,
) -> AppResult<ProjectDetail> {
    if !is_valid_stage(&request.stage) {
        return Err(AppError::InvalidProjectStage);
    }

    let updated = sqlx::query(
        "update projects set stage = $1, updated_at = now() where id = $2 returning id",
    )
    .bind(&request.stage)
    .bind(project_id)
    .fetch_optional(pool)
    .await?;

    if updated.is_none() {
        return Err(AppError::ProjectNotFound);
    }

    write_activity(
        pool,
        project_id,
        "stage_changed",
        &request.actor,
        &format!("Stage changed to {}: {}", request.stage, request.reason),
        json!({ "stage": request.stage, "reason": request.reason }),
    )
    .await?;
    recompute_project_health(pool, project_id).await?;
    project_detail(pool, project_id).await
}

pub async fn create_evidence(
    pool: &PgPool,
    project_id: Uuid,
    request: EvidenceCreateRequest,
) -> AppResult<ProjectDetail> {
    if !is_valid_evidence_type(&request.evidence_type) {
        return Err(AppError::InvalidEvidenceType);
    }

    let exists = project_exists(pool, project_id).await?;
    if !exists {
        return Err(AppError::ProjectNotFound);
    }

    let mut tx = pool.begin().await?;
    lock_project_for_update_tx(&mut tx, project_id).await?;

    let evidence_id = Uuid::new_v4();
    sqlx::query(
        r#"
        insert into evidence_documents (
          id, project_id, evidence_type, title, summary, source_uri, uploaded_by, effective_date
        ) values ($1, $2, $3, $4, $5, $6, $7, $8)
        "#,
    )
    .bind(evidence_id)
    .bind(project_id)
    .bind(&request.evidence_type)
    .bind(&request.title)
    .bind(&request.summary)
    .bind(&request.source_uri)
    .bind(&request.uploaded_by)
    .bind(request.effective_date)
    .execute(&mut *tx)
    .await?;

    write_activity_tx(
        &mut tx,
        project_id,
        "evidence_added",
        &request.uploaded_by,
        &format!("Evidence added: {}", request.title),
        json!({ "evidence_id": evidence_id, "evidence_type": request.evidence_type }),
    )
    .await?;
    automate_rebate_award_letter_tx(
        &mut tx,
        project_id,
        &request.evidence_type,
        request.effective_date,
        &request.uploaded_by,
    )
    .await?;
    let snapshot = load_reverify_snapshot(&mut tx, project_id).await?;
    recompute_project_health_tx(&mut tx, &snapshot).await?;
    reverify_related_claims_tx(
        &mut tx,
        project_id,
        &request.evidence_type,
        &request.uploaded_by,
        &snapshot,
    )
    .await?;
    tx.commit().await?;
    project_detail(pool, project_id).await
}

pub async fn list_claims(pool: &PgPool, project_id: Uuid) -> AppResult<Vec<ClaimWithEvidence>> {
    if !project_exists(pool, project_id).await? {
        return Err(AppError::ProjectNotFound);
    }
    claims_with_evidence(pool, project_id).await
}

pub async fn list_all_claims(
    pool: &PgPool,
    filters: &ClaimFilters,
) -> AppResult<PaginatedResponse<GlobalClaim>> {
    let limit = normalized_limit(filters.limit);
    let offset = cursor_offset(filters.cursor.as_deref());
    let rows = sqlx::query_as::<_, GlobalClaimRow>(
        r#"
        with claim_rows as (
          select
            c.id,
            c.project_id,
            p.name as project_name,
            c.claim_text,
            c.claim_type,
            c.status,
            c.confidence::float8 as confidence,
            count(l.evidence_id)::bigint as evidence_count,
            c.created_at
          from claims c
          join projects p on p.id = c.project_id
          left join claim_evidence_links l on l.claim_id = c.id
          where ($1::text is null or c.status = $1)
            and ($2::text is null or c.claim_type = $2)
            and ($3::uuid is null or c.project_id = $3)
          group by c.id, p.name
        )
        select *, count(*) over()::bigint as total_count
        from claim_rows
        order by created_at desc
        limit $4
        offset $5
        "#,
    )
    .bind(&filters.status)
    .bind(&filters.claim_type)
    .bind(filters.project_id)
    .bind(limit + 1)
    .bind(offset)
    .fetch_all(pool)
    .await?;

    let total = rows.first().map_or(0, |row| row.total_count);
    let limit_usize = usize::try_from(limit).unwrap_or(100);
    let has_next = rows.len() > limit_usize;
    let items = rows
        .into_iter()
        .take(limit_usize)
        .map(|row| GlobalClaim {
            id: row.id,
            project_id: row.project_id,
            project_name: row.project_name,
            claim_text: row.claim_text,
            claim_type: row.claim_type,
            status: row.status,
            confidence: row.confidence,
            evidence_count: row.evidence_count,
            created_at: row.created_at,
        })
        .collect();

    Ok(PaginatedResponse {
        items,
        next_cursor: has_next.then(|| (offset + limit).to_string()),
        total,
    })
}

pub async fn reverify_claim(
    pool: &PgPool,
    project_id: Uuid,
    claim_id: Uuid,
    request: ClaimReverifyRequest,
) -> AppResult<ClaimWithEvidence> {
    let claim = sqlx::query_as::<_, Claim>(
        "select id, project_id, claim_text, claim_type, status, confidence::float8 as confidence, generated_by, created_at from claims where id = $1 and project_id = $2",
    )
    .bind(claim_id)
    .bind(project_id)
    .fetch_optional(pool)
    .await?
    .ok_or(AppError::ProjectNotFound)?;

    let evaluation = evaluate_existing_claim(pool, &claim).await?;
    apply_claim_evaluation(pool, &claim, &evaluation).await?;
    write_activity(
        pool,
        project_id,
        "claim_reverified",
        &request.actor,
        &format!("Claim reverified: {}", claim.claim_text),
        json!({ "claim_id": claim_id, "status": evaluation.status }),
    )
    .await?;

    let claims = claims_with_evidence(pool, project_id).await?;
    claims
        .into_iter()
        .find(|candidate| candidate.id == claim_id)
        .ok_or(AppError::ProjectNotFound)
}

pub async fn list_blockers(pool: &PgPool, project_id: Uuid) -> AppResult<Vec<Blocker>> {
    if !project_exists(pool, project_id).await? {
        return Err(AppError::ProjectNotFound);
    }
    blockers(pool, project_id).await
}

pub async fn update_blocker(
    pool: &PgPool,
    blocker_id: Uuid,
    request: BlockerUpdateRequest,
) -> AppResult<Blocker> {
    if !matches!(request.status.as_str(), "open" | "resolved" | "dismissed") {
        return Err(AppError::InvalidClaimStatus);
    }

    let blocker = sqlx::query_as::<_, Blocker>(
        r#"
        update blockers
        set status = $1,
            resolved_at = case when $1 = 'resolved' then now() else resolved_at end
        where id = $2
        returning id, project_id, category, severity, title, description, owner_name, status, created_at, resolved_at
        "#,
    )
    .bind(&request.status)
    .bind(blocker_id)
    .fetch_optional(pool)
    .await?
    .ok_or(AppError::BlockerNotFound)?;

    let event_type = if request.status == "resolved" {
        "blocker_resolved"
    } else {
        "blocker_updated"
    };
    write_activity(
        pool,
        blocker.project_id,
        event_type,
        &request.actor,
        &format!(
            "Blocker '{}' marked {}. {}",
            blocker.title,
            blocker.status,
            request.resolution_note.unwrap_or_default()
        ),
        json!({ "blocker_id": blocker_id, "status": blocker.status }),
    )
    .await?;
    recompute_project_health(pool, blocker.project_id).await?;
    Ok(blocker)
}

pub async fn persist_ai_answer(
    pool: &PgPool,
    project_id: Uuid,
    question: &str,
    actor: &str,
    answer: &AiAnswer,
) -> AppResult<()> {
    let mut tx = pool.begin().await?;
    let mut claim_ids = Vec::new();

    for claim in &answer.claims {
        let claim_id = Uuid::new_v4();
        claim_ids.push(claim_id);
        sqlx::query(
            r#"
            insert into claims (id, project_id, claim_text, claim_type, status, confidence, generated_by)
            values ($1, $2, $3, $4, $5, $6, $7)
            "#,
        )
        .bind(claim_id)
        .bind(project_id)
        .bind(&claim.claim_text)
        .bind(&claim.claim_type)
        .bind(&claim.status)
        .bind(claim.confidence)
        .bind(format!("ai:{actor}"))
        .execute(&mut *tx)
        .await?;

        for evidence_id in &claim.evidence_ids {
            sqlx::query(
                "insert into claim_evidence_links (claim_id, evidence_id, support_type) values ($1, $2, 'supports') on conflict do nothing",
            )
            .bind(claim_id)
            .bind(evidence_id)
            .execute(&mut *tx)
            .await?;
        }
    }

    sqlx::query(
        r#"
        insert into ai_runs (id, project_id, question, answer, model_name, input_record_ids, output_claim_ids)
        values ($1, $2, $3, $4, $5, $6, $7)
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(project_id)
    .bind(question)
    .bind(&answer.answer_markdown)
    .bind("mock")
    .bind(json!({ "project_id": project_id }))
    .bind(json!(claim_ids))
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;
    write_activity(
        pool,
        project_id,
        "ai_answered",
        actor,
        "AI assistant answered a project question.",
        json!({ "question": question }),
    )
    .await?;
    Ok(())
}

async fn project_record(pool: &PgPool, project_id: Uuid) -> AppResult<ProjectRecord> {
    sqlx::query_as::<_, ProjectRecord>(
        r#"
        select
          id,
          name,
          stage,
          health,
          system_size_kw_dc::float8 as system_size_kw_dc,
          estimated_project_cost_usd::float8 as estimated_project_cost_usd,
          estimated_annual_savings_usd::float8 as estimated_annual_savings_usd,
          estimated_rebate_usd::float8 as estimated_rebate_usd,
          financing_type,
          ppa_term_years,
          target_cod,
          owner_name,
          created_at,
          updated_at
        from projects
        where id = $1
        "#,
    )
    .bind(project_id)
    .fetch_optional(pool)
    .await?
    .ok_or(AppError::ProjectNotFound)
}

async fn project_exists(pool: &PgPool, project_id: Uuid) -> AppResult<bool> {
    let exists: bool = sqlx::query_scalar("select exists(select 1 from projects where id = $1)")
        .bind(project_id)
        .fetch_one(pool)
        .await?;
    Ok(exists)
}

async fn evidence_documents(
    pool: &PgPool,
    project_id: Uuid,
    limit: i64,
) -> AppResult<Vec<EvidenceDocument>> {
    Ok(sqlx::query_as::<_, EvidenceDocument>(
        "select id, project_id, evidence_type, title, summary, source_uri, uploaded_by, effective_date, created_at from evidence_documents where project_id = $1 order by created_at desc limit $2",
    )
    .bind(project_id)
    .bind(limit)
    .fetch_all(pool)
    .await?)
}

async fn evidence_pairs(pool: &PgPool, project_id: Uuid) -> AppResult<Vec<(Uuid, String)>> {
    Ok(sqlx::query_as::<_, (Uuid, String)>(
        "select id, evidence_type from evidence_documents where project_id = $1",
    )
    .bind(project_id)
    .fetch_all(pool)
    .await?)
}

async fn milestones(pool: &PgPool, project_id: Uuid) -> AppResult<Vec<Milestone>> {
    Ok(sqlx::query_as::<_, Milestone>(
        "select id, project_id, milestone_type, status, planned_date, actual_date, owner_name, notes, created_at, updated_at from project_milestones where project_id = $1 order by planned_date nulls last, milestone_type",
    )
    .bind(project_id)
    .fetch_all(pool)
    .await?)
}

async fn blockers(pool: &PgPool, project_id: Uuid) -> AppResult<Vec<Blocker>> {
    Ok(sqlx::query_as::<_, Blocker>(
        r#"
        select id, project_id, category, severity, title, description, owner_name, status, created_at, resolved_at
        from blockers
        where project_id = $1
        order by
          case when status = 'open' then 0 else 1 end,
          case severity when 'high' then 0 when 'medium' then 1 else 2 end,
          coalesce(resolved_at, created_at) desc
        "#,
    )
    .bind(project_id)
    .fetch_all(pool)
    .await?)
}

async fn claims_with_evidence(
    pool: &PgPool,
    project_id: Uuid,
) -> AppResult<Vec<ClaimWithEvidence>> {
    let claims = sqlx::query_as::<_, Claim>(
        "select id, project_id, claim_text, claim_type, status, confidence::float8 as confidence, generated_by, created_at from claims where project_id = $1 order by created_at desc limit 100",
    )
    .bind(project_id)
    .fetch_all(pool)
    .await?;

    let claim_ids: Vec<Uuid> = claims.iter().map(|claim| claim.id).collect();
    let evidence_rows = if claim_ids.is_empty() {
        Vec::new()
    } else {
        sqlx::query_as::<_, LinkedEvidenceRow>(
            r#"
            select l.claim_id, e.id, e.title, e.evidence_type, l.support_type
            from claim_evidence_links l
            join evidence_documents e on e.id = l.evidence_id
            where l.claim_id = any($1)
            order by e.created_at desc
            "#,
        )
        .bind(&claim_ids)
        .fetch_all(pool)
        .await?
    };
    let mut evidence_by_claim: HashMap<Uuid, Vec<LinkedEvidence>> = HashMap::new();
    for row in evidence_rows {
        evidence_by_claim
            .entry(row.claim_id)
            .or_default()
            .push(LinkedEvidence {
                id: row.id,
                title: row.title,
                evidence_type: row.evidence_type,
                support_type: row.support_type,
            });
    }

    let mut result = Vec::with_capacity(claims.len());
    for claim in claims {
        result.push(ClaimWithEvidence {
            id: claim.id,
            project_id: claim.project_id,
            claim_text: claim.claim_text,
            claim_type: claim.claim_type,
            status: claim.status,
            confidence: claim.confidence,
            generated_by: claim.generated_by,
            created_at: claim.created_at,
            evidence: evidence_by_claim.remove(&claim.id).unwrap_or_default(),
        });
    }

    Ok(result)
}

fn normalized_limit(limit: Option<i64>) -> i64 {
    limit.unwrap_or(50).clamp(1, 100)
}

fn cursor_offset(cursor: Option<&str>) -> i64 {
    cursor
        .and_then(|raw| raw.parse::<i64>().ok())
        .unwrap_or(0)
        .max(0)
}

async fn evaluate_existing_claim(
    pool: &PgPool,
    claim: &Claim,
) -> AppResult<claim_verification::ClaimEvaluation> {
    let project = project_record(pool, claim.project_id).await?;
    let evidence = evidence_pairs(pool, claim.project_id).await?;
    let blockers = blockers(pool, claim.project_id).await?;
    let milestones = milestones(pool, claim.project_id).await?;
    Ok(claim_verification::evaluate_claim(
        &claim.claim_type,
        &claim.claim_text,
        &project,
        &evidence,
        &blockers,
        &milestones,
    ))
}

async fn apply_claim_evaluation(
    pool: &PgPool,
    claim: &Claim,
    evaluation: &claim_verification::ClaimEvaluation,
) -> AppResult<()> {
    sqlx::query("update claims set status = $1, confidence = $2 where id = $3")
        .bind(&evaluation.status)
        .bind(evaluation.confidence)
        .bind(claim.id)
        .execute(pool)
        .await?;

    sqlx::query("delete from claim_evidence_links where claim_id = $1")
        .bind(claim.id)
        .execute(pool)
        .await?;

    for evidence_id in &evaluation.evidence_ids {
        sqlx::query(
            "insert into claim_evidence_links (claim_id, evidence_id, support_type) values ($1, $2, 'supports') on conflict do nothing",
        )
        .bind(claim.id)
        .bind(evidence_id)
        .execute(pool)
        .await?;
    }
    Ok(())
}

async fn reverify_related_claims_tx(
    tx: &mut Transaction<'_, Postgres>,
    project_id: Uuid,
    evidence_type: &str,
    actor: &str,
    snapshot: &ReverifySnapshot,
) -> AppResult<()> {
    let claim_types = match evidence_type {
        "rebate_award_letter" | "rebate_application" => vec!["rebate", "readiness"],
        "ppa_term_sheet" => vec!["financial", "readiness"],
        "permit_approval" | "interconnection_approval" => vec!["installation"],
        "monitoring_snapshot" => vec!["financial"],
        _ => return Ok(()),
    };
    let claims = claims_for_reverify(tx, project_id, &claim_types).await?;

    if claims.is_empty() {
        return Ok(());
    }

    for claim in claims {
        let evaluation = claim_verification::evaluate_claim(
            &claim.claim_type,
            &claim.claim_text,
            &snapshot.project,
            &snapshot.evidence,
            &snapshot.blockers,
            &snapshot.milestones,
        );

        update_reverified_claim(tx, project_id, actor, &claim, &evaluation).await?;
    }

    Ok(())
}

struct ReverifySnapshot {
    project: ProjectRecord,
    evidence: Vec<(Uuid, String)>,
    blockers: Vec<Blocker>,
    milestones: Vec<Milestone>,
}

async fn load_reverify_snapshot(
    tx: &mut Transaction<'_, Postgres>,
    project_id: Uuid,
) -> AppResult<ReverifySnapshot> {
    let project = sqlx::query_as::<_, ProjectRecord>(
        r#"
        select
          id,
          name,
          stage,
          health,
          system_size_kw_dc::float8 as system_size_kw_dc,
          estimated_project_cost_usd::float8 as estimated_project_cost_usd,
          estimated_annual_savings_usd::float8 as estimated_annual_savings_usd,
          estimated_rebate_usd::float8 as estimated_rebate_usd,
          financing_type,
          ppa_term_years,
          target_cod,
          owner_name,
          created_at,
          updated_at
        from projects
        where id = $1
        "#,
    )
    .bind(project_id)
    .fetch_optional(&mut **tx)
    .await?
    .ok_or(AppError::ProjectNotFound)?;
    let evidence = sqlx::query_as::<_, (Uuid, String)>(
        "select id, evidence_type from evidence_documents where project_id = $1",
    )
    .bind(project_id)
    .fetch_all(&mut **tx)
    .await?;
    let blockers = sqlx::query_as::<_, Blocker>(
        r#"
        select id, project_id, category, severity, title, description, owner_name, status, created_at, resolved_at
        from blockers
        where project_id = $1
        order by
          case when status = 'open' then 0 else 1 end,
          case severity when 'high' then 0 when 'medium' then 1 else 2 end,
          coalesce(resolved_at, created_at) desc
        "#,
    )
    .bind(project_id)
    .fetch_all(&mut **tx)
    .await?;
    let milestones = sqlx::query_as::<_, Milestone>(
        "select id, project_id, milestone_type, status, planned_date, actual_date, owner_name, notes, created_at, updated_at from project_milestones where project_id = $1 order by planned_date nulls last, milestone_type",
    )
    .bind(project_id)
    .fetch_all(&mut **tx)
    .await?;

    Ok(ReverifySnapshot {
        project,
        evidence,
        blockers,
        milestones,
    })
}

async fn claims_for_reverify(
    tx: &mut Transaction<'_, Postgres>,
    project_id: Uuid,
    claim_types: &[&str],
) -> AppResult<Vec<Claim>> {
    Ok(sqlx::query_as::<_, Claim>(
        r#"
        select id, project_id, claim_text, claim_type, status, confidence::float8 as confidence, generated_by, created_at
        from claims
        where project_id = $1 and claim_type = any($2)
        order by created_at desc
        limit $3
        "#,
    )
    .bind(project_id)
    .bind(claim_types)
    .bind(MAX_REVERIFY_CLAIMS_PER_EVIDENCE_UPLOAD)
    .fetch_all(&mut **tx)
    .await?)
}

async fn update_reverified_claim(
    tx: &mut Transaction<'_, Postgres>,
    project_id: Uuid,
    actor: &str,
    claim: &Claim,
    evaluation: &claim_verification::ClaimEvaluation,
) -> AppResult<()> {
    sqlx::query("update claims set status = $1, confidence = $2 where id = $3")
        .bind(&evaluation.status)
        .bind(evaluation.confidence)
        .bind(claim.id)
        .execute(&mut **tx)
        .await?;

    sqlx::query("delete from claim_evidence_links where claim_id = $1")
        .bind(claim.id)
        .execute(&mut **tx)
        .await?;

    for evidence_id in &evaluation.evidence_ids {
        sqlx::query(
            "insert into claim_evidence_links (claim_id, evidence_id, support_type) values ($1, $2, 'supports') on conflict do nothing",
        )
        .bind(claim.id)
        .bind(evidence_id)
        .execute(&mut **tx)
        .await?;
    }

    sqlx::query(
        "insert into activity_events (id, project_id, event_type, actor, description, metadata) values ($1, $2, $3, $4, $5, $6)",
    )
    .bind(Uuid::new_v4())
    .bind(project_id)
    .bind("claim_reverified")
    .bind(actor)
    .bind(format!(
        "Claim reverified after evidence upload: {}",
        claim.claim_text
    ))
    .bind(json!({ "claim_id": claim.id, "status": evaluation.status }))
    .execute(&mut **tx)
    .await?;
    Ok(())
}

async fn automate_rebate_award_letter_tx(
    tx: &mut Transaction<'_, Postgres>,
    project_id: Uuid,
    evidence_type: &str,
    effective_date: Option<NaiveDate>,
    actor: &str,
) -> AppResult<()> {
    if evidence_type != "rebate_award_letter" {
        return Ok(());
    }

    let resolved_blockers = sqlx::query_as::<_, Blocker>(
        r#"
        update blockers
        set status = 'resolved',
            resolved_at = now()
        where project_id = $1
          and status = 'open'
          and category = 'missing_document'
          and (
            lower(title) like '%rebate_award_letter%'
            or lower(description) like '%rebate_award_letter%'
            or (
              (lower(title) like '%rebate%' or lower(description) like '%rebate%')
              and (lower(title) like '%award letter%' or lower(description) like '%award letter%')
            )
          )
        returning id, project_id, category, severity, title, description, owner_name, status, created_at, resolved_at
        "#,
    )
    .bind(project_id)
    .fetch_all(&mut **tx)
    .await?;

    for blocker in resolved_blockers {
        write_activity_tx(
            tx,
            project_id,
            "blocker_resolved",
            actor,
            &format!(
                "Blocker '{}' automatically resolved by rebate award letter upload.",
                blocker.title
            ),
            json!({
                "blocker_id": blocker.id,
                "status": blocker.status,
                "automation": "rebate_award_letter"
            }),
        )
        .await?;
    }

    let completed_milestones = sqlx::query_as::<_, (Uuid, String)>(
        r#"
        update project_milestones
        set status = 'complete',
            actual_date = coalesce(actual_date, $2, current_date),
            updated_at = now()
        where project_id = $1
          and milestone_type = 'rebate_award_received'
          and status <> 'complete'
        returning id, milestone_type
        "#,
    )
    .bind(project_id)
    .bind(effective_date)
    .fetch_all(&mut **tx)
    .await?;

    for (milestone_id, milestone_type) in completed_milestones {
        write_activity_tx(
            tx,
            project_id,
            "milestone_completed",
            actor,
            "Milestone 'rebate_award_received' automatically completed by rebate award letter upload.",
            json!({
                "milestone_id": milestone_id,
                "milestone_type": milestone_type,
                "status": "complete",
                "automation": "rebate_award_letter"
            }),
        )
        .await?;
    }

    Ok(())
}

fn matches_rebate_award_letter_blocker(category: &str, title: &str, description: &str) -> bool {
    if category != "missing_document" {
        return false;
    }

    let text = format!("{title} {description}").to_lowercase();
    text.contains("rebate_award_letter")
        || (text.contains("rebate") && text.contains("award letter"))
}

async fn recompute_project_health(pool: &PgPool, project_id: Uuid) -> AppResult<()> {
    let project = project_record(pool, project_id).await?;
    let evidence_types: Vec<String> = evidence_pairs(pool, project_id)
        .await?
        .into_iter()
        .map(|(_, evidence_type)| evidence_type)
        .collect();
    let blockers = blockers(pool, project_id).await?;
    let overdue_count = milestones(pool, project_id)
        .await?
        .into_iter()
        .filter(|m| is_overdue(m.planned_date, &m.status))
        .count()
        .try_into()
        .unwrap_or(0);
    let health = compute_project_health(&project.stage, &evidence_types, &blockers, overdue_count);

    sqlx::query("update projects set health = $1, updated_at = now() where id = $2")
        .bind(health)
        .bind(project_id)
        .execute(pool)
        .await?;
    Ok(())
}

async fn recompute_project_health_tx(
    tx: &mut Transaction<'_, Postgres>,
    snapshot: &ReverifySnapshot,
) -> AppResult<()> {
    let evidence_types: Vec<String> = snapshot
        .evidence
        .iter()
        .map(|(_, evidence_type)| evidence_type.clone())
        .collect();
    let overdue_count = snapshot
        .milestones
        .iter()
        .filter(|milestone| is_overdue(milestone.planned_date, &milestone.status))
        .count()
        .try_into()
        .unwrap_or(0);
    let health = compute_project_health(
        &snapshot.project.stage,
        &evidence_types,
        &snapshot.blockers,
        overdue_count,
    );

    sqlx::query("update projects set health = $1, updated_at = now() where id = $2")
        .bind(health)
        .bind(snapshot.project.id)
        .execute(&mut **tx)
        .await?;
    Ok(())
}

async fn lock_project_for_update_tx(
    tx: &mut Transaction<'_, Postgres>,
    project_id: Uuid,
) -> AppResult<()> {
    sqlx::query_scalar::<_, ()>(
        "select pg_advisory_xact_lock(hashtextextended($1::text, 0::bigint))",
    )
    .bind(project_id.to_string())
    .fetch_one(&mut **tx)
    .await?;
    Ok(())
}

async fn write_activity(
    pool: &PgPool,
    project_id: Uuid,
    event_type: &str,
    actor: &str,
    description: &str,
    metadata: serde_json::Value,
) -> AppResult<()> {
    sqlx::query(
        "insert into activity_events (id, project_id, event_type, actor, description, metadata) values ($1, $2, $3, $4, $5, $6)",
    )
    .bind(Uuid::new_v4())
    .bind(project_id)
    .bind(event_type)
    .bind(actor)
    .bind(description)
    .bind(metadata)
    .execute(pool)
    .await?;
    Ok(())
}

async fn write_activity_tx(
    tx: &mut Transaction<'_, Postgres>,
    project_id: Uuid,
    event_type: &str,
    actor: &str,
    description: &str,
    metadata: serde_json::Value,
) -> AppResult<()> {
    sqlx::query(
        "insert into activity_events (id, project_id, event_type, actor, description, metadata) values ($1, $2, $3, $4, $5, $6)",
    )
    .bind(Uuid::new_v4())
    .bind(project_id)
    .bind(event_type)
    .bind(actor)
    .bind(description)
    .bind(metadata)
    .execute(&mut **tx)
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::matches_rebate_award_letter_blocker;

    #[test]
    fn rebate_award_matcher_accepts_seed_missing_document_blocker() {
        assert!(matches_rebate_award_letter_blocker(
            "missing_document",
            "Rebate award letter missing",
            "Financing review cannot treat the rebate as secured until the award letter is uploaded.",
        ));
    }

    #[test]
    fn rebate_award_matcher_rejects_unrelated_missing_document_blocker() {
        assert!(!matches_rebate_award_letter_blocker(
            "missing_document",
            "Interconnection package not submitted",
            "The interconnection package is needed before installation readiness can be verified.",
        ));
    }

    #[test]
    fn rebate_award_matcher_rejects_non_document_risk_blocker() {
        assert!(!matches_rebate_award_letter_blocker(
            "rebate_risk",
            "Rebate award letter disputed",
            "The award letter exists but conflicts with underwriting terms.",
        ));
    }
}
