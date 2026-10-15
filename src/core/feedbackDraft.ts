export type FeedbackCategory = "feature" | "bug" | "general";
const titles = {
  feature: "Feature request",
  bug: "Bug report",
  general: "General feedback",
};
const issueBase = "https://github.com/abhiram0411/RepoRecode/issues/new";

// Only explicitly entered feedback goes into a user-opened draft. No account,
// source, contact email, progress, identifier or telemetry is accepted here.
export function feedbackDraft(category: FeedbackCategory, message: string) {
  const text = message.trim();
  if (
    !Object.hasOwn(titles, category) ||
    text.length < 10 ||
    text.length > 3000
  )
    return null;
  const title = titles[category];
  const body = `## ${title}\n\n${text}`;
  const url = new URL(issueBase);
  url.searchParams.set("title", title);
  url.searchParams.set("body", body);
  // Bound encoded URLs, including multibyte text. Never truncate the message;
  // longer drafts use copy-and-paste into a blank issue instead.
  const prefilled = url.href.length <= 6500;
  if (!prefilled) url.searchParams.delete("body");
  return { body, url: url.href, prefilled };
}
