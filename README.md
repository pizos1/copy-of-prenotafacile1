# Cassafacile

## Configurazione Database

### 1. Creazione Database

Creare i database MySQL necessari:

```sql
CREATE DATABASE IF NOT EXISTS `cassafacile` DEFAULT CHARACTER SET utf8mb4;
CREATE DATABASE IF NOT EXISTS `cassafacile_test` DEFAULT CHARACTER SET utf8mb4;
CREATE DATABASE IF NOT EXISTS `cassafacile_blueday` DEFAULT CHARACTER SET utf8mb4;
```

### 2. Importazione Schema

Importare le strutture ed i dati dei database dai file presenti nella cartella /db

### 3. Tabelle Necessarie

Assicurarsi che esistano le seguenti tabelle:

### cassafacile:

- `utenti` - Tabella utenti
- `tenants` - Tabella tenant

### cassafacile_test

- `comuni`
- `eventi`
- `eventi-date`
- `eventi-fasce`
- `eventi-utenti` Tabella per le prenotazioni
- `profili` - Tabella profili
- `query_logs` - Tabella per il logging query
- `utenti`
- `allegati`

### altro database con le stesse tabelle

### 4. Utenti di Test

Nel database sono presenti degli utenti di test, la password è per tutti:

- **Password**: `1`

## Configurazione Applicazione

### 1. File .env

Creare un file `.env` nella root del progetto con le seguenti variabili:

```env
JWT_SECRET=your_jwt_secret
UPLOAD_PATH=path/dove/verranno/salvati/i/file/uploadati
```

### 2. Configurazione Database

Verificare `config/datastores.js` per la configurazione della connessione MySQL:

```javascript
url: 'mysql://user:password@localhost:3306/cassafacile',
```

Modificare se necessario (host, porta, utente, password, nome database).

### 3. Installazione Dipendenze

```bash
npm install
```

## Avvio

### Development

```bash
npm run start:dev
```

---

# COME USARE MODELS E CRUDS

## Modelli

- Creare sotto config una cartella models, dove inserire un file index.js dove verranno salvate le copie per tutti i modelli necessari
- Creare altri file per ogni modello richiesto

- Ogni modello deve seguire la sintassi

```js
module.exports = {
  table: "tableName",
  primaryKey: "nome dell'attributo primary key dato al modello",
  tableAbbreviation: "abbreviazione che verra' usata nelle query, se omessa prendera' la prima lettera della tabella",

  attributes: {
    // Inserire tutti gli attributi es.
    id: {
      type: "number",
      required: "true",
      columnName: "id_utente" // questo serve, perche' se manca non verra' visto dalle utility CRUDs
    },
    ...
  }
}
```

## Cosa si puo' mettere per ogni attributo

- type: `"string" | "number" | "date" | "time" | "dateTime" | "ref"` (questo e' necessario)
- required: `true | false`
- private: `true | false` (di base a false, se messo a true, le utility CRUDs lo scarteranno)
- columnName: `"nomeColonna"` (Come detto prima, se questo manca allora le CRUDs non sapranno cosa cercare per l'attributo)
- columnType: `"tipoColonnaDB"` (Serve per alcuni casi dove il tipo js non e' uguale/non esiste)
- validate: `(value) => {}` (Utile per fare regex di password, telefoni ecc...)
- calculate: `value) => {}` (Serve per fare calcoli sul modello, come ad esempio tempo di iscrizione che magari non vogliamo salvare a db ma c'e' data iscrizione
- formatDb: `(value) => formatDb(value, typeOfData)` (utility creata sotto la cartella utility, formatta determinati tipi di dati)
    - typeOfData: `"DateTime" | "Time" | "Date" | "Json" | "Boolean" | "DBText"`
- autoIncrement: `true | false` (attualmente solo per documentazione)

### esempio di config/models/index.js

```js
const _ = require("lodash");
const User = require("./User");
const Event = require("./Event");
const EventDate = require("./EventDate");

module.exports = {
    utenti: _.cloneDeep(User),
    eventi: _.cloneDeep(Event),
    "eventi-date": _.cloneDeep(EventDate),
};
```

- viene creata una copia di ogni modello per evitare modifiche condivise e creare problemi
- per ogni modello ci deve essere una sua copia qua

## CRUDs

### find

```js
const result = await find({
    tenant: 1,
    table: "eventi",
    joins: [
        {
            table: "comuni",
            tableAbbreviation: "c",
            on: "e.id_comune = c.id_comune",
            select: ["comune"],
        },
    ],
});
```

- unica utility dove anche tenant e' obbligatorio
- la query finale costruita esce:

```SQL
SELECT
    e.`id_evento` AS `id`,
    e.`id_comune` AS `id_comune`,
    e.`titolo` AS `titolo`,
    e.`descrizione` AS `descrizione`,
    e.`data_inizio` AS `data_inizio`,
    e.`data_fine` AS `data_fine`,
    e.`codice_menu` AS `codice_menu`,
    e.`logo` AS `logo`,
    e.`id_host` AS `id_host`,
    e.`ordinamento` AS `ordinamento`,
    c.`comune` AS `comune`
FROM `eventi` AS e
JOIN `comuni` AS c ON e.id_comune = c.id_comune
```

---

### create

```js
const id = await create({
    tenant: 1, // Si puo' omettere, andra' a fare l'operazione sul master
    table: "utenti",
    inputs: {
        nome: "Mario",
        cognome: "Rossi",
        email: "test@test.com",
        password: "123",
    },
    allowedFields: ["nome", "cognome", "email"],
});
```

- la query finale costruita esce:

```SQL
INSERT INTO `utenti` (`nome`, `cognome`, `email`) 
VALUES (?, ?, ?)
```

---

### update

```js
await update({
    tenant: 1, // Si puo' omettere, andra' a fare l'operazione sul master
    table: "utenti",
    where: { id: 5 },
    inputs: { nome: "Marco", password: "nuova", email: "nuovo@test.com" },
    allowedFields: ["nome", "password"],
});
```

- la query costruita finale esce:

```SQL
UPDATE `utenti`
SET `nome` = ?, `password` = ?
WHERE `id_utente` = ?
```

---

### customDelete

```js
await customDelete({
    tenant: 1, // Si puo' omettere, andra' a fare l'operazione sul master
    table: "eventi",
    where: { stato: "annullato" },
});
```

- la query finale costruita esce:

```SQL
DELETE FROM `eventi` 
AS e 
WHERE e.`stato` = ?
```

Per usarli bisogna importare la singola funzione oppure il file CRUDs/index.js che li esporta tutti
