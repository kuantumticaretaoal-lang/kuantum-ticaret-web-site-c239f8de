# Reliability and security rules
- Use the guarded browserStorage adapter for app-owned preferences so blocked browser storage cannot crash the storefront; do not edit generated auth storage.
- Validate persisted JSON before it reaches React state because syntactically valid stale preferences may have the wrong shape.
- Isolate optional global widgets with error boundaries so a widget failure does not remove shopping routes.
- Recover stale lazy imports with at most one automatic reload per tab and a visible fallback; never clear auth or cart data to recover a page.