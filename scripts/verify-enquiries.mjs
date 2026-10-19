import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = ts.transpileModule(readFileSync(new URL("../src/lib/enquiries.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { createEnquirySubmitter } = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
const target = new EventTarget();
globalThis.window = target;
let updates = 0;
target.addEventListener("sherise-popup-leads-updated", () => updates++);
const input = { name: "Test Visitor", mobile: "9876543210", email: "visitor@example.test",
  interestedIn: "Period care", message: "Please share pack options", source: "Website popup" };
const calls = [];
let saveFails = false;
let emailFails = false;
let emailThrows = false;
let storageResponse;
let storageThrows = false;
const submit = createEnquirySubmitter(async (url, options) => {
  const body = JSON.parse(options.body);
  calls.push({ url, body });
  if (url === "/api/popup-leads") {
    assert.equal(options.headers.Accept, "application/json");
    assert.equal(options.cache, "no-store");
    if (storageThrows) throw new Error("Network unavailable");
    if (storageResponse) return storageResponse.clone();
    return Response.json(saveFails ? { error: "Storage unavailable" } : { ok: true }, { status: saveFails ? 500 : 201 });
  }
  assert.equal(url, "https://api.web3forms.com/submit");
  assert.equal(body.access_key, "1b1c6440-1c30-4ced-85f9-e41df5e8b303");
  if (emailThrows) throw new Error("Network unavailable");
  return Response.json({ success: !emailFails }, { status: emailFails ? 429 : 200 });
});

for (const source of ["Website popup", "Contact form"]) {
  calls.length = 0;
  await submit({ ...input, source });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].body.source, source);
  assert.equal(calls[1].body.source, source);
  for (const field of ["name", "mobile", "email", "message"]) assert.equal(calls[1].body[field], input[field]);
  assert.equal(calls[1].body.topic, input.interestedIn);
  assert.ok(calls[1].body.subject.includes(source));
}
assert.equal(updates, 2);
saveFails = true;
calls.length = 0;
await assert.rejects(submit(input), /Storage unavailable/);
assert.equal(calls.length, 1, "Do not report email-only success when admin storage fails");
saveFails = false;
emailFails = true;
calls.length = 0;
await assert.rejects(submit(input), /enquiry is saved/);
assert.equal(calls.length, 2);
emailFails = false;
emailThrows = true;
calls.length = 0;
await assert.rejects(submit(input), /enquiry is saved/);
assert.equal(calls.length, 1, "Email retries must not duplicate the saved lead");
emailThrows = false;
calls.length = 0;
await submit(input);
assert.equal(calls.length, 1);
emailFails = true;
await assert.rejects(submit(input), /enquiry is saved/);
calls.length = 0;
emailFails = false;
await submit({ ...input, message: "An updated enquiry message" });
assert.equal(calls.length, 2, "Changed enquiries need a new admin record");

for (const response of [
  new Response('<!DOCTYPE html><html>Service unavailable</html>', { status: 503, headers: { 'content-type': 'text/html' } }),
  new Response('<!DOCTYPE html><html>Storefront fallback</html>', { headers: { 'content-type': 'text/html' } }),
  new Response('', { status: 502 }),
  Response.json(null),
  Response.json([]),
]) {
  storageResponse = response;
  calls.length = 0;
  await assert.rejects(submit(input), /could not reach the enquiry service/);
  assert.equal(calls.length, 1, "HTML and malformed storage responses must not trigger email or success");
}
storageResponse = undefined;
storageThrows = true;
await assert.rejects(submit(input), /could not reach the enquiry service/);
storageThrows = false;
calls.length = 0;
await submit(input);
assert.equal(calls.length, 2, "Retry must save and send after the service recovers");
delete globalThis.window;
console.log("PASS: both enquiry sources, email fields, admin persistence, partial failures, network errors, and duplicate-free email retries.");
