# Security Specification: Ecclesia

## 1. Data Invariants
- A `Member` must have a `fullName`.
- Spiritual status fields (`isBaptized`, `hasHolySpiritSeal`) must be booleans.
- Dates must be valid strings.
- `FinancialRecord` must have a type (`income` or `expense`) and a non-negative amount.
- `Relationship` must link two valid `memberId`s.
- Only the Admin (`jfsanmartinp@gmail.com`) can write data for now, reflecting the "management" nature of the request.

## 2. The Dirty Dozen Payloads

### Member Payloads
1. **P1 (Identity Spoof):** Create member with `ownerId` of another user. (Denied by `isAdmin`)
2. **P2 (Invalid Type):** `isBaptized: "yes"` instead of `boolean`. (Denied by `isValidMember`)
3. **P3 (Size Attack):** `fullName` with 1MB of text. (Denied by `.size()`)
4. **P4 (Omitted Required):** Create member without `fullName`. (Denied by `hasAll`)

### Financial Records
5. **P5 (Negative Amount):** `amount: -100`. (Denied by `amount >= 0`)
6. **P6 (Invalid Type):** `type: "theft"`. (Denied by `enum`)
7. **P7 (System Field Tamper):** Update `createdAt` of a record. (Denied by immutability check)

### Relationships
8. **P8 (Self-Relationship):** `memberId1` == `memberId2`. (Denied by `memberId1 != memberId2`)
9. **P9 (Orphaned Link):** Relationship to non-existent `memberId`. (Denied by `exists()`)

### General
10. **P10 (Unverified Access):** Access as unverified user. (Denied by `email_verified`)
11. **P11 (Unauthorized Scape):** List all members without being Admin. (Denied by `isAdmin`)
12. **P12 (Shadow Update):** Update member with `isVerifiedInternally: true` (a field not in schema). (Denied by `affectedKeys().hasOnly`)

## 3. Test Runner Concept (firestore.rules.test.ts)
```typescript
// Pseudocode for verification
test('P1: Deny identity spoofing', async () => {
  const db = authedDb({ uid: 'attacker', email: 'attacker@evil.com' });
  await assertFails(addDoc(collection(db, 'members'), { fullName: 'John', ownerId: 'other' }));
});
// ... and so on for all 12
```
