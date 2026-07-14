export const DEFAULT_SCENARIOS = [
  {
    type: "pozar",
    locType: "apartment",
    t: "[CPR] Zgłaszający informuje o gęstym zadymieniu na klatce schodowej i wyczuwalnym zapachu spalenizny. Brak pewności z którego mieszkania. Brak informacji o ewakuacji.",
    k: "SKKP z miejsca. Potwierdzam pożar mieszkania na 3 piętrze. Rozwijamy linie gaśniczą, rota w aparatach ODO wchodzi do natarcia. Proszę o zadysponowanie ZRM oraz Pogotowia Energetycznego.",
    requiredUnits: { "GBA": 1, "SD": 1 },
    zrm: true,
    pol: true,
    updates: [
      { delay: 120, msg: "SKKP z miejsca! Ogień wychodzi na elewację! Potrzebujemy pilnie dodatkowych sił do podania prądów z zewnątrz. Dysponuj drabinę i ciężki wóz!", requiredUnits: { "GBA": 1, "GCBA": 1, "SD": 2 } },
      { delay: 300, msg: "KDR: Pożar opanowany, trwa oddymianie i sprawdzanie kamerą termowizyjną." }
    ]
  },
  {
    type: "pozar",
    locType: "building",
    t: "[CPR] Otrzymano formatkę. Zgłoszenie pożaru poszycia dachu budynku jednorodzinnego. Widoczne płomienie, wszyscy mieszkańcy opuścili budynek.",
    k: "SKKP z miejsca. Pożar rozwinięty poddasza i dachu. Podajemy dwa prądy wody w natarciu. Dysponuj dodatkowe GCBA z powodu braku hydrantów w okolicy.",
    requiredUnits: { "GBA": 1, "GCBA": 1 },
    zrm: false,
    pol: true,
    updates: [
      { delay: 180, msg: "KDR: Brak zaopatrzenia wodnego, prosimy o zadysponowanie magistrali wężowej i dwóch ciężkich wozów do dowożenia!", requiredUnits: { "GBA": 1, "GCBA": 3 } },
      { delay: 360, msg: "KDR: Wprowadzono ratowników w ODO do wewnątrz. Trwają prace rozbiórkowe pokrycia dachowego." }
    ]
  },
  {
    type: "mz",
    locType: "intersection",
    t: "[CPR] Wypadek komunikacyjny. Zderzenie czołowe dwóch samochodów osobowych. Dwie osoby poszkodowane, jedna zakleszczona. Droga całkowicie zablokowana.",
    k: "SKKP z miejsca. Zderzenie dwóch aut, droga zablokowana. Przystępujemy do wykonywania dostępu za pomocą narzędzi hydraulicznych. ZRM i Policja na miejscu.",
    requiredUnits: { "GBA": 1, "SLRt": 1 },
    zrm: true,
    pol: true,
    updates: [
      { delay: 150, msg: "KDR: Drugi kierowca traci przytomność. Potrzebujemy dodatkowego ZRM lub dysponuj śmigłowiec LPR!" },
      { delay: 300, msg: "KDR: Dostęp do poszkodowanego wykonany, osoba ewakuowana i przekazana ZRM." }
    ]
  },
  {
    type: "mz",
    locType: "road",
    t: "[CPR] Zgłoszenie o plamie substancji ropopochodnej na jezdni. Plama ma długość około 100 metrów, stanowi zagrożenie w ruchu drogowym.",
    k: "SKKP z miejsca. Potwierdzam plamę oleju na jednym pasie jezdni, długość ok. 150m. Przystępujemy do neutralizacji sorbentem. Ruch odbywa się wahadłowo.",
    requiredUnits: { "GBA": 1 },
    zrm: false,
    pol: true,
    updates: [
      { delay: 200, msg: "KDR: Sytuacja opanowana, jezdnia zmyta jednym prądem wody." }
    ]
  },
  {
    type: "pozar",
    locType: "forest",
    t: "[CPR] Informacja z Lasów Państwowych z wieży obserwacyjnej. Widoczny dym nad kompleksem leśnym. Brak dokładnej lokalizacji, dojazd od głównej drogi.",
    k: "SKKP z miejsca. Pożar poszycia leśnego na powierzchni ok. 10 arów. Brak zagrożenia dla budynków. Podajemy prądy wody w natarciu. Dysponuj dodatkowe GCBA do zasilania.",
    requiredUnits: { "GBA": 1, "GCBA": 1 },
    zrm: false,
    pol: false,
    updates: [
      { delay: 240, msg: "SKKP, wiatr gwałtownie zmienia kierunek, front pożaru wynosi już 30 arów! Potrzebujemy kolejnych dwóch GCBA!", requiredUnits: { "GBA": 1, "GCBA": 3 } },
      { delay: 500, msg: "KDR: Pożar zlokalizowany, trwa dogaszanie zarzewi ognia i przelewanie pogorzeliska." }
    ]
  },
  {
    type: "af",
    locType: "public",
    t: "[CPR] Zgłoszenie z monitoringu pożarowego (AFM). Otrzymano sygnał pożaru z pierwszej strefy czujek na parterze obiektu.",
    k: "SKKP z miejsca. Po rozpoznaniu obiektu z zarządcą stwierdzam alarm fałszywy - zadziałanie czujki z powodu prac remontowych (zapylenie). System zresetowany.",
    requiredUnits: { "GBA": 1 },
    zrm: false,
    pol: false,
    updates: []
  },
  {
    type: "mz",
    locType: "building",
    t: "[CPR] Osoba zgłaszająca informuje, że od 3 dni nie ma kontaktu z sąsiadką w podeszłym wieku. Drzwi zamknięte od wewnątrz, klucz w zamku. Prośba Policji o pomoc w otwarciu mieszkania.",
    k: "SKKP z miejsca. Policja na miejscu. Przystępujemy do siłowego otwarcia drzwi przy użyciu narzędzi wyburzeniowych (halligan).",
    requiredUnits: { "GBA": 1 },
    zrm: true,
    pol: true,
    updates: [
      { delay: 180, msg: "KDR: Mieszkanie otwarte. Osoba poszkodowana przytomna na podłodze, ZRM przejmuje." }
    ]
  }
];
