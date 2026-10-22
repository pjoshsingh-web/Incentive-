"use client";
import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { cloud } from "../../lib/cloud";
import {
  Autosaver,
  Checkpoint,
  resumeDecision,
  stableJSON,
} from "../../lib/autosave";
import { parseWorkspace, Workspace } from "../../lib/workspace";
const draftKey = "incentive-builder.cloud-draft.v1";
type State =
  | "local"
  | "checking"
  | "choose"
  | "pending"
  | "saving"
  | "saved"
  | "error"
  | "conflict";
export function useCloudAutosave(
  userId: string | undefined,
  workspace: Workspace | null,
  setWorkspace: Dispatch<SetStateAction<Workspace | null>>,
) {
  const [state, setState] = useState<State>("local"),
    [error, setError] = useState(""),
    [restart, setRestart] = useState(0),
    [draftWarning, setDraftWarning] = useState("");
  const latest = useRef(workspace);
  latest.current = workspace;
  const engine = useRef<Autosaver<Workspace> | null>(null);
  const loadAction = useRef<() => Promise<void>>(async () => {});
  const checkAction = useRef<() => Promise<void>>(async () => {});
  const stateRef = useRef(state);
  stateRef.current = state;
  useEffect(() => {
    const client = cloud;
    if (!client || !userId || !latest.current) {
      setState("local");
      return;
    }
    let active = true,
      checking = false;
    const owner = userId;
    engine.current = null;
    setError("");
    setDraftWarning("");
    const status = (value: State, message = "") => {
      if (active) {
        stateRef.current = value;
        setState(value);
        setError(message);
      }
    };
    const token = async () => {
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      if (!active || data.session?.user.id !== owner)
        throw Error("Please sign in again before saving.");
      return data.session.access_token;
    };
    const read = async () => {
      const auth = await token();
      const { data, error } = await client
        .from("incentive_workspaces")
        .select("data,revision")
        .eq("user_id", owner)
        .setHeader("Authorization", "Bearer " + auth)
        .abortSignal(AbortSignal.timeout(15000))
        .maybeSingle();
      if (error) throw Error(error.message);
      if (!data) return null;
      if (!Number.isInteger(data.revision) || data.revision < 1)
        throw Error("Invalid cloud revision.");
      return {
        revision: data.revision,
        data: parseWorkspace(JSON.stringify(data.data)),
      };
    };
    const checkpoint = () => {
      try {
        const raw = localStorage.getItem(draftKey);
        if (!raw) return null;
        const draft = JSON.parse(raw) as Checkpoint<Workspace>;
        if (
          typeof draft.userId !== "string" ||
          !Number.isInteger(draft.revision) ||
          draft.revision < 0 ||
          typeof draft.baseline !== "string"
        )
          return null;
        parseWorkspace(JSON.stringify(draft.data));
        return draft;
      } catch {
        return null;
      }
    };
    const bind = (revision: number, baseline: string, data: Workspace) => {
      engine.current?.close();
      engine.current = new Autosaver({
        userId: owner,
        data,
        revision,
        baseline,
        write: async (data, revision) => {
          parseWorkspace(JSON.stringify(data));
          const auth = await token();
          const { data: next, error } = await client
            .rpc("save_incentive_workspace", {
              p_data: data,
              p_expected_revision: revision,
            })
            .setHeader("Authorization", "Bearer " + auth)
            .abortSignal(AbortSignal.timeout(15000));
          if (error) throw Error(error.message);
          return next;
        },
        checkpoint: (value) => {
          if (!active) return;
          try {
            localStorage.setItem(draftKey, JSON.stringify(value));
            setDraftWarning("");
          } catch {
            setDraftWarning(
              "Browser draft storage is full or blocked. Keep this page open until cloud saving finishes, or export a backup.",
            );
          }
        },
        status,
      });
    };
    const check = async () => {
      if (checking || engine.current?.saving) return;
      checking = true;
      status("checking");
      try {
        const remote = await read();
        if (!active || !latest.current) return;
        const current = latest.current;
        const decision = resumeDecision(owner, checkpoint(), remote, current);
        if (decision === "choose") {
          status(
            "choose",
            "Your browser has a different workspace. Export a backup if needed, then load your account’s workspace to start autosave.",
          );
          return;
        }
        if (decision === "conflict") {
          status(
            "conflict",
            "A newer cloud version exists. Export your browser changes, then load the latest cloud workspace.",
          );
          return;
        }
        if (decision === "load" && remote) {
          latest.current = remote.data;
          setWorkspace(remote.data);
          bind(remote.revision, stableJSON(remote.data), remote.data);
        } else
          bind(
            remote?.revision ?? 0,
            remote ? stableJSON(remote.data) : "",
            current,
          );
      } catch (e) {
        if (active)
          status(
            "error",
            e instanceof Error ? e.message : "Could not connect to cloud.",
          );
      } finally {
        checking = false;
      }
    };
    const load = async () => {
      if (checking || engine.current?.saving) return;
      if (
        !confirm(
          "Load the latest cloud workspace? This replaces your browser workspace. Export a backup first if you need to keep local changes.",
        )
      )
        return;
      checking = true;
      engine.current?.close();
      engine.current = null;
      status("checking");
      try {
        const remote = await read();
        if (!active || !latest.current) return;
        if (!remote) {
          const prior = checkpoint();
          if (prior && prior.userId !== owner) {
            status(
              "choose",
              "This account has no cloud workspace. Sign out and clear the previous account’s local data before creating one.",
            );
            return;
          }
          bind(0, "", latest.current);
          return;
        }
        latest.current = remote.data;
        setWorkspace(remote.data);
        bind(remote.revision, stableJSON(remote.data), remote.data);
      } catch (e) {
        if (active)
          status(
            "error",
            e instanceof Error ? e.message : "Could not load cloud workspace.",
          );
      } finally {
        checking = false;
      }
    };
    checkAction.current = check;
    loadAction.current = load;
    const online = () => {
      if (stateRef.current === "error") void check();
    };
    const focus = () => {
      if (stateRef.current === "error") void check();
    };
    window.addEventListener("online", online);
    window.addEventListener("focus", focus);
    void check();
    return () => {
      active = false;
      engine.current?.close();
      engine.current = null;
      window.removeEventListener("online", online);
      window.removeEventListener("focus", focus);
    };
  }, [userId, workspace !== null, restart, setWorkspace]);
  useEffect(() => {
    if (workspace) engine.current?.update(workspace);
  }, [workspace]);
  const save = async () => {
    if (stateRef.current === "conflict" || stateRef.current === "choose")
      return;
    if (engine.current && stateRef.current !== "error")
      await engine.current.save();
    else await checkAction.current();
  };
  const retry = () => {
    if (stateRef.current === "conflict") return;
    setRestart((v) => v + 1);
  };
  const message = (
    {
      local: "Saved in this browser",
      checking: "Connecting to cloud…",
      choose: "Load your workspace to start cloud autosave",
      pending: "Changes waiting to save…",
      saving: "Saving to cloud…",
      saved: "All changes saved to cloud",
      error: "Cloud save paused — browser draft kept",
      conflict: "Cloud conflict — browser draft kept",
    } as Record<State, string>
  )[state];
  return {
    state,
    message,
    error,
    draftWarning,
    saving: state === "saving" || state === "checking",
    save,
    retry,
    load: () => loadAction.current(),
  };
}
export function clearCloudDraft() {
  localStorage.removeItem(draftKey);
}
