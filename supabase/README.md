# Supabase P0 Schema

Migration order:

1. `supabase/migrations/001_enable_extensions.sql`
2. `supabase/migrations/002_create_tables.sql`
3. `supabase/migrations/003_create_indexes.sql`
4. `supabase/migrations/004_enable_rls.sql`
5. `supabase/migrations/005_create_policies.sql`
6. `supabase/migrations/006_alter_paper_embeddings_vector_2048.sql`
7. `supabase/migrations/007_reset_paper_embeddings_to_1024.sql`
8. `supabase/migrations/008_add_semantic_scholar_fields.sql`

Validation:

- Run `supabase/tests/validation.sql` with psql variables for `OWNER_USER_ID` and `OTHER_USER_ID` after the migrations complete.
- The validation script seeds temporary data, checks the RLS policies, verifies uniqueness rules, and rolls the transaction back at the end.

Notes:

- `paper_embeddings.embedding` is fixed at `vector(1024)` for the current Zhipu embedding model request.
- Migration `007_reset_paper_embeddings_to_1024.sql` clears existing 2048-dimension rows so embeddings can be regenerated with 1024 dimensions and indexed with IVFFlat.
- `papers` is directly queryable in P0; field-level separation can move to a dedicated view later if needed.
- This repo does not keep local Supabase runtime config; apply migrations against the hosted project.
