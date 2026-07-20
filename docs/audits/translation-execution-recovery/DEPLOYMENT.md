# Deployment — Step 2

| Field | Value |
|---|---|
| Commit | `bec66aeab82882fe95c61e7a5af5b925bcf0f9b0` |
| Message | `fix(translation): restore reliable bilingual translation execution` |
| Deployment ID | `dpl_CsVQ9gRKXGeBGTyHsPo97R6VgHBn` |
| State | **READY** |
| Production aliases | www.jandarpan.news, jandarpan.news, newspaper-motion.vercel.app |
| Release marker | `jan-darpan@bec66aeab828` |
| Migration | none |
| Rollback branch | `backup/before-translation-execution-recovery` @ `557f9b5` |
| Pre-fix production | `dpl_E9ZozUVocJiDtN55xtGT8JNKS4n6` @ `557f9b5` |
| Scheduler | `10,40 * * * *` → `/api/cron/translation-backfill` |
