create policy "papers_are_publicly_readable"
on public.papers
for select
to anon, authenticated
using (
  quality_status = 'active'
  and retracted_at is null
);

create policy "users_can_insert_own_feedback"
on public.feedback
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "users_can_select_own_feedback"
on public.feedback
for select
to authenticated
using (auth.uid() = user_id);

create policy "users_can_update_own_feedback"
on public.feedback
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "users_can_delete_own_feedback"
on public.feedback
for delete
to authenticated
using (auth.uid() = user_id);
