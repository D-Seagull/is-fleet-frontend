import type { LegalSet } from "../legal";

const UPDATED = "Paskutinį kartą atnaujinta: 2026 m. spalio 9 d.";

const lt: LegalSet = {
  privacy: {
    title: "Privatumo politika",
    updated: UPDATED,
    intro: [
      "Ši politika paaiškina, kokius asmens duomenis tvarko IS Fleet — transporto parko valdymo sistema, kurią sudaro žiniatinklio programa ir mobiliosios programėlės IS Driver bei IS Manager.",
      "IS Fleet — tai įrankis verslui. Paskyras savo darbuotojams sukuria transporto įmonė; vairuotojai negali užsiregistruoti patys.",
    ],
    sections: [
      {
        heading: "1. Kas atsako už jūsų duomenis",
        paragraphs: [
          "Duomenų valdytojas yra Dmytro Chaika — fizinis asmuo, kuris kuria ir prižiūri IS Fleet. Korespondencijos adresas: ul. Zawidowska 11/4, Vroclavas, Lenkija.",
          "Visais duomenų tvarkymo klausimais rašykite adresu isfleet.eu@gmail.com.",
          "Atkreipkite dėmesį: darbo duomenų (reisų, žinučių, dokumentų) valdytojas yra transporto įmonė — darbdavys, o Dmytro Chaika veikia kaip duomenų tvarkytojas pagal jos nurodymus.",
        ],
      },
      {
        heading: "2. Kokius duomenis tvarkome",
        paragraphs: ["Renkame tik tai, ko reikia paslaugai veikti:"],
        bullets: [
          "Paskyros duomenys: vardas ir pavardė, telefono numeris, el. paštas, profilio nuotrauka, bendravimo ir sąsajos kalba, laiko juosta.",
          "Darbo duomenys: reisai ir jų adresai, sunkvežimiai, jūsų įkeliami dokumentai ir nuotraukos, komentarai ir įvertinimai.",
          "Susirašinėjimas: asmeninių, grupinių ir reisų pokalbių žinutės kartu su priedais.",
          "Techniniai duomenys: tiesioginių (push) pranešimų žetonas ir įrenginio tipas (iOS/Android), buvimo būsena ir paskutinio aktyvumo laikas, serverio užklausų žurnalai.",
          "Prieiga prie kameros ir nuotraukų galerijos prašoma tik tada, kai patys įkeliate profilio nuotrauką ar dokumentą, ir naudojama tik tam.",
        ],
      },
      {
        heading: "3. Ko NErenkame",
        bullets: [
          "Buvimo vietos. Programėlės nenustato ir neperduoda jūsų buvimo vietos — nei fone, nei naudojimo metu.",
          "Mokėjimo duomenų. Paslauga nepriima mokėjimų iš programėlės naudotojų.",
          "Reklaminių identifikatorių. Nerodome reklamos ir neperduodame duomenų reklamos tinklams.",
        ],
      },
      {
        heading: "4. Kokiu tikslu ir kokiu pagrindu",
        bullets: [
          "Paslaugos teikimas — sutarties su jūsų darbdaviu vykdymas: autentifikavimas, reisai, pokalbiai, pranešimai.",
          "Saugumas — teisėtas interesas: apsauga nuo neteisėtos prieigos, klaidų žurnalai, užklausų dažnio ribojimas.",
          "Ryšys — teisėtas interesas: tarnybiniai laiškai, pavyzdžiui, kvietimas į sistemą ar slaptažodžio atkūrimas.",
        ],
      },
      {
        heading: "5. Kam perduodami duomenys",
        paragraphs: [
          "Paslaugoje jūsų duomenis mato tik jūsų įmonės darbuotojai, atsižvelgiant į jų vaidmenį.",
          "Naudojamės šiais infrastruktūros paslaugų teikėjais:",
        ],
        bullets: [
          "Supabase — duomenų bazė ir failų saugykla.",
          "Render — serverinės dalies talpinimas.",
          "Vercel — žiniatinklio programos talpinimas.",
          "Twilio — SMS su vienkartiniu prisijungimo kodu siuntimas.",
          "Resend — tarnybinių el. laiškų siuntimas.",
          "Expo, Google FCM ir Apple APNs — tiesioginių (push) pranešimų pristatymas.",
          "Sentry — techninės programos klaidų ataskaitos: dėklo pėdsakai ir užklausos adresas. Žinučių turinys, slapukai ir autorizacijos antraštės neperduodami.",
        ],
      },
      {
        heading: "6. Kiek laiko saugome",
        paragraphs: [
          "Paskyros duomenys saugomi tol, kol paskyra egzistuoja. Ištrynus paskyrą asmens duomenys nuasmeninami — žr. 8 skyrių.",
          "Darbo įrašai (reisai, dokumentai, susirašinėjimas) priklauso įmonei-darbdaviui ir saugomi pagal jos politiką bei transporto dokumentų saugojimo reikalavimus.",
        ],
      },
      {
        heading: "7. Jūsų teisės",
        paragraphs: [
          "Jei jums taikomas BDAR, turite teisę susipažinti su savo duomenimis, juos ištaisyti, ištrinti, apriboti jų tvarkymą ar nesutikti su juo, taip pat teisę į duomenų perkeliamumą.",
          "Norėdami pasinaudoti šiomis teisėmis, rašykite adresu isfleet.eu@gmail.com. Taip pat turite teisę pateikti skundą priežiūros institucijai: Lenkijoje tai Asmens duomenų apsaugos tarnybos pirmininkas (Prezes UODO), ul. Stawki 2, 00-193 Varšuva. Jei gyvenate kitoje ES šalyje, skundą galite pateikti savo gyvenamosios vietos institucijai.",
        ],
      },
      {
        heading: "8. Paskyros ištrynimas",
        paragraphs: [
          "Paskyrą galite ištrinti patys: mobiliojoje programėlėje — „Nustatymai“ → „Ištrinti paskyrą“, žiniatinklio versijoje — „Paskyros nustatymai“ → meniu „⋮“ → „Ištrinti paskyrą“.",
          "Ištrynus paskyrą jūsų asmens duomenys (vardas, telefonas, el. paštas, nuotrauka) ištrinami, o prisijungti tampa neįmanoma visam laikui. Reisai ir žinutės lieka įmonės istorijoje nuasmeninti — tai darbdavio darbo įrašai.",
          "Išsami instrukcija — puslapyje /delete-account.",
        ],
      },
      {
        heading: "9. Vaikai",
        paragraphs: [
          "Paslauga skirta tik transporto įmonių darbuotojams ir nėra skirta jaunesniems nei 16 metų asmenims.",
        ],
      },
      {
        heading: "10. Pakeitimai",
        paragraphs: [
          "Apie esminius šios politikos pakeitimus pranešime programėlėje arba el. paštu prieš jiems įsigaliojant.",
        ],
      },
    ],
  },

  terms: {
    title: "Naudojimo sąlygos",
    updated: UPDATED,
    intro: [
      "Šios sąlygos reglamentuoja naudojimąsi sistema IS Fleet, kurią teikia fizinis asmuo Dmytro Chaika (toliau — „teikėjas“).",
      "Teikėjo ir įmonės-kliento bendradarbiavimo sąlygos, įskaitant mokėjimus, gali būti nustatytos atskiru susitarimu; šios sąlygos taikomos programėlių naudotojams.",
    ],
    sections: [
      {
        heading: "1. Apie paslaugą",
        paragraphs: [
          "IS Fleet — transporto parko valdymo sistema: reisai, sunkvežimiai, dokumentai, žinutės ir pranešimai transporto įmonėms.",
        ],
      },
      {
        heading: "2. Paskyros",
        paragraphs: [
          "Paskyras sukuria įmonė-darbdavys. Jūs atsakote už prieigos prie savo paskyros apsaugą ir už veiksmus, atliktus naudojant jūsų paskyrą.",
          "Vairuotojas prisijungia telefono numeriu ir vienkartiniu kodu, vadybininkas — el. paštu ir slaptažodžiu.",
        ],
      },
      {
        heading: "3. Leistinas naudojimas",
        bullets: [
          "Nenaudokite paslaugos neteisėtai ar neteisėtam turiniui perduoti.",
          "Nebandykite pasiekti kitų įmonių duomenų ar apeiti vaidmenų apribojimų.",
          "Netrukdykite paslaugos veikimui ir nesukelkite pernelyg didelės apkrovos.",
        ],
      },
      {
        heading: "4. Įmonės duomenys",
        paragraphs: [
          "Paslaugoje sukurtas turinys (reisai, dokumentai, susirašinėjimas) priklauso įmonei-darbdaviui. Asmens duomenų tvarkymas aprašytas Privatumo politikoje.",
        ],
      },
      {
        heading: "5. Prieinamumas ir atsakomybė",
        paragraphs: [
          "Paslauga teikiama „tokia, kokia yra“. Dedame protingas pastangas, kad ji veiktų nepertraukiamai, tačiau negarantuojame, kad nebus pertrūkių ar klaidų.",
          "Kiek leidžia įstatymai, teikėjas neatsako už netiesioginę žalą, prarastą pelną ar duomenų praradimą.",
        ],
      },
      {
        heading: "6. Naudojimosi nutraukimas",
        paragraphs: [
          "Įmonė-darbdavys gali deaktyvuoti darbuotojo paskyrą. Savo paskyrą galite bet kada ištrinti patys.",
        ],
      },
      {
        heading: "7. Taikytina teisė",
        paragraphs: [
          "Šioms sąlygoms taikoma Lenkijos teisė, o ginčus nagrinėja pagal Lenkijos teisę kompetentingas teismas. Tai neatima iš vartotojo apsaugos, kurią suteikia imperatyviosios jo gyvenamosios šalies teisės normos. Klausimai: isfleet.eu@gmail.com.",
        ],
      },
    ],
  },

  deleteAccount: {
    title: "Paskyros ištrynimas",
    updated: UPDATED,
    intro: [
      "Šiame puslapyje aprašyta, kaip ištrinti IS Fleet paskyrą ir kas tiksliai nutinka su duomenimis. Tai galite padaryti patys, nesikreipdami į pagalbos tarnybą.",
    ],
    sections: [
      {
        heading: "Mobiliojoje programėlėje",
        paragraphs: ["Taikoma programėlėms IS Driver ir IS Manager."],
        bullets: [
          "Atverkite „Nustatymai“ (vadybininko programėlėje — „Paskyra“).",
          "Slinkite puslapį iki pat apačios.",
          "Spustelėkite „Ištrinti paskyrą“ po mygtuku „Atsijungti“.",
          "Patvirtinkite dialogo lange.",
        ],
      },
      {
        heading: "Žiniatinklio versijoje",
        bullets: [
          "Spustelėkite savo vardą šoninio meniu apačioje ir pasirinkite „Paskyros nustatymai“.",
          "Atverkite meniu „⋮“ puslapio antraštėje.",
          "Pasirinkite „Ištrinti paskyrą“ ir patvirtinkite mygtuku „Ištrinti visam laikui“.",
        ],
      },
      {
        heading: "Kas bus ištrinta",
        bullets: [
          "Vardas ir pavardė, telefono numeris, el. paštas, profilio nuotrauka.",
          "Slaptažodis ir visos aktyvios sesijos.",
          "Visų jūsų įrenginių tiesioginių (push) pranešimų žetonai.",
          "Prisijungti prie paskyros tampa neįmanoma visam laikui.",
        ],
      },
      {
        heading: "Kas liks",
        paragraphs: [
          "Reisai, dokumentai ir žinutės lieka jūsų įmonės istorijoje nuasmeninti: vietoje jūsų vardo rodoma ištrinto naudotojo žymė.",
          "Tai darbdavio darbo įrašai, kuriuos jis privalo saugoti — be kita ko, transporto ataskaitoms. Jie nebėra susieti su jūsų asmens duomenimis.",
        ],
      },
      {
        heading: "Jei nepavyksta prisijungti",
        paragraphs: [
          "Jei praradote prieigą prie paskyros ir negalite jos ištrinti patys, išsiųskite prašymą adresu isfleet.eu@gmail.com iš su paskyra susieto telefono numerio arba el. pašto. Prašymą išnagrinėsime per 30 dienų.",
        ],
      },
    ],
  },
};

export default lt;
