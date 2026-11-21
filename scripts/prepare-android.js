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

const activity = path.join(root, "android", "app", "src", "main", "java", "com", "zero", "game", "MainActivity.java");
if (fs.existsSync(activity)) {
  let java = fs.readFileSync(activity, "utf8");
  if (!java.includes("SYSTEM_UI_FLAG_IMMERSIVE_STICKY")) {
    if (!java.includes("import android.os.Bundle;")) java = java.replace("import com.getcapacitor.BridgeActivity;", "import android.os.Bundle;\\nimport com.getcapacitor.BridgeActivity;");
    java = java.replace(/\\{\\s*\\}/, `{
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().getDecorView().setSystemUiVisibility(
            android.view.View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            | android.view.View.SYSTEM_UI_FLAG_FULLSCREEN
            | android.view.View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | android.view.View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            | android.view.View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            | android.view.View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
        );
    }
}`);
    fs.writeFileSync(activity, java);
    console.log("Enabled immersive fullscreen mode.");
  }
}
