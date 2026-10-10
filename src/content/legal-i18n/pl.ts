import type { LegalSet } from "../legal";

const UPDATED = "Ostatnia aktualizacja: 9 października 2026";

const pl: LegalSet = {
  privacy: {
    title: "Polityka prywatności",
    updated: UPDATED,
    intro: [
      "Niniejsza polityka wyjaśnia, jakie dane osobowe przetwarza IS Fleet — system zarządzania flotą, na który składają się aplikacja internetowa oraz aplikacje mobilne IS Driver i IS Manager.",
      "IS Fleet to narzędzie dla firm. Konta zakłada firma transportowa dla swoich pracowników; kierowcy nie mogą rejestrować się samodzielnie.",
    ],
    sections: [
      {
        heading: "1. Kto odpowiada za Twoje dane",
        paragraphs: [
          "Administratorem danych jest Dmytro Chaika — osoba fizyczna, która rozwija i utrzymuje IS Fleet. Adres do korespondencji: ul. Zawidowska 11/4, Wrocław, Polska.",
          "W sprawach dotyczących przetwarzania danych pisz na isfleet.eu@gmail.com.",
          "W odniesieniu do danych służbowych (trasy, wiadomości, dokumenty) administratorem jest firma transportowa — pracodawca, a Dmytro Chaika działa jako podmiot przetwarzający na jej polecenie.",
        ],
      },
      {
        heading: "2. Jakie dane przetwarzamy",
        paragraphs: ["Zbieramy wyłącznie to, co jest potrzebne do działania usługi:"],
        bullets: [
          "Dane konta: imię i nazwisko, numer telefonu, e-mail, zdjęcie profilowe, język komunikacji i język interfejsu, strefa czasowa.",
          "Dane służbowe: trasy i ich adresy, ciężarówki, przesyłane dokumenty i zdjęcia, komentarze i oceny.",
          "Korespondencja: wiadomości w czatach prywatnych, grupowych i czatach tras wraz z załącznikami.",
          "Dane techniczne: token powiadomień push i typ urządzenia (iOS/Android), status obecności i czas ostatniej aktywności, dzienniki zapytań do serwera.",
          "Dostęp do aparatu i galerii zdjęć jest wymagany tylko wtedy, gdy sam przesyłasz zdjęcie profilowe lub dokument, i służy wyłącznie temu celowi.",
        ],
      },
      {
        heading: "3. Czego NIE zbieramy",
        bullets: [
          "Lokalizacji. Aplikacje nie ustalają ani nie przesyłają Twojego położenia — ani w tle, ani podczas korzystania.",
          "Danych płatniczych. Usługa nie przyjmuje płatności od użytkowników aplikacji.",
          "Identyfikatorów reklamowych. Nie wyświetlamy reklam i nie przekazujemy danych sieciom reklamowym.",
        ],
      },
      {
        heading: "4. W jakim celu i na jakiej podstawie",
        bullets: [
          "Świadczenie usługi — wykonanie umowy z Twoim pracodawcą: uwierzytelnianie, trasy, czat, powiadomienia.",
          "Bezpieczeństwo — prawnie uzasadniony interes: ochrona przed nieuprawnionym dostępem, dzienniki błędów, ograniczanie liczby zapytań.",
          "Komunikacja — prawnie uzasadniony interes: wiadomości serwisowe, np. zaproszenie do systemu lub reset hasła.",
        ],
      },
      {
        heading: "5. Komu przekazujemy dane",
        paragraphs: [
          "W ramach usługi Twoje dane widzą wyłącznie pracownicy Twojej firmy, zgodnie z ich rolą.",
          "Korzystamy z następujących dostawców infrastruktury:",
        ],
        bullets: [
          "Supabase — baza danych i przechowywanie plików.",
          "Render — hosting części serwerowej.",
          "Vercel — hosting aplikacji internetowej.",
          "Twilio — wysyłka SMS z jednorazowym kodem logowania.",
          "Resend — wysyłka wiadomości serwisowych e-mail.",
          "Expo, Google FCM i Apple APNs — dostarczanie powiadomień push.",
          "Sentry — techniczne raporty błędów aplikacji: ślady stosu i adres zapytania. Treść wiadomości, pliki cookie i nagłówki autoryzacji nie są przekazywane.",
        ],
      },
      {
        heading: "6. Jak długo przechowujemy dane",
        paragraphs: [
          "Dane konta przechowujemy, dopóki konto istnieje. Po usunięciu konta dane osobowe są anonimizowane — zob. punkt 8.",
          "Zapisy służbowe (trasy, dokumenty, korespondencja) należą do firmy-pracodawcy i są przechowywane zgodnie z jej polityką oraz przepisami dotyczącymi dokumentacji przewozowej.",
        ],
      },
      {
        heading: "7. Twoje prawa",
        paragraphs: [
          "Jeśli ma do Ciebie zastosowanie RODO, przysługuje Ci prawo dostępu do danych, ich sprostowania, usunięcia, ograniczenia przetwarzania lub sprzeciwu wobec przetwarzania, a także prawo do przenoszenia danych.",
          "Aby skorzystać z tych praw, napisz na isfleet.eu@gmail.com. Masz też prawo wnieść skargę do organu nadzorczego: w Polsce jest to Prezes Urzędu Ochrony Danych Osobowych (UODO), ul. Stawki 2, 00-193 Warszawa. Jeśli mieszkasz w innym kraju UE, możesz złożyć skargę do organu w miejscu zamieszkania.",
        ],
      },
      {
        heading: "8. Usunięcie konta",
        paragraphs: [
          "Konto możesz usunąć samodzielnie: w aplikacji mobilnej — „Ustawienia” → „Usuń konto”, w wersji internetowej — „Ustawienia konta” → menu „⋮” → „Usuń konto”.",
          "Po usunięciu Twoje dane osobowe (imię, telefon, e-mail, zdjęcie) zostają usunięte, a logowanie staje się trwale niemożliwe. Trasy i wiadomości pozostają w historii firmy w formie zanonimizowanej — są zapisami służbowymi pracodawcy.",
          "Szczegółowa instrukcja znajduje się na stronie /delete-account.",
        ],
      },
      {
        heading: "9. Dzieci",
        paragraphs: [
          "Usługa jest przeznaczona wyłącznie dla pracowników firm transportowych i nie jest skierowana do osób poniżej 16. roku życia.",
        ],
      },
      {
        heading: "10. Zmiany",
        paragraphs: [
          "O istotnych zmianach tej polityki poinformujemy w aplikacji lub e-mailem przed ich wejściem w życie.",
        ],
      },
    ],
  },

  terms: {
    title: "Regulamin",
    updated: UPDATED,
    intro: [
      "Niniejszy regulamin określa zasady korzystania z systemu IS Fleet, udostępnianego przez Dmytro Chaikę, osobę fizyczną (dalej — „dostawca”).",
      "Zasady współpracy między dostawcą a firmą-klientem, w tym płatności, mogą zostać określone w odrębnej umowie; niniejszy regulamin dotyczy użytkowników aplikacji.",
    ],
    sections: [
      {
        heading: "1. O usłudze",
        paragraphs: [
          "IS Fleet to system zarządzania flotą: trasy, ciężarówki, dokumenty, wiadomości i powiadomienia dla firm transportowych.",
        ],
      },
      {
        heading: "2. Konta",
        paragraphs: [
          "Konta zakłada firma-pracodawca. Odpowiadasz za zabezpieczenie dostępu do swojego konta i za działania wykonane z jego użyciem.",
          "Kierowca loguje się numerem telefonu i jednorazowym kodem, menedżer — adresem e-mail i hasłem.",
        ],
      },
      {
        heading: "3. Dozwolone korzystanie",
        bullets: [
          "Nie korzystaj z usługi niezgodnie z prawem ani do przesyłania treści bezprawnych.",
          "Nie próbuj uzyskać dostępu do danych innych firm ani obchodzić ograniczeń ról.",
          "Nie zakłócaj działania usługi i nie powoduj nadmiernego obciążenia.",
        ],
      },
      {
        heading: "4. Dane firmy",
        paragraphs: [
          "Treści utworzone w usłudze (trasy, dokumenty, korespondencja) należą do firmy-pracodawcy. Przetwarzanie danych osobowych opisuje Polityka prywatności.",
        ],
      },
      {
        heading: "5. Dostępność i odpowiedzialność",
        paragraphs: [
          "Usługa jest świadczona w stanie „takim, jaki jest”. Dokładamy rozsądnych starań, aby działała bez zakłóceń, ale nie gwarantujemy braku przerw ani błędów.",
          "W zakresie dozwolonym przez prawo dostawca nie ponosi odpowiedzialności za szkody pośrednie, utracone korzyści ani utratę danych.",
        ],
      },
      {
        heading: "6. Zakończenie korzystania",
        paragraphs: [
          "Firma-pracodawca może dezaktywować konto pracownika. Możesz w każdej chwili samodzielnie usunąć swoje konto.",
        ],
      },
      {
        heading: "7. Prawo właściwe",
        paragraphs: [
          "Regulamin podlega prawu polskiemu, a spory rozstrzyga sąd właściwy według prawa polskiego. Nie pozbawia to konsumenta ochrony przyznanej mu przez bezwzględnie obowiązujące przepisy kraju jego zamieszkania. Pytania: isfleet.eu@gmail.com.",
        ],
      },
    ],
  },

  deleteAccount: {
    title: "Usuwanie konta",
    updated: UPDATED,
    intro: [
      "Na tej stronie opisano, jak usunąć konto IS Fleet i co dokładnie dzieje się z danymi. Możesz to zrobić samodzielnie, bez kontaktu z pomocą techniczną.",
    ],
    sections: [
      {
        heading: "W aplikacji mobilnej",
        paragraphs: ["Dotyczy aplikacji IS Driver i IS Manager."],
        bullets: [
          "Otwórz „Ustawienia” (w aplikacji menedżera — „Konto”).",
          "Przewiń stronę na sam dół.",
          "Naciśnij „Usuń konto” pod przyciskiem „Wyloguj się”.",
          "Potwierdź w oknie dialogowym.",
        ],
      },
      {
        heading: "W wersji internetowej",
        bullets: [
          "Kliknij swoje imię na dole menu bocznego i wybierz „Ustawienia konta”.",
          "Otwórz menu „⋮” w nagłówku strony.",
          "Wybierz „Usuń konto” i potwierdź przyciskiem „Usuń trwale”.",
        ],
      },
      {
        heading: "Co zostanie usunięte",
        bullets: [
          "Imię i nazwisko, numer telefonu, e-mail, zdjęcie profilowe.",
          "Hasło i wszystkie aktywne sesje.",
          "Tokeny powiadomień push wszystkich Twoich urządzeń.",
          "Logowanie do konta staje się trwale niemożliwe.",
        ],
      },
      {
        heading: "Co pozostanie",
        paragraphs: [
          "Trasy, dokumenty i wiadomości pozostają w historii Twojej firmy w formie zanonimizowanej: zamiast Twojego imienia wyświetlane jest oznaczenie usuniętego użytkownika.",
          "Są to zapisy służbowe pracodawcy, które ma on obowiązek przechowywać — m.in. na potrzeby sprawozdawczości przewozowej. Nie są już powiązane z Twoimi danymi osobowymi.",
        ],
      },
      {
        heading: "Jeśli nie możesz się zalogować",
        paragraphs: [
          "Jeśli utraciłeś dostęp do konta i nie możesz usunąć go samodzielnie, wyślij prośbę na isfleet.eu@gmail.com z numeru telefonu lub adresu e-mail powiązanego z kontem. Rozpatrzymy ją w ciągu 30 dni.",
        ],
      },
    ],
  },
};

export default pl;
