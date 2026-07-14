const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf-8');

// Fix handleSetVehicleStatus to intercept "Lokalizacja zagrożenia"
const oldHandleStart = `const handleSetVehicleStatus = async (vStr, statusNum) => {
    if (!activeIncident) return;`;

const newHandleStart = `const handleSetVehicleStatus = async (vStr, statusNum) => {
    if (!activeIncident) return;
    
    // Intercept string commands from Context Menu
    if (typeof statusNum === 'string') {
      if (statusNum === 'Lokalizacja zagrożenia') {
        const currentTimes = activeIncident.times || {};
        if (!currentTimes.localized) {
          const nowTimeStr = new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
          const newLog = {
            time: nowTimeStr,
            from: vStr.split(' | ')[1] || vStr,
            to: "Dyspozytornia",
            text: \`Zgłaszam lokalizację zagrożenia (sytuacja opanowana).\`,
            channel: "K01 - Kanał Powiatowy",
            createdAt: new Date().toISOString()
          };
          try {
            await updateDoc(doc(db, 'incidents', activeIncident.id), {
              times: { ...currentTimes, localized: nowTimeStr },
              radioLogs: [...(activeIncident.radioLogs || []), newLog],
              updatedAt: serverTimestamp()
            });
            // Game Score for Localization
            if (isGameModeActive) {
              setGameScore(prev => {
                const updated = prev + 50;
                localStorage.setItem('swd_game_score', updated.toString());
                return updated;
              });
            }
            alert("Oznaczono jako zlokalizowane/opanowane.");
          } catch(e) { console.error(e); }
        }
        setActiveContextMenuVehicle(null);
        return;
      }
      
      if (statusNum === 'Zakończenie działań') {
        statusNum = 3;
      } else if (statusNum === 'Powrót do bazy') {
        statusNum = 4;
      }
    }
`;

content = content.replace(oldHandleStart, newHandleStart);

// Fix stateLabel rendering
const oldStateLabel = `let stateLabel = "";
                      switch (incident.type) {
                        case 'pozar':
                        if (times.completion) stateLabel = "KP (Koniec)";
                        else if (times.arrival) stateLabel = "OP (Opanow.)";
                        else stateLabel = "PP (Prowadz.)";
                        break;
                        case 'mz':
                        if (times.completion) stateLabel = "KM (Koniec)";
                        else if (times.arrival) stateLabel = "OM (Opanow.)";
                        else stateLabel = "PM (Prowadz.)";
                        break;
                        case 'af':
                        if (times.completion) stateLabel = "CZ (Zakończ.)";
                        else stateLabel = "CW (W toku)";
                        break;
                        case 'gosp':
                        if (times.completion) stateLabel = "KWG (Koniec)";
                        else stateLabel = "WG (Wysył.)";
                        break;
                        case 'pzr':
                        if (times.completion) stateLabel = "KZR (Koniec)";
                        else stateLabel = "PZR (Zabezp.)";
                        break;
                        case 'zpr':
                        stateLabel = "ZPR (Przekaz.)";
                        break;
                        case 'bl':
                        stateLabel = "BL (Błąd)";
                        break;
                        default:
                        stateLabel = incident.type?.toUpperCase() || "MZ";
                      }`;

// We will use regex to replace it because the exact indentation might differ.
const regex = /let stateLabel = "";[\s\S]*?stateLabel = incident\.type\?\.toUpperCase\(\) \|\| "MZ";\n\s*\}/;

const newStateLabel = `let stateLabel = "";
                      const isLocalized = !!times.localized;
                      const isCompleted = !!times.completion || incident.status === 'processed' || incident.isArchived;
                      
                      switch (incident.type) {
                        case 'pozar':
                          if (isCompleted) stateLabel = "KP";
                          else if (isLocalized) stateLabel = "OP";
                          else stateLabel = "PP";
                          break;
                        case 'mz':
                          if (isCompleted) stateLabel = "KM";
                          else if (isLocalized) stateLabel = "OM";
                          else stateLabel = "PM";
                          break;
                        case 'af':
                          stateLabel = isCompleted ? "AF (Koniec)" : "AF (W toku)";
                          break;
                        case 'gosp':
                          stateLabel = isCompleted ? "KWG" : "WG";
                          break;
                        case 'pzr':
                          stateLabel = isCompleted ? "KZR" : "PZR";
                          break;
                        case 'zpr':
                          stateLabel = "ZPR";
                          break;
                        case 'bl':
                          stateLabel = "BL";
                          break;
                        default:
                          stateLabel = incident.type?.toUpperCase() || "MZ";
                      }`;

content = content.replace(regex, newStateLabel);
fs.writeFileSync('src/App.jsx', content);
