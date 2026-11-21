import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const vendorDir = path.join(root, "public", "vendor");
fs.mkdirSync(vendorDir, { recursive: true });

const assets = [
  [path.join(root, "node_modules", "three", "build", "three.module.js"), path.join(vendorDir, "three.module.js")],
  [path.join(root, "node_modules", "socket.io-client", "dist", "socket.io.min.js"), path.join(vendorDir, "socket.io.min.js")]
];

for (const [source, destination] of assets) {
  if (!fs.existsSync(source)) throw new Error("Android asset missing: " + source);
  fs.copyFileSync(source, destination);
  console.log("Copied " + path.basename(source));
}

const manifest = path.join(root, "android", "app", "src", "main", "AndroidManifest.xml");
if (fs.existsSync(manifest)) {
  let xml = fs.readFileSync(manifest, "utf8");
  if (!xml.includes("android.permission.INTERNET")) {
    xml = xml.replace("<manifest ", '<manifest xmlns:tools="http://schemas.android.com/tools" ');
    xml = xml.replace("<application", '<uses-permission android:name="android.permission.INTERNET" />\n    <application');
  }
  xml = xml.replace(/(<activity\b[^>]*android:name="[^"]*MainActivity"[^>]*)(>)/, (match, before, end) => {
    if (before.includes("android:screenOrientation")) return match;
    return before + ' android:screenOrientation="landscape"' + end;
  });
  fs.writeFileSync(manifest, xml);
  console.log("Configured Android manifest for landscape.");
}
