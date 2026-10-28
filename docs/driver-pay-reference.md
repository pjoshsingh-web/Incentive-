# Driver-pay source mapping

The five uploaded PDFs were read as rate sources. Original PDFs stay outside the public application repository; filenames, revisions and implemented rules are recorded here. These are scenario calculators, not a payroll integration. Approvals in the UI record inputs; they do not verify authority.

## User clarifications (2026-10-28)

- All supplied company-driver packages, including US Heavy Haul, are paid in CAD.
- Use a working loyalty cap of 4 cents per mile. The user said they believed it is capped at 4 cents; review against the current approved payroll policy before paying. The 110% high-mileage multiplier still applies before this cap.
- Owner-operator contracts will be supplied later. No owner-operator pay rules are inferred from company-driver documents.

## Source packages

- `QL-OP-203 Canadian Company Driver Deck Fleet Pay Package 1.pdf`, Revision 03, revised 2026-10-14: loaded and empty 48¢/mile (p1); misc pay (p2); safety levels 1–4, 1–4¢ (p3); skill levels 1–5, 0–4¢, service and mileage loyalty (p4); dimension/length tables (p5); 5/6/7-axle RGN 12/17/27¢, length exclusion and payroll/mileage definitions (p5–6).
- `QL-OP-204 International Company Driver Deck Fleet Pay Package 1.pdf`, Revision 03, revised 2026-10-14: loaded 53¢, empty 48¢ (p1). Bonuses and dimension/RGN tables follow its own pages 3–6. Geographic eligibility must be confirmed for approved miles; it is not inferred from the Canadian package.
- `QL-OP-205 US Company Driver Heavy Haul Fleet Pay Package 1.pdf`, Revision 03, revised 2026-10-14: loaded 53¢, empty 48¢ (p1); 50¢ loaded steerable premium, fees/tarping/orientation (p2); safety/skills/loyalty (p3–4); OD table (p5); detailed length and 7–13 axle trailer tables (p6). The detailed 13-axle rate is $1.13/mile, while the summary states up to $1.10. Selecting 13 axles requires acknowledgement of that conflict. Deck-style RGN/length exclusion is not silently applied to Heavy Haul, whose table does not state it.
- `Regional RGN Company Deck Rates 1.pdf`, updated 2021-09-03: loaded rate 73¢ (not 48¢ + 73¢) and base/empty 48¢; older combined OD rates; length up to 15¢; Super-B 6¢; approved regional/coast 10¢; project hourly east $22.50 / west $25; site/chain-up $150; standard BOL $75 or RGN BOL $40 for the appropriate event; tarp $50/$75/$150 or lumber $100; orientation $100/day after 31 continuous days. Safety ranks 1/2 pay zero, 3/4/5 pay 1/2/3¢. There is no separate skill bonus in this older package.
- `Company Bulk Rates 1.pdf`, updated 2023-01-16: 20–22% of gross order revenue excluding FSC; NH3 hourly rates are not specified and require approved input. Quarterly safety award 1% of qualifying net revenue, plus an additional 1% at year end for a full qualifying calendar year. Orientation $150/day. No Deck extra rates are prefilled for Bulk.

## Calculation boundaries and exclusions

- Miles are approved practical/verified or permitted-route miles as applicable. Actual routing and mileage audits are outside the app.
- One approved width/height/combined band is selected per mileage segment. Combined bands replace separate width-plus-height additions. Loaded-only OD, length, RGN/trailer and steerable pay are rejected on empty segments.
- Current Deck RGN axle premiums exclude a simultaneous length premium. Regional 2021 has its own older table, and Heavy Haul has its own detailed stacking rules. Split segments where approved premiums differ; do not enter the same miles twice.
- Safety, skill and loyalty are incentive components; base mileage, revenue/hourly base, duties, OD/trailer/geographic premiums and ordinary fees are regular compensation.
- Skill requires active demonstration; safety requires applicable qualification. Loyalty service rate is 1¢ at 6 months, 2¢ at 2 years, 3¢ at 5 years, 4¢ at 10 years. Before 2 years, mileage does not reduce loyalty. At 2+ years, trailing 12-month mileage yields 0%, 50%, 100%, 110% at <90k, 90k, 105k, 125k; final loyalty is capped at 4¢.
- Local work, waiting time, tarping and other extras use approved quantities/rates. Waiting time has no invented default rate. Regional orientation eligibility uses explicit continuous days, not an approximate month conversion. Current-package orientation is one-time. Reimbursements, vacation pay, taxes, deductions, benefits, advances, and deposit timing are not computed.
- Rates are not assumed retroactive to January 1. Users confirm the revision applies to all entered work and create separate records when rates/qualifications change. Driver records contribute only entered work to their report year, not an automatic annualization. The same person may have several period records; work and awards must not be duplicated.
- Bulk FSC must not exceed revenue. The year-end award requires the full calendar year and all four quarters’ safety qualifications. Hourly NH3 pay substitutes for the revenue-percentage base; it is not added on top.
