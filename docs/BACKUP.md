# Backup & Disaster Recovery Strategy — Smart HRMS

## Recommended: Supabase Point-in-Time Recovery (PITR)

PITR enables recovery to any second within the retention window. Critical for
compliance (ISO 27001, UU PDP).

- **RPO (Recovery Point Objective):** <1 second
- **RTO (Recovery Time Objective):** ~30 minutes (PITR restore + DNS switch)
- **Retention:** 7 days minimum; 28 days recommended for ISO 27001
- **Plan:** Supabase Team or Enterprise plan (paid feature)

## Fallback (minimal): Daily Backup + Audit Event Log

If PITR is not available:

1. **Supabase daily backups** — default on all plans. Max 1 backup/day,
   RPO = 24 hours (worst case: lose entire day's attendance data).

2. **`_audit.ts` event log** — append-only record of all sensitive operations
   (check-in/check-out, face registration, leave approval, overtime, deletion
   requests). Stored in `audit_logs` table. Can be used to reconstruct lost
   events between backups.

3. **Manual export** — `exportMyData()` server action for individual user data
   portability. Not a backup mechanism but provides partial recovery path.

## Data Classification

| Data | Sensitivity | Backup priority |
|---|---|---|
| Face descriptors (biometric) | High | Must back up |
| Attendance records | Medium | Must back up |
| Leave/overtime records | Medium | Back up |
| Selfie images | High | Back up (encrypted at app level) |
| Audit logs | Medium | Back up (for compliance reconstruction) |
| Notifications | Low | Optional |

## Test Restore Drill

Run quarterly:
1. Restore to a temporary Supabase project
2. Verify all tables exist, RLS policies intact
3. Verify encrypted selfie images decrypt correctly with `FACE_ENCRYPTION_KEY`
4. Verify face descriptors match user accounts

## Retention Policy (UU PDP Compliance)

- Attendance data: retain 5 years (tax/audit requirement)
- Face biometric data: delete on employee exit (legal max 1 year after exit)
- Audit logs: retain 7 years
- Notifications: purge after 90 days

---

**Action for production:** Enable PITR in Supabase dashboard → Settings →
Database → Point-in-Time Recovery → Toggle on.
