# Debugging Guide: Opportunities Cell Editing Issue

## Problem Summary

Error: `PGRST204 - Could not find the 'companyName' column of 'opportunities' in the schema cache`

## Root Cause

The issue occurs due to inconsistent field naming between the frontend (camelCase) and database (snake_case), specifically with the company field.

## Solutions Implemented

### 1. Fixed Field Mapping in `useOpportunitiesRows.ts`

- Added comprehensive field mapping from camelCase to snake_case
- Added handling for both `company` and `companyName` fields
- Enhanced data type conversion for revenue and dates

### 2. Improved Data Processing

- Added both `company` and `companyName` fields when loading from database
- Enhanced column detection for direct vs JSONB field updates

### 3. Enhanced Error Recovery

- Implemented optimistic updates with automatic rollback on failure
- Better error messages with detailed logging

## How to Debug

### Step 1: Check Database Schema

Verify the opportunities table exists with correct columns:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'opportunities';
```

Expected columns:

- `company_name` (text) - NOT `companyName`
- `close_date` (date) - NOT `closeDate`
- `original_contact_id` (uuid) - NOT `originalContactId`

### Step 2: Test Cell Editing

1. Go to `/dashboard/opportunities`
2. Scroll to bottom (development mode only)
3. Click "Test Cell Edit" button
4. Check console for detailed logs

### Step 3: Monitor Network Requests

1. Open DevTools → Network tab
2. Edit any cell in opportunities grid
3. Look for POST requests to Supabase
4. Check request payload for field names

### Step 4: Check Store State

```javascript
// In browser console:
const state = window.__ZUSTAND_DEV__.getState()
console.log('Opportunities Cache:', state.opportunitiesCache)
console.log('Opportunities Loading:', state.opportunitiesLoading)
```

## Common Issues & Fixes

### Issue 1: Field Name Mismatch

**Symptom**: `PGRST204` error with column name
**Fix**: Ensure field mapping is correct in `useOpportunitiesRows.ts`

### Issue 2: Data Type Conversion

**Symptom**: Values not saving correctly (e.g., revenue as string)
**Fix**: Check data type conversion in `updateCell` function

### Issue 3: Store Not Updating

**Symptom**: UI doesn't reflect changes
**Fix**: Verify optimistic updates are working in `handleCellChange`

## Debugging Commands

### Check Current Field Mappings

```javascript
// In opportunities page console:
const opportunitiesRows = window.__OPPORTUNITIES_ROWS__
console.log('Field mapping:', opportunitiesRows?.fieldMapping)
```

### Test Direct Database Update

```javascript
// Test direct Supabase update:
const { supabase } = window.__SUPABASE__
await supabase
  .from('opportunities')
  .update({ company_name: 'Test Company' })
  .eq('id', 'your-opportunity-id')
  .eq('user_id', 'your-user-id')
```

### Check Store Consistency

```javascript
// Verify store vs database consistency:
const state = window.__ZUSTAND_DEV__.getState()
const opportunities = state.opportunitiesOrderedIds.map(id => state.opportunitiesCache[id])
console.log('Store opportunities:', opportunities)
```

## Verification Steps

1. ✅ Database table exists with correct schema
2. ✅ Field mapping covers all camelCase → snake_case conversions
3. ✅ Data type conversions work (revenue, dates)
4. ✅ Optimistic updates provide immediate UI feedback
5. ✅ Error recovery reverts failed changes
6. ✅ Test suite passes all cell edit tests

## If Issues Persist

1. Check migration status: `supabase db push`
2. Verify RLS policies allow updates
3. Confirm user authentication is working
4. Check network connectivity to Supabase
5. Review Supabase logs for detailed error messages
