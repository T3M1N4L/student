# Student · Finals

A focused final-exam calculator connected to StudentVUE. Uses the existing Student typography, rounded cards, neutral sidebar, and purple accents.

Choose a district by ZIP code or StudentVUE URL, sign in, select a class and grade mark, then explore how a final score changes the course grade. Set a target percentage to calculate the minimum exam score needed. Reporting periods, grade refresh, light/dark themes, and mobile layouts are supported.

## Development

Use Node.js 24 and npm 11. No environment variables are required for ordinary local development.

```sh
npm install --package-lock=false
npm run dev
```

In managed environments that require an outbound proxy, run with the inherited proxy and CA configuration:

```sh
NODE_USE_ENV_PROXY=1 npm run dev
```

Verification:

```sh
npm test
npm run lint
npm run typecheck
npm run build
npm start
```

## Grading assumptions

Final weight is detected only when the selected grade mark exposes one clearly named final-exam category in its grade-calculation summary. Category weights are normalized against all categories, including an ungraded final. The pre-final grade is recomputed from graded non-final categories, excluding an existing final score to avoid double-counting.

If the final weight is missing or ambiguous, the app asks for the syllabus weight rather than guessing. If the coursework grade cannot be reconstructed, it must also be entered manually. Select the appropriate semester/reporting period and grade mark; quarter-only data cannot establish a semester final weight. A final project is not assumed to be a final exam.

The calculator uses `coursework × (1 − weight) + final × weight`. It assumes remaining coursework is complete and the exam accounts for the entire final category. Results are estimates; district rounding, exemptions, multiple exams, and other grading policies may differ. Required scores are rounded upward to the next 0.01%; targets requiring more than 100% and finals with zero weight are identified explicitly.

## Authentication and connectivity

Credentials remain in React memory for the current tab and are sent only to this app's backend over the current connection, then to the selected district over HTTPS. They are never written to localStorage, sessionStorage, or repository files. Refreshing, signing out, or closing the tab clears the login. Use HTTPS when hosting.

District requests are stateless; changing reporting periods or refreshing grades authenticates again. Private/local district targets and redirects are rejected. Requests and responses containing grades are not cached.

ZIP search requires `support.edupoint.com`; grades require the selected district host. The supplied IPSD host currently returns HTTP 403 from this cloud instance, including its login API. Browser interaction tests used synthetic grade data; live account login and the district's actual final-weight schema remain unverified. The application displays connection failures without replacing real grades with sample grades.

This project is not affiliated with Edupoint or StudentVUE. Retains the original project's licensing terms.
