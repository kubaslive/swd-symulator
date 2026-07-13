import React, { useState, useEffect } from 'react';
import { doc, updateDoc, serverTimestamp, addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';

export default function MobileTerminal({ userProfile, incidents, onClose, sendDiscordNotification }) {
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [vehicles, setVehicles] = useState([]);

  useEffect(() => {
    // Dynamically list all vehicles currently dispatched to active incidents
    const allDispatchedVehicles = new Set();
    
    incidents.forEach(inc => {
      if (!inc.isArchived && inc.status !== 'processed' && inc.vehicleStatuses) {
        Object.keys(inc.vehicleStatuses).forEach(v => {
          if (inc.vehicleStatuses[v] < 4) { // Only show vehicles not yet at base
            allDispatchedVehicles.add(v);
          }
        });
      }
    });
    
    const vList = Array.from(allDispatchedVehicles);
    
    if (vList.length === 0) {
      vList.push('Brak zadysponowanych wozów w systemie');
    }
    
    setVehicles(vList);
    
    if (!vList.includes(selectedVehicle) && vList.length > 0) {
      setSelectedVehicle(vList[0]);
    }
  }, [incidents, selectedVehicle]);

  // Znajdź zdarzenie, w którym bierze udział wybrany pojazd i nie ma jeszcze statusu 4 (Powrót do bazy)
  const activeIncident = incidents.find(inc => 
    inc.vehicleStatuses && 
    inc.vehicleStatuses[selectedVehicle] !== undefined && 
    inc.vehicleStatuses[selectedVehicle] < 4 &&
    !inc.isArchived
  );

  const currentStatus = activeIncident?.vehicleStatuses?.[selectedVehicle] || 0;

  const handleStatusChange = async (statusNum) => {
    if (!activeIncident) {
      alert("Pojazd nie jest zadysponowany do żadnego aktywnego zdarzenia!");
      return;
    }

    const currentStatuses = activeIncident.vehicleStatuses || {};
    const updatedStatuses = { ...currentStatuses, [selectedVehicle]: statusNum };
    
    const currentStatusTimes = activeIncident.vehicleStatusTimes || {};
    const updatedStatusTimes = { ...currentStatusTimes, [selectedVehicle]: new Date().toISOString() };
    
    const nowStr = new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
    const currentTimes = activeIncident.times || {};
    const finalTimes = { ...currentTimes };

    let statusText = "";
    if (statusNum === 1) {
      statusText = "WYJAZD (ST 1)";
      if (!finalTimes.departure) finalTimes.departure = nowStr;
      if (sendDiscordNotification) sendDiscordNotification(selectedVehicle.split(' | ')[1] || selectedVehicle, 1, activeIncident);
    } else if (statusNum === 2) {
      statusText = "NA MIEJSCU (ST 2)";
      if (!finalTimes.arrival) finalTimes.arrival = nowStr;
    } else if (statusNum === 3) {
      statusText = "ZAKOŃCZENIE DZIAŁAŃ (ST 3)";
      if (!finalTimes.completion) finalTimes.completion = nowStr;
    } else if (statusNum === 4) {
      statusText = "W BAZIE (ST 4)";
      if (!finalTimes.return) finalTimes.return = nowStr;
      if (sendDiscordNotification) sendDiscordNotification(selectedVehicle.split(' | ')[1] || selectedVehicle, 4, activeIncident);
    }

    const rankPrefix = userProfile?.rankObj ? `[${userProfile.rankObj.short}] ` : '';

    const newLog = {
      time: nowStr + ':' + new Date().getSeconds().toString().padStart(2, '0'),
      from: selectedVehicle.split(' | ')[1] || selectedVehicle,
      to: "Dyspozytornia",
      text: `[TERMINAL] ${rankPrefix}Zgłaszam status radiowy: ${statusText}`,
      channel: "K01 - Kanał Powiatowy",
      createdAt: new Date().toISOString()
    };

    try {
      await updateDoc(doc(db, 'incidents', activeIncident.id), {
        vehicleStatuses: updatedStatuses,
        vehicleStatusTimes: updatedStatusTimes,
        times: finalTimes,
        radioLogs: [...(activeIncident.radioLogs || []), newLog],
        updatedAt: serverTimestamp()
      });
      
      await addDoc(collection(db, 'radio_messages'), {
        text: `[TERMINAL] ${rankPrefix}Zastęp ${selectedVehicle.split(' | ')[1] || selectedVehicle} zgłasza: ${statusText}`,
        senderName: selectedVehicle.split(' | ')[1] || selectedVehicle,
        senderTenant: activeIncident.tenantId,
        createdAt: new Date().toISOString()
      });
      
    } catch (e) {
      console.error("Błąd aktualizacji statusu z terminala:", e);
      alert("Błąd aktualizacji statusu!");
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      backgroundColor: '#111', color: '#fff', zIndex: 99999,
      display: 'flex', flexDirection: 'column', fontFamily: 'monospace'
    }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', borderBottom: '2px solid #333', backgroundColor: '#222' }}>
        <h2 style={{ margin: 0, fontSize: '18px', color: '#ffeb3b' }}>📱 TERMINAL ST-3000</h2>
        <button onClick={onClose} style={{ padding: '8px 15px', backgroundColor: '#d32f2f', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>ZAMKNIJ</button>
      </div>

      {/* SELECTION */}
      <div style={{ padding: '15px', backgroundColor: '#1a1a1a', borderBottom: '1px solid #333' }}>
        <label style={{ display: 'block', marginBottom: '8px', color: '#aaa' }}>WYBIERZ ZASTĘP:</label>
        <select 
          value={selectedVehicle} 
          onChange={e => setSelectedVehicle(e.target.value)}
          style={{ width: '100%', padding: '12px', fontSize: '16px', backgroundColor: '#333', color: '#fff', border: '1px solid #555', borderRadius: '4px' }}
        >
          {vehicles.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>

      {/* INCIDENT INFO */}
      <div style={{ padding: '15px', flex: '0 0 auto', borderBottom: '1px solid #333', minHeight: '80px' }}>
        <div style={{ color: '#aaa', fontSize: '12px', marginBottom: '5px' }}>AKTYWNE ZDARZENIE:</div>
        {activeIncident ? (
          <div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ef5350' }}>{activeIncident.type === 'pozar' ? '🔥 POŻAR' : activeIncident.type === 'mz' ? '⚠️ MIEJSCOWE ZAGROŻENIE' : 'ALARM'}</div>
            <div style={{ fontSize: '16px', marginTop: '5px' }}>📍 {activeIncident.location}</div>
            <div style={{ fontSize: '14px', marginTop: '5px', color: '#ccc' }}>Opis: {activeIncident.description}</div>
            <div style={{ fontSize: '14px', marginTop: '10px', color: '#4caf50' }}>Aktualny Status: <strong>{currentStatus}</strong></div>
          </div>
        ) : (
          <div style={{ color: '#777', fontStyle: 'italic', fontSize: '16px' }}>Brak zadysponowania. Oczekiwanie w bazie...</div>
        )}
      </div>

      {/* STATUS BUTTONS */}
      <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', padding: '10px', gap: '10px', alignContent: 'flex-start' }}>
        <button 
          onClick={() => handleStatusChange(1)}
          disabled={!activeIncident || currentStatus >= 1}
          style={{ flex: '1 1 45%', minHeight: '120px', fontSize: '24px', fontWeight: 'bold', borderRadius: '8px', border: 'none',
            backgroundColor: (!activeIncident || currentStatus >= 1) ? '#333' : '#d32f2f', color: (!activeIncident || currentStatus >= 1) ? '#666' : '#fff'
          }}
        >
          [ 1 ]<br/>WYJAZD
        </button>
        
        <button 
          onClick={() => handleStatusChange(2)}
          disabled={!activeIncident || currentStatus < 1 || currentStatus >= 2}
          style={{ flex: '1 1 45%', minHeight: '120px', fontSize: '24px', fontWeight: 'bold', borderRadius: '8px', border: 'none',
            backgroundColor: (!activeIncident || currentStatus < 1 || currentStatus >= 2) ? '#333' : '#1976d2', color: (!activeIncident || currentStatus < 1 || currentStatus >= 2) ? '#666' : '#fff'
          }}
        >
          [ 2 ]<br/>NA MIEJSCU
        </button>
        
        <button 
          onClick={() => handleStatusChange(3)}
          disabled={!activeIncident || currentStatus < 2 || currentStatus >= 3}
          style={{ flex: '1 1 45%', minHeight: '120px', fontSize: '24px', fontWeight: 'bold', borderRadius: '8px', border: 'none',
            backgroundColor: (!activeIncident || currentStatus < 2 || currentStatus >= 3) ? '#333' : '#fbc02d', color: (!activeIncident || currentStatus < 2 || currentStatus >= 3) ? '#666' : '#000'
          }}
        >
          [ 3 ]<br/>ZAKOŃCZENIE
        </button>
        
        <button 
          onClick={() => handleStatusChange(4)}
          disabled={!activeIncident || currentStatus < 3 || currentStatus >= 4}
          style={{ flex: '1 1 45%', minHeight: '120px', fontSize: '24px', fontWeight: 'bold', borderRadius: '8px', border: 'none',
            backgroundColor: (!activeIncident || currentStatus < 3 || currentStatus >= 4) ? '#333' : '#388e3c', color: (!activeIncident || currentStatus < 3 || currentStatus >= 4) ? '#666' : '#fff'
          }}
        >
          [ 4 ]<br/>W BAZIE
        </button>
      </div>
    </div>
  );
}
