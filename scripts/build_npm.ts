#!/usr/bin/env -S deno run --allow-read --allow-write=./,/Users/qwtel/Library/Caches/deno --allow-net --allow-env=HOME,DENO_AUTH_TOKENS,DENO_DIR --allow-run=git,pnpm

import { basename } from "https://deno.land/std@0.133.0/path/mod.ts";
import { build, emptyDir } from "https://deno.land/x/dnt@0.24.0/mod.ts";

import { 
  copyMdFiles, mkPackage,
} from 'https://gist.githubusercontent.com/qwtel/ecf0c3ba7069a127b3d144afc06952f5/raw/latest-version.ts'

await emptyDir("./npm");

const name = basename(Deno.cwd())

await build({
  entryPoints: ["./index.ts", {
    name: './basics',
    path: 'basics.ts'
  }, {
    name: './body-parser',
    path: 'body-parser.ts'
  }, {
    name: './caching',
    path: 'caching.ts'
  }, {
    name: './content-negotiation',
    path: 'content-negotiation.ts'
  }, {
    name: './context',
    path: 'context.ts'
  }, {
    name: './cookies',
    path: 'cookies.ts'
  }, {
    name: './cors',
    path: 'cors.ts'
  }, {
    name: './session',
    path: 'session.ts'
  }],
  outDir: "./npm",
  shims: {},
  test: false,
  typeCheck: false,
  package: await mkPackage(name),
  declaration: true,
  packageManager: 'pnpm',
  compilerOptions: {
    lib: ["lib.es2021.d.ts", "lib.webworker.d.ts", "lib.webworker.iterable.d.ts"],
    sourceMap: true,
    target: 'ES2019',
  },
  mappings: {
    'https://ghuc.cc/qwtel/kv-storage-interface/index.d.ts': {
      name: "kv-storage-interface",
      version: "^0.2.0",
    },
    "https://ghuc.cc/qwtel/web-uuid/index.ts": {
      name: "web-uuid",
      version: "latest",
    },
    "https://ghuc.cc/qwtel/base64-encoding/index.ts": {
      name: "base64-encoding",
      version: "latest",
    },
    'https://cdn.skypack.dev/ts-functional-pipe@3.1.2?dts': {
      name: "ts-functional-pipe",
      version: "^3.1.2",
    },
    'https://cdn.skypack.dev/negotiated@1.0.2': {
      name: "negotiated",
      version: "^1.0.2",
    },
    "https://cdn.skypack.dev/msgpackr@1.5.5?dts": {
      name: "msgpackr",
      version: "^1.5.5",
    },
    "https://cdn.skypack.dev/immer@9.0.14?dts": {
      name: "immer",
      version: "^9.0.14",
    },
    "https://ghuc.cc/worker-tools/request-cookie-store/index.ts": {
      name: "@worker-tools/request-cookie-store",
      version: "latest"
    },
    "https://ghuc.cc/worker-tools/signed-cookie-store/index.ts": {
      name: "@worker-tools/signed-cookie-store",
      version: "latest"
    },
    "https://ghuc.cc/worker-tools/encrypted-cookie-store/index.ts": {
      name: "@worker-tools/encrypted-cookie-store",
      version: "latest"
    },
    'https://ghuc.cc/worker-tools/resolvable-promise/index.ts': {
      name: "@worker-tools/resolvable-promise",
      version: "latest"
    },
    'https://ghuc.cc/worker-tools/extendable-promise/index.ts': {
      name: "@worker-tools/extendable-promise",
      version: "latest"
    },
    "https://ghuc.cc/worker-tools/response-creators/index.ts": {
      name: "@worker-tools/response-creators",
      version: "latest"
    }
  },
});

// post build steps
await copyMdFiles()
