import { echo } from "./echo.js";
import { help } from "./help.js";
import { clear } from "./clear.js";

import { cd } from "./cd.js";
import { cudi } from "./cudi.js";
import { tree } from "./tree.js";
import { read } from "./read.js";
import { mk } from "./mk.js";
import { write } from "./write.js";
import { mkdir } from "./mkdir.js";
import { rmdir } from "./rmdir.js";
import { rm } from "./rm.js";
import { where } from "./where.js";
import { mark } from "./mark.js";
import { marks } from "./marks.js";
import { unmark } from "./unmark.js";
import { jump } from "./jump.js";
import { back } from "./back.js";
import { stat } from "./stat.js";
import { find } from "./find.js";
import { seek } from "./seek.js";
import { touch } from "./touch.js";
import { cop } from "./cop.js";
import { mv } from "./mv.js";
import { cat } from "./cat.js";
import { about } from "./about.js";
import { reboot } from "./reboot.js";
import { reset } from "./reset.js";
import { clip } from "./clip.js";
import { paste } from "./paste.js";

// Command registry is intentionally simple for now.
// Add new files here and register them below.
export function buildRegistry() {
  const reg = new Map();
  for (const cmd of [
    echo, help, clear,
    cd, cudi, tree, read, mk, write, mkdir, rmdir, rm, where,
    mark, marks, unmark, jump, back, stat, find, seek, touch,
    cop, mv, cat, about, reboot, reset
    , clip, paste
  ]) reg.set(cmd.name, cmd);

  return reg;
}
