const vm = require("node:vm");
const fs = require("fs")
const router = {
  _routes: {},
  get(path, func) {
    this._routes[path] = func
  },
  exec(path, req, res) {
    this._routes[path](req, res)
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
                return requestObject;
              },
              fail: (onFail) => {
                this._onFail = onFail;
                return requestObject;
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
  { microtaskMode: 'afterEvaluate', timeout: 10000 },
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
  script.runInContext(svContext, { microtaskMode: 'afterEvaluate', timeout: 10000 })
  router.exec("/", null, res)
} catch (e) {
  output.pageData = `<span class="error">${e.name}: ${e.message}</span>`;
  console.log(JSON.stringify(output));
  throw(e)
}
