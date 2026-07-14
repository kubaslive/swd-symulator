export const DEFAULT_SCENARIOS = [
  {
    type: "pozar",
    locType: "apartment",
    t: "Zgłaszający informuje o gęstym zadymieniu na klatce schodowej i wyczuwalnym zapachu spalenizny. Brak pewności z którego mieszkania. Brak informacji o ewakuacji.",
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
    t: "Otrzymano formatkę. Zgłoszenie pożaru poszycia dachu budynku jednorodzinnego. Widoczne płomienie, wszyscy mieszkańcy opuścili budynek.",
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
    t: "Wypadek komunikacyjny. Zderzenie czołowe dwóch samochodów osobowych. Dwie osoby poszkodowane, jedna zakleszczona. Droga całkowicie zablokowana.",
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
    t: "Zgłoszenie o plamie substancji ropopochodnej na jezdni. Plama ma długość około 100 metrów, stanowi zagrożenie w ruchu drogowym.",
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
    t: "Informacja z Lasów Państwowych z wieży obserwacyjnej. Widoczny dym nad kompleksem leśnym. Brak dokładnej lokalizacji, dojazd od głównej drogi.",
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
    t: "Zgłoszenie z monitoringu pożarowego (AFM). Otrzymano sygnał pożaru z pierwszej strefy czujek na parterze obiektu.",
    k: "SKKP z miejsca. Po rozpoznaniu obiektu z zarządcą stwierdzam alarm fałszywy - zadziałanie czujki z powodu prac remontowych (zapylenie). System zresetowany.",
    requiredUnits: { "GBA": 1 },
    zrm: false,
    pol: false,
    updates: []
  },
  {
    type: "mz",
    locType: "building",
    t: "Osoba zgłaszająca informuje, że od 3 dni nie ma kontaktu z sąsiadką w podeszłym wieku. Drzwi zamknięte od wewnątrz, klucz w zamku. Prośba Policji o pomoc w otwarciu mieszkania.",
    k: "SKKP z miejsca. Policja na miejscu. Przystępujemy do siłowego otwarcia drzwi przy użyciu narzędzi wyburzeniowych.",
    requiredUnits: { "GBA": 1 },
    zrm: true,
    pol: true,
    updates: [
      { delay: 180, msg: "KDR: Mieszkanie otwarte. Osoba poszkodowana przytomna na podłodze, ZRM przejmuje." }
    ]
  },
  {
    type: "mz",
    locType: "public",
    t: "Zgłoszenie o ulatniającym się gazie na klatce schodowej w bloku 4-piętrowym. Mieszkańcy ewakuują się samodzielnie.",
    k: "SKKP z miejsca. Potwierdzam zapach gazu. Mierniki wskazują obecność metanu. Zakręcamy główny zawór, rota w ODO sprawdza mieszkania.",
    requiredUnits: { "GBA": 1, "SLZgaz": 1 },
    zrm: true,
    pol: true,
    updates: [
      { delay: 150, msg: "KDR: Zlokalizowano nieszczelność kuchenki na 2 piętrze. Mieszkanie przewietrzone. Pogotowie gazowe na miejscu." }
    ]
  },
  {
    type: "mz",
    locType: "water",
    t: "Osoba łowiąca ryby zauważyła ciało unoszące się na powierzchni rzeki, około 5 metrów od brzegu.",
    k: "SKKP z miejsca. Potwierdzamy obecność ciała w wodzie. Ratownicy w ubiórkach wypornościowych wodują łódź w celu podjęcia.",
    requiredUnits: { "SLRr": 1, "SRw": 1 },
    zrm: true,
    pol: true,
    updates: [
      { delay: 180, msg: "KDR: Ciało podjęte z wody, przekazane ZRM. Lekarz stwierdził zgon. Dalsze czynności prowadzi Policja." }
    ]
  },
  {
    type: "pozar",
    locType: "industry",
    t: "Zgłoszenie o wybuchu i pożarze na hali produkcyjnej. Wewnątrz mogą znajdować się pracownicy. Płomienie wychodzą przez dach.",
    k: "SKKP z miejsca! Potężny pożar hali magazynowo-produkcyjnej. Żądam natychmiastowego zadysponowania plutonu gaśniczego i grupy chemicznej z powodu składowania rozpuszczalników!",
    requiredUnits: { "GBA": 2, "GCBA": 3, "SD": 1, "SCRchem": 1 },
    zrm: true,
    pol: true,
    updates: [
      { delay: 240, msg: "KDR: Przystępujemy do obrony sąsiedniego budynku biurowego. Podajemy cztery prądy piany ciężkiej na palącą się halę." },
      { delay: 600, msg: "KDR: Pożar opanowany, brak poszkodowanych - wszyscy pracownicy ewakuowani przed naszym przybyciem." }
    ]
  },
  {
    type: "mz",
    locType: "elevator",
    t: "Zgłoszenie z dyspozytorni dźwigów o zablokowanej windzie między piętrami. Wewnątrz uwięzione dwie osoby, w tym jedna z atakiem paniki i dusznościami.",
    k: "SKKP z miejsca. Winda zablokowana pomiędzy 4 a 5 piętrem. Przystępujemy do ręcznego opuszczenia kabiny przy użyciu kluczy systemowych.",
    requiredUnits: { "GBA": 1 },
    zrm: true,
    pol: false,
    updates: [
      { delay: 120, msg: "KDR: Kabina opuszczona na 4 piętro. Drzwi otwarte, osoby ewakuowane, przekazane ZRM." }
    ]
  },
  {
    type: "pozar",
    locType: "car",
    t: "Rozwinięty pożar samochodu osobowego na pasie awaryjnym autostrady. Auto wyposażone w instalację LPG.",
    k: "SKKP z miejsca. Całkowity pożar komory silnika i wnętrza pojazdu. Ruch na autostradzie wstrzymany na czas działań gaśniczych.",
    requiredUnits: { "GBA": 1 },
    zrm: false,
    pol: true,
    updates: [
      { delay: 150, msg: "KDR: Pożar ugaszony, zakręcono butlę LPG. Przywracamy ruch jednym pasem." }
    ]
  },
  {
    type: "mz",
    locType: "weather",
    t: "Silne porywy wiatru powaliły drzewo, które oparło się o linię energetyczną i blokuje przejazd drogą gminną.",
    k: "SKKP z miejsca. Drzewo zawieszone na liniach średniego napięcia. Czekamy na Pogotowie Energetyczne, zabezpieczamy miejsce zdarzenia.",
    requiredUnits: { "GBA": 1, "SD": 1 },
    zrm: false,
    pol: false,
    updates: [
      { delay: 120, msg: "KDR: Zasilanie odłączone. Przystępujemy do cięcia drzewa pilarkami z kosza drabiny mechanicznej." }
    ]
  },
  {
    type: "mz",
    locType: "animal",
    t: "Bocian zaplątał się w sznurki w gnieździe na słupie energetycznym, nie może odlecieć. Zwierzę jest wyczerpane.",
    k: "SKKP z miejsca. Podnosimy kosz podnośnika koszowego, aby uwolnić ptaka. Współpraca ze strażą gminną/ekopatrol.",
    requiredUnits: { "GBA": 1, "SH": 1 },
    zrm: false,
    pol: false,
    updates: [
      { delay: 180, msg: "KDR: Bocian uwolniony, z drobnymi obrażeniami skrzydła przekazany weterynarzowi." }
    ]
  }
];
