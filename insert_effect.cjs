const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

const effectBlock = `
  // Multi-tenant: Listen to Tenant Configuration
  useEffect(() => {
    if (!userProfile || !userProfile.tenantId) return;

    const tenantRef = doc(db, 'tenants', userProfile.tenantId);
    const unsubscribe = onSnapshot(tenantRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setTenantStreets(data.streets || []);
        setTenantJrgUnits(data.jrgUnits || []);
        setTenantOspUnits(data.ospUnits || []);
        setTenantVehicles(data.vehicles || {});
        setTenantMapBases(data.mapBases || {});
        setTenantHydrants(data.hydrants || []);
        setTenantOdwody(data.odwody || []);
        setTenantSpecialists(data.specialists || []);
        setTenantEquipment(data.equipment || {});
      }
    });

    return unsubscribe;
  }, [userProfile]);
`;

content = content.replace(/\/\/ Listen to Incidents\n/, `${effectBlock}\n  // Listen to Incidents\n`);
fs.writeFileSync('src/App.jsx', content);
console.log('Effect inserted');
