const fs = require('fs');
const path = require('path');

const newScenarios = `export const DEFAULT_SCENARIOS = [
  // POŻARY (pozar)
  {
    type: "pozar", locType: "apartment",
    t: "Formatka WCPR: Osoba zgłaszająca (sąsiad z naprzeciwka) widzi gęsty, czarny dym wydobywający się spod drzwi mieszkania nr 12 na 3 piętrze. Wyczuwalny silny zapach palonego plastiku. Brak kontaktu z lokatorami.",
    k: "SKKP z miejsca. Potwierdzam rozwinięty pożar mieszkania na 3 kondygnacji. Klatka schodowa silnie zadymiona. Rozwijamy linię główną, rota w aparatach ODO wchodzi do natarcia i przeszukania. Dysponuj ZRM i Pogotowie Energetyczne.",
    requiredUnits: { "GBA": 1, "SD": 1 }, zrm: true, pol: true,
    updates: [
      { delay: 180, msg: "KDR: Z mieszkania ewakuowano jedną osobę nieprzytomną, przekazana obecnemu na miejscu ZRM. Trwa dogaszanie wyposażenia i oddymianie klatki schodowej." }
    ]
  },
  {
    type: "pozar", locType: "building",
    t: "Formatka WCPR: Zgłoszenie o pożarze poszycia dachu na budynku wielorodzinnym. Widoczne otwarte płomienie wychodzące przez świetliki. Część mieszkańców ewakuuje się samoczynnie.",
    k: "SKKP z miejsca. Pożar rozwinięty konstrukcji dachu. Ze względu na gęstą zabudowę istnieje duże prawdopodobieństwo przeniesienia się ognia na budynek sąsiedni. Podajemy prądy wody w natarciu z drabin mechanicznych i w obronie na sąsiedni dach. Dysponuj pluton gaśniczy!",
    requiredUnits: { "GBA": 2, "GCBA": 1, "SD": 2 }, zrm: false, pol: true,
    updates: [
      { delay: 240, msg: "KDR: Wprowadzono roty do wewnątrz, prowadzone są prace rozbiórkowe poszycia dachowego. Zlokalizowano główne zarzewia ognia, brak zagrożenia dla budynków przyległych." },
      { delay: 480, msg: "KDR: Pożar opanowany, trwa przelewanie i sprawdzanie konstrukcji kamerą termowizyjną." }
    ]
  },
  {
    type: "pozar", locType: "industry",
    t: "Formatka WCPR: Zgłoszenie z zakładu obróbki drewna. Pożar w silosie z trocinami. W systemie sygnalizacji włączył się alarm 2 stopnia, dym rozprzestrzenia się na halę produkcyjną.",
    k: "SKKP z miejsca. Potwierdzam pożar silosu trocinowego. Odłączono zasilanie obiektu. Przystępujemy do podawania prądów piany średniej przez luki rewizyjne do wnętrza silosu. Dysponuj GCBA do zasilania oraz SD do działań z góry.",
    requiredUnits: { "GBA": 2, "GCBA": 2, "SD": 1 }, zrm: false, pol: true,
    updates: [
      { delay: 300, msg: "KDR: Trwa powolne opróżnianie silosu i przelewanie tlącego się materiału. Sytuacja pod kontrolą, brak osób poszkodowanych." }
    ]
  },
  {
    type: "pozar", locType: "car",
    t: "Formatka WCPR: Rozwinięty pożar samochodu osobowego w garażu podziemnym galerii handlowej. Gęste zadymienie, włączyła się dźwiękowa ewakuacja i tryskacze.",
    k: "SKKP z miejsca. Pożar komory silnika i kabiny pojazdu w kondygnacji -1. Instalacja tryskaczowa zapobiegła rozprzestrzenieniu się ognia. Podajemy prąd piany ciężkiej w natarciu. Uruchomiono oddymianie mechaniczne galerii.",
    requiredUnits: { "GBA": 2 }, zrm: false, pol: true,
    updates: [
      { delay: 150, msg: "KDR: Pożar ugaszony. Rozstawiono dodatkowe wentylatory oddymiające w celu usunięcia gazów pożarowych. Ewakuowano ok. 500 osób, brak rannych." }
    ]
  },
  {
    type: "pozar", locType: "forest",
    t: "Formatka WCPR: Zgłoszenie od leśniczego - pożar w oddziale leśnym. Pali się około 20 arów poszycia zarośli i młodnika, silny wiatr powoduje szybki rozwój pożaru.",
    k: "SKKP z miejsca. Potwierdzam pożar poszycia leśnego, front pożaru wynosi ok. 100 metrów. Teren trudno dostępny, brak wodociągów w pobliżu. Przystępujemy do natarcia z kilku stron przy użyciu sprzętu burzącego i tłumic. Proszę dysponować 3 ciężkie wozy gaśnicze do zasilania!",
    requiredUnits: { "GBA": 1, "GCBA": 3 }, zrm: false, pol: false,
    updates: [
      { delay: 360, msg: "SKKP, zadysponuj samolot dromader z Lasów Państwowych w celu wykonania zrzutów na główny front! Rozciągamy magistralę zasilającą." },
      { delay: 720, msg: "KDR: Pożar zlokalizowany na powierzchni ok. 1.5 hektara. Trwa dogaszanie, działania mogą potrwać jeszcze kilka godzin." }
    ]
  },

  // MIEJSCOWE ZAGROŻENIA (mz)
  {
    type: "mz", locType: "intersection",
    t: "Formatka WCPR: Wypadek komunikacyjny masowy. Autobus miejski zderzył się z samochodem ciężarowym (HGV). Około 15-20 osób poszkodowanych wewnątrz autobusu, kierowca ciężarówki zakleszczony w kabinie. Wyciek płynów eksploatacyjnych.",
    k: "SKKP z miejsca! Zderzenie autobusu z ciągnikiem siodłowym. Potwierdzam zdarzenie masowe, duża liczba osób z lekkimi i średnimi obrażeniami. Kierowca TIR-a uwięziony, robimy dostęp sprzętem hydraulicznym. Ogłaszam Triage. Wymagam na miejscu min. 5 ZRM, LPR oraz dodatkowych wozów gaśniczych!",
    requiredUnits: { "GBA": 2, "SLRt": 1, "GCBA": 1 }, zrm: true, pol: true, requiredSgr: "SGRT",
    updates: [
      { delay: 180, msg: "KDR: Na miejscu działa 5 rot. Trwa selekcja medyczna (Triage). Wydobyto kierowcę ciężarówki, przekazany ZRM w kodzie czerwonym." },
      { delay: 420, msg: "KDR: Ewakuowano wszystkich poszkodowanych z autobusu do punktu medycznego (namiot pneumatyczny). Na miejscu koordynator medyczny." }
    ]
  },
  {
    type: "mz", locType: "industry",
    t: "Formatka WCPR: Zgłoszenie z oczyszczalni ścieków. Operator zszedł do studzienki zbiorczej (ok. 5 metrów głębokości) i zasłabł. Drugi pracownik próbował mu pomóc i stracił przytomność. Prawdopodobnie wysokie stężenie siarkowodoru.",
    k: "SKKP z miejsca. Dwie osoby poszkodowane na dnie studni technologicznej. Mierniki wielogazowe wyją (przekroczone NDN). Ratownicy w aparatach ODO przygotowują się do zjazdu z wykorzystaniem trójnogu ratowniczego. Proszę o pilne zadysponowanie grupy SGRW do asekuracji z powietrza!",
    requiredUnits: { "GBA": 1, "SLKw": 1 }, zrm: true, pol: true, requiredSgr: "SGRW",
    updates: [
      { delay: 150, msg: "KDR: Obaj poszkodowani wydobyci na powierzchnię przy użyciu układów wyciągowych. Przekazani ZRM, trwa zaawansowana resuscytacja. Komory przewietrzane nadciśnieniowo." }
    ]
  },
  {
    type: "mz", locType: "road",
    t: "Formatka WCPR: Kolizja drogowa, pęknięty zbiornik z kwasem azotowym przewożonym na naczepie, intensywnie wydzielają się żółto-brunatne dymy. Wyciek do pobliskiego rowu melioracyjnego.",
    k: "SKKP z miejsca! Potwierdzam wyciek kwasu azotowego z cysterny. Rozstawiamy kurtyny wodne celem zbijania oparów. Zamknięto ruch w promieniu 500m. Zadysponuj natychmiast Specjalistyczną Grupę Ratownictwa Chemiczno-Ekologicznego w celu uszczelnienia wycieku i przepompowania substancji!",
    requiredUnits: { "GBA": 2, "GCBA": 1 }, zrm: true, pol: true, requiredSgr: "SGRChem-Eko",
    updates: [
      { delay: 300, msg: "KDR: Na miejscu działa SGRChem-Eko. Rota w ubraniach gazoszczelnych CGR sprawiła poduszkę uszczelniającą pod cysterną. Wyciek zahamowany." },
      { delay: 600, msg: "KDR: Kwas przepompowany do cysterny zastępczej. Rozlewisko neutralizowane mlekiem wapiennym." }
    ]
  },
  {
    type: "mz", locType: "apartment",
    t: "Formatka WCPR: Zatrucie tlenkiem węgla w łazience (piecyk gazowy). Matka znalazła nastoletniego syna nieprzytomnego w wannie. ZRM jest w drodze.",
    k: "SKKP z miejsca. Obecni na miejscu przed ZRM. Przewietrzamy pomieszczenie. Poszkodowany wyciągnięty z wanny, ułożony w pozycji bezpiecznej, tlenoterapia 100%. Pomiary CO wskazują 450 ppm. ",
    requiredUnits: { "GBA": 1 }, zrm: true, pol: true,
    updates: [
      { delay: 120, msg: "KDR: Poszkodowany odzyskuje przytomność, ZRM przejmuje medyczne działania ratunkowe. Wyłączono z eksploatacji piecyk gazowy (plomba nałożona przez pogotowie gazowe)." }
    ]
  },
  {
    type: "mz", locType: "water",
    t: "Formatka WCPR: Świadkowie informują, że łódka wędkarska wywróciła się na środku jeziora. Dwie osoby znalazły się w wodzie, krzyczą o pomoc, nie mają kapoków. Odległość od brzegu to około 200m.",
    k: "SKKP z miejsca. Dwie osoby widoczne w wodzie, trzymają się wywróconej łódki. Wodujemy łódź ratowniczą i sanie lodowe/wodowanie z użyciem sań wodnych. Zadysponuj Specjalistyczną Grupę Ratownictwa Wodno-Nurkowego do zabezpieczenia i ewentualnych poszukiwań jeśli osoby zatoną przed dotarciem łodzi!",
    requiredUnits: { "GBA": 1, "SRw": 1, "SLRr": 1 }, zrm: true, pol: true, requiredSgr: "SGRN",
    updates: [
      { delay: 180, msg: "KDR: Obie osoby podjęte z wody na łódź ratowniczą. Wyziębione, ale przytomne. Transportujemy na brzeg do ZRM." }
    ]
  },
  {
    type: "mz", locType: "building",
    t: "Formatka WCPR: Wybuch butli z gazem propan-butan w budynku mieszkalnym wielorodzinnym. Poważnie uszkodzona ściana nośna, część budynku się zawaliła. Zgłaszający słyszy krzyki spod gruzów.",
    k: "SKKP z miejsca! Katastrofa budowlana. Częściowe zawalenie kamienicy (ok. 3 piętra uszkodzone). Ewakuowano 15 osób z ocalałej części. Przystępujemy do zabezpieczenia struktury przed dalszymi obwałami. Zgłaszam potrzebę dysponowania Specjalistycznej Grupy Poszukiwawczo-Ratowniczej (SGPR) z psami gruzowiskowymi i geofonami!",
    requiredUnits: { "GBA": 2, "GCBA": 1, "SD": 1, "SCRt": 1 }, zrm: true, pol: true, requiredSgr: "SGPR",
    updates: [
      { delay: 300, msg: "KDR: SGPR na miejscu. Psy podjęły trop w północnej części gruzowiska. Ratownicy ręcznie odgruzowują wytypowany obszar." },
      { delay: 900, msg: "KDR: Spod gruzów wydobyto kobietę z wielonarządowymi urazami, przekazana ZRM. Teren przeszukany całkowicie, psy nie wykazują więcej poszkodowanych." }
    ]
  },
  {
    type: "mz", locType: "public",
    t: "Formatka WCPR: Powalone drzewo zablokowało wejście do przedszkola. Drzewo jest bardzo potężne i opiera się o rynny, pękło u nasady. Bez obrażeń.",
    k: "SKKP z miejsca. Konar drzewa (dąb ok. 80cm średnicy) oparł się o dach przedszkola blokując ewakuację głównym wyjściem. Używamy pilarek łańcuchowych spalinowych do sukcesywnego cięcia od korony drzewa z kosza drabiny mechanicznej.",
    requiredUnits: { "GBA": 1, "SD": 1 }, zrm: false, pol: false,
    updates: [
      { delay: 240, msg: "KDR: Pnie pocięte i usunięte na pobocze. Dzieci bezpieczne, brak zagrożenia mienia." }
    ]
  },
  {
    type: "mz", locType: "elevator",
    t: "Formatka WCPR: Otwarcie mieszkania na prośbę Policji. Podejrzenie zgonu, bardzo nieprzyjemny zapach zza drzwi, w oknie mnóstwo much.",
    k: "SKKP z miejsca. Drzwi wejściowe antywłamaniowe ryglowane. Przystępujemy do wejścia siłowego przez okno na 1. piętrze z wykorzystaniem drabiny D10W i wybijaka do szyb.",
    requiredUnits: { "GBA": 1 }, zrm: true, pol: true,
    updates: [
      { delay: 120, msg: "KDR: Wejście zrealizowane. Wewnątrz zastało ciało w stanie głębokiego rozkładu. Pomieszczenia przewietrzone, działania przekazano Policji (technicy kryminalistyki)." }
    ]
  },
  {
    type: "af", locType: "public",
    t: "Formatka WCPR: Centrum Handlowe - sygnał pożaru z SSP. Pracownicy ochrony sprawdzili system - czujka w kanale wentylacyjnym restauracji. Lekkie zadymienie na poziomie food court.",
    k: "SKKP z miejsca. Ochrona wstrzymała ewakuację po stwierdzeniu braku ognia. Pożar tłuszczu w kratce wentylacyjnej został opanowany przy użyciu gaśnicy F przez personel. System SSP generuje alarm fałszywy z powodu pozostałości zadymienia.",
    requiredUnits: { "GBA": 1 }, zrm: false, pol: false,
    updates: [
      { delay: 90, msg: "KDR: Działania straży zakończone. Obiekt sprawdzony kamerą termowizyjną, przywrócono stan gotowości systemu SSP. Zakwalifikowano jako alarm fałszywy w dobrej wierze." }
    ]
  }
];
`;
fs.writeFileSync(path.join(__dirname, 'src/scenarios.js'), newScenarios, 'utf8');
console.log('Updated scenarios.js');
