# Kinnect

**Continuity of elderly care, whether they use a smartphone or not.**

Kinnect is a web app that helps families coordinate medication and appointments for elderly patients. It also records who confirmed what, and when.

**Live demo:** https://kinnect-kohl.vercel.app

## The problem

- Families often don't know if a dose was really taken.
- Many elderly patients don't use a smartphone.
- Nobody can see who confirmed a dose or an appointment.

## Roles

- **Family Member:** main controller. Creates patients and caretakers.
- **Caretaker:** a helper the family authorises. Access can be switched off.
- **Patient:** sees today's medicines and confirms them with one tap.

## Key features

- **Two patient modes:** Independent and Assisted Care.
- **Family-controlled caretaker access.**
- **Medications:** name, strength and dosage are locked after creation. Only the time can change.
- **Daily dose confirmation:** a dose record is created only when it is confirmed. Nothing is ever marked "missed".
- **Appointments** with attendance confirmation.
- **Audit trail:** every confirmation writes a log entry that cannot be edited or deleted.

## Security

- The confirmer's identity comes from the logged-in session. The Security Rules check it.
- Anyone can sign up only as a Family Member.
- Caretaker access needs `active == true`.
- Doses and activity logs are create-only.
- A dose, its log entry and its notification are saved in one atomic batch.
- Users of one family cannot read another family's data.

## Tech stack

- React, TypeScript, Vite
- Tailwind CSS v4
- Firebase Authentication
- Cloud Firestore with Security Rules
- Vitest and the Firebase emulator for tests
- Vercel for hosting
- lucide-react icons, Plus Jakarta Sans and Atkinson Hyperlegible fonts

## Accessibility

- Visible labels on all inputs.
- Skip link and logical focus order.
- Strong colour contrast and a clear focus ring.
- Toasts use `role="status"` and `role="alert"`.
- Large touch targets (56px on the patient screen).
- Lighthouse accessibility score: 100 on the gateway page.

## Run it locally

1. Install Node 20.19+ or 22.
2. Install packages:

   ```
   npm install
   ```

3. Copy `.env.example` to `.env` and fill in your own Firebase web app values.
4. Start the app:

   ```
   npm run dev
   ```

## Environment variables

Set these in `.env` locally and in Vercel for the live site:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_USE_EMULATOR` (`false` for the real project)

Never commit `.env`.

## Tests

- Unit tests (no emulator needed):

  ```
  npm test
  ```

- Security Rules tests (use the Firestore emulator on port 8085):

  ```
  npm run test:rules
  ```

- Production build check:

  ```
  npm run build
  ```

The rules tests cover forged confirmer identity, inactive caretakers, other families, locked medication fields, changing or deleting doses and logs, and double confirmation.

## Deploy

1. Create a Firebase project. Turn on Email/Password sign-in and create Firestore.
2. Deploy the rules:

   ```
   npx firebase deploy --only firestore:rules
   ```

3. Import the repo in Vercel and add the environment variables above.
4. Add the Vercel domain in Firebase Authentication, under Settings, then Authorized domains.

## Project structure

- `src/views`: gateway, dashboard and patient screens
- `src/services`: Firebase logic (auth, patients, medications, appointments, confirmations, audit)
- `src/contexts`: auth state
- `src/components/common`: shared UI parts
- `tests/unit` and `tests/rules`: tests
- `firestore.rules`: Security Rules

## Known limitations

- The one-click "Load Sample Data" demo mode does not work on the live site yet. Use **Create account** instead.
- The dashboard is an early version. [Update this line to match what works when you submit.]
- Only once-daily medications are supported.
- No browser reminders, and no Cloud Functions (Firebase free plan).

## Author

Built by Bidushree Patra for the CATALYST Solo AI Hackathon by Makers Need More (MnM) and PromptWars.
