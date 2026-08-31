# THE OPEN WORLD — Release Notes v0.105.0

**Release Date:** August 31, 2026

## Summary
Vehicle ownership is deeper and the city feels busier. v0.105.0 adds fuel, registration, mods, impound risk, and towing to every vehicle, plus 8 new city-life random events that trigger while exploring.

## What's New
- **Fuel system** — vehicles now have a tank and MPG. Buy fuel with `fuel [vehicle]`.
- **Registration & inspection** — register vehicles for 365 days to avoid impound.
- **Impound risk** — unregistered/uninspected vehicles gain impound risk while driving.
- **Vehicle customization** — install tint, spoiler, paint, rims, exhaust, suspension, turbo, or stereo.
- **Emergency towing** — recover an immobilized vehicle with `tow [vehicle]`.
- **8 new random events:**
  - Parking Ticket
  - Charity Fundraiser
  - Protest March
  - Food Truck Discovery
  - Tech Demo Booth
  - Lost Pet Poster
  - Rooftop Party Invite
  - Free Sample Day

## Improved Commands
- Added: `fuel`, `refuel`, `register`, `customize`, `tow`, `emergency`.
- Updated: `help`, `vehicles`, `inspect`, `buy vehicle`, `service`, `maintain`, `repair`.

## Validation
- `npm run type-check` passed.
- `npm run build` passed.
- `devvit playtest` launched.
- `devvit publish --public --bump minor` submitted v0.105.0 for review.

## Next Up
- Persistent server-side quest chains and city-specific storylines.
