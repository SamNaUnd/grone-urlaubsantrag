# Lokale Datenbankverbindung

## Voraussetzungen

- Java 21
- PostgreSQL 19 auf localhost, Port 5432
- Datenbank `grone_urlaubsantrag`
- Datenbankbesitzer und Login-Rolle `grone_app`

## Zugangsdaten bereitstellen

Die Datei `backend/.local/database.properties` kann lokal die Eigenschaft
`spring.datasource.password` enthalten. Das Verzeichnis `.local` ist durch
`.gitignore` ausgeschlossen. Die Datei wird automatisch geladen und darf
nicht versioniert oder weitergegeben werden.

Alternativ kann `DB_PASSWORD` für das aktuelle Terminal gesetzt werden.
Die Umgebungsvariable überschreibt die lokale Datei.

## Backend starten

In PowerShell den Ordner `backend` öffnen. Danach ausführen:

```powershell
$databasePassword = Read-Host 'Passwort für grone_app' -AsSecureString
$env:DB_PASSWORD = [System.Net.NetworkCredential]::new('', $databasePassword).Password
.\mvnw.cmd spring-boot:run
```

Das Passwort wird bei dieser Eingabe ausgeblendet und nicht in einer Datei
gespeichert. Nach dem Stoppen des Backends die Umgebungsvariable
entfernen oder das Terminal schließen:

```powershell
Remove-Item Env:DB_PASSWORD
Remove-Variable databasePassword
```

Die Verbindung verwendet standardmäßig:

| Einstellung | Wert |
|---|---|
| Datenbank-URL | `jdbc:postgresql://localhost:5432/grone_urlaubsantrag` |
| Benutzer | `grone_app` |
| Passwort | Umgebungsvariable `DB_PASSWORD` |

Bei Bedarf lassen sich URL und Benutzer über `DB_URL` und `DB_USERNAME`
überschreiben. Passwörter und Datenbankexporte gehören nicht ins Repository.

Flyway legt die Tabellen beim ersten Start über versionierte SQL-Migrationen
an. Hibernate prüft anschließend, ob Datenbank und Entities zusammenpassen.
Vorhandene, versionierte Migrationen werden nicht erneut ausgeführt.

## Verbindung prüfen

Beim erfolgreichen Start meldet Hibernate die PostgreSQL-Verbindung und
Spring Boot den Start von `BackendApplication`. Ein Passwortfehler wird als
fehlgeschlagene Authentifizierung gemeldet.

`/api/health` führt eine Datenbankabfrage aus. Bei Erfolg meldet der Endpunkt
`status: UP` und `database: UP`, bei einer nicht erreichbaren Datenbank HTTP 503.

## Lokale Ports

In `.local/database.properties` kann zusätzlich `server.port` gesetzt werden.
Im Frontend können `API_PROXY_TARGET` und `DEV_PORT` in `.env.local` stehen.
Beide Dateien bleiben lokal. Ohne diese Einstellungen gelten Backend-Port 8080
und Frontend-Port 5173.

## Entwicklung ohne PostgreSQL

```powershell
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=local"
```

Dieses Profil verwendet eine eigenständige H2-Datei unter `backend/.local`.
Es werden keine Daten aus PostgreSQL übernommen oder dorthin zurückgeschrieben.

## Tests

```powershell
.\mvnw.cmd clean test
```

Die Tests verwenden das Profil `test` mit einer temporären H2-Datenbank.
Sie prüfen den Anwendungsstart und eine Datenbankabfrage ohne lokale
Zugangsdaten. Sie ersetzen keinen Verbindungstest gegen PostgreSQL.
