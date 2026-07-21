# Prisma seed

Seed data is grouped by responsibility so each dataset can be run and maintained independently.

```text
prisma/
  seed.ts                         Prisma CLI entrypoint
  seeds/
    core/seed.ts                  roles, users, skills, base configuration
    shared/database.ts            shared Prisma connection and seed admin lookup
    skills/
      grammar-vocabulary/         source catalog and full-set seed
      listening/                  full-set seed
      reading/                    source catalog and full-set seed
      writing/                    source catalog and full-set seed
      speaking/                   source catalog, full-set seed and P2 sample
    part-practice/
      catalog.ts                  full-set sources and expected part counts
      seed.ts                     PART_PRACTICE generator and verifier
    mock-tests/
      seed.ts                     three full five-skill MOCK_TEST exams
```

## Commands

```bash
npm run db:seed:core
npm run db:seed:grammar-vocabulary
npm run db:seed:listening
npm run db:seed:reading
npm run db:seed:writing
npm run db:seed:speaking
npm run db:seed:part-practice
npm run db:seed:mock-tests
npm run db:seed:all
```

Run the full-set seeds before `db:seed:part-practice`. The part-practice seed creates one aggregated practice exam for each skill Part. Each exam contains the unique questions collected from that Part across all seeded full sets:

| Skill                | Source full sets |  Parts | Part-practice exams |
| -------------------- | ---------------: | -----: | ------------------: |
| Grammar & Vocabulary |                3 |      2 |                   2 |
| Listening            |               15 |      4 |                   4 |
| Reading              |                5 |      5 |                   5 |
| Writing              |               40 |      4 |                   4 |
| Speaking             |               12 |      4 |                   4 |
| **Total**            |           **75** | **19** |              **19** |

The generator reuses the existing `question_bank` rows through `exam_part_questions`. If the same question row appears in more than one source full set, it is included only once in the aggregated Part. Existing media URLs are reused, so it does not duplicate questions or upload audio, image, or video files again.

The seed is idempotent for records carrying its seed marker. It refuses to overwrite an unrelated exam that happens to use the same deterministic title. Diagnostic modes:

```bash
npm run db:seed:part-practice -- --dry-run
npm run db:seed:part-practice -- --verify-only
```

## Mock tests

`db:seed:mock-tests` creates three complete Aptis mock tests. Mock test 01 uses full set 01 from each skill, mock test 02 uses full set 02, and mock test 03 uses full set 03. Each mock test has five sections and 19 parts in total. Questions and media are reused from the source full sets.

```bash
npm run db:seed:mock-tests -- --dry-run
npm run db:seed:mock-tests -- --verify-only
```
