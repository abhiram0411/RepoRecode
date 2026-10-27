import { selectAllCode } from "./helpers/editor";
import { test, expect } from "@playwright/test";
import { zipSync, strToU8 } from "fflate";
test("interactive form input, select, checkbox, submit and failure recovery", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Import a project", exact: true })
    .click();
  const fixture = zipSync({
    "interactive/package.json": strToU8('{"dependencies":{"react":"^19.0.0"}}'),
    "interactive/App.tsx": strToU8(`import {useState,useEffect} from 'react';
      export function double(n:number):number{return n*2}
      export default function App(){const [name,setName]=useState('');const [choice,setChoice]=useState('a');const [yes,setYes]=useState(false);const [sent,setSent]=useState(false);const [ready,setReady]=useState(false);useEffect(()=>setReady(true),[]);
      return <form onSubmit={e=>{e.preventDefault();setSent(true)}}><h1>{ready?'Ready':'Waiting'}</h1><label>Name<input value={name} onChange={e=>setName(e.target.value)}/></label><label>Choice<select value={choice} onChange={e=>setChoice(e.target.value)}><option value="a">Alpha</option><option value="b">Beta</option></select></label><label>Agree<input type="checkbox" checked={yes} onChange={e=>setYes(e.target.checked)}/></label><p>{name}:{choice}:{yes?'yes':'no'}:{sent?'sent':'draft'}</p><button type="submit">Send</button><button type="button" onClick={()=>{throw Error('Fixture event failed')}}>Fail safely</button></form>}`),
  });
  await page.locator('input[type=file][accept=".zip"]').setInputFiles({
    name: "interactive.zip",
    mimeType: "application/zip",
    buffer: Buffer.from(fixture),
  });
  await page.getByRole("button", { name: /Understand double/ }).click();
  await page.getByRole("button", { name: "Live preview", exact: true }).click();
  await page.getByLabel("Preview mode").selectOption("interactive");
  await page.getByLabel("Inspect source locations").uncheck();
  await page.getByRole("button", { name: "Render current code" }).click();
  const frame = page.frameLocator(
    'iframe[title="Isolated React render snapshot"]',
  );
  await expect(
    frame.getByRole("heading", { name: "Ready", exact: true }),
  ).toBeVisible({ timeout: 30000 });
  await frame.getByLabel("Name", { exact: true }).fill("Ada");
  await expect(frame.getByText("Ada:a:no:draft")).toBeVisible();
  await expect(frame.getByLabel("Name", { exact: true })).toBeFocused();
  await frame.getByLabel("Choice").selectOption("b");
  await expect(frame.getByText("Ada:b:no:draft")).toBeVisible();
  await frame.getByLabel("Agree").check();
  await expect(frame.getByText("Ada:b:yes:draft")).toBeVisible();
  await frame.getByRole("button", { name: "Send", exact: true }).click();
  await expect(frame.getByText("Ada:b:yes:sent")).toBeVisible();
  await frame.getByRole("button", { name: "Fail safely" }).click();
  await expect(page.getByText(/Fixture event failed/)).toBeVisible();
  await expect(frame.getByText("Ada:b:yes:sent")).toBeVisible();
  await page.getByRole("button", { name: "Render current code" }).click();
  await expect(frame.getByText(":a:no:draft", { exact: true })).toBeVisible();
});
test("interactive preview retains state, inspects source and resets safely", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explore the sample", exact: true })
    .click();
  await page.getByRole("button", { name: /Understand completionRate/ }).click();
  await page.getByRole("button", { name: "Live preview", exact: true }).click();
  await page.getByLabel("Preview mode").selectOption("interactive");
  await page.getByRole("button", { name: "Render current code" }).click();
  const frame = page.frameLocator(
    'iframe[title="Isolated React render snapshot"]',
  );
  await expect(frame.getByText("0% complete", { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByText(/Interactive session ready/)).toBeVisible();
  await page.getByLabel("Inspect source locations").uncheck();
  await frame.getByRole("button", { name: "Complete a stage" }).click();
  await expect(frame.getByText("20% complete", { exact: true })).toBeVisible();
  await frame.getByRole("button", { name: "Complete a stage" }).click();
  await expect(frame.getByText("40% complete", { exact: true })).toBeVisible();
  const reads = page.getByRole("list", { name: "Observed state reads" });
  await expect(
    reads.getByRole("button", {
      name: /completed · useState · src\/App.tsx:4/,
    }),
  ).toBeVisible();
  await expect(reads.locator("pre")).toHaveText("2");
  await reads.getByRole("button", { name: /completed · useState/ }).click();
  await expect(
    page.getByRole("heading", { name: "Get to know App", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByLabel("Observed preview events")
      .getByText("#2 click: rendered output changed"),
  ).toBeVisible();
  await expect(
    page
      .getByRole("list", { name: "Observed function calls" })
      .getByRole("button", { name: /completionRate · src\/lib\/progress.ts:/ }),
  ).toBeVisible();
  await page
    .getByRole("list", { name: "Observed function calls" })
    .getByRole("button", { name: /completionRate ·/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Get to know completionRate" }),
  ).toBeVisible();
  await page.getByLabel("Inspect source locations").check();
  await frame.getByRole("heading", { name: "Ridge loop" }).click();
  await expect(
    page.getByRole("heading", { name: "Get to know TrailCard" }),
  ).toBeVisible();
  await expect(frame.getByText("40% complete", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Render current code" }).click();
  await expect(
    page.getByRole("button", { name: "Render current code" }),
  ).toBeEnabled({ timeout: 30000 });
  await expect(frame.getByText("0% complete", { exact: true })).toBeVisible();
  await page
    .getByRole("list", { name: "Observed function calls" })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "artifacts/interactive-preview.png",
    fullPage: true,
  });
});
test("real React render supports element inspection and code-to-element highlighting", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explore the sample", exact: true })
    .click();
  await page.getByRole("button", { name: /Understand completionRate/ }).click();
  await page.getByRole("button", { name: "Live preview", exact: true }).click();
  await page.getByRole("button", { name: "Render current code" }).click();
  const frame = page.frameLocator(
    'iframe[title="Isolated React render snapshot"]',
  );
  await expect(
    frame.getByRole("heading", { name: "Trail journal" }),
  ).toBeVisible({ timeout: 30000 });
  await expect(frame.getByText("0% complete", { exact: true })).toBeVisible();
  await frame.getByRole("heading", { name: "Ridge loop" }).click();
  await expect(
    page.getByRole("heading", { name: "Get to know TrailCard" }),
  ).toBeVisible();
  await expect(
    frame.getByRole("heading", { name: "Ridge loop" }),
  ).toHaveAttribute("data-rr-file", "src/components/TrailCard.tsx");
  await page.screenshot({
    path: "artifacts/react-preview.png",
    fullPage: true,
  });
  const target = await page
    .getByRole("option", { name: /^completionRate —/ })
    .getAttribute("value");
  await page.getByLabel("Select symbol").selectOption(target!);
  await page.getByRole("button", { name: "Hide & rewrite" }).click();
  const editor = page.getByRole("textbox", {
    name: "Practice code",
    exact: true,
  });
  await editor.focus();
  await selectAllCode(page);
  await page.keyboard.insertText(
    "function completionRate(completed:number,total:number):number { return 73; }",
  );
  await page.getByRole("button", { name: "Live preview", exact: true }).click();
  await page.getByRole("button", { name: "Render current code" }).click();
  await expect(frame.getByText("73% complete", { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await editor.focus();
  await selectAllCode(page);
  await page.keyboard.insertText(
    "function completionRate(completed:number,total:number):number { return missingValue; }",
  );
  await page.getByRole("button", { name: "Render current code" }).click();
  await expect(
    page.getByText(/The last working render is preserved/),
  ).toBeVisible({ timeout: 30000 });
  await expect(frame.getByText("73% complete", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Technical flow", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Component tree", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Rebuild completionRate" }),
  ).toBeVisible();
});
