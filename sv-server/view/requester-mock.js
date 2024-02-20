define("requester",
    [],
    function() {
        return {
            async doGet({url}) {
                let dataOverrides = {}
                try {
                    dataOverrides = await (await fetch("data-overrides.json")).json();
                } catch (e) {
                    console.error(e);
                }

                const override = dataOverrides[url]
                if (override) {
                    console.log(`URL response overriden: ${url}`)
                    return override
                } else {
                    console.log(`Fetch: ${url}`)
                    const response = await fetch(url)
                    const data = await response.json()
                    return data
                }
            }
        }
    }
);