# Incentive Builder

A Next.js, TypeScript and Tailwind CSS general incentive workspace. Manage multiple company profiles, individual job plans, department pools, custom metrics, and department operating expense scenarios. Includes trucking templates across fleet operations, maintenance, safety, sales, finance, recruiting, leadership and warehouse roles. Any job title and metric can be customized.

## Simple four-step workflow

1. **Company**: choose a bonus period, budget, revenue goal/result and gross margin goal/result. Add optional measures in “What else matters?”. Gross margin is explained beside the fields.
2. **Divisions**: set separate revenue, margin and other measures for each division or team. Support teams may leave revenue at zero. Running cost budgets/results are optional and appear behind a disclosure.
3. **Bonus plans**: choose who gets the bonus, the normal bonus amount and what it rewards. Each measure can use company numbers, the plan's division numbers, or manual job results. “More rules” holds payment limits, starting levels, extra above-goal rewards and required rules. Adding/removing a measure splits scored shares equally; shares can then be edited. Required rules have no share.
4. **Results**: review company/division results, total bonus cost and each plan's payment. Gross profit after loaded bonuses excludes other operating costs. Detailed division running costs are available on request.

All new scorecard amounts use the selected bonus period. Company and division revenue are entered independently and never added together automatically. Margin is gross margin (0–100%). Custom measures support any unit and higher- or lower-is-better goals. To affect a payout, a measure must be selected as a source in a bonus plan; simply tracking it does not change pay.

Existing workspaces and old backups remain readable. Old company annual revenue and growth fields supply period-adjusted starting revenue goals/results when no scorecard is saved; old divisions start with zero revenue/margin until entered. Existing plans and their payout rules are retained. Copy/import deep-copies scorecards and keeps internal measure links intact. Deleting a linked measure blocks its bonus calculation until the source is fixed.

## Run locally

Node.js 24 and npm 11 are supported:

```sh
npm ci --cache /workspace/.npm-cache --no-audit --no-fund
npm run dev
```

Validation: `npm test`, `npm run build`, `npm run typecheck`. `npm start` serves the production build on port 3000.

## Multi-part and table-based plans

In **Bonus plans**, choose **Bulk template** for the supplied Bulk example or **Custom multi-part** to start from one editable part. Existing job/team plans keep their weighted-goal calculations.

The Bulk example has a weekly RWT table (4600→40, 4800→60, 5000→100, 5200→120, 5400→140, 5600→160, 5800→180, 6000+→200 CAD) and an annual profitability table (100%→2500, 105%→4000, 110%→6000, 120%+→8000 CAD). Below the first level pays zero. At 5000 weekly RWT for 52 payments and 100% profitability, the target is 5200 + 2500 = **7700 CAD per eligible recipient**. The table-based maximum is 10400 + 8000 = **18400 CAD**, assuming eligibility and conditions can pass.

Choose **each employee**, **each truck**, or **one shared team payout**. The recipient count applies to each part unless that part is explicitly one shared pool. Shared team plans are never multiplied by the count. Whole-plan annual limits apply after all parts and recipients are added.

Each part can be weekly, monthly, quarterly or annual, with its own count of payments. It can use a payment table, a per-unit/savings rate, or a goal-based payment. Table rules use the qualifying step by default; straight-line interpolation is opt-in. Higher-is-better tables select the largest level not above the result; lower-is-better tables select the smallest level not below it. Rate rules pay the positive difference from their starting point times the rate. Goal rules use result/goal or goal/result, a starting threshold and an optional above-goal accelerator. Rate/goal rules require a finite payment cap so their ceiling is known. Per-payment amounts are rounded to cents before adding periods.

By default annual projections repeat the entered result across all selected payments. For variable results, use **More rules → Use a separate result for every payment period** and apply exactly the selected count of results, one per line. These are evaluated independently; a payment on an average result is not substituted for the sum of the payments. Unsaved text in that editor is not applied until its explicit Apply button is clicked.

Eligibility checks stop the whole plan. Required numeric goals and positive-payment prerequisites can stop individual parts. Circular/missing prerequisites and other invalid rules block calculations, while structurally valid drafts still autosave. Required goals and inputs are manual planning values for the part's own period; they do not silently link to monthly company metrics. The ceiling is an upper bound assuming required conditions can pass; it is not a guarantee of jointly reachable goals.

**Company Results use budget equivalents**: annual composite cost is divided by 12 for Monthly, 4 for Quarterly, or 1 for Annual. This conversion happens after recipient counts and whole-plan caps. It is a budget allowance/accrual, not a weekly or annual cash-payment schedule. Annual leadership plans remain separate. Employer burden is applied once by the existing company totals.

Open **Plan handout** for a branded, employee-facing layout with purpose, eligibility, component tables, annual examples and total incentive opportunity. **Print / save PDF** prints the handout, hiding editor controls and navigation. More than two parts may naturally span pages. No external image generation, API, or payroll service is involved. Plans, caps, histories and internal prerequisites are included in backups, company copies and cloud autosave.

## Company total, comparison templates and driver pay

**Company total** is an annual executive forecast, also visible as a live strip while building plans. It includes enabled regular plans (annualized from the company period), exact multi-part annual projections, leadership bonuses for the selected year, and included company-driver incentives for that year. Driver base/duty pay and leadership salaries are shown separately; neither inflates the incentive total. Employer burden is added once to each included incentive plan and rounded to cents before adding the report total, so exported rows reconcile. The modeled compensation figure is not full company payroll and excludes other employees’ base wages. Accounts remain private; use the executive CSV export for sharing.

Regular plans may be ongoing or assigned a year; leadership and driver records are year-specific. Invalid included rows make the report incomplete and disable executive export. Excluded drafts do not inflate costs. Uncapped commissions display **No stated cap** rather than an invented ceiling. CSV values carry CAD and the report year. No source PDFs are published by the app.

The **Comparison chart templates** library adds all nine chart plans: Logistics/Brokerage KAR; Logistics Coordinator and Tracker; Deck KAR and KAC; Projects Lead and Coordinator; Bulk Sales Team; and Operations RWT. New chart templates start excluded. The earlier Bulk two-part plan remains separate from Bulk Sales Team's $100/truck/week with $1,200/quarter cap.

Straight commissions use 0.10%, 0.05%, 0.10% and 0.075% for the respective Deck/Projects roles, with no stated dollar cap. KAR uses 1% existing and 2% eligible personally sourced new business, reverting after 12 months; its business age advances for each projected month. Below 80% the default proration follows the illustrative chart's revenue-attainment examples; an alternative relative-to-threshold rule can be selected. Operations uses the narrative 4700→50, 4900→100, +20 per additional 200, capped at 200/week; 5900 reaches the cap, regardless of simplified graph labels.

The chart does not define Logistics pool bands, Coordinator Level 1/3 shares, or Tracker KPI targets/weights. Those remain editable examples requiring explicit review. Level 2's 14%, the example 1.05% pool rate and Tracker's 6% maximum are provided by the chart. Coordinator/Tracker plans share one quarterly GP pool. Pool funding is not counted again as an award. Over-allocation flags the company report incomplete; whole-plan caps are attributed pro rata to component pool awards for this check.

**Driver pay** implements the five supplied company-driver packages, with source filenames/revision dates and review checks. CAD and a 4¢ loyalty cap follow the user's clarifications. Current and legacy rates remain distinct. See `docs/driver-pay-reference.md` for page references, conflicts and exclusions. Owner-operator contracts are deferred. Driver estimates and shared pool configurations are included in private cloud autosave, local drafts and backups. No database migration is required for these additional JSON workspace fields.

## Annual director and senior-management calculator

Use the separate **Annual leadership** section. Create a plan for each person/position and year. Set a full-year base salary and a normal bonus target between **20% and 40% of salary**. The calculator compares 20%, 30% and 40% targets with the same expected results. Actual earned bonuses may be below 20% when goals are missed.

Enter annual company, division and personal goals, their expected results, and their shares of the normal bonus. Shares must total 100%. Required rules can stop the entire bonus. The example goal shares and amounts are editable examples, not compensation recommendations or last year's policy. Annual goals are entered independently and are never annualized from monthly or quarterly goals.

There are **no automatic discretionary accelerators**: each scored goal is capped at its normal share. A separate collapsed panel can record an existing CEO/CFO decision, approver name, reason and multiplier. A draft multiplier does not affect earnings. Recording complete decision details applies the multiplier to the performance-earned bonus, subject to the overall bonus cap. This is a planning record, not identity verification, a role-based permission system, or an approval workflow. Real authorization would need account roles and server-enforced permissions before use as an approval system.

Projected annual cash = full-year base salary + projected bonus. Optional eligibility prorates only the bonus; salary stays full-year. Personal taxes, benefits, equity and other pay are excluded. The normal bonus and final bonus are rounded to cents. The portfolio summary includes only leadership plans for the selected year, adds the company's employer cost percentage to bonuses, and excludes salaries. Each included plan contributes once. Copied leadership plans start excluded until checked. Annual leadership costs are separate from the regular bonus-plan results and must not be added to a monthly budget without an explicit period conversion.

Save named what-if estimates to preserve goal results. Saved estimates use the current salary, shares, targets and decision record; adding a goal makes older estimates incomplete until its result is supplied. Annual plans and estimates are included in local autosave, cloud workspace data and full JSON backups. **Export estimate** downloads the current annual plan and projection only. Copy/import keeps annual data independent from the original company and marks copied discretionary decisions as not recorded, so they are not silently applied to a new plan.

## Saving and backups

Without cloud configuration, all companies and plans autosave to this browser's local storage. The old single business profile migrates on first use; the original entry is retained. Export a JSON backup before clearing browser data. Import adds independent company copies and does not overwrite existing companies. Incomplete financial drafts can be saved locally and to cloud; payout calculations stay blocked until their rules are fixed. Browser storage is not shared across devices.

## Private accounts and shared storage across devices

Cloud storage uses Supabase Auth and Postgres. Each authenticated user has one private workspace containing all their companies and plans. Accounts do not share data with other users; team collaboration is outside this version.

1. Create a Supabase project. In its SQL editor, execute `supabase/schema.sql`. This creates the workspace table, row-level security rules and revision-checked saving function.
2. Copy `.env.example` to `.env.local` for development, or add these variables in Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`: your Supabase project URL.
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: your project's public publishable key. Legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` is also supported.
3. In Supabase Authentication settings enable email/password, configure your deployed site URL, email confirmation and allowed redirect URLs. Supabase email delivery limits apply; configure email delivery for production as needed.
4. Rebuild/redeploy after setting public variables. Never put a service-role key in the browser or in Git.
5. Use **Connect account** to sign up and confirm your email, then sign in. The app checks your cloud workspace automatically. A new account starts cloud autosave. If your browser contains different, unassociated data, export a backup if needed and choose **Load cloud workspace** once before autosave starts. Loading replaces browser data after confirmation.
6. Edit normally: cloud autosave runs about 1.2 seconds after editing pauses. **Save now** is optional. Writes are serialized and use revision checks, so edits made during a save queue behind its confirmed revision. The header shows waiting, saving, saved, error or conflict states. A browser draft and baseline checkpoint support refresh recovery. Clean drafts can load newer cloud data automatically; conflicting edits are kept locally and never overwrite another device. Export a backup before loading the latest cloud data to resolve a conflict. Network failures pause autosave until retry/reconnection; an online or focus event rechecks the remote revision before resuming. No unchanged retry loop is used. Do not clear browser storage before unsaved drafts have reached cloud or been exported.
7. Sign out using **Sign out & clear local data** on shared computers. Financial drafts otherwise remain on that browser. Private accounts need a secure device/browser; local drafts are not encrypted.

Autosave has unit tests for debouncing, serialized revisions, failures, stale updates, account changes and JSONB key order. Browser integration is tested with controlled Supabase responses; live authentication, database access and isolation must still be checked against the configured Supabase project. No SQL schema update is required for autosave. Without project configuration the app shows setup guidance and continues in local mode. No cloud account or remote persistence is claimed until connected and tested.

## Financial model

Company and division scorecard revenue, incentive pools, measure targets and expense scenarios use the selected monthly, quarterly or annual bonus period. Legacy annual company revenue remains available only as a migration fallback. Changing the period label does not convert any values. All monetary values are Canadian dollars (CAD). Currency formatting uses the Canadian locale. Existing numeric amounts are treated as CAD; no exchange-rate conversion is performed. Backup and annual-estimate exports identify CAD.

Individual plans multiply target incentive per person by covered recipients. Department plans use one total pool, independent of recipient count. Plans are additive; the same employee in several plans can earn several awards. Covered recipients are not deduplicated employee records.

For scored metrics, higher-is-better attainment = actual / target; lower-is-better attainment = target / actual (zero actual reaches cap). Targets must be positive. Below threshold pays zero; up to target pays the attainment ratio; above target pays `1 + (attainment - 100) / 100 * accelerator`. Each factor is capped at its metric maximum. Weighted factors multiply the target pool, then the overall plan cap applies and cents are rounded once per plan. Scored weights must total 100%.

Mandatory gates have no weight and block the entire plan if actual misses the target. Gates may have a zero target, e.g. zero preventable incidents. Do not incentivize unsafe driving or noncompliance. Templates are starting points requiring business and legal review.

Metric goals and results can be linked to company or division revenue, gross margin, or a custom measure. Links are resolved directly from saved scorecards on every calculation, without copying stale values. Operating expense links continue to bind only the division's expense actual, leaving that metric's target editable. Missing divisions/measures block payouts. Division names should be unique. Use positive targets for scored measures; zero goals are allowed for required rules.

Department operating expenses exclude incentive payments. Employer burden applies to incentive payouts once. Net savings = expense budget − expense actual − loaded incentive cost. It is not company net profit. Invalid enabled plans are identified and their payouts blocked; totals are marked incomplete. Maximum exposure assumes all scored metrics reach their caps and all gates pass. Calculations use independent real metric actuals; no AI or external API determines payouts.

## Q-Line branding

The app uses Q-Line red and charcoal styling, branded account/sidebar/loading locations and Q-Line page metadata. `lib/brand.ts` is the logo configuration and `app/components/qline-brand.tsx` renders it. The original user-supplied logo is stored unchanged at `public/branding/q-line-logo.png` and appears in the sidebar, loading screen and account screen. Narrow screens show the Q portion through responsive CSS; the full logo remains on account screens. A text company name is available if the image cannot load.
