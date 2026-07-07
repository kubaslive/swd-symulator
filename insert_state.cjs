const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

const stateBlock = `
  const [tenantStreets, setTenantStreets] = useState([]);
  const [tenantJrgUnits, setTenantJrgUnits] = useState([]);
  const [tenantOspUnits, setTenantOspUnits] = useState([]);
  const [tenantVehicles, setTenantVehicles] = useState({});
  const [tenantMapBases, setTenantMapBases] = useState({});
  const [tenantHydrants, setTenantHydrants] = useState([]);
  const [tenantOdwody, setTenantOdwody] = useState([]);
  const [tenantSpecialists, setTenantSpecialists] = useState([]);
  const [tenantEquipment, setTenantEquipment] = useState({});

  const ALL_UNITS = ["KM/KP PSP", ...tenantJrgUnits, ...tenantOspUnits];
  const JRG_UNITS = tenantJrgUnits.length > 0 ? tenantJrgUnits : ["Brak zdefiniowanych JRG"];
  const OSP_UNITS = tenantOspUnits.length > 0 ? tenantOspUnits : ["Brak zdefiniowanych OSP"];
  const UNIT_VEHICLES = tenantVehicles;
  const MAP_BASES = tenantMapBases;
  const SIMULATED_HYDRANTS = tenantHydrants;
  const SIMULATED_ODWODY = tenantOdwody;
  const SIMULATED_SPECIALISTS = tenantSpecialists;
  const SIMULATED_EQUIPMENT = tenantEquipment;

  const getNearbyHydrants = (locStr) => {
    const coords = getCoordinatesForLocation(locStr);
    return SIMULATED_HYDRANTS.map(h => {
      const dist = Math.round(Math.sqrt(Math.pow(h.x - coords.x, 2) + Math.pow(h.y - coords.y, 2)) * 12);
      return { ...h, distance: dist };
    }).sort((a, b) => a.distance - b.distance).slice(0, 3);
  };
`;

content = content.replace(/function App\(\) \{\n/, `function App() {\n${stateBlock}`);

fs.writeFileSync('src/App.jsx', content);
console.log('State inserted');
