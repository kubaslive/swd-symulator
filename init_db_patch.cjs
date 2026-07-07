const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

const defaultSetup = `
      // Domyślne Jednostki i Pojazdy dla nowego tenantu - układ SWD 1:1 z Gorzowa
      const defaultJrgUnits = ["JRG nr 1", "JRG nr 2", "JRG Kostrzyn"];
      const defaultOspUnits = ["OSP 1", "OSP 2", "OSP 3"];
      
      const createVeh = (unit, name, obsada = 6) => ({
        id: \`\${unit}|\${name}|\${Date.now()}\${Math.floor(Math.random()*1000)}\`,
        name: name,
        obsada: obsada
      });

      const defaultVehicles = {
        "KM/KP PSP": [
          createVeh("KM/KP PSP", "SLOp FIAT", 5),
          createVeh("KM/KP PSP", "SLOp POLONEZ", 5),
          createVeh("KM/KP PSP", "SLOp SKODA", 5),
          createVeh("KM/KP PSP", "SLOp VOLKSWAGEN", 5)
        ],
        "JRG nr 1": [
          createVeh("JRG nr 1", "GLBA 0,7/20 MIECO", 6),
          createVeh("JRG nr 1", "GBA 2/30 RENAULT", 6),
          createVeh("JRG nr 1", "GCBA 3/60 MERCEDES", 6),
          createVeh("JRG nr 1", "SCRd MAN", 4),
          createVeh("JRG nr 1", "SCD 37 IVECO", 3),
          createVeh("JRG nr 1", "GLB 1 IVECO", 6),
          createVeh("JRG nr 1", "GCBM 20/8 RENAULT", 2),
          createVeh("JRG nr 1", "GPr 1500 STAR", 3),
          createVeh("JRG nr 1", "SW 3000/0 STAR", 3),
          createVeh("JRG nr 1", "SLOp OPEL", 5),
          createVeh("JRG nr 1", "SLKw MERCEDES", 3),
          createVeh("JRG nr 1", "SLOp MERCEDES", 5)
        ],
        "JRG nr 2": [
          createVeh("JRG nr 2", "GBA 2/20 STAR", 6),
          createVeh("JRG nr 2", "SRChem STAR", 4),
          createVeh("JRG nr 2", "GCBA 8/42 IVECO", 3),
          createVeh("JRG nr 2", "SLOp POLONEZ", 5),
          createVeh("JRG nr 2", "SLOp LUBLIN", 5),
          createVeh("JRG nr 2", "SLOp MERCEDES", 5),
          createVeh("JRG nr 2", "SH 25 MAN", 3)
        ],
        "JRG Kostrzyn": [
          createVeh("JRG Kostrzyn", "GLB 1/2,5 MITSUBISHI", 6),
          createVeh("JRG Kostrzyn", "GBA 2,5/16 STAR", 6),
          createVeh("JRG Kostrzyn", "GCBA 5/24 JELCZ", 6),
          createVeh("JRG Kostrzyn", "SLOp FIAT", 5),
          createVeh("JRG Kostrzyn", "SRw IVECO", 4),
          createVeh("JRG Kostrzyn", "SLOp TARPAN", 5),
          createVeh("JRG Kostrzyn", "SH 25 MAN", 3)
        ]
      };

      batch.set(doc(db, 'tenants', uid), {
        name: cityName.trim(),
        streets: streets,
        vehicles: defaultVehicles,
        jrgUnits: defaultJrgUnits,
        ospUnits: defaultOspUnits,
        createdAt: serverTimestamp()
      });
`;

content = content.replace(
  /      batch\.set\(doc\(db, 'tenants', uid\), \{\n\s*name: cityName\.trim\(\),\n\s*streets: streets,\n\s*createdAt: serverTimestamp\(\)\n\s*\}\);/,
  defaultSetup.trim()
);

fs.writeFileSync('src/App.jsx', content);
console.log('handleRegister updated with default SWD units and vehicles');
