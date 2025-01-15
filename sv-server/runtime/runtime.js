const vm = require("node:vm");
const fs = require("fs")

function waitFor(check, finalize = () => {}, interval = 100) {
  setTimeout(() => {
    const result = check();
    if (result) {
      finalize();
    } else {
      waitFor(check, finalize, interval);
    }
  }, interval);
}

const router = {
  _finished: false,
  _routes: {},
  get(path, func) {
    this._routes[path] = func
    waitFor(() => this._finished)
  },
  exec(path, req, res) {
    return this._routes[path](req, res)
  },
  finish() {
    this._finished = true;
  }
}
const appDataDefaults = JSON.parse(fs.readFileSync(process.argv[3] || "./appDataDefaults.json", 'utf8'))

const svContext = vm.createContext(
  {
    require(module) {
      return {
        "router": router,
        "PortletContextUtil": {
          getCurrentPage() {}
        },
        "Properties": {
          get() {}
        },
        "appData": {
          get(key) {
            return appDataDefaults.appData && appDataDefaults.appData[key]
          }
        },
        "requester": {
          get() {}
        },
        "Requester": {
          get(url) {
            let result = null;
            const requestObject = {
              url,
              done: (onDone) => {
                this._onDone = onDone;
                return this;
              },
              fail: (onFail) => {
                this._onFail = onFail;
                return this;
              },
              onDone: (data) => {
                if (this._onDone) this._onDone(data);
              },
              onFail: (data) => {
                if (this._onFail) this._onFail(data);
              }
            }
            fetch(url).then((response) => response.json()).then((data) => {
              requestObject.onDone(data)
            }).catch((error) => {
              requestObject.onFail(error)
            });
            return requestObject;
          }
        }
      }[module]
    },
  },
  { timeout: 10000 },
)


const scriptData = fs.readFileSync(process.argv[2] || "./index.js")
const script = new vm.Script(scriptData)
const output = {
  pageData: null,
  initialState: null,
}

const res = {
  agnosticRender(data, initialState) {
    output.pageData = data;
    output.initialState = initialState;
    console.log(JSON.stringify(output));
  },
  json(data) {
    console.log(JSON.stringify(data));
  }
}

try {
  script.runInContext(svContext, { timeout: 10000 });
  router.exec("/", null, res);
  setImmediate(() => router.finish());
} catch (e) {
  output.pageData = `<span class="error">${e.name}: ${e.message}</span>`;
  console.log(JSON.stringify(output));
  throw(e)
}
