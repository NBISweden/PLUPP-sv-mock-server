const vm = require("node:vm");
const fs = require("fs")

const scriptData = fs.readFileSync(process.argv[2] || "./index.js")
const appDataDefaults = JSON.parse(fs.readFileSync(process.argv[3] || "./appDataDefaults.json", 'utf8'))
const renderRoute = process.argv[4] || "/"

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
    if (path in this._routes) {
      return this._routes[path](req, res)
    } else {
      throw new Error(`Route ${path} does not exist.`)
    }
  },
  getUrl(route) {
    return route;
  },
  finish() {
    this._finished = true;
  }
}

const svContext = vm.createContext(
  {
    require(module) {
      return {
        "router": router,
        "PortletContextUtil": {
          getCurrentPage() {}
        },
        "SiteCookieUtil": {
          resolveSiteCookieByIdentifier(identifier) {
            return {};
          },
          checkUserConsent(node) {
            return true;
          }
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

const request = {
}

const script = new vm.Script(scriptData)
const output = {
  pageData: null,
  initialState: null,
  cookie: null,
  contentType: "text/html; charset=utf-8"
}

const res = {
  agnosticRender(data, initialState) {
    output.pageData = data;
    output.initialState = initialState;
    output.contentType = "text/html; charset=utf-8";
  },
  json(data) {
    output.pageData = JSON.stringify(data);
    output.contentType = "application/json";
  },
  cookie(cookie) {
    output.cookie = cookie;
  },
}

try {
  script.runInContext(svContext, { timeout: 10000 });
  router.exec(renderRoute, request, res);
  setImmediate(() => {
    router.finish();
  });
  console.log(JSON.stringify(output));
} catch (e) {
  output.pageData = `<span class="error">${e.name}: ${e.message}</span>`;
  console.log(JSON.stringify(output));
  throw(e)
}
