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

- Regeln zur Entstehung und Übertragung des Urlaubsanspruchs
- Abstimmung mit einem Praktikumsbetrieb
- Regeln zur Rücknahme bereits genehmigter Anträge

## Entscheidungen für die erste Version

- Ausbildungsstandort: Berlin, Feiertagsregion `DE-BE`.
- Arbeitswoche: Montag bis Freitag; ganze Urlaubstage.
- Anfangs- und Enddatum werden einschließlich gerechnet.
- Nur zukünftige Zeiträume einschließlich des heutigen Tages sind beantragbar.
- Ein Antrag gehört genau zu einem Kalenderjahr. Jahresübergreifende Zeiträume
  werden in zwei Anträge aufgeteilt.
- Offene und genehmigte Anträge binden Urlaubstage. Eine Ablehnung oder
  Rücknahme eines offenen Antrags gibt die reservierten Tage wieder frei.
- Überschneidungen mit offenen oder genehmigten Anträgen sind nicht zulässig.
- Kontingente werden pro Person und Kalenderjahr gespeichert. Ohne Eintrag
  stehen für das betreffende Jahr null Tage zur Verfügung.
- Eine Senkung unter bereits gebundene Urlaubstage wird abgelehnt.
- Nur der aktuell zugeordnete Ausbilder darf entscheiden. Die Verwaltung sieht
  alle Anträge und verwaltet Stammdaten, trifft aber keine Ausbilderentscheidung.
- Eine Ablehnung benötigt eine Begründung. Pro Antrag gibt es höchstens eine
  abschließende Entscheidung.
- Bereits genehmigter Urlaub kann in dieser Version nicht zurückgezogen werden.
- Der erste Administrator wird über einen privaten, lokal erzeugten Code
  eingerichtet. Es gibt keine fest eingebauten Benutzer oder Passwörter.
- Weitere Personen können sich mit eigenen, einmaligen Einladungscodes selbst
  registrieren: `AB-` für Ausbilder und `AZ-` für Auszubildende. Die Verwaltung
  legt Rolle, Ausbildungsbereich, Ausbilder und Jahreskontingent fest. Codes
  sind befristet und können vor der Einlösung widerrufen werden.
- Die API prüft Rollen und aktive Konten bei jeder geschützten Fachaktion.
- Bei nicht erreichbarer Feiertags-API wird kein Antrag mit ungeprüfter
  Tageszahl angelegt. Erfolgreich geladene Jahresdaten werden 24 Stunden zwischengespeichert.

Weiter offen bleiben automatische Anspruchsentstehung, Übertrag,
Praktikumsfreigaben und Sonderfälle außerhalb des Berliner Standorts.
