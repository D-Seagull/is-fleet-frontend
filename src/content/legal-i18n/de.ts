import type { LegalSet } from "../legal";

const UPDATED = "Zuletzt aktualisiert: 9. Oktober 2026";

const de: LegalSet = {
  privacy: {
    title: "Datenschutzerklärung",
    updated: UPDATED,
    intro: [
      "Diese Erklärung beschreibt, welche personenbezogenen Daten IS Fleet verarbeitet — ein Flottenmanagementsystem, bestehend aus einer Webanwendung und den mobilen Apps IS Driver und IS Manager.",
      "IS Fleet ist ein Werkzeug für Unternehmen. Konten werden von einem Transportunternehmen für seine eigenen Mitarbeiter angelegt; Fahrer können sich nicht selbst registrieren.",
    ],
    sections: [
      {
        heading: "1. Wer für Ihre Daten verantwortlich ist",
        paragraphs: [
          "Verantwortlicher ist Dmytro Chaika, eine natürliche Person, die IS Fleet entwickelt und betreibt. Postanschrift: ul. Zawidowska 11/4, Wrocław, Polen.",
          "Bei Fragen zur Verarbeitung Ihrer Daten schreiben Sie an dchaika.work@gmail.com.",
          "Bitte beachten Sie: Für Arbeitsdaten (Fahrten, Nachrichten, Dokumente) ist das beschäftigende Transportunternehmen der Verantwortliche; Dmytro Chaika handelt als Auftragsverarbeiter nach dessen Weisung.",
        ],
      },
      {
        heading: "2. Welche Daten wir verarbeiten",
        paragraphs: ["Wir erheben nur, was für den Betrieb des Dienstes nötig ist:"],
        bullets: [
          "Kontodaten: Vor- und Nachname, Telefonnummer, E-Mail, Profilfoto, Kommunikations- und Oberflächensprache, Zeitzone.",
          "Arbeitsdaten: Fahrten und ihre Adressen, Lkw, von Ihnen hochgeladene Dokumente und Fotos, Kommentare und Bewertungen.",
          "Nachrichten: Nachrichten in Einzel-, Gruppen- und Fahrt-Chats samt Anhängen.",
          "Technische Daten: Push-Benachrichtigungs-Token und Gerätetyp (iOS/Android), Anwesenheitsstatus und Zeitpunkt der letzten Aktivität, Protokolle der Serveranfragen.",
          "Zugriff auf Kamera und Fotomediathek wird nur angefordert, wenn Sie selbst ein Profilfoto oder ein Dokument hochladen, und ausschließlich dafür verwendet.",
        ],
      },
      {
        heading: "3. Was wir NICHT erheben",
        bullets: [
          "Standort. Die Apps ermitteln und übermitteln Ihren Standort nicht — weder im Hintergrund noch während der Nutzung.",
          "Zahlungsdaten. Der Dienst nimmt keine Zahlungen von App-Nutzern entgegen.",
          "Werbe-IDs. Wir zeigen keine Werbung und geben keine Daten an Werbenetzwerke weiter.",
        ],
      },
      {
        heading: "4. Zweck und Rechtsgrundlage",
        bullets: [
          "Bereitstellung des Dienstes — Erfüllung des Vertrags mit Ihrem Arbeitgeber: Anmeldung, Fahrten, Chat, Benachrichtigungen.",
          "Sicherheit — berechtigtes Interesse: Schutz vor unbefugtem Zugriff, Fehlerprotokolle, Begrenzung der Anfragehäufigkeit.",
          "Kommunikation — berechtigtes Interesse: Service-E-Mails wie Einladungen oder das Zurücksetzen des Passworts.",
        ],
      },
      {
        heading: "5. Weitergabe von Daten",
        paragraphs: [
          "Innerhalb des Dienstes sehen nur Mitarbeiter Ihres eigenen Unternehmens Ihre Daten, entsprechend ihrer Rolle.",
          "Wir nutzen folgende Infrastruktur-Anbieter:",
        ],
        bullets: [
          "Supabase — Datenbank und Dateispeicher.",
          "Render — Hosting des Servers.",
          "Vercel — Hosting der Webanwendung.",
          "Twilio — Versand von Einmal-Anmeldecodes per SMS.",
          "Resend — Versand von Service-E-Mails.",
          "Expo, Google FCM und Apple APNs — Zustellung von Push-Benachrichtigungen.",
          "Sentry — technische Fehlerberichte der App: Stacktraces und Anfragepfad. Nachrichteninhalte, Cookies und Autorisierungs-Header werden nicht übermittelt.",
        ],
      },
      {
        heading: "6. Speicherdauer",
        paragraphs: [
          "Kontodaten werden gespeichert, solange das Konto besteht. Nach der Löschung des Kontos werden personenbezogene Daten anonymisiert — siehe Abschnitt 8.",
          "Arbeitsunterlagen (Fahrten, Dokumente, Nachrichten) gehören dem beschäftigenden Unternehmen und werden nach dessen Richtlinien sowie den Aufbewahrungsvorschriften für Transportdokumente aufbewahrt.",
        ],
      },
      {
        heading: "7. Ihre Rechte",
        paragraphs: [
          "Soweit die DSGVO für Sie gilt, haben Sie das Recht auf Auskunft über Ihre Daten, auf Berichtigung, Löschung, Einschränkung der Verarbeitung oder Widerspruch gegen die Verarbeitung sowie auf Datenübertragbarkeit.",
          "Um diese Rechte auszuüben, schreiben Sie an dchaika.work@gmail.com. Sie haben außerdem das Recht, sich bei einer Aufsichtsbehörde zu beschweren: In Polen ist dies der Präsident des Amtes für den Schutz personenbezogener Daten (Prezes UODO), ul. Stawki 2, 00-193 Warschau. Wenn Sie in einem anderen EU-Land wohnen, können Sie sich an die Behörde an Ihrem Wohnort wenden.",
        ],
      },
      {
        heading: "8. Konto löschen",
        paragraphs: [
          "Sie können Ihr Konto selbst löschen: in der mobilen App unter „Einstellungen“ → „Konto löschen“, im Web unter „Kontoeinstellungen“ → Menü „⋮“ → „Konto löschen“.",
          "Nach der Löschung werden Ihre personenbezogenen Daten (Name, Telefon, E-Mail, Foto) gelöscht, und eine Anmeldung ist dauerhaft nicht mehr möglich. Fahrten und Nachrichten bleiben anonymisiert in der Historie des Unternehmens — sie sind Arbeitsunterlagen des Arbeitgebers.",
          "Eine ausführliche Anleitung finden Sie unter /delete-account.",
        ],
      },
      {
        heading: "9. Kinder",
        paragraphs: [
          "Der Dienst ist ausschließlich für Mitarbeiter von Transportunternehmen bestimmt und richtet sich nicht an Personen unter 16 Jahren.",
        ],
      },
      {
        heading: "10. Änderungen",
        paragraphs: [
          "Über wesentliche Änderungen dieser Erklärung informieren wir in der App oder per E-Mail, bevor sie wirksam werden.",
        ],
      },
    ],
  },

  terms: {
    title: "Nutzungsbedingungen",
    updated: UPDATED,
    intro: [
      "Diese Bedingungen regeln die Nutzung des Systems IS Fleet, das von Dmytro Chaika, einer natürlichen Person (im Folgenden „Anbieter“), bereitgestellt wird.",
      "Die Zusammenarbeit zwischen dem Anbieter und einem Kundenunternehmen, einschließlich etwaiger Zahlungen, kann in einer gesonderten Vereinbarung geregelt werden; diese Bedingungen gelten für die Nutzer der Apps.",
    ],
    sections: [
      {
        heading: "1. Der Dienst",
        paragraphs: [
          "IS Fleet ist ein Flottenmanagementsystem: Fahrten, Lkw, Dokumente, Nachrichten und Benachrichtigungen für Transportunternehmen.",
        ],
      },
      {
        heading: "2. Konten",
        paragraphs: [
          "Konten werden vom beschäftigenden Unternehmen angelegt. Sie sind dafür verantwortlich, Ihren Zugang zu schützen, und für Handlungen, die unter Ihrem Konto vorgenommen werden.",
          "Fahrer melden sich mit Telefonnummer und Einmalcode an, Manager mit E-Mail und Passwort.",
        ],
      },
      {
        heading: "3. Zulässige Nutzung",
        bullets: [
          "Nutzen Sie den Dienst nicht rechtswidrig oder zur Übermittlung rechtswidriger Inhalte.",
          "Versuchen Sie nicht, auf Daten anderer Unternehmen zuzugreifen oder Rollenbeschränkungen zu umgehen.",
          "Stören Sie den Dienst nicht und verursachen Sie keine übermäßige Last.",
        ],
      },
      {
        heading: "4. Unternehmensdaten",
        paragraphs: [
          "Im Dienst erstellte Inhalte (Fahrten, Dokumente, Nachrichten) gehören dem beschäftigenden Unternehmen. Die Verarbeitung personenbezogener Daten ist in der Datenschutzerklärung beschrieben.",
        ],
      },
      {
        heading: "5. Verfügbarkeit und Haftung",
        paragraphs: [
          "Der Dienst wird „wie besehen“ bereitgestellt. Wir unternehmen angemessene Anstrengungen für einen störungsfreien Betrieb, garantieren jedoch keinen unterbrechungs- oder fehlerfreien Betrieb.",
          "Soweit gesetzlich zulässig, haftet der Anbieter nicht für mittelbare Schäden, entgangenen Gewinn oder Datenverlust.",
        ],
      },
      {
        heading: "6. Beendigung",
        paragraphs: [
          "Das beschäftigende Unternehmen kann das Konto eines Mitarbeiters deaktivieren. Sie können Ihr eigenes Konto jederzeit selbst löschen.",
        ],
      },
      {
        heading: "7. Anwendbares Recht",
        paragraphs: [
          "Für diese Bedingungen gilt polnisches Recht; für Streitigkeiten ist das nach polnischem Recht zuständige Gericht zuständig. Verbrauchern bleibt der Schutz durch zwingende Vorschriften ihres Wohnsitzlandes erhalten. Fragen: dchaika.work@gmail.com.",
        ],
      },
    ],
  },

  deleteAccount: {
    title: "Konto löschen",
    updated: UPDATED,
    intro: [
      "Auf dieser Seite erfahren Sie, wie Sie Ihr IS-Fleet-Konto löschen und was genau mit Ihren Daten geschieht. Sie können es selbst tun, ohne den Support zu kontaktieren.",
    ],
    sections: [
      {
        heading: "In der mobilen App",
        paragraphs: ["Gilt für die Apps IS Driver und IS Manager."],
        bullets: [
          "Öffnen Sie „Einstellungen“ (in der Manager-App „Konto“).",
          "Scrollen Sie ganz nach unten.",
          "Tippen Sie auf „Konto löschen“ unter der Schaltfläche „Abmelden“.",
          "Bestätigen Sie im Dialog.",
        ],
      },
      {
        heading: "Im Web",
        bullets: [
          "Klicken Sie unten in der Seitenleiste auf Ihren Namen und wählen Sie „Kontoeinstellungen“.",
          "Öffnen Sie das Menü „⋮“ in der Kopfzeile der Seite.",
          "Wählen Sie „Konto löschen“ und bestätigen Sie mit „Endgültig löschen“.",
        ],
      },
      {
        heading: "Was gelöscht wird",
        bullets: [
          "Vor- und Nachname, Telefonnummer, E-Mail, Profilfoto.",
          "Passwort und alle aktiven Sitzungen.",
          "Push-Benachrichtigungs-Token aller Ihrer Geräte.",
          "Eine Anmeldung ist dauerhaft nicht mehr möglich.",
        ],
      },
      {
        heading: "Was erhalten bleibt",
        paragraphs: [
          "Fahrten, Dokumente und Nachrichten bleiben anonymisiert in der Historie Ihres Unternehmens: Statt Ihres Namens wird ein Hinweis auf einen gelöschten Nutzer angezeigt.",
          "Dies sind Arbeitsunterlagen des Arbeitgebers, die er aufbewahren muss — unter anderem für Transportnachweise. Sie sind nicht mehr mit Ihren personenbezogenen Daten verknüpft.",
        ],
      },
      {
        heading: "Wenn Sie sich nicht anmelden können",
        paragraphs: [
          "Wenn Sie den Zugang verloren haben und das Konto nicht selbst löschen können, senden Sie eine Anfrage an dchaika.work@gmail.com — von der Telefonnummer oder E-Mail-Adresse, die mit dem Konto verknüpft ist. Wir bearbeiten sie innerhalb von 30 Tagen.",
        ],
      },
    ],
  },
};

export default de;
