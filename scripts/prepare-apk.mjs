import {
  appendFileSync,
  copyFileSync,
  readFileSync,
  writeFileSync,
  createReadStream,
} from "node:fs";
import { createHash } from "node:crypto";

const version = JSON.parse(
  readFileSync(new URL("../app.json", import.meta.url), "utf8"),
).expo.version;
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version))
  throw new Error("La versión de la app no es válida para nombrar la APK.");
const artifactName = `tenisshore-${version}-arm64`;
const apk = `${artifactName}.apk`;
copyFileSync("android/app/build/outputs/apk/release/app-release.apk", apk);
const hash = createHash("sha256");
for await (const chunk of createReadStream(apk)) hash.update(chunk);
writeFileSync(`${apk}.sha256`, `${hash.digest("hex")}  ${apk}\n`);
if (process.env.GITHUB_OUTPUT)
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `artifact_name=${artifactName}\napk_path=${apk}\nchecksum_path=${apk}.sha256\n`,
  );
console.log(`Preparada ${apk}`);
