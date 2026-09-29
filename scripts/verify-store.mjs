import fs from "node:fs";
import assert from "node:assert/strict";
import ts from "typescript";
import { pathToFileURL } from "node:url";
const dataModule = (code) => "data:text/javascript;base64," + Buffer.from(code).toString("base64");
const transpile = (source) =>
  ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
const catalogSource = fs
  .readFileSync("src/lib/catalog.ts", "utf8")
  .replace(
    /import (\w+) from "@\/assets\/([^";]+)";/g,
    (_, name, asset) => `const ${name}='/assets/${asset}';`,
  );
const catalogURL = dataModule(transpile(catalogSource));
const catalog = await import(catalogURL);
const source = transpile(fs.readFileSync("src/lib/cart.ts", "utf8")).replace(
  /from "([^"]+)"/g,
  (_, specifier) =>
    `from ${JSON.stringify(specifier === "./catalog" ? catalogURL : import.meta.resolve(specifier))}`,
);
const { validCart, cartKey, cartStock, readLocal, saveLocal } = await import(dataModule(source));
const p = catalog.products[0];
const item = {
  slug: p.slug,
  quantity: 1,
  size: p.sizes[0],
  flow: p.flow[0],
  pack: p.packOptions[0].label,
  price: 0,
};
assert.deepEqual(validCart({}), []);
assert.deepEqual(validCart([null, {}, "bad"]), []);
assert.equal(validCart([item])[0].price, p.packOptions[0].price, "Recalculate tampered price");
assert.equal(
  validCart([{ ...item, quantity: 100000 }])[0].quantity,
  cartStock(item),
  "Cap persisted quantity to stock",
);
assert.equal(validCart([{ ...item, quantity: -5 }])[0].quantity, 1);
assert.deepEqual(validCart([{ ...item, quantity: NaN }]), []);
assert.deepEqual(validCart([{ ...item, size: "INVALID" }]), []);
assert.notEqual(
  cartKey(item),
  cartKey({ ...item, size: "XXXL" }),
  "Different sizes are independent",
);
assert.notEqual(
  cartKey(item),
  cartKey({ ...item, flow: "Heavy" }),
  "Different flow selections are independent",
);
assert.notEqual(
  cartKey(item),
  cartKey({ ...item, pack: "Pack of 16" }),
  "Different packs are independent",
);
const sold = catalog.products.find((p) => !p.stock);
assert.deepEqual(
  validCart([{ ...item, slug: sold.slug, pack: sold.packOptions[0].label, flow: sold.flow[0] }]),
  [],
);
assert.deepEqual(readLocal("missing", []), [], "Storage unavailable should not crash");
assert.equal(saveLocal("test", {}), false);
const slugs = new Set(catalog.products.map((p) => p.slug));
assert.equal(slugs.size, catalog.products.length);
for (const product of catalog.products) {
  assert.ok(product.packOptions.length);
  for (const related of product.relatedProducts) assert.ok(slugs.has(related));
  for (const image of product.images) assert.ok(fs.existsSync("src" + image));
}
const tree = fs.readFileSync("src/routeTree.gen.ts", "utf8");
assert.match(tree, /getParentRoute: \(\) => rootRouteImport/);
assert.match(tree, /blog\/\$slug/);
assert.equal(catalog.getProduct("nonexistent"), undefined);
assert.equal(catalog.getPost("nonexistent"), undefined);
const sitemap = fs.readFileSync("public/sitemap.xml", "utf8");
for (const p of catalog.products) assert.ok(sitemap.includes("/products/" + p.slug));
for (const p of catalog.posts) assert.ok(sitemap.includes("/blog/" + p.slug));
console.log(
  "PASS: cart validation, stock caps, variant identity, unavailable storage, catalog links/assets, sitemap coverage and unknown slugs.",
);
