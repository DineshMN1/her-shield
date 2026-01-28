# Health SOS Project Overview

## Running Services

| Service | URL | Status |
|---------|-----|--------|
| **Web App** | http://localhost:3000 | Running |
| **API Server** | http://localhost:4000 | Running |
| **PostgreSQL** | localhost:5432 | Running (Docker) |
| **Redis** | localhost:6379 | Running (Docker) |

## Project Overview

This is a **maternal healthcare PWA** with:

- **SOS Emergency Alerts** - location-based emergency system
- **Telemedicine** - video consultations with doctors
- **AI Assistant** - symptom analysis using Google Gemini
- **Health Tracking** - pregnancy monitoring, vitals
- **Appointment Booking** - scheduling system

## Key Files to Explore

- `apps/web/app/page.tsx` - Landing page
- `apps/web/app/dashboard/` - Patient dashboard
- `apps/web/app/sos/` - Emergency SOS feature
- `services/api/src/` - NestJS backend

## Critical Missing Features

### 1. Appointments Module (CRITICAL - NOT IMPLEMENTED)
- No API endpoints exist for appointments
- Frontend pages call non-existent endpoints:
  - `GET /api/v1/appointments`
  - `POST /api/v1/appointments`
- **Files**: `services/api/src/` - Missing AppointmentsModule entirely

### 2. Video Call Implementation (CRITICAL - INCOMPLETE)
- **File**: `apps/web/app/video/[id]/page.tsx:55` - Has `// TODO: Implement WebRTC connection`
- Only captures local video, no peer connection
- Remote video never displays
- Agora SDK not integrated on frontend

### 3. Hospital/Doctor Service (STUBBED)
- **File**: `services/api/src/hospitals/hospitals.service.ts`
- All methods return empty arrays or mock data
- Doctor search doesn't work

### 4. Health Metrics Endpoints (MISSING)
- **File**: `apps/web/app/health/page.tsx` calls endpoints that don't exist:
  - `GET /api/v1/health/metrics`
  - `GET /api/v1/health/devices`
  - `POST /api/v1/health/devices/connect`

### 5. User Profile/Settings API (MISSING)
- **File**: `apps/web/app/settings/page.tsx`
- No endpoints for:
  - `PUT /api/v1/users/profile`
  - `PUT /api/v1/users/settings`
  - Password change

### 6. Notification Processor (EMPTY)
- **File**: `services/api/src/jobs/notification.processor.ts:6-10`
- Just logs and returns `{success: true}` - does nothing

---

## Security Vulnerabilities

| Issue | File | Risk |
|-------|------|------|
| Hardcoded JWT secret | `.env:5` | Token compromise |
| No input validation | `auth.service.ts:14`, `sos.controller.ts:11` | Injection attacks |
| No rate limiting on auth | `app.module.ts` | Brute force |
| Weak password requirements | `register/page.tsx:31` | Only checks length ≥ 8 |
| localStorage unencrypted | `dashboard/page.tsx:22` | Data exposure |
| Missing input sanitization | `settings/page.tsx:113-143` | XSS possible |

---

## UI/UX Issues

1. **Dashboard shows fake data** - `apps/web/app/dashboard/page.tsx:96-110`
   - Hardcoded pregnancy week (24), medications, appointments

2. **Video call page incomplete**
   - No remote video display
   - Chat button has no handler
   - No call timer or end call confirmation

3. **Health page non-functional**
   - Device connection doesn't work
   - Hardcoded activity timeline

4. **Missing loading states** throughout the app

5. **Accessibility issues** - Missing ARIA labels, alt text

---

## Backend Gaps

| Resource | Status |
|----------|--------|
| Appointments | MISSING |
| Health Metrics | MISSING |
| User Profile Updates | MISSING |
| Password Change | MISSING |
| Hospital Management | STUBBED |
| Upload to S3 | NOT IMPLEMENTED |

---

## Database Schema Issues

- `Appointment` model missing `type` field (CLINIC vs VIDEO)
- `DoctorProfile` missing `availableSlots` for scheduling
- `AppointmentStatus` missing `PENDING` enum value
- No soft deletes (`deletedAt` field) for compliance
- Missing indexes on frequently queried combinations

---

## Integration Issues

| Service | Status |
|---------|--------|
| Agora Video | Token generation works, frontend integration missing |
| Twilio SMS/WhatsApp | Half-implemented, no delivery tracking |
| OneSignal Push | Component exists but not imported |
| Google AI | Basic, no conversation history |
| AWS S3 | Configured but never used |

---

## Recommended Priority Order

### Phase 1 - Critical (Core Features)
1. [ ] Implement Appointments Module (controller, service, endpoints)
2. [ ] Complete Video Call WebRTC implementation
3. [ ] Fix Hospital/Doctor service with real data

### Phase 2 - Security
4. [ ] Add input validation DTOs (class-validator)
5. [ ] Implement proper JWT secret management
6. [ ] Add rate limiting on auth endpoints
7. [ ] Input sanitization

### Phase 3 - Core Features
8. [ ] Health Metrics endpoints
9. [ ] User Profile/Settings endpoints
10. [ ] Notification processor implementation

### Phase 4 - Polish
11. [ ] Replace hardcoded dashboard data
12. [ ] Add loading states
13. [ ] Accessibility improvements
14. [ ] Error handling improvements
