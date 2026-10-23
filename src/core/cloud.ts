import { createClient } from "@supabase/supabase-js";
import type { Project, Preferences } from "./types";
import { validatePreferences } from "./preferences";
import { cloudConfig } from "./cloudConfig";
const config = cloudConfig(import.meta.env);
export const cloud = config
  ? createClient(config.url, config.key, { auth: { flowType: "pkce" } })
  : null;
export async function cloudSave(project: Project) {
  if (!cloud) throw Error("Cloud is not configured.");
  const {
    data: { user },
  } = await cloud.auth.getUser();
  if (!user) throw Error("Sign in first.");
  const { error } = await cloud.from("projects").upsert({
    id: project.id,
    owner_id: user.id,
    payload: project,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}
export async function cloudLoad() {
  if (!cloud) throw Error("Cloud is not configured.");
  const { data, error } = await cloud
    .from("projects")
    .select("payload")
    .limit(20);
  if (error) throw error;
  return (data ?? []).map((p) => p.payload as Project);
}
export async function cloudDelete(projectId: string) {
  if (!cloud) throw Error("Cloud is not configured.");
  const { error } = await cloud.from("projects").delete().eq("id", projectId);
  if (error) throw error;
}
export async function syncPreferences(prefs?: Preferences) {
  if (!cloud) throw Error("Cloud is not configured.");
  const {
    data: { user },
  } = await cloud.auth.getUser();
  if (!user) throw Error("Sign in first.");
  if (prefs) {
    const { error } = await cloud.from("preferences").upsert({
      owner_id: user.id,
      payload: validatePreferences(prefs),
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    return prefs;
  }
  const { data, error } = await cloud
    .from("preferences")
    .select("payload")
    .eq("owner_id", user.id)
    .single();
  if (error) throw error;
  return validatePreferences(data.payload);
}
