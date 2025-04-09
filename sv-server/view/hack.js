async function renderApp(appName, instanceId, appData, element, configElement, localFetch) {
  const urlParams = new URLSearchParams(window.location.search);
  const dataRoot = `../app_data/${appName}`
  const urlRoot = `http://${window.location.host}/view`
  const defaultEnv = 'development'
  const env = urlParams.get("_env") || defaultEnv

  const reactEnvSelect = {
    'development': {
      'react': 'vendor/react.development',
      'react-dom': 'vendor/react-dom.development',
    },
    'production': {
      'react': 'vendor/react',
      'react-dom': 'vendor/react-dom',
    }
  }
  const reactEnv = reactEnvSelect[env] || reactEnvSelect[defaultEnv]
  requirejs.config({
    paths: {
      ...reactEnv,
      [appName]: `${dataRoot}/main`,
      'requester': 'requester-mock',
      'underscore': 'vendor/underscore',
      'router': 'router-mock',
    }
  });

  async function loadCss(url) {
    const response = await fetch(url);
    if (response.ok) {
      const regex = new RegExp(`\.\.\/\/webapp-files\/${appName}\/0\.0\.1`, "gi");
      const cssData = (await (response).text()).replace(regex, `${urlRoot}/${dataRoot}/resource`);

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.type = 'text/css';
      dataUrl = `data:text/css;base64,${btoa(cssData)}`
      link.href = dataUrl;
      document.getElementsByTagName('HEAD')[0].appendChild(link);
    } else {
      console.log(`CSS not loaded: ${url}`)
    }
  }

  requirejs(
    [appName, "underscore", "router"],
    function(main, _, router) {
      async function run() {
        const baseUrl = `http://${window.location.host}/app/${appName}/${instanceId}`
        await loadCss(`${dataRoot}/css/main.css`);
        await loadCss(`${urlRoot}/app-settings/${appName}.css`);
        const meta = await (await localFetch(`${urlRoot}/${dataRoot}/_meta.json`)).json();
        const localizationData = await (await localFetch(`${urlRoot}/${dataRoot}/i18n/sv.json`)).json();
        const defaults = await (await localFetch(`${urlRoot}/${dataRoot}/appDataDefaults.json`)).json();
        try {
          router.setUrlBase(baseUrl);
          const initialPage = await (await localFetch(router.getUrl("/"))).text()
          element.innerHTML = initialPage;
        } catch (e) {
          console.log(e);
          console.log("Could not fetch page data: ", meta);
        }
        const appElement = document.getElementById(instanceId)
        const initialStateId = appElement.getAttribute("data-initial-state-id")
        const initialState = JSON.parse(document.getElementById(initialStateId).textContent)
        const currentAppData = {...defaults.appData, ...initialState, ...appData}
        if (configElement) {
          function i18n(term) {
            return localizationData[term] === undefined ? `{${term}}` : localizationData[term];
          }
          const templateData = await (await localFetch(`${urlRoot}/${dataRoot}/config/index.html`)).text();
          const template = _.template(templateData);
          const configView = template({i18n: i18n});
          configElement.innerHTML = configView + `<input type="hidden" name="appName" value="${appName}"><input type="submit" value="Submit">`;
          for (const [key, value] of Object.entries(currentAppData)) {
            const el = configElement.querySelector(`[name="${key}"]`);
            if (el) {
              el.value = value;
            }
          }
        }
        router.setUrlBase(baseUrl);
        main.default(currentAppData, appElement)
      }
      run()
    }
  );
}

async function getOverrideFetch(overridesUrl) {
  const _dataOverrides = await (await fetch(overridesUrl)).json();

  async function overrideFetch(url, ...args) {
    const override = (_dataOverrides || {})[url]
    if (override && "data" in override) {
        console.log(`URL response overriden: ${url}`)
        return new Response(JSON.serialize(override.data))
    } else {
        if (override && "ref" in override) {
            console.log(`URL response overriden: ${url}`)
            url = override.ref
        }
        console.log(`Fetch: ${url}`)
        return await fetch(url, ...args)
    }
  }
  return overrideFetch
}

async function main() {
  const urlParams = new URLSearchParams(window.location.search);
  const appName = urlParams.get('appName');
  const appData = Array.from(urlParams.entries()).reduce((acc, [key, value]) => ({...acc, [key]: value}), {})
  const root = document.getElementById('root')
  const config = document.getElementById('config')
  const localFetch = await getOverrideFetch("data-overrides.json")
  if (appName === "*") {
    async function renderAllApps(urlRoot) {
      const apps = await (await fetch(`${urlRoot}/apps`)).json();
      const appNames = apps.map(app => app.name);
      appNames.forEach(async (appName, index) => {
        root.appendChild(document.createElement("hr"));
        const appNode = document.createElement("div");
        root.appendChild(appNode)
        await renderApp(appName, `app-${index}`, {}, appNode, undefined, localFetch)
      })
    }
    renderAllApps(`http://${window.location.host}`)
  } else if (appName) {
    renderApp(appName, "single-app", appData, root, config, localFetch)
  }
}

main()
