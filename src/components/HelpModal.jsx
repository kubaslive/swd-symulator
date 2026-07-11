import React from 'react';

const HelpModal = ({ showHelpModal, setShowHelpModal, APP_VERSION }) => {
  if (!showHelpModal) return null;

  return (
    <div className="modal-overlay" onClick={() => setShowHelpModal(false)}>
      <div className="modal-window fade-in" style={{ width: '600px', height: '80%', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span>Pomoc i Informacje - SWD 2.0 (Wersja {APP_VERSION})</span>
          <button onClick={() => setShowHelpModal(false)}>X</button>
        </div>
        <div className="modal-content" style={{ overflowY: 'auto', flex: 1, fontSize: '12px' }}>
          <h3 style={{ fontSize: '14px', marginBottom: '10px' }}>Witaj w symulatorze SWD 2.0!</h3>
          <p>System Wspomagania Decyzji to aplikacja symulująca pracę dyspozytora PSP. Zarządzaj siłami i środkami w swoim powiecie.</p>
          
          <h4 style={{ marginTop: '15px', color: '#005fb8' }}>Zasady działania dla nowych graczy:</h4>
          <ul style={{ paddingLeft: '20px', marginBottom: '15px' }}>
            <li><strong>Rejestracja i Komendy:</strong> Podczas rejestracji wybierasz województwo i powiat, aby utworzyć własną jednostkę lub dołączyć do istniejącej.</li>
            <li><strong>Dysponowanie Sił:</strong> Kliknij zdarzenie na liście, by zobaczyć szczegóły. Używaj przycisków w dolnej części panelu (Zadysponuj, Dojazd, Na miejscu, Powrót), by sterować zastępami.</li>
            <li><strong>Meldunki i KSiS:</strong> W prawej kolumnie możesz wpisywać meldunki do Dziennika Radiowego. Moduł KSiS służy do komunikacji tekstowej i wymiany sił z innymi dyspozytorami.</li>
            <li><strong>Tryb Gry:</strong> Możesz go włączyć w pasku na górze. Wpisz nazwy miast z Twojego powiatu (po przecinku), aby system generował zgłoszenia i wezwania z tych miejscowości.</li>
          </ul>

          <h4 style={{ marginTop: '20px', color: '#005fb8' }}>Changelog (Ostatnie Zmiany):</h4>
          <div style={{ background: '#f5f5f5', padding: '10px', border: '1px solid #d1d1d1' }}>
            <p><strong>v0.1.1 beta (Aktualizacja zabezpieczeń i dynamicznych komend)</strong></p>
            <ul style={{ paddingLeft: '20px' }}>
              <li>Zabezpieczenia kont: Auto-wylogowanie po 30 min bezczynności, weryfikacja emaili, zwalczanie brute-force.</li>
              <li>Dynamiczny wybór komendy (Województwo -{'>'} Powiat -{'>'} Nazwa) podczas zakładania konta.</li>
              <li>Nowy panel pomocy (ten, który właśnie czytasz) oraz historia wersji.</li>
              <li>Ulepszony panel zarządzania użytkownikami dla Dowództwa.</li>
            </ul>
            
            <p style={{ marginTop: '10px' }}><strong>v0.1 beta (Wersja pierwotna)</strong></p>
            <ul style={{ paddingLeft: '20px' }}>
              <li>Rdzeń systemu: Zgłoszenia alarmowe, karty zdarzeń, mapowanie jednostek PSP/OSP.</li>
              <li>Multiplayer w czasie rzeczywistym oparty o bazę danych Firestore.</li>
              <li>Synteza mowy (Bot WCPR Text-to-Speech) na wejściu zgłoszeń.</li>
            </ul>
          </div>
        </div>
        <div style={{ padding: '10px', textAlign: 'right', borderTop: '1px solid #d1d1d1', backgroundColor: 'var(--win-face)' }}>
          <button className="btn-win" onClick={() => setShowHelpModal(false)} style={{ padding: '4px 15px', fontWeight: 'bold' }}>Zamknij</button>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
