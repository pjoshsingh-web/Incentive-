"use client";
import { currency, formatMoney as money } from "../lib/currency";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  ChartNoAxesCombined,
  CheckCircle2,
  ChevronRight,
  Cloud,
  Copy,
  Download,
  LayoutDashboard,
  LogIn,
  Plus,
  Save,
  ShieldCheck,
  Target,
  Trash2,
  Upload,
  Users,
  Wallet,
  X,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { cloud } from "../lib/cloud";
import { useCloudAutosave, clearCloudDraft } from "./hooks/use-cloud-autosave";
import { QLineBrand } from "./components/qline-brand";
import { AnnualLeadership } from "./components/annual-leadership";
import {
  CompanySettings,
  DivisionSettings,
  HomeGuide,
  BusinessResults,
} from "./components/simple-setup";
import { PlanMeasures } from "./components/plan-measures";
import { CompositePlanEditor } from "./components/composite-plan";
import { bulkTemplate, newPart } from "../lib/composite";
import {
  Company,
  Plan,
  Workspace,
  calculatePlan,
  cloneCompany,
  companyTotals,
  id,
  newCompany,
  parseWorkspace,
  roles,
  resolvedPlan,
  sampleWorkspace,
  template,
} from "../lib/workspace";

const storageKey = "incentive-builder.workspace.v2";
const sections = [
  "Overview",
  "Company",
  "Divisions",
  "Bonus plans",
  "Results",
  "Annual leadership",
];
export default function Home() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null),
    [tab, setTab] = useState("Overview"),
    [selected, setSelected] = useState(""),
    [notice, setNotice] = useState(""),
    [storageError, setStorageError] = useState(""),
    [account, setAccount] = useState(false),
    [user, setUser] = useState<User | null>(null),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [authMode, setAuthMode] = useState<"login" | "signup">("login"),
    [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cloudSync = useCloudAutosave(user?.id, workspace, setWorkspace);
  const loadCloud = () => cloudSync.load();
  const saveCloud = () => cloudSync.save();
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        setWorkspace(parseWorkspace(raw));
        return;
      }
      const initial = sampleWorkspace();
      const legacy = localStorage.getItem(
        "incentive-builder.business-profile.v1",
      );
      if (legacy) {
        try {
          const old = JSON.parse(legacy);
          const c = {
            ...initial.companies[0],
            period: "Annual" as const,
            scorecard: undefined,
            departments: [],
            plans: [],
          };
          if (
            typeof old.company === "string" &&
            typeof old.industry === "string"
          ) {
            for (const k of [
              "company",
              "industry",
              "revenue",
              "growth",
              "margin",
              "employees",
              "budget",
            ] as const) {
              if (typeof old[k] === typeof c[k])
                (c as unknown as Record<string, unknown>)[k] = old[k];
            }
            parseWorkspace(JSON.stringify({ ...initial, companies: [c] }));
            initial.companies = [c];
          }
        } catch {
          setStorageError(
            "Your previous profile could not be migrated. The original copy is still in browser storage.",
          );
        }
      }
      setWorkspace(initial);
    } catch {
      setStorageError(
        "Saved browser data could not be loaded. Import a backup or reset local data. The original data has not been overwritten.",
      );
    }
  }, []);
  useEffect(() => {
    if (!workspace) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(workspace));
    } catch {
      setStorageError(
        "Browser storage is blocked or full. Export a backup to keep your work.",
      );
    }
  }, [workspace]);
  useEffect(() => {
    if (!cloud) return;
    void cloud.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = cloud.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  const notify = (s: string) => {
    setNotice(s);
    setTimeout(() => setNotice(""), 6000);
  };
  const c = workspace?.companies.find((c) => c.id === workspace.activeId);
  const totals = c ? companyTotals(c) : null;
  const activePlan = c?.plans.find((p) => p.id === selected) || c?.plans[0];
  const updateCompany = (changes: Partial<Company>) =>
    setWorkspace((w) =>
      w
        ? {
            ...w,
            companies: w.companies.map((v) =>
              v.id === w.activeId ? { ...v, ...changes } : v,
            ),
          }
        : w,
    );
  const updatePlan = (p: Plan) => {
    if (c)
      updateCompany({ plans: c.plans.map((v) => (v.id === p.id ? p : v)) });
  };
  const download = () => {
    if (!workspace) return;
    const blob = new Blob(
      [JSON.stringify({ ...workspace, currency }, null, 2)],
      {
        type: "application/json",
      },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "incentive-builder-backup.json";
    a.click();
    URL.revokeObjectURL(url);
  };
  const importFile = async (file: File) => {
    try {
      if (file.size > 5000000)
        throw Error("Backups must be smaller than 5 MB.");
      const imported = parseWorkspace(await file.text());
      const companies = imported.companies.map(cloneCompany);
      setWorkspace((w) =>
        w
          ? {
              ...w,
              activeId: companies[0].id,
              companies: [...w.companies, ...companies],
            }
          : { ...imported, activeId: companies[0].id, companies },
      );
      notify("Backup imported as new company copies.");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Invalid backup.");
    }
  };
  const auth = async () => {
    if (!cloud) return;
    setBusy(true);
    try {
      const result =
        authMode === "login"
          ? await cloud.auth.signInWithPassword({ email, password })
          : await cloud.auth.signUp({ email, password });
      if (result.error) throw result.error;
      setPassword("");
      if (result.data.session) {
        setAccount(false);
        notify("Signed in. Connecting your cloud workspace for autosave.");
      } else notify("Check your email to confirm your account, then sign in.");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  };
  const addPlan = (scope: Plan["scope"]) => {
    if (!c) return;
    const p = template(
      scope === "department" ? "Division team" : "Company Driver",
      c.departments[0]?.name || "Fleet operations",
      scope,
    );
    if (scope === "department")
      p.metrics[0].target = Math.max(1, c.departments[0]?.budget || 100000);
    updateCompany({ plans: [...c.plans, p] });
    setSelected(p.id);
    setTab("Bonus plans");
  };
  const addComposite = (custom = false) => {
    if (!c) return;
    const fresh = bulkTemplate(c.departments[0]?.name || "Bulk");
    if (custom) {
      fresh.name = "Custom multi-part plan";
      fresh.composite = {
        ...fresh.composite!,
        purpose: "Reward the results that matter for this group.",
        parts: [newPart()],
      };
    }
    updateCompany({ plans: [...c.plans, fresh] });
    setSelected(fresh.id);
    setTab("Bonus plans");
  };
  const addCompany = () => {
    const fresh = newCompany();
    setWorkspace((w) =>
      w
        ? { ...w, companies: [...w.companies, fresh], activeId: fresh.id }
        : { version: 2, companies: [fresh], activeId: fresh.id },
    );
    setTab("Company");
  };
  if (!workspace || !c || !totals)
    return (
      <div className="loading-state">
        <QLineBrand />
        <h1>Q-Line Incentive Builder</h1>
        <p>{storageError || "Opening your workspace…"}</p>
        {storageError && (
          <button
            className="button primary"
            onClick={() => {
              if (
                confirm(
                  "Reset local data? This removes the saved browser workspace.",
                )
              ) {
                localStorage.removeItem(storageKey);
                setStorageError("");
                setWorkspace(sampleWorkspace());
              }
            }}
          >
            Reset local workspace
          </button>
        )}
      </div>
    );
  const metricsInvalid = totals.invalid;
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="/"
          aria-label="Q-Line Incentive Builder home"
        >
          <QLineBrand compact />
        </a>
        <div className="company-switch">
          <label>ACTIVE COMPANY</label>
          <select
            aria-label="Active company"
            value={c.id}
            onChange={(e) => {
              setWorkspace({ ...workspace, activeId: e.target.value });
              setSelected("");
            }}
          >
            {workspace.companies.map((v) => (
              <option key={v.id} value={v.id}>
                {v.company}
              </option>
            ))}
          </select>
        </div>
        <span className="nav-label">WORKSPACE</span>
        <nav>
          {sections.map((name, i) => {
            const Icon = [
              LayoutDashboard,
              Building2,
              Users,
              Target,
              ChartNoAxesCombined,
              BriefcaseBusiness,
            ][i];
            return (
              <button
                key={name}
                className={"nav-item " + (tab === name ? "active" : "")}
                onClick={() => setTab(name)}
              >
                <Icon size={19} />
                {name}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="advisor-card">
            <ShieldCheck size={21} />
            <strong>Designed around your business</strong>
            <p>Choose clear goals. Reward good work. Keep the cost in view.</p>
            <button onClick={() => addPlan("individual")}>
              Add a bonus plan <ArrowRight size={14} />
            </button>
          </div>
          <button className="nav-item" onClick={() => setAccount(true)}>
            <LogIn size={18} />
            {user ? "Your account" : "Your account"}
          </button>
          <div className="user">
            <span className="avatar">IB</span>
            <div>
              <strong>{user ? "Private workspace" : "Local workspace"}</strong>
              <small>{user?.email || "Saved on this browser"}</small>
            </div>
          </div>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <div>
            Workspace <ChevronRight size={13} />
            <strong>{tab}</strong>
          </div>
          <div className="top-actions">
            <span
              role="status"
              className={"sample-badge sync-" + cloudSync.state}
            >
              <span />
              {user ? cloudSync.message : "Saved in this browser"}
            </span>
            <button
              className="button secondary"
              onClick={download}
              title="Export all companies"
            >
              <Download size={16} />
              Backup
            </button>
            <button
              className="button primary"
              onClick={() => (user ? void saveCloud() : setAccount(true))}
              disabled={
                busy ||
                cloudSync.saving ||
                (user && ["choose", "conflict"].includes(cloudSync.state)) ||
                false
              }
            >
              <Cloud size={16} />
              {user ? "Save now" : "Connect account"}
            </button>
          </div>
        </header>
        <div className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">SIMPLE GOALS. CLEAR BONUSES.</div>
              <h1>
                {tab === "Overview"
                  ? "Build a bonus plan, step by step."
                  : tab === "Company"
                    ? "1. Your company"
                    : tab === "Bonus plans"
                      ? "3. Your bonus plans"
                      : tab === "Divisions"
                        ? "2. Your divisions"
                        : tab === "Annual leadership"
                          ? "Annual director & management bonuses"
                          : "4. Check your results"}
              </h1>
              <p>Set clear goals. Reward good work. Know what it will cost.</p>
            </div>
            {tab === "Bonus plans" && (
              <button
                className="button primary"
                onClick={() => addPlan("individual")}
              >
                <Plus size={17} />
                New bonus plan
              </button>
            )}
          </div>
          {storageError && (
            <div className="validation bad" role="alert">
              {storageError}
            </div>
          )}
          {user && cloudSync.error && (
            <div className="cloud-save-alert" role="alert">
              <p>{cloudSync.error}</p>
              <p>
                Your browser draft is still here. Export a backup before
                replacing it with cloud data.
              </p>
              <div className="profile-actions">
                <button className="button secondary" onClick={download}>
                  Export backup
                </button>
                {cloudSync.state === "error" && (
                  <button
                    className="button secondary"
                    onClick={cloudSync.retry}
                  >
                    Retry connection
                  </button>
                )}
                <button
                  disabled={cloudSync.saving}
                  className="button secondary"
                  onClick={() => void loadCloud()}
                >
                  Load cloud workspace
                </button>
              </div>
            </div>
          )}
          {cloudSync.draftWarning && (
            <div className="validation bad" role="alert">
              {cloudSync.draftWarning}
            </div>
          )}
          <div className="workspace-status">
            <span>
              <CheckCircle2 size={15} />
              {storageError
                ? "Local saving needs attention"
                : user
                  ? cloudSync.message
                  : "Changes are saved automatically in this browser"}
            </span>
            {user ? (
              <button
                disabled={busy || cloudSync.saving}
                onClick={() => void loadCloud()}
              >
                Load cloud workspace
              </button>
            ) : (
              <button onClick={() => setAccount(true)}>
                Enable private cloud saving <ArrowRight size={14} />
              </button>
            )}
          </div>
          {tab === "Annual leadership" && (
            <AnnualLeadership
              key={c.id}
              company={c}
              onChange={updateCompany}
              notify={notify}
            />
          )}
          {tab === "Overview" && <HomeGuide company={c} navigate={setTab} />}
          {tab === "Company" && (
            <>
              <div className="profile-toolbar">
                <select
                  aria-label="Choose company profile"
                  value={c.id}
                  onChange={(e) =>
                    setWorkspace({ ...workspace, activeId: e.target.value })
                  }
                >
                  {workspace.companies.map((v) => (
                    <option value={v.id} key={v.id}>
                      {v.company}
                    </option>
                  ))}
                </select>
                <button className="button secondary" onClick={addCompany}>
                  <Plus size={16} />
                  New company
                </button>
                <details className="profile-manage">
                  <summary>More company tools</summary>
                  <div className="profile-tools">
                    <button
                      className="button secondary"
                      onClick={() => {
                        const copy = cloneCompany(c);
                        setWorkspace({
                          ...workspace,
                          activeId: copy.id,
                          companies: [...workspace.companies, copy],
                        });
                      }}
                    >
                      <Copy size={16} />
                      Duplicate
                    </button>
                    <button
                      className="button secondary"
                      onClick={() => fileRef.current?.click()}
                    >
                      <Upload size={16} />
                      Import backup
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".json,application/json"
                      hidden
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void importFile(f);
                        e.target.value = "";
                      }}
                    />
                    {workspace.companies.length > 1 && (
                      <button
                        className="button secondary danger"
                        onClick={() => {
                          if (
                            confirm(`Delete ${c.company} and all its plans?`)
                          ) {
                            const remaining = workspace.companies.filter(
                              (v) => v.id !== c.id,
                            );
                            setWorkspace({
                              ...workspace,
                              companies: remaining,
                              activeId: remaining[0].id,
                            });
                          }
                        }}
                      >
                        <Trash2 size={16} />
                        Delete
                      </button>
                    )}
                  </div>
                </details>
              </div>
              <CompanySettings
                key={c.id}
                company={c}
                onChange={updateCompany}
                next={() => setTab("Divisions")}
              />
            </>
          )}
          {tab === "Divisions" && (
            <DivisionSettings
              key={c.id}
              company={c}
              onChange={updateCompany}
              next={() => setTab("Bonus plans")}
              notify={notify}
            />
          )}
          {tab === "Bonus plans" && (
            <div className="builder-layout">
              <section className="panel plan-picker">
                <div className="panel-heading">
                  <h2>Your bonus plans</h2>
                </div>
                {c.plans.map((p) => (
                  <button
                    key={p.id}
                    className={activePlan?.id === p.id ? "selected" : ""}
                    onClick={() => setSelected(p.id)}
                  >
                    <strong>{p.name}</strong>
                    <small>
                      {p.composite
                        ? "Multi-part plan"
                        : p.scope === "individual"
                          ? p.role
                          : "Team bonus"}{" "}
                      · {p.enabled ? "Enabled" : "Excluded"}
                    </small>
                  </button>
                ))}
                <div className="plan-add">
                  <button
                    className="button secondary"
                    onClick={() => addPlan("individual")}
                  >
                    <Plus size={14} />
                    Job bonus
                  </button>
                  <button
                    className="button secondary"
                    onClick={() => addPlan("department")}
                  >
                    <Plus size={14} />
                    Team plan
                  </button>
                  <span className="plan-kind-label">
                    TABLE & MULTI-PART PLANS
                  </span>
                  <button
                    className="button secondary"
                    onClick={() => addComposite(false)}
                  >
                    <Plus size={14} />
                    Bulk template
                  </button>
                  <button
                    className="button secondary"
                    onClick={() => addComposite(true)}
                  >
                    <Plus size={14} />
                    Custom multi-part
                  </button>
                </div>
              </section>
              {activePlan?.composite ? (
                <CompositePlanEditor
                  company={c}
                  plan={activePlan}
                  onChange={updatePlan}
                  notify={notify}
                  onNext={() => setTab("Results")}
                  onDelete={() => {
                    if (confirm("Delete " + activePlan.name + "?"))
                      updateCompany({
                        plans: c.plans.filter((v) => v.id !== activePlan.id),
                      });
                  }}
                  onCopy={() => {
                    const copy = {
                      ...structuredClone(activePlan),
                      id: id(),
                      name: activePlan.name + " (copy)",
                    };
                    updateCompany({ plans: [...c.plans, copy] });
                    setSelected(copy.id);
                  }}
                />
              ) : activePlan ? (
                <section className="panel editor">
                  <div className="panel-heading">
                    <div>
                      <h2>Who is this bonus for?</h2>
                      <p>
                        Choose a job or team, then choose what earns a bonus.
                        Simple plans use the period in step 1. Multi-part plans
                        show each part’s own payment schedule.
                      </p>
                    </div>
                    <button
                      className="icon-delete"
                      aria-label="Delete plan"
                      onClick={() => {
                        if (confirm(`Delete ${activePlan.name}?`))
                          updateCompany({
                            plans: c.plans.filter(
                              (p) => p.id !== activePlan.id,
                            ),
                          });
                      }}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                  <div className="form-grid">
                    <Text
                      label="Plan name"
                      value={activePlan.name}
                      onChange={(v) => updatePlan({ ...activePlan, name: v })}
                    />
                    <label>
                      Who gets the bonus?
                      <select
                        value={activePlan.scope}
                        onChange={(e) =>
                          updatePlan({
                            ...activePlan,
                            scope: e.target.value as Plan["scope"],
                          })
                        }
                      >
                        <option value="individual">
                          People doing the same job
                        </option>
                        <option value="department">
                          A whole division or team
                        </option>
                      </select>
                    </label>
                    <label>
                      Division or team
                      <select
                        value={activePlan.department}
                        onChange={(e) =>
                          updatePlan({
                            ...activePlan,
                            department: e.target.value,
                          })
                        }
                      >
                        {[
                          ...new Set([
                            ...c.departments.map((d) => d.name),
                            ...Object.keys(roles),
                            activePlan.department,
                          ]),
                        ].map((v) => (
                          <option key={v}>{v}</option>
                        ))}
                      </select>
                    </label>
                    <Text
                      label="Job title"
                      value={activePlan.role}
                      onChange={(v) => updatePlan({ ...activePlan, role: v })}
                    />
                    <label>
                      Start with a job example (optional)
                      <select
                        value=""
                        onChange={(e) => {
                          if (!e.target.value) return;
                          if (
                            confirm(
                              "Replace this plan’s measures with this job example?",
                            )
                          ) {
                            const [department, role] =
                              e.target.value.split("|");
                            const replacement = template(
                              role,
                              department,
                              activePlan.scope,
                            );
                            updatePlan({
                              ...replacement,
                              id: activePlan.id,
                              participants: activePlan.participants,
                              incentive: activePlan.incentive,
                            });
                          }
                        }}
                      >
                        <option value="">Select a starting point…</option>
                        {Object.entries(roles).map(([dept, jobs]) => (
                          <optgroup key={dept} label={dept}>
                            {jobs.map((job) => (
                              <option key={job} value={dept + "|" + job}>
                                {job}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </label>
                    {activePlan.scope === "individual" && (
                      <NumberField
                        label="How many people?"
                        value={activePlan.participants}
                        min={1}
                        step={1}
                        onChange={(v) =>
                          updatePlan({
                            ...activePlan,
                            participants: Math.round(v),
                          })
                        }
                      />
                    )}
                    <NumberField
                      label={
                        activePlan.scope === "individual"
                          ? `Normal bonus for each person ($)`
                          : `Normal bonus for the whole team ($)`
                      }
                      value={activePlan.incentive}
                      onChange={(v) =>
                        updatePlan({ ...activePlan, incentive: v })
                      }
                    />
                    <details className="advanced-settings">
                      <summary>Bonus limit (optional)</summary>
                      <NumberField
                        label="Maximum bonus (% of normal bonus)"
                        value={activePlan.cap}
                        onChange={(v) => updatePlan({ ...activePlan, cap: v })}
                      />
                      <p>
                        150% means a $100 normal bonus can pay at most $150.
                      </p>
                    </details>
                  </div>
                  <div className="plan-toggle">
                    <label>
                      <input
                        type="checkbox"
                        checked={activePlan.enabled}
                        onChange={(e) =>
                          updatePlan({
                            ...activePlan,
                            enabled: e.target.checked,
                          })
                        }
                      />
                      Include this plan in the results
                    </label>
                  </div>
                  <PlanMeasures
                    company={c}
                    plan={activePlan}
                    onChange={updatePlan}
                  />
                  {(() => {
                    const r = calculatePlan(resolvedPlan(c, activePlan));
                    return (
                      <>
                        <div
                          className={
                            "validation " + (r.errors.length ? "bad" : "good")
                          }
                          role="status"
                        >
                          <ShieldCheck size={17} />
                          {r.errors.length
                            ? r.errors.join(" ")
                            : `Bonus shares add up to 100%. Normal total: ${money(r.pool)}. Highest possible total: ${money(r.maximum)}.`}
                        </div>
                        {!r.gatesPassed && (
                          <div className="validation bad">
                            A required goal was missed. This plan pays no bonus.
                          </div>
                        )}
                      </>
                    );
                  })()}
                  <div className="editor-footer">
                    <span>Ready to see the bonus amounts?</span>
                    <button
                      className="button primary"
                      onClick={() => setTab("Results")}
                    >
                      Next: check results <ArrowRight size={16} />
                    </button>
                  </div>
                  <details className="advanced-settings calculation-notes">
                    <summary>How the bonus is worked out</summary>
                    <p>
                      A higher-is-better measure compares result ÷ goal. A
                      lower-is-better measure compares goal ÷ result. Below the
                      starting level, the measure pays nothing. At the goal, it
                      pays its normal share. Above the goal, the extra reward
                      applies. Each measure and the whole plan have a payment
                      limit. Missing a required rule stops the whole plan’s
                      payment.
                    </p>
                  </details>
                </section>
              ) : (
                <section className="panel empty">
                  Choose “Job bonus” or “Team plan” to get started.
                </section>
              )}
            </div>
          )}
          {tab === "Results" && (
            <>
              <div className="setup-banner">
                <span className="setup-icon">
                  <ChartNoAxesCombined size={22} />
                </span>
                <div>
                  <strong>Your {c.period.toLowerCase()} bonus estimate</strong>
                  <p>
                    Try different numbers in steps 1, 2, or 3. The bonus amounts
                    update right away.
                  </p>
                </div>
                <button onClick={() => setTab("Bonus plans")}>
                  Change bonus measures <ArrowRight size={16} />
                </button>
              </div>
              {c.plans.some((p) => p.composite) && (
                <div className="plain-note composite-results-note">
                  Multi-part plans are shown as {c.period.toLowerCase()} budget
                  equivalents. Their annual totals are divided by{" "}
                  {c.period === "Monthly"
                    ? 12
                    : c.period === "Quarterly"
                      ? 4
                      : 1}
                  . Weekly payments and annual bonuses keep their own timing;
                  these equivalents are not cash-payment schedules. Open the
                  multi-part plan to see the full annual and per-payment
                  breakdown.
                </div>
              )}
              <BusinessResults
                company={c}
                bonusCost={totals.loaded}
                incomplete={metricsInvalid}
              />
              {metricsInvalid && (
                <div className="validation bad" role="alert">
                  Some bonus rules need fixing. Open step 3 and check the
                  messages. These totals are not complete yet.
                </div>
              )}
              <div className="metric-grid">
                <Stat
                  label="Bonus payments"
                  value={metricsInvalid ? "Incomplete" : money(totals.payout)}
                  note="Money paid as bonuses"
                />
                <Stat
                  label="Total cost to the company"
                  value={metricsInvalid ? "Incomplete" : money(totals.loaded)}
                  note={`Includes ${c.overhead}% extra employer costs`}
                />
                <Stat
                  label="Highest possible bonus cost"
                  value={
                    metricsInvalid ? "Incomplete" : money(totals.loadedMaximum)
                  }
                  note="If every included plan pays its maximum"
                />
                <Stat
                  label="Bonus budget left"
                  value={
                    metricsInvalid
                      ? "Incomplete"
                      : money(c.budget - totals.loaded)
                  }
                  note="A negative number means you are over budget"
                />
              </div>
              <details className="results-details">
                <summary>More detail: running costs by division</summary>
                <section className="panel editor">
                  <div className="panel-heading">
                    <div>
                      <h2>Running costs by division</h2>
                      <p>
                        All expense amounts exclude incentives; loaded
                        incentives are added once below.
                      </p>
                    </div>
                  </div>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Division or team</th>
                          <th>Budget ($)</th>
                          <th>Try a running cost ($)</th>
                          <th>Bonuses + employer costs</th>
                          <th>Total running costs</th>
                          <th>Money left from cost budget</th>
                        </tr>
                      </thead>
                      <tbody>
                        {c.departments.map((d) => {
                          const loaded = c.plans
                            .filter((p) => p.enabled && p.department === d.name)
                            .reduce(
                              (s, p) =>
                                s +
                                calculatePlan(resolvedPlan(c, p)).payout *
                                  (1 + c.overhead / 100),
                              0,
                            );
                          return (
                            <tr key={d.id}>
                              <td>{d.name}</td>
                              <td>{money(d.budget)}</td>
                              <td>
                                <input
                                  aria-label={`${d.name} scenario expense`}
                                  style={{ width: 130 }}
                                  type="number"
                                  min="0"
                                  value={d.actual}
                                  onChange={(e) =>
                                    updateCompany({
                                      departments: c.departments.map((v) =>
                                        v.id === d.id
                                          ? {
                                              ...v,
                                              actual: Math.max(
                                                0,
                                                +e.target.value,
                                              ),
                                            }
                                          : v,
                                      ),
                                    })
                                  }
                                />
                              </td>
                              <td>{money(loaded)}</td>
                              <td>{money(d.actual + loaded)}</td>
                              <td
                                className={
                                  d.budget - d.actual - loaded >= 0
                                    ? "green-text"
                                    : "amber-text"
                                }
                              >
                                {money(d.budget - d.actual - loaded)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="scenario-results">
                    <div>
                      <span>Baseline expense budget</span>
                      <strong>{money(totals.budget)}</strong>
                    </div>
                    <div>
                      <span>Actual expenses before incentives</span>
                      <strong>{money(totals.actual)}</strong>
                    </div>
                    <div>
                      <span>Total loaded expenses</span>
                      <strong>
                        {metricsInvalid
                          ? "Incomplete"
                          : money(totals.actual + totals.loaded)}
                      </strong>
                    </div>
                    <div>
                      <span>Net savings after incentives</span>
                      <strong
                        className={
                          totals.afterIncentives >= 0
                            ? "green-text"
                            : "amber-text"
                        }
                      >
                        {metricsInvalid
                          ? "Incomplete"
                          : money(totals.afterIncentives)}
                      </strong>
                    </div>
                  </div>
                  {c.plans.some(
                    (p) => !c.departments.some((d) => d.name === p.department),
                  ) && (
                    <div className="validation bad">
                      Some plans reference departments without an expense
                      budget. Their payouts are included in the company total
                      but not a department row. Add matching departments to
                      complete the breakdown.
                    </div>
                  )}
                </section>
              </details>
              <section className="panel editor">
                <div className="panel-heading">
                  <div>
                    <h2>Bonus payments by plan</h2>
                    <p>Only enabled plans contribute to company totals.</p>
                  </div>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Plan</th>
                        <th>Scope</th>
                        <th>Normal total bonus</th>
                        <th>Bonus payment</th>
                        <th>Maximum</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {c.plans.map((p) => {
                        const r = calculatePlan(resolvedPlan(c, p));
                        return (
                          <tr key={p.id}>
                            <td>{p.name}</td>
                            <td>
                              {p.composite
                                ? "Multi-part (budget equivalent)"
                                : p.scope}
                            </td>
                            <td>{money(r.pool)}</td>
                            <td>
                              {r.errors.length ? "Invalid" : money(r.payout)}
                            </td>
                            <td>{money(r.maximum)}</td>
                            <td>
                              {!p.enabled
                                ? "Excluded"
                                : r.errors.length
                                  ? "Fix rules"
                                  : !r.gatesPassed
                                    ? "Gate missed"
                                    : "Ready"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="rule-note">
                  <strong>Model boundaries</strong>
                  <p>
                    All plans are additive. Assigning the same employee to
                    several plans increases their total payout; covered
                    recipients are not unique employee records. Team bonuss are
                    split outside this model, and recipient count does not
                    multiply their budget. Net savings compares operating
                    expense budget with actual expense plus loaded incentives;
                    it is not net profit. Inputs are scenario assumptions, not
                    imported accounting or payroll data.
                  </p>
                </div>
              </section>
            </>
          )}
          <footer>
            © 2026 Q-Line Trucking · Incentive Builder · All amounts CAD{" "}
            <span>Transparent rules. Measurable outcomes.</span>
          </footer>
        </div>
      </main>
      {notice && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          {notice}
        </div>
      )}
      {account && (
        <div className="modal-backdrop">
          <section
            className="modal account-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Your account"
          >
            <button
              className="modal-close"
              aria-label="Close account"
              onClick={() => setAccount(false)}
            >
              <X size={19} />
            </button>
            <QLineBrand />
            <span className="eyebrow">YOUR Q-LINE WORKSPACE</span>
            <h2>Keep your work together.</h2>
            {!cloud ? (
              <>
                <p>
                  Cloud accounts need a Supabase project connected to this
                  deployment. Until then, multiple companies and plans save in
                  this browser. Export backups to move your work.
                </p>
                <div className="rule-note">
                  Setup instructions are included in README.md and
                  supabase/schema.sql. Your deployment needs the public project
                  URL and publishable key. Never use a service-role key in the
                  browser.
                </div>
                <div className="editor-footer">
                  <button className="button secondary" onClick={download}>
                    <Download size={15} />
                    Export backup
                  </button>
                  <button
                    className="button primary"
                    onClick={() => setAccount(false)}
                  >
                    Continue locally
                  </button>
                </div>
              </>
            ) : user ? (
              <>
                <p>
                  Signed in as <strong>{user.email}</strong>. Changes save to
                  cloud automatically after you pause typing. If this browser
                  has a different workspace, load your account’s workspace once
                  to connect it safely.
                </p>
                <div className="cloud-actions">
                  <button
                    disabled={busy || cloudSync.saving}
                    className="button secondary"
                    onClick={() => void loadCloud()}
                  >
                    Load cloud workspace
                  </button>
                  <button
                    disabled={
                      busy ||
                      cloudSync.saving ||
                      ["choose", "conflict"].includes(cloudSync.state)
                    }
                    className="button primary"
                    onClick={() => void saveCloud()}
                  >
                    <Save size={15} />
                    Save now
                  </button>
                </div>
                <div className="editor-footer">
                  <span>Local drafts remain on this browser.</span>
                  <button
                    disabled={busy || cloudSync.saving}
                    className="button secondary"
                    onClick={async () => {
                      if (
                        !confirm(
                          "Sign out and clear this browser’s workspace? Export a backup first if you have unsaved cloud changes.",
                        )
                      )
                        return;
                      if (!cloud) return;
                      const { error } = await cloud.auth.signOut();
                      if (error) {
                        notify(error.message);
                        return;
                      }
                      clearCloudDraft();
                      localStorage.removeItem(storageKey);
                      localStorage.removeItem(
                        "incentive-builder.business-profile.v1",
                      );
                      setWorkspace(sampleWorkspace());
                      setAccount(false);
                    }}
                  >
                    Sign out & clear local data
                  </button>
                </div>
              </>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void auth();
                }}
              >
                <p>
                  {authMode === "login"
                    ? "Sign in to load your companies and plans on any device."
                    : "Create a private account. Each user owns a separate workspace."}
                </p>
                <div className="form-grid">
                  <label>
                    Email
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </label>
                  <label>
                    Password
                    <input
                      type="password"
                      required
                      minLength={8}
                      autoComplete={
                        authMode === "login"
                          ? "current-password"
                          : "new-password"
                      }
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </label>
                </div>
                <div className="editor-footer">
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() =>
                      setAuthMode(authMode === "login" ? "signup" : "login")
                    }
                  >
                    {authMode === "login"
                      ? "Create account"
                      : "Back to sign in"}
                  </button>
                  <button
                    disabled={busy}
                    className="button primary"
                    type="submit"
                  >
                    {busy
                      ? "Please wait…"
                      : authMode === "login"
                        ? "Sign in"
                        : "Create account"}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
function Stat({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="metric">
      <div className="metric-label">{label}</div>
      <strong className="metric-value">{value}</strong>
      <div className="metric-detail">{note}</div>
    </div>
  );
}
function Text({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label>
      {label}
      <input value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max,
  step = "any",
  disabled = false,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number | string;
  disabled?: boolean;
}) {
  return (
    <label>
      {label}
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) =>
          onChange(
            Math.min(
              max ?? Infinity,
              Math.max(
                min,
                Number.isFinite(Number(e.target.value))
                  ? Number(e.target.value)
                  : min,
              ),
            ),
          )
        }
      />
    </label>
  );
}
