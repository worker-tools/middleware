#!/usr/bin/env -S deno run -A

// ex. scripts/build_npm.ts
import { basename, extname } from "https://deno.land/std@0.133.0/path/mod.ts";
import { build, emptyDir } from "https://deno.land/x/dnt/mod.ts";

import { 
  latestVersion, copyMdFiles, getDescription, getGHTopics, getGHLicense, getGHHomepage,
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
  package: {
    // package.json properties
    name: `@worker-tools/${name}`,
    version: await latestVersion(),
    description: await getDescription(),
    license: await getGHLicense(name) ?? 'MIT',
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
    homepage: await getGHHomepage(name) ?? `https://github.com/worker-tools/${name}#readme`,
    keywords: await getGHTopics(name) ?? [],
  },
  packageManager: 'pnpm',
  compilerOptions: {
    sourceMap: true,
    target: 'ES2019',
  },
  mappings: {
    "https://ghuc.cc/kenchris/urlpattern-polyfill@a076337/src/index.d.ts": {
      name: "urlpattern-polyfill",
      version: "^4.0.1",
      subPath: 'dist/index.d.ts'
    },
    'https://ghuc.cc/qwtel/kv-storage-interface/index.d.ts': {
      name: "kv-storage-interface",
      version: "^0.2.0",
    },
    "https://ghuc.cc/qwtel/uuid-class/index.ts": {
      name: "uuid-class",
      version: "^0.13.0-alpha.0",
    },
    "https://ghuc.cc/qwtel/base64-encoding/index.ts": {
      name: "base64-encoding",
      version: "^0.15.0-alpha.0",
    },
    'https://esm.sh/ts-functional-pipe@3.1.2/ts-functional-pipe.js': {
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
      name: "@worker-tools/resolvable-promise",
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
