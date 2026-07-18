import React from 'react';
import { renderToString } from 'react-dom/server';
import SisEditor from './src/SisEditor';

try {
  const html = renderToString(
    <SisEditor 
      db={{}} 
      userProfile={{tenantId: 'Test'}} 
      onClose={() => {}} 
      tenantJrgUnits={['JRG 1']} 
      tenantOspUnits={['OSP Test']} 
      tenantVehicles={{}} 
      tenantUnitCoordinates={{}} 
    />
  );
  console.log("Rendered successfully:", html.substring(0, 100));
} catch (e) {
  console.error("Crash during render:", e);
}
