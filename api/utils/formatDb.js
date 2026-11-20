module.exports = {
    formatDb(value, typeOfData) {
        switch (typeOfData) {
            case "DateTime": {
                if (!value) return null;

                if (
                    typeof value === "string" &&
                    value.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
                ) {
                    return value;
                }

                const d = value instanceof Date ? value : new Date(value);
                if (!isNaN(d.getTime())) {
                    const pad = (n) => String(n).padStart(2, "0");
                    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
                }

                console.error("FORMAT_DB: Valore datetime non valido:", value);
                return null;
            }

            case "Time": {
                if (!value) return null;

                if (
                    typeof value === "string" &&
                    value.match(/^\d{2}:\d{2}:\d{2}$/)
                ) {
                    return value;
                }

                const d = value instanceof Date ? value : new Date(value);
                if (!isNaN(d.getTime())) {
                    const pad = (n) => String(n).padStart(2, "0");
                    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
                }

                console.error("FORMAT_DB: Valore Time non valido:", value);
                return null;
            }

            case "Date": {
                if (!value) return null;

                if (
                    typeof value === "string" &&
                    (/^\d{4}-\d{2}-\d{2}$/.test(value) ||
                        /^\d{2}-\d{2}-\d{4}$/.test(value))
                ) {
                    return value;
                }

                const d = value instanceof Date ? value : new Date(value);
                if (!isNaN(d.getTime())) {
                    const pad = (n) => String(n).padStart(2, "0");
                    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
                }

                console.error("FORMAT_DB: Valore Date non valido:", value);
                return null;
            }

            case "Json": {
                if (!value) return null;
                return typeof value === "string"
                    ? value
                    : JSON.stringify(value);
            }

            case "Boolean": {
                if (Buffer.isBuffer(value)) {
                    return value[0] === 49;
                }
                return value === 1;
            }

            case "DBText": {
                if (!value) return null;
                return String(value)
                    .replace(/\r\n/g, "\n")
                    .replace(/\r/g, "\n")
                    .replace(/\n/g, " ")
                    .replace(/\s+/g, " ")
                    .trim();
            }

            default:
                console.warn("FORMAT_DB: Tipo non riconosciuto:", typeOfData);
                return value;
        }
    },
};
