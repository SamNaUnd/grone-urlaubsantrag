# Technische Dokumentation

## Architektur

Die Anwendung besteht aus einem React-/TypeScript-Frontend, einem Spring-Boot-
Backend und einer PostgreSQL-Datenbank. Vite leitet lokale `/api`-Anfragen an
das Backend weiter. Browser und API verwenden dadurch denselben Ursprung.

| Baustein | Aufgabe |
|---|---|
| `ApiController` | HTTP-Endpunkte, validierte Ein- und Ausgaben |
| `SecurityConfig` | Anmeldung, Sitzung, CSRF, Passwort-Encoder |
| `AccountService` | Konten, Rollen, Zuordnungen, Passwortänderungen |
| `SetupService` | Einmalige Einrichtung des ersten Administrators |
| `InvitationService` | Einmalige, rollengebundene Registrierungscodes |
| `LeaveService` | Sichtbarkeit, Anträge, Entscheidungen und Kontingente |
| `HolidayService` | Nager.Date, Berlin-Filter, Cache und Tagesberechnung |
| JPA-Repositories | Datenbankzugriff |
| Flyway | Versionierte SQL-Struktur |
| `ApiExceptionHandler` | Einheitliche, verständliche Fehlermeldungen |

## Datenmodell

`users` speichert Konten. `trainees` ergänzt Ausbildungsbereich, Standort und
Ausbilderzuordnung. `leave_entitlements` enthält den Anspruch je Jahr;
`leave_requests` enthält Anträge und `approvals` die abschließende Entscheidung.

Der Jahresanspruch wird bewusst nicht als einzelnes, überschreibbares Feld im
Ausbildungsprofil abgelegt. Die eigene Tabelle verhindert, dass eine Änderung
für ein neues Jahr die historischen Kontingente überschreibt.

Die Beziehungen sind durch Fremdschlüssel gesichert. Ein eindeutiger Index
verhindert mehrere Entscheidungen für denselben Antrag. Die Tabelle
`application_lock` serialisiert die Ersteinrichtung.

`registration_invitations` speichert Rollen, Ausbilderzuordnung, Jahresanspruch,
Ablauf und Einlösestatus. Der eigentliche Code wird nur gehasht abgelegt und
bei der Erstellung einmal ausgegeben. Die Registrierung sperrt die Einladung
bis zum Transaktionsende, sodass parallele Einlösungen nur ein Konto erzeugen.
Bei einer fehlgeschlagenen Registrierung bleibt der Code unbenutzt.

Die maßgebliche SQL-Struktur liegt unter
`backend/src/main/resources/db/migration/V1__initial_schema.sql`.
Die Einladungstabelle wird über `V2__registration_invitations.sql` ergänzt.
Die Verwaltung kann beide Einladungsrollen verwalten. Ausbilder dürfen nur
eigene Auszubildendencodes ausstellen, auflisten und widerrufen. Der Server
erzwingt die Zuordnung zum angemeldeten Ausbilder und lehnt andere Rollen
oder fremde Zuordnungen ab. Dafür ist keine weitere Datenbankmigration nötig.
Nach ihrer ersten Anwendung wird diese Datei nicht verändert; weitere
Strukturänderungen erhalten neue Flyway-Migrationen.

## Transaktionen und gleichzeitige Änderungen

Antragserstellung, Rücknahme, Entscheidung und Kontingentänderung sperren das
zugehörige Ausbildungsprofil mit einer Datenbank-Schreibsperre. Dadurch können
zwei gleichzeitige Vorgänge das Kontingent nicht unabhängig voneinander
verbrauchen. Nach dem Warten auf eine Sperre wird der Antrag erneut geladen.
Status und Entscheidung werden in derselben Transaktion gespeichert.

## Anmeldung und Berechtigungen

Spring Security verarbeitet die Anmeldung und erzeugt eine serverseitige
Sitzung. Der Browser erhält ein HttpOnly-Sitzungs-Cookie; Passwörter oder
Anmeldetoken werden nicht im Browser-Speicher abgelegt. Schreibende Anfragen
benötigen einen CSRF-Token.

Die Fachservices laden das aktuelle Konto bei jedem Zugriff neu. Eine
Deaktivierung oder Rollenänderung greift daher auch bei vorhandenen Sitzungen.
Eine Passwortänderung erhöht `credentials_version`; ältere Sitzungen werden
bei ihrem nächsten Fachzugriff abgewiesen.

Die eigene Verwaltung kann sich nicht deaktivieren oder herabstufen. Ein
zugeordneter Ausbilder muss vor Deaktivierung bzw. Rollenwechsel ersetzt werden.
Eine Ausbildungsrolle mit Urlaubshistorie bleibt zur Wahrung dieser Historie
erhalten; deaktivieren ist weiterhin möglich.

## Feiertage und Resturlaub

Die Datenquelle ist `https://date.nager.at/api/v3/PublicHolidays/{year}/DE`.
Es zählen gesetzliche Feiertage (`Public`), die bundesweit gelten oder `DE-BE`
zugeordnet sind. Samstage und Sonntage werden ausgeschlossen.

Ein erfolgreicher Jahresabruf wird 24 Stunden gespeichert. Verbindungs- und
Lesezeitlimits begrenzen die Wartezeit. Ohne belastbare Feiertagsdaten wird eine
neue Tagesberechnung mit HTTP 503 abgebrochen.

Verfügbar = Jahresanspruch - offener Urlaub - genehmigter Urlaub.
Das Dashboard trennt bereits vollständig beendeten genehmigten Urlaub von
laufendem bzw. zukünftigem Urlaub. Laufende Anträge werden vollständig unter
„genehmigt / geplant“ angezeigt.

## Lokale Ausführung und weiterer Betrieb

Standardmäßig bindet der Server an `127.0.0.1`; er ist für den lokalen PC
eingerichtet. Eine spätere Bereitstellung benötigt HTTPS, `COOKIE_SECURE=true`,
eine passende Serveradresse, eine gemeinsame Frontend-/API-Adresse und eine
gesonderte Betriebsentscheidung. Das Projekt veröffentlicht keine Daten selbst.

Das optionale Profil `local` verwendet eine separate H2-Dateidatenbank für
Entwicklung ohne PostgreSQL. Das Profil `test` und die Browsertests verwenden
temporäre H2-Datenbanken. Diese Daten werden nicht in PostgreSQL übernommen.
