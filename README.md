# meddiagnose-web

React web dashboard for the MedDiagnose platform. Provides a full-featured interface for patients, doctors, and admins to manage diagnoses, patients, insurance, and more.

## Tech Stack

- **Framework**: React 19 + TypeScript
- **Build**: Vite 7
- **Styling**: Tailwind CSS 4
- **Charts**: Recharts
- **Icons**: Lucide React
- **Routing**: React Router DOM 7
- **HTTP**: Axios

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev
# Opens at http://localhost:5173

# 3. Build for production
npm run build

# 4. Preview production build
npm run preview
```

## Pages

| Page | File | Description |
|------|------|-------------|
| Dashboard | `Dashboard.tsx` | Overview with stats and recent activity |
| New Diagnosis | `NewDiagnosisPage.tsx` | Upload reports + symptoms for AI diagnosis |
| Diagnoses | `DiagnosesPage.tsx` | List and review all diagnoses |
| Patients | `PatientsPage.tsx` | Patient management |
| Analytics | `AnalyticsPage.tsx` | Diagnosis analytics and trends |
| Monitoring | `MonitoringPage.tsx` | System health monitoring |
| Insurance | `InsurancePage.tsx` | Policy and claims management |
| Fitness Tracker | `FitnessTrackerPage.tsx` | Wearable/fitness data |
| Health Tracker | `HealthTrackerPage.tsx` | Health metrics over time |
| Medication Lookup | `MedicationLookupPage.tsx` | Drug search and information |
| Pharmacy Locator | `PharmacyLocatorPage.tsx` | Find nearby pharmacies |
| My Doctor | `MyDoctorPage.tsx` | Linked doctor profile |
| Users | `UsersPage.tsx` | Admin user management |
| Login | `Login.tsx` | Authentication |
| Register | `Register.tsx` | New account registration |
| Onboarding | `OnboardingPage.tsx` | First-time user setup |

## Environment Variables

Create a `.env.local` file:

```env
VITE_API_BASE_URL=http://localhost:8000
```

## Internationalization

Supports 11 languages via built-in i18n translations.

## Related Repos

- [meddiagnose-api](https://github.com/AngadBindra46/meddiagnose-api) -- Backend API
- [meddiagnose-mobile](https://github.com/AngadBindra46/meddiagnose-mobile) -- Mobile app
