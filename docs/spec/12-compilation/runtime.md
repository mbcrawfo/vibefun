# Runtime Type Checking

### Runtime Type Checking

Optional runtime type checking at FFI boundaries:

```bash
vibefun compile main.vf --runtime-checks=ffi     # Only FFI boundaries
vibefun compile main.vf --runtime-checks=all     # All type assertions
vibefun compile main.vf --runtime-checks=none    # No runtime checks (production)
```

---

