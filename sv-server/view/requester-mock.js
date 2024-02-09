define("requester",
    [],
    function() {
        return {
            async doGet({url}) {
                const response = await fetch(url)
                const data = await response.json()
                return data
            }
        }
    }
);