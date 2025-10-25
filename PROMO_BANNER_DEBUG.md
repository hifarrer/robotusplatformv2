# Promo Banner Debug Guide

## Current Implementation Status

✅ **Components Created:**
- `src/components/promo-banner.tsx` - Flashy modal component
- `src/hooks/use-promo-banner.ts` - Logic for credit detection and timing
- Integration in `src/components/chat-interface.tsx`

✅ **Features Implemented:**
- Credit threshold detection (≤30 credits)
- 15-minute timer logic
- LocalStorage dismissal tracking
- Debug logging and test buttons

## Debug Steps

### 1. Check Console Logs
Open browser console and look for these logs:
- `💰 [CREDITS] Fetched credits data:` - Shows current credit balance
- `🔄 [PROMO] Credits changed:` - Shows when credits change
- `🔍 [PROMO] Checking if should show banner:` - Shows decision logic
- `✅ [PROMO] Showing banner!` - Confirms modal should appear

### 2. Test Buttons Added
In the chat interface, you'll see two test buttons:
- **"Test Promo"** (Yellow) - Forces the modal to show immediately
- **"Clear"** (Red) - Clears dismissal history to reset timer

### 3. Manual Testing Steps

#### Option A: Use Test Button
1. Go to chat interface
2. Click "Test Promo" button
3. Modal should appear immediately

#### Option B: Test Credit Threshold
1. Temporarily change threshold in `src/hooks/use-promo-banner.ts`:
   ```typescript
   const CREDIT_THRESHOLD = 100 // Change from 30 to 100 for testing
   ```
2. Refresh the page
3. Modal should appear if you have <100 credits

#### Option C: Clear Dismissal History
1. Click "Clear" button to remove dismissal history
2. Refresh the page
3. Modal should appear if credits ≤30

### 4. Check Credit Balance
Look in console for:
```
💰 [CREDITS] Fetched credits data: { balance: 25, plan: {...} }
```

### 5. Verify Modal Logic
Console should show:
```
🔍 [PROMO] Checking if should show banner: {
  creditsData: 25,
  threshold: 30,
  shouldShow: true
}
✅ [PROMO] Showing banner!
```

## Common Issues & Solutions

### Issue 1: Modal Not Showing
**Possible Causes:**
- Credits > 30 (check console logs)
- Modal was dismissed recently (use "Clear" button)
- Credits not loaded yet (check loading state)

**Solutions:**
- Use "Test Promo" button to force show
- Check console for credit balance
- Wait for credits to load

### Issue 2: Modal Shows But Not Styled
**Possible Causes:**
- CSS not loaded
- Dialog component issues

**Solutions:**
- Check if other modals work (Help modal)
- Verify Tailwind classes are applied

### Issue 3: Timer Not Working
**Possible Causes:**
- localStorage issues
- Timer logic problems

**Solutions:**
- Use "Clear" button to reset
- Check browser localStorage
- Verify timer interval (15 minutes)

## Production Checklist

Before deploying, remove test buttons:
1. Remove test buttons from `src/components/chat-interface.tsx`
2. Change `CREDIT_THRESHOLD` back to 30
3. Remove debug console logs
4. Test with real credit scenarios

## Files to Check

- `src/components/promo-banner.tsx` - Modal component
- `src/hooks/use-promo-banner.ts` - Logic and timing
- `src/components/chat-interface.tsx` - Integration
- `src/contexts/credits-context.tsx` - Credit data
- Browser console - Debug logs

## Next Steps

1. Test with "Test Promo" button first
2. Check console logs for credit data
3. Verify modal appears and functions correctly
4. Test timer logic with "Clear" button
5. Remove test elements for production
