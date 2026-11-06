# Anforderungen

## Ziel

Urlaubsanträge bei Grone digital erstellen, prüfen und verwalten.

## Benutzerrollen

### Auszubildende
- Anmelden und persönliche Daten einsehen.
- Urlaub beantragen.
- Berechnete Urlaubstage und Resturlaub sehen.
- Eigene Anträge und deren Status einsehen.
- Noch offene Anträge zurückziehen.

### Ausbilder
- Anträge zugeordneter Auszubildender einsehen.
- Anträge genehmigen oder mit Begründung ablehnen.
- Urlaubshistorie und kommende Abwesenheiten einsehen.

### Verwaltung
- Benutzer, Rollen und Zuordnungen verwalten.
- Urlaubskontingente verwalten.
- Alle Anträge und Statistiken einsehen.

## Urlaubsantrag

Ein Antrag enthält:
- Auszubildenden und Ausbildungsbereich
- Zuständigen Ausbilder
- Beginn und Ende des Urlaubs, jeweils einschließlich
- Automatisch berechnete Urlaubstage
- Optionale Bemerkung
- Status: offen, genehmigt, abgelehnt oder zurückgezogen
- Erstellungsdatum
- Entscheidung mit Datum, zuständiger Person und Begründung

## Berechnung und Validierung

- Wochenenden zählen nicht als Urlaubstage.
- Feiertage werden passend zum Ausbildungsstandort berücksichtigt.
- Das Enddatum darf nicht vor dem Startdatum liegen.
- Das verfügbare Urlaubskontingent darf nicht überschritten werden.

## Sicherheit

- Passwörter werden nur als sichere Hashwerte gespeichert.
- Berechtigungen werden im Backend geprüft.
- Auszubildende dürfen nur auf eigene Anträge zugreifen.
- Ausbilder dürfen nur Anträge zugeordneter Auszubildender bearbeiten.
- Personenbezogene Daten werden nicht im Git-Repository gespeichert.

## Technische Vorgaben

- Java und Spring Boot
- React, TypeScript und Tailwind CSS
- PostgreSQL
- REST API mit OpenAPI-Dokumentation
- Nager.Date API
- Responsive Benutzeroberfläche

## Noch zu klären

- Bundesland und Ausbildungsstandort
- Regeln zur Entstehung und Übertragung des Urlaubsanspruchs
- Umgang mit offenen Anträgen bei der Resturlaubsberechnung
- Umgang mit überschneidenden und jahresübergreifenden Anträgen
- Abstimmung mit einem Praktikumsbetrieb
- Regeln zur Rücknahme bereits genehmigter Anträge