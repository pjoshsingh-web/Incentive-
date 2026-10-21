# Incentive Builder

A Next.js, TypeScript and Tailwind CSS general incentive workspace. Manage multiple company profiles, individual job plans, department pools, custom metrics, and department operating expense scenarios. Includes trucking templates across fleet operations, maintenance, safety, sales, finance, recruiting, leadership and warehouse roles. Any job title and metric can be customized.

## Run locally

Node.js 24 and npm 11 are supported:

```sh
npm ci --cache /workspace/.npm-cache --no-audit --no-fund
npm run dev
```

Validation: `npm test`, `npm run build`, `npm run typecheck`. `npm start` serves the production build on port 3000.

## Saving and backups

Without cloud configuration, all companies and plans autosave to this browser's local storage. The old single business profile migrates on first use; the original entry is retained. Export a JSON backup before clearing browser data. Import adds independent company copies and does not overwrite existing companies. Invalid financial drafts remain editable after refresh but cannot be saved to cloud until fixed. Browser storage is not shared across devices.

## Private accounts and shared storage across devices

Cloud storage uses Supabase Auth and Postgres. Each authenticated user has one private workspace containing all their companies and plans. Accounts do not share data with other users; team collaboration is outside this version.

1. Create a Supabase project. In its SQL editor, execute `supabase/schema.sql`. This creates the workspace table, row-level security rules and revision-checked saving function.
2. Copy `.env.example` to `.env.local` for development, or add these variables in Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`: your Supabase project URL.
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: your project's public publishable key. Legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` is also supported.
3. In Supabase Authentication settings enable email/password, configure your deployed site URL, email confirmation and allowed redirect URLs. Supabase email delivery limits apply; configure email delivery for production as needed.
4. Rebuild/redeploy after setting public variables. Never put a service-role key in the browser or in Git.
5. Use **Connect account** to sign up and confirm your email, then sign in. Choose **Load cloud workspace** first. If no workspace exists, save the browser workspace to create it. Otherwise loading replaces the browser workspace after confirmation: export local changes first.
6. Edit and choose **Save to cloud**. Browser drafts autosave locally, but cloud saving is explicit. On another device, sign in and load your workspace. Saving checks the loaded revision; a stale device cannot silently overwrite a newer saved revision. Export a backup before resolving a conflict by loading the latest workspace.
7. Sign out using **Sign out & clear local data** on shared computers. Financial drafts otherwise remain on that browser. Private accounts need a secure device/browser; local drafts are not encrypted.

Live cloud authentication, database access and isolation must be checked against a configured Supabase project before production use. Without project configuration the app shows setup guidance and continues in local mode. No cloud account or remote persistence is claimed until connected and tested.

## Financial model

Company revenue is annual. All incentive pools, metric targets and expense scenarios use the selected monthly, quarterly or annual planning period. Changing the period label does not convert any values. All monetary values are USD.

Individual plans multiply target incentive per person by covered recipients. Department plans use one total pool, independent of recipient count. Plans are additive; the same employee in several plans can earn several awards. Covered recipients are not deduplicated employee records.

For scored metrics, higher-is-better attainment = actual / target; lower-is-better attainment = target / actual (zero actual reaches cap). Targets must be positive. Below threshold pays zero; up to target pays the attainment ratio; above target pays `1 + (attainment - 100) / 100 * accelerator`. Each factor is capped at its metric maximum. Weighted factors multiply the target pool, then the overall plan cap applies and cents are rounded once per plan. Scored weights must total 100%.

Mandatory gates have no weight and block the entire plan if actual misses the target. Gates may have a zero target, e.g. zero preventable incidents. Do not incentivize unsafe driving or noncompliance. Templates are starting points requiring business and legal review.

Metric actuals can be manually entered or explicitly linked to the matching department's operating expense actual. Linked targets remain editable. Department names should be unique. For accurate reporting, add expense rows for all plan departments.

Department operating expenses exclude incentive payments. Employer burden applies to incentive payouts once. Net savings = expense budget − expense actual − loaded incentive cost. It is not company net profit. Invalid enabled plans are identified and their payouts blocked; totals are marked incomplete. Maximum exposure assumes all scored metrics reach their caps and all gates pass. Calculations use independent real metric actuals; no AI or external API determines payouts.
