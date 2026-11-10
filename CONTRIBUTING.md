# Contributing

See README.md for installation, grading assumptions, and connectivity requirements.

Run `npm test`, `npm run lint`, `npm run typecheck`, and `npm run build` before submitting changes. Calculation and normalization tests live in `tests/finals.test.ts`. Keep real credentials and student records out of fixtures, logs, screenshots, and commits.

The app intentionally focuses on district sign-in and final-exam planning. Preserve the distinction between district-provided grades, detected weights, and manual what-if inputs. Never infer a final weight from the category name alone, assume a district-wide default, or count an already-graded final twice.
