# REST API

## Anmeldung

1. `GET /api/auth/csrf` liefert `token` und `headerName`.
2. `POST /api/auth/login` mit Formularfeldern `email` und `password` sowie dem
   CSRF-Header senden.
3. Das Sitzungs-Cookie bei weiteren Anfragen mitsenden.
4. Nach Anmeldung und Abmeldung einen neuen CSRF-Token abrufen.

Die Anmeldung liefert HTTP 204. Fachendpunkte geben JSON zurück.
Schreibende JSON-Anfragen benötigen `Content-Type: application/json` und den
Header `X-CSRF-TOKEN` mit dem zuvor abgerufenen Token.

## Endpunkte

| Methode | Pfad | Berechtigung / Zweck |
|---|---|---|
| GET | `/api/health` | Öffentlich; prüft Anwendung und Datenbank |
| GET | `/api/setup/status` | Öffentlich; Ersteinrichtung erforderlich? |
| POST | `/api/setup` | Lokaler Einrichtungscode; nur vor erstem Konto |
| GET | `/api/auth/csrf` | Öffentlich; CSRF-Token abrufen |
| POST | `/api/auth/login` | Anmeldung |
| POST | `/api/auth/register` | Registrierung mit einmaligem Einladungscode |
| POST | `/api/auth/logout` | Abmeldung |
| GET | `/api/auth/me` | Eigenes Konto |
| PUT | `/api/auth/password` | Eigenes Passwort ändern |
| GET | `/api/trainees` | Nur sichtbare Ausbildungsprofile |
| GET | `/api/balances?year=2027` | Kontingente der sichtbaren Profile |
| GET | `/api/trainees/{id}/leave-balance?year=2027` | Sichtbares Profil |
| PUT | `/api/trainees/{id}/entitlement` | Verwaltung; `{year, days}` |
| GET | `/api/leave-requests` | Nur sichtbare Anträge |
| GET | `/api/leave-requests/{id}` | Sichtbarer Antrag |
| GET | `/api/leave-requests/preview?startDate=2027-01-11&endDate=2027-01-15` | Auszubildende; Vorschau |
| POST | `/api/leave-requests` | Auszubildende; `{startDate, endDate, reason}` |
| PUT | `/api/leave-requests/{id}/withdraw` | Antragsteller; nur offen |
| PUT | `/api/leave-requests/{id}/approve` | Zugeordneter Ausbilder; `{comment}` |
| PUT | `/api/leave-requests/{id}/reject` | Zugeordneter Ausbilder; `{comment}` mit Begründung |
| GET | `/api/holidays?year=2027` | Angemeldete; Berliner Feiertage |
| GET | `/api/admin/users` | Verwaltung |
| POST | `/api/admin/users` | Verwaltung; Konto anlegen |
| PUT | `/api/admin/users/{id}` | Verwaltung; Konto aktualisieren |
| PUT | `/api/admin/users/{id}/password` | Verwaltung; `{password}` |
| GET | `/api/invitations` | Verwaltung: alle; Ausbilder: nur eigene Auszubildendencodes, ohne vollständige Codes |
| POST | `/api/invitations` | Verwaltung: AB-/AZ-Code; Ausbilder: AZ-Code für eigene Auszubildende |
| PUT | `/api/invitations/{id}/revoke` | Verwaltung oder ausstellender Ausbilder; unbenutzten Code widerrufen |

Sichtbar bedeutet: eigenes Profil für Auszubildende, zugeordnete Profile für
Ausbilder, alle Profile für die Verwaltung. Passwort-Hashes werden niemals
über die API ausgegeben.

## Antworten

| Status | Bedeutung |
|---|---|
| 200 | Abfrage oder Aktualisierung erfolgreich |
| 201 | Konto oder Antrag angelegt |
| 204 | Anmeldung, Abmeldung oder Passwortaktion erfolgreich |
| 400 | Eingaben oder Datumsbereich ungültig |
| 401 | Nicht angemeldet, Sitzung abgelaufen oder Konto gesperrt |
| 403 | Fehlende Berechtigung oder ungültiger CSRF-/Einrichtungscode |
| 404 | Datensatz nicht gefunden |
| 409 | Überschneidung, bereits bearbeitet, doppelte E-Mail oder Änderungskonflikt |
| 422 | Kontingent überschritten oder keine Arbeitstage im Zeitraum |
| 503 | Datenbank oder Feiertagsdienst nicht verfügbar |

Fehlerantworten enthalten ein Feld `message` mit einer verständlichen Meldung.

## OpenAPI

Nach der Anmeldung: `/api/docs` am Backend für Swagger UI, `/api/openapi`
für die maschinenlesbare Spezifikation. Der Vite-Proxy reicht die API-Pfade
an das Backend durch. Die erzeugte Dokumentation beschreibt auch die
formularbasierte Anmeldung und den CSRF-Header.

## Einladungscodes

`POST /api/invitations` erwartet `role` (`INSTRUCTOR` oder `TRAINEE`),
`year`, `days` und `validDays` (1 bis 30). Für Auszubildende sind zusätzlich
`trainingProgram` und `instructorId` erforderlich. Der vollständige Code wird
nur in dieser Antwort einmal ausgegeben. Die Datenbank speichert seinen
SHA-256-Hash.

Für Ausbilder ist ausschließlich `TRAINEE` erlaubt. `instructorId` kann
entfallen; der Server setzt immer das angemeldete Ausbilderkonto. Eine fremde
Zuordnung wird mit HTTP 403 abgelehnt. Liste und Widerruf sind auf selbst
ausgestellte, dem eigenen Konto zugeordnete Auszubildendencodes begrenzt.
Auszubildende können keine Codes verwalten. Verwaltungskonten behalten die
Gesamtübersicht. Die bisherigen `/api/admin/invitations`-Pfade bleiben als
Alias mit derselben rollenabhängigen Prüfung erhalten.

`POST /api/auth/register` erwartet `code`, `firstName`, `lastName`, `email`
und `password`. Die Rolle und das Ausbildungsprofil werden ausschließlich aus
der Einladung übernommen. Ein vom Browser mitgesendeter Rollenwert kann die
Berechtigung nicht erhöhen. CSRF-Schutz gilt auch für die Registrierung.

`AB-` kennzeichnet Ausbildercodes, `AZ-` Auszubildendencodes. Jeder Code kann
genau einmal eingelöst werden. Abgelaufene und widerrufene Codes sind ungültig.
Verwaltungskonten können nicht über solche Codes angelegt werden.
