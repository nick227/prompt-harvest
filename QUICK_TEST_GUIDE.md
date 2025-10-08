# 🚀 Quick Test Guide - Infinite Scroll Issue

## ⚡ TL;DR - Run This Now

```powershell
# Terminal 1: Start server
npm start

# Terminal 2: Run tests
.\scripts\test-infinite-scroll.ps1
```

**OR**

```bash
npm run test:infinite-scroll:headed
```

---

## 🎯 What This Tests

**Problem**: Only 10 images load instead of 68, blank space at bottom

**Tests Check**:
- ✅ Initial image count
- ❌ Blank space amount (current issue)
- 🔍 IntersectionObserver state
- 📡 Event firing (`lastImageVisible`)
- 🔄 Scroll pagination
- 📊 Complete loading

---

## 📊 What You'll See

### Terminal Output
```
⏱️ T+0s: Images=10, BlankSpace=600px, Loading=false
⏱️ T+1s: Images=10, BlankSpace=600px, Loading=false
⏱️ T+2s: Images=10, BlankSpace=600px, Loading=false
❌ ISSUE DETECTED: Loading stopped with 600px blank space
```

### Browser Window
- Actual homepage loading
- Visible blank space
- Image count in real-time

---

## 🔍 What It Will Tell Us

### Option A: Observer Not Working
```
hasObserver: false
→ Fix: setupIntersectionObserver()
```

### Option B: Wrong Element
```
observedTarget: null
→ Fix: updateIntersectionObserver()
```

### Option C: No Events
```
Total events captured: 0
→ Fix: Event wiring
```

### Option D: Wrong Calculation
```
Images=10, Blank=600px, thinks screen is filled
→ Fix: isElementInViewport()
```

---

## 📁 Files Created

```
tests/e2e/infinite-scroll.spec.js          # 7 comprehensive tests
playwright.config.infinite-scroll.js        # Test configuration
scripts/test-infinite-scroll.ps1           # Quick runner
tests/e2e/INFINITE_SCROLL_TESTING.md      # Full guide
docs/INFINITE_SCROLL_TEST_SETUP.md        # Setup docs
```

---

## 🎯 After Tests Run

1. **Check console** for exact failure
2. **Note Observer state**
3. **Count events**
4. **Fix the issue**
5. **Re-run tests**

---

## 💡 Quick Commands

```bash
# Run with visible browser
npm run test:infinite-scroll:headed

# Debug step-by-step
npm run test:infinite-scroll:debug

# Interactive UI
npm run test:infinite-scroll:ui

# View last report
npx playwright show-report playwright-report/infinite-scroll
```

---

## ✅ Success Looks Like

```
✅ Screen filled: BlankSpace=50px
✅ Events fired: 7 times
✅ Images loaded: 68 total
✅ All tests passed
```

---

**Now run the tests and let's fix this! 🎉**

