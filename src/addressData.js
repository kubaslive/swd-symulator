export const SILESIA_STREETS = {
  "Katowice": [
    { name: "3 Maja", lat: 50.2587, lon: 19.0175 },
    { name: "Chorzowska", lat: 50.2671, lon: 19.0112 },
    { name: "Francuska", lat: 50.2541, lon: 19.0279 },
    { name: "Jagiellońska", lat: 50.2536, lon: 19.0205 },
    { name: "Sokolska", lat: 50.2629, lon: 19.0163 },
    { name: "Korfantego", lat: 50.2647, lon: 19.0211 },
    { name: "Kościuszki", lat: 50.2514, lon: 19.0132 },
    { name: "Bocheńskiego", lat: 50.2632, lon: 18.9951 },
    { name: "Roździeńskiego", lat: 50.2652, lon: 19.0345 },
    { name: "Warszawska", lat: 50.2583, lon: 19.0264 },
    { name: "Mikołowska", lat: 50.2520, lon: 19.0067 }
  ],
  "Chorzów": [
    { name: "Wolności", lat: 50.2977, lon: 18.9515 },
    { name: "Katowicka", lat: 50.2985, lon: 18.9554 },
    { name: "Strzelców Bytomskich", lat: 50.3012, lon: 18.9412 },
    { name: "Armii Krajowej", lat: 50.2854, lon: 18.9411 },
    { name: "Gałeczki", lat: 50.2845, lon: 18.9514 }
  ],
  "Bytom": [
    { name: "Dworcowa", lat: 50.3475, lon: 18.9192 },
    { name: "Piekarska", lat: 50.3491, lon: 18.9174 },
    { name: "Tarnogórska", lat: 50.3524, lon: 18.9123 },
    { name: "Strzelców Bytomskich", lat: 50.3601, lon: 18.9056 }
  ],
  "Zabrze": [
    { name: "Wolności", lat: 50.3005, lon: 18.7891 },
    { name: "Roosevelta", lat: 50.2954, lon: 18.7753 },
    { name: "De Gaulle'a", lat: 50.3082, lon: 18.7884 },
    { name: "Makoszowska", lat: 50.2814, lon: 18.7812 }
  ],
  "Gliwice": [
    { name: "Zwycięstwa", lat: 50.2974, lon: 18.6751 },
    { name: "Dworcowa", lat: 50.2941, lon: 18.6654 },
    { name: "Toszecka", lat: 50.3112, lon: 18.6541 },
    { name: "Rybnicka", lat: 50.2845, lon: 18.6601 }
  ],
  "Będzin": [
    { name: "Piłsudskiego", lat: 50.3245, lon: 19.1256 },
    { name: "Małobądzka", lat: 50.3101, lon: 19.1354 },
    { name: "Zwycięstwa", lat: 50.3341, lon: 19.1241 }
  ],
  "Sosnowiec": [
    { name: "3 Maja", lat: 50.2785, lon: 19.1264 },
    { name: "Piłsudskiego", lat: 50.2754, lon: 19.1412 },
    { name: "Narutowicza", lat: 50.2814, lon: 19.1561 },
    { name: "Orla", lat: 50.2715, lon: 19.1325 }
  ],
  "Rybnik": [
    { name: "Wodzisławska", lat: 50.0815, lon: 18.5321 },
    { name: "Gliwicka", lat: 50.1054, lon: 18.5412 },
    { name: "Reymonta", lat: 50.0915, lon: 18.5451 }
  ]
};

// Fallback logic to grab any realistic coordinate if city is missing
export const getRandomStreetWithCoords = (city) => {
  const cityStreets = SILESIA_STREETS[city];
  if (cityStreets && cityStreets.length > 0) {
    const s = cityStreets[Math.floor(Math.random() * cityStreets.length)];
    return { name: s.name, lat: s.lat, lon: s.lon, city: city };
  }
  
  // If city not found, pick Katowice as fallback so map works
  const fallback = SILESIA_STREETS["Katowice"];
  const s = fallback[Math.floor(Math.random() * fallback.length)];
  return { name: s.name, lat: s.lat, lon: s.lon, city: city };
};
