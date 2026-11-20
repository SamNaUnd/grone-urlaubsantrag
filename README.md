# Grone Urlaubsantrag

Eine Webanwendung zur digitalen Verwaltung von Urlaubsanträgen
für Auszubildende bei Grone.

## Geplante Funktionen

- Anmeldung mit drei Rollen: Auszubildende, Ausbilder und Verwaltung
- Urlaubsanträge erstellen und deren Status verfolgen
- Anträge genehmigen oder ablehnen
- Urlaubskontingente und Resturlaub verwalten
- Wochenenden und regionale Feiertage berücksichtigen

## Technologien

- Backend: Java und Spring Boot
- Frontend: React, TypeScript und Tailwind CSS
- Datenbank: PostgreSQL
- Feiertage: Nager.Date API

## Projektstatus

Die Kernfunktionen sind lokal implementiert: Anmeldung, Urlaubsanträge,
Genehmigungen, Verwaltung und rollenabhängige Übersichten.

## Voraussetzungen

- Java 21
- Node.js mit npm
- PostgreSQL mit einer Datenbank `grone_urlaubsantrag` und dem Besitzer `grone_app`
- Internetzugang für die Feiertags-API

## Lokal starten

### Backend

Im Ordner `backend`:

```powershell
.\mvnw.cmd spring-boot:run
```

Das Passwort wird über `DB_PASSWORD` oder die nicht versionierte Datei
`backend/.local/database.properties` bereitgestellt. Siehe
[Datenbankeinrichtung](docs/database-setup.md).

### Frontend

In einem zweiten Terminal im Ordner `frontend`:

```powershell
npm.cmd ci
npm.cmd run dev
```

Öffnen Sie die im Terminal angezeigte Adresse. Standardports sind 8080 für das
Backend und 5173 für das Frontend. Lokale Einstellungen können diese ändern.

### Erstes Konto

Beim ersten Start erzeugt das Backend einen privaten Einrichtungscode unter
`backend/.local/setup-token.txt`. Öffnen Sie die Anwendung und legen Sie damit
Ihr Verwaltungskonto an. Anschließend zuerst Ausbilderkonten, dann die
zugehörigen Auszubildenden anlegen. Es werden keine Beispielkonten eingerichtet.

Alternativ unter **Verwaltung → Einladungscodes → Code erstellen** einen
eigenen Code pro Person ausstellen: `AB-` für Ausbilder oder `AZ-` für
Auszubildende. Die eingeladenen Personen wählen auf der Anmeldeseite
**Mit Einladungscode registrieren** und geben ihre echten Daten und ein
eigenes Passwort ein. Die Verwaltung legt Rolle, Ausbilderzuordnung und
Jahreskontingent fest. Codes sind einmalig, befristet und widerrufbar.

## Funktionen

- Sichere, sitzungsbasierte Anmeldung und Passwortänderung
- Rollen und aktive Konten serverseitig prüfen
- Urlaubsanträge erstellen, einsehen und im offenen Zustand zurückziehen
- Zugeordnete Anträge genehmigen oder begründet ablehnen
- Wochenenden und Berliner Feiertage automatisch ausschließen
- Offene Anträge im Kontingent reservieren und Überschneidungen verhindern
- Urlaubskontingente für jedes Kalenderjahr verwalten
- Benutzer, Rollen und Ausbilderzuordnungen verwalten
- Übersichten, Urlaubshistorien und geplante Abwesenheiten anzeigen
- Mobil nutzbare Oberfläche und geschützte API-Dokumentation

## Tests

Im Ordner `backend`:

```powershell
.\mvnw.cmd clean verify
```

Im Ordner `frontend`:

```powershell
npm.cmd run build
npm.cmd run lint
npm.cmd run test:install
npm.cmd run test:e2e
```

Browsertests verwenden eine eigene temporäre Datenbank. Sie verändern keine
Konten in PostgreSQL. Die Tests benötigen das zuvor gebaute Backend-JAR.

## Dokumentation

- [Anforderungen und fachliche Entscheidungen](docs/requirements.md)
- [Technische Dokumentation](docs/technical-documentation.md)
- [API und Anmeldung](docs/api.md)
- [Testkonzept und Testprotokoll](docs/test-protocol.md)
- [Product Backlog](docs/backlog.md)
- [Entwicklungsplanung](docs/sprint-plan.md)
- [UML- und ER-Diagramme](docs/uml)

## Persönliche Daten und lokale Dateien

Namen und E-Mail-Adressen werden erst bei der Einrichtung in der lokalen
Datenbank gespeichert. Passwörter werden als BCrypt-Hashes gespeichert.
Zugangsdaten, Datenbanken, Einrichtungscodes, Testberichte und lokale
Einstellungen sind von Git ausgeschlossen. Reale Personendaten gehören nicht
in Quellcode, Screenshots oder Datenbankexporte im Repository.

## Aktueller fachlicher Umfang

Standort Berlin, Montag bis Freitag, ganze Urlaubstage. Urlaub über den
Jahreswechsel wird in zwei Anträge aufgeteilt. Ansprüche werden pro Jahr
manuell gepflegt. Automatische Ansparung, Übertrag, halbe Tage, externe
Praktikumsfreigaben und Rücknahme bereits genehmigten Urlaubs sind noch nicht
Bestandteil dieser Version.
