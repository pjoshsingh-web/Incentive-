# Incentive Builder

A Next.js, TypeScript, and Tailwind CSS prototype for designing sales incentive plans. No database, authentication, or external API is required.

## Development

Use Node.js 24 and npm 11:

```sh
npm ci --cache /workspace/.npm-cache --no-audit --no-fund
npm run dev
```

## Validation

```sh
npm test
npm run typecheck
npm run build
```

`npm start` runs the production build on port 3000. The overview, business profile, plan editor, guided setup, and simulator share local React state. Business profiles can be saved in browser local storage using Save profile or Save & continue (guided setup also saves them). Saved profiles reload after refreshing on the same browser and site. Plan and scenario changes last for the current session; export them as JSON to retain them. Profiles do not sync across devices, and clearing browser data removes them.

## Financial model

The incentive budget is an annual team-wide pool. KPI weights must total 100%. Below threshold, payout is zero. At or below target, the factor is attainment / target. Above target, it is 1 + (attainment - target) / target × accelerator. Each factor is capped at maximum payout / 100. Weighted factors multiply the pool and the final dollar payout is rounded once.

Revenue attainment proxies customer acquisition, retention, expansion, and team coverage in this prototype. Gross margin attainment is actual margin / target margin. Net contribution is gross profit less incentives; it does not include other operating costs. Recommendations are fixed advisory templates; no AI or paid API participates in calculations.
