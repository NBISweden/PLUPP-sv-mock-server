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

const svContext = vm.createContext({
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
      }
    }[module]
  },
})


const scriptData = fs.readFileSync(process.argv[2] || "./index.js")
const script = new vm.Script(scriptData)
const output = {
  pageData: null,
  initialState: null,
}

const res = {
  agnosticRender(data, initialState) {
    output.pageData = data;
    output.initialState = initialState
  }
}
try {
  script.runInContext(svContext)
  router.exec("/", null, res)
} catch (e) {
  output.pageData = `<span class="error">${e.name}: ${e.message}</span>`;
  throw(e)
}
console.log(JSON.stringify(output))