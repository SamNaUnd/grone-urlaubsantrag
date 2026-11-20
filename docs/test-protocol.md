# Testkonzept und Testprotokoll

## Testumgebungen

- Java 21, Spring Boot 4.1.2, JUnit 5 und Spring Test
- H2 mit derselben Flyway-Migration wie PostgreSQL für automatisierte Tests
- PostgreSQL 19 für den lokalen Verbindungs- und Migrationstest
- Playwright mit einem unsichtbaren Chromium-Browser für Funktionstests

Automatisierte Tests verwenden technische Testkonten in einer eigenen
temporären Datenbank. Es werden keine echten Personendaten als Testdaten
versioniert und keine Testkonten in der lokalen PostgreSQL-Datenbank angelegt.

## Automatisierte Prüfungen

| Bereich | Prüfung |
|---|---|
| Anwendung | Spring-Kontext startet, SQL-Abfrage ausführbar |
| Anmeldung | Falsches Passwort abgewiesen; gültige Anmeldung erzeugt Sitzung |
| Sitzung | Deaktiviertes Konto abgewiesen; Passwortreset beendet alte Berechtigung |
| CSRF | Schreibender Zugriff ohne Token abgewiesen |
| Ersteinrichtung | Lokaler Code erforderlich; nur ein erstes Konto möglich |
| Einladungen | Getrennte Ausbilder-/Azubi-Rollen; keine Verwaltungscodes |
| Registrierung | Einmalig, befristet, widerrufbar; Profil und Jahresanspruch aus Code |
| Code-Schutz | Nur Hash gespeichert; Verwaltungsliste enthält keine vollständigen Codes |
| Parallele Einlösung | Derselbe Code erzeugt auch bei gleichzeitiger Nutzung nur ein Konto |
| Antrag | Anlegen, Genehmigen, Status und Entscheidung einsehen |
| Ablehnung | Begründung erforderlich; Reservierung wird freigegeben |
| Rücknahme | Nur offen und nur durch Antragsteller; wiederholte Rücknahme abgewiesen |
| Sichtbarkeit | Fremde Anträge und nicht zugeordnete Profile gesperrt |
| Berechtigung | Auszubildende dürfen nicht genehmigen oder Benutzer verwalten |
| Kontingent | Offene Anträge reservieren Tage; Überschreitung abgewiesen |
| Überschneidung | Identische bzw. überlappende aktive Zeiträume abgewiesen |
| Gleichzeitigkeit | Zwei parallele Anträge für denselben Zeitraum ergeben nur eine Reservierung |
| Datumswerte | Umgekehrter Zeitraum, rückwirkender Urlaub und null Arbeitstage abgewiesen |
| Entscheidung | Keine zweite Entscheidung und keine Rücknahme genehmigten Urlaubs |
| Verwaltung | Benutzer anlegen; doppelte E-Mail abweisen; Kontingente ändern |
| Feiertage | Berlin-Filter, Wochenenden, einschließlich Enddatum, Cache |
| Externe API | HTTP-Vertrag über lokalen Testserver; Ausfall führt zu HTTP 503 |
| Dokumentation | OpenAPI enthält Anmeldung und CSRF-Header |
| Frontend | TypeScript-/Produktionsbuild und ESLint |

## Browser-Funktionstest

Der Test startet ein eigenes Backend auf Port 19080 und ein eigenes Frontend
auf Port 15173. Er richtet drei technische Testrollen ein und führt aus:

1. Verwaltungskonto über Einrichtungscode anlegen und anmelden.
2. Ausbilder und Ausbildungsprofil anlegen, Jahreskontingent pflegen.
3. Als Auszubildender einen Antrag mit berechneten Tagen stellen.
4. Als zugeordneter Ausbilder genehmigen.
5. Als Auszubildender Status und reduzierten verfügbaren Resturlaub prüfen.
6. Darstellung bei 390 Pixel Breite auf horizontalen Seitenüberlauf prüfen.
7. Berliner Feiertage anzeigen.

Ein zweiter Browsertest erstellt je einen Ausbilder- und Auszubildendencode,
registriert beide Rollen und prüft Zuordnung, Kontingent und eingeschränkte
Navigation.

Der Feiertagsabruf dieses Browsertests benötigt Internetzugang. Screenshots
und Fehler-Traces werden nur unter dem ignorierten Verzeichnis
`frontend/test-results` gespeichert.

## Ausführung

```powershell
# backend
.\mvnw.cmd clean verify

# frontend
npm.cmd run build
npm.cmd run lint
npm.cmd run test:install
npm.cmd run test:e2e
```

## Letzter lokaler Prüflauf: 20.11.2026

| Prüfung | Ergebnis |
|---|---|
| Backend, `clean verify` | 27 Tests erfolgreich |
| Frontend, Produktionsbuild | Erfolgreich |
| Frontend, ESLint | Erfolgreich |
| Browser-Funktionstests | 2 erfolgreich: Urlaubsablauf/Mobilansicht und beide Einladungsrollen |
| npm-Abhängigkeitsprüfung | Keine gemeldeten Schwachstellen |
| PostgreSQL 19, Anmeldung als `grone_app` | Erfolgreich |
| PostgreSQL 19, Flyway-Migration und Hibernate-Schemaprüfung | Erfolgreich |
| Laufende Anwendung, `/api/health` | Anwendung und Datenbank `UP` |

Die Desktop- und Mobilansichten wurden zusätzlich anhand der erzeugten
Screenshots überprüft. Eine persönliche Abnahme mit den tatsächlichen Konten
und Urlaubskontingenten steht noch aus.

## Prüfung des Hostingpakets: 20.11.2026

| Prüfung | Ergebnis |
|---|---|
| Backend mit eingebettetem Frontend, `verify` | 27 Tests erfolgreich |
| Frontend, Build und ESLint | Erfolgreich |
| Browsertests direkt gegen das gemeinsame JAR | 2 erfolgreich, einschließlich beider Einladungsrollen |
| Produktionsprofil mit 256 MB Java-Heap | Browsertests erfolgreich; lokale HTTP-Cookies nur im Test erlaubt |
| `render.yaml`, offizielles JSON-Schema | Gültig |
| JAR-Inhalt | Frontend und Produktionsprofil vorhanden; keine lokalen Geheimnisdateien |
| Produktions-HTTP-Prüfung | Oberfläche erreichbar, private API geschützt, Secure-/HttpOnly-/SameSite-Cookies und weitergeleitetes HTTPS geprüft |
| Docker-Image und öffentliche Bereitstellung | Noch nicht geprüft; lokal ist Docker nicht installiert |

Die Tests verwenden eine eigene temporäre Datenbank. Bestehende lokale Konten
und Anträge werden dabei nicht geändert. Die Prüfung des JSON-Schemas ersetzt
noch keine erfolgreiche Bereitstellung bei Render.
