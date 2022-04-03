
// ex. scripts/build_npm.ts
import { basename, extname } from "https://deno.land/std@0.133.0/path/mod.ts";
import { build, emptyDir } from "https://deno.land/x/dnt/mod.ts";

await emptyDir("./npm");

async function latestVersion() {
  return new TextDecoder().decode(
    await Deno.run({ cmd: ['git', 'tag', '--sort=committerdate'], stdout: 'piped' }).output()
  ).trim().split('\n').at(-1)?.replace(/^v/, '') ?? '0.0.1'
} 

const name = basename(Deno.cwd())



await build({
  entryPoints: ["./index.ts"],
  outDir: "./npm",
  shims: {},
  test: false,
  mappings: {
    // "https://esm.sh/(@?[^@]+)@([^/]+)/(.*).js": {
    //   name: "$1",
    //   version: "^$2",
    //   subPath: "$3.js",
    // },
    "https://esm.sh/cookie-store-interface@0.1.1/index.js": {
      name: "cookie-store-interface",
      version: "^0.1.1",
    },
    'https://esm.sh/kv-storage-interface@0.2.0/kv-storage-interface.js': {
      name: "kv-storage-interface",
      version: "^0.2.0",
    },
    "https://esm.sh/uuid-class@0.12.3/index.js?module": {
      name: "uuid-class",
      version: "^0.12.3",
    },
    "https://esm.sh/typed-array-utils@0.2.2/index.js?module": {
      name: "typed-array-utils",
      version: "^0.2.2",
    },
    "https://esm.sh/base64-encoding@0.14.3/index.js?module": {
      name: "base64-encoding",
      version: "^0.14.3",
    },
    "https://esm.sh/urlpattern-polyfill@3.0.0/dist/index.js?module": {
      name: "urlpattern-polyfill",
      version: "^3.0.0",
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
  },
});

// post build steps
for await (const { isFile, name } of Deno.readDir('.')) {
  if (isFile && extname(name) === '.md') {
    console.log(`Copying ${name}...`)
    await Deno.copyFile(name, `npm/${name}`);
  }
}