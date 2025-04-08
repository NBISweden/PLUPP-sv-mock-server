define("requester",
    [],
    function() {
        return {
            _dataOverrides: null,
            async doGet({url}) {
                try {
                    this._dataOverrides = this._dataOverrides || await (await fetch("data-overrides.json")).json();
                } catch (e) {
                    console.error(e);
                }

                const override = (this._dataOverrides || {})[url]
                if (override && "data" in override) {
                    console.log(`URL response overriden: ${url}`)
                    return override.data
                } else {
                    if (override && "ref" in override) {
                        console.log(`URL response overriden: ${url}`)
                        url = override.ref
                    }
                    console.log(`Fetch: ${url}`)
                    const response = await fetch(url)
                    const data = await response.json()
                    return data
                }
            },

            async doPost({url}) {
                const response = await fetch(url, {method: "POST"})
                const data = await response.json()
                return data
            }
        }
    }
);
