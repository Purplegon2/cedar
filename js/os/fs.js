// Simple filesystem for Cedar
// Stored in sessionStorage under key `cedar:fs` so reset can wipe it.
const FS_KEY = "cedar:fs";
const BK_KEY = "cedar:bookmarks";

function now() { return Date.now(); }

function load() {
  try {
    const raw = sessionStorage.getItem(FS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  // default root
  // Allow opting out of creating default directories by setting either
  // `sessionStorage['cedar:skipDefaultDirs'] = '1'` or `window.CEDAR_SKIP_DEFAULT_FS = true`
  const skipDefaults = (typeof window !== 'undefined' && window.CEDAR_SKIP_DEFAULT_FS) || sessionStorage.getItem('cedar:skipDefaultDirs') === '1';
  const root = skipDefaults
    ? { type: "dir", children: {}, ctime: now(), mtime: now() }
    : {
        type: "dir",
        children: {
          home: { type: "dir", children: { guest: { type: "dir", children: {} }, }, ctime: now(), mtime: now() },
          apps: { type: "dir", children: {}, ctime: now(), mtime: now() }
        },
        ctime: now(),
        mtime: now()
      };
  save(root);
  return root;
}

function save(tree) { sessionStorage.setItem(FS_KEY, JSON.stringify(tree)); }

function loadBookmarks() {
  try { const raw = sessionStorage.getItem(BK_KEY); if (raw) return JSON.parse(raw); } catch (e) {}
  return {};
}

function saveBookmarks(b) { sessionStorage.setItem(BK_KEY, JSON.stringify(b)); }

const tree = load();

function cloneMeta(node) {
  return { type: node.type, size: node.type === "file" ? (node.content||"").length : 0, ctime: node.ctime, mtime: node.mtime };
}

function splitPath(p) {
  if (!p) return [];
  return p.split("/").filter(Boolean);
}

function resolvePath(input, cwd = "/home/guest", user = "guest") {
  if (!input) return cwd;
  // handle bookmarks @name
  if (input.startsWith("@")) {
    const name = input.slice(1);
    const b = loadBookmarks();
    if (b[name]) return b[name];
  }
  // handle # as root alias
  if (input.startsWith("#/")) input = "/" + input.slice(2);
  if (input === "#") input = "/";

  // ~ expansion
  if (input === "~" || input.startsWith("~/")) {
    input = input.replace("~", "/home/" + user);
  }

  if (input.startsWith("/")) {
    // absolute
    const parts = splitPath(input);
    return "/" + parts.join("/");
  }

  // relative to cwd
  const base = cwd === "/" ? [] : splitPath(cwd);
  const parts = splitPath(input);
  const out = [];
  for (const p of base) out.push(p);
  for (const p of parts) {
    if (p === ".") continue;
    if (p === "..") { if (out.length) out.pop(); continue; }
    out.push(p);
  }
  return "/" + out.join("/");
}

function getNode(p) {
  const parts = splitPath(p);
  let cur = tree;
  if (parts.length === 0) return cur;
  for (const part of parts) {
    if (!cur.children || !cur.children[part]) return null;
    cur = cur.children[part];
  }
  return cur;
}

function ensureParentDir(path) {
  const parts = splitPath(path);
  if (parts.length === 0) return tree;
  const parentParts = parts.slice(0, -1);
  let cur = tree;
  for (const p of parentParts) {
    if (!cur.children[p]) return null;
    cur = cur.children[p];
    if (cur.type !== "dir") return null;
  }
  return cur;
}

function stat(path) {
  const node = getNode(path);
  if (!node) return null;
  return cloneMeta(node);
}

function readdir(path) {
  const node = getNode(path);
  if (!node || node.type !== "dir") return null;
  return Object.entries(node.children).map(([name, n]) => ({ name, type: n.type }));
}

function readFile(path) {
  const node = getNode(path);
  if (!node || node.type !== "file") return null;
  return node.content || "";
}

function writeFile(path, content) {
  const parent = ensureParentDir(path);
  if (!parent) throw new Error("no such directory");
  const parts = splitPath(path);
  const name = parts[parts.length-1];
  parent.children[name] = { type: "file", content: String(content), ctime: now(), mtime: now() };
  save(tree);
}

function mk(path) { writeFile(path, ""); }

function mkdir(path) {
  const parent = ensureParentDir(path);
  if (!parent) throw new Error("no such directory");
  const parts = splitPath(path);
  const name = parts[parts.length-1];
  if (parent.children[name]) throw new Error("exists");
  parent.children[name] = { type: "dir", children: {}, ctime: now(), mtime: now() };
  save(tree);
}

function rmdir(path) {
  const node = getNode(path);
  if (!node) throw new Error("no such directory");
  if (node.type !== "dir") throw new Error("not a directory");
  if (Object.keys(node.children).length) throw new Error("directory not empty");
  const parent = ensureParentDir(path);
  const parts = splitPath(path);
  const name = parts[parts.length-1];
  delete parent.children[name];
  save(tree);
}

function rm(path) {
  const node = getNode(path);
  if (!node) throw new Error("no such file");
  if (node.type === "dir") throw new Error("is a directory");
  const parent = ensureParentDir(path);
  const parts = splitPath(path);
  const name = parts[parts.length-1];
  delete parent.children[name];
  save(tree);
}

function touch(path) {
  const node = getNode(path);
  if (node) { node.mtime = now(); save(tree); return; }
  writeFile(path, "");
}

function treeList(path, out = [], prefix = "") {
  const node = getNode(path);
  if (!node) return out;
  if (node.type === "file") { out.push(prefix + path.split('/').pop()); return out; }
  const children = Object.keys(node.children).sort();
  for (const c of children) {
    const childPath = (path === "/") ? "/" + c : path + "/" + c;
    const n = node.children[c];
    if (n.type === "dir") { out.push(prefix + c + "/"); treeList(childPath, out, prefix + "  "); }
    else out.push(prefix + c);
  }
  return out;
}

function find(name, path = "/", out = []) {
  const node = getNode(path);
  if (!node) return out;
  if (node.type === "file") {
    if ((path.split('/').pop()||"") === name) out.push(path);
    return out;
  }
  for (const [k, v] of Object.entries(node.children)) {
    const childPath = (path === "/") ? "/" + k : path + "/" + k;
    if (k === name) out.push(childPath);
    if (v.type === "dir") find(name, childPath, out);
    else if (v.type === "file" && k === name) out.push(childPath);
  }
  return out;
}

function seek(text, path = "/", out = []) {
  const node = getNode(path);
  if (!node) return out;
  if (node.type === "file") {
    const c = node.content||"";
    if (c.includes(text)) out.push(path);
    return out;
  }
  for (const k of Object.keys(node.children)) {
    const childPath = (path === "/") ? "/" + k : path + "/" + k;
    seek(text, childPath, out);
  }
  return out;
}

function du(path = "/") {
  const node = getNode(path);
  if (!node) return 0;
  if (node.type === "file") return (node.content||"").length;
  let s = 0;
  for (const k of Object.keys(node.children)) {
    const childPath = (path === "/") ? "/" + k : path + "/" + k;
    s += du(childPath);
  }
  return s;
}

function copy(src, dst) {
  const n = getNode(src);
  if (!n) throw new Error("no such source");
  const parent = ensureParentDir(dst);
  if (!parent) throw new Error("no such destination directory");
  const parts = splitPath(dst); const name = parts[parts.length-1];
  if (n.type === "file") parent.children[name] = { type: "file", content: n.content, ctime: now(), mtime: now() };
  else {
    // shallow clone dir
    function cloneDir(node) {
      const o = { type: "dir", children: {}, ctime: now(), mtime: now() };
      for (const [k, v] of Object.entries(node.children)) {
        if (v.type === "file") o.children[k] = { type: "file", content: v.content, ctime: v.ctime, mtime: v.mtime };
        else o.children[k] = cloneDir(v);
      }
      return o;
    }
    parent.children[name] = cloneDir(n);
  }
  save(tree);
}

function move(src, dst) {
  copy(src, dst);
  // remove src
  const parent = ensureParentDir(src);
  const parts = splitPath(src); const name = parts[parts.length-1];
  delete parent.children[name];
  save(tree);
}

function hash(path) {
  const c = readFile(path);
  if (c === null) return null;
  // simple ad-hoc hash
  let h = 2166136261 >>> 0;
  for (let i = 0; i < c.length; i++) h = Math.imul(h ^ c.charCodeAt(i), 16777619) >>> 0;
  return h.toString(16);
}

function reset() { sessionStorage.removeItem(FS_KEY); sessionStorage.removeItem(BK_KEY); }

// Bookmarks
function addBookmark(name, path) { const b = loadBookmarks(); b[name] = path; saveBookmarks(b); }
function listBookmarks() { return loadBookmarks(); }
function removeBookmark(name) { const b = loadBookmarks(); delete b[name]; saveBookmarks(b); }

export const FS = {
  resolvePath, getNode, stat, readdir, readFile, writeFile, mk, mkdir, rmdir, rm, touch,
  treeList, find, seek, du, copy, move, hash, reset,
  addBookmark, listBookmarks, removeBookmark
};
