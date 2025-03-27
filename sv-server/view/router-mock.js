define("router",
    [],
    function() {
        return {
            _urlBase: "",
            setUrlBase(urlBase) {
                this._urlBase = urlBase;
            },
            getUrl(route) {
                return `${this._urlBase}${route}`;
            }
        }
    }
);
