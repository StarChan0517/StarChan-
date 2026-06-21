const fs = require("fs");
const path = require("path");

const root = process.cwd();
const dist = path.join(root, "dist");

const copyFile = (from, to) => {
  const target = path.join(dist, to);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(root, from), target);
};

const copyDir = (from, to, options = {}) => {
  const source = path.join(root, from);
  if (!fs.existsSync(source)) return;

  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const relativeFrom = path.join(from, entry.name);
    const relativeTo = path.join(to, entry.name);

    if (options.exclude?.(relativeFrom, entry)) continue;

    if (entry.isDirectory()) {
      copyDir(relativeFrom, relativeTo, options);
    } else if (entry.isFile()) {
      copyFile(relativeFrom, relativeTo);
    }
  }
};

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

copyFile("index.html", "index.html");
copyFile("styles.css", "styles.css");

copyDir("assets/generated-covers", "assets/generated-covers");
copyDir("assets/media", "assets/media");
copyFile("assets/profile-photo.webp", "assets/profile-photo.webp");
copyFile("assets/wechat-qr.jpg", "assets/wechat-qr.jpg");

copyDir("作品整理/IP角色设定", "作品整理/IP角色设定", {
  exclude: (relativePath) => relativePath.endsWith(".mp4"),
});
copyDir("作品整理/个人游戏DEMO", "作品整理/个人游戏DEMO", {
  exclude: (relativePath) => relativePath.endsWith(".mp4"),
});
copyDir("作品整理/杂类海报合集", "作品整理/杂类海报合集");
copyFile(
  "作品整理/室内设计作品合集/室内设计作品合集.pdf",
  "作品整理/室内设计作品合集/室内设计作品合集.pdf",
);
copyFile(
  "作品整理/研究生毕业设计作品/Final Exam-Xingyu Chen.pdf",
  "作品整理/研究生毕业设计作品/Final Exam-Xingyu Chen.pdf",
);

const files = [];
const collect = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(full);
    if (entry.isFile()) files.push(full);
  }
};

collect(dist);

const totalBytes = files.reduce((sum, file) => sum + fs.statSync(file).size, 0);
console.log(`Built ${files.length} files into dist (${(totalBytes / 1024 / 1024).toFixed(2)} MB).`);
