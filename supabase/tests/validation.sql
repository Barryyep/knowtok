begin;

set local role service_role;

insert into public.papers (
  id,
  title,
  abstract,
  source,
  doi,
  raw_url,
  tags,
  published_at,
  title_hash,
  ingest_status,
  embedding_status,
  summary_status,
  hook_status,
  quality_status,
  metadata
)
values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Sample paper',
  'Sample abstract',
  'arxiv',
  '10.1000/test-doi',
  'https://arxiv.org/abs/1234.5678',
  '["ai","biology"]'::jsonb,
  now(),
  'sample-paper-hash',
  'processed',
  'completed',
  'completed',
  'completed',
  'active',
  '{"entry_id":"1234.5678"}'::jsonb
);

insert into public.paper_embeddings (paper_id, model, embedding)
values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'zhipu-embedding-test',
  ('[' || array_to_string(array_fill('0.001'::text, array[1024]), ',') || ']')::vector
);

insert into public.hook_cache (
  paper_id,
  user_profile_hash,
  hook_text,
  plain_summary,
  template_id,
  confidence,
  source_refs
)
values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'generic_zh_cn',
  '这项研究解释了一个大众可感知的新发现。',
  '研究展示了一个可理解的结论。',
  'default_v1',
  0.820,
  '[{"text":"Sample abstract","section":"abstract","rank":1}]'::jsonb
);

insert into public.audit_logs (
  event_type,
  entity_type,
  entity_id,
  provider,
  model,
  payload_hash,
  status,
  meta
)
values (
  'embedding_generated',
  'paper',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'zhipu',
  'zhipu-embedding-test',
  'payload-hash-1',
  'success',
  '{"latency_ms":123}'::jsonb
);

reset role;

set local role anon;
select set_config('app.owner_user_id', :'OWNER_USER_ID', true);
select set_config('app.other_user_id', :'OTHER_USER_ID', true);

do $$
declare
  paper_count integer;
begin
  select count(*) into paper_count
  from public.papers
  where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  if paper_count <> 1 then
    raise exception 'Anon users should be able to read active papers.';
  end if;
end;
$$;

do $$
begin
  begin
    insert into public.feedback (user_id, paper_id, feedback_type)
    values (current_setting('app.owner_user_id')::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'useful');
    raise exception 'Anon users should not be able to insert feedback.';
  exception
    when insufficient_privilege then null;
    when others then
      if sqlstate <> '42501' then
        raise;
      end if;
  end;
end;
$$;

reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', :'OWNER_USER_ID', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

insert into public.feedback (user_id, paper_id, feedback_type, comment)
values (
  :'OWNER_USER_ID',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'useful',
  'helpful'
);

do $$
declare
  feedback_count integer;
begin
  select count(*) into feedback_count
  from public.feedback
  where user_id = current_setting('app.owner_user_id')::uuid;

  if feedback_count <> 1 then
    raise exception 'Authenticated user should be able to read own feedback.';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', :'OTHER_USER_ID', true);

do $$
declare
  feedback_count integer;
  updated_rows integer;
begin
  select count(*) into feedback_count
  from public.feedback
  where user_id = current_setting('app.owner_user_id')::uuid;

  if feedback_count <> 0 then
    raise exception 'Authenticated users should not be able to read other users'' feedback.';
  end if;

  update public.feedback
  set comment = 'should not update'
  where user_id = current_setting('app.owner_user_id')::uuid;

  get diagnostics updated_rows = row_count;
  if updated_rows <> 0 then
    raise exception 'Authenticated users should not be able to update other users'' feedback.';
  end if;
end;
$$;

reset role;

set local role service_role;

do $$
begin
  begin
    insert into public.papers (
      title,
      abstract,
      source,
      doi,
      raw_url,
      tags,
      published_at,
      title_hash
    )
    values (
      'Duplicate doi',
      'Another abstract',
      'arxiv',
      '10.1000/test-doi',
      'https://arxiv.org/abs/9999.9999',
      '[]'::jsonb,
      now(),
      'duplicate-doi-hash'
    );
    raise exception 'Duplicate DOI insert should fail.';
  exception
    when unique_violation then null;
  end;
end;
$$;

do $$
begin
  begin
    insert into public.papers (
      title,
      abstract,
      source,
      raw_url,
      tags,
      published_at,
      title_hash
    )
    values (
      'Duplicate title hash',
      'Another abstract',
      'arxiv',
      'https://arxiv.org/abs/1111.1111',
      '[]'::jsonb,
      now(),
      'sample-paper-hash'
    );
    raise exception 'Duplicate source/title_hash insert should fail.';
  exception
    when unique_violation then null;
  end;
end;
$$;

insert into public.paper_embeddings (paper_id, model, embedding)
values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'zhipu-embedding-test',
  ('[' || array_to_string(array_fill('0.002'::text, array[1024]), ',') || ']')::vector
)
on conflict (paper_id, model)
do update set embedding = excluded.embedding;

do $$
declare
  embedding_count integer;
begin
  select count(*) into embedding_count
  from public.paper_embeddings
  where paper_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    and model = 'zhipu-embedding-test';

  if embedding_count <> 1 then
    raise exception 'Embedding upsert should keep a single row per paper/model.';
  end if;
end;
$$;

rollback;
