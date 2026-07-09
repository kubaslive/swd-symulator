const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Fix Game Mode to create incident directly
const gameModeOld = `        // Add Call to WCPR CPR Queue (collection 'calls')
        const addCall = async () => {
          try {
            await addDoc(collection(db, 'calls'), {
              tenantId: userProfile?.tenantId || '',
              callerName: callerName,
              phone: phone,
              location: location,
              type: type,
              description: text,
              transcript: transcript,
              status: 'pending',
              createdAt: serverTimestamp()
            });
            logAction(\`🚨 Gra: Wylosowano i wysłano nowe zgłoszenie alarmowe CPR!\`);
          } catch(e) {
            console.error("Game generator error:", e);
          }
        };
        addCall();`;
const gameModeNew = `        // Create Incident Directly
        const addIncidentDirectly = async () => {
          try {
            await addDoc(collection(db, 'incidents'), {
              tenantId: userProfile?.tenantId || '',
              type: type,
              status: 'new',
              location: location,
              description: text,
              callerName: callerName,
              callerPhone: \`+48 \${phone}\`,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              isArchived: false,
              vehicles: [],
              vehicleStatuses: {}
            });
            logAction(\`🚨 Gra: Automatycznie utworzono nową formatkę zdarzenia!\`);
          } catch(e) {
            console.error("Game generator error:", e);
          }
        };
        addIncidentDirectly();`;
code = code.replace(gameModeOld, gameModeNew);

// 2. Add KM/KP PSP to SiS left tree
const treeOld = `<div style={{ paddingLeft: '16px' }}>
                {tenantJrgUnits.map(u => (`;
const treeNew = `<div style={{ paddingLeft: '16px' }}>
                {["KM/KP PSP", ...(tenantJrgUnits || [])].map(u => (`;
code = code.replace(treeOld, treeNew);

// 3. Highlight Incident properly
const incidentBgOld = `let rowBg = 'transparent';
                      if (isSelected) rowBg = '#00ff00';
                      else if (isCompleted) rowBg = '#f8f9fa';
                      else if (hasActiveVehicles) rowBg = '#fff5f5'; // Red-tinted for active
                      else if (hasDispatchedVehicles) rowBg = '#fffde7'; // Yellow-tinted for dispatched

                      return (
                        <tr 
                          key={incident.id} 
                          className={\`swd-row \${isSelected ? 'selected' : ''} \${incident.isArchived ? 'archived' : ''} \${incident.type === 'bl' ? 'error-bl' : ''}\`}
                          style={{ 
                            backgroundColor: rowBg,
                            color: isSelected ? '#000000' : 'inherit',`;
const incidentBgNew = `let rowBg = 'transparent';
                      if (isSelected) rowBg = '#005fb8';
                      else if (isCompleted) rowBg = '#f8f9fa';
                      else if (hasActiveVehicles) rowBg = '#fff5f5'; // Red-tinted for active
                      else if (hasDispatchedVehicles) rowBg = '#fffde7'; // Yellow-tinted for dispatched

                      return (
                        <tr 
                          key={incident.id} 
                          className={\`swd-row \${isSelected ? 'selected' : ''} \${incident.isArchived ? 'archived' : ''} \${incident.type === 'bl' ? 'error-bl' : ''}\`}
                          style={{ 
                            backgroundColor: rowBg,
                            color: isSelected ? '#ffffff' : 'inherit',`;
code = code.replace(incidentBgOld, incidentBgNew);

// 4. Update sisNewVehicleForm and Edit Form for kryptonim
const formResetOld = `setSisNewVehicleForm({ name: '', type: 'GBA', obsada: 6, outOfService: false, ksrg: false, notes: '' });`;
const formResetNew = `setSisNewVehicleForm({ name: '', kryptonim: '', type: 'GBA', obsada: 6, outOfService: false, ksrg: false, notes: '' });`;
code = code.replace(formResetOld, formResetNew);

const editSaveOld = `v.id === sisEditingVehicle.id
            ? { ...v, ...sisEditForm, obsada: parseInt(sisEditForm.obsada || 0, 10) }`;
const editSaveNew = `v.id === sisEditingVehicle.id
            ? { ...v, ...sisEditForm, obsada: parseInt(sisEditForm.obsada || 0, 10), kryptonim: sisEditForm.kryptonim || v.kryptonim || '' }`;
code = code.replace(editSaveOld, editSaveNew);

const jsxNewOld = `<div>
                    <label style={{ fontSize: '10px', fontWeight: 'bold' }}>Pojazd / Nr taktyczny:</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="np. GBA 2,5/16"
                      value={sisNewVehicleForm.name}
                      onChange={e => setSisNewVehicleForm(p => ({ ...p, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: 'bold' }}>Typ pojazdu:</label>`;
const jsxNewNew = `<div>
                    <label style={{ fontSize: '10px', fontWeight: 'bold' }}>Pojazd / Nr taktyczny:</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="np. GBA 2,5/16"
                      value={sisNewVehicleForm.name}
                      onChange={e => setSisNewVehicleForm(p => ({ ...p, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: 'bold' }}>Kryptonim:</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="np. KF 301-21"
                      value={sisNewVehicleForm.kryptonim || ''}
                      onChange={e => setSisNewVehicleForm(p => ({ ...p, kryptonim: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: 'bold' }}>Typ pojazdu:</label>`;
code = code.replace(jsxNewOld, jsxNewNew);

const editInputOld = `<td style={tdStyle}>
                              <input
                                type="text"
                                className="input-field"
                                value={sisEditForm.name || ''}
                                onChange={e => setSisEditForm(p => ({ ...p, name: e.target.value }))}
                                style={{ fontSize: '10px', width: '100%' }}
                              />
                            </td>
                            <td style={tdStyle}>
                              <select`;
const editInputNew = `<td style={tdStyle}>
                              <input
                                type="text"
                                className="input-field"
                                value={sisEditForm.name || ''}
                                onChange={e => setSisEditForm(p => ({ ...p, name: e.target.value }))}
                                style={{ fontSize: '10px', width: '100%' }}
                              />
                              <input
                                type="text"
                                className="input-field"
                                placeholder="Kryptonim"
                                value={sisEditForm.kryptonim || ''}
                                onChange={e => setSisEditForm(p => ({ ...p, kryptonim: e.target.value }))}
                                style={{ fontSize: '10px', width: '100%', marginTop: '2px' }}
                              />
                            </td>
                            <td style={tdStyle}>
                              <select`;
code = code.replace(editInputOld, editInputNew);


// 5. Dyspozycje Table Kryptonim & Highlight
const sisTableOld = `const parts = vStr.split(' | ');
                            const unit = parts[0] || '---';
                            const vName = parts[1] || vStr;
                            
                            const vStatus = activeIncident.vehicleStatuses?.[vStr] || 0;
                            
                            let statusIcon = "⚠️";
                            let statusColor = "#000000";
                            let statusBg = i % 2 === 0 ? '#ffffff' : '#fafafa';
                            
                            if (vStatus === 1) { statusIcon = "▶️"; statusColor = "#c92a2a"; } 
                            else if (vStatus === 2) { statusIcon = "📍"; statusColor = "#c92a2a"; } 
                            else if (vStatus === 3) { statusIcon = "◀️"; statusColor = "#2b8a3e"; } 
                            else if (vStatus === 4) { statusIcon = "🏠"; statusColor = "#2b8a3e"; } 
                            else if (vStatus === 0) { statusIcon = "⏳"; statusColor = "#555555"; } 
                            
                            if (vStatus === 1 || vStatus === 2) {
                              statusBg = '#e3e3e3'; 
                            } else if (vStatus === 3 || vStatus === 4) {
                              statusBg = '#ffffff'; 
                            }
                            
                            return (
                              <tr 
                                key={i} 
                                style={{ background: statusBg, cursor: 'default' }}
                                onContextMenu={(e) => openVehicleContextMenu(e, vStr)}
                              >
                                <td style={{ textAlign: 'center', padding: '1px 2px', fontSize: '10px' }}>{statusIcon}</td>
                                <td style={{ padding: '1px 4px', fontSize: '9.5px', color: statusColor, fontWeight: 'bold' }}>{vName}</td>
                                <td style={{ padding: '1px 4px', fontSize: '9.5px', color: statusColor }}>{vStr}</td>
                                <td style={{ padding: '1px 4px', fontSize: '9.5px', color: statusColor }}>{unit}</td>
                              </tr>
                            );`;

const sisTableNew = `const parts = vStr.split(' | ');
                            const unit = parts[0] || '---';
                            const vName = parts[1] || vStr;
                            
                            const vehObj = tenantVehicles?.[unit]?.find(v => v.name === vName);
                            const kryptonim = vehObj?.kryptonim || vStr;

                            const vStatus = activeIncident.vehicleStatuses?.[vStr] || 0;
                            
                            let statusIcon = "⚠️";
                            let statusColor = "#000000";
                            let statusBg = i % 2 === 0 ? '#ffffff' : '#fafafa';
                            
                            if (vStatus === 1) { statusIcon = "▶️"; statusColor = "#c92a2a"; } 
                            else if (vStatus === 2) { statusIcon = "📍"; statusColor = "#c92a2a"; } 
                            else if (vStatus === 3) { statusIcon = "◀️"; statusColor = "#2b8a3e"; } 
                            else if (vStatus === 4) { statusIcon = "🏠"; statusColor = "#2b8a3e"; } 
                            else if (vStatus === 0) { statusIcon = "⏳"; statusColor = "#555555"; } 
                            
                            if (vStatus === 1 || vStatus === 2) {
                              statusBg = '#e3e3e3'; 
                            } else if (vStatus === 3 || vStatus === 4) {
                              statusBg = '#ffffff'; 
                            }
                            
                            const isSelected = window._selectedSisVehicle === vStr;
                            if (isSelected) {
                              statusBg = '#005fb8';
                              statusColor = '#ffffff';
                            }
                            
                            return (
                              <tr 
                                key={i} 
                                style={{ background: statusBg, cursor: 'default' }}
                                onClick={() => { window._selectedSisVehicle = vStr; document.dispatchEvent(new Event('render-trigger')); }}
                                onContextMenu={(e) => { window._selectedSisVehicle = vStr; document.dispatchEvent(new Event('render-trigger')); openVehicleContextMenu(e, vStr); }}
                              >
                                <td style={{ textAlign: 'center', padding: '1px 2px', fontSize: '10px' }}>{statusIcon}</td>
                                <td style={{ padding: '1px 4px', fontSize: '9.5px', color: statusColor, fontWeight: 'bold' }}>{vName}</td>
                                <td style={{ padding: '1px 4px', fontSize: '9.5px', color: statusColor }}>{kryptonim}</td>
                                <td style={{ padding: '1px 4px', fontSize: '9.5px', color: statusColor }}>{unit}</td>
                              </tr>
                            );`;
code = code.replace(sisTableOld, sisTableNew);

// Also need a render-trigger to force re-render when global var changes for selected vehicle
const useEffectOld = `useEffect(() => {
    // Basic init or cleanup
    console.log("App mounted");
  }, []);`;
const useEffectNew = `useEffect(() => {
    // Basic init or cleanup
    console.log("App mounted");
    const forceRender = () => setAnimationTick(t => t + 1);
    document.addEventListener('render-trigger', forceRender);
    return () => document.removeEventListener('render-trigger', forceRender);
  }, []);`;
code = code.replace(useEffectOld, useEffectNew);


fs.writeFileSync('src/App.jsx', code);
