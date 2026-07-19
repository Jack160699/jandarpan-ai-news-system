# Production Verification

Status: pending after deploy READY.

Checklist:

- [ ] ≥2 dedicated `editorial-generate` runs on new SHA
- [ ] Job results show `generated > 0` and/or `candidatePool.resolvable > 0`
- [ ] `no_signals` / dangling skip rate on eligible processed jobs &lt; 20% (or obsolete quarantined separately)
- [ ] ≥1 new generated story via repaired path
- [ ] Queue depth / oldest pending improve without feeder stop
- [ ] No untitled / duplicate flood
- [ ] Reader site remains available
