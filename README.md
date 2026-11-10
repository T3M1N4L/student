# Student · Finals

A focused final-exam calculator connected to StudentVUE. Uses locally hosted Geist, a pure black AMOLED background, and minimal monochrome controls.

Choose a district by ZIP code or StudentVUE URL, sign in, select a class and grade mark, then explore how a final score changes the course grade. Set a target percentage to calculate the minimum exam score needed. Reporting periods, grade refresh, and mobile layouts are supported.

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

The current grade is read-only and uses the district's reported numerical mark (including zero); category totals are a fallback only if that mark is absent. The last grade mark is selected initially, matching the original app. Summary rows such as `TOTAL` are excluded; split final components are combined (for example, 10% reading + 5% writing + 5% speaking = 20%). A final's explicit percentage is used directly, never rescaled against unrelated coursework categories. Unitless weights must total 100 before they are treated as percentages; ambiguous ratios are not automatically converted.

If the final weight is missing or ambiguous, the app asks for the syllabus weight rather than guessing. If the final is already graded, the calculator removes its contribution from the official current grade. The category model must agree with the reported grade before an existing final can be replaced; otherwise projections are disabled. Missing coursework grades cannot be entered manually. Select the appropriate semester/reporting period and grade mark; quarter-only data cannot establish a semester final weight. A final project is not assumed to be a final exam.

The calculator uses `coursework × (1 − weight) + final × weight`. It assumes remaining coursework is complete and the exam accounts for the entire final category. Results are estimates; district rounding, exemptions, multiple exams, and other grading policies may differ. Required scores are rounded upward to the next 0.01%; targets requiring more than 100% and finals with zero weight are identified explicitly.

## Authentication and connectivity

Credentials remain in React memory for the current tab and are sent only to this app's backend over the current connection, then to the selected district over HTTPS. They are never written to localStorage, sessionStorage, or repository files. Refreshing, signing out, or closing the tab clears the login. Use HTTPS when hosting.

District requests are stateless; changing reporting periods or refreshing grades authenticates again. Private/local district targets and redirects are rejected. Requests and responses containing grades are not cached.

ZIP search requires `support.edupoint.com`; grades require the selected district host. Direct IPSD requests return HTTP 403 from this cloud instance. A user-authorized CORSfix proxy test successfully authenticated and retrieved the live gradebook; its summary rows and split-final schema were verified. Browser interaction tests use synthetic data. Public proxies are used only for the one-off diagnostic, not by the application. The application displays connection failures without replacing real grades with sample grades.

This project is not affiliated with Edupoint or StudentVUE. Retains the original project's licensing terms.
