# Onlinebetrieb mit Render und Neon

Frontend und Backend laufen gemeinsam in einem Docker-Container. Dadurch
verwenden Anmeldung und API dieselbe HTTPS-Adresse. Auf dem Rechner der
Ausbilderin ist nur ein Browser erforderlich; der Entwicklungsrechner muss
nicht eingeschaltet bleiben.

Die Anwendung ist unter
[grone-urlaubsantrag.onrender.com](https://grone-urlaubsantrag.onrender.com)
erreichbar. Vorhandene Konten und Einladungszustände wurden aus der lokalen
Datenbank übernommen und überprüft. Für die Ausbilderin genügt dieser Link
mit einem persönlichen Ausbilder-Einladungscode.

## Kostenlose Bereitstellung

- Render: ein Web Service, Plan `free`, Region Frankfurt.
- Neon: ein PostgreSQL-Projekt im kostenlosen Tarif, möglichst Frankfurt.
- Render-Datenbanken werden nicht angelegt: deren kostenloser Tarif läuft
  nach 30 Tagen ab.
- Render beendet den laufenden Web Service nach 15 Minuten ohne Nutzung.
  Der nächste Aufruf kann etwa ein bis drei Minuten zum Starten benötigen.
- Kostenlose Tarife haben Nutzungsgrenzen. Vor einem Tarifwechsel Kosten und
  aktuelle Bedingungen beim jeweiligen Anbieter prüfen.

Die Konfiguration befindet sich in `render.yaml`. Sie verwendet den Branch
`leave-management`; spätere Veröffentlichungen werden manuell in Render
ausgelöst. Vor einem Branchwechsel auch diese Einstellung aktualisieren.

## Einrichtung

1. In Neon ein kostenloses PostgreSQL-Projekt erstellen.
2. In Render den Branch mit `render.yaml` als Blueprint verbinden.
3. Folgende private Umgebungsvariablen ausschließlich in Render hinterlegen:

| Variable | Inhalt |
| --- | --- |
| `DB_URL` | JDBC-Adresse der Neon-Datenbank mit TLS |
| `DB_USERNAME` | Datenbankrolle aus Neon |
| `DB_PASSWORD` | Passwort dieser Datenbankrolle |
| `SETUP_TOKEN` | Wird von Render zufällig erzeugt |

Format der JDBC-Adresse ohne Passwort:

```text
jdbc:postgresql://HOST/DATENBANK?sslmode=verify-full&sslfactory=org.postgresql.ssl.DefaultJavaSSLFactory
```

HOST und DATENBANK durch die Angaben des Neon-Projekts ersetzen. Eine direkte
Neon-Verbindung verwenden, damit Datenbankmigrationen und die Anwendung
dieselbe Verbindungskonfiguration nutzen. Benutzername und Passwort getrennt
hinterlegen. Die Zertifikatsprüfung bleibt eingeschaltet; die Anwendung nutzt
die vertrauenswürdigen Zertifizierungsstellen der Java-Laufzeit.

4. Vor dem Erstellen kontrollieren: genau ein Web Service, Plan **Free**,
   keine kostenpflichtigen Zusatzdienste oder Datenträger.
5. Bereitstellung starten und warten, bis Render **Live** anzeigt.
6. Öffentliche HTTPS-Adresse und `/api/health` prüfen.
7. Bei einer neuen Datenbank mit `SETUP_TOKEN` das erste Verwaltungskonto
   anlegen. Anschließend für jede Person einen eigenen Einladungscode
   ausstellen. Den Einrichtungscode nicht weitergeben.

Lokale Konten und Einladungscodes werden nicht automatisch übertragen.
Ohne ausdrücklich geplante Datenübernahme beginnt der Onlinebetrieb mit
einer leeren Datenbank. Einrichtungscodes, Datenbankpasswörter und Exporte
gehören weder in Git noch in Nachrichten an die Ausbilderin.

## Aktualisierungen und Daten

Der Container enthält ausschließlich die gebaute Anwendung. Konten und
Anträge liegen dauerhaft in PostgreSQL. Änderungen am Dateisystem des
Render-Containers gehen bei Neustarts verloren. Sitzungen liegen im Speicher;
nach einem Neustart oder einer Ruhephase ist eine erneute Anmeldung nötig.

Vor Datenbankänderungen eine private Sicherung erstellen. Ein Zurücksetzen
des veröffentlichten Programms macht Datenbankmigrationen nicht rückgängig.
Vor dem Hochladen echter Daten klären, welche Daten für den Test benötigt
werden und wer Zugriff auf das Hostingkonto hat.

## Überprüfung des gemeinsamen Pakets

Der Docker-Build führt Frontend-Lint, Frontend-Build und Backend-Tests aus.
Für einen zusätzlichen Browsertest das gebaute Backend-JAR mit eingebettetem
Frontend über `E2E_BACKEND_JAR` auswählen und im Ordner `frontend` starten:

```powershell
$env:E2E_PACKAGED_APP='true'
$env:E2E_BACKEND_JAR='ABSOLUTER_PFAD_ZUM_JAR'
npm.cmd run test:e2e
```

Der Test verwendet Port 19080 und eine eigene H2-Datenbank. Das Abschalten
des Secure-Cookie-Flags erfolgt ausschließlich für diesen lokalen HTTP-Test.
Im Produktionsprofil sind sichere HTTPS-Cookies immer eingeschaltet.

## Anbieterreferenzen

- [Render: kostenlose Dienste](https://render.com/docs/free)
- [Render: Docker](https://render.com/docs/docker)
- [Render: Blueprints](https://render.com/docs/blueprint-spec)
- [Neon: Tarife und Grenzen](https://neon.com/pricing)
- [Neon: Datenbankverbindungen](https://neon.com/docs/connect/connect-from-any-app)
