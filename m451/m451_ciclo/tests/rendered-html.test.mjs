import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("renderiza a página que hospeda o infográfico", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>Ciclo de Gestão Contratual/);
  assert.match(html, /src="\/infografico\.html"/);
  assert.match(html, /Infográfico interativo do ciclo de gestão contratual/);
  assert.match(html, /og\.png/);
});

test("o arquivo independente contém as seis etapas, detalhes e controles", async () => {
  const html = await readFile(
    new URL("../public/infografico.html", import.meta.url),
    "utf8",
  );
  assert.equal((html.match(/class="stage-card/g) ?? []).length, 6);
  assert.equal((html.match(/<article class="detail/g) ?? []).length, 6);
  assert.match(html, /Celebração do contrato e organização da gestão/);
  assert.match(html, /Recebimento ou retomada do imóvel/);
  assert.match(html, /id="previous"/);
  assert.match(html, /id="next"/);
  assert.match(html, /pointerup/);
  assert.match(html, /prefers-reduced-motion/);
  assert.match(html, /Red Hat Display/);
  assert.match(html, /Source Sans 3/);
  assert.match(html, /icons\/file-signature\.svg/);
  assert.match(html, /class="focus-card"/);
  assert.match(html, /\.focus-card[^}]*position:\s*absolute/);
  assert.match(html, /\.stage-card\.is-active \.card-face\s*\{\s*opacity:\s*0/);
  assert.doesNotMatch(html, /Princípios permanentes|class="principles"/i);
});
