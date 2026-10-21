"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Building2,
  ChartNoAxesCombined,
  CheckCircle2,
  ChevronRight,
  Cloud,
  Copy,
  Download,
  Layers3,
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
import {
  Company,
  Metric,
  Plan,
  Workspace,
  calculatePlan,
  cloneCompany,
  companyTotals,
  id,
  industries,
  newCompany,
  parseWorkspace,
  roles,
  resolvedPlan,
  sampleWorkspace,
  template,
} from "../lib/workspace";
const money = (v: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);
const storageKey = "incentive-builder.workspace.v2";
const sections = [
  "Overview",
  "Business Profiles",
  "Job & Department Plans",
  "Financial Simulator",
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
    [busy, setBusy] = useState(false),
    [revision, setRevision] = useState<number | null>(null),
    [cloudSaved, setCloudSaved] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const currentRef = useRef(workspace);
  currentRef.current = workspace;
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
          const c = { ...initial.companies[0], period: "Annual" as const, departments: [], plans: [] };
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
      setCloudSaved("");
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
      if (_event === "SIGNED_IN" || _event === "SIGNED_OUT") {
        setRevision(null);
        setCloudSaved("");
      }
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
  const updateMetric = (m: Metric) => {
    if (activePlan)
      updatePlan({
        ...activePlan,
        metrics: activePlan.metrics.map((v) => (v.id === m.id ? m : v)),
      });
  };
  const download = () => {
    if (!workspace) return;
    const blob = new Blob([JSON.stringify(workspace, null, 2)], {
      type: "application/json",
    });
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
        notify("Signed in. Load your cloud workspace before saving changes.");
      } else notify("Check your email to confirm your account, then sign in.");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  };
  const loadCloud = async () => {
    if (!cloud || !user) return;
    setBusy(true);
    try {
      const { data, error } = await cloud
        .from("incentive_workspaces")
        .select("data,revision")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        setRevision(0);
        notify(
          "No cloud workspace yet. Save your current workspace to create one.",
        );
        return;
      }
      const loaded = parseWorkspace(JSON.stringify(data.data));
      if (
        !confirm(
          "Load your cloud workspace? This replaces the current browser workspace. Export a backup first if you need to retain local changes.",
        )
      )
        return;
      setWorkspace(loaded);
      setRevision(data.revision);
      setCloudSaved("Cloud workspace loaded");
      notify("Cloud workspace loaded.");
    } catch (e) {
      notify(
        e instanceof Error ? e.message : "Unable to load cloud workspace.",
      );
    } finally {
      setBusy(false);
    }
  };
  const saveCloud = async () => {
    if (!cloud || !user || !workspace) return;
    if (revision === null) {
      notify("Load cloud first to check for an existing workspace.");
      return;
    }
    try {
      parseWorkspace(JSON.stringify(workspace));
      if (
        workspace.companies.some(
          (company) =>
            !company.company.trim() ||
            company.plans.some(
              (p) => calculatePlan(resolvedPlan(company, p)).errors.length,
            ),
        )
      )
        throw Error("Invalid rules");
    } catch {
      notify("Resolve invalid company or plan values before saving to cloud.");
      return;
    }
    setBusy(true);
    const snapshot = workspace;
    try {
      const { data, error } = await cloud.rpc("save_incentive_workspace", {
        p_data: snapshot,
        p_expected_revision: revision,
      });
      if (error) throw error;
      setRevision(data);
      setCloudSaved(
        currentRef.current === snapshot
          ? "Saved to cloud"
          : "Cloud saved; newer local changes pending",
      );
      notify("Workspace saved to your private account.");
    } catch (e) {
      notify(
        e instanceof Error ? e.message : "Unable to save cloud workspace.",
      );
    } finally {
      setBusy(false);
    }
  };
  const addPlan = (scope: Plan["scope"]) => {
    if (!c) return;
    const p = template(
      "Company Driver",
      c.departments[0]?.name || "Fleet operations",
      scope,
    );
    if (scope === "department")
      p.metrics[0].target = Math.max(1, c.departments[0]?.budget || 100000);
    updateCompany({ plans: [...c.plans, p] });
    setSelected(p.id);
    setTab("Job & Department Plans");
  };
  const addCompany = () => {
    const fresh = newCompany();
    setWorkspace((w) =>
      w
        ? { ...w, companies: [...w.companies, fresh], activeId: fresh.id }
        : { version: 2, companies: [fresh], activeId: fresh.id },
    );
    setTab("Business Profiles");
  };
  if (!workspace || !c || !totals)
    return (
      <div className="loading-state">
        <Layers3 size={36} />
        <h1>Incentive Builder</h1>
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
        <a className="brand" href="/">
          <span className="brand-icon">
            <Layers3 size={23} />
          </span>
          <span>
            incentive<span className="brand-light">builder</span>
            <small>PERFORMANCE, ALIGNED.</small>
          </span>
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
              Target,
              ChartNoAxesCombined,
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
            <p>Any role. Any department. Clear rules and measurable results.</p>
            <button onClick={() => addPlan("individual")}>
              Create a custom plan <ArrowRight size={14} />
            </button>
          </div>
          <button className="nav-item" onClick={() => setAccount(true)}>
            <LogIn size={18} />
            {user ? "Your account" : "Private cloud account"}
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
            <span className="sample-badge">
              <span />
              {cloudSaved || "Browser autosave"}
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
              disabled={busy}
            >
              <Cloud size={16} />
              {user ? "Save to cloud" : "Connect account"}
            </button>
          </div>
        </header>
        <div className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">A GENERAL INCENTIVE WORKSPACE</div>
              <h1>
                {tab === "Overview"
                  ? "Performance with a bigger purpose."
                  : tab === "Business Profiles"
                    ? "Every company. One workspace."
                    : tab === "Job & Department Plans"
                      ? "Reward the outcomes that matter."
                      : "See the full financial picture."}
              </h1>
              <p>
                Build incentives for individuals and departments. Balance
                performance, operating costs, and growth.
              </p>
            </div>
            <button
              className="button primary"
              onClick={() => addPlan("individual")}
            >
              <Plus size={17} />
              New incentive plan
            </button>
          </div>
          {storageError && (
            <div className="validation bad" role="alert">
              {storageError}
            </div>
          )}
          <div className="workspace-status">
            <span>
              <CheckCircle2 size={15} />
              {storageError
                ? "Local saving needs attention"
                : "Changes are saved automatically in this browser"}
            </span>
            {user ? (
              <button disabled={busy} onClick={() => void loadCloud()}>
                Load cloud workspace
              </button>
            ) : (
              <button onClick={() => setAccount(true)}>
                Enable private cloud saving <ArrowRight size={14} />
              </button>
            )}
          </div>
          {tab === "Overview" && (
            <>
              <div className="setup-banner">
                <span className="setup-icon">
                  <Building2 size={22} />
                </span>
                <div>
                  <strong>{c.company}</strong>
                  <p>
                    {c.industry} · {c.period} planning period · {c.employees}{" "}
                    employees
                  </p>
                </div>
                <button onClick={() => setTab("Business Profiles")}>
                  Manage business profile <ArrowRight size={16} />
                </button>
              </div>
              <div className="metric-grid">
                <Stat
                  label="Company profiles"
                  value={String(workspace.companies.length)}
                  note="Separate companies, plans and scenarios"
                />
                <Stat
                  label="Active plans"
                  value={String(c.plans.filter((p) => p.enabled).length)}
                  note="Individual jobs and department pools"
                />
                <Stat
                  label="Loaded incentive cost"
                  value={metricsInvalid ? "Review plans" : money(totals.loaded)}
                  note={`${c.overhead}% employer burden included`}
                />
                <Stat
                  label="Period incentive budget"
                  value={money(c.budget)}
                  note={`${c.period} · not annualized`}
                />
              </div>
              <div className="dashboard-columns">
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Your incentive portfolio</h2>
                      <p>Every enabled plan contributes to the simulator.</p>
                    </div>
                    <span className="pill green">{c.period}</span>
                  </div>
                  <div className="portfolio-list">
                    {c.plans.length ? (
                      c.plans.map((p) => {
                        const r = calculatePlan(resolvedPlan(c, p));
                        return (
                          <button
                            key={p.id}
                            onClick={() => {
                              setSelected(p.id);
                              setTab("Job & Department Plans");
                            }}
                          >
                            <span className="role-icon">
                              {p.scope === "individual" ? (
                                <Users size={19} />
                              ) : (
                                <Building2 size={19} />
                              )}
                            </span>
                            <div>
                              <strong>{p.name}</strong>
                              <small>
                                {p.department} ·{" "}
                                {p.enabled ? "Enabled" : "Excluded"} ·{" "}
                                {p.scope === "individual"
                                  ? `${p.participants} recipients`
                                  : "Department pool"}
                              </small>
                            </div>
                            <b>
                              {r.errors.length ? "Fix rules" : money(r.payout)}
                            </b>
                            <ChevronRight size={15} />
                          </button>
                        );
                      })
                    ) : (
                      <div className="empty">
                        Create a job or department plan to begin.
                      </div>
                    )}
                  </div>
                  <div className="panel-footer">
                    <span>
                      <ShieldCheck size={15} />
                      Deterministic, capped payouts
                    </span>
                    <button onClick={() => setTab("Financial Simulator")}>
                      Explore exposure <ArrowRight size={15} />
                    </button>
                  </div>
                </section>
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Operating expense overview</h2>
                      <p>Budget vs. actual, before incentives.</p>
                    </div>
                  </div>
                  <div className="expense-chart">
                    {c.departments.map((d) => (
                      <div key={d.id}>
                        <div>
                          <span>{d.name}</span>
                          <strong>{money(d.actual)}</strong>
                        </div>
                        <div className="expense-track">
                          <span
                            style={{
                              width:
                                Math.min(
                                  100,
                                  (d.actual / Math.max(d.budget, d.actual, 1)) *
                                    100,
                                ) + "%",
                              background:
                                d.actual > d.budget ? "#c99858" : "#348a75",
                            }}
                          />
                        </div>
                        <small>
                          Budget {money(d.budget)} ·{" "}
                          {d.actual <= d.budget ? "Favorable" : "Over budget"}{" "}
                          {money(Math.abs(d.budget - d.actual))}
                        </small>
                      </div>
                    ))}
                  </div>
                  <div className="chart-insight">
                    <ShieldCheck size={18} />
                    <p>
                      Review results and safety measures before awarding
                      payouts.
                    </p>
                  </div>
                </section>
              </div>
              <div className="section-title">
                <h2>Build around the way you work</h2>
              </div>
              <div className="path-grid">
                {[
                  {
                    title: "Company profiles",
                    text: "Keep each business, budget, and plan portfolio separate.",
                    icon: Building2,
                    action: () => setTab("Business Profiles"),
                  },
                  {
                    title: "Individual job incentives",
                    text: "Start with trucking roles or define any custom position.",
                    icon: Users,
                    action: () => addPlan("individual"),
                  },
                  {
                    title: "Department incentives",
                    text: "Reward cost control alongside quality and service.",
                    icon: Wallet,
                    action: () => addPlan("department"),
                  },
                ].map(({ title, text, icon: Icon, action }) => (
                  <button className="path-card" key={title} onClick={action}>
                    <div className="path-top">
                      <span className="path-icon">
                        <Icon size={22} />
                      </span>
                      <ArrowRight size={17} />
                    </div>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </button>
                ))}
              </div>
            </>
          )}
          {tab === "Business Profiles" && (
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
                      if (confirm(`Delete ${c.company} and all its plans?`)) {
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
              <section className="panel editor">
                <div className="panel-heading">
                  <div>
                    <h2>Business profile</h2>
                    <p>
                      Company revenue is annual. Budgets and operating expenses
                      use the selected planning period.
                    </p>
                  </div>
                </div>
                <div className="form-grid">
                  <Text
                    label="Company name"
                    value={c.company}
                    onChange={(v) => updateCompany({ company: v })}
                  />
                  <label>
                    Industry
                    <select
                      value={c.industry}
                      onChange={(e) =>
                        updateCompany({ industry: e.target.value })
                      }
                    >
                      {[...new Set([...industries, c.industry])].map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </label>
                  <NumberField
                    label="Annual revenue ($)"
                    value={c.revenue}
                    onChange={(v) => updateCompany({ revenue: v })}
                  />
                  <NumberField
                    label="Revenue growth target (%)"
                    value={c.growth}
                    onChange={(v) => updateCompany({ growth: v })}
                  />
                  <NumberField
                    label="Gross margin target (%)"
                    value={c.margin}
                    min={1}
                    max={100}
                    onChange={(v) => updateCompany({ margin: v })}
                  />
                  <NumberField
                    label="Employee count"
                    value={c.employees}
                    step={1}
                    onChange={(v) =>
                      updateCompany({ employees: Math.round(v) })
                    }
                  />
                  <label>
                    Planning period
                    <select
                      value={c.period}
                      onChange={(e) => {
                        if (
                          confirm(
                            "Change period label? Existing dollar amounts will not be converted. Update all budgets and metric targets to match the new period.",
                          )
                        )
                          updateCompany({
                            period: e.target.value as Company["period"],
                          });
                      }}
                    >
                      {["Monthly", "Quarterly", "Annual"].map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </label>
                  <NumberField
                    label={`${c.period} incentive budget ($, including burden)`}
                    value={c.budget}
                    onChange={(v) => updateCompany({ budget: v })}
                  />
                  <NumberField
                    label="Employer burden on incentive payouts (%)"
                    value={c.overhead}
                    onChange={(v) => updateCompany({ overhead: v })}
                  />
                </div>
                <div className="editor-footer">
                  <span>
                    All budgets and payouts are in USD. Period changes do not
                    convert values.
                  </span>
                  <button
                    className="button primary"
                    onClick={() => setTab("Job & Department Plans")}
                  >
                    Build incentives <ArrowRight size={15} />
                  </button>
                </div>
              </section>
              <section className="panel editor">
                <div className="panel-heading">
                  <div>
                    <h2>Departments & operating expenses</h2>
                    <p>
                      {c.period} expense amounts exclude incentive payouts and
                      employer burden.
                    </p>
                  </div>
                  <button
                    className="button secondary"
                    onClick={() =>
                      updateCompany({
                        departments: [
                          ...c.departments,
                          {
                            id: id(),
                            name: "New department",
                            budget: 0,
                            actual: 0,
                          },
                        ],
                      })
                    }
                  >
                    <Plus size={15} />
                    Department
                  </button>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Department</th>
                        <th>Expense budget ($)</th>
                        <th>Scenario actual ($)</th>
                        <th>Budget − actual</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {c.departments.map((d) => (
                        <tr key={d.id}>
                          <td>
                            <input
                              aria-label="Department name"
                              style={{ width: 180 }}
                              value={d.name}
                              onChange={(e) => {
                                const name = e.target.value;
                                if (
                                  c.departments.some(
                                    (v) => v.id !== d.id && v.name === name,
                                  )
                                ) {
                                  notify("Department names must be unique.");
                                  return;
                                }
                                updateCompany({
                                  departments: c.departments.map((v) =>
                                    v.id === d.id ? { ...v, name } : v,
                                  ),
                                  plans: c.plans.map((p) =>
                                    p.department === d.name
                                      ? { ...p, department: name }
                                      : p,
                                  ),
                                });
                              }}
                            />
                          </td>
                          {(["budget", "actual"] as const).map((key) => (
                            <td key={key}>
                              <input
                                aria-label={`${d.name} ${key}`}
                                style={{ width: 125 }}
                                type="number"
                                min="0"
                                value={d[key]}
                                onChange={(e) =>
                                  updateCompany({
                                    departments: c.departments.map((v) =>
                                      v.id === d.id
                                        ? {
                                            ...v,
                                            [key]: Math.max(0, +e.target.value),
                                          }
                                        : v,
                                    ),
                                  })
                                }
                              />
                            </td>
                          ))}
                          <td
                            className={
                              d.budget >= d.actual ? "green-text" : "amber-text"
                            }
                          >
                            {money(d.budget - d.actual)}
                          </td>
                          <td>
                            <button
                              aria-label={`Delete ${d.name}`}
                              onClick={() => {
                                if (
                                  c.plans.some((p) => p.department === d.name)
                                ) {
                                  notify(
                                    "Move or delete plans assigned to this department first.",
                                  );
                                  return;
                                }
                                if (confirm(`Delete ${d.name}?`))
                                  updateCompany({
                                    departments: c.departments.filter(
                                      (v) => v.id !== d.id,
                                    ),
                                  });
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="rule-note">
                  Use distinct department names. For department plans, operating
                  expense metrics are linked to the matching department actual
                  in the simulator.
                </div>
              </section>
            </>
          )}
          {tab === "Job & Department Plans" && (
            <div className="builder-layout">
              <section className="panel plan-picker">
                <div className="panel-heading">
                  <h2>Plan portfolio</h2>
                </div>
                {c.plans.map((p) => (
                  <button
                    key={p.id}
                    className={activePlan?.id === p.id ? "selected" : ""}
                    onClick={() => setSelected(p.id)}
                  >
                    <strong>{p.name}</strong>
                    <small>
                      {p.scope === "individual" ? p.role : "Department pool"} ·{" "}
                      {p.enabled ? "Enabled" : "Excluded"}
                    </small>
                  </button>
                ))}
                <div className="plan-add">
                  <button
                    className="button secondary"
                    onClick={() => addPlan("individual")}
                  >
                    <Plus size={14} />
                    Job plan
                  </button>
                  <button
                    className="button secondary"
                    onClick={() => addPlan("department")}
                  >
                    <Plus size={14} />
                    Department plan
                  </button>
                </div>
              </section>
              {activePlan ? (
                <section className="panel editor">
                  <div className="panel-heading">
                    <div>
                      <h2>Customize your incentive plan</h2>
                      <p>
                        {c.period} targets and payouts. Templates are starting
                        points, not advice.
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
                      Plan scope
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
                          Individual job · per-person incentive
                        </option>
                        <option value="department">
                          Department · shared incentive pool
                        </option>
                      </select>
                    </label>
                    <label>
                      Department
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
                      label="Job / position (fully editable)"
                      value={activePlan.role}
                      onChange={(v) => updatePlan({ ...activePlan, role: v })}
                    />
                    <label>
                      Trucking job template
                      <select
                        value=""
                        onChange={(e) => {
                          if (!e.target.value) return;
                          if (
                            confirm(
                              "Replace this plan’s metrics with this job template?",
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
                    <NumberField
                      label="Covered recipients (not unique employees)"
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
                    <NumberField
                      label={
                        activePlan.scope === "individual"
                          ? `${c.period} target incentive per person ($)`
                          : `${c.period} total department incentive pool ($)`
                      }
                      value={activePlan.incentive}
                      onChange={(v) =>
                        updatePlan({ ...activePlan, incentive: v })
                      }
                    />
                    <NumberField
                      label="Overall payout cap (% of target pool)"
                      value={activePlan.cap}
                      onChange={(v) => updatePlan({ ...activePlan, cap: v })}
                    />
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
                      Include this plan in financial exposure
                    </label>
                    <button
                      className="button secondary"
                      onClick={() =>
                        updatePlan({
                          ...activePlan,
                          metrics: [
                            ...activePlan.metrics,
                            {
                              id: id(),
                              name: "Custom metric",
                              unit: "units",
                              direction: "higher",
                              weight: 0,
                              target: 100,
                              actual: 100,
                              threshold: 80,
                              cap: 150,
                              accelerator: 1.25,
                              gate: false,
                              source: "manual",
                            },
                          ],
                        })
                      }
                    >
                      <Plus size={15} />
                      Add metric
                    </button>
                  </div>
                  <div className="metric-editor-list">
                    {activePlan.metrics.map((m, index) => {
                      const effective = resolvedPlan(c, activePlan).metrics[
                        index
                      ];
                      return (
                        <div className="metric-editor" key={m.id}>
                          <div className="metric-editor-heading">
                            <Text
                              label={`Metric ${index + 1}`}
                              value={m.name}
                              onChange={(v) => updateMetric({ ...m, name: v })}
                            />
                            <button
                              aria-label={`Remove ${m.name}`}
                              onClick={() =>
                                updatePlan({
                                  ...activePlan,
                                  metrics: activePlan.metrics.filter(
                                    (v) => v.id !== m.id,
                                  ),
                                })
                              }
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                          <div className="metric-fields">
                            <label>
                              Direction
                              <select
                                value={m.direction}
                                onChange={(e) =>
                                  updateMetric({
                                    ...m,
                                    direction: e.target
                                      .value as Metric["direction"],
                                  })
                                }
                              >
                                <option value="higher">Higher is better</option>
                                <option value="lower">Lower is better</option>
                              </select>
                            </label>
                            <Text
                              label="Unit"
                              value={m.unit}
                              onChange={(v) => updateMetric({ ...m, unit: v })}
                            />
                            <NumberField
                              label="Target (zero allowed for gates)"
                              value={m.target}
                              min={m.gate ? 0 : 0.001}
                              onChange={(v) =>
                                updateMetric({ ...m, target: v })
                              }
                            />
                            <NumberField
                              label={
                                m.source === "department-opex"
                                  ? "Linked department actual"
                                  : "Scenario actual"
                              }
                              value={effective.actual}
                              disabled={m.source === "department-opex"}
                              onChange={(v) =>
                                updateMetric({ ...m, actual: v })
                              }
                            />
                            {!m.gate && (
                              <>
                                <NumberField
                                  label="Weight (%)"
                                  value={m.weight}
                                  max={100}
                                  onChange={(v) =>
                                    updateMetric({ ...m, weight: v })
                                  }
                                />
                                <NumberField
                                  label="Threshold attainment (%)"
                                  value={m.threshold}
                                  max={100}
                                  onChange={(v) =>
                                    updateMetric({ ...m, threshold: v })
                                  }
                                />
                                <NumberField
                                  label="Metric maximum payout (%)"
                                  value={m.cap}
                                  onChange={(v) =>
                                    updateMetric({ ...m, cap: v })
                                  }
                                />
                                <NumberField
                                  label="Above-target accelerator (×)"
                                  value={m.accelerator}
                                  onChange={(v) =>
                                    updateMetric({ ...m, accelerator: v })
                                  }
                                />
                              </>
                            )}
                          </div>
                          <div className="gate-control">
                            <label>
                              <input
                                type="checkbox"
                                checked={m.gate}
                                onChange={(e) =>
                                  updateMetric({
                                    ...m,
                                    gate: e.target.checked,
                                    weight: 0,
                                  })
                                }
                              />
                              Mandatory gate · no payout if target is missed
                            </label>
                            <label>
                              Actual source
                              <select
                                value={m.source}
                                onChange={(e) =>
                                  updateMetric({
                                    ...m,
                                    source: e.target.value as Metric["source"],
                                  })
                                }
                              >
                                <option value="manual">Enter manually</option>
                                <option value="department-opex">
                                  Department operating expense
                                </option>
                              </select>
                            </label>
                          </div>
                          {m.gate && (
                            <p className="field-hint">
                              A lower-is-better gate with target 0 requires zero
                              incidents. Any actual above zero blocks the entire
                              plan payout.
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
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
                            : `Weights total 100%. Target pool ${money(r.pool)}. Maximum payout ${money(r.maximum)}.`}
                        </div>
                        {!r.gatesPassed && (
                          <div className="validation bad">
                            Mandatory gate missed. This plan pays zero.
                          </div>
                        )}
                      </>
                    );
                  })()}
                  <div className="rule-note">
                    <strong>Clear, deterministic rules</strong>
                    <p>
                      Higher-is-better attainment = actual ÷ target.
                      Lower-is-better attainment = target ÷ actual; zero actual
                      reaches the metric cap. Below the threshold pays zero. Up
                      to target, payout follows attainment; above target, the
                      accelerator applies. Metric caps and the overall plan cap
                      both apply. Mandatory gates require the actual to meet or
                      beat the target and carry no weight. Scored targets must
                      be positive; gates may use zero. For safety metrics, never
                      reward mileage, speed, or cost savings at the expense of
                      compliance.
                    </p>
                  </div>
                </section>
              ) : (
                <section className="panel empty">
                  Add an individual job or department plan to begin.
                </section>
              )}
            </div>
          )}
          {tab === "Financial Simulator" && (
            <>
              <div className="setup-banner">
                <span className="setup-icon">
                  <ChartNoAxesCombined size={22} />
                </span>
                <div>
                  <strong>{c.period} portfolio simulation</strong>
                  <p>
                    Change metric actuals in plan rules and department expenses
                    here. Results recalculate instantly.
                  </p>
                </div>
                <button onClick={() => setTab("Job & Department Plans")}>
                  Edit plan scenarios <ArrowRight size={16} />
                </button>
              </div>
              {metricsInvalid && (
                <div className="validation bad" role="alert">
                  One or more enabled plans have invalid rules. Fix them before
                  relying on these totals. Invalid plans are excluded from
                  payouts.
                </div>
              )}
              <div className="metric-grid">
                <Stat
                  label="Total payouts"
                  value={metricsInvalid ? "Incomplete" : money(totals.payout)}
                  note="Before employer burden"
                />
                <Stat
                  label="Loaded employer cost"
                  value={metricsInvalid ? "Incomplete" : money(totals.loaded)}
                  note={`${c.overhead}% burden added to payouts`}
                />
                <Stat
                  label="Maximum employer exposure"
                  value={
                    metricsInvalid ? "Incomplete" : money(totals.loadedMaximum)
                  }
                  note="All enabled plans at their payout caps"
                />
                <Stat
                  label="Incentive budget variance"
                  value={
                    metricsInvalid
                      ? "Incomplete"
                      : money(c.budget - totals.loaded)
                  }
                  note="Positive = remaining budget"
                />
              </div>
              <section className="panel editor">
                <div className="panel-heading">
                  <div>
                    <h2>Operating expense by department</h2>
                    <p>
                      All expense amounts exclude incentives; loaded incentives
                      are added once below.
                    </p>
                  </div>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Department</th>
                        <th>Budget ($)</th>
                        <th>Scenario expense ($)</th>
                        <th>Loaded incentives</th>
                        <th>Total loaded OpEx</th>
                        <th>Net vs. expense budget</th>
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
                    Some plans reference departments without an expense budget.
                    Their payouts are included in the company total but not a
                    department row. Add matching departments to complete the
                    breakdown.
                  </div>
                )}
              </section>
              <section className="panel editor">
                <div className="panel-heading">
                  <div>
                    <h2>Plan payout breakdown</h2>
                    <p>Only enabled plans contribute to company totals.</p>
                  </div>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Plan</th>
                        <th>Scope</th>
                        <th>Target pool</th>
                        <th>Current payout</th>
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
                            <td>{p.scope}</td>
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
                    recipients are not unique employee records. Department pools
                    are split outside this model, and recipient count does not
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
            © 2026 Incentive Builder{" "}
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
            aria-label="Private cloud account"
          >
            <button
              className="modal-close"
              aria-label="Close account"
              onClick={() => setAccount(false)}
            >
              <X size={19} />
            </button>
            <span className="eyebrow">PRIVATE WORKSPACE</span>
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
                  Signed in as <strong>{user.email}</strong>. Load the latest
                  cloud workspace before editing on a new device, then save your
                  changes to cloud.
                </p>
                <div className="cloud-actions">
                  <button
                    disabled={busy}
                    className="button secondary"
                    onClick={() => void loadCloud()}
                  >
                    Load cloud workspace
                  </button>
                  <button
                    disabled={busy || revision === null}
                    className="button primary"
                    onClick={() => void saveCloud()}
                  >
                    <Save size={15} />
                    Save to cloud
                  </button>
                </div>
                <div className="editor-footer">
                  <span>Local drafts remain on this browser.</span>
                  <button
                    disabled={busy}
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
