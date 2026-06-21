const fs = require("fs");
const path = require("path");

const root = process.cwd();
const dist = path.join(root, "dist");

const isLocalAsset = (value) => {
  if (!value) return false;
  if (value.startsWith("#")) return false;
  if (/^(https?:|mailto:|tel:|javascript:)/i.test(value)) return false;
  return !value.includes("${");
};

const normalizeAssetPath = (value) =>
  decodeURI(value.split("#")[0].split("?")[0]).replace(/\//g, path.sep);

const copyFile = (from, to = from) => {
  const source = path.join(root, from);
  if (!fs.existsSync(source)) {
    throw new Error(`Referenced asset missing: ${from}`);
  }

  const target = path.join(dist, to);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
};

const copyDir = (from, to = from) => {
  const source = path.join(root, from);
  if (!fs.existsSync(source)) return;

  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const relativeFrom = path.join(from, entry.name);
    const relativeTo = path.join(to, entry.name);

    if (entry.isDirectory()) {
      copyDir(relativeFrom, relativeTo);
    } else if (entry.isFile()) {
      copyFile(relativeFrom, relativeTo);
    }
  }
};

const collectReferencedAssets = (html) => {
  const assets = new Set();
  const patterns = [
    /\b(?:src|href|poster)=["']([^"']+)["']/g,
    /\bsrc:\s*["']([^"']+)["']/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html))) {
      if (!isLocalAsset(match[1])) continue;
      const assetPath = normalizeAssetPath(match[1]);
      if (assetPath && assetPath !== "index.html" && assetPath !== "styles.css") {
        assets.add(assetPath);
      }
    }
  }

  return assets;
};

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

copyFile("index.html");
copyFile("styles.css");

const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
for (const asset of collectReferencedAssets(html)) {
  copyFile(asset);
}

// Keep generated folders that may be referenced by CSS or future card updates.
copyDir(path.join("assets", "generated-covers"));
copyDir(path.join("assets", "optimized-works"));
copyDir(path.join("assets", "media"));

const files = [];
const collectFiles = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectFiles(full);
    if (entry.isFile()) files.push(full);
  }
};

collectFiles(dist);

const totalBytes = files.reduce((sum, file) => sum + fs.statSync(file).size, 0);
const largest = files
  .map((file) => ({ file, size: fs.statSync(file).size }))
  .sort((a, b) => b.size - a.size)
  .slice(0, 5)
  .map(({ file, size }) => `${path.relative(dist, file)} ${(size / 1024 / 1024).toFixed(2)} MB`)
  .join("; ");

console.log(`Built ${files.length} files into dist (${(totalBytes / 1024 / 1024).toFixed(2)} MB).`);
console.log(`Largest files: ${largest}`);
