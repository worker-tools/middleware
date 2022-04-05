#!/usr/bin/env -S deno run -A

// ex. scripts/build_npm.ts
import { basename, extname } from "https://deno.land/std@0.133.0/path/mod.ts";
import { build, emptyDir } from "https://deno.land/x/dnt/mod.ts";

import { latestVersion, copyMdFiles } from 'https://gist.githubusercontent.com/qwtel/ecf0c3ba7069a127b3d144afc06952f5/raw/20225e500beb4168c2ed44c2869acba1fb27bff3/latest-version.ts'

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
  mappings: {
    // "https://esm.sh/(@?[^@]+)@([^/]+)/(.*).js": {
    //   name: "$1",
    //   version: "^$2",
    //   subPath: "$3.js",
    // },
    "https://esm.sh/urlpattern-polyfill@3.0.0/dist/index.js": {
      name: "urlpattern-polyfill",
      version: "^3.0.0",
    },
    'https://esm.sh/kv-storage-interface@0.2.0/kv-storage-interface.js': {
      name: "kv-storage-interface",
      version: "^0.2.0",
    },
    "https://esm.sh/uuid-class@0.12.3/index.js?module": {
      name: "uuid-class",
      version: "^0.12.3",
    },
    "https://esm.sh/base64-encoding@0.14.3/index.js?module": {
      name: "base64-encoding",
      version: "^0.14.3",
    },
    'https://esm.sh/ts-functional-pipe@3.1.2/ts-functional-pipe.js?module': {
      name: "ts-functional-pipe",
      version: "^3.1.2",
    },
    'https://esm.sh/negotiated@1.0.2/negotiated.js': {
      name: "negotiated",
      version: "^1.0.2",
    },
    "https://esm.sh/msgpackr@1.5.5/msgpackr.js": {
      name: "msgpackr",
      version: "^1.5.5",
    },
    "https://raw.githubusercontent.com/worker-tools/request-cookie-store/master/index.ts": {
      name: "@worker-tools/request-cookie-store",
      version: "latest"
    },
    "https://raw.githubusercontent.com/worker-tools/signed-cookie-store/master/index.ts": {
      name: "@worker-tools/signed-cookie-store",
      version: "latest"
    },
    "https://raw.githubusercontent.com/worker-tools/encrypted-cookie-store/master/index.ts": {
      name: "@worker-tools/encrypted-cookie-store",
      version: "latest"
    },
    'https://raw.githubusercontent.com/worker-tools/resolvable-promise/master/index.ts': {
      name: "@worker-tools/resolvable-promise",
      version: "latest"
    },
    'https://raw.githubusercontent.com/worker-tools/extendable-promise/master/index.ts': {
      name: "@worker-tools/resolvable-promise",
      version: "latest"
    },
    "https://raw.githubusercontent.com/worker-tools/response-creators/master/index.ts": {
      name: "@worker-tools/response-creators",
      version: "latest"
    }
  },
  typeCheck: false,
  package: {
    // package.json properties
    name: `@worker-tools/${name}`,
    version: await latestVersion(),
    description: "",
    license: "MIT",
    publishConfig: {
      access: "public"
    },
    author: "Florian Klampfer <mail@qwtel.com> (https://qwtel.com/)",
    repository: {
      type: "git",
      url: `git+https://github.com/worker-tools/${name}.git`,
    },
    bugs: {
      url: `https://github.com/worker-tools/${name}/issues`,
    },
    homepage: `https://workers.tools/#${name}`,
  },
  packageManager: 'pnpm',
  compilerOptions: {
    sourceMap: true,
  },
});

// post build steps
await copyMdFiles()
