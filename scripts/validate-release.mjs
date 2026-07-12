import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [manifest, packageJson, versions] = await Promise.all([
  readFile("manifest.json", "utf8").then(JSON.parse),
  readFile("package.json", "utf8").then(JSON.parse),
  readFile("versions.json", "utf8").then(JSON.parse)
]);

const releaseTag = process.env.RELEASE_TAG ?? packageJson.version;

assert.match(releaseTag, /^\d+\.\d+\.\d+$/, "Release tag must be a plain semantic version");
assert.equal(manifest.version, releaseTag, "manifest.json version must match the release tag");
assert.equal(packageJson.version, releaseTag, "package.json version must match the release tag");
assert.equal(
  versions[releaseTag],
  manifest.minAppVersion,
  "versions.json must map the release tag to manifest.json minAppVersion"
);

console.log(`Release metadata is consistent for ${releaseTag}.`);
