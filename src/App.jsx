import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { wipeAndInitializeDb } from './db_wipe';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  getDocs,
  collection, 
  query, 
  where,
  orderBy,
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  writeBatch, 
  serverTimestamp,
  updateDoc,
  setDoc,
  arrayUnion
} from 'firebase/firestore';


// Web Speech API Polish Voice Announcement (WCPR)
const speakAnnouncement = (text, isAudioEnabled) => {
  if (!isAudioEnabled) return;
  try {
    // Check if TTS is already speaking to avoid overlap
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pl-PL';
    utterance.rate = 1.0;
    utterance.pitch = 0.95; // Slightly deeper, authoritative retro speaker
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.error("Speech synthesis announcement error:", e);
  }
};

// Web Audio API Synthesized Sounds
const playSynthSound = (type) => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (type === 'ring') {
      const now = ctx.currentTime;
      const playPulse = (start) => {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(440, start);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(480, start);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.15, start + 0.05);
        gain.gain.setValueAtTime(0.15, start + 0.35);
        gain.gain.linearRampToValueAtTime(0, start + 0.4);
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        osc1.start(start);
        osc2.start(start);
        osc1.stop(start + 0.4);
        osc2.stop(start + 0.4);
      };
      playPulse(now);
      playPulse(now + 0.5);
      setTimeout(() => ctx.close(), 1500);
    } 
    else if (type === 'pager') {
      const now = ctx.currentTime;
      const playBeep = (start) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(2800, start);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.15, start + 0.02);
        gain.gain.setValueAtTime(0.15, start + 0.12);
        gain.gain.linearRampToValueAtTime(0, start + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.15);
      };
      playBeep(now);
      playBeep(now + 0.2);
      playBeep(now + 0.4);
      setTimeout(() => ctx.close(), 1000);
    }
    else if (type === 'message_beep') {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.linearRampToValueAtTime(1800, now + 0.1);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
      gain.gain.linearRampToValueAtTime(0, now + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
      setTimeout(() => ctx.close(), 500);
    }
    else if (type === 'siren') {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.linearRampToValueAtTime(700, now + 1.8);
      osc.frequency.linearRampToValueAtTime(320, now + 3.6);
      osc.frequency.linearRampToValueAtTime(700, now + 5.4);
      osc.frequency.linearRampToValueAtTime(320, now + 7.2);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.4);
      gain.gain.setValueAtTime(0.08, now + 6.8);
      gain.gain.linearRampToValueAtTime(0, now + 7.8);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(900, now);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 7.8);
      setTimeout(() => ctx.close(), 8500);
    }
    else if (type === 'dispatch_alarm') {
      // Sharp electronic dispatch alarm - two ascending bursts (like SWD-ST / Motorola SELCALL)
      // No voice, pure electronic signal
      const now = ctx.currentTime;
      const playBurst = (startT) => {
        // Tone 1: 880 Hz for 0.18s
        const osc1 = ctx.createOscillator();
        const g1 = ctx.createGain();
        osc1.type = 'square';
        osc1.frequency.setValueAtTime(880, startT);
        g1.gain.setValueAtTime(0, startT);
        g1.gain.linearRampToValueAtTime(0.25, startT + 0.01);
        g1.gain.setValueAtTime(0.25, startT + 0.16);
        g1.gain.linearRampToValueAtTime(0, startT + 0.18);
        osc1.connect(g1); g1.connect(ctx.destination);
        osc1.start(startT); osc1.stop(startT + 0.19);

        // Tone 2: 1100 Hz for 0.18s
        const osc2 = ctx.createOscillator();
        const g2 = ctx.createGain();
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(1100, startT + 0.22);
        g2.gain.setValueAtTime(0, startT + 0.22);
        g2.gain.linearRampToValueAtTime(0.25, startT + 0.23);
        g2.gain.setValueAtTime(0.25, startT + 0.38);
        g2.gain.linearRampToValueAtTime(0, startT + 0.40);
        osc2.connect(g2); g2.connect(ctx.destination);
        osc2.start(startT + 0.22); osc2.stop(startT + 0.41);

        // Tone 3: 1320 Hz for 0.18s (final high note)
        const osc3 = ctx.createOscillator();
        const g3 = ctx.createGain();
        osc3.type = 'square';
        osc3.frequency.setValueAtTime(1320, startT + 0.44);
        g3.gain.setValueAtTime(0, startT + 0.44);
        g3.gain.linearRampToValueAtTime(0.25, startT + 0.45);
        g3.gain.setValueAtTime(0.25, startT + 0.60);
        g3.gain.linearRampToValueAtTime(0, startT + 0.62);
        osc3.connect(g3); g3.connect(ctx.destination);
        osc3.start(startT + 0.44); osc3.stop(startT + 0.63);
      };
      // Play two bursts with a gap
      playBurst(now);
      playBurst(now + 0.8);
      setTimeout(() => ctx.close(), 4000);
    }
  } catch (e) {
    console.error("Audio Context failed:", e);
  }
};

// Resolves Katowice location strings to SVG coordinates
const getCoordinatesForLocation = (locStr) => {
  const norm = (locStr || "").toLowerCase();
  if (norm.includes("szopienic")) return { x: 295, y: 85 };
  if (norm.includes("dąbrówk") || norm.includes("dabrowk")) return { x: 255, y: 55 };
  if (norm.includes("kostuchn")) return { x: 205, y: 205 };
  if (norm.includes("podles")) return { x: 145, y: 215 };
  if (norm.includes("zarzecz")) return { x: 105, y: 205 };
  if (norm.includes("piotrowic")) return { x: 170, y: 180 };
  if (norm.includes("ligot")) return { x: 130, y: 150 };
  if (norm.includes("centrum") || norm.includes("korfant")) return { x: 200, y: 110 };
  if (norm.includes("mariack") || norm.includes("dworco")) return { x: 220, y: 120 };
  
  // Deterministic coordinate based on string hash for unknown locations
  let hash = 0;
  for (let i = 0; i < norm.length; i++) {
    hash = norm.charCodeAt(i) + ((hash << 5) - hash);
  }
  const x = 110 + Math.abs(hash % 200);
  const y = 60 + Math.abs((hash >> 8) % 130);
  return { x, y };
};


const getJrgPrefix = (jrgUnit, cityStr) => {
  if (cityStr && cityStr.toLowerCase().includes('zabrze')) return '123001';
  if (cityStr && cityStr.toLowerCase().includes('będzin')) return '113101';
  if (cityStr && cityStr.toLowerCase().includes('czeladź')) return '113101';
  if (cityStr && cityStr.toLowerCase().includes('wojkowice')) return '113101';
  
  if (jrgUnit && jrgUnit.includes('JRG nr 1')) return '1201001';
  if (jrgUnit && jrgUnit.includes('JRG nr 2')) return '1201002';
  if (jrgUnit && jrgUnit.includes('JRG nr 3')) return '1201003';
  return '1201001'; // Default Katowice JRG 1
};

const getFriendlyErrorMessage = (code) => {
  switch (code) {
    case 'auth/invalid-email':
      return 'Niepoprawny format adresu e-mail.';
    case 'auth/user-disabled':
      return 'Konto użytkownika zostało zablokowane.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Błędny e-mail lub hasło.';
    case 'auth/email-already-in-use':
      return 'Ten adres e-mail jest już zarejestrowany.';
    case 'auth/weak-password':
      return 'Hasło musi mieć co najmniej 6 znaków.';
    default:
      return 'Wystąpił nieoczekiwany błąd logowania.';
  }
};

// Obieg meldunku status mapping (Page 77 of SWD manual)
const WORKFLOW_STATES = {
  "1": "Roboczy (Draft)",
  "2": "Zatwierdzony Powiat (KP/KM)",
  "3": "Zatwierdzony Województwo (KW)",
  "4": "Żądanie zmiany -> JRG",
  "5": "Żądanie zaakceptowane JRG",
  "6": "Żądanie odrzucone JRG",
  "7": "Żądanie zmiany -> Powiat",
  "8": "Zmień zaakceptowane powiat",
  "9": "Zmień odrzucone powiat"
};

function App() {

  const [tenantStreets, setTenantStreets] = useState([]);
  const [tenantName, setTenantName] = useState('');
  const [tenantJrgUnits, setTenantJrgUnits] = useState([]);
  const [tenantOspUnits, setTenantOspUnits] = useState([]);
  const [tenantVehicles, setTenantVehicles] = useState({});
  const [tenantMapBases, setTenantMapBases] = useState({});
  const [tenantHydrants, setTenantHydrants] = useState([]);
  const [tenantOdwody, setTenantOdwody] = useState([]);
  const [tenantSpecialists, setTenantSpecialists] = useState([]);
  const [tenantEquipment, setTenantEquipment] = useState({});

  const KATALOG_OBIEKTOW = [
    { id: 'ob1', name: 'Szpital Górniczy Murcki', address: 'Katowice, ul. Sokołowskiego 2', lat: 50.1915, lng: 19.0305 },
    { id: 'ob2', name: 'Uniwersyteckie Centrum Kliniczne', address: 'Katowice, ul. Medyków 14', lat: 50.2223, lng: 18.9610 },
    { id: 'ob3', name: 'Spodek', address: 'Katowice, al. Korfantego 35', lat: 50.2662, lng: 19.0252 },
    { id: 'ob4', name: 'Kopalnia Wujek', address: 'Katowice, ul. Wincentego Pola 65', lat: 50.2450, lng: 18.9911 },
  ];


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
  // Auth state
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const JRG_UNITS = tenantJrgUnits.length > 0 ? tenantJrgUnits : ["Brak zdefiniowanych JRG"];
  const OSP_UNITS = tenantOspUnits.length > 0 ? tenantOspUnits : ["Brak zdefiniowanych OSP"];
  const ALL_UNITS = ["KM/KP PSP", ...tenantJrgUnits, ...tenantOspUnits];
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [cityName, setCityName] = useState('');
  const [regRole, setRegRole] = useState('kdr_osp'); // 'kdr_osp' | 'pa_jrg' | 'admin'
  const [selectedOsp, setSelectedOsp] = useState(OSP_UNITS[0]);
  const [selectedJrg, setSelectedJrg] = useState(JRG_UNITS[0]);
  const [error, setError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Context menu state for vehicles
  const [vehicleContextMenu, setVehicleContextMenu] = useState(null);

  // App data states
  const [incidents, setIncidents] = useState([]);
  const [friendlyIncidents, setFriendlyIncidents] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);
  
  // Multiplayer Game states
  const [activeRole, setActiveRole] = useState('dyspozytor'); // 'dyspozytor' | 'kdr_osp' | 'dowodca_jrg' | 'pozorant'
  const [isSystemAudioEnabled, setIsSystemAudioEnabled] = useState(true);
  
  // Formatka Audio Looping Logic
  useEffect(() => {
    if (!window._formatkaAudio) {
      window._formatkaAudio = new Audio('./be214c58-56b2-4e69-be31-db5bb28d06b9.wav');
      window._formatkaAudio.loop = true;
    }
    
    const hasNewIncident = (incidents || []).some(inc => inc.status === 'new' && inc.tenantId === userProfile?.tenantId);
    
    if (hasNewIncident && isSystemAudioEnabled) {
      if (window._formatkaAudio.paused) {
        window._formatkaAudio.play().catch(e => console.error("Audio play failed:", e));
      }
    } else {
      if (!window._formatkaAudio.paused) {
        window._formatkaAudio.pause();
        window._formatkaAudio.currentTime = 0;
      }
    }
  }, [incidents, isSystemAudioEnabled, userProfile]);
  const [incomingCalls, setIncomingCalls] = useState([]);
  const [selectedWcprCall, setSelectedWcprCall] = useState(null);
  const [wcprModalOpen, setWcprModalOpen] = useState(false);
  const [activeCallToAnswer, setActiveCallToAnswer] = useState(null);
  const [battleAlarmModalOpen, setBattleAlarmModalOpen] = useState(false);
  const [selectedSisVehicle, setSelectedSisVehicle] = useState(null);
  const [selectedCombatVehicle, setSelectedCombatVehicle] = useState(null);
  const [battleAlarmIncident, setBattleAlarmIncident] = useState(null);
  const [isGameModeActive, setIsGameModeActive] = useState(() => localStorage.getItem('swd_game_mode_active') === 'true');
  const [gameScore, setGameScore] = useState(() => parseInt(localStorage.getItem('swd_game_score') || '0', 10));
  const [gameModeCities, setGameModeCities] = useState(() => localStorage.getItem('swd_game_cities') || '');
  const [lastGameIncidentTime, setLastGameIncidentTime] = useState(0);

  // Simulated caller form states (Pozorant screen)
  const [callerName, setCallerName] = useState('Świadek Kowalski');
  const [callerPhone, setCallerPhone] = useState('501-112-223');
  const [callerLocation, setCallerLocation] = useState(''); // Updated via useEffect
  
  // Set default caller location once tenantName is available
  useEffect(() => {
    if (tenantName && !callerLocation) {
      setCallerLocation(`${tenantName}, ul. Główna 1`);
    }
  }, [tenantName]);

  const [callerReportText, setCallerReportText] = useState('Widzę kłęby czarnego dymu wydobywające się z okna na drugim piętrze budynku.');
  const [callerReportType, setCallerReportType] = useState('pozar');
  const [callStatusMessage, setCallStatusMessage] = useState('');

  const [isShiftTransitionModalOpen, setIsShiftTransitionModalOpen] = useState(false);
  const [isSystemMenuOpen, setIsSystemMenuOpen] = useState(false);
    const [absentUrlop, setAbsentUrlop] = useState(1);
  const [absentChorzy, setAbsentChorzy] = useState(0);
  const [absentDelegacja, setAbsentDelegacja] = useState(1);
  const [absentWakat, setAbsentWakat] = useState(0);
  const [absentWolna, setAbsentWolna] = useState(4);

  // Message priority states
  const [activePopups, setActivePopups] = useState([]);
  const [msgPriority, setMsgPriority] = useState('normal'); // 'normal' | 'confirm' | 'urgent'
  const [msgRecipient, setMsgRecipient] = useState('Wszyscy');

  // Merge Incidents & Extinguishing Agents (Chapter 7.5.2 & 8.8)
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [agentsInventory, setAgentsInventory] = useState({
    "JRG 1": [
      { name: "Środek pianotwórczy", norm: 2000, min: 1200, current: 1600, unit: "kg" },
      { name: "Proszek gaśniczy", norm: 500, min: 200, current: 450, unit: "kg" },
      { name: "Sorbent", norm: 150, min: 50, current: 40, unit: "kg" }
    ],
    "JRG 2": [
      { name: "Środek pianotwórczy", norm: 2500, min: 1500, current: 1200, unit: "kg" },
      { name: "Proszek gaśniczy", norm: 350, min: 100, current: 350, unit: "kg" },
      { name: "Sorbent", norm: 100, min: 30, current: 80, unit: "kg" }
    ],
    "JRG 3": [
      { name: "Środek pianotwórczy", norm: 2000, min: 1200, current: 2000, unit: "kg" },
      { name: "Proszek gaśniczy", norm: 400, min: 150, current: 380, unit: "kg" },
      { name: "Sorbent", norm: 120, min: 40, current: 110, unit: "kg" }
    ]
  });

  // Tactical navigation & view states
  const [activeMenuTab, setActiveMenuTab] = useState('rejestr'); // 'rejestr' | 'konta' | 'dziennik' | 'scoreboard'
  const [combatTab, setCombatTab] = useState('PSP'); // 'PSP' | 'OSP'
  const [rightPanelTab, setRightPanelTab] = useState('sis'); // 'sis' | 'sop'
  const [selectedOspSidebar, setSelectedOspSidebar] = useState(OSP_UNITS[0]);
  const [viewMode, setViewMode] = useState('active'); // 'active' | 'archive'
  
  // Search & Filter state
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'pozar' | 'mz' | 'af'
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'draft' | 'submitted' | 'processed'

  // Modals dialog triggers
  const [isNewIncidentModalOpen, setIsNewIncidentModalOpen] = useState(false);
  const [incidentModalTab, setIncidentModalTab] = useState('zgloszenie');
  const [isEwidReportModalOpen, setIsEwidReportModalOpen] = useState(false);
  const [isVehiclesModalOpen, setIsVehiclesModalOpen] = useState(false);

  // ODO Calculator State
  const [odoEntries, setOdoEntries] = useState([]);
  const [odoName, setOdoName] = useState('');
  const [odoPressure, setOdoPressure] = useState(300);
  const [odoCapacity, setOdoCapacity] = useState(6.8);

  // Live simulation states
  const [systemTime, setSystemTime] = useState(new Date());
  const [animationTick, setAnimationTick] = useState(0); // clock ticks to redraw animated map vehicles
  const [outOfServiceVehicles, setOutOfServiceVehicles] = useState(() => {
    try {
      const saved = localStorage.getItem('swd_out_of_service_kat');
      return saved ? JSON.parse(saved) : ["JRG 1 | GCBA 8/50 Renault 301-27"];
    } catch {
      return ["JRG 1 | GCBA 8/50 Renault 301-27"];
    }
  });
  const [operationalLogs, setOperationalLogs] = useState([
    "System SWD-ST 2.5 (Węzeł ${tenantName}) załadowany poprawnie.",
    "Transmisja danych online z KW PSP: ZAKTYWOWANA.",
    "Katalogi operacyjne zsynchronizowane."
  ]);

  // Draft / Edit states for Incident Form
  const [incidentDateStr, setIncidentDateStr] = useState(() => new Date().toISOString().split('T')[0]);
  const [incidentTimeStr, setIncidentTimeStr] = useState('12:00:00');
  const [gminaStr, setGminaStr] = useState(`m. ${tenantName}`);
  const [miejscowoscStr, setMiejscowoscStr] = useState(tenantName);
  const [location, setLocation] = useState('');
  const [obiektStr, setObiektStr] = useState('');
  const [callerNameStr, setCallerNameStr] = useState('');
  const [callerPhoneStr, setCallerPhoneStr] = useState('');
  const [callerAddressStr, setCallerAddressStr] = useState('');
  const [notifiedServices, setNotifiedServices] = useState(['PRM', 'Policja']);
  const [coordX, setCoordX] = useState('19.023');
  const [coordY, setCoordY] = useState('50.264');

  const [incidentType, setIncidentType] = useState('mz'); // 'pozar' | 'mz' | 'af' | 'cw' | 'wg' | 'pzr' | 'zpr' | 'bl'
  const [incidentSubtype, setIncidentSubtype] = useState(''); // Podrodzaj zdarzenia
  const [incidentFlags, setIncidentFlags] = useState([]); // Flagi zdarzenia (tablica)
  const [actionType, setActionType] = useState('ratownicze');
  const [description, setDescription] = useState('');
  const [targetJrg, setTargetJrg] = useState(JRG_UNITS[0]);
  const [targetUnitDocelowa, setTargetUnitDocelowa] = useState(JRG_UNITS[1]); // for PZR (Zabezpieczenie Rejonu - Page 47)
  const [firefightersCount, setFirefightersCount] = useState(6);
  const [equipmentUsed, setEquipmentUsed] = useState('');
  const [selectedVehicles, setSelectedVehicles] = useState([]);
  const [isLongDuration, setIsLongDuration] = useState(false);
  const [editingIncidentId, setEditingIncidentId] = useState(null);
  const [sopSteps, setSopSteps] = useState([]);

  // Times input state inside the report modal
  const [alarmTime, setAlarmTime] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [localizationTime, setLocalizationTime] = useState('');
  const [completionTime, setCompletionTime] = useState('');
  const [returnTime, setReturnTime] = useState('');
  const [geocodingStatus, setGeocodingStatus] = useState('yellow');
  const [reportWorkflowState, setReportWorkflowState] = useState('1');
  const [customReportNumber, setCustomReportNumber] = useState('');
  const [isPartialReport, setIsPartialReport] = useState(true);

  // Firefighter injury tracker inside EWID
  const [hasInjuries, setHasInjuries] = useState(false);
  const [injuriesDescription, setInjuriesDescription] = useState('');

  // Validation output list
  const [validationReport, setValidationReport] = useState({ errors: [], warnings: [] });

  // Nominal Crew states
  const [isCrewModalOpen, setIsCrewModalOpen] = useState(false);
  const [crewTargetVehicle, setCrewTargetVehicle] = useState('');
  const [crewDowodca, setCrewDowodca] = useState('');
  const [crewKierowca, setCrewKierowca] = useState('');
  const [crewRatownicy, setCrewRatownicy] = useState('');
  const [crewKm, setCrewKm] = useState(0);
  const [crewFuel, setCrewFuel] = useState(0);

  // Vehicle context menu state
  const [activeContextMenuVehicle, setActiveContextMenuVehicle] = useState(null);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });

  // Linked Calls states
  const [isLinkedCallModalOpen, setIsLinkedCallModalOpen] = useState(false);
  const [linkedCallerName, setLinkedCallerName] = useState('');
  const [linkedCallerPhone, setLinkedCallerPhone] = useState('');
  const [linkedCallText, setLinkedCallText] = useState('');
  const [linkedCallTime, setLinkedCallTime] = useState('');

  // Shift Crew states (Obsada SKKM)
  const [shiftDo, setShiftDo] = useState('mł. bryg. Tomasz Lis');
  const [shiftPdo, setShiftPdo] = useState('asp. sztab. Rafał Wilk');
  const [shiftDisp, setShiftDisp] = useState('mł. asp. Marta Sowa');

  // Roster shift details stats
  const [shiftNumber, setShiftNumber] = useState('1');
  const [shiftJrg1Staff, setShiftJrg1Staff] = useState({ total: 18, active: 12, reserve: 6, commander: 'asp. sztab. Adam Janicki' });
  const [shiftJrg2Staff, setShiftJrg2Staff] = useState({ total: 15, active: 10, reserve: 5, commander: 'st. asp. Janusz Wilk' });
  const [shiftJrg3Staff, setShiftJrg3Staff] = useState({ total: 16, active: 11, reserve: 5, commander: 'asp. Krzysztof Sowa' });

  // Weather alerts meteo feed
  const [meteoAlertText, setMeteoAlertText] = useState('OSTRZEŻENIE METEO STOPNIA 2: Prognozowane burze z gradem oraz porywy wiatru do 90 km/h w Katowicach od godz. 16:00.');
  const [isMeteoAlertActive, setIsMeteoAlertActive] = useState(false);

  // Sounding OSP alarm waves simulator list
  const [activeSirens, setActiveSirens] = useState([]);


  // Admin lock bypass
  const [isAdminUnlockBypass, setIsAdminUnlockBypass] = useState(false);

  // Print simulator trigger state
  const [printPreviewMode, setPrintPreviewMode] = useState(null);

  // Messenger live chat states
  const [messages, setMessages] = useState([]);
  const [chatInputText, setChatInputText] = useState('');
  const [isChatSidebarOpen, setIsChatSidebarOpen] = useState(false);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState(null);

  // SMS Gateway States
  const [smsGatewayLogs, setSmsGatewayLogs] = useState([
    { id: 1, type: 'in', from: '501-112-223', text: 'Zgłoszenie głuchoniemy: pożar mieszkania ul. Szopienicka 10, nie mogę mówić', time: '11:45:00' },
    { id: 2, type: 'out', to: 'OSP 1', text: 'ALARM! Pożar mieszkania Szopienicka 10. Proszę o potwierdzenie.', time: '11:46:12' }
  ]);
  const [smsInput, setSmsInput] = useState('');
  const [smsRecipient, setSmsRecipient] = useState('OSP 1');

  // Katalog Sił i Środków (SiS) – vehicle fleet management

  const updateTenantVehicles = async (newVehicles) => {
    if (!userProfile || !userProfile.tenantId) {
      alert('Konto WSKR bez miasta - brak własnej bazy. Aby edytować SiS, zaloguj się jako Dyspozytor konkretnego miasta.'); return;
    }
    try {
      const tenantRef = doc(db, 'tenants', userProfile.tenantId);
      await setDoc(tenantRef, { vehicles: newVehicles }, { merge: true });
    } catch (err) {
      console.error(err);
      alert('Błąd bazy danych: ' + err.message);
    }
  };
  
  const updateTenantUnits = async (jrg, osp) => {
    if (!userProfile || !userProfile.tenantId) {
      alert('Konto WSKR bez miasta - brak własnej bazy. Aby zarządzać jednostkami, zaloguj się jako Dyspozytor konkretnego miasta.'); return;
    }
    try {
      const tenantRef = doc(db, 'tenants', userProfile.tenantId);
      await setDoc(tenantRef, { jrgUnits: jrg, ospUnits: osp }, { merge: true });
    } catch (err) {
      console.error(err);
      alert('Błąd bazy danych: ' + err.message);
    }
  };

  const [sisSelectedUnit, setSisSelectedUnit] = useState(Object.keys(UNIT_VEHICLES)[0]);
  const [sisEditingVehicle, setSisEditingVehicle] = useState(null); // vehicle object being edited
  const [sisEditForm, setSisEditForm] = useState({}); // form fields
  const [sisIsAddingVehicle, setSisIsAddingVehicle] = useState(false);
  const [sisNewVehicleForm, setSisNewVehicleForm] = useState({ name: '', type: 'GBA', obsada: 6, outOfService: false, ksrg: false, notes: '' });
  const [sisActiveTab, setSisActiveTab] = useState('vehicles'); // 'pojazdy' | 'sprzet' | 'srodki'

  // Real-time animation system clock tick
  useEffect(() => {
    const timer = setInterval(() => {
      setSystemTime(new Date());
      setAnimationTick(t => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen to Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setUserProfile(null);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  // Listen to User Profile
  useEffect(() => {
    if (!user) return;
    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const uProf = { ...docSnap.data() };
        if (uProf.role === 'admin' && !uProf.tenantId) { uProf.tenantId = user.uid; }
        setUserProfile(uProf);
        // Default role mapping
        setActiveRole('dyspozytor');
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    }, (err) => {
      console.error("Error fetching user profile:", err);
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);

  
  // Multi-tenant: Listen to Tenant Configuration
  useEffect(() => {
    if (!userProfile || !userProfile.tenantId) return;

    const getTenantDefaultName = (tid) => {
      const map = {
        '120000': 'KW PSP Katowice',
        '120100': 'KM PSP Katowice',
        '120200': 'KP PSP Będzin',
        '120300': 'KM PSP Zabrze',
        '120400': 'KM PSP Mysłowice'
      };
      return map[tid] || 'Nieznana Jednostka';
    };

    const tenantRef = doc(db, 'tenants', userProfile.tenantId);
    const unsubscribe = onSnapshot(tenantRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setTenantStreets(data.streets || []);
        setTenantName(data.name || getTenantDefaultName(userProfile.tenantId));
        setTenantJrgUnits(data.jrgUnits || []);
        setTenantOspUnits(data.ospUnits || []);
        setTenantVehicles(data.vehicles || {});
        setTenantMapBases(data.mapBases || {});
        setTenantHydrants(data.hydrants || []);
        setTenantOdwody(data.odwody || []);
        setTenantSpecialists(data.specialists || []);
        setTenantEquipment(data.equipment || {});
      } else {
        // Clear state if tenant config doesn't exist yet
        setTenantStreets([]);
        setTenantName(getTenantDefaultName(userProfile.tenantId));
        setTenantJrgUnits([]);
        setTenantOspUnits([]);
        setTenantVehicles({});
        setTenantMapBases({});
        setTenantHydrants([]);
        setTenantOdwody([]);
        setTenantSpecialists([]);
        setTenantEquipment({});
      }
    });

    return unsubscribe;
  }, [userProfile]);

  // Listen to Incidents
  useEffect(() => {
    if (!userProfile) return;
    const incidentsRef = collection(db, 'incidents');
    let q;
    const activeTenantId = userProfile.tenantId || 'Katowice';

    if (userProfile?.role === 'admin') {
      q = query(incidentsRef, where('tenantId', '==', activeTenantId)); 
    } else if (userProfile?.role === 'kdr_osp' && userProfile?.ospUnit) {
      q = query(incidentsRef, where('tenantId', '==', activeTenantId), where('ospUnit', '==', userProfile.ospUnit));
    } else if (userProfile?.role === 'pa_jrg' && userProfile?.jrgUnit) {
      q = query(incidentsRef, where('tenantId', '==', activeTenantId), where('targetJrg', '==', userProfile.jrgUnit));
    } else {
      q = query(incidentsRef, where('tenantId', '==', activeTenantId));
    }
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() });
      });
      
      items.sort((a, b) => {
        const tA = a.createdAt ? (a.createdAt.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt).getTime()) : 0;
        const tB = b.createdAt ? (b.createdAt.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt).getTime()) : 0;
        return tB - tA;
      });
      setIncidents(items);
    });

    const friendlyRef = collection(db, 'incidents');
    const friendlyQ = query(friendlyRef);
    const unsubscribeFriendly = onSnapshot(friendlyQ, (snapshot) => {
      const items = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.tenantId !== userProfile.tenantId) {
          items.push({ id: doc.id, ...data });
        }
      });
      items.sort((a, b) => {
        const tA = a.createdAt ? (a.createdAt.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt).getTime()) : 0;
        const tB = b.createdAt ? (b.createdAt.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt).getTime()) : 0;
        return tB - tA;
      });
      setFriendlyIncidents(items);
    });

    return () => {
      unsubscribe();
      unsubscribeFriendly();
    };
  }, [userProfile]);

  // Multiplayer Game: Listen to emergency calls collection (Calls Queue 112)
  useEffect(() => {
    if (!userProfile) return;
    // WSKR (admin) used to not receive calls, but now everyone should receive them

    const callsRef = collection(db, 'calls');
    const q = query(callsRef, where('tenantId', '==', userProfile.tenantId), where('status', '==', 'pending'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() });
      });
      // Sort in-memory in client to avoid requiring a Firestore composite index
      const sortedItems = items.sort((a, b) => {
        const tA = a.createdAt ? (a.createdAt.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt).getTime()) : 0;
        const tB = b.createdAt ? (b.createdAt.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt).getTime()) : 0;
        return tB - tA;
      });
      setIncomingCalls(sortedItems);
      
      // Dispatcher alarm triggers on incoming calls - electronic beep + fixed voice phrase
      if (sortedItems.length > 0 && activeRole === 'dyspozytor') {
        if (isSystemAudioEnabled) {
          playSynthSound('dispatch_alarm');
          setTimeout(() => {
            speakAnnouncement("Nowe zdarzenie, odbierz!", isSystemAudioEnabled);
          }, 800);
        }
        logAction(`Odebrano nowe zgłoszenie na linii alarmowej 112!`);
      }
    });
    return unsubscribe;
  }, [userProfile, activeRole, isSystemAudioEnabled]);


  // Multiplayer Game: Battle Alarm listener for Firefighters (JRG / OSP)
  useEffect(() => {
    if (!userProfile) return;
    if (activeRole !== 'kdr_osp' && activeRole !== 'dowodca_jrg') return;

    // Check if any active incident has been dispatched to their unit and needs acknowledgment
    const targetUnitName = activeRole === 'kdr_osp' ? userProfile.ospUnit : userProfile.jrgUnit;
    if (!targetUnitName) return;

    const unacknowledgedAlarm = incidents.find(inc => {
      const isAssigned = inc.vehicles && inc.vehicles.some(v => v.includes(targetUnitName));
      const notAcked = !inc.eventHistory || !inc.eventHistory.some(hist => hist.action.includes('Potwierdzono alarm bojowy') && hist.action.includes(targetUnitName.replace("JRG nr ", "JRG ").replace("OSP ", "")));
      return isAssigned && inc.status === 'submitted' && notAcked;
    });

    if (unacknowledgedAlarm) {
      setBattleAlarmIncident(unacknowledgedAlarm);
      setBattleAlarmModalOpen(true);
      // Play high-fidelity mechanical fire department siren or digital pager sound!
      if (activeRole === 'kdr_osp') {
        if (isSystemAudioEnabled) playSynthSound('pager');
      } else {
        if (isSystemAudioEnabled) playSynthSound('siren');
      }
    }
  }, [incidents, userProfile, activeRole, isSystemAudioEnabled]);



  // Listen to Users (Admin Only)
  useEffect(() => {
    if (!userProfile || userProfile?.role !== 'admin') return;
    const usersRef = collection(db, 'users');
    const q = query(usersRef, orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() });
      });
      setUsersList(items);
    }, (err) => {
      console.error("Error fetching users list:", err);
    });
    return unsubscribe;
  }, [userProfile]);

  // ============================================================
  // MULTIPLAYER GAME: AUTOMATIC BOT SIMULATOR & GAME ENGINE
  // ============================================================
  useEffect(() => {
    if (activeRole !== 'dyspozytor') return;

    // 1. Bot Simulator: Auto-simulate vehicle states and radio logs
    incidents.forEach(async (incident) => {
      if (incident.status === 'processed' || incident.isArchived) return;

      const vehicles = incident.vehicles || [];
      const currentStatuses = incident.vehicleStatuses || {};
      const statusTimes = incident.vehicleStatusTimes || {};
      const updatedStatuses = { ...currentStatuses };
      const updatedStatusTimes = { ...statusTimes };
      let hasUpdates = false;

      // Bot only sends radio reports requesting the status changes, and does NOT auto-update vehicleStatuses!
      const sendRadioMessageOnly = async (vStr, radioMsg, nextRadioState) => {
        try {
          const radioLogs = incident.radioLogs || [];
          const timeSecStr = new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          const newRadioLog = {
            time: timeSecStr,
            from: vStr.split(' | ')[1] || vStr,
            to: "Dyspozytornia",
            text: radioMsg
          };

          const radioNotified = incident.radioNotified || {};
          const updatedRadioNotified = {
            ...radioNotified,
            [vStr]: nextRadioState
          };

          await updateDoc(doc(db, 'incidents', incident.id), {
            radioLogs: [...radioLogs, newRadioLog],
            radioNotified: updatedRadioNotified,
            updatedAt: serverTimestamp()
          });
        } catch (e) {
          console.error("Bot radio message error:", e);
        }
      };

      for (let vStr of vehicles) {
        const currentVal = currentStatuses[vStr] || 0;
        const radioNotified = incident.radioNotified || {};
        const lastNotifiedState = radioNotified[vStr] || 0;
        
        // Time elapsed since last status change
        const lastTimeStr = statusTimes[vStr] || incident.createdAt?.toDate?.()?.toISOString() || new Date().toISOString();
        const elapsed = Math.floor((new Date() - new Date(lastTimeStr)) / 1000);

        if (currentVal === 0 && lastNotifiedState < 1) {
          // Dispatched -> requests ST1 (Wyjazd) after 15s
          if (elapsed >= 15) {
            hasUpdates = true;
            await sendRadioMessageOnly(vStr, `Zgłaszamy gotowość. Prosimy o potwierdzenie wyjazdu zastępu (Status 1).`, 1);
            break;
          }
        } else if (currentVal === 1 && lastNotifiedState < 2) {
          // Wyjazd -> requests ST2 (Na miejscu) after 40s travel
          if (elapsed >= 40) {
            hasUpdates = true;
            await sendRadioMessageOnly(vStr, `Meldujemy dojazd na miejsce zdarzenia. Rozpoznanie w toku, prosimy o odnotowanie przybycia (Status 2).`, 2);
            break;
          }
        } else if (currentVal === 2 && lastNotifiedState < 3) {
          // Na miejscu -> requests ST3 (Powrót) after 80s operations
          if (elapsed >= 80) {
            hasUpdates = true;
            const desc = incident.type === 'pozar' ? "Pożar ugaszony, zarzewia ognia zlikwidowane. Zwijamy sprzęt." : 
                         incident.type === 'mz' ? "Działania ratownicze zakończone. Skutki zdarzenia usunięte, ruch udrożniony." :
                         "Rozpoznanie negatywne. Alarm fałszywy w dobrej wierze.";
            await sendRadioMessageOnly(vStr, `${desc} Zgłaszamy zakończenie działań, wracamy do koszar (Status 3).`, 3);
            
            // Score Bonus in game mode
            if (isGameModeActive) {
              setGameScore(prev => {
                const updated = prev + 50;
                localStorage.setItem('swd_game_score', updated.toString());
                return updated;
              });
            }
            break;
          }
        } else if (currentVal === 3 && lastNotifiedState < 4) {
          // Powrót -> requests ST4 (W koszarach) after 30s travel back
          if (elapsed >= 30) {
            hasUpdates = true;
            await sendRadioMessageOnly(vStr, `Meldujemy powrót do koszar. Zastęp w gotowości bojowej w bazie (Status 4).`, 4);
            break;
          }
        } else if (currentVal === 4) {
          // Once dispatcher sets ST4, wait 10s and automatically release the vehicle to make it free
          if (elapsed >= 10) {
            hasUpdates = true;
            const currentVehicles = incident.vehicles || [];
            const updatedVehicles = currentVehicles.filter(v => v !== vStr);
            const updatedStatuses = { ...incident.vehicleStatuses };
            delete updatedStatuses[vStr];
            const updatedStatusTimes = { ...incident.vehicleStatusTimes };
            delete updatedStatusTimes[vStr];
            const updatedRadioNotified = { ...incident.radioNotified };
            delete updatedRadioNotified[vStr];
            
            await updateDoc(doc(db, 'incidents', incident.id), {
              vehicles: updatedVehicles,
              vehicleStatuses: updatedStatuses,
              vehicleStatusTimes: updatedStatusTimes,
              radioNotified: updatedRadioNotified,
              updatedAt: serverTimestamp()
            });
            break;
          }
        }
      }
    });

    // 2. Game scenario auto generator (triggers at random interval: 120s to 240s)
    if (isGameModeActive) {
      const now = Date.now();
      const currentInterval = window._nextGameIncidentInterval || 120000;
      
      if (now - lastGameIncidentTime >= currentInterval || lastGameIncidentTime === 0) {
        setLastGameIncidentTime(now);
        
        // Randomize the next incident interval to make it realistic (120s - 240s)
        window._nextGameIncidentInterval = Math.floor(120000 + Math.random() * 120000); 

        // Polish names generator
        const firstNames = ["Jan", "Andrzej", "Piotr", "Krzysztof", "Stanisław", "Tomasz", "Paweł", "Józef", "Marcin", "Marek", "Anna", "Maria", "Katarzyna", "Małgorzata", "Agnieszka", "Krystyna", "Barbara", "Ewa", "Elżbieta", "Zofia", "Karol", "Michał", "Artur", "Dawid", "Mateusz", "Zuzanna", "Julia", "Maja", "Oliwia", "Jakub", "Szymon"];
        const lastNames = ["Nowak", "Kowalski", "Wiśniewski", "Wójcik", "Kowalczyk", "Kamiński", "Lewandowski", "Zieliński", "Szymański", "Woźniak", "Dąbrowski", "Kozłowski", "Jankowski", "Mazur", "Wojciechowski", "Kwiatkowski", "Krawczyk", "Kaczmarek", "Piotrowski", "Grabowski", "Smuga", "Zając", "Bąk", "Krupa", "Sikora"];
        const streets = tenantStreets.length > 0 ? tenantStreets : ["Główna", "Polna", "Leśna"];
        
        const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
        
        const parsedCities = gameModeCities.split(',').map(s => s.trim()).filter(s => s.length > 0);
        const city = parsedCities.length > 0 ? randomElement(parsedCities) : tenantName;

        const callerName = `${randomElement(firstNames)} ${randomElement(lastNames)}`;
        const phone = `${Math.floor(500 + Math.random() * 200)}-${Math.floor(100 + Math.random() * 800)}-${Math.floor(100 + Math.random() * 800)}`;
        const street = randomElement(streets);
        const houseNum = Math.floor(Math.random() * 120) + 1;
        const location = `${city}, ul. ${street} ${houseNum}`;
        
        const types = ["pozar", "mz", "af", "pozar", "mz", "mz"]; // Weighted towards MZ and Pozar
        const type = randomElement(types);
        
        let text = "";
        if (type === "pozar") {
          const pozScenarios = [
            "Pali się altanka na ogródkach działkowych, ogień przenosi się na drzewa.",
            "Widzę silny ogień i czarny dym z okna na 3. piętrze bloku mieszkalnego. Ktoś wzywa pomoc z balkonu!",
            "Pali się auto osobowe na poboczu drogi, ogień objął całą komorę silnika.",
            "Sadza pali się w przewodzie kominowym domu jednorodzinnego, lecą iskry i słychać huk.",
            "Pożar trawy na nieużytkach. Ogień niebezpiecznie zbliża się do pobliskiego lasu i zabudowań.",
            "Zgłoszenie z monitoringu ppoż. Pożar w hali magazynowej, pracownicy ewakuują się.",
            "Dym wydobywa się ze śmietnika podziemnego na osiedlu.",
            "Wybuch gazu w kamienicy, pożar na piętrze, zawalona część ściany nośnej.",
            "Pali się dach opuszczonego budynku gospodarczego.",
            "Zwarcie w rozdzielni elektrycznej w piwnicy wielkiej płyty, cała klatka schodowa w gęstym, gryzącym dymie.",
            "Pali się opona w ciężarówce na autostradzie A4. Kierowca zjechał na pas awaryjny.",
            "Pożar mieszkania na parterze. Starsza osoba najprawdopodobniej została w środku.",
            "Ogień na dachu stacji benzynowej w rejonie dystrybutorów!",
            "Pożar śmieci na balkonie na 6. piętrze. Spada płonący plastik na niższe piętra."
          ];
          text = randomElement(pozScenarios);
        } else if (type === "mz") {
          const mzScenarios = [
            "Zderzenie dwóch samochodów osobowych, jedna osoba zakleszczona w pojeździe, płyny na jezdni.",
            "Wiatr powalił duże drzewo na jezdnię, droga jest całkowicie zablokowana. Drzewo zerwało też linię energetyczną.",
            "W mieszkaniu starsza pani zasłabła i nie otwiera drzwi, słychać wołanie o pomoc.",
            "Czuć silną woń gazu na klatce schodowej w bloku czteropiętrowym.",
            "Duża plama oleju na jezdni na skrzyżowaniu, auta wpadają w poślizg. Plama ciągnie się przez kilkaset metrów.",
            "Zatrzaśnięte roczne dziecko w nagrzanym samochodzie na parkingu pod galerią.",
            "Osoba uwięziona w zaciętej windzie od 40 minut. Zaczyna brakować jej powietrza (atak paniki).",
            "Dachówka zwisa z krawędzi dachu kamienicy i zagraża przechodniom na chodniku.",
            "Samochód zjechał z drogi i uderzył w przepust. Kierowca jest nieprzytomny.",
            "Rozlano nieznaną substancję chemiczną w laboratorium szkolnym. Dwie osoby uskarżają się na ból głowy.",
            "Kot utknął na czubku bardzo wysokiej brzozy i głośno miauczy od dwóch dni.",
            "Zalana piwnica w budynku mieszkalnym po gwałtownej ulewie. Woda sięga pół metra.",
            "Zderzenie motocykla z samochodem dostawczym. Motocyklista leży na jezdni, brak funkcji życiowych - CPR rozpoczęte.",
            "Czujnik tlenku węgla (czadu) załączył się w łazience z piecykiem gazowym. Mieszkańcy skarżą się na zawroty głowy.",
            "Gniazdo szerszeni bezpośrednio nad oknem przedszkola.",
            "Osoba poślizgnęła się na nasypie przy rzece i nie może samodzielnie wyjść po stromym zboczu ze złamaną nogą."
          ];
          text = randomElement(mzScenarios);
        } else {
          const afScenarios = [
            "Czujka pożarowa SAP wyje w budynku biurowym, brak widocznych oznak pożaru z zewnątrz.",
            "Zgłoszenie o dymie w lesie, ale to chyba ognisko lub grill u sąsiada na ogródku.",
            "Ktoś dzwoni i mówi, że szkoła się pali, po czym po prostu się rozłącza (dziecięcy głos).",
            "Zgłoszenie pożaru w fabryce, ale ochrona obiektu niczego nie potwierdza.",
            "Pani zgłasza nieprzyjemny zapach gazu, jednak po przyjeździe okazuje się to zapachem gotowanej kapusty.",
            "Wciśnięty Ręczny Ostrzegacz Pożarowy (ROP) w galerii handlowej bez powodu przez nieznanego sprawcę."
          ];
          text = randomElement(afScenarios);
        }

        // Generate WCPR / PLI-CBD style full transcript
        const transcript = `=========================================
WCPR - KARTA ZGŁOSZENIA 112
=========================================
ID ZGŁOSZENIA: WCPR/KAT/${Math.floor(100000 + Math.random() * 900000)}
DATA: ${new Date().toLocaleDateString('pl-PL')} ${new Date().toLocaleTimeString('pl-PL')}
ZGŁASZAJĄCY: ${callerName}
TELEFON: +48 ${phone}
LOKALIZACJA PLI CBD: Gmina m. ${tenantName}, ul. ${street} ${houseNum}

TREŚĆ ZGŁOSZENIA:
"${text}"

[STATUS SYSTEMU WCPR]
- Połączenie odebrane w WCPR ${tenantName}.
- Weryfikacja lokalizacji zaawansowana (SPA).
- Przekazano do dyspozytorni za pomocą formatu XML.
=========================================`;
        
        // Create Incident Directly
        const addIncidentDirectly = async () => {
          try {
            const currentYear = new Date().getFullYear();
            const sequenceNumber = String((incidents?.length || 0) + 4801).padStart(4, '0');
            
            // Random JRG for generator
            const jrgs = ['JRG nr 1', 'JRG nr 2', 'JRG nr 3'];
            const randomJrg = jrgs[Math.floor(Math.random() * jrgs.length)];
            const prefix = getJrgPrefix(randomJrg, city);

            const customId = `${prefix}-${sequenceNumber}`;

            await addDoc(collection(db, 'calls'), {
              tenantId: userProfile?.tenantId || 'Katowice',
              type: type,
              category: type,
              status: 'pending',
              location: location,
              address: location,
              gminaStr: `Gmina m. ${city}`,
              miejscowoscStr: city,
              description: transcript,
              callerName: callerName,
              phone: `+48 ${phone}`,
              createdAt: serverTimestamp()
            });
            logAction(`🚨 Gra: Nowe połączenie 112 trafiło do bufora!`);
          } catch(e) {
            console.error("Game generator error:", e);
          }
        };
        addIncidentDirectly();
      }
    }

  }, [animationTick, activeRole, incidents, isGameModeActive, incomingCalls, lastGameIncidentTime, gameModeCities]);

  // Listen to messenger live chat collection with popup notifications (Chapter 10)
  useEffect(() => {
    if (!userProfile) return;
    const msgRef = collection(db, 'messages');
    let q;
    if (userProfile?.role === 'admin') {
      q = query(msgRef); // WSKR
    } else {
      q = query(msgRef, where('tenantId', '==', userProfile.tenantId));
    }
    
    // Track loaded message IDs to ignore initial load popups
    let initialLoadComplete = false;

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() });
      });
      
      items.sort((a, b) => {
        const tA = a.createdAt ? (a.createdAt.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt).getTime()) : 0;
        const tB = b.createdAt ? (b.createdAt.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt).getTime()) : 0;
        return tB - tA;
      });
      const reversed = items.slice(0, 30).reverse();

      
      if (initialLoadComplete && reversed.length > 0) {
        const lastMsg = reversed[reversed.length - 1];
        const isSelf = lastMsg.sender === (userProfile.displayName || userProfile.email);
        const targetUnit = userProfile.role === 'kdr_osp' ? userProfile.ospUnit : userProfile.role === 'pa_jrg' ? userProfile.jrgUnit : 'KM/KP PSP (Admin)';
        const matchesMe = !lastMsg.recipient || lastMsg.recipient === 'Wszyscy' || lastMsg.recipient === targetUnit;

        if (!isSelf && matchesMe) {
          // Trigger alert sounds
          if (lastMsg.priority === 'urgent') {
            if (isSystemAudioEnabled) playSynthSound('siren');
          } else {
            if (isSystemAudioEnabled) playSynthSound('message_beep');
          }

          // Add to popups list
          setActivePopups(prev => {
            if (prev.some(p => p.id === lastMsg.id)) return prev;
            return [...prev, lastMsg];
          });
        }
      }

      setMessages(reversed);
      initialLoadComplete = true;

      if (!isChatSidebarOpen && reversed.length > 0) {
        setChatUnreadCount(prev => prev + 1);
      }
    }, (err) => {
      console.error("Error fetching messages:", err);
    });
    return unsubscribe;
  }, [userProfile, isChatSidebarOpen, isSystemAudioEnabled]);

  // Listen to shift crew metadata configuration
  useEffect(() => {
    if (!userProfile) return;
    const shiftDocRef = doc(db, 'metadata', 'shift');
    const unsubscribe = onSnapshot(shiftDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setShiftDo(data.do || 'mł. bryg. Tomasz Lis');
        setShiftPdo(data.pdo || 'asp. sztab. Rafał Wilk');
        setShiftDisp(data.disp || 'mł. asp. Marta Sowa');
      }
    }, (err) => {
      console.error("Error fetching shift crew:", err);
    });
    return unsubscribe;
  }, [userProfile]);

  // Listen to shift details roster statistics
  useEffect(() => {
    if (!userProfile) return;
    const shiftDetailsDocRef = doc(db, 'metadata', 'shift_details');
    const unsubscribe = onSnapshot(shiftDetailsDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setShiftNumber(data.shiftNumber || '1');
        setShiftJrg1Staff(data.jrg1 || { total: 18, active: 12, reserve: 6, commander: 'asp. sztab. Adam Janicki' });
        setShiftJrg2Staff(data.jrg2 || { total: 15, active: 10, reserve: 5, commander: 'st. asp. Janusz Wilk' });
        setShiftJrg3Staff(data.jrg3 || { total: 16, active: 11, reserve: 5, commander: 'asp. Krzysztof Sowa' });
      }
    }, (err) => {
      console.error("Error fetching shift details:", err);
    });
    return unsubscribe;
  }, [userProfile]);

  // Reset unread message badge when chat sidebar is opened
  useEffect(() => {
    if (isChatSidebarOpen) {
      setChatUnreadCount(0);
    }
  }, [isChatSidebarOpen]);

  // Sync out of service list to localStorage
  useEffect(() => {
    localStorage.setItem('swd_out_of_service_kat', JSON.stringify(outOfServiceVehicles));
  }, [outOfServiceVehicles]);

  const activeIncident = incidents.find(i => i.id === selectedIncidentId);

  // 7-day Lock Status Calculation
  const getIncidentLockStatus = (inc) => {
    if (!inc || inc.status !== 'processed') return false;
    const evDateStr = inc.eventDate || (inc.createdAt ? (inc.createdAt.toDate ? inc.createdAt.toDate().toISOString().split('T')[0] : new Date(inc.createdAt).toISOString().split('T')[0]) : null);
    if (!evDateStr) return false;
    const diffTime = Math.abs(new Date() - new Date(evDateStr));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 7;
  };

  const isLocked = activeIncident && getIncidentLockStatus(activeIncident) && !isAdminUnlockBypass;

  // SWD-ST 2.5 keyboard shortcuts support (F2 - New Incident, F3 - Edit Incident, F8 - EWID Report)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F2') {
        e.preventDefault();
        setIsNewIncidentModalOpen(true);
        logAction("Skrót klawiszowy F2: Otwieranie formularza nowej karty zdarzenia.");
      } else if (e.key === 'F3') {
        e.preventDefault();
        if (selectedIncidentId && activeIncident) {
          loadIncidentForEditing();
          logAction(`Skrót klawiszowy F3: Edycja karty zdarzenia ${activeIncident.customId}.`);
        } else {
          alert("Proszę najpierw zaznaczyć zdarzenie w rejestrze wyjazdów.");
        }
      } else if (e.key === 'F8') {
        e.preventDefault();
        if (selectedIncidentId && activeIncident) {
          setIsEwidReportModalOpen(true);
          logAction(`Skrót klawiszowy F8: Otwieranie meldunku EWID-ST dla zdarzenia ${activeIncident.customId}.`);
        } else {
          alert("Proszę najpierw zaznaczyć zdarzenie w rejestrze wyjazdów.");
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIncidentId, activeIncident]);

  // Real-time calculation of validation rules inside EWID dialog
  useEffect(() => {
    if (!activeIncident) return;
    const errs = [];
    const warns = [];

    // Required fields check
    if (!alarmTime) errs.push("Czas alarmowania nie może być pusty.");
    if (!departureTime) errs.push("Brak czasu wyjazdu zastępów.");
    if (!returnTime) errs.push("Brak czasu powrotu w koszarach.");
    if (!customReportNumber || !customReportNumber.trim()) errs.push("Brak wpisanego końcowego numeru meldunku.");

    // Times logical order sequence checks
    if (alarmTime && departureTime && departureTime < alarmTime) {
      errs.push("Czas wyjazdu nie może być wcześniejszy niż alarmowanie.");
    }
    
    // Emergency action type checks
    const isEmerg = (activeIncident.actionType || 'ratownicze') === 'ratownicze';
    
    if (isEmerg) {
      if (!arrivalTime) errs.push("Dla działań ratowniczych wymagany jest czas przyjazdu.");
      if (!localizationTime) errs.push("Dla działań ratowniczych wymagany jest czas zlokalizowania.");
      if (!completionTime) errs.push("Dla działań ratowniczych wymagany jest czas zakończenia.");

      if (departureTime && arrivalTime && arrivalTime < departureTime) {
        errs.push("Czas przybycia nie może być wcześniejszy niż wyjazd.");
      }
      if (arrivalTime && localizationTime && localizationTime < arrivalTime) {
        errs.push("Zlokalizowanie zdarzenia nie może być wcześniejsze niż przyjazd.");
      }
      if (arrivalTime && completionTime && completionTime < arrivalTime) {
        errs.push("Zakończenie działań nie może być wcześniejsze niż przyjazd.");
      }
      if (completionTime && returnTime && returnTime < completionTime) {
        errs.push("Powrót w koszarach nie może być wcześniejszy niż zakończenie.");
      }
    } else {
      if (departureTime && returnTime && returnTime < departureTime) {
        errs.push("Czas powrotu nie może być wcześniejszy niż wyjazd.");
      }
      warns.push("Zdarzenie oznaczone jako NIERATOWNICZE (zwalnia z czasów przybycia i zlokalizowania).");
    }

    if (geocodingStatus === 'red') {
      warns.push("Brak geokodowania adresu zdarzenia (Status czerwony).");
    } else if (geocodingStatus === 'yellow') {
      warns.push("Geokodowanie przybliżone. Brak dokładnego punktu EMUiA.");
    }
    if (!activeIncident.description || activeIncident.description.length < 25) {
      warns.push("Krótki opis działań ratowniczych (Zalecane min. 25 znaków).");
    }
    if (activeIncident.isLongDuration) {
      warns.push("Oznaczone jako zdarzenie długotrwałe. System nie narzuci autouzupełniania czasów powrotu.");
    }

    const crewData = activeIncident.crew || {};
    const vehiclesList = activeIncident.vehicles || [];
    vehiclesList.forEach(v => {
      const vCrew = crewData[v];
      if (!vCrew || !vCrew.dowodca || !vCrew.kierowca) {
        warns.push(`Brak imiennej obsady (dowódca/kierowca) dla: ${v.split(' | ')[1] || v}`);
      }
    });

    if (hasInjuries && (!injuriesDescription || injuriesDescription.length < 10)) {
      errs.push("Wykryto wypadek ratownika, ale opis obrażeń jest zbyt krótki (wymagane min. 10 znaków).");
    }

    setValidationReport({ errors: errs, warnings: warns });
  }, [alarmTime, departureTime, arrivalTime, localizationTime, completionTime, returnTime, customReportNumber, geocodingStatus, activeIncident, hasInjuries, injuriesDescription]);

  // Sync times inputs when selected incident changes
  useEffect(() => {
    if (activeIncident) {
      const times = activeIncident.times || {};
      setAlarmTime(times.alarm || '');
      setDepartureTime(times.departure || '');
      setArrivalTime(times.arrival || '');
      setLocalizationTime(times.localization || '');
      setCompletionTime(times.completion || '');
      setReturnTime(times.return || '');
      setGeocodingStatus(times.geocodingStatus || 'yellow');
      setReportWorkflowState(times.reportWorkflowState || (activeIncident.status === 'processed' ? '3' : '1'));
      setIsPartialReport(times.isPartialReport !== undefined ? times.isPartialReport : true);
      setHasInjuries(times.hasInjuries || false);
      setInjuriesDescription(times.injuriesDescription || '');
      
      const numOnly = activeIncident.reportNumber ? activeIncident.reportNumber.replace(/^[0-9]+-/, '') : '';
      setCustomReportNumber(numOnly);
      setIsAdminUnlockBypass(false);
    } else {
      setAlarmTime('');
      setDepartureTime('');
      setArrivalTime('');
      setLocalizationTime('');
      setCompletionTime('');
      setReturnTime('');
      setGeocodingStatus('yellow');
      setReportWorkflowState('1');
      setCustomReportNumber('');
      setIsPartialReport(true);
      setHasInjuries(false);
      setInjuriesDescription('');
      setIsAdminUnlockBypass(false);
    }
  }, [selectedIncidentId, activeIncident]);

  const logAction = (msg) => {
    const timeStr = new Date().toLocaleTimeString('pl-PL');
    setOperationalLogs(prev => [`[${timeStr}] ${msg}`, ...prev.slice(0, 15)]);
  };

  const logIncidentHistory = async (incId, actionText) => {
    try {
      const incDocRef = doc(db, 'incidents', incId);
      const docSnap = await getDoc(incDocRef);
      if (docSnap.exists()) {
        const history = docSnap.data().eventHistory || [];
        const newEntry = {
          time: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
          user: userProfile?.displayName || userProfile?.email || 'System',
          action: actionText,
          createdAt: new Date().toISOString()
        };
        await updateDoc(incDocRef, {
          eventHistory: [...history, newEntry],
          updatedAt: serverTimestamp()
        });
      }
    } catch (err) {
      console.error("Error logging incident history:", err);
    }
  };

  const getVehicleState = (unitName, vehicleName) => {
    const fullName = `${unitName} | ${vehicleName}`;
    if (outOfServiceVehicles.includes(fullName)) {
      return "Wycofany";
    }

    // Check for active PZR (Zabezpieczenie Rejonu - Page 47) temporary vehicle transfers!
    for (const inc of incidents) {
      if (inc.type === 'pzr' && inc.status !== 'processed' && !inc.isArchived) {
        if (inc.vehicles && inc.vehicles.includes(fullName)) {
          const vStatus = inc.vehicleStatuses?.[fullName] || 0;
          if (vStatus >= 2 && vStatus <= 4) {
            return "Na zabezpieczeniu";
          }
        }
      }
    }

    for (const inc of incidents) {
      const isAssigned = inc.vehicles && inc.vehicles.includes(fullName);
      if (isAssigned) {
        if (inc.status !== 'processed' && !inc.isArchived) {
          const vStatus = inc.vehicleStatuses?.[fullName] || 0;
          if (vStatus === 1) return "Wyjazd";
          if (vStatus === 2) return "Na miejscu";
          if (vStatus === 3) return "Powrót";
          if (vStatus === 4) return "W koszarach";
          return "Zadysponowany";
        }
      }
    }
    return "W koszarach";
  };

  const getJrgReadiness = (jrgName) => {
    const vehicles = UNIT_VEHICLES[jrgName] || [];
    const activeVehicles = vehicles.filter(v => {
      const fullName = `${jrgName} | ${v.name}`;
      return !outOfServiceVehicles.includes(fullName) && !v.outOfService;
    });
    
    if (activeVehicles.length === 0) return { pct: 100, label: "PEŁNA", color: "#40c057" };

    let busyCount = 0;
    activeVehicles.forEach(v => {
      const state = getVehicleState(jrgName, v.name);
      if (state === "Wyjazd" || state === "Na miejscu" || state === "Powrót" || state === "Zadysponowany" || state === "Na zabezpieczeniu") {
        busyCount++;
      }
    });

    const busyPct = (busyCount / activeVehicles.length) * 100;
    const remainingPct = 100 - busyPct;

    if (remainingPct <= 0) {
      return { pct: 0, label: "⚠️ BRAK SIŁ (OSP REJON)", color: "#f03e3e" };
    }
    if (remainingPct <= 50) {
      return { pct: Math.round(remainingPct), label: "OSŁABIONA", color: "#f59f00" };
    }
    return { pct: Math.round(remainingPct), label: "PEŁNA", color: "#40c057" };
  };

  const toggleVehicleOutOfService = (unitName, vehicleName) => {
    if (userProfile?.role !== 'admin' && userProfile?.role !== 'pa_jrg' && userProfile?.role !== 'dyspozytor') return;
    const fullName = `${unitName} | ${vehicleName}`;
    setOutOfServiceVehicles(prev => {
      const isBlocked = prev.includes(fullName);
      const updated = isBlocked ? prev.filter(n => n !== fullName) : [...prev, fullName];
      logAction(`Zastęp ${vehicleName} (${unitName.split(' ')[0]}): ${isBlocked ? 'WPROWADZONY DO PODZIAŁU' : 'WYCOFANY Z PODZIAŁU BOJOWEGO'}`);
      return updated;
    });
  };

  const triggerOspSiren = async (ospName) => {
    setActiveSirens(prev => [...prev, ospName]);
    if (isSystemAudioEnabled) playSynthSound('siren');
    logAction(`Wysłano cyfrowy kod alarmowania DSP-50 dla ${ospName}. Syrena remizy URUCHOMIONA.`);
    
    if (activeIncident) {
      logIncidentHistory(activeIncident.id, `Uruchomiono zdalny selektor syreny DSP-50 dla OSP ${ospName.replace("OSP ", "")}`);
      
      try {
        await updateDoc(doc(db, 'incidents', activeIncident.id), {
          sirenActiveUnit: ospName,
          sirenActiveTime: new Date().toISOString(),
          updatedAt: serverTimestamp()
        });
      } catch (err) {
        console.error("Error updating database for siren wave:", err);
      }
    }

    setTimeout(() => {
      setActiveSirens(prev => prev.filter(name => name !== ospName));
      logAction(`Syrena zewnętrzna OSP ${ospName.replace("OSP ", "")} zakończyła cykl alarmowania (3 sygnały).`);
    }, 8000);
  };

  const triggerDwaPrinter = async (jrgName) => {
    setActiveContextMenuVehicle(null);
    if (isSystemAudioEnabled) playSynthSound('message_beep');
    logAction(`Przesłano cyfrową formatkę wyjazdową do DWA: ${jrgName}.`);
    
    if (activeIncident) {
      logIncidentHistory(activeIncident.id, `Przesłano formatkę wyjazdową do systemu DWA (Drukarka Wyjazdowa) dla jednostki ${jrgName}`);
      setPrintPreviewMode('dwa');
    }
  };

  // Auth Handlers
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setFormLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      logAction(`Zalogowano użytkownika: ${email}`);
    } catch (err) {
      console.error(err);
      setError(getFriendlyErrorMessage(err.code));
    } finally {
      setFormLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!cityName) {
      setError('Wybierz komendę z listy.');
      return;
    }
    setError('');
    setFormLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      await updateProfile(userCredential.user, {
        displayName: displayName || email.split('@')[0]
      });

      const batch = writeBatch(db);
      
      batch.set(doc(db, 'users', uid), {
        uid,
        email,
        displayName: displayName || email.split('@')[0],
        role: 'dyspozytor',
        tenantId: cityName,
        createdAt: serverTimestamp()
      });

      await batch.commit();
      
      logAction(`Zarejestrowano nowe konto: ${email} i przypisano do komendy: ${cityName}`);
      setFormLoading(false);
    } catch (err) {
      setError(getFriendlyErrorMessage(err.code));
      setFormLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setSelectedIncidentId(null);
      resetForm();
      logAction("Użytkownik wylogowany z konsoli.");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  // Location input autocompletion logic for recommended JRG selection
  const handleLocationChange = (val) => {
    setLocation(val);
    const norm = val.toLowerCase();
    
    // SPA Geocoding precision calculation (Page 55)
    let geoState = 'red';
    if (val.trim().length > 3) {
      const matchKatalog = KATALOG_OBIEKTOW.find(ob => norm.includes(ob.name.toLowerCase()));
      if (matchKatalog) {
        geoState = 'blue';
      } else if (/\d/.test(val)) {
        geoState = 'green'; // EMUiA Exact Address point
      } else {
        geoState = 'yellow'; // Street or City level only
      }
    }
    setGeocodingStatus(geoState);
    
    let suggested = null;
    if (norm.includes("szopienic") || norm.includes("dąbrówk") || norm.includes("dabrowk") || norm.includes("janów") || norm.includes("janow") || norm.includes("giszowiec") || norm.includes("nikiszowiec") || norm.includes("szopienick")) {
      suggested = "JRG 1";
    } else if (norm.includes("piotrowic") || norm.includes("kostuchn") || norm.includes("podles") || norm.includes("zarzecz") || norm.includes("ligot") || norm.includes("panewnik") || norm.includes("piotrowick")) {
      suggested = "JRG 2";
    } else if (norm.includes("centrum") || norm.includes("bogucic") || norm.includes("zawodzi") || norm.includes("koszutk") || norm.includes("wełnowiec") || norm.includes("welnowiec") || norm.includes("korfant") || norm.includes("mariack") || norm.includes("dworco")) {
      suggested = "JRG 3";
    }
    
    if (suggested) {
      setTargetJrg(suggested);
    }
  };

  // Create or Update Incident Draft
  const handleSaveIncident = async (status) => {
    if (userProfile?.role !== 'kdr_osp' && userProfile?.role !== 'admin' && userProfile?.role !== 'dyspozytor') {
      alert('Brak uprawnień do zapisu.');
      return;
    }

    if (!location.trim() || !description.trim()) {
      alert('Proszę wypełnić lokalizację i opis zdarzenia.');
      return;
    }

    const currentYear = new Date().getFullYear();
    const sequenceNumber = String(incidents.length + 4801).padStart(4, '0');
    
    // Używamy miasta jako wskaźnika tenant'a jeśli jest potrzebny, na tę chwilę bierzemy "Katowice"
    const prefix = getJrgPrefix(targetJrg, tenantName);
    const customId = `${prefix}-${sequenceNumber}`;

    const servicesList = notifiedServices.join(', ');

    // SWD-ST 2.5: 'bl' (Błąd) and 'af' (Alarm fałszywy) auto-fill completion time
    const isErrorOrFalseAlarm = incidentType === 'bl' || incidentType === 'af';
    const nowTimeStr = new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });

    const incidentData = {
      ospUnit: userProfile?.role === 'kdr_osp' ? userProfile.ospUnit : OSP_UNITS[0],
      kdrName: userProfile?.displayName || userProfile?.email || 'Dowódca',
      location,
      gminaStr,
      miejscowoscStr,
      obiektStr,
      callerNameStr,
      callerPhoneStr,
      callerAddressStr,
      notifiedServices,
      servicesList,
      coordX,
      coordY,
      type: incidentType,
      targetUnitDocelowa: incidentType === 'pzr' ? targetUnitDocelowa : '',
      actionType,
      eventDate: incidentDateStr,
      description,
      vehicles: incidentType === 'bl' ? [] : selectedVehicles, // BL cannot have vehicle dispatches
      vehicleStatuses: incidentType === 'bl' ? {} : (editingIncidentId ? (incidents.find(i => i.id === editingIncidentId)?.vehicleStatuses || {}) : {}),
      firefightersCount: parseInt(firefightersCount, 10),
      equipmentUsed: equipmentUsed.trim(),
      targetJrg, 
      prefix,
      isLongDuration,
      sopSteps,
      subtype: incidentSubtype,
      flags: incidentFlags,
      times: {
        alarm: alarmTime || incidentTimeStr.substring(0, 5),
        departure: departureTime || '',
        arrival: arrivalTime || '',
        localization: localizationTime || '',
        completion: isErrorOrFalseAlarm ? nowTimeStr : (completionTime || ''),
        return: returnTime || '',
        geocodingStatus,
        reportWorkflowState: isErrorOrFalseAlarm ? '3' : '1', // Auto-approved if error
        isPartialReport: !isErrorOrFalseAlarm,
        hasInjuries,
        injuriesDescription: hasInjuries ? injuriesDescription.trim() : ''
      },
      reportNumber: '',
      status: isErrorOrFalseAlarm ? 'processed' : status, 
      isArchived: false,
      updatedAt: serverTimestamp()
    };

    try {
      let docId;
      if (editingIncidentId) {
        await updateDoc(doc(db, 'incidents', editingIncidentId), incidentData);
        docId = editingIncidentId;
        logIncidentHistory(editingIncidentId, "Zaktualizowano kartę zgłoszenia.");
        logAction(`Zaktualizowano zgłoszenie ${customId}`);
      } else {
        const docRef = await addDoc(collection(db, 'incidents'), {
          tenantId: userProfile?.tenantId || '',
          ...incidentData,
          customId,
          createdAt: serverTimestamp()
        });
        docId = docRef.id;
        logIncidentHistory(docRef.id, "Utworzono nową kartę zdarzenia (Szkic).");
        logAction(`Dodano zgłoszenie ${customId} do bufora.`);
      }
      
      resetForm();
      setIsNewIncidentModalOpen(false);

      // Handle WCPR call closing separately so it doesn't block incident creation if rules fail
      if (!editingIncidentId && activeCallToAnswer) {
        try {
          await updateDoc(doc(db, 'calls', activeCallToAnswer.id), {
            status: 'accepted'
          });
        } catch (callErr) {
          console.error('Błąd aktualizacji statusu zgłoszenia WCPR:', callErr);
          // Don't alert here to avoid confusing the user, the incident was created.
        }
        setActiveCallToAnswer(null);
      }

    } catch (err) {
      console.error('Firestore Write Error:', err);
      alert('Błąd zapisu w Firestore (Zdarzenie): ' + err.message);
    }
  };

  const loadIncidentForEditing = () => {
    if (!activeIncident) return;
    if (activeIncident.status === 'processed' && !isAdminUnlockBypass) return;
    setEditingIncidentId(activeIncident.id);
    setLocation(activeIncident.location || '');
    setGminaStr(activeIncident.gminaStr || `m. ${tenantName}`);
    setMiejscowoscStr(activeIncident.miejscowoscStr || tenantName);
    setObiektStr(activeIncident.obiektStr || '');
    setCallerNameStr(activeIncident.callerNameStr || '');
    setCallerPhoneStr(activeIncident.callerPhoneStr || '');
    setCallerAddressStr(activeIncident.callerAddressStr || '');
    setNotifiedServices(activeIncident.notifiedServices || ['PRM', 'Policja']);
    setCoordX(activeIncident.coordX || '19.023');
    setCoordY(activeIncident.coordY || '50.264');

    setIncidentType(activeIncident.type);
    setTargetUnitDocelowa(activeIncident.targetUnitDocelowa || JRG_UNITS[1]);
    setActionType(activeIncident.actionType || 'ratownicze');
    setIncidentDateStr(activeIncident.eventDate || new Date().toISOString().split('T')[0]);
    setDescription(activeIncident.description);
    setTargetJrg(activeIncident.targetJrg || JRG_UNITS[0]);
    setFirefightersCount(activeIncident.firefightersCount || 6);
    setEquipmentUsed(activeIncident.equipmentUsed || '');
    setSelectedVehicles(activeIncident.vehicles || []);
    setIsLongDuration(activeIncident.isLongDuration || false);
    setSopSteps(activeIncident.sopSteps || []);
    
    const times = activeIncident.times || {};
    setAlarmTime(times.alarm || '');
    setDepartureTime(times.departure || '');
    setArrivalTime(times.arrival || '');
    setLocalizationTime(times.localization || '');
    setCompletionTime(times.completion || '');
    setReturnTime(times.return || '');
    setGeocodingStatus(times.geocodingStatus || 'yellow');
    setHasInjuries(times.hasInjuries || false);
    setInjuriesDescription(times.injuriesDescription || '');
    
    setIsNewIncidentModalOpen(true);
  };

  const resetForm = () => {
    setLocation('');
    setGminaStr(`m. ${tenantName}`);
    setMiejscowoscStr(tenantName);
    setObiektStr('');
    setCallerNameStr('');
    setCallerPhoneStr('');
    setCallerAddressStr('');
    setNotifiedServices(['PRM', 'Policja']);
    setCoordX('19.023');
    setCoordY('50.264');

    setIncidentType('mz');
    setTargetUnitDocelowa(JRG_UNITS[1]);
    setActionType('ratownicze');
    setIncidentDateStr(new Date().toISOString().split('T')[0]);
    setIncidentTimeStr(new Date().toLocaleTimeString('pl-PL'));
    setDescription('');
    setTargetJrg(JRG_UNITS[0]);
    setFirefightersCount(6);
    setEquipmentUsed('');
    setSelectedVehicles([]);
    setIsLongDuration(false);
    setSopSteps([]);
    setEditingIncidentId(null);
    setIsAdminUnlockBypass(false);
    setHasInjuries(false);
    setInjuriesDescription('');
  };

  const handleDeleteIncident = async () => {
    if (!activeIncident) return;
    if (userProfile?.role !== 'admin' && userProfile?.role !== 'dyspozytor' && (userProfile?.role !== 'kdr_osp' || activeIncident.status !== 'draft')) {
      alert("Brak uprawnień do usunięcia tego zdarzenia.");
      return;
    }
    if (!window.confirm("Czy na pewno chcesz usunąć to zdarzenie z bufora?")) return;

    try {
      await deleteDoc(doc(db, 'incidents', activeIncident.id));
      logAction(`Usunięto zdarzenie ${activeIncident.customId}`);
      setSelectedIncidentId(null);
    } catch (err) {
      console.error("Error deleting incident:", err);
      alert("Błąd podczas usuwania zdarzenia.");
    }
  };

  const handleSystemReset = async () => {
    if (!window.confirm("UWAGA! Ta operacja bezpowrotnie usunie wszystkie zarejestrowane zdarzenia i połączenia z bazy danych oraz zresetuje punkty w trybie gry. Czy na pewno chcesz wyczyścić bazę danych i rozpocząć nową służbę od nowa?")) {
      return;
    }

    try {
      logAction("Rozpoczęto pełne czyszczenie bazy danych...");
      
      // 1. Delete all incidents
      const incidentsSnapshot = await getDocs(collection(db, 'incidents'));
      const incidentDeletes = incidentsSnapshot.docs.map(d => deleteDoc(doc(db, 'incidents', d.id)));
      await Promise.all(incidentDeletes);

      // 2. Delete all calls
      const callsSnapshot = await getDocs(collection(db, 'calls'));
      const callDeletes = callsSnapshot.docs.map(d => deleteDoc(doc(db, 'calls', d.id)));
      await Promise.all(callDeletes);

      // 3. Clear score and active state
      localStorage.removeItem('swd_game_score');
      setGameScore(0);
      setSelectedIncidentId(null);
      
      // 4. Log reset
      logAction("Baza danych została pomyślnie zresetowana. Rozpoczęto nową służbę.");
      alert("Inicjalizacja zakończona! Wszystkie dane zostały wyczyszczone. Możesz grać od nowa.");
    } catch (err) {
      console.error("Error resetting system databases:", err);
      alert("Wystąpił błąd podczas resetowania bazy danych: " + err.message);
    }
  };

  // Dispatch additional units
  const addVehicleToActiveIncident = async (vString) => {
    if (!activeIncident) return;
    if (userProfile?.role !== 'admin' && userProfile?.role !== 'pa_jrg' && activeRole !== 'dyspozytor') {
      alert("Brak uprawnień do dysponowania (Wymagany profil Dyspozytora).");
      return;
    }
    
    const currentVehicles = activeIncident.vehicles || [];
    if (currentVehicles.includes(vString)) {
      alert("Pojazd jest już zadysponowany.");
      return;
    }

    try {
      const updated = [...currentVehicles, vString];
      await updateDoc(doc(db, 'incidents', activeIncident.id), {
        vehicles: updated,
        updatedAt: serverTimestamp()
      });
      logIncidentHistory(activeIncident.id, `Zadysponowano zastęp do akcji: ${vString.split(' | ')[1] || vString}`);
      logAction(`Zadysponowano zastęp do akcji: ${vString}`);
    } catch (err) {
      console.error(err);
    }
  };

  // Remove vehicle from active incident
  const removeVehicleFromActiveIncident = async (vString) => {
    if (!activeIncident) return;
    if (userProfile?.role !== 'admin' && userProfile?.role !== 'pa_jrg' && activeRole !== 'dyspozytor') return;

    const currentVehicles = activeIncident.vehicles || [];
    try {
      const updated = currentVehicles.filter(v => v !== vString);
      await updateDoc(doc(db, 'incidents', activeIncident.id), {
        vehicles: updated,
        updatedAt: serverTimestamp()
      });
      logIncidentHistory(activeIncident.id, `Wycofano zastęp z akcji: ${vString.split(' | ')[1] || vString}`);
      logAction(`Wycofano zastęp z akcji: ${vString}`);
    } catch (err) {
      console.error(err);
    }
  };

  // Approve EWID and operational times
  const handleSaveTimesAndApprove = async () => {
    if (!activeIncident) return;
    if (userProfile?.role !== 'admin' && userProfile?.role !== 'pa_jrg' && userProfile?.role !== 'dyspozytor') {
      alert("Brak uprawnień.");
      return;
    }

    if (!isPartialReport) {
      if (validationReport.errors.length > 0) {
        alert("BŁĄD WALIDACJI MELDUNKU:\n\n" + validationReport.errors.join("\n") + "\n\nNie można zatwierdzić kompletnego meldunku z błędami.");
        return;
      }
    } else {
      if (!departureTime || !customReportNumber.trim()) {
        alert("Wymagany jest czas wyjazdu oraz numer rejestru meldunków.");
        return;
      }
    }

    const fullReportNumber = `${activeIncident.prefix || getJrgPrefix(activeIncident.targetJrg)}${customReportNumber}`;
    
    const updatedTimes = {
      alarm: alarmTime || activeIncident.times?.alarm || '',
      departure: departureTime,
      arrival: arrivalTime || '',
      localization: localizationTime || '',
      completion: completionTime || '',
      return: returnTime || '',
      geocodingStatus,
      reportWorkflowState: isPartialReport ? '1' : '3',
      isPartialReport,
      hasInjuries,
      injuriesDescription: hasInjuries ? injuriesDescription.trim() : ''
    };

    try {
      await updateDoc(doc(db, 'incidents', activeIncident.id), {
        times: updatedTimes,
        reportNumber: fullReportNumber,
        status: isPartialReport ? 'submitted' : 'processed',
        isArchived: !isPartialReport, // Automatically archive if it's complete
        updatedAt: serverTimestamp()
      });
      logIncidentHistory(activeIncident.id, isPartialReport ? `Zapisano meldunek częściowy nr ${fullReportNumber}.` : `Zatwierdzono meldunek kompletny nr ${fullReportNumber}. Przeniesiono do archiwum.`);
      logAction(`Meldunek EWID nr ${fullReportNumber} zapisany jako: ${isPartialReport ? 'CZĘŚCIOWY' : 'KOMPLETNY (Zarchiwizowany)'}`);
      setIsEwidReportModalOpen(false);
      setSelectedIncidentId(null);
    } catch (err) {
      console.error(err);
      alert("Błąd zapisu w Firestore.");
    }
  };

  // Archive Incident in registry
  const handleArchiveIncident = async () => {
    if (!activeIncident) return;
    if (userProfile?.role !== 'admin' && userProfile?.role !== 'pa_jrg' && userProfile?.role !== 'dyspozytor') {
      alert("Tylko PA JRG lub Administrator może archiwizować karty zdarzeń.");
      return;
    }

    try {
      await updateDoc(doc(db, 'incidents', activeIncident.id), {
        isArchived: true,
        updatedAt: serverTimestamp()
      });
      logIncidentHistory(activeIncident.id, "Przeniesiono meldunek do archiwum.");
      logAction(`Zdarzenie ${activeIncident.customId} zostało przeniesione do archiwum.`);
      setSelectedIncidentId(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Restore Incident from archive
  const handleRestoreIncident = async () => {
    if (!activeIncident) return;
    if (userProfile?.role !== 'admin' && userProfile?.role !== 'pa_jrg' && userProfile?.role !== 'dyspozytor') return;

    try {
      await updateDoc(doc(db, 'incidents', activeIncident.id), {
        isArchived: false,
        updatedAt: serverTimestamp()
      });
      logIncidentHistory(activeIncident.id, "Przywrócono meldunek z archiwum.");
      logAction(`Przywrócono zdarzenie ${activeIncident.customId} do bufora bieżącego.`);
    } catch (err) {
      console.error(err);
    }
  };

  // Simulates report workflow state changes
  const handleWorkflowTransition = async (nextCode) => {
    if (!activeIncident) return;
    if (userProfile?.role !== 'admin' && userProfile?.role !== 'pa_jrg' && userProfile?.role !== 'dyspozytor') return;

    try {
      const updatedTimes = {
        ...(activeIncident.times || {}),
        reportWorkflowState: nextCode
      };
      
      let nextStatus = activeIncident.status;
      if (nextCode === '3') {
        nextStatus = 'processed';
      } else if (nextCode === '1') {
        nextStatus = 'submitted';
      }

      await updateDoc(doc(db, 'incidents', activeIncident.id), {
        times: updatedTimes,
        status: nextStatus,
        updatedAt: serverTimestamp()
      });
      logIncidentHistory(activeIncident.id, `Zmieniono status obiegu na: kod ${nextCode} (${WORKFLOW_STATES[nextCode]}).`);
      logAction(`Obieg meldunku -> Zmiana kodu statusu na: ${nextCode} (${WORKFLOW_STATES[nextCode]})`);
    } catch (err) {
      console.error(err);
    }
  };

  // Crew Editor & mileage metrics save
  const handleSaveCrew = async () => {
    if (!activeIncident || !crewTargetVehicle) return;
    
    const updatedCrew = {
      ...(activeIncident.crew || {}),
      [crewTargetVehicle]: {
        dowodca: crewDowodca.trim(),
        kierowca: crewKierowca.trim(),
        ratownicy: crewRatownicy.trim()
      }
    };

    const updatedMetrics = {
      ...(activeIncident.vehicleMetrics || {}),
      [crewTargetVehicle]: {
        km: parseFloat(crewKm) || 0,
        fuel: parseFloat(crewFuel) || 0
      }
    };

    try {
      await updateDoc(doc(db, 'incidents', activeIncident.id), {
        crew: updatedCrew,
        vehicleMetrics: updatedMetrics,
        updatedAt: serverTimestamp()
      });
      logIncidentHistory(activeIncident.id, `Zaktualizowano obsadę i metryki (km/paliwo) dla: ${crewTargetVehicle.split(' | ')[1] || crewTargetVehicle}`);
      logAction(`Zaktualizowano obsadę i kilometry dla: ${crewTargetVehicle.split(' | ')[1] || crewTargetVehicle}`);
      setIsCrewModalOpen(false);
    } catch (err) {
      console.error(err);
      alert("Błąd zapisu obsady.");
    }
  };

  // Linked Calls open & save
  const openLinkCallModal = () => {
    setLinkedCallerName('');
    setLinkedCallerPhone('');
    setLinkedCallText('');
    setLinkedCallTime(new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }));
    setIsLinkedCallModalOpen(true);
  };

  const handleLinkCall = async () => {
    if (!activeIncident) return;
    if (!linkedCallerName.trim() || !linkedCallText.trim()) {
      alert("Proszę wpisać nazwę zgłaszającego i opis zgłoszenia.");
      return;
    }

    const newCall = {
      callerName: linkedCallerName.trim(),
      phone: linkedCallerPhone.trim(),
      time: linkedCallTime,
      text: linkedCallText.trim(),
      createdAt: new Date().toISOString()
    };

    const updatedCalls = [
      ...(activeIncident.linkedCalls || []),
      newCall
    ];

    try {
      await updateDoc(doc(db, 'incidents', activeIncident.id), {
        linkedCalls: updatedCalls,
        updatedAt: serverTimestamp()
      });
      logIncidentHistory(activeIncident.id, `Podpięto zgłoszenie wtórne od: ${linkedCallerName}`);
      logAction(`Podpięto zgłoszenie wtórne od: ${linkedCallerName}`);
      setIsLinkedCallModalOpen(false);
    } catch (err) {
      console.error(err);
      alert("Błąd zapisu zgłoszenia wtórnego.");
    }
  };

  // Roster Shift Crew (Obsada SKKM) save
  const handleSaveShift = async () => {
    try {
      await setDoc(doc(db, 'metadata', 'shift'), {
        do: shiftDo,
        pdo: shiftPdo,
        disp: shiftDisp,
        updatedAt: serverTimestamp()
      }, { merge: true });
      logAction("Zaktualizowano obsadę służbową Dyspozytornia.");
      alert("Obsada służbowa SKKM zapisana pomyślnie.");
    } catch (err) {
      console.error("Error saving shift roster:", err);
      alert("Błąd zapisu obsady SKKM.");
    }
  };

  // Save Shift details personnel statistics
  const handleSaveShiftDetails = async () => {
    try {
      await setDoc(doc(db, 'metadata', 'shift_details'), {
        shiftNumber,
        jrg1: shiftJrg1Staff,
        jrg2: shiftJrg2Staff,
        jrg3: shiftJrg3Staff,
        updatedAt: serverTimestamp()
      }, { merge: true });
      logAction("Zaktualizowano stany osobowe zmian bojowych JRG.");
      alert("Stany osobowe zmian bojowych JRG zapisane pomyślnie.");
    } catch (err) {
      console.error("Error saving shift details:", err);
      alert("Błąd zapisu stanów osobowych.");
    }
  };

  // Perform Shift Change / HANDOVER (Otwarcie nowej zmiany - Page 34)
  const handlePerformShiftTransition = async () => {
    try {
      const batch = writeBatch(db);
      
      // Update roster metadata in Firestore using set with merge to ensure auto-creation
      const shiftDetailsDocRef = doc(db, 'metadata', 'shift_details');
      batch.set(shiftDetailsDocRef, {
        shiftNumber,
        jrg1: shiftJrg1Staff,
        jrg2: shiftJrg2Staff,
        jrg3: shiftJrg3Staff,
        absentUrlop,
        absentChorzy,
        absentDelegacja,
        absentWakat,
        absentWolna,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Clear vehicle statuses and nominal crews for current active incidents to simulate shift transition
      incidents.forEach(inc => {
        if (inc.status !== 'processed' && !inc.isArchived) {
          const incRef = doc(db, 'incidents', inc.id);
          batch.update(incRef, {
            crew: {}, // Reset imienne obsady (Page 34)
            vehicleStatuses: {}, // Reset wozów statuses
            eventHistory: [
              ...(inc.eventHistory || []),
              {
                time: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
                user: userProfile?.displayName || userProfile?.email || 'System',
                action: 'Wyzerowano obsadę i statusy wozów w związku z Otwarciem Nowej Zmiany.',
                createdAt: new Date().toISOString()
              }
            ]
          });
        }
      });

      await batch.commit();
      logAction(`Otwarto nową zmianę służbową (Zmiana ${shiftNumber}). Wyzerowano obsady i statusy zastępów.`);
      setIsShiftTransitionModalOpen(false);
      alert(`Pomyślnie otwarto nową zmianę służbową (Zmiana ${shiftNumber}). Obsady zastępów zostały wyzerowane.`);
    } catch (err) {
      console.error("Error performing shift transition:", err);
      alert("Błąd podczas otwierania nowej zmiany.");
    }
  };

  // Digital vehicle status radios (ST 1-5) auto-fill times logic
  const handleSetVehicleStatus = async (vStr, statusNum) => {
    if (!activeIncident) return;
    
    // Bug Fixed: Allow any authenticated player in the game room to set status
    if (!user) {
      alert("Musisz być zalogowany, aby nadać status.");
      return;
    }

    // Close the context menu immediately
    setActiveContextMenuVehicle(null);

    const currentStatuses = activeIncident.vehicleStatuses || {};
    const updatedStatuses = {
      ...currentStatuses,
      [vStr]: statusNum
    };

    // Store state transition timestamp to synchronize live travel animations
    const currentStatusTimes = activeIncident.vehicleStatusTimes || {};
    const updatedStatusTimes = {
      ...currentStatusTimes,
      [vStr]: new Date().toISOString()
    };

    const currentTimes = activeIncident.times || {};
    const nowTimeStr = new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
    const updatedTimes = { ...currentTimes };

    const statusLabels = {
      0: 'Dysponowanie (ST1)',
      1: 'Wyjazd do akcji',
      2: 'Na miejscu zdarzenia',
      3: 'Zakończenie działań',
      4: 'Powrót do bazy'
    };
    const label = typeof statusNum === 'string' ? statusNum : (statusLabels[statusNum] || `ST ${statusNum}`);

    if ((statusNum === 0 || statusNum === 1 || statusNum === 'Wyjazd do akcji') && !updatedTimes.departure) {
      updatedTimes.departure = nowTimeStr;
    } else if ((statusNum === 2 || statusNum === 'Na miejscu zdarzenia') && !updatedTimes.arrival) {
      updatedTimes.arrival = nowTimeStr;
    } else if ((statusNum === 3 || statusNum === 'Zakończenie działań') && !updatedTimes.completion) {
      updatedTimes.completion = nowTimeStr;
    } else if ((statusNum === 4 || statusNum === 'Powrót do bazy') && !updatedTimes.return) {
      updatedTimes.return = nowTimeStr;
    }

    try {
      const statusLabels = {
        1: "WYJAZD (ST 1)",
        2: "NA MIEJSCU (ST 2)",
        3: "ZAKOŃCZENIE DZIAŁAŃ/POWRÓT (ST 3)",
        4: "W KOSZARACH (ST 4)"
      };
      
      const newRadioLog = {
        time: nowTimeStr + ':' + new Date().getSeconds().toString().padStart(2, '0'),
        from: vStr.split(' | ')[1] || vStr,
        to: "Dyspozytornia",
        text: `Zgłaszam status radiowy: ${statusLabels[statusNum]}`,
        channel: "K01 - Kanał Powiatowy",
        createdAt: new Date().toISOString()
      };
      const updatedLogs = [...(activeIncident.radioLogs || []), newRadioLog];

      await updateDoc(doc(db, 'incidents', activeIncident.id), {
        vehicleStatuses: updatedStatuses,
        vehicleStatusTimes: updatedStatusTimes,
        times: updatedTimes,
        radioLogs: updatedLogs,
        updatedAt: serverTimestamp()
      });
      
      logIncidentHistory(activeIncident.id, `Zastęp ${vStr.split(' | ')[1] || vStr} zmienił stan radiowy na: ${statusLabels[statusNum]}`);
      logAction(`Zastęp ${vStr.split(' | ')[1] || vStr}: status radiowy -> STATUS ${statusNum} (${statusLabels[statusNum]})`);
    } catch (err) {
      console.error("Error setting vehicle status:", err);
      alert("Błąd podczas zapisywania statusu w bazie danych: " + err.message);
    }
  };

  // SOP procedures toggler
  const handleToggleSopStep = async (stepText) => {
    if (!activeIncident) return;
    
    // Close context menu if open
    setActiveContextMenuVehicle(null);

    const currentSteps = activeIncident.sopSteps || [];
    let updatedSteps;
    let actionLabel;
    
    if (currentSteps.includes(stepText)) {
      updatedSteps = currentSteps.filter(s => s !== stepText);
      actionLabel = `KDR anulował wykonanie kroku SOP: ${stepText}`;
    } else {
      updatedSteps = [...currentSteps, stepText];
      actionLabel = `KDR potwierdził wykonanie kroku SOP: ${stepText}`;
    }

    try {
      await updateDoc(doc(db, 'incidents', activeIncident.id), {
        sopSteps: updatedSteps,
        updatedAt: serverTimestamp()
      });
      logIncidentHistory(activeIncident.id, actionLabel);
      logAction(actionLabel);
    } catch (err) {
      console.error("Error toggling SOP step:", err);
      alert("Błąd podczas zapisywania procedury SOP: " + err.message);
    }
  };

  // Returns vehicle to home base from PZR temporary secure location (Page 47)
  const handleReturnPzrVehicle = async (vStr) => {
    if (!activeIncident) return;
    try {
      setActiveContextMenuVehicle(null);
      await logIncidentHistory(activeIncident.id, `Zakończono tymczasowe zabezpieczenie rejonu dla zastępu: ${vStr.split(' | ')[1] || vStr} (Zwróć sprzęt)`);
      logAction(`Zabezpieczenie rejonu -> Zwrócono zastęp ${vStr.split(' | ')[1] || vStr} do jednostki macierzystej.`);
      
      // Set vehicle status to ST 5 (koszary) and remove it from PZR incident
      const currentStatuses = activeIncident.vehicleStatuses || {};
      const updatedStatuses = { ...currentStatuses, [vStr]: 5 };
      const currentVehicles = activeIncident.vehicles || [];
      const updatedVehicles = currentVehicles.filter(v => v !== vStr);
      
      await updateDoc(doc(db, 'incidents', activeIncident.id), {
        vehicleStatuses: updatedStatuses,
        vehicles: updatedVehicles,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Error returning secure vehicle:", err);
    }
  };

  // Koryguj stan zapasów środków gaśniczych (Page 25)
  const handleUpdateAgentStock = (jrg, name, newVal) => {
    setAgentsInventory(prev => {
      const list = prev[jrg] || [];
      const updated = list.map(item => {
        if (item.name === name) {
          return { ...item, current: parseFloat(newVal) || 0 };
        }
        return item;
      });
      logAction(`Korekta zapasów ${jrg}: ${name} -> ${newVal} kg`);
      return { ...prev, [jrg]: updated };
    });
  };

  // Scalanie zdarzeń (Chapter 8.8 - Str. 64 instrukcji)
  const handleMergeIncidents = async (sourceIncidentId) => {
    if (!activeIncident || !sourceIncidentId) return;
    const sourceInc = incidents.find(i => i.id === sourceIncidentId);
    if (!sourceInc) return;

    if (!window.confirm(`Czy na pewno chcesz scalić zdarzenie ${sourceInc.customId} do zdarzenia ${activeIncident.customId}? Zastępy i korespondencja zostaną scalone.`)) return;

    try {
      const batch = writeBatch(db);
      
      // Merge vehicles list
      const targetVehicles = activeIncident.vehicles || [];
      const sourceVehicles = sourceInc.vehicles || [];
      const mergedVehicles = [...targetVehicles, ...sourceVehicles.filter(v => !targetVehicles.includes(v))];

      // Merge radio logs
      const targetLogs = activeIncident.radioLogs || [];
      const sourceLogs = sourceInc.radioLogs || [];
      const mergedLogs = [...targetLogs, ...sourceLogs].sort((a, b) => a.time.localeCompare(b.time));

      // Merge linked calls
      const targetCalls = activeIncident.linkedCalls || [];
      const sourceCalls = sourceInc.linkedCalls || [];
      const mergedCalls = [...targetCalls, ...sourceCalls];

      // Merge vehicle status mapping
      const targetStatuses = activeIncident.vehicleStatuses || {};
      const sourceStatuses = sourceInc.vehicleStatuses || {};
      const mergedStatuses = { ...targetStatuses, ...sourceStatuses };

      // Update target incident
      const targetRef = doc(db, 'incidents', activeIncident.id);
      batch.update(targetRef, {
        vehicles: mergedVehicles,
        radioLogs: mergedLogs,
        linkedCalls: mergedCalls,
        vehicleStatuses: mergedStatuses,
        eventHistory: [
          ...(activeIncident.eventHistory || []),
          {
            time: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
            user: userProfile?.displayName || userProfile?.email || 'System',
            action: `Scalono zdarzenie ID ${sourceInc.customId} do niniejszej karty. Przeniesiono zastępy i logi radiowe.`,
            createdAt: new Date().toISOString()
          }
        ],
        updatedAt: serverTimestamp()
      });

      // Close merged incident and archive it
      const sourceRef = doc(db, 'incidents', sourceInc.id);
      batch.update(sourceRef, {
        status: 'processed',
        isArchived: true,
        reportNumber: `SCALONE-${activeIncident.customId}`,
        description: `${sourceInc.description}\n\n[Zdarzenie scalone ze zdarzeniem ${activeIncident.customId}]`,
        eventHistory: [
          ...(sourceInc.eventHistory || []),
          {
            time: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
            user: userProfile?.displayName || userProfile?.email || 'System',
            action: `Zdarzenie scalone do zdarzenia ${activeIncident.customId}. Karta zamknięta.`,
            createdAt: new Date().toISOString()
          }
        ],
        updatedAt: serverTimestamp()
      });

      await batch.commit();
      logAction(`Scalono zdarzenie ${sourceInc.customId} do ${activeIncident.customId}.`);
      setIsMergeModalOpen(false);
      alert(`Zdarzenie ${sourceInc.customId} zostało pomyślnie scalone ze zdarzeniem ${activeIncident.customId}.`);
    } catch (err) {
      console.error("Error merging incidents:", err);
      alert("Błąd podczas scalania zdarzeń.");
    }
  };

  // Przekazywanie zdarzenia (Rozdz. 8.9)
  const handleTransferIncident = async (targetTenantId) => {
    if (!activeIncident || !targetTenantId) return;
    try {
      const incRef = doc(db, 'incidents', activeIncident.id);
      await updateDoc(incRef, {
        tenantId: targetTenantId,
        isFriendly: true, // Mark it friendly from the perspective of original owner if needed (or let new owner handle it)
        updatedAt: serverTimestamp()
      });
      logAction(`Przekazano zdarzenie ${activeIncident.customId} do dyspozytora: ${targetTenantId}.`);
      setIsTransferModalOpen(false);
      setContextMenu(null);
      alert(`Zdarzenie ${activeIncident.customId} zostało pomyślnie przekazane.`);
    } catch (err) {
      console.error("Error transferring incident:", err);
      alert("Błąd podczas przekazywania zdarzenia.");
    }
  };

  // Zakończenie działań (Context Menu)
  const handleFinishIncident = async (incidentId) => {
    alert("Zgodnie z procedurą SWD, zakończenie zdarzenia wymaga wypełnienia Meldunku (F8) w module EWID.");
    setSelectedIncidentId(incidentId);
    setIsEwidReportModalOpen(true);
  };

  // Radio logs quick template autofill

  // Messenger send chat messages with priority and target recipients (Chapter 10)
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInputText.trim()) return;

    const senderUnit = userProfile?.role === 'kdr_osp' ? userProfile?.ospUnit : userProfile?.role === 'pa_jrg' ? userProfile?.jrgUnit : 'KM/KP PSP (Admin)';
    
    try {
      await addDoc(collection(db, 'messages'), {
        tenantId: userProfile?.tenantId || '',
        sender: userProfile?.displayName || userProfile?.email || 'Anonim',
        senderRole: userProfile?.role || 'user',
        senderUnit,
        text: chatInputText.trim(),
        priority: msgPriority,
        recipient: msgRecipient,
        confirmations: {},
        createdAt: serverTimestamp()
      });
      setChatInputText('');
      setMsgPriority('normal');
      setMsgRecipient('Wszyscy');
      logAction("Wysłano komunikat systemowy.");
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  // Confirm receipt of message (Chapter 10)
  const handleConfirmMessage = async (msgId) => {
    try {
      const msgDocRef = doc(db, 'messages', msgId);
      const targetUnit = userProfile?.role === 'kdr_osp' ? userProfile?.ospUnit : userProfile?.role === 'pa_jrg' ? userProfile?.jrgUnit : 'KM/KP PSP (Admin)';
      
      const docSnap = await getDoc(msgDocRef);
      if (docSnap.exists()) {
        const confirmations = docSnap.data().confirmations || {};
        const updated = {
          ...confirmations,
          [targetUnit]: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
        };
        await updateDoc(msgDocRef, { confirmations: updated });
        logAction(`Potwierdzono odbiór komunikatu systemowego.`);
        
        // Remove from local active popups list
        setActivePopups(prev => prev.filter(p => p.id !== msgId));
      }
    } catch (err) {
      console.error("Error confirming message:", err);
    }
  };

  // Edit user profiles (Admin only)
  const handleAdminUpdateUser = async (targetUid, updates) => {
    if (userProfile?.role !== 'admin') return;
    try {
      await updateDoc(doc(db, 'users', targetUid), updates);
      logAction("Zaktualizowano uprawnienia użytkownika.");
    } catch (err) {
      console.error(err);
    }
  };

  const handleVehicleCheckbox = (vehicleString) => {
    setSelectedVehicles(prev => 
      prev.includes(vehicleString) ? prev.filter(v => v !== vehicleString) : [...prev, vehicleString]
    );
  };

  const handleSopToggle = (step) => {
    setSopSteps(prev => 
      prev.includes(step) ? prev.filter(s => s !== step) : [...prev, step]
    );
  };

  const handleServiceToggle = (srv) => {
    setNotifiedServices(prev => 
      prev.includes(srv) ? prev.filter(s => s !== srv) : [...prev, srv]
    );
  };

  // Auto compile duty logs
  const getChronologicalDutyLogs = () => {
    const logs = [];
    incidents.forEach(inc => {
      const times = inc.times || {};
      const idStr = inc.customId || '---';
      const typeLabels = {
        pozar: "Pożar (P)",
        mz: "Zagrożenie (MZ)",
        af: "Alarm F. (AF)",
        cw: "Ćwiczenia (CW)",
        wg: "Gospodarczy (WG)",
        pzr: "Zabezpieczenie Rejonu (PZR)",
        zpr: "Przekazane (ZPR)",
        bl: "Błąd (BL)"
      };
      const typeStr = typeLabels[inc.type] || 'Inny';
      
      if (times.alarm) {
        logs.push({
          time: times.alarm,
          text: `[Zdarzenie ${idStr}] Alarmsystem zarejestrował zgłoszenie: ${typeStr} (Miejscowość: ${userProfile?.role === 'admin' && inc.tenantId ? `[${inc.tenantId}] ` : ''}{inc.location}).`
        });
      }
      if (times.departure) {
        logs.push({
          time: times.departure,
          text: `[Zdarzenie ${idStr}] Dyspozytor zadysponował zastępy: ${inc.vehicles?.join(', ') || 'brak'}.`
        });
      }
      if (times.arrival) {
        logs.push({
          time: times.arrival,
          text: `[Zdarzenie ${idStr}] Pierwszy zastęp KSRG dotarł na miejsce akcji.`
        });
      }
      if (times.localization) {
        logs.push({
          time: times.localization,
          text: `[Zdarzenie ${idStr}] KDR przekazał meldunek: Sytuacja zlokalizowana.`
        });
      }
      if (times.completion) {
        logs.push({
          time: times.completion,
          text: `[Zdarzenie ${idStr}] Zakończono działania ratownicze. Powrót sił.`
        });
      }
      if (times.return) {
        logs.push({
          time: times.return,
          text: `[Zdarzenie ${idStr}] Wszystkie zastępy powróciły do macierzystych baz.`
        });
      }
      if (inc.reportNumber) {
        logs.push({
          time: times.completion || '12:00',
          text: `[Zdarzenie ${idStr}] Zatwierdzono formalną kartę meldunku EWID nr ${inc.reportNumber}.`
        });
      }
    });

    return logs.sort((a, b) => a.time.localeCompare(b.time));
  };

  const getGeocodingDot = (status) => {
    if (status === 'blue') return <span className="led-indicator blue" style={{ width: 7, height: 7, backgroundColor: '#007bff', boxShadow: 'inset 0px 1px 2px rgba(255,255,255,0.4), 0 0 4px #007bff' }} title="Obiekt z Katalogu SWD (Niebieska)" />;
    if (status === 'green') return <span className="led-indicator green" style={{ width: 7, height: 7 }} title="Geokodowanie EMUiA (Zielona)" />;
    if (status === 'yellow') return <span className="led-indicator yellow" style={{ width: 7, height: 7 }} title="Geokodowanie niedokładne (Żółta)" />;
    return <span className="led-indicator red" style={{ width: 7, height: 7 }} title="Brak geokodowania (Czerwona)" />;
  };

  const getEwidWorkflowBadge = (inc) => {
    if (!inc.reportNumber) {
      return <span style={{ color: '#d1d1d1', fontSize: '9px', fontWeight: 'normal' }}>brak meldunku</span>;
    }
    const isPartial = inc.times?.isPartialReport !== false;
    const workflow = inc.times?.reportWorkflowState || '1';
    
    if (isPartial) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', fontWeight: 'bold' }}>{inc.reportNumber}</span>
          <span style={{ fontSize: '7.5px', color: '#e67700', background: '#fff3e0', border: '1px solid #ffb74d', padding: '0 3px', borderRadius: '1px', fontWeight: 'bold', textTransform: 'uppercase' }}>Częściowy</span>
        </div>
      );
    } else {
      let label = 'KOMPLETNY';
      let color = '#2b8a3e';
      let bg = '#e8f5e9';
      let borderColor = '#81c784';
      if (workflow === '2') {
        label = 'ZATW. KM';
        color = '#0d47a1';
        bg = '#e3f2fd';
        borderColor = '#64b5f6';
      } else if (workflow === '3') {
        label = 'ZATW. KW';
        color = '#1b5e20';
        bg = '#c8e6c9';
        borderColor = '#4caf50';
      }
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', fontWeight: 'bold', color: '#000000' }}>{inc.reportNumber}</span>
          <span style={{ fontSize: '7.5px', color: color, background: bg, border: `1px solid ${borderColor}`, padding: '0 3px', borderRadius: '1px', fontWeight: 'bold', textTransform: 'uppercase' }}>{label}</span>
        </div>
      );
    }
  };

  const handleCopyToClipboard = () => {
    if (!activeIncident) return;
    const typeLabel = activeIncident.type === 'pozar' ? 'POŻAR' : activeIncident.type === 'mz' ? 'MIEJSCOWE ZAGROŻENIE' : 'ALARM FAŁSZYWY';
    const text = `RODZAJ ZDARZENIA: ${typeLabel}
NUMER MELDUNKU: ${activeIncident.reportNumber || 'Brak (oczekuje na zatwierdzenie)'}
LOKALIZACJA: ${activeIncident.location}
MACIERZYSTA OSP: ${activeIncident.ospUnit} (KDR: ${activeIncident.kdrName})
CZASY: Wyjazd: ${activeIncident.times?.departure || '--:--'} | Powrót: ${activeIncident.times?.return || '--:--'}
SIŁY I ŚRODKI: ${activeIncident.vehicles?.join(', ') || 'brak'} (ratowników: ${activeIncident.firefightersCount})
ZUŻYTY SPRZĘT: ${activeIncident.equipmentUsed || 'Brak'}
DŁUGOTRWAŁE: ${activeIncident.isLongDuration ? 'TAK' : 'NIE'}
OPIS DZIAŁAŃ: ${activeIncident.description}`;

    navigator.clipboard.writeText(text)
      .then(() => {
        logAction("Skopiowano dane zdarzenia do schowka.");
        alert("Dane zdarzenia skopiowane do schowka.");
      })
      .catch(err => console.error('Failed to copy: ', err));
  };

  // Filter incidents in registry
  const filteredIncidents = (() => {
    const sourceIncidents = viewMode === 'zaprzyjaznione' ? friendlyIncidents : incidents;

    return sourceIncidents.filter(inc => {
      if (viewMode !== 'zaprzyjaznione') {
        const matchArchive = viewMode === 'archive' ? inc.isArchived === true : !inc.isArchived;
        if (!matchArchive) return false;
      }

      const matchSearch = !searchText.trim() || 
        inc.location.toLowerCase().includes(searchText.toLowerCase()) ||
        inc.description.toLowerCase().includes(searchText.toLowerCase()) ||
        (inc.customId && inc.customId.toLowerCase().includes(searchText.toLowerCase())) ||
        (inc.reportNumber && inc.reportNumber.toLowerCase().includes(searchText.toLowerCase()));
      if (!matchSearch) return false;

      if (filterType !== 'all' && inc.type !== filterType) return false;
      if (filterStatus !== 'all' && inc.status !== filterStatus) return false;

      return true;
    });
  })();

  // Handle vehicle double-click/right-click simulator for Context Menu
  const openVehicleContextMenu = (e, vStr) => {
    e.preventDefault();
    if (!activeIncident || activeIncident.status === 'processed') return;
    setActiveContextMenuVehicle(vStr);
    
    setContextMenuPosition({
      x: e.clientX,
      y: e.clientY
    });
  };

  // Close context menu hook
  useEffect(() => {
    const closeMenu = () => {
      setActiveContextMenuVehicle(null);
    };
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  // Multiplayer Game: simulated emergency call reporting form (Caller view)
  const handleSendSimulatedCall = async (e) => {
    e.preventDefault();
    if (!callerLocation.trim() || !callerReportText.trim()) {
      alert("Proszę podać adres oraz opis zagrożenia.");
      return;
    }

    setCallStatusMessage("Łączenie z numerem alarmowym 112...");
    
    const timeNowStr = new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
    const transcriptText = `[WCPR ${tenantName} - godz. ${timeNowStr}]
CPR: Dzień dobry, operator 112, słucham?
Świadek: Dzień dobry! Zgłaszam zdarzenie: ${callerReportText}. Adres: ${callerLocation}.
CPR: Czy są osoby poszkodowane w zdarzeniu?
Świadek: Z tego co widzę na ten moment nie ma bezpośrednio zagrożonych osób, ale potrzebna jest straż pożarna.
CPR: Dobrze. Rejestruję zgłoszenie. Karta zostaje przesłana elektronicznie do Miejskiego Stanowiska Kierowania (SKKM) PSP Katowice. Proszę czekać na przyjazd zastępów.`;

    try {
      await addDoc(collection(db, 'calls'), {
              tenantId: userProfile?.tenantId || '',
        callerName: callerName.trim(),
        phone: callerPhone.trim(),
        location: callerLocation.trim(),
        description: callerReportText.trim(),
        type: callerReportType,
        status: 'pending',
        transcript: transcriptText,
        createdAt: serverTimestamp()
      });
      
      setCallStatusMessage("Rozmowa aktywne. Karta WCPR przekazana do SWD-ST Katowice.");
      setTimeout(() => {
        setCallStatusMessage("Połączenie CPR zakończone. Oczekiwanie na dyspozycję sił.");
        setCallerLocation('');
        setCallerReportText('');
      }, 3000);
    } catch (err) {
      console.error(err);
      setCallStatusMessage("Błąd połączenia z centralą CPR.");
    }
  };

  // Multiplayer Game: Answer incoming call from queue (Dispatcher view)
  const handleAnswerCall = (call) => {
    setActiveCallToAnswer(call);
    
    // Auto-fill new incident card details based on caller report!
    resetForm();
    setCallerNameStr(call.callerName || '');
    setCallerPhoneStr(call.phone || '');
    setLocation(call.location || '');
    setDescription(call.description || '');
    setIncidentType(call.type || 'mz');
    
    const suggestedJrg = handleLocationChange(call.location || '');
    setIsNewIncidentModalOpen(true);
  };

  // Acknowledge battle alarm and log event to history (KDR view)
  const handleAcknowledgeBattleAlarm = async () => {
    if (!battleAlarmIncident || !userProfile) return;
    
    const targetUnitName = activeRole === 'kdr_osp' ? userProfile.ospUnit : userProfile.jrgUnit;
    const cleanUnitName = targetUnitName.replace("JRG nr ", "JRG ").replace("OSP ", "");
    
    try {
      await logIncidentHistory(battleAlarmIncident.id, `Potwierdzono alarm bojowy i wyjazd przez ${cleanUnitName}`);
      logAction(`${cleanUnitName}: ALARM BOJOWY POTWIERDZONY.`);
      setBattleAlarmModalOpen(false);
      setBattleAlarmIncident(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Leaderboard statistics calculations
  const getLeaderboardScores = () => {
    const scores = {};
    
    // Initialize units
    ALL_UNITS.forEach(u => {
      scores[u] = { name: u, completed: 0, totalFuel: 0, totalKm: 0 };
    });

    incidents.forEach(inc => {
      if (inc.status === 'processed') {
        const vehicles = inc.vehicles || [];
        vehicles.forEach(vStr => {
          // Find unit name
          const matchUnit = ALL_UNITS.find(u => vStr.startsWith(u + " |"));
          if (matchUnit) {
            scores[matchUnit].completed++;
            const metrics = inc.vehicleMetrics?.[vStr] || { km: 0, fuel: 0 };
            scores[matchUnit].totalKm += metrics.km || 0;
            scores[matchUnit].totalFuel += metrics.fuel || 0;
          }
        });
      }
    });

    return Object.values(scores).sort((a, b) => b.completed - a.completed);
  };

  // Helper to render high-fidelity Table 4 status icons (Page 24/57)
  const renderTable4StatusIcon = (unitName, vehicleName) => {
    const state = getVehicleState(unitName, vehicleName);
    const isOsp = unitName.includes('OSP');
    
    // Brown/orange X for out of service (wycofany)
    if (state === "Wycofany") {
      return (
        <span 
          style={{ 
            display: 'inline-flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            width: '8px', 
            height: '8px', 
            color: '#8b4513', 
            fontSize: '9px', 
            fontWeight: 'bold', 
            marginRight: '6px' 
          }} 
          title="Siły i środki wycofane (OOS) - status 5"
        >
          ✖
        </span>
      );
    }

    // Yellow circle for Dispatched but not departed (ST 0)
    if (state === "Zadysponowany") {
      return <span className="led-indicator yellow" style={{ marginRight: '6px' }} title="Zadysponowany (ST 0) - oczekuje na wyjazd" />;
    }

    // Orange circle for Departed/traveling (ST 1)
    if (state === "Wyjazd") {
      return <span className="led-indicator orange" style={{ marginRight: '6px' }} title="Zastęp w drodze (ST 1) - Wyjazd" />;
    }

    // Red circle for Arrived/On scene (ST 2)
    if (state === "Na miejscu") {
      return <span className="led-indicator red" style={{ marginRight: '6px' }} title="Zastęp na miejscu akcji (ST 2) - Działania" />;
    }

    // Blue circle for Returning/Free on radio (ST 3)
    if (state === "Powrót") {
      return <span className="led-indicator blue" style={{ marginRight: '6px' }} title="Zastęp wolny w rejonie / Powrót (ST 3)" />;
    }

    // Violet circle for Station cover standby (PZR)
    if (state === "Na zabezpieczeniu") {
      return (
        <span 
          className="led-indicator blue" 
          style={{ marginRight: '6px', opacity: 0.8, borderStyle: 'dashed' }} 
          title="Na zabezpieczeniu rejonu" 
        />
      );
    }

    // Green circle for available w koszarach (ST 4)
    return (
      <span 
        className="led-indicator green" 
        style={{ marginRight: '6px', transform: (isOsp && !unitName.includes('Szopienice') && !unitName.includes('Dąbrówka') && !unitName.includes('Kostuchna')) ? 'scale(0.7)' : 'none' }} 
        title="Sprawne w koszarach, gotowość (ST 4)" 
      />
    );
  };

  // -----------------------------------------------------------------
  // SUB-COMPONENT: INTERACTIVE SVG MAP (Mapa-ST3 Animated Simulator)
  // -----------------------------------------------------------------
  const renderInteractiveMap = () => {
    return (
      <div className="map-container border-inset">
        <div className="map-title">Mapa-ST3 Mini ({tenantName})</div>
        <svg viewBox="0 0 400 240" style={{ width: "100%", height: "100%" }}>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1c202a" strokeWidth="0.5" />
          </pattern>
          <rect width="100%" height="100%" fill="#07080b" />
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Rivers & Boundaries */}
          <path d="M 0,90 Q 200,80 280,100 T 400,95" fill="none" stroke="#182c44" strokeWidth="3" />
          <path d="M 0,220 Q 150,210 250,230" fill="none" stroke="#182c44" strokeWidth="1.5" />
          
          {/* Main Katowice highway axes */}
          <line x1="0" y1="120" x2="400" y2="120" stroke="#252b3d" strokeWidth="2.5" strokeDasharray="3,3" />
          <line x1="0" y1="70" x2="400" y2="70" stroke="#252b3d" strokeWidth="2" />
          <line x1="200" y1="0" x2="200" y2="240" stroke="#252b3d" strokeWidth="1.5" />

          {/* Hydrants Registry map markers */}
          {SIMULATED_HYDRANTS.map(h => {
            const isWorking = h.status === 'sprawny';
            const color = isWorking ? '#228be6' : '#fa5252';
            return (
              <g key={h.id} transform={`translate(${h.x}, ${h.y})`}>
                <circle r="3" fill="none" stroke={color} strokeWidth="0.7" />
                {h.status === 'uszkodzony' && (
                  <line x1="-2" y1="-2" x2="2" y2="2" stroke={color} strokeWidth="0.5" />
                )}
                <text textAnchor="middle" y="1" fill={color} fontSize="2.8" fontWeight="bold">H</text>
              </g>
            );
          })}

          {/* Base Markers */}
          {Object.entries(MAP_BASES).map(([name, coords]) => (
            <g key={name} transform={`translate(${coords.x}, ${coords.y})`}>
              {activeSirens.includes(name) && (
                <circle r="12" fill="none" stroke="#e03131" strokeWidth="2">
                  <animate attributeName="r" values="3;28" dur="1.2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="1;0" dur="1.2s" repeatCount="indefinite" />
                </circle>
              )}

              <circle r="3.5" fill={coords.color} stroke="#000" strokeWidth="0.5" />
              <text y="-6" textAnchor="middle" fill="#868e96" fontSize="6.5" fontWeight="bold">
                {name.includes("JRG nr 1") ? "JRG 1" : name.includes("JRG nr 2") ? "JRG 2" : name.includes("JRG nr 3") ? "JRG 3" : name.replace("OSP ", "")}
              </text>
            </g>
          ))}

          {/* Static Incident markers */}
          {filteredIncidents.map(inc => {
            const coords = getCoordinatesForLocation(inc.location);
            const isSelected = selectedIncidentId === inc.id;
            const isActive = inc.status !== 'processed';
            const color = inc.type === 'pozar' ? '#ff4b4b' : inc.type === 'mz' ? '#ffcc00' : '#4dabf7';
            
            return (
              <g key={inc.id} transform={`translate(${coords.x}, ${coords.y})`}>
                {isActive && (
                  <circle r="8" fill="none" stroke={color} strokeWidth="1.5">
                    <animate attributeName="r" values="3;16" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="1;0" dur="2s" repeatCount="indefinite" />
                  </circle>
                )}
                <circle r={isSelected ? "5.5" : "4"} fill={color} stroke="#000" strokeWidth="0.8" />
                {isSelected && (
                  <g>
                    <line x1="-12" y1="0" x2="12" y2="0" stroke="#22b8cf" strokeWidth="0.8" strokeDasharray="1,1" />
                    <line x1="0" y1="-12" x2="0" y2="12" stroke="#22b8cf" strokeWidth="0.8" strokeDasharray="1,1" />
                  </g>
                )}
              </g>
            );
          })}

          {/* Synchronized concentric siren waves for OSP remizy (DSP-50 wave) */}
          {incidents.filter(inc => inc.status !== 'processed' && !inc.isArchived).map(inc => {
            const sirenUnit = inc.sirenActiveUnit;
            const sirenTime = inc.sirenActiveTime;
            if (!sirenUnit || !sirenTime) return null;

            const elapsed = (new Date() - new Date(sirenTime)) / 1000;
            if (elapsed >= 8) return null; // Wave timeout

            const coords = MAP_BASES[sirenUnit];
            if (!coords) return null;

            return (
              <g key={`${inc.id}-siren`} transform={`translate(${coords.x}, ${coords.y})`}>
                <circle r="15" fill="none" stroke="#e03131" strokeWidth="2">
                  <animate attributeName="r" values="3;35" dur="1.2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="1;0" dur="1.2s" repeatCount="indefinite" />
                </circle>
              </g>
            );
          })}
          {/* Animated Real-Time Vehicle Travel (ST 1 and ST 4) */}
          {incidents.filter(inc => inc.status !== 'processed' && !inc.isArchived).map(inc => {
            let targetCoords = getCoordinatesForLocation(inc.location);
            if (inc.type === 'pzr' && inc.location.startsWith('Zabezpieczenie rejonu operacyjnego: ')) {
              const targetBase = inc.location.split(': ')[1];
              if (MAP_BASES[targetBase]) {
                targetCoords = { x: MAP_BASES[targetBase].x, y: MAP_BASES[targetBase].y };
              }
            }
            const vehicles = inc.vehicles || [];
            
            return vehicles.map(vStr => {
              const status = inc.vehicleStatuses?.[vStr] || 0;
              const timeStr = inc.vehicleStatusTimes?.[vStr];
              
              if ((status !== 1 && status !== 3) || !timeStr) return null;

              // Calculate base coords of JRG/OSP
              const matchedBaseUnit = Object.keys(MAP_BASES).find(name => vStr.startsWith(name + " |"));
              const baseCoords = MAP_BASES[matchedBaseUnit] || { x: 200, y: 120 };

              // Calculate animated linear interpolation coordinates over 15 seconds
              const elapsed = (new Date() - new Date(timeStr)) / 1000;
              if (elapsed >= 15) return null; // Travel complete

              const progress = elapsed / 15;
              let currentX, currentY;

              if (status === 1) {
                // Moving to incident (ST 1)
                currentX = baseCoords.x + (targetCoords.x - baseCoords.x) * progress;
                currentY = baseCoords.y + (targetCoords.y - baseCoords.y) * progress;
              } else {
                // Returning back to base (ST 3)
                currentX = targetCoords.x + (baseCoords.x - targetCoords.x) * progress;
                currentY = targetCoords.y + (baseCoords.y - targetCoords.y) * progress;
              }

              const isOsp = vStr.includes('OSP');
              const color = isOsp ? '#fab005' : '#e03131';

              return (
                <g key={vStr} transform={`translate(${currentX}, ${currentY})`}>
                  <circle r="4" fill={color} stroke="#000000" strokeWidth="0.8" />
                  <text y="-5" textAnchor="middle" fill="#ffffff" fontSize="5.5" fontWeight="bold" style={{ backgroundColor: '#000', padding: '1px' }}>
                    {vStr.split(' | ')[1]?.split(' ').pop() || 'SIS'}
                  </text>
                  <circle r="6" fill="none" stroke={color} strokeWidth="0.5">
                    <animate attributeName="r" values="3;9" dur="1s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="1;0" dur="1s" repeatCount="indefinite" />
                  </circle>
                </g>
              );
            });
          })}
        </svg>
      </div>
    );
  };

  // Render Left combat units sidebar
  const renderCombatBoard = () => {
    return (
      <div className="combat-board-pane border-inset" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {combatTab === 'PSP' && (
            // PSP Mode: Show JRG columns (Rys.38 layout)
            <div className="combat-columns-container">
              {["KM/KP PSP", ...JRG_UNITS].map(uName => {
                const vehicles = UNIT_VEHICLES[uName] || [];
                
                // Read active PZR (Zabezpieczenie Rejonu) temporary transferred vehicles! (Page 47)
                const guestVehicles = [];
                incidents.forEach(inc => {
                  if (inc.type === 'pzr' && inc.status !== 'processed' && !inc.isArchived && inc.targetUnitDocelowa === uName) {
                    (inc.vehicles || []).forEach(v => {
                      // Check if vehicle has arrived at scene (ST 2 / ST 3 / ST 4) to be on guest standby
                      const vStatus = inc.vehicleStatuses?.[v] || 0;
                      if (vStatus >= 2 && vStatus <= 4 && !guestVehicles.includes(v)) {
                        guestVehicles.push(v);
                      }
                    });
                  }
                });

                const readiness = getJrgReadiness(uName);
                const isCritical = readiness.pct === 0 && uName.includes("JRG");
                const activeCount = vehicles.filter(v => getVehicleState(uName, v.name) === 'W koszarach').length;

                return (
                  <div key={uName} className="combat-column" style={{ background: '#ffffff' }}>
                    {/* Column Header with unit name and free-squad counter */}
                    <div className="combat-column-title" style={{ background: '#f3f3f3' }}>
                      <span title={uName}>
                        {uName.includes('JRG nr 1') ? 'JRG 1' :
                         uName.includes('JRG nr 2') ? 'JRG 2' :
                         uName.includes('JRG nr 3') ? 'JRG 3' :
                         uName.includes('KM PSP') ? 'KM/KP PSP' : uName}
                      </span>
                      <span style={{ background: activeCount > 0 ? '#2b8a3e' : '#c00000', color: '#fff', padding: '0 4px', fontFamily: 'var(--font-mono)', minWidth: '18px', textAlign: 'center' }}>
                        {activeCount}
                      </span>
                    </div>


                    {/* Unit address (usunięto adresy JRG zgodnie z dyspozycją) */}
                    <div style={{ fontSize: '7.5px', color: '#d1d1d1', padding: '1px 5px', borderBottom: '1px solid #f3f3f3' }}>
                      {uName.includes('KM PSP') ? 'ul. Bankowa 8' : ''}
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto' }}>
                      {vehicles.map(v => {
                        const isCrossedOut = getVehicleState(uName, v.name) === "Wycofany" || v.outOfService;
                        const currentState = getVehicleState(uName, v.name);

                        return (
                          <div 
                            key={v.name} 
                            className={`vehicle-row ${selectedCombatVehicle === `${uName} | ${v.name}` ? 'selected-combat' : ''}`}
                            style={selectedCombatVehicle === `${uName} | ${v.name}` ? { background: '#0a246a', color: '#fff' } : {}}
                            title={`${v.name} (${uName})\nKryptonim: ${v.kryptonim || 'Brak'}\nStan: ${currentState}\nObsada min.: ${v.obsada} os.\nKliknij: ${selectedIncidentId && activeIncident ? 'Dopisz do zdarzenia' : 'Zmień status OOS'}`}
                            onClick={() => {
                              setSelectedCombatVehicle(`${uName} | ${v.name}`);
                              if (isNewIncidentModalOpen) {
                                const vStr = `${uName} | ${v.name}`;
                                handleVehicleCheckbox(vStr);
                              } else if (selectedIncidentId && activeIncident && activeIncident.status !== 'processed') {
                                const vStr = `${uName} | ${v.name}`;
                                addVehicleToActiveIncident(vStr);
                              } else {
                                // Default click action if needed
                              }
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setSelectedCombatVehicle(`${uName} | ${v.name}`);
                              const activeInc = incidents.find(inc => inc.status !== 'processed' && !inc.isArchived && inc.vehicles?.includes(`${uName} | ${v.name}`));
                              setVehicleContextMenu({
                                x: e.clientX,
                                y: e.clientY,
                                uName,
                                vName: v.name,
                                isOos: v.outOfService,
                                activeIncId: activeInc?.id
                              });
                            }}
                          >
                            <div className="vehicle-info">
                              {renderTable4StatusIcon(uName, v.name)}
                              <span className={`vehicle-name ${isCrossedOut ? 'crossed-out' : ''}`} style={{ fontSize: '10px' }}>
                                {v.kryptonim ? `${v.kryptonim} (${v.name})` : v.name}
                              </span>
                            </div>
                            <span className="vehicle-obsada">
                              {isCrossedOut ? '0' : v.obsada}
                            </span>
                          </div>
                        );
                      })}

                      {/* Display temporary guest vehicles (PZR Zabezpieczenie Rejonu - Page 47/57) */}
                      {guestVehicles.map(vStr => {
                        const parts = vStr.split(' | ');
                        const homeUnit = parts[0] || '---';
                        const vName = parts[1] || vStr;
                        return (
                          <div 
                            key={vStr}
                            className="vehicle-row"
                            style={{ fontStyle: 'italic', background: '#e9ecef', border: '1px dashed #adb5bd' }}
                            title={`Zastęp gościnny na zabezpieczeniu rejonu z: ${homeUnit}`}
                            onClick={() => {
                              if (selectedIncidentId && activeIncident && activeIncident.status !== 'processed') {
                                addVehicleToActiveIncident(vStr);
                              }
                            }}
                          >
                            <div className="vehicle-info">
                              <span className="led-indicator green" style={{ marginRight: '6px' }} />
                              <span style={{ color: '#495057', fontWeight: 'bold' }}>
                                {vName.split(' ').slice(0, 2).join(' ')}
                              </span>
                            </div>
                            <span style={{ fontSize: '8px', color: '#868e96', fontWeight: 'bold' }}>PZR</span>
                          </div>
                        );
                      })}

                      {/* Section 8.5.2: Specialist Equipment & Tools (Sprzęt specjalistyczny - Page 57) */}
                      {SIMULATED_EQUIPMENT[uName] && (
                        <div style={{ marginTop: '8px', borderTop: '1px dashed #ced4da', paddingTop: '4px' }}>
                          <div style={{ fontSize: '8px', color: '#868e96', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '3px' }}>
                            🛠️ Sprzęt Specjalistyczny (Str. 57)
                          </div>
                          {SIMULATED_EQUIPMENT[uName].map(eq => {
                            const isDispatched = activeIncident && (activeIncident.specialistEquipment || []).includes(`${uName} | ${eq.name}`);
                            return (
                              <div 
                                key={eq.name}
                                className="vehicle-row"
                                style={{ 
                                  fontSize: '9px', 
                                  padding: '2px 4px', 
                                  background: isDispatched ? '#ffe3e3' : '#f1f3f5',
                                  border: isDispatched ? '1px solid #d13438' : '1px solid #e9ecef',
                                  cursor: 'pointer' 
                                }}
                                onClick={async () => {
                                  if (!selectedIncidentId || !activeIncident || activeIncident.status === 'processed') return;
                                  const eqStr = `${uName} | ${eq.name}`;
                                  const currentEq = activeIncident.specialistEquipment || [];
                                  
                                  let updatedEq;
                                  if (currentEq.includes(eqStr)) {
                                    updatedEq = currentEq.filter(item => item !== eqStr);
                                    await logIncidentHistory(activeIncident.id, `Wycofano sprzęt specjalistyczny: ${eq.name}`);
                                    logAction(`Wycofano sprzęt: ${eq.name}`);
                                  } else {
                                    updatedEq = [...currentEq, eqStr];
                                    await logIncidentHistory(activeIncident.id, `Zadysponowano sprzęt specjalistyczny: ${eq.name}`);
                                    logAction(`Zadysponowano sprzęt: ${eq.name}`);
                                    alert(`Zadysponowano sprzęt specjalistyczny: ${eq.name} do zdarzenia.`);
                                  }

                                  try {
                                    await updateDoc(doc(db, 'incidents', activeIncident.id), {
                                      specialistEquipment: updatedEq,
                                      updatedAt: serverTimestamp()
                                    });
                                  } catch (e) {
                                    console.error(e);
                                  }
                                }}
                              >
                                <span style={{ textDecoration: isDispatched ? 'none' : 'none' }}>🔧 {eq.name}</span>
                                <span style={{ fontSize: '7.5px', color: '#868e96' }}>{eq.type}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {combatTab === 'OSP' && (
            // OSP Mode - Gminas on left, ALL vehicles on right
            <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', height: '100%', background: '#f3f3f3' }}>
              <div className="border-inset" style={{ background: '#ffffff', overflowY: 'auto', padding: '4px', margin: '4px' }}>
                <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#000', borderBottom: '1px solid #d1d1d1', paddingBottom: '2px', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Gmina
                </div>
                <div 
                  onClick={() => setSelectedOspSidebar('ALL')}
                  style={{ 
                    padding: '3px 6px', 
                    fontSize: '10.5px', 
                    cursor: 'pointer', 
                    backgroundColor: selectedOspSidebar === 'ALL' || !OSP_UNITS.includes(selectedOspSidebar) ? '#0a6ece' : 'transparent',
                    color: selectedOspSidebar === 'ALL' || !OSP_UNITS.includes(selectedOspSidebar) ? '#ffffff' : '#000000',
                    fontWeight: selectedOspSidebar === 'ALL' || !OSP_UNITS.includes(selectedOspSidebar) ? 'bold' : 'normal'
                  }}
                >
                  Gmina m. {tenantName}
                </div>
              </div>

              <div className="border-inset" style={{ background: '#ffffff', overflowY: 'auto', padding: '6px', margin: '4px 4px 4px 0' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {OSP_UNITS.map(osp => {
                    const vehicles = UNIT_VEHICLES[osp] || [];
                    return vehicles.map(v => {
                      const state = getVehicleState(osp, v.name);
                      const isCrossedOut = state === "Wycofany" || v.outOfService;
                      const isSelected = selectedCombatVehicle === `${osp} | ${v.name}`;
                      
                      return (
                        <div 
                          key={`${osp}-${v.name}`}
                          className={`swd-row ${isSelected ? 'selected' : ''}`}
                          style={{ 
                            padding: '4px 6px', 
                            cursor: 'pointer', 
                            display: 'flex', 
                            alignItems: 'center',
                            fontSize: '11px',
                            background: isSelected ? '' : (state === 'W akcji' ? '#ffe3e3' : 'transparent'),
                            borderBottom: '1px solid #f3f3f3'
                          }}
                          onClick={() => {
                            setSelectedOspSidebar(osp);
                            setSelectedCombatVehicle(`${osp} | ${v.name}`);
                          }}
                          onDoubleClick={() => {
                            setSelectedOspSidebar(osp);
                            setSelectedCombatVehicle(`${osp} | ${v.name}`);
                            if (selectedIncidentId && activeIncident && activeIncident.status !== 'processed') {
                              addVehicleToActiveIncident(`${osp} | ${v.name}`);
                            }
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setSelectedOspSidebar(osp);
                            setSelectedCombatVehicle(`${osp} | ${v.name}`);
                            const activeInc = incidents.find(inc => inc.status !== 'processed' && !inc.isArchived && inc.vehicles?.includes(`${osp} | ${v.name}`));
                            setVehicleContextMenu({
                              x: e.clientX,
                              y: e.clientY,
                              uName: osp,
                              vName: v.name,
                              isOos: v.outOfService,
                              activeIncId: activeInc?.id
                            });
                          }}
                        >
                          <div style={{ marginRight: '6px', display: 'flex', alignItems: 'center' }}>
                            {isCrossedOut ? (
                              <span style={{ color: '#c00000', fontWeight: 'bold', fontSize: '12px' }}>✖</span>
                            ) : (
                              <span className="led-indicator green" style={{ width: '8px', height: '8px' }} />
                            )}
                          </div>
                          <span style={{ fontWeight: isSelected ? 'bold' : 'normal', color: isCrossedOut ? '#868e96' : 'inherit', textDecoration: isCrossedOut ? 'line-through' : 'none' }}>
                            {osp} - {v.kryptonim ? `${v.kryptonim} (${v.name})` : v.name}
                          </span>
                        </div>
                      );
                    });
                  })}
                </div>
              </div>
            </div>
          )}


          {combatTab === 'SPECIALIST' && (
            // Specialists Directory (Page 38)
            <div style={{ padding: '8px', overflowY: 'auto', height: '100%', background: '#ffffff' }}>
              <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#000', marginBottom: '6px', borderBottom: '1px solid #d1d1d1', paddingBottom: '3px', textTransform: 'uppercase' }}>Ewidencja Specjalistów (Str. 38 instrukcji)</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {SIMULATED_SPECIALISTS.map(spec => (
                  <div key={spec.name} className="border-outset" style={{ padding: '6px', background: '#f8f9fa' }}>
                    <strong style={{ fontSize: '10.5px', color: '#005fb8' }}>{spec.name}</strong>
                    <div style={{ fontSize: '9px', color: '#000', margin: '2px 0' }}>{spec.role}</div>
                    <div style={{ fontSize: '8.5px', color: '#555' }}>Jednostka: {spec.unit} | Rejon: {spec.area}</div>
                    <div style={{ fontSize: '8.5px', color: '#555' }}>Tel: {spec.tel} | Status: <span style={{ color: '#2b8a3e', fontWeight: 'bold' }}>{spec.status}</span></div>
                    {activeIncident && activeIncident.status !== 'processed' && (
                      <button 
                        className="btn-win" 
                        style={{ width: '100%', padding: '1px', marginTop: '4px', fontSize: '9px', fontWeight: 'bold' }}
                        onClick={() => {
                          logIncidentHistory(activeIncident.id, `Zadysponowano doradcę specjalistycznego: ${spec.name} (${spec.role.replace("Specjalizacja: ", "")})`);
                          logAction(`Zadysponowano doradcę: ${spec.name}`);
                          alert(`Zadysponowano specjalistę ${spec.name} do doradztwa przy zdarzeniu.`);
                        }}
                      >
                        📞 Zadysponuj jako doradcę (KDR)
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {combatTab === 'ODWODY' && (
            // Odwody Operacyjne i SGR (Page 39)
            <div style={{ padding: '8px', overflowY: 'auto', height: '100%', background: '#ffffff', color: '#000000' }}>
              <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#000', marginBottom: '6px', borderBottom: '1px solid #d1d1d1', paddingBottom: '3px', textTransform: 'uppercase' }}>Struktura Odwodów Operacyjnych i SGR (Str. 39 instrukcji)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {SIMULATED_ODWODY.map(grp => (
                  <div key={grp.id} className="border-outset" style={{ padding: '6px', background: '#f1f3f5' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #ced4da', paddingBottom: '3px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '10.5px', fontWeight: 'bold', color: '#005fb8' }}>🚒 {grp.name}</span>
                      <span style={{ fontSize: '8px', background: grp.type.includes('Specjalistyczna') ? '#101113' : '#1864ab', color: 'white', padding: '1px 3px', borderRadius: '2px' }}>{grp.type}</span>
                    </div>
                    
                    <div style={{ paddingLeft: '8px', fontSize: '9.5px', color: '#333' }}>
                      {grp.vehicles.map(vStr => {
                        const base = vStr.split(' | ')[0]?.split(' ').pop() || '';
                        const name = vStr.split(' | ')[1] || vStr;
                        return (
                          <div key={vStr} style={{ display: 'flex', alignItems: 'center', gap: '4px', margin: '2px 0' }}>
                            <span className="led-indicator green" style={{ width: 6, height: 6 }} />
                            <span>{name} ({base})</span>
                          </div>
                        );
                      })}
                    </div>

                    {activeIncident && activeIncident.status !== 'processed' && (
                      <button 
                        className="btn-win" 
                        style={{ width: '100%', padding: '2px', marginTop: '6px', fontSize: '9px', fontWeight: 'bold', backgroundColor: '#e03131', color: 'white' }}
                        onClick={async () => {
                          const toAdd = grp.vehicles.filter(v => {
                            const state = getVehicleState(v.split(' | ')[0], v.split(' | ')[1]);
                            return state === 'W koszarach';
                          });
                          
                          if (toAdd.length === 0) {
                            alert("Wszystkie pojazdy z tej grupy są już zadysponowane lub wycofane.");
                            return;
                          }

                          const currentVehicles = activeIncident.vehicles || [];
                          const updated = [...currentVehicles, ...toAdd.filter(v => !currentVehicles.includes(v))];
                          
                          try {
                            await updateDoc(doc(db, 'incidents', activeIncident.id), {
                              vehicles: updated,
                              updatedAt: serverTimestamp()
                            });
                            logIncidentHistory(activeIncident.id, `Zadysponowano cały związek taktyczny: ${grp.name} (${toAdd.length} zastępów)`);
                            logAction(`Zadysponowano związek taktyczny: ${grp.name}`);
                            alert(`Zadysponowano związek taktyczny: ${grp.name} (${toAdd.length} zastępów).`);
                          } catch (e) {
                            console.error(e);
                          }
                        }}
                      >
                        🚒 Zadysponuj cały związek taktyczny
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {combatTab === 'AGENTS' && (
            // Extinguishing Agents Registry (Page 25)
            <div style={{ padding: '8px', overflowY: 'auto', height: '100%', background: '#ffffff', color: '#000000' }}>
              <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#000', marginBottom: '6px', borderBottom: '1px solid #d1d1d1', paddingBottom: '3px', textTransform: 'uppercase' }}>
                Stan Środków Gaśniczych i Neutralizatorów (Str. 25 instrukcji)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {["JRG 1", "JRG 2", "JRG 3"].map(jrg => (
                  <div key={jrg} className="border-inset" style={{ padding: '6px', background: '#f8f9fa' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '10px', color: '#005fb8', borderBottom: '1px solid #ced4da', paddingBottom: '2px', marginBottom: '4px' }}>
                      {jrg === "JRG 1" ? "JRG 1" : jrg === "JRG 2" ? "JRG 2" : "JRG 3"}
                    </div>
                    {agentsInventory[jrg].map(item => {
                      const isLow = item.current < item.min;
                      const pct = Math.round((item.current / item.norm) * 100);
                      return (
                        <div 
                          key={item.name} 
                          style={{ 
                            fontSize: '9.5px', 
                            padding: '3px', 
                            borderRadius: '2px',
                            backgroundColor: isLow ? '#ffe3e3' : '#ffffff',
                            borderLeft: `2px solid ${isLow ? '#fa5252' : '#2b8a3e'}`,
                            marginBottom: '4px',
                            color: isLow ? '#d13438' : '#000000'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                            <span>{item.name}</span>
                            <span>{item.current} / {item.norm} {item.unit}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: '#555', marginTop: '2px' }}>
                            <span>Min: {item.min} {item.unit} | Stan: {pct}%</span>
                            {userProfile && (userProfile.role === 'admin' || userProfile.role === 'pa_jrg') && (
                              <input 
                                type="number" 
                                style={{ width: '40px', fontSize: '8px', padding: '0 2px', border: '1px solid #d1d1d1', height: '14px' }} 
                                value={item.current} 
                                onChange={(e) => handleUpdateAgentStock(jrg, item.name, e.target.value)} 
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          {combatTab === 'WCPR' && (
            <div style={{ padding: '4px', overflowY: 'auto', height: '100%', background: '#ffffff', color: '#000000', display: 'flex', gap: '4px' }}>
              <div style={{ flex: 1, border: '1px solid #d1d1d1', background: '#fff' }}>
                <table className="swd-table" style={{ width: '100%', fontSize: '10px' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '20px' }}></th>
                      <th style={{ width: '80px' }}>ID zdarzenia</th>
                      <th style={{ width: '120px' }}>Data i godzina</th>
                      <th style={{ width: '80px' }}>KP/KM</th>
                      <th>Miejsce zdarzenia</th>
                      <th style={{ width: '100px' }}>Zastępy</th>
                      <th style={{ width: '80px' }}>Rodzaj</th>
                      <th>Opis</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incomingCalls.length === 0 ? (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', padding: '10px', color: '#d1d1d1' }}>Brak zdarzeń w buforze</td>
                      </tr>
                    ) : (
                      incomingCalls.map(call => (
                        <tr 
                          key={call.id} 
                          onClick={() => setSelectedWcprCall(call)}
                          style={{ 
                            background: selectedWcprCall?.id === call.id ? '#005fb8' : '#ffffff', 
                            color: selectedWcprCall?.id === call.id ? '#ffffff' : '#000000',
                            cursor: 'pointer' 
                          }}
                        >
                          <td style={{ textAlign: 'center' }}>📞</td>
                          <td>WCPR/{call.id.substring(0, 4)}</td>
                          <td>{new Date().toLocaleTimeString('pl-PL')}</td>
                          <td>SI WCPR</td>
                          <td>{call.address}</td>
                          <td></td>
                          <td>{call.category}</td>
                          <td>{call.description}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div style={{ width: '100px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button 
                  className="btn-win" 
                  disabled={!selectedWcprCall}
                  onClick={() => {
                    if (selectedWcprCall) {
                      handleAnswerCall(selectedWcprCall);
                      setSelectedWcprCall(null);
                    }
                  }}
                  style={{ height: '60px', border: '2px solid red', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f3f3f3' }}
                >
                  <span style={{ fontSize: '24px' }}>🔊</span>
                  <span style={{ fontSize: '9px', fontWeight: 'bold' }}>Przyjmij zdarzenie</span>
                </button>
                <button 
                  className="btn-win" 
                  disabled={!selectedWcprCall}
                  onClick={() => {
                    if (selectedWcprCall) {
                      deleteDoc(doc(db, 'calls', selectedWcprCall.id)).catch(console.error);
                      setSelectedWcprCall(null);
                    }
                  }}
                  style={{ height: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
                >
                  <span style={{ fontSize: '9px' }}>Odrzuć zdarzenie</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* LED Color Legend (SWD-ST Tab. 4 - Page 24) */}
        <div className="sis-legend">
          <strong style={{ color: '#005fb8', marginRight: '4px' }}>LEGENDA:</strong>
          <span className="sis-legend-item"><span className="led-indicator green" style={{ width: '7px', height: '7px' }} /> W koszarach</span>
          <span className="sis-legend-item"><span className="led-indicator yellow" style={{ width: '7px', height: '7px' }} /> Zadysponowany</span>
          <span className="sis-legend-item"><span className="led-indicator red" style={{ width: '7px', height: '7px' }} /> W drodze / W akcji</span>
          <span className="sis-legend-item" style={{ color: '#d1d1d1' }}>✖ OOS (wycofany)</span>
          <span style={{ marginLeft: 'auto', color: '#d1d1d1', fontStyle: 'italic', fontSize: '8.5px' }}>Kliknij pojazd: dopisz do zdarzenia</span>
        </div>

        <div className="tab-header">
          <button className={`tab-btn ${combatTab === 'PSP' ? 'active' : ''}`} onClick={() => setCombatTab('PSP')}>PSP</button>
          <button className={`tab-btn ${combatTab === 'OSP' ? 'active' : ''}`} onClick={() => setCombatTab('OSP')}>OSP</button>
          <button className={`tab-btn ${combatTab === 'SPECIALIST' ? 'active' : ''}`} onClick={() => setCombatTab('SPECIALIST')}>Specjaliści</button>
          <button className={`tab-btn ${combatTab === 'AGENTS' ? 'active' : ''}`} onClick={() => setCombatTab('AGENTS')}>Inne</button>
          <button className={`tab-btn ${combatTab === 'WCPR' ? 'active' : ''}`} style={{ borderLeft: '1px solid #f3f3f3', marginLeft: '4px', color: incomingCalls.length > 0 ? '#d13438' : '#000000', fontWeight: incomingCalls.length > 0 ? 'bold' : 'normal' }} onClick={() => setCombatTab('WCPR')}>Bufor zdarzeń {incomingCalls.length > 0 ? `(${incomingCalls.length})` : ''}</button>
          <button className="tab-btn" style={{ color: '#d1d1d1' }} disabled>Szukaj</button>
          <button className="tab-btn" style={{ color: '#d1d1d1' }} disabled>Zdarzenia planowane (0)</button>
        </div>
        {/* Global overlay for context menu */}
        {vehicleContextMenu && (
          <div 
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999 }}
            onClick={() => setVehicleContextMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setVehicleContextMenu(null); }}
          >
            <div 
              style={{
                position: 'absolute',
                top: vehicleContextMenu.y,
                left: vehicleContextMenu.x,
                background: '#f3f3f3',
                border: '1.5px solid #d1d1d1',
                boxShadow: '2px 2px 5px rgba(0,0,0,0.5)',
                padding: '2px',
                display: 'flex',
                flexDirection: 'column',
                minWidth: '150px',
                zIndex: 100000
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ background: '#005fb8', color: '#fff', fontSize: '10px', fontWeight: 'bold', padding: '2px 4px', marginBottom: '2px' }}>
                Status ST - {vehicleContextMenu.vName}
              </div>
              
              {vehicleContextMenu.activeIncId ? (
                <>
                  <button className="menu-item" style={{ textAlign: 'left', fontSize: '11px', border: 'none', background: 'transparent', cursor: 'pointer' }} onClick={() => {
                    handleSetVehicleStatus(`${vehicleContextMenu.uName} | ${vehicleContextMenu.vName}`, 'Wyjazd do akcji');
                  }}>🔴 Wyjazd do akcji</button>
                  <button className="menu-item" style={{ textAlign: 'left', fontSize: '11px', border: 'none', background: 'transparent', cursor: 'pointer' }} onClick={() => {
                    handleSetVehicleStatus(`${vehicleContextMenu.uName} | ${vehicleContextMenu.vName}`, 'Zawrócenie z trasy');
                  }}>🔴 Zawrócenie z trasy</button>
                  <button className="menu-item" style={{ textAlign: 'left', fontSize: '11px', border: 'none', background: 'transparent', cursor: 'pointer' }} onClick={() => {
                    handleSetVehicleStatus(`${vehicleContextMenu.uName} | ${vehicleContextMenu.vName}`, 'Dojazd do MK');
                  }}>🔴 Dojazd do MK</button>
                  <button className="menu-item" style={{ textAlign: 'left', fontSize: '11px', border: 'none', background: 'transparent', cursor: 'pointer' }} onClick={() => {
                    handleSetVehicleStatus(`${vehicleContextMenu.uName} | ${vehicleContextMenu.vName}`, 'Wyjazd z MK');
                  }}>🔴 Wyjazd z MK</button>
                  <button className="menu-item" style={{ textAlign: 'left', fontSize: '11px', border: 'none', background: 'transparent', cursor: 'pointer' }} onClick={() => {
                    handleSetVehicleStatus(`${vehicleContextMenu.uName} | ${vehicleContextMenu.vName}`, 'Na miejscu zdarzenia');
                  }}>🔴 Na miejscu zdarzenia</button>
                  <button className="menu-item" style={{ textAlign: 'left', fontSize: '11px', border: 'none', background: 'transparent', cursor: 'pointer' }} onClick={() => {
                    handleSetVehicleStatus(`${vehicleContextMenu.uName} | ${vehicleContextMenu.vName}`, 'Lokalizacja zagrożenia');
                  }}>🟣 Lokalizacja zagrożenia</button>
                  <button className="menu-item" style={{ textAlign: 'left', fontSize: '11px', border: 'none', background: 'transparent', cursor: 'pointer' }} onClick={() => {
                    handleSetVehicleStatus(`${vehicleContextMenu.uName} | ${vehicleContextMenu.vName}`, 'Zakończenie działań');
                  }}>🟢 Zakończenie działań</button>
                  <button className="menu-item" style={{ textAlign: 'left', fontSize: '11px', border: 'none', background: 'transparent', cursor: 'pointer' }} onClick={() => {
                    handleSetVehicleStatus(`${vehicleContextMenu.uName} | ${vehicleContextMenu.vName}`, 'Powrót do bazy');
                  }}>🟢 Powrót do bazy</button>
                </>
              ) : (
                <>
                  <button className="menu-item" style={{ textAlign: 'left', fontSize: '11px', border: 'none', background: 'transparent', cursor: 'pointer' }} onClick={() => {
                    toggleVehicleOutOfService(vehicleContextMenu.uName, vehicleContextMenu.vName);
                    setVehicleContextMenu(null);
                  }}>
                    {vehicleContextMenu.isOos ? '✅ Przywróć do podziału' : '⛔ Wycofaj z podziału (OOS)'}
                  </button>
                  <div style={{ padding: '4px', fontSize: '9px', color: '#666', fontStyle: 'italic', borderTop: '1px solid #aaa', marginTop: '2px' }}>
                    Pojazd znajduje się w koszarach.
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render detailed users list for Admin view
  const renderUsersManagement = () => {
    return (
      <div style={{ padding: '16px', overflowY: 'auto', height: '100%', backgroundColor: 'var(--win-face)' }} className="border-inset fade-in">
        <h3 style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '12px', borderBottom: '1px solid var(--win-shadow)', paddingBottom: '4px' }}>
          Zarządzanie Użytkownikami / Uprawnienia Konsoli
        </h3>
        <table className="swd-table">
          <thead>
            <tr>
              <th>Użytkownik</th>
              <th>E-mail</th>
              <th>Poziom dostępu (Rola)</th>
              <th>Jednostka operacyjna</th>
            </tr>
          </thead>
          <tbody>
            {usersList.map((usr) => (
              <tr key={usr.id} className="swd-row" style={{ cursor: 'default' }}>
                <td style={{ fontWeight: 'bold', color: 'black' }}>{usr.displayName}</td>
                <td>{usr.email}</td>
                <td>
                  <select 
                    value={usr.role}
                    onChange={(e) => handleAdminUpdateUser(usr.uid, { 
                      role: e.target.value,
                      ...(e.target.value === 'kdr_osp' ? { ospUnit: OSP_UNITS[0] } : {}),
                      ...(e.target.value === 'pa_jrg' ? { jrgUnit: JRG_UNITS[0] } : {})
                    })}
                    disabled={usr.uid === user?.uid}
                    style={{ background: '#ffffff', color: '#000000', fontSize: '11px', outline: 'none' }}
                  >
                    <option value="admin">System Admin</option>
                    <option value="kdr_osp">KDR OSP</option>
                    <option value="dyspozytor">Dyspozytor SKKM</option>
                  </select>
                </td>
                <td>
                  {usr.role === 'kdr_osp' && (
                    <select 
                      value={usr.ospUnit || OSP_UNITS[0]}
                      onChange={(e) => handleAdminUpdateUser(usr.uid, { ospUnit: e.target.value })}
                      style={{ background: '#ffffff', color: '#000000', fontSize: '11px', outline: 'none' }}
                    >
                      {OSP_UNITS.map(osp => <option key={osp} value={osp}>{osp}</option>)}
                    </select>
                  )}
                  {usr.role === 'pa_jrg' && (
                    <select 
                      value={usr.jrgUnit || JRG_UNITS[0]}
                      onChange={(e) => handleAdminUpdateUser(usr.uid, { jrgUnit: e.target.value })}
                      style={{ background: '#ffffff', color: '#000000', fontSize: '11px', outline: 'none' }}
                    >
                      {JRG_UNITS.map(jrg => <option key={jrg} value={jrg}>{jrg}</option>)}
                    </select>
                  )}
                  {usr.role === 'admin' && <span style={{ color: '#d1d1d1' }}>Wszystkie (Brak ograniczeń)</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Render Competency Scoreboard (Multiplayer Game Leaderboard)
  const renderScoreboardSheet = () => {
    const scores = getLeaderboardScores();
    return (
      <div style={{ padding: '16px', overflowY: 'auto', height: '100%', backgroundColor: '#ffffff', color: '#000' }} className="border-inset fade-in">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '15px' }}>
          <div>
            <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: '#005fb8', borderBottom: '1.5px solid #d1d1d1', paddingBottom: '5px', marginBottom: '15px' }}>
              🏆 RANKING SPRAWNOŚCI I LOGISTYKI JEDNOSTEK (KATOWICE)
            </h3>
            
            <table className="swd-table" style={{ marginBottom: '20px' }}>
              <thead>
                <tr>
                  <th style={{ width: '50px', textAlign: 'center' }}>Miejsce</th>
                  <th>Jednostka Ratownicza (JRG / OSP)</th>
                  <th style={{ textAlign: 'center' }}>Ukończone wyjazdy (Zatwierdzone EWID)</th>
                  <th style={{ textAlign: 'center' }}>Łączny przebieg zastępów (km)</th>
                  <th style={{ textAlign: 'center' }}>Zużyte paliwo ogółem (L)</th>
                </tr>
              </thead>
              <tbody>
                {scores.map((score, idx) => (
                  <tr key={score.name} className="swd-row" style={{ cursor: 'default' }}>
                    <td style={{ textAlign: 'center', fontWeight: 'bold', color: idx === 0 ? '#d4af37' : '#000' }}>
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                    </td>
                    <td style={{ fontWeight: 'bold', color: '#000' }}>{score.name}</td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{score.completed}</td>
                    <td style={{ textAlign: 'center' }}>{score.totalKm.toFixed(1)} km</td>
                    <td style={{ textAlign: 'center' }}>{score.totalFuel.toFixed(1)} L</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Right Column: Game Mode Stats & Instructions */}
          <div className="border-double-outset" style={{ padding: '10px', background: '#f3f3f3', height: 'fit-content' }}>
            <h4 style={{ fontSize: '11px', fontWeight: 'bold', color: '#005fb8', borderBottom: '1px solid #d1d1d1', paddingBottom: '3px', marginBottom: '8px' }}>
              🎮 GRA DYSPONOWANIA
            </h4>
            <div style={{ fontSize: '10px', color: '#000', marginBottom: '10px' }}>
              Stan gry: <strong style={{ color: isGameModeActive ? '#2b8a3e' : '#d13438' }}>{isGameModeActive ? 'AKTYWNY (Ćwiczenia)' : 'WYŁĄCZONY'}</strong><br />
              Aktualny wynik: <strong style={{ fontSize: '13px', color: '#005fb8' }}>{gameScore} pkt</strong>
            </div>

            <div style={{ border: '1px inset #d1d1d1', background: '#fff', padding: '6px', fontSize: '9px', color: '#333', marginBottom: '10px', maxHeight: '180px', overflowY: 'auto' }}>
              <div style={{ fontWeight: 'bold', color: '#000', borderBottom: '1px dashed #ccc', marginBottom: '3px' }}>SYSTEM OCENY AKCJI:</div>
              🟢 <strong>+50 pkt</strong> - Przejście zastępu do kolejnej fazy akcji (Wyjazd, Dojazd, Lokalizacja)<br />
              🟢 <strong>+100 pkt</strong> - Skuteczne ugaszenie / rozwiązanie akcji przez boty<br />
              🔴 <strong>-100 pkt</strong> - Dysponowanie uszkodzonego/wycofanego wozu (OOS)<br />
              🔴 <strong>-150 pkt</strong> - Niezadysponowanie odpowiednich zastępów przez ponad 60 sekund
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <button 
                className="btn-win" 
                style={{ width: '100%', fontWeight: 'bold', backgroundColor: '#e03131', color: '#fff' }}
                onClick={() => {
                  if (confirm("Czy na pewno chcesz zresetować wynik gry do 0 punktów?")) {
                    setGameScore(0);
                    localStorage.setItem('swd_game_score', '0');
                    logAction("Gra: Zresetowano wynik punktowy do 0.");
                  }
                }}
              >
                🗑️ Zresetuj wynik gry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render Simulated Callers Panel (Pozorant screen)
  const renderCallerSimulator = () => {
    return (
      <div style={{ padding: '20px', overflowY: 'auto', height: '100%', backgroundColor: '#55a8a8' }} className="border-inset fade-in">
        <div className="win-dialog border-double-outset" style={{ width: '450px', margin: '20px auto' }}>
          <div className="win-dialog-header">
            <span>☎️ Aparat Zgłoszeniowy CPR (Symulator Pozoranta)</span>
          </div>
          <form onSubmit={handleSendSimulatedCall} className="win-dialog-body" style={{ background: '#f3f3f3' }}>
            <div style={{ fontSize: '10px', color: '#444', marginBottom: '8px', borderBottom: '1px solid #d1d1d1', paddingBottom: '3px' }}>
              Wprowadź zgłoszenie, aby wysłać sygnał alarmowy do dyspozytora na żywo
            </div>

            <div className="form-grid-2">
              <div className="input-group">
                <label className="input-label">Nazwisko Zgłaszającego:</label>
                <input type="text" className="input-field" value={callerName} onChange={(e) => setCallerName(e.target.value)} required />
              </div>
              <div className="input-group">
                <label className="input-label">Telefon:</label>
                <input type="text" className="input-field" value={callerPhone} onChange={(e) => setCallerPhone(e.target.value)} required />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Miejsce zdarzenia (ulica/nr):</label>
              <input type="text" className="input-field" placeholder="np. Katowice, ul. Szopienicka 10" value={callerLocation} onChange={(e) => setCallerLocation(e.target.value)} required />
            </div>

            <div className="form-grid-2">
              <div className="input-group">
                <label className="input-label">Rodzaj Zagrożenia:</label>
                <select className="input-field" value={callerReportType} onChange={(e) => setCallerReportType(e.target.value)}>
                  <option value="pozar">Pożar (P)</option>
                  <option value="mz">Miejscowe Zagrożenie (MZ)</option>
                  <option value="af">Alarm Fałszywy (AF)</option>
                </select>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Co się dzieje (Opis świadka):</label>
              <textarea className="textarea-field" style={{ minHeight: '60px' }} value={callerReportText} onChange={(e) => setCallerReportText(e.target.value)} required />
            </div>

            {callStatusMessage && (
              <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#005fb8', background: '#ffffff', padding: '6px', border: '1px solid #d1d1d1', textAlign: 'center' }}>
                📞 {callStatusMessage}
              </div>
            )}

            <button type="submit" className="btn-win" style={{ backgroundColor: '#2b8a3e', color: 'white', fontWeight: 'bold', padding: '8px' }}>
              🚨 Wyślij zgłoszenie (Zadzwoń na 112)
            </button>
          </form>
        </div>
      </div>
    );
  };

  // ============================================================
  // KATALOG SIŁ I ŚRODKÓW (SiS) – Moduł zarządzania flotą
  // Zgodny z SWD-ST 2.5, rozdz. 8.5 (Sprzęt), 8.8 (Środki gaśnicze)
  // ============================================================
  const renderKatalogSiS = () => {
    const vehiclesCatalog = tenantVehicles || {};
    const setVehiclesCatalog = (updater) => {
      const prev = tenantVehicles || {};
      const updated = typeof updater === 'function' ? updater(prev) : updater;
      updateTenantVehicles(updated);
    };
    const allUnits = ["KM/KP PSP", ...(tenantJrgUnits || []), ...(tenantOspUnits || [])];
    const currentUnit = sisSelectedUnit && allUnits.includes(sisSelectedUnit) ? sisSelectedUnit : (allUnits[0] || '');
    const VEHICLE_TYPES = ['GBA','GCBA','GBM','GLBA','GLBM','SCD','SCRd','SHD','SRChem','SLOp','SLKw','SLPy','GPr','SD','SRd','SLRR','Inne'];
    const STATUS_LABELS = {
      outOfService: { label: 'WYŁ. Z EKSPL.', color: '#6b3a1f', bg: '#ede0d4' },
      ksrg: { label: 'KSRG', color: '#155724', bg: '#d4edda' },
      normal: { label: 'W GOTOWOŚCI', color: '#0a3d62', bg: '#dbeafe' },
    };
    const getVehicleStatus = (v) => {
      if (v.outOfService) return STATUS_LABELS.outOfService;
      if (v.ksrg) return STATUS_LABELS.ksrg;
      return STATUS_LABELS.normal;
    };

    const unitVehicles = vehiclesCatalog[currentUnit] || [];

    // Save edited vehicle
    const handleSisEditSave = () => {
      if (!sisEditingVehicle || !sisEditForm.name?.trim()) return;
      setVehiclesCatalog(prev => {
        const updated = { ...prev };
        updated[currentUnit] = (updated[currentUnit] || []).map(v =>
          v.id === sisEditingVehicle.id
            ? { ...v, ...sisEditForm, obsada: parseInt(sisEditForm.obsada || 0, 10), kryptonim: sisEditForm.kryptonim || v.kryptonim || '' }
            : v
        );
        return updated;
      });
      logAction(`[KAT SiS] Zmodyfikowano pojazd: ${sisEditForm.name} (${currentUnit})`);
      setSisEditingVehicle(null);
      setSisEditForm({});
    };

    // Add new vehicle
    const handleSisAddVehicle = () => {
      if (!sisNewVehicleForm.name?.trim()) return;
      const newVeh = {
        ...sisNewVehicleForm,
        id: `${currentUnit}|${sisNewVehicleForm.name}|${Date.now()}`,
        obsada: parseInt(sisNewVehicleForm.obsada || 6, 10)
      };
      setVehiclesCatalog(prev => ({
        ...prev,
        [currentUnit]: [...(prev[currentUnit] || []), newVeh]
      }));
      logAction(`[KAT SiS] Dodano nowy pojazd: ${newVeh.name} do ${currentUnit}`);
      setSisIsAddingVehicle(false);
      setSisNewVehicleForm({ name: '', kryptonim: '', type: 'GBA', obsada: 6, outOfService: false, ksrg: false, notes: '' });
    };

    // Remove vehicle
    const handleSisDeleteVehicle = (vehicleId, vehicleName) => {
      if (!window.confirm(`Usunąć pojazd "${vehicleName}" z katalogu?`)) return;
      setVehiclesCatalog(prev => ({
        ...prev,
        [currentUnit]: (prev[currentUnit] || []).filter(v => v.id !== vehicleId)
      }));
      logAction(`[KAT SiS] Usunięto pojazd: ${vehicleName} z ${currentUnit}`);
    };

    // Toggle OOS
    const handleToggleOOS = (vehicleId) => {
      setVehiclesCatalog(prev => ({
        ...prev,
        [currentUnit]: (prev[currentUnit] || []).map(v =>
          v.id === vehicleId ? { ...v, outOfService: !v.outOfService } : v
        )
      }));
    };

    // Toggle KSRG
    const handleToggleKSRG = (vehicleId) => {
      setVehiclesCatalog(prev => ({
        ...prev,
        [currentUnit]: (prev[currentUnit] || []).map(v =>
          v.id === vehicleId ? { ...v, ksrg: !v.ksrg } : v
        )
      }));
    };

    const sectionStyle = {
      background: '#f0f0f0',
      border: '1px solid #d1d1d1',
      borderRadius: '2px',
      padding: '10px',
      marginBottom: '10px'
    };

    const tdStyle = { padding: '4px 8px', fontSize: '10px', borderBottom: '1px solid #e0e0e0', verticalAlign: 'middle' };
    const thStyle = { padding: '5px 8px', fontSize: '10px', background: '#005fb8', color: '#fff', fontWeight: 'bold', textAlign: 'left' };

    return (
      <div style={{ padding: '14px', overflowY: 'auto', height: '100%', backgroundColor: '#ffffff', color: '#000000' }} className="border-inset fade-in">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #005fb8', paddingBottom: '10px', marginBottom: '14px' }}>
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#005fb8', margin: 0 }}>
              📦 KATALOG SIŁ I ŚRODKÓW (SiS) — SWD-ST 2.5
            </h3>
            <p style={{ fontSize: '10px', color: '#555', marginTop: '3px', margin: '3px 0 0 0' }}>
              Ewidencja pojazdów, sprzętu specjalistycznego i środków gaśniczych wg. rozdz. 8.5 Podręcznika SWD-ST 2.5
            </p>
          </div>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <div style={{ fontSize: '9px', background: '#d4edda', color: '#155724', border: '1px solid #c3e6cb', padding: '3px 8px', borderRadius: '2px', fontWeight: 'bold' }}>
              Łącznie pojazdów: {Object.values(vehiclesCatalog).reduce((s,vl)=>s+vl.length,0)}
            </div>
            <div style={{ fontSize: '9px', background: '#ede0d4', color: '#6b3a1f', border: '1px solid #c8a882', padding: '3px 8px', borderRadius: '2px', fontWeight: 'bold' }}>
              Wyłączonych: {Object.values(vehiclesCatalog).reduce((s,vl)=>s+vl.filter(v=>v.outOfService).length,0)}
            </div>
          </div>
        </div>

        {/* SWD ST 2.5 - Widok Drzewa i Szczegółów */}
        <div style={{ display: 'flex', gap: '4px', height: 'calc(100% - 40px)' }}>
          {/* Drzewo jednostek (LEWA KOLUMNA) */}
          <div style={{ width: '280px', display: 'flex', flexDirection: 'column', border: '2px inset #d1d1d1', background: '#fff' }}>
            <div style={{ padding: '2px 4px', background: '#005fb8', color: '#fff', fontSize: '11px', fontWeight: 'bold' }}>
              Drzewo jednostek
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '4px', fontSize: '11px' }}>
              <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>[-]</span> 🏢 {tenantName}
              </div>
              <div style={{ paddingLeft: '16px' }}>
                {["KM/KP PSP", ...(tenantJrgUnits || [])].map(u => (
                  <div 
                    key={u} 
                    style={{ cursor: 'pointer', padding: '2px 0', background: currentUnit === u ? '#0a6ece' : 'transparent', color: currentUnit === u ? '#fff' : '#000' }}
                    onClick={() => { setSisSelectedUnit(u); setSisEditingVehicle(null); setSisIsAddingVehicle(false); }}
                  >
                    └ 🚒 {u}
                    {currentUnit === u && (
                      <span style={{ float: 'right', color: '#ffaaaa', cursor: 'pointer', paddingRight: '4px' }} onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Usunąć tę jednostkę JRG?')) updateTenantUnits(tenantJrgUnits.filter(x => x !== u), tenantOspUnits);
                      }} title="Skasuj jednostkę">✖</span>
                    )}
                  </div>
                ))}
                {tenantOspUnits.map(u => (
                  <div 
                    key={u} 
                    style={{ cursor: 'pointer', padding: '2px 0', background: currentUnit === u ? '#0a6ece' : 'transparent', color: currentUnit === u ? '#fff' : '#000' }}
                    onClick={() => { setSisSelectedUnit(u); setSisEditingVehicle(null); setSisIsAddingVehicle(false); }}
                  >
                    └ 🏠 {u}
                    {currentUnit === u && (
                      <span style={{ float: 'right', color: '#ffaaaa', cursor: 'pointer', paddingRight: '4px' }} onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Usunąć tę jednostkę OSP?')) updateTenantUnits(tenantJrgUnits, tenantOspUnits.filter(x => x !== u));
                      }} title="Skasuj jednostkę">✖</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
            {/* Dodawanie nowych jednostek */}
            <div style={{ padding: '4px', borderTop: '1px solid #ccc', background: '#f0f0f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', gap: '2px' }}>
                <input type="text" id="newJrgName" placeholder="Nazwa JRG (np. JRG 1)" style={{ flex: 1, fontSize: '10px', padding: '2px' }} />
                <button style={{ fontSize: '10px', padding: '2px 4px' }} onClick={() => {
                  const val = document.getElementById('newJrgName').value;
                  if (val && !tenantJrgUnits.includes(val)) updateTenantUnits([...tenantJrgUnits, val], tenantOspUnits);
                  document.getElementById('newJrgName').value = '';
                }}>Dopis</button>
              </div>
              <div style={{ display: 'flex', gap: '2px' }}>
                <input type="text" id="newOspName" placeholder="Nazwa OSP" style={{ flex: 1, fontSize: '10px', padding: '2px' }} />
                <button style={{ fontSize: '10px', padding: '2px 4px' }} onClick={() => {
                  const val = document.getElementById('newOspName').value;
                  if (val && !tenantOspUnits.includes(val)) updateTenantUnits(tenantJrgUnits, [...tenantOspUnits, val]);
                  document.getElementById('newOspName').value = '';
                }}>Dopis</button>
              </div>
            </div>
          </div>

          {/* Siły i środki wybranej jednostki (PRAWA KOLUMNA) */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '2px inset #d1d1d1', background: '#f3f3f3' }}>
            <div style={{ padding: '2px 4px', background: '#005fb8', color: '#fff', fontSize: '11px', fontWeight: 'bold' }}>
              Dane o jednostce — {currentUnit}
            </div>
            
            {/* Wewnętrzne zakładki */}
            <div style={{ display: 'flex', borderBottom: '1px solid #d1d1d1', background: '#f3f3f3', padding: '4px 4px 0 4px', gap: '2px' }}>
              {['jednostka', 'vehicles', 'obsada', 'kierownictwo', 'magazyn'].map(tab => (
                <div
                  key={tab}
                  onClick={() => setSisActiveTab(tab)}
                  style={{
                    padding: '4px 12px',
                    background: sisActiveTab === tab ? '#fff' : '#f3f3f3',
                    border: '1px solid #d1d1d1',
                    borderBottom: sisActiveTab === tab ? '1px solid #fff' : '1px solid #d1d1d1',
                    borderTopLeftRadius: '3px',
                    borderTopRightRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: sisActiveTab === tab ? 'bold' : 'normal',
                    marginBottom: '-1px'
                  }}
                >
                  {tab === 'jednostka' ? 'Jednostka' : 
                   tab === 'vehicles' ? 'Siły i środki' : 
                   tab === 'obsada' ? 'Obsada osobowa' : 
                   tab === 'kierownictwo' ? 'Kierownictwo' : 'Magazyn'}
                </div>
              ))}
            </div>

            {sisActiveTab === 'vehicles' && (
              <>
                <div style={{ padding: '4px', background: '#f3f3f3', borderBottom: '1px solid #d1d1d1', display: 'flex', gap: '4px' }}>
                   <button className="btn-win" style={{ fontSize: '11px', fontWeight: 'bold', color: '#005fb8' }} onClick={() => { if (!currentUnit) return; setSisIsAddingVehicle(true); setSisEditingVehicle(null); }}>
                     ➕ Dopis sprzętu
                   </button>
                </div>

            <div style={{ flex: 1, padding: '4px', overflowY: 'auto' }}>
              {/* Summary for selected unit */}
              <div style={{ marginBottom: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '10px', background: '#dbeafe', color: '#0a3d62', padding: '2px 8px', border: '1px solid #bcd' }}>
                  Łącznie: <strong>{unitVehicles.length}</strong>
                </span>
                <span style={{ fontSize: '10px', background: '#d4edda', color: '#155724', padding: '2px 8px', border: '1px solid #c3e6cb' }}>
                  W gotowości: <strong>{unitVehicles.filter(v => !v.outOfService).length}</strong>
                </span>
                <span style={{ fontSize: '10px', background: '#ede0d4', color: '#6b3a1f', padding: '2px 8px', border: '1px solid #c8a882' }}>
                  Wył. z ekspl.: <strong>{unitVehicles.filter(v => v.outOfService).length}</strong>
                </span>
                <span style={{ fontSize: '10px', background: '#d4edda', color: '#155724', padding: '2px 8px', border: '1px solid #155724' }}>
                  KSRG: <strong>{unitVehicles.filter(v => v.ksrg).length}</strong>
                </span>
              </div>

            {/* Add new vehicle form */}
            {sisIsAddingVehicle && (
              <div style={{ ...sectionStyle, background: '#e8f4fd', border: '2px solid #0a6ece', marginBottom: '10px' }}>
                <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#005fb8', marginBottom: '8px' }}>
                  ➕ DODAJ NOWY POJAZD — {sisSelectedUnit}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: 'bold' }}>Nazwa pojazdu / Nr takt.:</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="np. GBA 2.5/24 MAN TGM 301-22"
                      value={sisNewVehicleForm.name}
                      onChange={e => setSisNewVehicleForm(p => ({ ...p, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: 'bold' }}>Kryptonim:</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="np. KF 301-22"
                      value={sisNewVehicleForm.kryptonim || ''}
                      onChange={e => setSisNewVehicleForm(p => ({ ...p, kryptonim: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: 'bold' }}>Typ pojazdu:</label>
                    <select
                      className="input-field"
                      value={sisNewVehicleForm.type}
                      onChange={e => setSisNewVehicleForm(p => ({ ...p, type: e.target.value }))}
                    >
                      {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: 'bold' }}>Min. obsada (ratownicy):</label>
                    <input
                      type="number"
                      className="input-field"
                      min="0" max="12"
                      value={sisNewVehicleForm.obsada}
                      onChange={e => setSisNewVehicleForm(p => ({ ...p, obsada: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: 'bold' }}>Uwagi / Wyposażenie:</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="np. Wyposażenie specjalne, drabina..."
                      value={sisNewVehicleForm.notes}
                      onChange={e => setSisNewVehicleForm(p => ({ ...p, notes: e.target.value }))}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px', alignItems: 'center' }}>
                  <label style={{ fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={sisNewVehicleForm.outOfService} onChange={e => setSisNewVehicleForm(p => ({ ...p, outOfService: e.target.checked }))} />
                    Wyłączony z eksploatacji (OOS)
                  </label>
                  <label style={{ fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={sisNewVehicleForm.ksrg} onChange={e => setSisNewVehicleForm(p => ({ ...p, ksrg: e.target.checked }))} />
                    Pojazd KSRG
                  </label>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                    <button className="btn-win" style={{ background: '#2b8a3e', color: '#fff', fontWeight: 'bold' }} onClick={handleSisAddVehicle}>✔ Zapisz</button>
                    <button className="btn-win" onClick={() => setSisIsAddingVehicle(false)}>✖ Anuluj</button>
                  </div>
                </div>
              </div>
            )}

            {/* Vehicles table */}
            <div style={{ border: '1px solid #d1d1d1', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>#</th>
                    <th style={thStyle}>Pojazd / Nr taktyczny</th>
                    <th style={thStyle}>Kryptonim</th>
                    <th style={thStyle}>Typ</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Obsada min.</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Status</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>KSRG</th>
                    <th style={thStyle}>Uwagi</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Akcje</th>
                  </tr>
                </thead>
                <tbody>
                  {unitVehicles.length === 0 && (
                    <tr><td colSpan={8} style={{ ...tdStyle, textAlign: 'center', color: '#888', padding: '20px' }}>Brak pojazdów w wybranej jednostce</td></tr>
                  )}
                  {unitVehicles.map((v, idx) => {
                    const st = getVehicleStatus(v);
                    const isEditing = sisEditingVehicle && sisEditingVehicle.id === v.id;
                    return (
                      <tr key={v.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f8f8f8' }}>
                        <td style={{ ...tdStyle, color: '#888', width: '28px', textAlign: 'center' }}>{idx + 1}</td>
                        {isEditing ? (
                          <>
                            <td style={tdStyle}>
                              <input
                                type="text"
                                className="input-field"
                                value={sisEditForm.name || ''}
                                onChange={e => setSisEditForm(p => ({ ...p, name: e.target.value }))}
                                style={{ fontSize: '10px', width: '100%' }}
                              />
                            </td>
                            <td style={tdStyle}>
                              <input
                                type="text"
                                className="input-field"
                                placeholder="Kryptonim"
                                value={sisEditForm.kryptonim || ''}
                                onChange={e => setSisEditForm(p => ({ ...p, kryptonim: e.target.value }))}
                                style={{ fontSize: '10px', width: '100%' }}
                              />
                            </td>
                            <td style={tdStyle}>
                              <select
                                className="input-field"
                                value={sisEditForm.type || 'GBA'}
                                onChange={e => setSisEditForm(p => ({ ...p, type: e.target.value }))}
                                style={{ fontSize: '10px' }}
                              >
                                {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'center' }}>
                              <input
                                type="number"
                                className="input-field"
                                value={sisEditForm.obsada ?? v.obsada}
                                min="0" max="12"
                                onChange={e => setSisEditForm(p => ({ ...p, obsada: e.target.value }))}
                                style={{ fontSize: '10px', width: '50px', textAlign: 'center' }}
                              />
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'center' }}>
                              <label style={{ fontSize: '10px', display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'center', cursor: 'pointer' }}>
                                <input type="checkbox" checked={!!(sisEditForm.outOfService)} onChange={e => setSisEditForm(p => ({ ...p, outOfService: e.target.checked }))} />
                                OOS
                              </label>
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'center' }}>
                              <label style={{ fontSize: '10px', display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'center', cursor: 'pointer' }}>
                                <input type="checkbox" checked={!!(sisEditForm.ksrg)} onChange={e => setSisEditForm(p => ({ ...p, ksrg: e.target.checked }))} />
                                KSRG
                              </label>
                            </td>
                            <td style={tdStyle}>
                              <input
                                type="text"
                                className="input-field"
                                value={sisEditForm.notes || ''}
                                onChange={e => setSisEditForm(p => ({ ...p, notes: e.target.value }))}
                                style={{ fontSize: '10px', width: '100%' }}
                                placeholder="Uwagi..."
                              />
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '3px', justifyContent: 'center' }}>
                                <button className="btn-win" style={{ fontSize: '9px', background: '#2b8a3e', color: '#fff', padding: '1px 6px' }} onClick={handleSisEditSave}>✔ Zapisz</button>
                                <button className="btn-win" style={{ fontSize: '9px', padding: '1px 6px' }} onClick={() => { setSisEditingVehicle(null); setSisEditForm({}); }}>✖</button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td style={{ ...tdStyle, fontWeight: 'bold', color: v.outOfService ? '#888' : '#005fb8', textDecoration: v.outOfService ? 'line-through' : 'none' }}>
                              {v.name}
                            </td>
                            <td style={{ ...tdStyle, fontWeight: 'bold', color: '#333' }}>
                              {v.kryptonim || '---'}
                            </td>
                            <td style={{ ...tdStyle }}>
                              <span style={{ background: '#e8f4fd', color: '#0a3d62', padding: '1px 5px', borderRadius: '2px', fontWeight: 'bold', fontSize: '9px' }}>
                                {v.type || '—'}
                              </span>
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 'bold' }}>{v.obsada}</td>
                            <td style={{ ...tdStyle, textAlign: 'center' }}>
                              <span style={{ background: st.bg, color: st.color, padding: '2px 6px', borderRadius: '2px', fontWeight: 'bold', fontSize: '9px', border: `1px solid ${st.color}` }}>
                                {st.label}
                              </span>
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'center' }}>
                              {v.ksrg ? (
                                <span style={{ background: '#d4edda', color: '#155724', padding: '2px 5px', borderRadius: '2px', fontWeight: 'bold', fontSize: '9px' }}>TAK</span>
                              ) : (
                                <span style={{ color: '#aaa', fontSize: '9px' }}>—</span>
                              )}
                            </td>
                            <td style={{ ...tdStyle, color: '#555', fontStyle: v.notes ? 'normal' : 'italic' }}>
                              {v.notes || '—'}
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '3px', justifyContent: 'center', flexWrap: 'nowrap' }}>
                                <button
                                  className="btn-win"
                                  title="Edytuj pojazd"
                                  style={{ fontSize: '9px', padding: '1px 5px' }}
                                  onClick={() => { setSisEditingVehicle(v); setSisEditForm({ name: v.name, type: v.type, obsada: v.obsada, outOfService: !!v.outOfService, ksrg: !!v.ksrg, notes: v.notes || '' }); setSisIsAddingVehicle(false); }}
                                >
                                  ✏️
                                </button>
                                <button
                                  className="btn-win"
                                  title={v.outOfService ? 'Przywróć do eksploatacji' : 'Wyłącz z eksploatacji (OOS)'}
                                  style={{ fontSize: '9px', padding: '1px 5px', background: v.outOfService ? '#2b8a3e' : '#e67700', color: '#fff' }}
                                  onClick={() => handleToggleOOS(v.id)}
                                >
                                  {v.outOfService ? '✅ Przywróć' : '⛔ OOS'}
                                </button>
                                <button
                                  className="btn-win"
                                  title={v.ksrg ? 'Usuń z KSRG' : 'Dodaj do KSRG'}
                                  style={{ fontSize: '9px', padding: '1px 5px', background: v.ksrg ? '#6b3a1f' : '#155724', color: '#fff' }}
                                  onClick={() => handleToggleKSRG(v.id)}
                                >
                                  KSRG
                                </button>
                                <button
                                  className="btn-win"
                                  title="Usuń pojazd z katalogu"
                                  style={{ fontSize: '9px', padding: '1px 5px', background: '#d13438', color: '#fff' }}
                                  onClick={() => handleSisDeleteVehicle(v.id, v.name)}
                                >
                                  🗑
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div style={{ marginTop: '10px', fontSize: '9px', color: '#555', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <span>Legenda:</span>
              <span style={{ background: '#dbeafe', color: '#0a3d62', padding: '1px 5px', border: '1px solid #0a3d62' }}>W GOTOWOŚCI</span>
              <span style={{ background: '#ede0d4', color: '#6b3a1f', padding: '1px 5px', border: '1px solid #6b3a1f' }}>WYŁ. Z EKSPL. (OOS)</span>
              <span style={{ background: '#d4edda', color: '#155724', padding: '1px 5px', border: '1px solid #155724' }}>KSRG</span>
              <span style={{ marginLeft: 'auto', fontStyle: 'italic' }}>Źródło: Ewidencja lokalna SWD-ST 2.5, rozdz. 8.5.2</span>
            </div>
            </div>
              </>
            )}

            {sisActiveTab === 'jednostka' && (
              <div style={{ padding: '10px', fontSize: '11px', background: '#f3f3f3', flex: 1 }}>
                <div style={{ fontWeight: 'bold', marginBottom: '10px', fontSize: '12px' }}>Dane teleadresowe jednostki: {currentUnit}</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
                  <tbody>
                    <tr><td style={{ width: '120px', padding: '4px', border: '1px solid #ccc' }}>Kryptonim</td><td style={{ padding: '4px', border: '1px solid #ccc', fontWeight: 'bold' }}>{currentUnit}</td></tr>
                    <tr><td style={{ width: '120px', padding: '4px', border: '1px solid #ccc' }}>Miejscowość</td><td style={{ padding: '4px', border: '1px solid #ccc' }}>{tenantName}</td></tr>
                    <tr><td style={{ width: '120px', padding: '4px', border: '1px solid #ccc' }}>Typ</td><td style={{ padding: '4px', border: '1px solid #ccc' }}>{currentUnit.includes('JRG') ? 'Jednostka Ratowniczo-Gaśnicza PSP' : 'Ochotnicza Straż Pożarna'}</td></tr>
                  </tbody>
                </table>
              </div>
            )}

            {sisActiveTab === 'obsada' && (
              <div style={{ padding: '10px', fontSize: '11px', background: '#f3f3f3', flex: 1 }}>
                <div style={{ fontWeight: 'bold', marginBottom: '10px', fontSize: '12px' }}>Obsada osobowa (System zmianowy 24/48)</div>
                <div style={{ padding: '10px', background: '#fff', border: '1px inset #d1d1d1', color: '#888' }}>
                  Tutaj dyspozytor SWD zarządza zmianami służbowymi (Zmiana 1, Zmiana 2, Zmiana 3) i przypisuje obsadę do poszczególnych wozów. Moduł w przygotowaniu.
                </div>
              </div>
            )}

            {sisActiveTab === 'kierownictwo' && (
              <div style={{ padding: '10px', fontSize: '11px', background: '#f3f3f3', flex: 1 }}>
                <div style={{ fontWeight: 'bold', marginBottom: '10px', fontSize: '12px' }}>Kierownictwo jednostki</div>
                <div style={{ padding: '10px', background: '#fff', border: '1px inset #d1d1d1', color: '#888' }}>
                  Wykaz kadry dowódczej (Dowódca JRG, Zastępca Dowódcy, Naczelnik OSP, Prezes OSP). Moduł w przygotowaniu.
                </div>
              </div>
            )}

            {sisActiveTab === 'magazyn' && (
              <div style={{ padding: '10px', fontSize: '11px', background: '#f3f3f3', flex: 1 }}>
                <div style={{ fontWeight: 'bold', marginBottom: '10px', fontSize: '12px' }}>Magazyn Sprzętu i Środków Gaśniczych</div>
                <div style={{ padding: '10px', background: '#fff', border: '1px inset #d1d1d1', color: '#888' }}>
                  Ewidencja węży tłocznych, aparatów ODO, pił spalinowych oraz środków gaśniczych (piana). Moduł w przygotowaniu.
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    );
  };

  // Render Bufor Meldunków EWID-ST
  const renderBuforMeldunkow = () => {
    const buforIncidents = incidents.filter(inc => !inc.isArchived && (inc.reportNumber || inc.reportWorkflowState));
    return (
      <div className="tab-content" style={{ padding: '10px', height: '100%', overflowY: 'auto' }}>
        <div className="section-header" style={{ marginBottom: '10px', background: '#005fb8', color: 'white', padding: '5px' }}>
          <span style={{ fontWeight: 'bold' }}>BUFOR MELDUNKÓW REJESTRU WYJAZDÓW</span>
        </div>
        <table className="data-table" style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', border: '1px solid #d1d1d1' }}>
          <thead style={{ background: '#f3f3f3', color: '#000' }}>
            <tr>
              <th style={{ border: '1px solid #d1d1d1', padding: '4px' }}>Numer zdarzenia</th>
              <th style={{ border: '1px solid #d1d1d1', padding: '4px' }}>Zdarzenie</th>
              <th style={{ border: '1px solid #d1d1d1', padding: '4px' }}>Miejscowość, Ulica</th>
              <th style={{ border: '1px solid #d1d1d1', padding: '4px' }}>Data pow.</th>
              <th style={{ border: '1px solid #d1d1d1', padding: '4px' }}>Częśc.</th>
              <th style={{ border: '1px solid #d1d1d1', padding: '4px' }}>Status meldunku w Buforze</th>
              <th style={{ border: '1px solid #d1d1d1', padding: '4px' }}>Akcje</th>
            </tr>
          </thead>
          <tbody>
            {buforIncidents.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '10px' }}>Brak meldunków w buforze</td></tr>
            ) : (
              buforIncidents.map(inc => {
                const statusName = WORKFLOW_STATES[inc.reportWorkflowState || "1"];
                const isCzesciowy = inc.times?.isPartialReport !== false;
                return (
                  <tr key={inc.id} style={{ background: '#fff' }}>
                    <td style={{ border: '1px solid #d1d1d1', padding: '4px', textAlign: 'center', fontWeight: 'bold' }}>{inc.customId}</td>
                    <td style={{ border: '1px solid #d1d1d1', padding: '4px' }}>{inc.type === 'pozar' ? 'Pożar' : inc.type === 'mz' ? 'Miejscowe Zagrożenie' : 'Alarm Fałszywy'}</td>
                    <td style={{ border: '1px solid #d1d1d1', padding: '4px' }}>{userProfile?.role === 'admin' && inc.tenantId ? `[${inc.tenantId}] ` : ''}{inc.location}</td>
                    <td style={{ border: '1px solid #d1d1d1', padding: '4px', textAlign: 'center' }}>{inc.date} {inc.time}</td>
                    <td style={{ border: '1px solid #d1d1d1', padding: '4px', textAlign: 'center', color: isCzesciowy ? '#d13438' : '#2b8a3e', fontWeight: 'bold' }}>
                      {isCzesciowy ? 'TAK' : 'NIE'}
                    </td>
                    <td style={{ border: '1px solid #d1d1d1', padding: '4px', fontWeight: 'bold' }}>
                      [{inc.reportWorkflowState || "1"}] {statusName}
                    </td>
                    <td style={{ border: '1px solid #d1d1d1', padding: '4px', textAlign: 'center' }}>
                      <button className="btn-win" onClick={() => {
                        setSelectedIncidentId(inc.id);
                        setIsEwidReportModalOpen(true);
                      }}>📝 Edycja</button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        <div style={{ marginTop: '10px', fontSize: '10px', color: '#555' }}>
          * Meldunki zatwierdzone na poziomie KW PSP z odznaczoną flagą 'Częściowy' automatycznie znikają z bufora.
        </div>
      </div>
    );
  };

  // Render Monitor Transmisji
  const renderMonitorTransmisji = () => {
    return (
      <div className="tab-content" style={{ padding: '10px', height: '100%', overflowY: 'auto' }}>
        <div className="section-header" style={{ marginBottom: '10px', background: '#005fb8', color: 'white', padding: '5px' }}>
          <span style={{ fontWeight: 'bold' }}>MONITOR TRANSMISJI (Zgodnie z rozdz. 15.4)</span>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div style={{ border: '1px solid #d1d1d1', background: '#fff' }}>
            <div style={{ background: '#f3f3f3', padding: '5px', fontWeight: 'bold', borderBottom: '1px solid #d1d1d1' }}>Stan Połączeń Węzła (KM/KP)</div>
            <table className="data-table" style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#e0e0e0' }}>
                <tr>
                  <th style={{ border: '1px solid #d1d1d1', padding: '4px', textAlign: 'left' }}>Węzeł Docelowy</th>
                  <th style={{ border: '1px solid #d1d1d1', padding: '4px', textAlign: 'center' }}>Status</th>
                  <th style={{ border: '1px solid #d1d1d1', padding: '4px', textAlign: 'center' }}>Ostatnia synchronizacja</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid #d1d1d1', padding: '4px', fontWeight: 'bold' }}>KW PSP</td>
                  <td style={{ border: '1px solid #d1d1d1', padding: '4px', textAlign: 'center', color: '#155724', background: '#d4edda', fontWeight: 'bold' }}>ONLINE</td>
                  <td style={{ border: '1px solid #d1d1d1', padding: '4px', textAlign: 'center' }}>{systemTime.toLocaleTimeString('pl-PL')}</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #d1d1d1', padding: '4px', fontWeight: 'bold' }}>KG PSP Warszawa</td>
                  <td style={{ border: '1px solid #d1d1d1', padding: '4px', textAlign: 'center', color: '#155724', background: '#d4edda', fontWeight: 'bold' }}>ONLINE</td>
                  <td style={{ border: '1px solid #d1d1d1', padding: '4px', textAlign: 'center' }}>{new Date(systemTime.getTime() - 15000).toLocaleTimeString('pl-PL')}</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #d1d1d1', padding: '4px', fontWeight: 'bold' }}>CWA (Centralna Baza WCPR)</td>
                  <td style={{ border: '1px solid #d1d1d1', padding: '4px', textAlign: 'center', color: '#856404', background: '#fff3cd', fontWeight: 'bold' }}>SYNCHRONIZACJA</td>
                  <td style={{ border: '1px solid #d1d1d1', padding: '4px', textAlign: 'center' }}>W toku...</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ border: '1px solid #d1d1d1', background: '#fff' }}>
            <div style={{ background: '#f3f3f3', padding: '5px', fontWeight: 'bold', borderBottom: '1px solid #d1d1d1' }}>Statystyki Replikacji Danych (EWID/Rejestr)</div>
            <table className="data-table" style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#e0e0e0' }}>
                <tr>
                  <th style={{ border: '1px solid #d1d1d1', padding: '4px', textAlign: 'left' }}>Tabela / Obiekt</th>
                  <th style={{ border: '1px solid #d1d1d1', padding: '4px', textAlign: 'center' }}>Rekordy Oczekujące</th>
                  <th style={{ border: '1px solid #d1d1d1', padding: '4px', textAlign: 'center' }}>Błędy (Konflikty)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid #d1d1d1', padding: '4px' }}>Zdarzenia (Incident)</td>
                  <td style={{ border: '1px solid #d1d1d1', padding: '4px', textAlign: 'center' }}>0</td>
                  <td style={{ border: '1px solid #d1d1d1', padding: '4px', textAlign: 'center' }}>0</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #d1d1d1', padding: '4px' }}>Meldunki (EWID)</td>
                  <td style={{ border: '1px solid #d1d1d1', padding: '4px', textAlign: 'center' }}>0</td>
                  <td style={{ border: '1px solid #d1d1d1', padding: '4px', textAlign: 'center' }}>0</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #d1d1d1', padding: '4px' }}>Katalog SiS / Statusy</td>
                  <td style={{ border: '1px solid #d1d1d1', padding: '4px', textAlign: 'center' }}>{animationTick % 10 < 3 ? '1 (w toku)' : '0'}</td>
                  <td style={{ border: '1px solid #d1d1d1', padding: '4px', textAlign: 'center' }}>0</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ marginTop: '15px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div style={{ border: '1px solid #d1d1d1', background: '#fff' }}>
            <div style={{ background: '#f3f3f3', padding: '5px', fontWeight: 'bold', borderBottom: '1px solid #d1d1d1' }}>Logi Agenta Transmisji (AT)</div>
            <div style={{ padding: '5px', height: '150px', overflowY: 'auto', background: '#000', color: '#0f0', fontFamily: 'monospace', fontSize: '10px' }}>
              {operationalLogs.map((log, idx) => (
                <div key={idx}>[{new Date().toLocaleDateString('pl-PL')}] {log}</div>
              ))}
              <div>[{new Date().toLocaleDateString('pl-PL')} {systemTime.toLocaleTimeString('pl-PL')}] PING KW PSP... OK (12ms)</div>
              <div>[{new Date().toLocaleDateString('pl-PL')} {systemTime.toLocaleTimeString('pl-PL')}] PING KG PSP... OK (24ms)</div>
              {animationTick % 5 === 0 && <div>[{new Date().toLocaleDateString('pl-PL')} {systemTime.toLocaleTimeString('pl-PL')}] Odebrano pakiet DML dla tabeli SŁOWNIKI... OK</div>}
              {animationTick % 8 === 0 && <div>[{new Date().toLocaleDateString('pl-PL')} {systemTime.toLocaleTimeString('pl-PL')}] Transmisja on-line (EWID) w toku... OK</div>}
            </div>
          </div>

          <div style={{ border: '1px solid #d1d1d1', background: '#fff' }}>
            <div style={{ background: '#f3f3f3', padding: '5px', fontWeight: 'bold', borderBottom: '1px solid #d1d1d1' }}>Bramka SMS / Terminale MDT (Statusy)</div>
            <div style={{ padding: '5px', height: '150px', overflowY: 'auto', background: '#e8f0fe', color: '#000', fontFamily: 'monospace', fontSize: '10px' }}>
              {operationalLogs.filter(log => log.includes('Status') || log.includes('ST ') || log.includes('DSP') || log.includes('Syrena') || log.includes('SMS')).map((log, idx) => (
                <div key={idx} style={{ padding: '2px 0', borderBottom: '1px solid #f3f3f3' }}>{log}</div>
              ))}
              {operationalLogs.filter(log => log.includes('Status') || log.includes('ST ') || log.includes('DSP') || log.includes('Syrena') || log.includes('SMS')).length === 0 && (
                <div style={{ color: '#555', fontStyle: 'italic' }}>Brak nowych komunikatów z terminali mobilnych.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render Katalog Obiektów
  const renderKatalogObiektow = () => {
    return (
<div className="tab-content" style={{ padding: '10px', height: '100%', overflowY: 'auto' }}>
        <div className="section-header" style={{ marginBottom: '10px', background: '#005fb8', color: 'white', padding: '5px' }}>
          <span style={{ fontWeight: 'bold' }}>KATALOG OBIEKTÓW (Zgodnie z rozdz. 15.1)</span>
        </div>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <input type="text" placeholder="Szukaj obiektu (nazwa, miejscowość, ulica)..." style={{ padding: '4px', width: '300px', border: '1px solid #d1d1d1' }} />
          <button className="btn-win">Szukaj</button>
          <button className="btn-win">Dodaj Nowy</button>
        </div>
        <table className="data-table" style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', border: '1px solid #d1d1d1' }}>
          <thead style={{ background: '#f3f3f3', color: '#000' }}>
            <tr>
              <th style={{ border: '1px solid #d1d1d1', padding: '4px', textAlign: 'left' }}>Kategoria (wg Słownika KSRG)</th>
              <th style={{ border: '1px solid #d1d1d1', padding: '4px', textAlign: 'left' }}>Nazwa Obiektu</th>
              <th style={{ border: '1px solid #d1d1d1', padding: '4px', textAlign: 'left' }}>Miejscowość</th>
              <th style={{ border: '1px solid #d1d1d1', padding: '4px', textAlign: 'left' }}>Ulica</th>
              <th style={{ border: '1px solid #d1d1d1', padding: '4px', textAlign: 'center' }}>Monitoring Pożarowy (TSG)</th>
            </tr>
          </thead>
          <tbody>
            {KATALOG_OBIEKTOW.map((ob, idx) => {
              const [city, streetPart] = ob.address.split(', ');
              return (
                <tr key={ob.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f8f8f8' }}>
                  <td style={{ border: '1px solid #d1d1d1', padding: '4px' }}>Inne</td>
                  <td style={{ border: '1px solid #d1d1d1', padding: '4px', fontWeight: 'bold' }}>{ob.name}</td>
                  <td style={{ border: '1px solid #d1d1d1', padding: '4px' }}>{city}</td>
                  <td style={{ border: '1px solid #d1d1d1', padding: '4px' }}>{streetPart}</td>
                  <td style={{ border: '1px solid #d1d1d1', padding: '4px', textAlign: 'center', color: '#155724', fontWeight: 'bold', background: '#d4edda' }}>TAK</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ marginTop: '10px', fontSize: '10px', color: '#555' }}>
          * Baza obiektów zintegrowana z systemem SPA. Przy wpisaniu nazwy obiektu w formatce Zdarzenia, adres i współrzędne są podpowiadane automatycznie. (Zgodnie z rozdz. 15.1.2)
        </div>
      </div>
    );
  };

  // Render Procedury Postępowania
  const renderProcedury = () => {
    return (
      <div className="tab-content" style={{ padding: '10px', height: '100%', overflowY: 'auto' }}>
        <div className="section-header" style={{ marginBottom: '10px', background: '#005fb8', color: 'white', padding: '5px' }}>
          <span style={{ fontWeight: 'bold' }}>PROCEDURY POSTĘPOWANIA (Zgodnie z rozdz. 15.3)</span>
        </div>
        <div style={{ display: 'flex', gap: '15px' }}>
          <div style={{ width: '250px', border: '1px solid #d1d1d1', background: '#fff' }}>
            <div style={{ background: '#f3f3f3', padding: '5px', fontWeight: 'bold', borderBottom: '1px solid #d1d1d1' }}>Grupy Zdarzeń</div>
            <ul style={{ listStyleType: 'none', padding: '0', margin: '0', fontSize: '11px' }}>
              <li style={{ padding: '5px', borderBottom: '1px solid #e9ecef', background: '#0a6ece', color: '#fff', cursor: 'pointer' }}>Pożary</li>
              <li style={{ padding: '5px', borderBottom: '1px solid #e9ecef', cursor: 'pointer' }}>Miejscowe Zagrożenia</li>
              <li style={{ padding: '5px', borderBottom: '1px solid #e9ecef', cursor: 'pointer' }}>Wypadki drogowe</li>
              <li style={{ padding: '5px', borderBottom: '1px solid #e9ecef', cursor: 'pointer' }}>Zdarzenia masowe / Mnoga liczba poszkodowanych</li>
              <li style={{ padding: '5px', borderBottom: '1px solid #e9ecef', cursor: 'pointer' }}>Ratownictwo Chemiczne i Ekologiczne</li>
            </ul>
          </div>
          <div style={{ flex: 1, border: '1px solid #d1d1d1', background: '#fff', padding: '10px', fontSize: '11px' }}>
            <h3 style={{ borderBottom: '1px solid #005fb8', color: '#005fb8', paddingBottom: '4px', marginTop: 0 }}>Zasady dysponowania sił i środków do pożarów (wyciąg z procedury)</h3>
            <p><strong>1. Pożar mały (np. śmietnik, trawa):</strong><br />
            Wymagane dysponowanie: 1 zastęp (GBA lub GCBA).</p>
            <p><strong>2. Pożar średni (np. samochód, pojedyncze pomieszczenie):</strong><br />
            Wymagane dysponowanie: min. 2 zastępy gaśnicze (w tym przynajmniej jedno GCBA).</p>
            <p><strong>3. Pożar duży (np. budynek mieszkalny, hala):</strong><br />
            Wymagane dysponowanie: min. 3 zastępy gaśnicze, podnośnik/drabina (SHD/SCD), Dowódca JRG (SLRk).</p>
            <p><strong>4. Obiekty szczególne (Szpitale, ZDR, obiekty wysokościowe):</strong><br />
            Wymagane dysponowanie: Zwiększony pierwszy rzut o +1 zastęp względem kategorii pożaru. Obowiązkowe powiadomienie KM/KP oraz WSKR/KW.</p>
            <div style={{ marginTop: '20px', padding: '10px', background: '#f8f8f8', border: '1px solid #ccc', fontStyle: 'italic' }}>
              * Wskazówka dla dyspozytora: W przypadku zgłoszeń z Monitoringu Pożarowego (TSG) bez potwierdzenia z innego źródła, domyślnie dysponuje się 2 zastępy gaśnicze w celu weryfikacji alarmu w chronionym obiekcie.
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render Mapa GIS
  const renderMapaGIS = () => {
    return (
      <div className="tab-content" style={{ padding: '0', height: '100%', overflow: 'hidden', background: '#e0e0e0', position: 'relative', border: '2px solid #d1d1d1' }}>
        <div className="section-header" style={{ marginBottom: '0', background: '#005fb8', color: 'white', padding: '5px', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
          <span style={{ fontWeight: 'bold' }}>SYSTEM WSPOMAGANIA DECYZJI - MODUŁ GEOGRAFICZNY (GIS)</span>
        </div>
        
        {/* MAPA */}
        <div style={{ width: '100%', height: '100%', position: 'relative', marginTop: '24px' }}>
          <svg width="100%" height="100%" style={{ background: '#d0d8ce' }}>
            {/* Siatka ulic */}
            <line x1="0" y1="200" x2="1200" y2="200" stroke="#fff" strokeWidth="4" />
            <line x1="300" y1="0" x2="300" y2="800" stroke="#fff" strokeWidth="4" />
            <line x1="0" y1="400" x2="1200" y2="400" stroke="#fff" strokeWidth="6" />
            
            {/* Obiekty (JRG, OSP) */}
            {Object.entries(MAP_BASES).map(([name, coords]) => (
              <g key={name} transform={`translate(${coords.x * 2.5}, ${coords.y * 2.5})`}>
                <rect x="-8" y="-8" width="16" height="16" fill={coords.color} stroke="#000" strokeWidth="1" />
                <text x="12" y="4" fontSize="11" fontWeight="bold" fill="#000" style={{ textShadow: '1px 1px 0 #fff' }}>{name}</text>
              </g>
            ))}

            {/* Aktywne zdarzenia */}
            {incidents.filter(inc => !inc.isArchived && inc.status !== 'processed').map(inc => {
              // Extract coordinates from coordinates string if available, otherwise use deterministic pseudo-random
              let x = 0;
              let y = 0;
              
              if (inc.coordinates && inc.coordinates.x && inc.coordinates.y) {
                x = inc.coordinates.x * 2.5;
                y = inc.coordinates.y * 2.5;
              } else {
                // Generate consistent hash from customId
                let hash = 0;
                const str = inc.customId || inc.id;
                for (let i = 0; i < str.length; i++) {
                  hash = str.charCodeAt(i) + ((hash << 5) - hash);
                }
                x = Math.abs((hash % 800) + 50);
                y = Math.abs(((hash >> 8) % 500) + 50);
              }

              return (
                <g key={inc.id} transform={`translate(${x}, ${y})`}>
                  <circle cx="0" cy="0" r="12" fill="rgba(255,0,0,0.4)">
                    <animate attributeName="r" values="5;20;5" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="0" cy="0" r="5" fill="red" stroke="#fff" strokeWidth="1.5" />
                  <rect x="-25" y="12" width="50" height="14" fill="#fff" stroke="#000" strokeWidth="1" />
                  <text x="0" y="22" fontSize="9" fontWeight="bold" fill="#000" textAnchor="middle">{inc.customId}</text>
                </g>
              )
            })}
          </svg>

          {/* Legenda */}
          <div style={{ position: 'absolute', bottom: '10px', left: '10px', background: 'rgba(255,255,255,0.85)', padding: '6px', border: '2px solid #d1d1d1', fontSize: '11px', boxShadow: '2px 2px 5px rgba(0,0,0,0.3)' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '6px', borderBottom: '1px solid #000' }}>LEGENDA MAPY (SPA)</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '12px', height: '12px', background: '#fa5252', border: '1px solid #000' }}></div> Jednostka JRG</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}><div style={{ width: '12px', height: '12px', background: '#fab005', border: '1px solid #000' }}></div> Jednostka OSP</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}><div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'red', border: '1px solid #fff' }}></div> Zdarzenie</div>
          </div>
        </div>
      </div>
    );
  };

  // Render Kalkulator ODO
  const renderKalkulatorODO = () => {
    const handleAddOdo = () => {
      if (!odoName) return;
      const now = new Date();
      // Calculations: (Pressure - 50 bar reserve) * capacity = Total Liters
      // Total Liters / 40 liters/min (avg consumption) = Minutes
      const availablePressure = Number(odoPressure) - 50;
      const liters = availablePressure * Number(odoCapacity);
      const minutes = Math.floor(liters / 40);
      const exitTime = new Date(now.getTime() + minutes * 60000);

      setOdoEntries([...odoEntries, {
        id: Date.now(),
        name: odoName,
        pressure: odoPressure,
        entryTime: now,
        exitTime,
        minutesTotal: minutes
      }]);
      setOdoName('');
    };

    return (
      <div className="tab-content" style={{ padding: '10px', height: '100%', overflowY: 'auto' }}>
        <div className="section-header" style={{ marginBottom: '10px', background: '#005fb8', color: 'white', padding: '5px' }}>
          <span style={{ fontWeight: 'bold' }}>TABLICA KONTROLI CZASU PRACY W SPRZĘCIE ODO</span>
        </div>
        
        <div className="border-double-outset" style={{ padding: '10px', background: '#f3f3f3', marginBottom: '10px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
            <div>
              <label className="input-label" style={{ fontSize: '9px' }}>Rota / Nazwisko strażaka:</label>
              <input type="text" className="input-field" value={odoName} onChange={e => setOdoName(e.target.value)} />
            </div>
            <div>
              <label className="input-label" style={{ fontSize: '9px' }}>Ciśnienie (bar):</label>
              <input type="number" className="input-field" style={{ width: '80px' }} value={odoPressure} onChange={e => setOdoPressure(e.target.value)} />
            </div>
            <div>
              <label className="input-label" style={{ fontSize: '9px' }}>Pojemność (litry):</label>
              <input type="number" className="input-field" style={{ width: '80px' }} value={odoCapacity} step="0.1" onChange={e => setOdoCapacity(e.target.value)} />
            </div>
            <button className="btn-win" style={{ padding: '4px 10px', fontWeight: 'bold' }} onClick={handleAddOdo}>➕ Rejestruj Wejście</button>
          </div>
        </div>

        <table className="data-table" style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', border: '1px solid #d1d1d1' }}>
          <thead style={{ background: '#f3f3f3', color: '#000' }}>
            <tr>
              <th style={{ border: '1px solid #d1d1d1', padding: '4px' }}>Rota / Strażak</th>
              <th style={{ border: '1px solid #d1d1d1', padding: '4px' }}>Wejście</th>
              <th style={{ border: '1px solid #d1d1d1', padding: '4px' }}>Ciśnienie (bar)</th>
              <th style={{ border: '1px solid #d1d1d1', padding: '4px' }}>Czas pracy</th>
              <th style={{ border: '1px solid #d1d1d1', padding: '4px', color: '#c00000' }}>NAGŁY ODWROT (Gwizdek)</th>
              <th style={{ border: '1px solid #d1d1d1', padding: '4px' }}>Akcja</th>
            </tr>
          </thead>
          <tbody>
            {odoEntries.length === 0 && (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '10px', color: '#555' }}>Brak rot pracujących w strefie zadymienia</td></tr>
            )}
            {odoEntries.map(e => {
              const now = new Date();
              const remainingMs = e.exitTime.getTime() - now.getTime();
              const isAlert = remainingMs < 300000; // < 5 min
              return (
                <tr key={e.id} style={{ background: isAlert ? '#f8d7da' : '#fff' }}>
                  <td style={{ border: '1px solid #d1d1d1', padding: '4px', fontWeight: 'bold' }}>{e.name}</td>
                  <td style={{ border: '1px solid #d1d1d1', padding: '4px', textAlign: 'center' }}>{e.entryTime.toLocaleTimeString()}</td>
                  <td style={{ border: '1px solid #d1d1d1', padding: '4px', textAlign: 'center' }}>{e.pressure} bar</td>
                  <td style={{ border: '1px solid #d1d1d1', padding: '4px', textAlign: 'center' }}>{e.minutesTotal} min</td>
                  <td style={{ border: '1px solid #d1d1d1', padding: '4px', textAlign: 'center', color: isAlert ? 'red' : 'black', fontWeight: 'bold' }}>
                    {e.exitTime.toLocaleTimeString()}
                  </td>
                  <td style={{ border: '1px solid #d1d1d1', padding: '4px', textAlign: 'center' }}>
                    <button className="btn-win" style={{ padding: '2px 5px', fontSize: '9px' }} onClick={() => setOdoEntries(odoEntries.filter(x => x.id !== e.id))}>Wyjście (Koniec)</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div style={{ marginTop: '10px', fontSize: '10px', color: '#555' }}>
          * System zakłada średnie zużycie powietrza 40 l/min. Powiadomienie (Gwizdek) aktywowane przy spadku ciśnienia do 50 bar.
        </div>
      </div>
    );
  };

  // Render Bramka SMS
  const renderBramkaSMS = () => {
    const handleSendSms = () => {
      if (!smsInput) return;
      const timeStr = new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setSmsGatewayLogs(prev => [...prev, { id: Date.now(), type: 'out', to: smsRecipient, text: smsInput, time: timeStr }]);
      setSmsInput('');
      logAction(`Wysłano wiadomość SMS do ${smsRecipient}`);
    };

    return (
      <div className="tab-content" style={{ padding: '10px', height: '100%', overflowY: 'auto' }}>
        <div className="section-header" style={{ marginBottom: '10px', background: '#005fb8', color: 'white', padding: '5px' }}>
          <span style={{ fontWeight: 'bold' }}>BRAMKA SMS - KOMUNIKATOR (Zgodnie z rozdz. 11.1)</span>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', height: '400px' }}>
          {/* Odbiorcy / Grupy */}
          <div style={{ width: '250px', border: '1px solid #d1d1d1', background: '#fff', display: 'flex', flexDirection: 'column' }}>
            <div style={{ background: '#f3f3f3', padding: '5px', fontWeight: 'bold', borderBottom: '1px solid #d1d1d1' }}>
              Grupy odbiorców
            </div>
            <div style={{ padding: '5px', flex: 1, overflowY: 'auto' }}>
              <div style={{ cursor: 'pointer', padding: '4px', background: smsRecipient === 'OSP 1' ? '#0a6ece' : 'transparent', color: smsRecipient === 'OSP 1' ? '#fff' : '#000' }} onClick={() => setSmsRecipient('OSP 1')}>Grupa: OSP Szopienice</div>
              <div style={{ cursor: 'pointer', padding: '4px', background: smsRecipient === 'OSP 2' ? '#0a6ece' : 'transparent', color: smsRecipient === 'OSP 2' ? '#fff' : '#000' }} onClick={() => setSmsRecipient('OSP 2')}>Grupa: OSP Dąbrówka Mała</div>
              <div style={{ cursor: 'pointer', padding: '4px', background: smsRecipient === 'Dowódcy JRG' ? '#0a6ece' : 'transparent', color: smsRecipient === 'Dowódcy JRG' ? '#fff' : '#000' }} onClick={() => setSmsRecipient('Dowódcy JRG')}>Grupa: Dowódcy JRG</div>
              <div style={{ cursor: 'pointer', padding: '4px', background: smsRecipient === 'Numer 112 (Osoba głuchoniema)' ? '#0a6ece' : 'transparent', color: smsRecipient === 'Numer 112 (Osoba głuchoniema)' ? '#fff' : '#000' }} onClick={() => setSmsRecipient('Numer 112 (Osoba głuchoniema)')}>Numer zgłaszającego</div>
            </div>
          </div>

          {/* Konwersacja */}
          <div style={{ flex: 1, border: '1px solid #d1d1d1', background: '#fff', display: 'flex', flexDirection: 'column' }}>
            <div style={{ background: '#f3f3f3', padding: '5px', fontWeight: 'bold', borderBottom: '1px solid #d1d1d1' }}>
              Wiadomości do: {smsRecipient}
            </div>
            <div style={{ flex: 1, padding: '10px', overflowY: 'auto', background: '#f0f0f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {smsGatewayLogs.map(sms => (
                <div key={sms.id} style={{
                  alignSelf: sms.type === 'out' ? 'flex-end' : 'flex-start',
                  background: sms.type === 'out' ? '#dcf8c6' : '#fff',
                  padding: '8px',
                  borderRadius: '4px',
                  maxWidth: '70%',
                  border: '1px solid #ccc',
                  boxShadow: '1px 1px 2px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ fontSize: '9px', color: '#888', marginBottom: '4px' }}>
                    {sms.time} {sms.type === 'in' ? `Od: ${sms.from}` : `Do: ${sms.to}`}
                  </div>
                  <div style={{ fontSize: '12px' }}>{sms.text}</div>
                </div>
              ))}
            </div>
            <div style={{ padding: '10px', background: '#f3f3f3', borderTop: '1px solid #d1d1d1', display: 'flex', gap: '5px' }}>
              <input 
                type="text" 
                value={smsInput}
                onChange={e => setSmsInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendSms()}
                style={{ flex: 1, padding: '4px' }} 
                placeholder="Treść wiadomości SMS..." 
              />
              <button className="btn-win" onClick={handleSendSms}>Wyślij</button>
            </div>
          </div>
        </div>
        <div style={{ marginTop: '10px', fontSize: '10px', color: '#555' }}>
          * System pozwala na przyjmowanie zgłoszeń SMS od osób głuchoniemych (rozdział 11.1.5) oraz automatyczne alarmowanie OSP (11.1.6).
        </div>
      </div>
    );
  };

  // Render Daily Duty Log
  const renderDutyLogSheet = () => {
    const dailyLogs = getChronologicalDutyLogs();
    return (
      <div style={{ padding: '16px', overflowY: 'auto', height: '100%', backgroundColor: '#ffffff', color: '#000000' }} className="border-inset fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid var(--win-shadow)', paddingBottom: '10px', marginBottom: '15px' }}>
          <div>
            <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: '#005fb8' }}>
              DZIENNIK PRZEBIEGU SŁUŻBY SKKM/PSK
            </h3>
            <p style={{ fontSize: '10px', color: '#555', marginTop: '2px' }}>Automatyczna ewidencja chronologiczna wydarzeń bieżących</p>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {userProfile && (userProfile?.role === 'admin' || userProfile?.role === 'pa_jrg') && (
              <button className="btn-win" style={{ backgroundColor: '#0a6ece', color: 'white', fontWeight: 'bold' }} onClick={() => setIsShiftTransitionModalOpen(true)}>
                📂 Otwarcie nowej zmiany
              </button>
            )}
            <button className="btn-win" style={{ backgroundColor: '#f3f3f3', fontWeight: 'bold' }} onClick={() => setPrintPreviewMode('dziennik_sluzby')}>
              🖨️ Drukuj raport dobowy
            </button>
          </div>
        </div>

        {/* SKKM Shift crew roster form */}
        <div className="border-inset" style={{ padding: '10px', background: '#f3f3f3', marginBottom: '15px' }}>
          <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#005fb8', marginBottom: '8px', textTransform: 'uppercase' }}>
            Obsada Służbowa Dyspozytornia (Dzisiejsza Zmiana)
          </div>
          <div className="form-grid-3">
            <div>
              <label className="input-label" style={{ fontSize: '9px' }}>Dyżurny Operacyjny (DO):</label>
              <input type="text" className="input-field" value={shiftDo} onChange={(e) => setShiftDo(e.target.value)} />
            </div>
            <div>
              <label className="input-label" style={{ fontSize: '9px' }}>Pomocnik Dyżurnego (PDO):</label>
              <input type="text" className="input-field" value={shiftPdo} onChange={(e) => setShiftPdo(e.target.value)} />
            </div>
            <div>
              <label className="input-label" style={{ fontSize: '9px' }}>Dyspozytorzy:</label>
              <input type="text" className="input-field" value={shiftDisp} onChange={(e) => setShiftDisp(e.target.value)} />
            </div>
          </div>
          {userProfile && (userProfile?.role === 'admin' || userProfile?.role === 'pa_jrg') && (
            <button className="btn-win" style={{ marginTop: '8px', fontWeight: 'bold' }} onClick={handleSaveShift}>
              Zapisz obsadę SKKM
            </button>
          )}
        </div>

        {/* JRG Shift Roster Details */}
        <div className="border-inset" style={{ padding: '10px', background: '#f3f3f3', marginBottom: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#005fb8', textTransform: 'uppercase' }}>
              Stany Osobowe Zmian Bojowych JRG (Dyspozytornia)
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '10px' }}>Służba zmianowa:</span>
              <select value={shiftNumber} onChange={(e) => setShiftNumber(e.target.value)} style={{ fontSize: '10px', background: '#fff', color: '#000' }}>
                <option value="1">Zmiana I</option>
                <option value="2">Zmiana II</option>
                <option value="3">Zmiana III</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            {/* JRG 1 */}
            <div style={{ background: '#ffffff', padding: '6px', border: '1px solid #d1d1d1' }}>
              <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#ff4b4b', marginBottom: '4px' }}>JRG 1</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '4px' }}>
                <label style={{ fontSize: '8px' }}>Stan podziału:<input type="number" className="input-field" style={{ fontSize: '8px', padding: '1px' }} value={shiftJrg1Staff.active} onChange={(e) => setShiftJrg1Staff({ ...shiftJrg1Staff, active: parseInt(e.target.value, 10) })} /></label>
                <label style={{ fontSize: '8px' }}>Stan rezerwy:<input type="number" className="input-field" style={{ fontSize: '8px', padding: '1px' }} value={shiftJrg1Staff.reserve} onChange={(e) => setShiftJrg1Staff({ ...shiftJrg1Staff, reserve: parseInt(e.target.value, 10) })} /></label>
              </div>
              <input type="text" className="input-field" style={{ fontSize: '8px', padding: '2px' }} placeholder="Dowódca Zmiany" value={shiftJrg1Staff.commander} onChange={(e) => setShiftJrg1Staff({ ...shiftJrg1Staff, commander: e.target.value })} />
            </div>

            {/* JRG 2 */}
            <div style={{ background: '#ffffff', padding: '6px', border: '1px solid #d1d1d1' }}>
              <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#ff4b4b', marginBottom: '4px' }}>JRG 2</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '4px' }}>
                <label style={{ fontSize: '8px' }}>Stan podziału:<input type="number" className="input-field" style={{ fontSize: '8px', padding: '1px' }} value={shiftJrg2Staff.active} onChange={(e) => setShiftJrg2Staff({ ...shiftJrg2Staff, active: parseInt(e.target.value, 10) })} /></label>
                <label style={{ fontSize: '8px' }}>Stan rezerwy:<input type="number" className="input-field" style={{ fontSize: '8px', padding: '1px' }} value={shiftJrg2Staff.reserve} onChange={(e) => setShiftJrg2Staff({ ...shiftJrg2Staff, reserve: parseInt(e.target.value, 10) })} /></label>
              </div>
              <input type="text" className="input-field" style={{ fontSize: '8px', padding: '2px' }} placeholder="Dowódca Zmiany" value={shiftJrg2Staff.commander} onChange={(e) => setShiftJrg2Staff({ ...shiftJrg2Staff, commander: e.target.value })} />
            </div>

            {/* JRG 3 */}
            <div style={{ background: '#ffffff', padding: '6px', border: '1px solid #d1d1d1' }}>
              <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#ff4b4b', marginBottom: '4px' }}>JRG 3</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '4px' }}>
                <label style={{ fontSize: '8px' }}>Stan podziału:<input type="number" className="input-field" style={{ fontSize: '8px', padding: '1px' }} value={shiftJrg3Staff.active} onChange={(e) => setShiftJrg3Staff({ ...shiftJrg3Staff, active: parseInt(e.target.value, 10) })} /></label>
                <label style={{ fontSize: '8px' }}>Stan rezerwy:<input type="number" className="input-field" style={{ fontSize: '8px', padding: '1px' }} value={shiftJrg3Staff.reserve} onChange={(e) => setShiftJrg3Staff({ ...shiftJrg3Staff, reserve: parseInt(e.target.value, 10) })} /></label>
              </div>
              <input type="text" className="input-field" style={{ fontSize: '8px', padding: '2px' }} placeholder="Dowódca Zmiany" value={shiftJrg3Staff.commander} onChange={(e) => setShiftJrg3Staff({ ...shiftJrg3Staff, commander: e.target.value })} />
            </div>
          </div>
          {userProfile && (userProfile?.role === 'admin' || userProfile?.role === 'pa_jrg') && (
            <button className="btn-win" style={{ marginTop: '8px', fontWeight: 'bold' }} onClick={handleSaveShiftDetails}>
              Zapisz stany zmian JRG
            </button>
          )}
        </div>

        {/* Weather alerts meteo feed */}
        <div className="border-inset" style={{ padding: '10px', background: '#f3f3f3', marginBottom: '15px' }}>
          <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#d13438', marginBottom: '8px', textTransform: 'uppercase' }}>
            Ostrzeżenia Meteorologiczne KW PSP / IMGW
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input type="text" className="input-field" style={{ flex: 1, fontSize: '10px' }} value={meteoAlertText} onChange={(e) => setMeteoAlertText(e.target.value)} />
            <button className="btn-win" onClick={() => { setIsMeteoAlertActive(true); logAction("Aktywowano alert pogodowy IMGW."); }} style={{ fontWeight: 'bold', backgroundColor: '#e03131', color: 'white' }}>Aktywuj meteo-alert</button>
            <button className="btn-win" onClick={() => { setIsMeteoAlertActive(false); logAction("Deaktywowano alert pogodowy."); }}>Wyłącz alert</button>
          </div>
        </div>

        {/* Log Entries */}
        <div className="border-inset" style={{ background: '#ffffff', padding: '12px', minHeight: '260px', fontFamily: 'var(--font-mono)', fontSize: '11px', lineHeight: '1.6', overflowY: 'auto' }}>
          {dailyLogs.map((log, idx) => (
            <div key={idx} style={{ borderBottom: '1px solid #f3f3f3', padding: '4px 0', display: 'flex', gap: '15px' }}>
              <span style={{ color: '#005fb8', fontWeight: 'bold', minWidth: '45px' }}>[{log.time}]</span>
              <span style={{ color: '#000000' }}>{log.text}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderKomunikatyScreen = () => {
    return (
      <div className="tab-content" style={{ padding: '10px', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ borderBottom: '2px solid #f3f3f3', paddingBottom: '5px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '18px' }}>✉️</span> Komunikator Systemowy SWD-ST
        </h3>
        
        <div style={{ display: 'flex', gap: '10px', flex: 1, height: 'calc(100% - 40px)' }}>
          
          <div className="border-inset" style={{ width: '250px', background: '#fff', padding: '10px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#005fb8' }}>Adresaci i Grupy</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <button className="btn-win" style={{ textAlign: 'left', fontWeight: 'bold' }} onClick={() => setMsgRecipient('Wszyscy')}>Wszyscy użytkownicy</button>
              {ALL_UNITS.filter(u => u !== 'KM/KP PSP').map(u => (
                <button key={u} className="btn-win" style={{ textAlign: 'left' }} onClick={() => setMsgRecipient(u)}>
                  {u.replace("JRG nr ", "JRG ").replace("OSP ", "")}
                </button>
              ))}
            </div>
          </div>

          <div className="border-inset" style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#e9ecef' }}>
            <div style={{ background: '#f3f3f3', padding: '5px 10px', fontWeight: 'bold', borderBottom: '1px solid #d1d1d1' }}>
              Bieżące komunikaty (Kierunek: {msgRecipient === 'Wszyscy' ? 'Ogólny' : msgRecipient})
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '15px', background: '#ffffff', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {messages.map((m, idx) => (
                <div key={idx} style={{ 
                  background: m.priority === 'urgent' ? '#ffe3e3' : m.priority === 'confirm' ? '#fff9db' : '#f8f9fa', 
                  border: m.priority === 'urgent' ? '2px solid #e03131' : '1px solid #adb5bd', 
                  padding: '10px', 
                  borderRadius: '4px', 
                  color: '#000000',
                  boxShadow: '1px 1px 3px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: m.priority === 'urgent' ? '#d13438' : '#005fb8', fontWeight: 'bold', borderBottom: '1px dotted #ccc', paddingBottom: '4px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px' }}>Nadawca: {m.sender} ({m.senderUnit}) {m.recipient && m.recipient !== 'Wszyscy' ? `➔ Do: ${m.recipient}` : ''}</span>
                    <span style={{ color: '#495057' }}>
                      {m.createdAt ? (m.createdAt.toDate ? m.createdAt.toDate().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '') : ''}
                    </span>
                  </div>
                  <div style={{ fontSize: '14px', whiteSpace: 'pre-wrap' }}>{m.text}</div>
                  
                  {m.confirmations && Object.keys(m.confirmations).length > 0 && (
                    <div style={{ fontSize: '11px', color: '#2b8a3e', marginTop: '8px', fontWeight: 'bold', background: '#e3fafc', padding: '4px', borderRadius: '2px' }}>
                      ✓ Potwierdzenia odbioru: {Object.entries(m.confirmations).map(([unit, time]) => `${unit.replace("OSP ", "").replace("JRG nr ", "JRG ")} (${time})`).join(', ')}
                    </div>
                  )}
                  {m.priority === 'confirm' && activeRole !== 'dyspozytor' && m.recipient === (activeRole === 'kdr_osp' ? userProfile?.ospUnit : userProfile?.jrgUnit) && !m.confirmations?.[(activeRole === 'kdr_osp' ? userProfile?.ospUnit : userProfile?.jrgUnit)] && (
                    <button className="btn-win" style={{ marginTop: '10px', fontWeight: 'bold', color: '#0b7285' }} onClick={() => {
                      const updatedMessages = [...messages];
                      const targetUnit = activeRole === 'kdr_osp' ? userProfile?.ospUnit : userProfile?.jrgUnit;
                      updatedMessages[idx].confirmations = { ...updatedMessages[idx].confirmations, [targetUnit]: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }) };
                      setMessages(updatedMessages);
                    }}>Potwierdź odbiór komunikatu</button>
                  )}
                </div>
              ))}
            </div>

            <form onSubmit={handleSendMessage} style={{ display: 'flex', flexDirection: 'column', padding: '15px', gap: '10px', background: '#f3f3f3', borderTop: '2px solid #d1d1d1' }}>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                <div style={{ fontWeight: 'bold' }}>Wyślij do:</div>
                <select 
                  value={msgRecipient} 
                  onChange={(e) => setMsgRecipient(e.target.value)} 
                  className="input-field"
                  style={{ width: '250px' }}
                >
                  <option value="Wszyscy">Wszyscy użytkownicy SWD</option>
                  {ALL_UNITS.filter(u => u !== 'KM/KP PSP').map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>

                <div style={{ fontWeight: 'bold', marginLeft: '20px' }}>Priorytet:</div>
                <select 
                  value={msgPriority} 
                  onChange={(e) => setMsgPriority(e.target.value)}
                  className="input-field"
                  style={{ width: '180px' }}
                >
                  <option value="normal">⚪ Zwykły</option>
                  <option value="confirm">🟡 Wymaga potwierdzenia</option>
                  <option value="urgent">🔴 PILNY</option>
                </select>
              </div>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="text" 
                  className="input-field" 
                  value={chatInputText} 
                  onChange={(e) => setChatInputText(e.target.value)}
                  placeholder="Wpisz treść komunikatu specjalnego lub tekstowego..." 
                  style={{ flex: 1, padding: '8px', fontSize: '13px' }}
                />
                <button type="submit" className="btn-win" style={{ fontWeight: 'bold', padding: '0 30px', fontSize: '14px' }}>
                  Wyślij (Enter)
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  if (!user) {
    return (
      <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'transparent' }}>
        <div className="win-dialog border-double-outset" style={{ width: '400px' }}>
          <div className="win-dialog-header">
            <span>Logowanie do SWD-ST 2.5 (Tryb sieciowy)</span>
          </div>
          <div className="win-dialog-body" style={{ background: '#f3f3f3', padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {error && <div style={{ color: 'red', fontWeight: 'bold' }}>{error}</div>}
            
            {authMode === 'login' ? (
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px' }}>Adres e-mail:</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="input-field" style={{ width: '100%', padding: '3px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px' }}>Hasło:</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="input-field" style={{ width: '100%', padding: '3px' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                  <button type="submit" disabled={formLoading} className="btn-win" style={{ padding: '4px 20px', fontWeight: 'bold' }}>
                    {formLoading ? 'Logowanie...' : 'Zaloguj'}
                  </button>
                  <button type="button" onClick={() => setAuthMode('register')} className="btn-win" style={{ padding: '4px 20px' }}>
                    Rejestracja nowej KM/KP
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px' }}>Adres e-mail:</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="input-field" style={{ width: '100%', padding: '3px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px' }}>Hasło:</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="input-field" style={{ width: '100%', padding: '3px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#005fb8' }}>Wybierz Komendę (Miejsce pełnienia służby):</label>
                  <select value={cityName} onChange={e => setCityName(e.target.value)} required className="input-field" style={{ width: '100%', padding: '3px' }}>
                    <option value="">-- Wybierz komendę --</option>
                    <option value="120000">KW PSP Katowice</option>
                    <option value="120100">KM PSP Katowice</option>
                    <option value="120200">KP PSP Będzin</option>
                    <option value="120300">KM PSP Zabrze</option>
                    <option value="120400">KM PSP Mysłowice</option>
                  </select>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                  <button type="submit" disabled={formLoading} className="btn-win" style={{ padding: '4px 20px', fontWeight: 'bold' }}>
                    {formLoading ? 'Tworzenie...' : 'Zarejestruj'}
                  </button>
                  <button type="button" onClick={() => setAuthMode('login')} className="btn-win" style={{ padding: '4px 20px' }}>
                    Powrót
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container" onClick={() => setContextMenu(null)}>
      {/* === WINDOWS TITLE BAR === */}
      <div className="win-title-bar">
        <div className="title-text" style={{ flex: 1, display: 'flex', justifyContent: 'space-between', paddingRight: '10px' }}>
          <div>
            <span style={{ fontSize: '13px' }}>🚒</span>
            <span>SWD ST — {tenantName} ({userProfile?.displayName || userProfile?.email || '---'}) — [Rejestr wyjazdów]</span>
          </div>
          <div style={{ fontWeight: 'bold' }}>
            {systemTime.toLocaleTimeString('pl-PL')}
          </div>
        </div>
        <div className="win-controls">
          <div className="win-ctrl-btn" title="Minimalizuj">_</div>
          <div className="win-ctrl-btn" title="Maksymalizuj">□</div>
          <div className="win-ctrl-btn" style={{ background: '#c0392b', color: '#fff', borderColor: '#e74c3c' }} onClick={handleLogout} title="Wyloguj / Zamknij">✕</div>
        </div>
      </div>

      {/* === MENU BAR — zgodny z SWD-ST 2.5 Rys.37 === */}
      <div className="menu-bar">
        <div className="menu-item" onClick={() => setIsSystemMenuOpen(!isSystemMenuOpen)} style={{ position: 'relative', background: isSystemMenuOpen ? '#0a6ece' : '', color: isSystemMenuOpen ? '#fff' : '' }}>
          Plik
          {isSystemMenuOpen && (
            <div style={{ position: 'absolute', top: '100%', left: 0, background: '#f3f3f3', padding: '2px', zIndex: 10000, display: 'flex', flexDirection: 'column', minWidth: '220px', boxShadow: '2px 2px 5px rgba(0,0,0,0.4)', border: '1.5px solid #d1d1d1' }}>
              <div className="menu-item-dropdown" onClick={(e) => { e.stopPropagation(); setIsSystemMenuOpen(false); setIsShiftTransitionModalOpen(true); }} style={{ color: '#000', padding: '4px 10px', fontSize: '11px', textAlign: 'left', cursor: 'pointer' }}>
                🔑 Rozpocznij nową służbę
              </div>
              <div className="menu-item-dropdown" onClick={(e) => { e.stopPropagation(); setIsSystemMenuOpen(false); setIsVehiclesModalOpen(true); }} style={{ color: '#000', padding: '4px 10px', fontSize: '11px', textAlign: 'left', cursor: 'pointer' }}>
                🚒 Zarządzaj Pojazdami (Edycja KM PSP / JRG)
              </div>
              <div className="menu-item-dropdown" onClick={(e) => { e.stopPropagation(); setIsSystemMenuOpen(false); handleSystemReset(); }} style={{ color: '#d13438', fontWeight: 'bold', padding: '4px 10px', fontSize: '11px', textAlign: 'left', cursor: 'pointer' }}>
                🔄 Reset i nowa gra (Inicjalizacja)
              </div>
              <div className="menu-item-dropdown" onClick={(e) => { e.stopPropagation(); setIsSystemMenuOpen(false); wipeAndInitializeDb(); }} style={{ color: '#000', padding: '4px 10px', fontSize: '11px', textAlign: 'left', cursor: 'pointer' }}>
                💣 Wyczyść i zainicjuj bazę danych
              </div>
              <div style={{ height: '1px', background: '#d1d1d1', margin: '2px 0' }} />
              <div className="menu-item-dropdown" onClick={(e) => { e.stopPropagation(); setIsSystemMenuOpen(false); handleLogout(); }} style={{ color: '#000', padding: '4px 10px', fontSize: '11px', textAlign: 'left', cursor: 'pointer' }}>
                ✕ Wyjście z programu (Wyloguj)
              </div>
            </div>
          )}
        </div>
        
        <div className={`menu-item ${activeMenuTab === 'rejestr' ? 'active' : ''}`} onClick={() => setActiveMenuTab('rejestr')}>Zdarzenia</div>
        <div className={`menu-item ${activeMenuTab === 'katalog_sis' ? 'active' : ''}`} onClick={() => setActiveMenuTab('katalog_sis')}>Siły i środki</div>
        <div className={`menu-item ${activeMenuTab === 'konta' || activeMenuTab === 'monitor' ? 'active' : ''}`} onClick={() => { if(userProfile?.role === 'admin') setActiveMenuTab('konta'); else setActiveMenuTab('monitor'); }}>Urządzenia</div>
        <div className="menu-item">Okna</div>
        <div 
          className="menu-item"
          onClick={() => {
            const nextState = !isGameModeActive;
            setIsGameModeActive(nextState);
            localStorage.setItem('swd_game_mode_active', nextState ? 'true' : 'false');
            if (nextState) {
              logAction("🚨 Gra: Aktywowano Tryb Ćwiczeń. Zgłoszenia będą generowane automatycznie.");
              alert("Tryb Ćwiczeń (Gra) włączony!\n- Połączenia 112 będą wpływały automatycznie co 45s.\n- Boty (AI) będą automatycznie obsługiwać stany wozów (ST1-ST5) i meldować się na radiu.\n- Zdobywasz punkty za likwidację zagrożeń!");
            } else {
              logAction("Gra: Deaktywowano Tryb Ćwiczeń.");
            }
          }}
          style={{ background: isGameModeActive ? '#2b8a3e' : '', color: isGameModeActive ? '#fff' : '', fontWeight: 'bold' }}
        >
          🎮 Tryb Gry {isGameModeActive ? 'ON' : 'OFF'}
        </div>
        {isGameModeActive && (
          <div className="menu-item" style={{ color: '#005fb8', fontWeight: 'bold', borderLeft: '1px solid #d1d1d1' }}>
            🏆 Wynik: {gameScore} pkt
          </div>
        )}
        {isGameModeActive && (
          <div className="menu-item" style={{ borderLeft: '1px solid #d1d1d1', padding: '0 8px' }}>
            <input 
              type="text" 
              placeholder="Miasta powiatu (np. Będzin, Czeladź)" 
              value={gameModeCities} 
              onChange={(e) => {
                setGameModeCities(e.target.value);
                localStorage.setItem('swd_game_cities', e.target.value);
              }}
              style={{ fontSize: '10px', width: '200px', border: '1px solid #d1d1d1' }}
            />
          </div>
        )}
        <div className="menu-item">Pomoc</div>

        {/* Right side controls */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
          {userProfile?.role === 'admin' && (
            <select
              value={userProfile.tenantId || ''}
              onChange={async (e) => {
                const newTenantId = e.target.value;
                if (!newTenantId) return;
                try {
                  const { doc, updateDoc } = await import('firebase/firestore');
                  const { db } = await import('./firebase');
                  await updateDoc(doc(db, 'users', auth.currentUser.uid), {
                    tenantId: newTenantId,
                  });
                  logAction(`[WSKR] Zmiana obszaru chronionego na: ${newTenantId}`);
                } catch (err) {
                  console.error('Błąd zmiany tenantId:', err);
                  alert('Nie udało się zmienić obszaru chronionego.');
                }
              }}
              style={{ fontSize: '10px', background: '#0a6ece', color: '#fff', border: '1px inset #d1d1d1', padding: '0 2px', cursor: 'pointer', outline: 'none', height: '18px', fontWeight: 'bold' }}
              title="Zmień obszar chroniony (WSKR)"
            >
              <option value="120000">120000 - KW PSP KATOWICE</option>
              <option value="120100">120100 - KM PSP KATOWICE</option>
              <option value="120200">120200 - KP PSP BĘDZIN</option>
              <option value="120300">120300 - KM PSP ZABRZE</option>
              <option value="120400">120400 - KM PSP MYSŁOWICE</option>
            </select>
          )}

          <label style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '10px', cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              id="sys_audio_chk"
              checked={isSystemAudioEnabled}
              onChange={(e) => {
                setIsSystemAudioEnabled(e.target.checked);
                logAction(`Dźwięki: ${e.target.checked ? 'WŁĄCZONE' : 'WYCISZONE'}`);
              }}
              style={{ cursor: 'pointer' }}
            />
            🔊
          </label>
        </div>
      </div>

      {/* === SWD TOOLBAR — zgodny z SWD-ST 2.5 Rys.37 === */}
      <div className="swd-toolbar">
        <button className="toolbar-btn" title="Nowa Karta Zdarzenia [F2]" onClick={() => setIsNewIncidentModalOpen(true)}>
          <span style={{ fontSize: '12px' }}>📄</span>
          <span>Nowe (F2)</span>
        </button>
        <button 
          className="toolbar-btn" 
          title="Edytuj Wybrane Zdarzenie [F3]" 
          disabled={!selectedIncidentId}
          onClick={loadIncidentForEditing}
        >
          <span style={{ fontSize: '12px' }}>✏️</span>
          <span>Edytuj (F3)</span>
        </button>
        <button 
          className="toolbar-btn" 
          title="Odśwież rejestr i gotowość bojową [F5]" 
          onClick={() => {
            setSearchText('');
            setFilterType('all');
            setFilterStatus('all');
            logAction("Odświeżono rejestr zdarzeń i tablice bojowe.");
          }}
        >
          <span style={{ fontSize: '12px' }}>🔄</span>
          <span>Odśwież</span>
        </button>
      </div>



      {/* Toolbar with Action Buttons & Filters */}
      <div className="action-toolbar" style={{ padding: '2px 6px', background: 'var(--win-face)' }}>
        {activeMenuTab === 'rejestr' && activeRole !== 'pozorant' && (
          <>
            {activeIncident && (
              <>
                {activeIncident && !isLocked && (
                  <button className="btn-win" onClick={openLinkCallModal}>
                    📞 Podepnij
                  </button>
                )}

                <button className="btn-win" onClick={handleCopyToClipboard}>
                  📋 Kopiuj
                </button>
                <button className="btn-win" onClick={() => setIsPrintModalOpen(true)}>
                  🖨️ Karta Zdarzenia
                </button>

                {userProfile && (userProfile?.role === 'admin' || userProfile?.role === 'pa_jrg') && (
                  <button className="btn-win" onClick={() => setIsMergeModalOpen(true)}>
                    🔗 Scal
                  </button>
                )}

                {userProfile && (userProfile?.role === 'pa_jrg' || userProfile?.role === 'admin') && viewMode === 'active' && activeIncident.status === 'processed' && (
                  <button className="btn-win" onClick={handleArchiveIncident} style={{ backgroundColor: '#1864ab', color: 'white' }}>
                    📦 Przenieś do archiwum
                  </button>
                )}

                {userProfile && (userProfile?.role === 'pa_jrg' || userProfile?.role === 'admin') && viewMode === 'archive' && (
                  <button className="btn-win" onClick={handleRestoreIncident} style={{ backgroundColor: '#2b8a3e', color: 'white' }}>
                    📥 Przywróć do bufora
                  </button>
                )}

                {(userProfile && (userProfile?.role === 'admin' || (userProfile?.role === 'kdr_osp' && activeIncident.status === 'draft'))) && (
                  <button className="btn-win" onClick={handleDeleteIncident}>
                    ❌ Usuń
                  </button>
                )}

                {/* locked status alert log */}
                {getIncidentLockStatus(activeIncident) && (
                  <span style={{ fontSize: '10px', color: '#ff8787', display: 'flex', alignItems: 'center', gap: '5px', marginLeft: '6px' }}>
                    🔒 Zablokowane (&gt;7 dni)
                    {userProfile && userProfile?.role === 'admin' && !isAdminUnlockBypass && (
                      <button className="btn-win" style={{ padding: '1px 4px', fontSize: '9px', backgroundColor: '#e03131', border: 'none', color: 'white' }} onClick={() => setIsAdminUnlockBypass(true)}>
                        Odblokuj
                      </button>
                    )}
                  </span>
                )}
              </>
            )}

            <div style={{ width: '1px', height: '20px', backgroundColor: 'var(--win-shadow)', margin: '0 8px' }} />

            {/* View switch */}
            <div style={{ display: 'flex', gap: '3px' }}>
              <button className={`btn-win ${viewMode === 'active' ? 'active' : ''}`} onClick={() => { setViewMode('active'); setSelectedIncidentId(null); }}>
                Bieżący bufor
              </button>
              <button className={`btn-win ${viewMode === 'zaprzyjaznione' ? 'active' : ''}`} onClick={() => { setViewMode('zaprzyjaznione'); setSelectedIncidentId(null); }}>
                Zaprzyjaźnione jednostki
              </button>
              <button className={`btn-win ${viewMode === 'archive' ? 'active' : ''}`} onClick={() => { setViewMode('archive'); setSelectedIncidentId(null); }}>
                Archiwum meldunków
              </button>
            </div>

            <div style={{ width: '1px', height: '20px', backgroundColor: 'var(--win-shadow)', margin: '0 8px' }} />

            {/* Filter controls */}
            <input 
              type="text" 
              className="input-field" 
              style={{ width: '140px', padding: '3px 6px', fontSize: '10px' }} 
              placeholder="Filtruj adres/opis..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />

            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value)}
              className="input-field"
              style={{ width: '100px', padding: '2px 4px', fontSize: '10px' }}
            >
              <option value="all">Wszystkie rodzaje</option>
              <option value="mz">Miejscowe zagrożenia</option>
              <option value="pozar">Pożary</option>
              <option value="af">Alarmy fałszywe</option>
              <option value="cw">Ćwiczenia (CW)</option>
              <option value="wg">Wyjazdy Gosp. (WG)</option>
              <option value="pzr">Zabezpieczenia (PZR)</option>
            </select>

            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input-field"
              style={{ width: '120px', padding: '2px 4px', fontSize: '10px' }}
            >
              <option value="all">Wszystkie statusy</option>
              <option value="draft">Szkic (OSP)</option>
              <option value="submitted">Wysłane do PA</option>
              <option value="processed">Zatwierdzone EWID</option>
            </select>
          </>
        )}
      </div>

      {/* Main Console Layout */}
      <div className="dashboard-grid">
        {/* Top Pane - Combat units columns */}
        {renderCombatBoard()}

        {/* Middle Pane - Registry lists */}
        {activeMenuTab === 'konta' && userProfile && userProfile?.role === 'admin' ? (
          renderUsersManagement()
        ) : activeMenuTab === 'dziennik' ? (
          renderDutyLogSheet()
        ) : activeMenuTab === 'bufor' ? (
          renderBuforMeldunkow()
        ) : activeMenuTab === 'bramka' ? (
          renderBramkaSMS()
        ) : activeMenuTab === 'monitor' ? (
          renderMonitorTransmisji()
        ) : activeMenuTab === 'obiekty' ? (
          renderKatalogObiektow()
        ) : activeMenuTab === 'mapa' ? (
          renderMapaGIS()
        ) : activeMenuTab === 'procedury' ? (
          renderProcedury()
        ) : activeMenuTab === 'odo' ? (
          renderKalkulatorODO()
        ) : activeMenuTab === 'scoreboard' ? (
          renderScoreboardSheet()
        ) : activeMenuTab === 'katalog_sis' ? (
          renderKatalogSiS()
        ) : activeMenuTab === 'komunikaty' ? (
          renderKomunikatyScreen()
        ) : activeRole === 'pozorant' ? (
          renderCallerSimulator()
        ) : (
          <div className="middle-split-section" style={{ gridTemplateColumns: isChatSidebarOpen ? '1fr 310px 280px' : '1fr 310px' }}>
            {/* Left side: Incidents Table */}
            <div className="incident-table-pane border-inset" style={{ display: 'flex', flexDirection: 'column' }}>
              
              {/* Removed old WCPR banner; now handled in Bufor zdarzeń tab */}

              <div className="incident-table-container" style={{ flex: 1 }}>
                <table className="swd-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px', textAlign: 'center' }}>STAN</th>
                      <th style={{ width: '120px' }}>ID zdarzenia</th>
                      <th style={{ width: '110px' }}>Data i godzina</th>
                      <th style={{ width: '120px' }}>Komenda</th>
                      <th style={{ width: '120px' }}>JRG Odbiorca</th>
                      <th>Miejsce zdarzenia (Katowice)</th>
                      <th style={{ width: '55px' }}>Zastępy</th>
                      <th style={{ width: '55px' }}>Rodzaj</th>
                      <th>Opis zdarzenia</th>
                      <th style={{ width: '120px' }}>Nr meldunku</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIncidents.map((incident) => {
                      const isSelected = selectedIncidentId === incident.id;
                      const isProcessed = incident.status === 'processed';
                      const isSubmitted = incident.status === 'submitted';
                      const hasAccident = incident.times?.hasInjuries === true;
                      
                      let ledClass = "grey";
                      if (isProcessed) ledClass = "green";
                      else if (isSubmitted) ledClass = "red";
                      else ledClass = "yellow";

                      let timeString = "Teraz";
                      if (incident.createdAt) {
                        try {
                          const date = incident.createdAt.toDate ? incident.createdAt.toDate() : new Date(incident.createdAt);
                          timeString = date.toLocaleString('pl-PL', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
                        } catch (e) {
                          timeString = "Teraz";
                        }
                      }

                      const actionTypeLabel = incident.actionType === 'nieratownicze' ? '[Nieratownicze]' : '';

                      // Authentic operational state labels matching SWD-ST 2.5 manual (Page 46/67)
                      let stateLabel = "";
                      const times = incident.times || {};
                      if (incident.type === 'pozar') {
                        if (times.completion) stateLabel = "KP (Koniec)";
                        else if (times.arrival) stateLabel = "OP (Opanow.)";
                        else stateLabel = "PP (Prowadz.)";
                      } else if (incident.type === 'mz') {
                        if (times.completion) stateLabel = "KM (Koniec)";
                        else if (times.arrival) stateLabel = "OM (Opanow.)";
                        else stateLabel = "PM (Prowadz.)";
                      } else if (incident.type === 'cw') {
                        if (times.completion) stateLabel = "CZ (Zakończ.)";
                        else stateLabel = "CW (W toku)";
                      } else if (incident.type === 'wg') {
                        if (times.completion) stateLabel = "KWG (Koniec)";
                        else stateLabel = "WG (Wysył.)";
                      } else if (incident.type === 'pzr') {
                        if (times.completion) stateLabel = "KZR (Koniec)";
                        else stateLabel = "PZR (Zabezp.)";
                      } else if (incident.type === 'zpr') {
                        stateLabel = "ZPR (Przekaz.)";
                      } else if (incident.type === 'bl') {
                        stateLabel = "BL (Błąd)";
                      } else {
                        stateLabel = incident.type?.toUpperCase() || "MZ";
                      }

                      // Row background color based on incident operational state (SWD-ST Table 4 / Page 24)
                      const hasActiveVehicles = (incident.vehicles || []).some(v => {
                        const vs = incident.vehicleStatuses?.[v] || 5;
                        return vs >= 1 && vs <= 3;
                      });
                      const hasDispatchedVehicles = (incident.vehicles || []).some(v => {
                        const vs = incident.vehicleStatuses?.[v] || 5;
                        return vs === 1;
                      });
                      const isCompleted = incident.status === 'processed' || !!(incident.times?.completion);
                      
                      let rowBg = 'transparent';
                      if (isSelected) rowBg = '#005fb8';
                      else if (isCompleted) rowBg = '#f8f9fa';
                      else if (hasActiveVehicles) rowBg = '#fff5f5'; // Red-tinted for active
                      else if (hasDispatchedVehicles) rowBg = '#fffde7'; // Yellow-tinted for dispatched

                      return (
                        <tr 
                          key={incident.id} 
                          className={`swd-row ${isSelected ? 'selected' : ''} ${incident.isArchived ? 'archived' : ''} ${incident.type === 'bl' ? 'error-bl' : ''}`}
                          style={{ 
                            backgroundColor: isSelected ? '' : rowBg,
                            color: isSelected ? '#ffffff' : 'inherit',
                            borderLeft: hasActiveVehicles && !isSelected ? '3px solid #d13438' : hasDispatchedVehicles && !isSelected ? '3px solid #f59f00' : ''
                          }}
                          onClick={() => setSelectedIncidentId(incident.id)}
                          onDoubleClick={() => {
                            setSelectedIncidentId(incident.id);
                            // Open edit modal (as per SWD-ST 8.4 - double-click = modify)
                            setIsNewIncidentModalOpen(true);
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setSelectedIncidentId(incident.id);
                            setContextMenu({ x: e.clientX, y: e.clientY, incidentId: incident.id, incidentStatus: incident.status });
                          }}
                        >
                          <td style={{ textAlign: 'center' }}>
                            <span className={`led-indicator ${ledClass}`} />
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              {getGeocodingDot(incident.times?.geocodingStatus || 'yellow')}
                              {incident.customId || '---'}
                            </div>
                          </td>
                          <td style={{ color: isSelected ? 'inherit' : '#555' }}>
                            {timeString}
                          </td>
                          <td>KM/KP PSP</td>
                          <td>{incident.targetJrg ? incident.targetJrg : '---'}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                              <span>{incident.location}</span>
                              {incident.subtype && incident.subtype !== '' && (
                                <span style={{ fontSize: '7.5px', color: '#555', background: '#f1f3f5', border: '1px solid #ced4da', padding: '0 3px', borderRadius: '2px', whiteSpace: 'nowrap' }}>
                                  {incident.subtype.replace(/_/g, ' ').toUpperCase()}
                                </span>
                              )}
                              {(incident.flags || []).map(flag => {
                                const flagColors = {
                                  dlugotrl: { color: '#d13438', bg: '#ffe3e3', label: 'DŁ.' },
                                  masowe: { color: '#e67700', bg: '#fff3e0', label: 'MAS.' },
                                  hbzn: { color: '#7c3aed', bg: '#f0e6ff', label: 'HBZN' },
                                  wielopow: { color: '#0c8599', bg: '#e3fafc', label: 'WP.' },
                                  interwenc: { color: '#005fb8', bg: '#d0ebff', label: 'INT.' },
                                  katastrofa: { color: '#f03e3e', bg: '#fff5f5', label: 'KAT.' },
                                };
                                const fc = flagColors[flag] || { color: '#555', bg: '#f8f9fa', label: flag };
                                return (
                                  <span key={flag} style={{ fontSize: '7.5px', fontWeight: 'bold', color: fc.color, background: fc.bg, border: `1px solid ${fc.color}`, padding: '0 3px', borderRadius: '2px', whiteSpace: 'nowrap', animation: flag === 'katastrofa' ? 'led-pulse-red 1s infinite alternate' : 'none' }}>
                                    {fc.label}
                                  </span>
                                );
                              })}
                              {incident.isLongDuration && !(incident.flags || []).includes('dlugotrl') && (
                                <span style={{ fontSize: '7.5px', color: '#d13438', border: '1px solid #d13438', padding: '0 2px', borderRadius: '2px', fontWeight: 'bold' }}>DŁ.</span>
                              )}
                              {actionTypeLabel && <span style={{ fontSize: '7.5px', color: '#1864ab', border: '1px solid #1864ab', padding: '0 2px', borderRadius: '2px', fontWeight: 'bold' }}>{actionTypeLabel}</span>}
                              {incident.linkedCalls && incident.linkedCalls.length > 0 && (
                                <span style={{ color: '#005fb8', fontSize: '8.5px', fontWeight: 'bold' }} title={`Zgłoszenia wtórne: ${incident.linkedCalls.length}`}>
                                  📞{incident.linkedCalls.length}
                                </span>
                              )}
                              {hasAccident && (
                                <span style={{ backgroundColor: '#e03131', color: 'white', fontSize: '7.5px', padding: '1px 3px', borderRadius: '2px', fontWeight: 'bold', animation: 'led-pulse-red 0.8s infinite alternate' }}
                                  title={`WYPADEK RATOWNIKA: ${incident.times?.injuriesDescription}`}>
                                  🏥 WYP.
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>
                            {incident.vehicles ? incident.vehicles.length : 0}
                          </td>
                          <td>
                            <span className={`badge badge-${incident.type || 'mz'}`} style={{ fontSize: '9px', padding: '1px 3px' }}>
                              {stateLabel}
                            </span>
                          </td>
                          <td style={{ color: isSelected ? 'inherit' : '#555', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {incident.description}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {getEwidWorkflowBadge(incident)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Dziennik Korespondencji Radiowej (Removed per user request) */}
            </div>

            {/* Right side: Dispatched Units (Siły i Środki / SOP Tabs) */}
            <div className="forces-pane border-inset" style={{ position: 'relative' }}>
              
              {/* Tab selector */}
              <div style={{ display: 'flex', background: '#f3f3f3', borderBottom: '1.5px solid #d1d1d1', userSelect: 'none' }}>
                <button 
                  onClick={() => setRightPanelTab('sis')}
                  style={{ flex: 1, fontSize: '9.5px', padding: '5px 4px', border: '1px solid transparent', borderBottom: 'none', background: rightPanelTab === 'sis' ? '#ffffff' : '#f3f3f3', color: '#000000', fontWeight: rightPanelTab === 'sis' ? 'bold' : 'normal', cursor: 'pointer', outline: 'none', borderTopLeftRadius: '2px', borderTopRightRadius: '2px', marginTop: '2px', borderTop: rightPanelTab === 'sis' ? '1.5px solid #d1d1d1' : 'none', borderLeft: rightPanelTab === 'sis' ? '1.5px solid #d1d1d1' : 'none', borderRight: rightPanelTab === 'sis' ? '1.5px solid #d1d1d1' : 'none' }}
                >
                  Wszystkie ({activeIncident?.vehicles?.length || 0})
                </button>
                <button 
                  onClick={() => setRightPanelTab('sis')}
                  style={{ flex: 1, fontSize: '9.5px', padding: '5px 4px', border: '1px solid transparent', borderBottom: 'none', background: rightPanelTab === 'sis' ? '#f3f3f3' : '#f3f3f3', color: '#000000', fontWeight: 'normal', cursor: 'pointer', outline: 'none', borderTopLeftRadius: '2px', borderTopRightRadius: '2px', marginTop: '2px' }}
                >
                  Pojazdy ({activeIncident?.vehicles?.length || 0})
                </button>
                <button 
                  onClick={() => setRightPanelTab('sop')}
                  style={{ flex: 1, fontSize: '9.5px', padding: '5px 4px', border: '1px solid transparent', borderBottom: 'none', background: rightPanelTab === 'sop' ? '#ffffff' : '#f3f3f3', color: '#000000', fontWeight: rightPanelTab === 'sop' ? 'bold' : 'normal', cursor: 'pointer', outline: 'none', borderTopLeftRadius: '2px', borderTopRightRadius: '2px', marginTop: '2px', borderTop: rightPanelTab === 'sop' ? '1.5px solid #d1d1d1' : 'none', borderLeft: rightPanelTab === 'sop' ? '1.5px solid #d1d1d1' : 'none', borderRight: rightPanelTab === 'sop' ? '1.5px solid #d1d1d1' : 'none' }}
                >
                  Algorytmy SOP
                </button>
              </div>

              <div style={{ overflowY: 'auto', flex: 1, backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column' }}>
                {rightPanelTab === 'sis' ? (
                  <>
                    {/* Dyspozycje Toolbar */}
                    <div style={{ display: 'flex', gap: '2px', padding: '2px 4px', background: '#f3f3f3', borderBottom: '1px solid #d1d1d1' }}>

                      <button className="btn-win" style={{ padding: '2px 6px', fontSize: '10px' }} title="Wyjazd do akcji">▶️</button>
                      <button className="btn-win" style={{ padding: '2px 6px', fontSize: '10px' }} title="Zawrócenie z trasy">↩️</button>
                      <button className="btn-win" style={{ padding: '2px 6px', fontSize: '10px' }} title="Lokalizacja zagrożenia">📍</button>
                      <button className="btn-win" style={{ padding: '2px 6px', fontSize: '10px' }} title="Drukuj" onClick={() => setPrintPreviewMode('karta_manipulacyjna')}>🖨️</button>
                      <button className="btn-win" style={{ padding: '2px 6px', fontSize: '10px', color: '#888' }} title="Brak opcji">🚛</button>
                      <button className="btn-win" style={{ padding: '2px 6px', fontSize: '10px', color: '#8b008b', fontWeight: 'bold' }} title="Lokalizacja zagrożenia">L</button>
                    </div>

                    {/* SiS Table */}
                    {activeIncident && activeIncident.vehicles && activeIncident.vehicles.length > 0 ? (
                      <table className="swd-table" style={{ borderCollapse: 'collapse', width: '100%' }}>
                        <thead>
                          <tr>
                            <th style={{ width: '24px', textAlign: 'center', padding: '2px' }}></th>
                            <th style={{ padding: '2px 4px', textAlign: 'left' }}>Nazwa</th>
                            <th style={{ padding: '2px 4px', textAlign: 'left' }}>Kryptonim</th>
                            <th style={{ padding: '2px 4px', textAlign: 'left' }}>Jednostka użytkownika...</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeIncident.vehicles.map((vStr, i) => {
                            if (!vStr) return null;
                            const parts = vStr.split(' | ');
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
                            
                            const isSelected = selectedSisVehicle === vStr;
                            if (isSelected) {
                              statusBg = '#005fb8';
                              statusColor = '#ffffff';
                            }
                            
                            return (
                              <tr 
                                key={i} 
                                style={{ background: statusBg, cursor: 'default' }}
                                onClick={() => setSelectedSisVehicle(vStr)}
                                onContextMenu={(e) => { setSelectedSisVehicle(vStr); openVehicleContextMenu(e, vStr); }}
                              >
                                <td style={{ textAlign: 'center', padding: '1px 2px', fontSize: '10px' }}>{statusIcon}</td>
                                <td style={{ padding: '1px 4px', fontSize: '9.5px', color: statusColor, fontWeight: 'bold' }}>{vName}</td>
                                <td style={{ padding: '1px 4px', fontSize: '9.5px', color: statusColor }}>{kryptonim}</td>
                                <td style={{ padding: '1px 4px', fontSize: '9.5px', color: statusColor }}>{unit}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    ) : (
                      <div style={{ textAlign: 'center', color: '#d1d1d1', padding: '20px', fontSize: '10px' }}>
                        Brak przypisanych sił i środków.
                      </div>
                    )}
                  </>
                ) : (
                  /* SOP Checklist panel */
                  <div style={{ padding: '8px', color: '#000000' }}>
                    {activeIncident ? (
                      <>
                        <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#005fb8', borderBottom: '1px dashed #f3f3f3', paddingBottom: '3px', marginBottom: '8px', textTransform: 'uppercase' }}>
                          Standardowa procedura (Str. 54): {activeIncident.type === 'pozar' ? 'POŻAR' : activeIncident.type === 'mz' ? 'MIEJSCOWE ZAGROŻENIE' : 'ALARM FAŁSZYWY'}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {((activeIncident.type === 'pozar' ? [
                            "1. Zabezpieczenie miejsca zdarzenia / wyznaczenie strefy",
                            "2. Rozpoznanie obecności osób poszkodowanych wewnątrz",
                            "3. Wyłączenie mediów (główny wyłącznik prądu / zawór gazu)",
                            "4. Podanie pierwszego prądu gaśniczego w natarciu",
                            "5. Zbudowanie zasilania wodnego z hydrantu",
                            "6. Wprowadzenie rot gaśniczych w aparatach ODO",
                            "7. Lokalizacja pożaru i kontrolowane oddymianie",
                            "8. Sprawdzenie ukrytych ognisk kamerą termowizyjną"
                          ] : activeIncident.type === 'mz' ? [
                            "1. Zabezpieczenie terenu działań (pachołki / taśma / wóz)",
                            "2. Rozpoznanie wycieków substancji chemiczno-ekologicznych",
                            "3. Wykonanie dostępu i ewakuacja poszkodowanych",
                            "4. Udzielenie Kwalifikowanej Pierwszej Pomocy (KPP)",
                            "5. Odłączenie akumulatorów w rozbitych pojazdach",
                            "6. Zabezpieczenie ppoż. (podanie linii szybkiego natarcia)",
                            "7. Sorpcja płynów eksploatacyjnych z nawierzchni",
                            "8. Usuwanie wraków / gałęzi, przywrócenie ruchu"
                          ] : [
                            "1. Dojazd na miejsce i rozpoznanie zewnętrzne obiektu",
                            "2. Sprawdzenie wskazań czujek centrali pożarowej CSP",
                            "3. Wywiad z administratorem obiektu / zgłaszającym",
                            "4. Potwierdzenie negatywnego rozpoznania (brak zagrożenia)",
                            "5. Meldunek do SKKM o alarmie fałszywym (w dobrej wierze)"
                          ])).map((stepText, idx) => {
                            const isCompleted = (activeIncident.sopSteps || []).includes(stepText);
                            return (
                              <label 
                                key={idx} 
                                style={{ 
                                  display: 'flex', 
                                  alignItems: 'flex-start', 
                                  gap: '6px', 
                                  fontSize: '9.5px', 
                                  cursor: 'pointer',
                                  color: isCompleted ? '#2b8a3e' : '#000000',
                                  fontWeight: isCompleted ? 'bold' : 'normal'
                                }}
                              >
                                <input 
                                  type="checkbox" 
                                  checked={isCompleted}
                                  onChange={() => handleToggleSopStep(stepText)}
                                  style={{ marginTop: '1.5px', cursor: 'pointer' }}
                                />
                                <span style={{ textDecoration: isCompleted ? 'line-through' : 'none', opacity: isCompleted ? 0.75 : 1 }}>
                                  {stepText}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <div style={{ textAlign: 'center', color: '#d1d1d1', padding: '20px', fontSize: '10px' }}>
                        Zaznacz aktywne zdarzenie w rejestrze, aby otworzyć procedury SOP.
                      </div>
                    )}
                  </div>
                )}
              </div>


              {/* context menu simulator */}
              {activeContextMenuVehicle && (
                <div 
                  className="border-outset"
                  onClick={(e) => e.stopPropagation()}
                  onContextMenu={(e) => e.stopPropagation()}
                  style={{ 
                    position: 'fixed', 
                    left: `${contextMenuPosition.x}px`, 
                    top: `${contextMenuPosition.y}px`, 
                    zIndex: 9999, 
                    background: '#f3f3f3', 
                    padding: '2px', 
                    display: 'flex', 
                    flexDirection: 'column',
                    minWidth: '160px',
                    boxShadow: '2px 2px 5px rgba(0,0,0,0.5)',
                    fontSize: '11px'
                  }}
                >
                  <button className="btn-win" style={{ justifyContent: 'flex-start', padding: '3px 8px', border: 'none', boxShadow: 'none' }} onClick={() => handleSetVehicleStatus(activeContextMenuVehicle, 1)}>▶️ Wyjazd do akcji</button>
                  <button className="btn-win" style={{ justifyContent: 'flex-start', padding: '3px 8px', border: 'none', boxShadow: 'none' }} onClick={() => handleSetVehicleStatus(activeContextMenuVehicle, 0)}>↩️ Zawrócenie z trasy</button>
                  <button className="btn-win" style={{ justifyContent: 'flex-start', padding: '3px 8px', border: 'none', boxShadow: 'none' }} onClick={() => handleSetVehicleStatus(activeContextMenuVehicle, 2)}>🔽 Dojazd do MK</button>
                  <button className="btn-win" style={{ justifyContent: 'flex-start', padding: '3px 8px', border: 'none', boxShadow: 'none' }} onClick={() => handleSetVehicleStatus(activeContextMenuVehicle, 1)}>🔼 Wyjazd z MK</button>
                  <button className="btn-win" style={{ justifyContent: 'flex-start', padding: '3px 8px', border: 'none', boxShadow: 'none', color: '#c92a2a', fontWeight: 'bold' }} onClick={() => handleSetVehicleStatus(activeContextMenuVehicle, 2)}>📍 Na miejscu zdarzenia</button>
                  <button className="btn-win" style={{ justifyContent: 'flex-start', padding: '3px 8px', border: 'none', boxShadow: 'none', color: '#8b008b', fontWeight: 'bold' }} onClick={() => handleSetVehicleStatus(activeContextMenuVehicle, 2)}>L Lokalizacja zagrożenia</button>
                  <button className="btn-win" style={{ justifyContent: 'flex-start', padding: '3px 8px', border: 'none', boxShadow: 'none', color: '#2b8a3e', fontWeight: 'bold' }} onClick={() => handleSetVehicleStatus(activeContextMenuVehicle, 3)}>◀️ Zakończenie działań</button>
                  <button className="btn-win" style={{ justifyContent: 'flex-start', padding: '3px 8px', border: 'none', boxShadow: 'none', color: '#2b8a3e', fontWeight: 'bold' }} onClick={() => handleSetVehicleStatus(activeContextMenuVehicle, 4)}>🏠 Powrót do bazy</button>
                  <div style={{ height: '1px', backgroundColor: '#d1d1d1', margin: '2px 0' }} />
                  
                  {activeIncident && activeIncident.type === 'pzr' && (
                    <button className="btn-win" style={{ justifyContent: 'flex-start', padding: '3px 8px', border: 'none', boxShadow: 'none', color: '#005fb8' }} onClick={() => handleReturnPzrVehicle(activeContextMenuVehicle)}>↩️ Zwróć sprzęt (Koniec zabezpiecz.)</button>
                  )}

                  <button className="btn-win" style={{ justifyContent: 'flex-start', padding: '3px 8px', border: 'none', boxShadow: 'none' }} onClick={() => {
                    const vStr = activeContextMenuVehicle;
                    setCrewTargetVehicle(vStr);
                    const currentCrew = activeIncident.crew?.[vStr] || {};
                    const metrics = activeIncident.vehicleMetrics?.[vStr] || { km: 0, fuel: 0 };
                    setCrewDowodca(currentCrew.dowodca || '');
                    setCrewKierowca(currentCrew.kierowca || '');
                    setCrewRatownicy(currentCrew.ratownicy || '');
                    setCrewKm(metrics.km || 0);
                    setCrewFuel(metrics.fuel || 0);
                    setIsCrewModalOpen(true);
                  }}>👤 Obsada imienna i metryki</button>
                  
                  {activeContextMenuVehicle.includes('OSP') && (
                    <button className="btn-win" style={{ justifyContent: 'flex-start', padding: '3px 8px', border: 'none', boxShadow: 'none', color: '#d13438' }} onClick={() => triggerOspSiren(activeContextMenuVehicle.split(' | ')[0])}>🔊 DSP-50 Syrena alarmowa</button>
                  )}
                  {activeContextMenuVehicle.includes('JRG') && (
                    <button className="btn-win" style={{ justifyContent: 'flex-start', padding: '3px 8px', border: 'none', boxShadow: 'none', color: '#0b7285' }} onClick={() => triggerDwaPrinter(activeContextMenuVehicle.split(' | ')[0])}>🖨️ Formatka DWA</button>
                  )}
                  <div style={{ height: '1px', backgroundColor: '#d1d1d1', margin: '2px 0' }} />
                  <button className="btn-win" style={{ justifyContent: 'flex-start', padding: '3px 8px', border: 'none', boxShadow: 'none', color: '#000' }} onClick={() => handleEditKryptonim(activeContextMenuVehicle)}>✏️ Edytuj Kryptonim</button>
                  <div style={{ height: '1px', backgroundColor: '#d1d1d1', margin: '2px 0' }} />
                  <button className="btn-win" style={{ justifyContent: 'flex-start', padding: '3px 8px', border: 'none', boxShadow: 'none', color: '#d13438' }} onClick={() => removeVehicleFromActiveIncident(activeContextMenuVehicle)}>❌ Wycofaj zastęp (Błąd)</button>
                </div>
              )}
              
              {/* Ewidencja Hydrantow Nearby Search Display */}
              {activeIncident && (
                <div className="border-inset" style={{ padding: '6px', background: '#f3f3f3', borderRadius: '4px', margin: '4px' }}>
                  <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#005fb8', textTransform: 'uppercase', marginBottom: '4px' }}>
                    💧 Zaopatrzenie Wodne (Ewidencja Hydr-ST)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {getNearbyHydrants(activeIncident.location).map(h => (
                      <div key={h.id} style={{ fontSize: '8.5px', background: '#ffffff', padding: '3px', borderRadius: '2px', borderLeft: `2px solid ${h.status === 'sprawny' ? '#0a6ece' : '#fa5252'}`, display: 'flex', justifycontent: 'space-between', color: '#000', justifyContent: 'space-between' }}>
                        <span><strong>{h.id}</strong> ({h.type} {h.diameter}) - {h.location}</span>
                        <span style={{ color: h.status === 'sprawny' ? '#2b8a3e' : '#fa5252', fontWeight: 'bold' }}>~{h.distance}m</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Messenger-ST Panel */}
            {isChatSidebarOpen && (
              <div className="forces-pane border-inset" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div className="forces-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Komunikator Dyspozytorski</span>
                  <button onClick={() => setIsChatSidebarOpen(false)} style={{ background: 'none', border: 'none', color: '#ff3333', cursor: 'pointer', fontWeight: 'bold' }}>X</button>
                </div>
                
                <div style={{ flex: 1, overflowY: 'auto', padding: '6px', background: '#ffffff', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {messages.map((m, idx) => (
                    <div key={idx} style={{ fontSize: '10px', background: m.priority === 'urgent' ? '#ffe3e3' : m.priority === 'confirm' ? '#fff9db' : '#f8f9fa', border: m.priority === 'urgent' ? '1.5px solid #e03131' : '1px solid #f3f3f3', padding: '5px 8px', borderRadius: '3px', color: '#000000' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: m.priority === 'urgent' ? '#d13438' : '#005fb8', fontWeight: 'bold', marginBottom: '2px' }}>
                        <span>{m.sender} ({m.senderUnit}) {m.recipient && m.recipient !== 'Wszyscy' ? `➔ ${m.recipient.replace("JRG nr ", "JRG ").replace("OSP ", "")}` : ''}</span>
                        <span style={{ color: '#868e96' }}>
                          {m.createdAt ? (m.createdAt.toDate ? m.createdAt.toDate().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }) : '') : ''}
                        </span>
                      </div>
                      <div>{m.text}</div>
                      {m.confirmations && Object.keys(m.confirmations).length > 0 && (
                        <div style={{ fontSize: '8.5px', color: '#2b8a3e', marginTop: '3px', fontWeight: 'bold' }}>
                          ✓ Odebrano: {Object.entries(m.confirmations).map(([unit, time]) => `${unit.replace("OSP ", "").replace("JRG nr ", "JRG ")} (${time})`).join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSendMessage} style={{ display: 'flex', flexDirection: 'column', padding: '4px', gap: '3px', background: '#f3f3f3', borderTop: '1px solid var(--win-shadow)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '2px' }}>
                    <select 
                      value={msgRecipient} 
                      onChange={(e) => setMsgRecipient(e.target.value)} 
                      style={{ fontSize: '9px', padding: '1px', background: '#fff', color: '#000', outline: 'none' }}
                    >
                      <option value="Wszyscy">✉️ Adresat: Wszyscy</option>
                      {ALL_UNITS.filter(u => u !== 'KM/KP PSP').map(u => (
                        <option key={u} value={u}>✉️ Adresat: {u.replace("JRG nr ", "JRG ").replace("OSP ", "")}</option>
                      ))}
                    </select>

                    <select 
                              value={msgPriority} 
                      onChange={(e) => setMsgPriority(e.target.value)}
                      style={{ fontSize: '9px', padding: '1px', background: '#fff', color: '#000', outline: 'none' }}
                    >
                      <option value="normal">⚪ Priorytet: Zwykły</option>
                      <option value="confirm">🟡 Priorytet: Potwierdzany</option>
                      <option value="urgent">🔴 Priorytet: PILNY (Alarm)</option>
                    </select>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '3px' }}>
                    <input 
                      type="text" 
                      className="input-field" 
                      style={{ flex: 1, padding: '4px 6px', fontSize: '10px', background: '#fff' }} 
                      placeholder="Napisz do stanowisk..."
                      value={chatInputText}
                      onChange={(e) => setChatInputText(e.target.value)}
                    />
                    <button type="submit" className="btn-win" style={{ padding: '2px 8px', fontWeight: 'bold' }}>Wyślij</button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        <footer className="bottom-console border-outset">
          <div className="transmission-panel border-inset" style={{ background: '#ffffff', color: '#000' }}>
            <div className="transmission-top">
              <span>Podgląd stanu TRANSMISJI</span>
            </div>
            <div className="transmission-controls" style={{ padding: '2px 0', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '9.5px', color: '#333' }}>
                <span className="led-indicator green" style={{ width: 7, height: 7 }} />
                <span>ACS — KW PSP</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '9.5px', color: '#333' }}>
                <span className="led-indicator green" style={{ width: 7, height: 7 }} />
                <span>Replikacja baz danych</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '9.5px', color: incomingCalls.length > 0 ? '#c00000' : '#555' }}>
                <span className={`led-indicator ${incomingCalls.length > 0 ? 'red' : 'grey'}`} style={{ width: 7, height: 7 }} />
                <span style={{ fontWeight: incomingCalls.length > 0 ? 'bold' : 'normal' }}>
                  → 112 {incomingCalls.length > 0 ? `POŁĄCZENIE (${incomingCalls.length})` : 'Linia wolna'}
                </span>
              </div>
            </div>
          </div>

          <div className="tactical-clock-container border-inset">
            <div className="tactical-clock">
              {systemTime.toLocaleTimeString('pl-PL')}
            </div>
            <div className="tactical-date">
              {systemTime.toLocaleDateString('pl-PL', { day: '2-digit', month: 'long', year: 'numeric' })}
            </div>
          </div>

          {/* Mapa GIS moved to modal for SWD-ST 1:1 compliance */}


        </footer>

        {/* === DOLNY PASEK STATUSU (Status Bar SWD-ST 2.5) === */}
        <div className="status-bar">
          <div className="status-bar-cell" style={{ minWidth: '240px' }}>
            Użytkownik systemu: <strong style={{ marginLeft: '3px' }}>{userProfile?.displayName || userProfile?.email || 'N/A'}</strong>
          </div>
          <div className="status-bar-cell" style={{ minWidth: '140px' }}>
            Alarmy monitoringu: <strong style={{ color: incidents.filter(i => i.status !== 'processed' && !i.isArchived).length > 0 ? '#c00000' : '#2b8a3e' }}>{incidents.filter(i => i.status !== 'processed' && !i.isArchived).length}</strong>
          </div>
          <div className="status-bar-cell" style={{ flex: 1, minWidth: 0 }}>
            {activeIncident ? (
              <span style={{ color: '#005fb8', fontWeight: 'bold', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Zdarzenie: {activeIncident.customId} | {activeIncident.location}
              </span>
            ) : (
              <span style={{ color: '#d1d1d1' }}>Rejestr wyjazdów PSP — KM/KP PSP</span>
            )}
          </div>
          <div className="status-bar-cell" style={{ minWidth: '90px' }}>
            Zdarzeń: <strong>{incidents.filter(i => !i.isArchived).length}</strong> ({incidents.length})
          </div>
          <div className="monitor-112" style={{ borderTop: 'none', borderBottom: 'none' }}>
            <span style={{ fontWeight: 'bold', fontSize: '9px' }}>→ 112</span>
            <span className={`led-indicator ${incomingCalls.length > 0 ? 'red' : 'green'}`} style={{ width: 6, height: 6 }} />
            <span style={{ color: incomingCalls.length > 0 ? '#c00000' : '#2b8a3e', fontSize: '9px' }}>
              {incomingCalls.length > 0 ? `POŁĄCZENIE (${incomingCalls.length})` : 'Linia wolna'}
            </span>
          </div>
          <div className="status-bar-cell" style={{ minWidth: '165px', fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>
            {systemTime.toLocaleString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit', year: '2-digit' })}
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------
          BATTLE ALARM SCREEN OVERLAY (🚨 ALARM BOJOWY DLA JRG/OSP! 🚨)
          ------------------------------------------------------------- */}
      {battleAlarmModalOpen && battleAlarmIncident && (
        <div className="win-dialog-overlay" style={{ background: 'rgba(201, 42, 42, 0.9)', zIndex: 99999 }}>
          <div className="win-dialog border-double-outset" style={{ width: '480px', animation: 'led-pulse-red 0.8s infinite alternate' }}>
            <div className="win-dialog-header" style={{ background: '#000000', color: '#ff3333', textAlign: 'center', fontWeight: 'bold', fontSize: '13px' }}>
              🚨 ALARM BOJOWY - DYSPONOWANIE JEDNOSTKI 🚨
            </div>
            <div className="win-dialog-body" style={{ background: '#000000', color: '#ffffff', padding: '20px', textAlign: 'center' }}>
              <h2 style={{ fontSize: '18px', color: '#ff3333', fontWeight: 'bold', marginBottom: '10px' }}>
                {activeRole === 'kdr_osp' ? userProfile?.ospUnit?.toUpperCase() : userProfile?.jrgUnit?.toUpperCase()}
              </h2>
              <div style={{ fontSize: '11px', color: '#ffcc00', border: '1px solid #ffcc00', padding: '6px', background: '#1c1500', marginBottom: '15px' }}>
                RODZAJ ZDARZENIA: {battleAlarmIncident.type === 'pozar' ? '🔥 POŻAR' : battleAlarmIncident.type === 'mz' ? '⚠️ MIEJSCOWE ZAGROŻENIE' : '🚨 ALARM FAŁSZYWY'}
              </div>

              <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>
                MIEJSCE: {battleAlarmIncident.location}
              </div>
              <div style={{ fontSize: '10.5px', color: '#adb5bd', fontStyle: 'italic', marginBottom: '20px' }}>
                "{battleAlarmIncident.description}"
              </div>

              <button 
                className="btn-win" 
                style={{ 
                  background: '#2b8a3e', 
                  color: '#ffffff', 
                  fontSize: '12px', 
                  fontWeight: 'bold', 
                  padding: '8px 20px', 
                  border: '2px solid #ffffff',
                  boxShadow: 'none'
                }} 
                onClick={handleAcknowledgeBattleAlarm}
              >
                ✔️ ZROZUMIAŁEM (POTWIERDŹ ODBIÓR I ALARM)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          DIALOG MODAL: SHIFT CHANGE / TRANSITION (Otwarcie nowej zmiany - Page 34)
          ------------------------------------------------------------- */}
      {isVehiclesModalOpen && (
        <div className="modal-overlay">
          <div className="win-dialog border-double-outset" style={{ width: '600px' }}>
            <div className="win-dialog-header">
              <span style={{ fontWeight: 'bold' }}>Zarządzanie Pojazdami (Siły i Środki)</span>
              <button className="btn-win" style={{ padding: '1px 5px', fontSize: '9px', fontWeight: 'bold' }} onClick={() => setIsVehiclesModalOpen(false)}>X</button>
            </div>
            <div className="win-dialog-content" style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '11px', color: '#333', marginBottom: '8px' }}>Edytuj kryptonimy i usuwaj/dodawaj pojazdy w poszczególnych jednostkach.</div>
              <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid #d1d1d1', background: '#fff', padding: '4px' }}>
                {Object.keys(tenantVehicles).map(unit => (
                  <div key={unit} style={{ marginBottom: '10px' }}>
                    <div style={{ fontWeight: 'bold', backgroundColor: '#e3e3e3', padding: '4px', fontSize: '11px' }}>{unit}</div>
                    <table className="swd-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', padding: '2px' }}>Nazwa (np. GCBA 5/32)</th>
                          <th style={{ textAlign: 'left', padding: '2px' }}>Kryptonim</th>
                          <th style={{ textAlign: 'left', padding: '2px', width: '60px' }}>Akcja</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(tenantVehicles[unit] || []).map(veh => (
                          <tr key={veh.name}>
                            <td style={{ padding: '2px' }}>{veh.name}</td>
                            <td style={{ padding: '2px' }}>
                              <input 
                                type="text" 
                                value={veh.kryptonim || ''} 
                                style={{ width: '100%', fontSize: '10px', border: '1px solid #ccc' }}
                                onChange={(e) => {
                                  const updatedVehicles = { ...tenantVehicles };
                                  updatedVehicles[unit] = updatedVehicles[unit].map(v => 
                                    v.name === veh.name ? { ...v, kryptonim: e.target.value } : v
                                  );
                                  setTenantVehicles(updatedVehicles);
                                }}
                              />
                            </td>
                            <td style={{ padding: '2px' }}>
                              <button style={{ color: 'red', cursor: 'pointer', border: 'none', background: 'transparent' }} onClick={() => {
                                if(confirm("Na pewno usunąć?")) {
                                  const updatedVehicles = { ...tenantVehicles };
                                  updatedVehicles[unit] = updatedVehicles[unit].filter(v => v.name !== veh.name);
                                  setTenantVehicles(updatedVehicles);
                                }
                              }}>Usuń</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div style={{ marginTop: '2px' }}>
                      <button className="btn-win" style={{ fontSize: '9px', padding: '2px 4px' }} onClick={() => {
                        const newName = window.prompt(`Podaj nazwę nowego pojazdu dla ${unit} (np. GBA 2.5/16):`);
                        if (newName) {
                          const updatedVehicles = { ...tenantVehicles };
                          if (!updatedVehicles[unit]) updatedVehicles[unit] = [];
                          updatedVehicles[unit].push({ name: newName, kryptonim: '', obsada: [] });
                          setTenantVehicles(updatedVehicles);
                        }
                      }}>+ Dodaj pojazd do {unit}</button>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '5px', marginTop: '5px' }}>
                <button className="btn-win" onClick={() => setIsVehiclesModalOpen(false)}>❌ Anuluj</button>
                <button className="btn-win" style={{ fontWeight: 'bold' }} onClick={() => {
                  updateDoc(doc(db, 'tenantSettings', 'default'), { vehicles: tenantVehicles })
                    .then(() => alert('Zapisano pojazdy!'))
                    .catch(e => console.error(e));
                  setIsVehiclesModalOpen(false);
                }}>💾 Zapisz zmiany</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isShiftTransitionModalOpen && (
        <div className="win-dialog-overlay" style={{ zIndex: 99999 }}>
          <div className="win-dialog border-double-outset" style={{ width: '420px' }}>
            <div className="win-dialog-header">
              <span>Otwarcie Nowej Zmiany Służbowej (Handover)</span>
              <button className="btn-win" style={{ padding: '1px 5px', fontSize: '9px', fontWeight: 'bold' }} onClick={() => setIsShiftTransitionModalOpen(false)}>X</button>
            </div>
            <div className="win-dialog-body">
              <div style={{ fontSize: '10px', color: '#555', borderBottom: '1px solid #d1d1d1', paddingBottom: '4px', marginBottom: '10px' }}>
                Zgodnie z Rozdziałem 7.11 instrukcji, rozpoczęcie nowej służby wyzeruje imienne obsady i statusy wozów dla trwających akcji operacyjnych.
              </div>

              <div className="input-group">
                <label className="input-label">Numer Zmiany Służbowej:</label>
                <select value={shiftNumber} onChange={(e) => setShiftNumber(e.target.value)} className="input-field">
                  <option value="1">Zmiana I (Służba 24/48)</option>
                  <option value="2">Zmiana II (Służba 24/48)</option>
                  <option value="3">Zmiana III (Służba 24/48)</option>
                </select>
              </div>

              <div style={{ fontSize: '9.5px', fontWeight: 'bold', color: '#005fb8', marginTop: '10px', marginBottom: '6px', textTransform: 'uppercase' }}>
                Nieobecni na zmianie (Str. 35 instrukcji):
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: '#ffffff', padding: '8px', border: '1px solid #d1d1d1', marginBottom: '12px' }}>
                <label style={{ fontSize: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  Urlopy:
                  <input type="number" className="input-field" style={{ width: '50px', padding: '1px' }} value={absentUrlop} onChange={(e) => setAbsentUrlop(parseInt(e.target.value, 10))} />
                </label>
                <label style={{ fontSize: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  Chorzy:
                  <input type="number" className="input-field" style={{ width: '50px', padding: '1px' }} value={absentChorzy} onChange={(e) => setAbsentChorzy(parseInt(e.target.value, 10))} />
                </label>
                <label style={{ fontSize: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  Delegacje:
                  <input type="number" className="input-field" style={{ width: '50px', padding: '1px' }} value={absentDelegacja} onChange={(e) => setAbsentDelegacja(parseInt(e.target.value, 10))} />
                </label>
                <label style={{ fontSize: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  Wakaty:
                  <input type="number" className="input-field" style={{ width: '50px', padding: '1px' }} value={absentWakat} onChange={(e) => setAbsentWakat(parseInt(e.target.value, 10))} />
                </label>
                <label style={{ fontSize: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} colSpan="2">
                  Wolna służba:
                  <input type="number" className="input-field" style={{ width: '50px', padding: '1px' }} value={absentWolna} onChange={(e) => setAbsentWolna(parseInt(e.target.value, 10))} />
                </label>
              </div>

              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', borderTop: '1px solid var(--win-shadow)', paddingTop: '8px' }}>
                <button className="btn-win" onClick={() => setIsShiftTransitionModalOpen(false)}>❌ Anuluj</button>
                <button className="btn-win" style={{ backgroundColor: '#2b8a3e', color: 'white', fontWeight: 'bold' }} onClick={handlePerformShiftTransition}>
                  📂 Rozpocznij Nową Zmianę
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          DIALOG MODAL: MAPA GIS
          ------------------------------------------------------------- */}
      {isMapModalOpen && (
        <div className="win-dialog-overlay" style={{ zIndex: 99990 }}>
          <div className="win-dialog border-double-outset" style={{ width: '800px', height: '600px' }}>
            <div className="win-dialog-header">
              <span>Moduł: Mapa-ST3 / GIS</span>
              <button className="btn-win" style={{ padding: '1px 5px', fontSize: '9px', fontWeight: 'bold' }} onClick={() => setIsMapModalOpen(false)}>X</button>
            </div>
            <div className="win-dialog-body" style={{ padding: 0, height: '100%', overflow: 'hidden' }}>
              {renderInteractiveMap()}
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          DIALOG MODAL: MERGE INCIDENTS (Chapter 8.8 - Str. 64 instrukcji)
          ------------------------------------------------------------- */}
      {isMergeModalOpen && activeIncident && (
        <div className="win-dialog-overlay" style={{ zIndex: 99999 }}>
          <div className="win-dialog border-double-outset" style={{ width: '440px' }}>
            <div className="win-dialog-header">
              <span>Scalanie Zdarzeń Operacyjnych (Merge)</span>
              <button className="btn-win" style={{ padding: '1px 5px', fontSize: '9px', fontWeight: 'bold' }} onClick={() => setIsMergeModalOpen(false)}>X</button>
            </div>
            <div className="win-dialog-body">
              <div style={{ fontSize: '10px', color: '#555', borderBottom: '1px solid #d1d1d1', paddingBottom: '4px', marginBottom: '10px' }}>
                Wybierz aktywne zdarzenie z bufora, które chcesz scalić z obecnie wybranym zdarzeniem <strong>{activeIncident.customId}</strong>.
                Wszystkie zadysponowane wozy, logi radiowe oraz zgłoszenia wtórne zostaną przeniesione. Proces ten jest nieodwracalny.
              </div>

              <div style={{ maxHeight: '160px', overflowY: 'auto', background: '#ffffff', border: '1px solid #d1d1d1', padding: '4px' }}>
                {incidents.filter(inc => inc.id !== activeIncident.id && inc.status !== 'processed' && !inc.isArchived).map(inc => (
                  <div 
                    key={inc.id} 
                    style={{ 
                      padding: '4px 8px', 
                      borderBottom: '1px solid #e9ecef', 
                      cursor: 'pointer',
                      fontSize: '10px',
                      color: '#000000',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                    onClick={() => handleMergeIncidents(inc.id)}
                  >
                    <span><strong>{inc.customId}</strong> - {userProfile?.role === 'admin' && inc.tenantId ? `[${inc.tenantId}] ` : ''}{inc.location} ({inc.type.toUpperCase()})</span>
                    <span style={{ color: '#1864ab', fontWeight: 'bold' }}>Scal ➔</span>
                  </div>
                ))}
                {incidents.filter(inc => inc.id !== activeIncident.id && inc.status !== 'processed' && !inc.isArchived).length === 0 && (
                  <div style={{ color: '#d1d1d1', textAlign: 'center', padding: '20px', fontSize: '10px' }}>Brak innych aktywnych zdarzeń w buforze.</div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', borderTop: '1px solid var(--win-shadow)', paddingTop: '8px', marginTop: '10px' }}>
                <button className="btn-win" onClick={() => setIsMergeModalOpen(false)}>❌ Zamknij</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          DIALOG MODAL: PRZEKAZYWANIE ZDARZEŃ (Rozdz. 8.9)
          ------------------------------------------------------------- */}
      {isTransferModalOpen && activeIncident && (
        <div className="win-dialog-overlay" style={{ zIndex: 99999 }}>
          <div className="win-dialog border-double-outset" style={{ width: '440px' }}>
            <div className="win-dialog-header">
              <span>Przekazywanie Zdarzenia (Transfer)</span>
              <button className="btn-win" style={{ padding: '1px 5px', fontSize: '9px', fontWeight: 'bold' }} onClick={() => setIsTransferModalOpen(false)}>X</button>
            </div>
            <div className="win-dialog-body">
              <div style={{ fontSize: '10px', color: '#555', borderBottom: '1px solid #d1d1d1', paddingBottom: '4px', marginBottom: '10px' }}>
                Wybierz jednostkę dyspozytorską (innego Gracza), której chcesz przekazać obsługę zdarzenia <strong>{activeIncident.customId}</strong>.
                Zdarzenie zniknie z Twojego bufora i pojawi się w buforze docelowej jednostki. (Rozdz. 8.9)
              </div>

              <div style={{ maxHeight: '160px', overflowY: 'auto', background: '#ffffff', border: '1px solid #d1d1d1', padding: '4px' }}>
                <div 
                  style={{ padding: '4px 8px', borderBottom: '1px solid #e9ecef', cursor: 'pointer', fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  onClick={() => handleTransferIncident('KM_Tychy')}
                >
                  <span><strong>KM PSP Tychy</strong></span>
                  <span style={{ color: '#1864ab', fontWeight: 'bold' }}>Przekaż ➔</span>
                </div>
                <div 
                  style={{ padding: '4px 8px', borderBottom: '1px solid #e9ecef', cursor: 'pointer', fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  onClick={() => handleTransferIncident('KM_Sosnowiec')}
                >
                  <span><strong>KM PSP Sosnowiec</strong></span>
                  <span style={{ color: '#1864ab', fontWeight: 'bold' }}>Przekaż ➔</span>
                </div>
                <div 
                  style={{ padding: '4px 8px', borderBottom: '1px solid #e9ecef', cursor: 'pointer', fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  onClick={() => handleTransferIncident('KW_PSP_Katowice')}
                >
                  <span><strong>KW PSP Katowice (Wojewódzkie)</strong></span>
                  <span style={{ color: '#1864ab', fontWeight: 'bold' }}>Przekaż ➔</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', borderTop: '1px solid var(--win-shadow)', paddingTop: '8px', marginTop: '10px' }}>
                <button className="btn-win" onClick={() => setIsTransferModalOpen(false)}>❌ Anuluj</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          DIALOG MODAL: WYDRUK KARTY ZDARZENIA (Chapter 8.11)
          ------------------------------------------------------------- */}
      {isPrintModalOpen && activeIncident && (
        <div className="win-dialog-overlay" style={{ zIndex: 99999 }}>
          <div className="win-dialog border-double-outset" style={{ width: '600px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="win-dialog-header">
              <span>Wydruk: Karta Zdarzenia ({activeIncident.customId})</span>
              <button className="btn-win" style={{ padding: '1px 5px', fontSize: '9px', fontWeight: 'bold' }} onClick={() => setIsPrintModalOpen(false)}>X</button>
            </div>
            <div className="win-dialog-body" style={{ flex: 1, overflowY: 'auto', background: '#fff', padding: '20px', fontFamily: '"Times New Roman", Times, serif', color: '#000' }}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, fontSize: '18px' }}>KARTA ZDARZENIA NR {activeIncident.customId}</h2>
                <div style={{ fontSize: '12px' }}>PAŃSTWOWA STRAŻ POŻARNA - WYDRUK Z SYSTEMU SWD-ST 2.5</div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '15px' }}>
                <tbody>
                  <tr><td style={{ border: '1px solid #000', padding: '4px', fontWeight: 'bold', width: '30%' }}>Zgłaszający:</td><td style={{ border: '1px solid #000', padding: '4px' }}>{activeIncident.callerName || 'Brak danych'} (Tel: {activeIncident.callerPhone || '---'})</td></tr>
                  <tr><td style={{ border: '1px solid #000', padding: '4px', fontWeight: 'bold' }}>Rodzaj zdarzenia:</td><td style={{ border: '1px solid #000', padding: '4px' }}>{activeIncident.type?.toUpperCase()} {activeIncident.subtype ? `- ${activeIncident.subtype.replace(/_/g, ' ').toUpperCase()}` : ''}</td></tr>
                  <tr><td style={{ border: '1px solid #000', padding: '4px', fontWeight: 'bold' }}>Miejsce:</td><td style={{ border: '1px solid #000', padding: '4px' }}>{activeIncident.location}</td></tr>
                  <tr><td style={{ border: '1px solid #000', padding: '4px', fontWeight: 'bold' }}>Data zgłoszenia:</td><td style={{ border: '1px solid #000', padding: '4px' }}>{activeIncident.createdAt?.toDate ? activeIncident.createdAt.toDate().toLocaleString('pl-PL') : activeIncident.createdAt?.toString()}</td></tr>
                  <tr><td style={{ border: '1px solid #000', padding: '4px', fontWeight: 'bold' }}>Opis / Notatki:</td><td style={{ border: '1px solid #000', padding: '4px' }}>{activeIncident.notes || '---'}</td></tr>
                </tbody>
              </table>

              <div style={{ fontWeight: 'bold', marginBottom: '5px', fontSize: '12px' }}>Zadysponowane Siły i Środki:</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '20px' }}>
                <thead style={{ background: '#f0f0f0' }}>
                  <tr>
                    <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'left' }}>Kryptonim</th>
                    <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>Wyjazd</th>
                    <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>Na Miejscu</th>
                    <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>Powrót</th>
                  </tr>
                </thead>
                <tbody>
                  {(activeIncident.vehicles || []).map((v, i) => (
                    <tr key={i}>
                      <td style={{ border: '1px solid #000', padding: '4px' }}>{v}</td>
                      <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{activeIncident.times?.vehicleTimes?.[v]?.departure || '---'}</td>
                      <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{activeIncident.times?.vehicleTimes?.[v]?.arrival || '---'}</td>
                      <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{activeIncident.times?.vehicleTimes?.[v]?.return || '---'}</td>
                    </tr>
                  ))}
                  {(!activeIncident.vehicles || activeIncident.vehicles.length === 0) && (
                    <tr><td colSpan="4" style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>Brak zadysponowanych SiS</td></tr>
                  )}
                </tbody>
              </table>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px', fontSize: '12px' }}>
                <div style={{ textAlign: 'center', width: '200px', borderTop: '1px solid #000', paddingTop: '5px' }}>Podpis Dyspozytora</div>
                <div style={{ textAlign: 'center', width: '200px', borderTop: '1px solid #000', paddingTop: '5px' }}>Data wydruku: {new Date().toLocaleDateString('pl-PL')}</div>
              </div>
            </div>
            <div style={{ padding: '8px', background: 'var(--win-face)', borderTop: '1px solid var(--win-shadow)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="btn-win" onClick={() => window.print()}>🖨️ Drukuj (System)</button>
              <button className="btn-win" onClick={() => setIsPrintModalOpen(false)}>❌ Zamknij</button>
            </div>
          </div>
        </div>
      )}
      {activePopups.length > 0 && (
        <div style={{ position: 'fixed', bottom: '260px', right: '15px', zIndex: 99999, display: 'flex', flexDirection: 'column', gap: '8px', width: '300px' }}>
          {activePopups.map((popup) => {
            const isUrgent = popup.priority === 'urgent';
            const isConfirm = popup.priority === 'confirm' || isUrgent;
            return (
              <div 
                key={popup.id} 
                className="border-double-outset"
                style={{ 
                  background: isUrgent ? '#ffe3e3' : '#ffffe0', 
                  border: isUrgent ? '2px solid #e03131' : '2px solid #f3f3f3',
                  padding: '8px',
                  boxShadow: '3px 3px 10px rgba(0,0,0,0.5)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #d1d1d1', paddingBottom: '3px', marginBottom: '6px' }}>
                  <strong style={{ fontSize: '9px', color: isUrgent ? '#d13438' : '#005fb8' }}>
                    {isUrgent ? '🚨 PILNY KOMUNIKAT' : '✉️ NOWA WIADOMOŚĆ'}
                  </strong>
                  <button 
                    onClick={() => setActivePopups(prev => prev.filter(p => p.id !== popup.id))}
                    style={{ fontSize: '9px', background: 'none', border: 'none', color: '#ff3333', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    X
                  </button>
                </div>
                <div style={{ fontSize: '10px', color: 'black', marginBottom: '6px' }}>
                  <strong>Nadawca:</strong> {popup.sender} ({popup.senderUnit})<br />
                  <strong>Treść:</strong> {popup.text}
                </div>
                {isConfirm && (
                  <button 
                    className="btn-win" 
                    style={{ width: '100%', padding: '2px', fontSize: '9px', fontWeight: 'bold', backgroundColor: '#2b8a3e', color: 'white' }} 
                    onClick={() => handleConfirmMessage(popup.id)}
                  >
                    ✔️ Potwierdź odbiór komunikatu
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* -------------------------------------------------------------
          DIALOG MODAL: CREATE / EDIT INCIDENT (KDR OSP Form)
          ------------------------------------------------------------- */}
      {isNewIncidentModalOpen && (
        <div className="win-dialog-overlay">
          {activeIncident && activeIncident.status === 'new' ? (
            <div className="win-dialog border-double-outset" style={{ width: '450px' }}>
              <div className="win-dialog-header" style={{ background: '#0a246a', color: '#fff' }}>
                <span>Formatka WCPR: {activeIncident.customId || 'Nowe Zgłoszenie'}</span>
                <button className="btn-win" style={{ padding: '1px 5px', fontSize: '9px', fontWeight: 'bold' }} onClick={() => setIsNewIncidentModalOpen(false)}>X</button>
              </div>
              <div className="win-dialog-body" style={{ background: '#f3f3f3', padding: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '6px' }}>Otrzymano formatkę zgłoszeniową z CPR:</div>
                <div style={{ background: '#fff', border: '1px solid #d1d1d1', padding: '10px', fontSize: '11px', fontFamily: 'var(--font-mono)', minHeight: '120px', whiteSpace: 'pre-wrap', marginBottom: '12px' }}>
                  {activeIncident.description}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button className="btn-win" style={{ fontWeight: 'bold', color: '#2b8a3e', padding: '4px 12px' }} onClick={async () => {
                    try {
                      await updateDoc(doc(db, 'incidents', activeIncident.id), { status: 'submitted', updatedAt: serverTimestamp() });
                      logAction(`Przyjęto formatkę zdarzenia ${activeIncident.customId} do obsługi.`);
                      setIsNewIncidentModalOpen(false);
                    } catch (e) { alert("Błąd zapisu."); }
                  }}>✔️ Przyjmij Zdarzenie</button>
                  <button className="btn-win" style={{ fontWeight: 'bold', color: '#d13438', padding: '4px 12px' }} onClick={async () => {
                    if (window.confirm("Czy na pewno chcesz odrzucić tę formatkę (Alarm Fałszywy / Anulowano)?")) {
                      try {
                        await updateDoc(doc(db, 'incidents', activeIncident.id), { status: 'processed', isArchived: true, updatedAt: serverTimestamp() });
                        logAction(`Odrzucono formatkę zdarzenia ${activeIncident.customId}.`);
                        setIsNewIncidentModalOpen(false);
                      } catch (e) { alert("Błąd zapisu."); }
                    }
                  }}>❌ Odrzuć</button>
                </div>
              </div>
            </div>
          ) : (
          <div className="win-dialog border-double-outset" style={{ width: activeCallToAnswer ? '980px' : '640px', maxHeight: '95vh', overflowY: 'auto' }}>
            <div className="win-dialog-header">
              <span>{editingIncidentId ? 'Modyfikacja Zgłoszenia Zdarzenia' : 'Nowe Zgłoszenie - Karta Zgłoszenia'}</span>
              <button className="btn-win" style={{ padding: '1px 5px', fontSize: '9px', fontWeight: 'bold' }} onClick={() => setIsNewIncidentModalOpen(false)}>X</button>
            </div>
            
            <div className="win-dialog-body" style={{ display: 'grid', gridTemplateColumns: activeCallToAnswer ? '1fr 320px' : '1fr', gap: '10px' }}>
              
              {/* Left Side: SWD-ST Form */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                
                {/* Win32 Tabs Header */}
                <div className="tab-header">
                  <button 
                    className={`tab-btn ${incidentModalTab === 'zgloszenie' ? 'active' : ''}`}
                    onClick={() => setIncidentModalTab('zgloszenie')}
                  >
                    Karta Zgłoszenia
                  </button>
                  <button 
                    className={`tab-btn ${incidentModalTab === 'operacyjne' ? 'active' : ''}`}
                    onClick={() => setIncidentModalTab('operacyjne')}
                  >
                    Dane Operacyjne
                  </button>
                  <button 
                    className={`tab-btn ${incidentModalTab === 'zabezpieczenie' ? 'active' : ''}`}
                    onClick={() => setIncidentModalTab('zabezpieczenie')}
                  >
                    Zabezpieczenie Miejsca
                  </button>
                  <button 
                    className={`tab-btn ${incidentModalTab === 'chronologia' ? 'active' : ''}`}
                    onClick={() => setIncidentModalTab('chronologia')}
                  >
                    Przebieg Zdarzenia
                  </button>
                </div>

                {/* Tab Content */}
                <div className="border-double-outset" style={{ padding: '10px', background: '#f3f3f3', minHeight: '300px' }}>
                  
                  {incidentModalTab === 'zgloszenie' && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', paddingBottom: '3px' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <label style={{ fontSize: '10px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            Data: 
                            <input type="date" className="input-field" style={{ width: '100px', padding: '2px' }} value={incidentDateStr} onChange={(e) => setIncidentDateStr(e.target.value)} />
                          </label>
                          <label style={{ fontSize: '10px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            Godzina:
                            <input type="text" className="input-field" style={{ width: '70px', padding: '2px', fontFamily: 'monospace' }} value={incidentTimeStr} onChange={(e) => setIncidentTimeStr(e.target.value)} />
                          </label>
                        </div>
                      </div>

                  <div className="form-grid-3" style={{ marginBottom: '6px' }}>
                    <div>
                      <label className="input-label" style={{ fontSize: '9px' }}>Gmina:</label>
                      <input type="text" className="input-field" value={gminaStr} onChange={(e) => setGminaStr(e.target.value)} />
                    </div>
                    <div>
                      <label className="input-label" style={{ fontSize: '9px' }}>Miejscowość:</label>
                      <input type="text" className="input-field" value={miejscowoscStr} onChange={(e) => setMiejscowoscStr(e.target.value)} />
                    </div>
                    <div>
                      <label className="input-label" style={{ fontSize: '9px' }}>Adres / Ulica / Skrzyżowanie:</label>
                      <input type="text" className="input-field" placeholder="np. ul. Szopienicka 12" value={location} onChange={(e) => handleLocationChange(e.target.value)} />
                    </div>
                  </div>

                  {location.trim().length > 4 && incidents.some(inc => 
                    inc.id !== editingIncidentId &&
                    inc.status !== 'processed' && 
                    !inc.isArchived && 
                    inc.location.toLowerCase().trim().includes(location.toLowerCase().trim())
                  ) && (
                    <div style={{ 
                      fontSize: '9.5px', 
                      backgroundColor: '#fff3cd', 
                      border: '1px solid #ffeeba', 
                      color: '#856404', 
                      padding: '4px 8px', 
                      marginBottom: '6px', 
                      fontWeight: 'bold', 
                      borderRadius: '2px' 
                    }}>
                      ⚠️ SWD-ST Ostrzeżenie (Str. 54): Istnieje już zarejestrowane aktywne zdarzenie o podobnej lokalizacji ({
                        incidents.find(inc => 
                          inc.id !== editingIncidentId &&
                          inc.status !== 'processed' && 
                          !inc.isArchived && 
                          inc.location.toLowerCase().trim().includes(location.toLowerCase().trim())
                        )?.customId
                      })!
                    </div>
                  )}

                  <div className="form-grid-2" style={{ marginBottom: '6px' }}>
                    <div>
                      <label className="input-label" style={{ fontSize: '9px' }}>Obiekt / Zakład / Droga:</label>
                      <input type="text" className="input-field" placeholder="np. Szkoła Podstawowa nr 5" value={obiektStr} onChange={(e) => setObiektStr(e.target.value)} />
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <div style={{ flex: 1 }}>
                        <label className="input-label" style={{ fontSize: '9px' }}>Dł. Geo. (X):</label>
                        <input type="text" className="input-field" value={coordX} onChange={(e) => setCoordX(e.target.value)} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label className="input-label" style={{ fontSize: '9px' }}>Szer. Geo. (Y):</label>
                        <input type="text" className="input-field" value={coordY} onChange={(e) => setCoordY(e.target.value)} />
                      </div>
                    </div>
                  </div>

                  {location.trim().length > 2 && (
                    <div style={{ marginTop: '4px', marginBottom: '6px', padding: '5px 8px', background: '#ffffff', border: '1px inset #d1d1d1', fontSize: '9px', color: '#000' }}>
                      <span style={{ fontWeight: 'bold', color: '#005fb8', display: 'block', marginBottom: '3px' }}>📡 WCPR SYSTEM REKOMENDACJI SIL (ODLEGŁOŚĆ I ETA DO JRG):</span>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                        {JRG_UNITS.map(jrgName => {
                          const pCoords = getCoordinatesForLocation(location);
                          const jrgCoords = MAP_BASES[jrgName];
                          if (!jrgCoords) return null;
                          const distPx = Math.sqrt(Math.pow(jrgCoords.x - pCoords.x, 2) + Math.pow(jrgCoords.y - pCoords.y, 2));
                          const distKm = (distPx * 0.08).toFixed(1);
                          const etaMin = Math.max(1, Math.ceil(distKm / 0.8));
                          return (
                            <div key={jrgName} style={{ borderLeft: `2.5px solid ${jrgCoords.color}`, paddingLeft: '4px' }}>
                              <strong>{jrgName.replace("nr ", "")}</strong><br />
                              Dystans: {distKm} km | ETA: ~{etaMin} min
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="form-grid-3" style={{ marginBottom: '6px' }}>
                    <div>
                      <label className="input-label" style={{ fontSize: '9px' }}>Zgłaszający (Nazwisko):</label>
                      <input type="text" className="input-field" placeholder="np. Kowalski Jan" value={callerNameStr} onChange={(e) => setCallerNameStr(e.target.value)} />
                    </div>
                    <div>
                      <label className="input-label" style={{ fontSize: '9px' }}>Nr telefonu:</label>
                      <input type="text" className="input-field" placeholder="112 / 601-xxx-xxx" value={callerPhoneStr} onChange={(e) => setCallerPhoneStr(e.target.value)} />
                    </div>
                    <div>
                      <label className="input-label" style={{ fontSize: '9px' }}>Adres zgłaszającego:</label>
                      <input type="text" className="input-field" value={callerAddressStr} onChange={(e) => setCallerAddressStr(e.target.value)} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', background: '#ffffff', padding: '4px', border: '1px solid #d1d1d1', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#555', alignSelf: 'center', marginRight: '6px' }}>POWIADOMIONE SŁUŻBY:</span>
                    {['PRM', 'Policja', 'Pogotowie Energetyczne', 'Pogotowie Gazowe', 'Pogotowie Wodne', 'WCPR'].map(s => (
                      <label key={s} style={{ fontSize: '9.5px', display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={notifiedServices.includes(s)} onChange={() => handleServiceToggle(s)} />
                        {s}
                      </label>
                    ))}
                  </div>
                    </>
                  )}

                  {incidentModalTab === 'operacyjne' && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', marginBottom: '8px', paddingBottom: '3px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 'bold', marginRight: '4px' }}>RODZAJ:</span>
                      <select 
                        value={incidentType} 
                        onChange={(e) => setIncidentType(e.target.value)}
                        style={{ fontSize: '10px', padding: '1px', background: '#fff', color: '#000', border: '1px solid #d1d1d1' }}
                      >
                        <option value="pozar">P (Pożar)</option>
                        <option value="mz">MZ (Zagrożenie)</option>
                        <option value="af">AF (Alarm Fałszywy)</option>
                        <option value="cw">CW (Ćwiczenia)</option>
                        <option value="wg">WG (Wyjazd Gospodarczy)</option>
                        <option value="pzr">PZR (Zabezpieczenie Rejonu)</option>
                        <option value="zpr">ZPR (Zgłoszenie Przekazane)</option>
                        <option value="bl">BL (Błąd)</option>
                      </select>
                    </div>
                  </div>

                  {/* Podrodzaj zdarzenia + Flagi (SWD-ST rozdz. 8.3.5) */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '6px' }}>
                    <div>
                      <label className="input-label" style={{ fontSize: '9px' }}>Podrodzaj zdarzenia:</label>
                      <select
                        className="input-field"
                        value={incidentSubtype}
                        onChange={e => setIncidentSubtype(e.target.value)}
                      >
                        <option value="">— Brak (ogólne) —</option>
                        {incidentType === 'pozar' && (<>
                          <option value="poz_mieszk">Pożar mieszkania / lokalu</option>
                          <option value="poz_lasu">Pożar lasu / upraw</option>
                          <option value="poz_sam">Pożar samochodu</option>
                          <option value="poz_przem">Pożar przemysłowy</option>
                          <option value="poz_toru">Pożar toru/nasypów kolejowych</option>
                          <option value="poz_komin">Pożar sadzy w kominie</option>
                          <option value="poz_inne">Pożar inny</option>
                        </>)}
                        {incidentType === 'mz' && (<>
                          <option value="mz_rd">MZ Ratownictwo drogowe</option>
                          <option value="mz_med">MZ Ratownictwo medyczne</option>
                          <option value="mz_wod">MZ Ratownictwo wodne</option>
                          <option value="mz_wys">MZ Ratownictwo wysokościowe</option>
                          <option value="mz_chem">MZ Zagrożenie chemiczne</option>
                          <option value="mz_gaz">MZ Zagrożenie gazowe</option>
                          <option value="mz_bud">MZ Katastrofa budowlana</option>
                          <option value="mz_pow">MZ Powódź / zalanie</option>
                          <option value="mz_inne">MZ inne zagrożenie</option>
                        </>)}
                        {incidentType === 'af' && (<>
                          <option value="af_auto">AF Automatyczny (SAP/DSO)</option>
                          <option value="af_zlos">AF Złośliwy alarm</option>
                          <option value="af_omyl">AF Pomyłkowe zgłoszenie</option>
                        </>)}
                        {(incidentType === 'cw' || incidentType === 'wg' || incidentType === 'pzr' || incidentType === 'zpr' || incidentType === 'bl') && (
                          <option value={incidentType}>{incidentType.toUpperCase()} — ogólny</option>
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="input-label" style={{ fontSize: '9px' }}>Flagi zdarzenia (Rys. 8.3.5 SWD):</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '3px', background: '#fff', border: '2px inset #d1d1d1', maxHeight: '60px', overflowY: 'auto' }}>
                        {[
                          ['dlugotrl', 'Zdarzenie długotrwałe'],
                          ['masowe', 'Zdarzenie masowe (>10 poszkod.)'],
                          ['hbzn', 'HBZN (materiały niebezp.)'],
                          ['wielopow', 'Wielopowiatowe'],
                          ['interwenc', 'Interwencja KW/KG PSP'],
                          ['katastrofa', 'Katastrofa'],
                        ].map(([flag, label]) => (
                          <label key={flag} style={{ fontSize: '9px', display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={incidentFlags.includes(flag)}
                              onChange={() => setIncidentFlags(prev =>
                                prev.includes(flag) ? prev.filter(f => f !== flag) : [...prev, flag]
                              )}
                            />
                            {label}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="form-grid-3" style={{ marginBottom: '6px' }}>
                    <div>
                      <label className="input-label" style={{ fontSize: '9px' }}>Jednostka Prowadząca:</label>
                      <select className="input-field" value={targetJrg} onChange={(e) => setTargetJrg(e.target.value)}>
                        {JRG_UNITS.map(j => <option key={j} value={j}>{j}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="input-label" style={{ fontSize: '9px' }}>Typ działania:</label>
                      <select className="input-field" value={actionType} onChange={(e) => setActionType(e.target.value)}>
                        <option value="ratownicze">Ratownicze (KSRG)</option>
                        <option value="nieratownicze">Nieratownicze (Prewencja)</option>
                      </select>
                    </div>
                    <div>
                      <label className="input-label" style={{ fontSize: '9px' }}>Obsada strażaków:</label>
                      <input type="number" className="input-field" min="1" value={firefightersCount} onChange={(e) => setFirefightersCount(e.target.value)} />
                    </div>
                  </div>

                  {/* PZR (Zabezpieczenie Rejonu) target unit selector - Page 47 */}
                  {incidentType === 'pzr' && (
                    <div className="input-group" style={{ marginBottom: '6px' }}>
                      <label className="input-label" style={{ fontSize: '9px', color: '#005fb8' }}>Jednostka docelowa (Zabezpieczany rejon):</label>
                      <select className="input-field" value={targetUnitDocelowa} onChange={(e) => setTargetUnitDocelowa(e.target.value)}>
                        {JRG_UNITS.map(j => <option key={j} value={j}>{j}</option>)}
                      </select>
                    </div>
                  )}

                  {/* SOP checklist panel */}
                  <div className="border-inset" style={{ padding: '6px', background: '#ffffff', marginBottom: '6px' }}>
                    <div style={{ fontSize: '8.5px', fontWeight: 'bold', color: '#555', marginBottom: '3px', borderBottom: '1px solid #f3f3f3', paddingBottom: '1px' }}>PROCEDURA STANDARDOWA (SOP CHECKLIST)</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                      {(incidentType === 'pozar' || incidentType === 'cw' || incidentType === 'wg') && (
                        <>
                          <label style={{ fontSize: '9.5px', display: 'flex', alignItems: 'center', gap: '3px' }}><input type="checkbox" checked={sopSteps.includes('recon')} onChange={() => handleSopToggle('recon')} /> Rozpoznanie i zabezpieczenie</label>
                          <label style={{ fontSize: '9.5px', display: 'flex', alignItems: 'center', gap: '3px' }}><input type="checkbox" checked={sopSteps.includes('utilities')} onChange={() => handleSopToggle('utilities')} /> Odcięcie mediów</label>
                          <label style={{ fontSize: '9.5px', display: 'flex', alignItems: 'center', gap: '3px' }}><input type="checkbox" checked={sopSteps.includes('odo')} onChange={() => handleSopToggle('odo')} /> Praca w aparatach ODO</label>
                          <label style={{ fontSize: '9.5px', display: 'flex', alignItems: 'center', gap: '3px' }}><input type="checkbox" checked={sopSteps.includes('water')} onChange={() => handleSopToggle('water')} /> Zaopatrzenie wodne</label>
                        </>
                      )}
                      {(incidentType === 'mz' || incidentType === 'pzr') && (
                        <>
                          <label style={{ fontSize: '9.5px', display: 'flex', alignItems: 'center', gap: '3px' }}><input type="checkbox" checked={sopSteps.includes('zone')} onChange={() => handleSopToggle('zone')} /> Wyznaczenie strefy</label>
                          <label style={{ fontSize: '9.5px', display: 'flex', alignItems: 'center', gap: '3px' }}><input type="checkbox" checked={sopSteps.includes('kpp')} onChange={() => handleSopToggle('kpp')} /> Ocena stanu i KPP</label>
                          <label style={{ fontSize: '9.5px', display: 'flex', alignItems: 'center', gap: '3px' }}><input type="checkbox" checked={sopSteps.includes('sorbent')} onChange={() => handleSopToggle('sorbent')} /> Neutralizacja plam</label>
                        </>
                      )}
                      {(incidentType === 'af' || incidentType === 'zpr' || incidentType === 'bl') && (
                        <>
                          <label style={{ fontSize: '9.5px', display: 'flex', alignItems: 'center', gap: '3px' }}><input type="checkbox" checked={sopSteps.includes('verification')} onChange={() => handleSopToggle('verification')} /> Weryfikacja alarmu</label>
                          <label style={{ fontSize: '9.5px', display: 'flex', alignItems: 'center', gap: '3px' }}><input type="checkbox" checked={sopSteps.includes('search')} onChange={() => handleSopToggle('search')} /> Przeszukanie pomieszczeń</label>
                        </>
                      )}
                    </div>
                  </div>



                  <div className="form-grid-2">
                    <div className="input-group">
                      <label className="input-label" style={{ fontSize: '9px' }}>Użyty sprzęt gaśniczy/środki:</label>
                      <input type="text" className="input-field" placeholder="np. 20kg sorbentu, linia szybkiego natarcia" value={equipmentUsed} onChange={(e) => setEquipmentUsed(e.target.value)} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '12px' }}>
                      <input type="checkbox" id="is_long_duration_chk" checked={isLongDuration} onChange={(e) => setIsLongDuration(e.target.checked)} />
                      <label htmlFor="is_long_duration_chk" style={{ fontSize: '9.5px', fontWeight: 'bold', color: '#d13438', cursor: 'pointer' }}>ZDARZENIE DŁUGOTRWAŁE</label>
                    </div>
                  </div>

                  <div className="input-group" style={{ marginTop: '4px', margin: 0 }}>
                    <label className="input-label" style={{ fontSize: '9px' }}>Opis przebiegu działań:</label>
                    <textarea className="textarea-field" style={{ minHeight: '45px' }} placeholder="Szczegółowy opis..." value={description} onChange={(e) => setDescription(e.target.value)} />
                  </div>
                  </>
                )}

                {incidentModalTab === 'zabezpieczenie' && (
                  <div style={{ padding: '10px', background: '#ffffff', minHeight: '200px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#005fb8', borderBottom: '2px solid #005fb8', paddingBottom: '4px' }}>
                      Karta Zabezpieczenia Rejonu / Relokacji SiS
                    </div>
                    <div style={{ fontSize: '10px', color: '#495057' }}>
                      Moduł pozwala na dysponowanie jednostek (np. OSP) do pełnienia dyżuru w opuszczonej JRG, w celu zachowania ciągłości operacyjnej.
                    </div>
                    <div className="input-group">
                      <label className="input-label" style={{ fontSize: '10px', fontWeight: 'bold' }}>Cel Relokacji (Rejon Chroniony):</label>
                      <select 
                        className="input-field"
                        onChange={(e) => {
                          const target = e.target.value;
                          if (target && activeIncident) {
                            if (confirm(`Czy chcesz wygenerować meldunek PZR o przemieszczeniu SiS do: ${target}?`)) {
                              setIncidentType('pzr');
                              setLocation(`Zabezpieczenie rejonu operacyjnego: ${target}`);
                              setDescription(`Polecenie wyjazdu z miejsca stacjonowania i objęcia dyżuru w ${target} (Zabezpieczenie rejonu operacyjnego).`);
                              setIncidentModalTab('operacyjne');
                            }
                          }
                        }}
                      >
                        <option value="">-- Wybierz JRG do zabezpieczenia --</option>
                        {JRG_UNITS.filter(j => j !== 'KM/KP PSP').map(j => <option key={j} value={j}>{j}</option>)}
                      </select>
                    </div>
                    <div style={{ marginTop: 'auto', background: '#fff9db', padding: '8px', border: '1px solid #fcc419', borderRadius: '3px', fontSize: '10px' }}>
                      <strong>Wskazówka:</strong> Wybierz JRG, aby automatycznie uzupełnić formatkę jako zdarzenie <strong>PZR (Zabezpieczenie Rejonu)</strong>.
                    </div>
                  </div>
                )}

                {incidentModalTab === 'chronologia' && (
                  <div style={{ padding: '10px', background: '#ffffff', minHeight: '300px', maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#005fb8', borderBottom: '2px solid #005fb8', paddingBottom: '4px', marginBottom: '6px' }}>
                      Przebieg zdarzenia (Chronologia radiowa)
                    </div>
                    {(!activeIncident || !activeIncident.radioLogs || activeIncident.radioLogs.length === 0) ? (
                      <div style={{ color: '#d1d1d1', fontStyle: 'italic', fontSize: '10px', textAlign: 'center', marginTop: '20px' }}>
                        Brak zdarzeń lub korespondencji radiowej w tym zgłoszeniu.
                      </div>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
                        <thead>
                          <tr style={{ background: '#f3f3f3', borderBottom: '1.5px solid #d1d1d1' }}>
                            <th style={{ padding: '3px', textAlign: 'left', width: '60px' }}>Czas</th>
                            <th style={{ padding: '3px', textAlign: 'left', width: '100px' }}>Kryptonim</th>
                            <th style={{ padding: '3px', textAlign: 'left' }}>Treść komunikatu</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeIncident.radioLogs.map((log, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #e9ecef' }}>
                              <td style={{ padding: '3px', fontWeight: 'bold', verticalAlign: 'top' }}>{log.time}</td>
                              <td style={{ padding: '3px', color: '#005fb8', fontWeight: 'bold', verticalAlign: 'top' }}>{log.from}</td>
                              <td style={{ padding: '3px', verticalAlign: 'top' }}>{log.text}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', borderTop: '1.5px solid var(--win-shadow)', paddingTop: '6px' }}>
                  <button 
                    className="btn-win" 
                    style={{ backgroundColor: '#d13438', color: '#ffffff', marginRight: 'auto', fontWeight: 'bold' }}
                    onClick={() => {
                      if (confirm("Czy na pewno chcesz odrzucić to zgłoszenie i oznaczyć jako Błąd (BL)?")) {
                        setIncidentType('bl');
                        setTimeout(() => handleSaveIncident('processed'), 100);
                      }
                    }}
                  >
                    ❌ Oznacz jako BŁĄD (BL)
                  </button>
                  <button className="btn-win" onClick={() => setIsNewIncidentModalOpen(false)}>❌ Anuluj</button>
                  <button className="btn-win" onClick={() => handleSaveIncident('draft')}>💾 Zapisz jako Szkic</button>
                  <button className="btn-win" style={{ fontWeight: 'bold', backgroundColor: '#0a6ece', color: '#ffffff' }} onClick={() => handleSaveIncident('submitted')}>✔️ Zapisz (Wyślij do JRG)</button>
                </div>
              </div>

              {/* Right Side: WCPR Call Transcript (Rys.53 CPR panel mockup) */}
              {activeCallToAnswer && (
                <div className="border-double-outset" style={{ display: 'flex', flexDirection: 'column', background: '#f3f3f3', padding: '10px', height: '100%' }}>
                  <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#005fb8', borderBottom: '1px solid #d1d1d1', paddingBottom: '4px', marginBottom: '8px', textTransform: 'uppercase' }}>
                    📟 PODGLĄD KARTY WCPR (112)
                  </div>
                  <div className="border-inset" style={{ flex: 1, background: '#ffffe0', color: '#000000', padding: '8px', fontFamily: 'monospace', fontSize: '9.5px', whiteSpace: 'pre-wrap', overflowY: 'auto', border: '1px solid #d1d1d1' }}>
                    {activeCallToAnswer.transcript}
                  </div>
                  <button 
                    className="btn-win" 
                    style={{ marginTop: '8px', fontWeight: 'bold', fontSize: '9px' }} 
                    onClick={() => {
                      setDescription(prev => (prev ? prev + "\n\n" : "") + `[Dane CPR] Zgłoszenie od ${activeCallToAnswer.callerName} (tel. ${activeCallToAnswer.phone}): ${activeCallToAnswer.description}`);
                      logAction("Zaimportowano dane transkrypcji CPR do opisu działań.");
                    }}
                  >
                    📥 Kopiuj opis do SWD
                  </button>
                </div>
              )}

            </div>
          </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------
          DIALOG MODAL: EWID MELDUNEK / TIMES (PA JRG Form)
          ------------------------------------------------------------- */}
      {isEwidReportModalOpen && activeIncident && (
        <div className="win-dialog-overlay">
          <div className="win-dialog border-double-outset" style={{ width: '580px' }}>
            <div className="win-dialog-header">
              <span>Zatwierdzenie Meldunku w Systemie EWID-ST</span>
              <button className="btn-win" style={{ padding: '1px 5px', fontSize: '9px', fontWeight: 'bold' }} onClick={() => setIsEwidReportModalOpen(false)}>X</button>
            </div>
            
            <div className="win-dialog-body" style={{ maxHeight: '85vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ fontSize: '11px', fontWeight: 'bold', color: '#000' }}>ZDARZENIE ID: {activeIncident.customId || '---'}</h4>
                  <p style={{ color: '#555', fontSize: '10px', marginTop: '2px' }}>Adres: {activeIncident.location}</p>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ffffff', padding: '4px 8px', border: '1px solid #d1d1d1' }}>
                  <input 
                    type="checkbox" 
                    id="partial_checkbox" 
                    checked={isPartialReport} 
                    onChange={(e) => setIsPartialReport(e.target.checked)} 
                    style={{ cursor: 'pointer' }}
                  />
                  <label htmlFor="partial_checkbox" style={{ fontSize: '11px', fontWeight: 'bold', color: isPartialReport ? '#e67e22' : '#2b8a3e', cursor: 'pointer' }}>
                    {isPartialReport ? 'Meldunek Częściowy (Draft)' : 'Meldunek Kompletny (Wymaga kontroli)'}
                  </label>
                </div>
              </div>

              {/* Real-time Obieg Meldunku steps timeline bar (Page 74/77 of manual) */}
              <div className="border-inset" style={{ padding: '8px', background: '#eeeeee', marginBottom: '8px' }}>
                <div style={{ fontSize: '9.5px', fontWeight: 'bold', color: '#444', marginBottom: '4px', textTransform: 'uppercase' }}>Przebieg Akceptacji Wojewódzkiej (Obieg)</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', background: '#ffffff', border: '1px solid #ccc' }}>
                  <span style={{ fontSize: '10px', color: '#000', fontWeight: reportWorkflowState === '1' ? 'bold' : 'normal' }}>
                    {reportWorkflowState === '1' ? '▶️ JRG Szkic' : '✓ JRG Szkic'}
                  </span>
                  <span style={{ fontSize: '10px', color: '#888' }}>➔</span>
                  <span style={{ fontSize: '10px', color: reportWorkflowState === '2' ? '#005fb8' : '#444', fontWeight: reportWorkflowState === '2' ? 'bold' : 'normal' }}>
                    {reportWorkflowState === '2' ? '▶️ KM Zatwierdzony' : parseInt(reportWorkflowState, 10) > 2 ? '✓ KM Zatwierdzony' : 'KM Zatwierdzony'}
                  </span>
                  <span style={{ fontSize: '10px', color: '#888' }}>➔</span>
                  <span style={{ fontSize: '10px', color: reportWorkflowState === '3' ? '#2b8a3e' : '#444', fontWeight: reportWorkflowState === '3' ? 'bold' : 'normal' }}>
                    {reportWorkflowState === '3' ? '▶️ KW Kompletny' : 'KW Kompletny'}
                  </span>
                  {reportWorkflowState === '4' && (
                    <span style={{ fontSize: '10px', color: '#e03131', fontWeight: 'bold' }}>➔ 🚨 Korekta JRG</span>
                  )}
                </div>
              </div>

              {/* Operational times fields */}
              <div className="border-inset" style={{ padding: '0', background: '#ffffff' }}>
                <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#fff', background: '#005fb8', padding: '2px 4px' }}>
                  Czasy Operacyjne Akcji
                </div>
                <table style={{ width: '100%', fontSize: '10px', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #f3f3f3' }}>
                      <td style={{ padding: '4px 8px', width: '200px' }}>1. Zgłoszenie zdarzenia / Alarmowanie:</td>
                      <td style={{ padding: '2px' }}><input type="time" className="input-field" style={{ width: '100px' }} value={alarmTime} onChange={(e) => setAlarmTime(e.target.value)} /></td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #f3f3f3', background: '#f8f8f8' }}>
                      <td style={{ padding: '4px 8px' }}>2. Wyjazd pierwszego zastępu z bazy:</td>
                      <td style={{ padding: '2px' }}><input type="time" className="input-field" style={{ width: '100px' }} value={departureTime} onChange={(e) => setDepartureTime(e.target.value)} /></td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #f3f3f3' }}>
                      <td style={{ padding: '4px 8px' }}>3. Przyjazd pierwszego zastępu na miejsce:</td>
                      <td style={{ padding: '2px' }}><input type="time" className="input-field" style={{ width: '100px' }} value={arrivalTime} onChange={(e) => setArrivalTime(e.target.value)} /></td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #f3f3f3', background: '#f8f8f8' }}>
                      <td style={{ padding: '4px 8px' }}>4. Zlokalizowanie zdarzenia (Lokalizacja):</td>
                      <td style={{ padding: '2px' }}><input type="time" className="input-field" style={{ width: '100px' }} value={localizationTime} onChange={(e) => setLocalizationTime(e.target.value)} /></td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #f3f3f3' }}>
                      <td style={{ padding: '4px 8px' }}>5. Zakończenie działań operacyjnych (Zakończenie):</td>
                      <td style={{ padding: '2px' }}><input type="time" className="input-field" style={{ width: '100px' }} value={completionTime} onChange={(e) => setCompletionTime(e.target.value)} /></td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #f3f3f3', background: '#f8f8f8' }}>
                      <td style={{ padding: '4px 8px' }}>6. Powrót wszystkich sił i środków do bazy:</td>
                      <td style={{ padding: '2px' }}><input type="time" className="input-field" style={{ width: '100px' }} value={returnTime} onChange={(e) => setReturnTime(e.target.value)} /></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Firefighter Injury Roster Tracker */}
              <div className="border-inset" style={{ padding: '10px', background: '#ffe3e3', border: '1px solid #d13438' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <input 
                    type="checkbox" 
                    id="has_injuries" 
                    checked={hasInjuries} 
                    onChange={(e) => setHasInjuries(e.target.checked)} 
                    style={{ cursor: 'pointer' }}
                  />
                  <label htmlFor="has_injuries" style={{ fontSize: '11px', fontWeight: 'bold', color: '#d13438', cursor: 'pointer' }}>
                    ⚠️ Zgłoś Wypadek Ratownika (Wypadki strażaków w akcji)
                  </label>
                </div>
                {hasInjuries && (
                  <div className="input-group" style={{ margin: 0 }}>
                    <label className="input-label" style={{ fontSize: '9px', color: '#000' }}>Opis obrażeń ratownika (Imię, nazwisko, jednostka, typ urazu):</label>
                    <textarea 
                      className="textarea-field" 
                      style={{ minHeight: '40px', background: '#ffffff', color: '#000000', border: '1px solid #d1d1d1' }}
                      placeholder="np. asp. Jan Kowalski z JRG 2 - skręcenie lewego stawu skokowego..."
                      value={injuriesDescription}
                      onChange={(e) => setInjuriesDescription(e.target.value)}
                      required={hasInjuries}
                    />
                  </div>
                )}
              </div>

              {/* Geocoding precision selector */}
              <div style={{ display: 'flex', alignItems: 'center', background: '#ffffff', padding: '8px', border: '1px solid #d1d1d1', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 'bold', fontSize: '10px', color: '#000' }}>SPA Geokodowanie:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {getGeocodingDot(geocodingStatus)}
                  <select value={geocodingStatus} onChange={(e) => setGeocodingStatus(e.target.value)} style={{ fontSize: '11px', outline: 'none', background: '#ffffff', color: '#000000' }}>
                    <option value="red">Brak geokodowania (Czerwona)</option>
                    <option value="yellow">Ulica/Miejscowość (Żółta)</option>
                    <option value="green">EMUiA Dokładne (Zielona)</option>
                  </select>
                </div>
              </div>

              {/* Registry report number form */}
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Numer Rejestru Meldunków EWID-ST (Końcówka):</label>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ background: '#f3f3f3', border: '1.5px solid #d1d1d1', borderRight: 'none', padding: '4px 10px', fontFamily: 'monospace', fontWeight: 'bold', color: '#000000' }}>
                    {activeIncident.prefix || getJrgPrefix(activeIncident.targetJrg)}
                  </span>
                  <input 
                    type="text" 
                    className="input-field" 
                    style={{ fontWeight: 'bold', fontFamily: 'monospace' }} 
                    placeholder="0015"
                    value={customReportNumber}
                    onChange={(e) => setCustomReportNumber(e.target.value)}
                  />
                </div>
              </div>

              {/* Real-time Validation Report Log Box */}
              <div className="border-inset" style={{ padding: '8px', background: '#ffffff' }}>
                <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#000000', marginBottom: '4px', textTransform: 'uppercase', borderBottom: '1px solid #f3f3f3', paddingBottom: '3px' }}>
                  Kontrola poprawności meldunku (Walidacja)
                </div>
                <div className="validation-list">
                  {validationReport.errors.map((err, i) => (
                    <div key={i} className="validation-error">❌ {err}</div>
                  ))}
                  {validationReport.warnings.map((warn, i) => (
                    <div key={i} className="validation-warning">⚠️ {warn}</div>
                  ))}
                  {validationReport.errors.length === 0 && validationReport.warnings.length === 0 && (
                    <div style={{ color: '#2b8a3e', fontSize: '10px', fontWeight: 'bold' }}>✓ Brak uwag. Meldunek jest w 100% poprawny.</div>
                  )}
                </div>
              </div>

              {/* Obieg meldunku simulation trigger panel */}
              <div className="border-inset" style={{ padding: '8px', background: '#ffffff' }}>
                <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#000', marginBottom: '6px' }}>
                  Status obiegu meldunku w województwie: <span style={{ color: '#005fb8' }}>[{reportWorkflowState}] ({WORKFLOW_STATES[reportWorkflowState]})</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  <button className="btn-win" style={{ fontSize: '9px', padding: '2px 5px' }} onClick={() => handleWorkflowTransition('2')}>KM PSP Zatw.</button>
                  <button className="btn-win" style={{ fontSize: '9px', padding: '2px 5px', backgroundColor: '#0a6ece', color: 'white' }} onClick={() => handleWorkflowTransition('3')}>KW PSP Zatw. (Kompletny)</button>
                  <button className="btn-win" style={{ fontSize: '9px', padding: '2px 5px' }} onClick={() => handleWorkflowTransition('4')}>Żądanie do JRG</button>
                  <button className="btn-win" style={{ fontSize: '9px', padding: '2px 5px' }} onClick={() => handleWorkflowTransition('7')}>Żądanie z KW</button>
                </div>
              </div>

              {/* Footer buttons */}
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', borderTop: '1px solid var(--win-shadow)', paddingTop: '8px' }}>
                <button className="btn-win" onClick={() => setIsEwidReportModalOpen(false)}>Anuluj</button>
                <button className="btn-win" style={{ fontWeight: 'bold', backgroundColor: isPartialReport ? '#ffd8a8' : '#a5d8ff', color: '#000000' }} onClick={handleSaveTimesAndApprove}>
                  {isPartialReport ? 'Zapisz jako Częściowy' : 'Zatwierdź jako Kompletny'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          DIALOG MODAL: NOMINAL VEHICLE CREW & MILEAGE EDITOR
          ------------------------------------------------------------- */}
      {isCrewModalOpen && activeIncident && (
        <div className="win-dialog-overlay">
          <div className="win-dialog border-double-outset" style={{ width: '400px' }}>
            <div className="win-dialog-header">
              <span>Obsada Imienna i Metryki: {crewTargetVehicle.split(' | ')[1] || crewTargetVehicle}</span>
              <button className="btn-win" style={{ padding: '1px 5px', fontSize: '9px', fontWeight: 'bold' }} onClick={() => setIsCrewModalOpen(false)}>X</button>
            </div>
            
            <div className="win-dialog-body">
              <div style={{ fontSize: '9.5px', fontWeight: 'bold', color: '#005fb8', marginBottom: '8px', borderBottom: '1px solid #d1d1d1', paddingBottom: '3px', textTransform: 'uppercase' }}>
                Ewidencja Załogi Zastępu
              </div>
              <div className="input-group">
                <label className="input-label">Dowódca zastępu (D):</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Kryptonim / stopień i nazwisko"
                  value={crewDowodca}
                  onChange={(e) => setCrewDowodca(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Kierowca-ratownik (K):</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Stopień i nazwisko"
                  value={crewKierowca}
                  onChange={(e) => setCrewKierowca(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Ratownicy (R):</label>
                <textarea 
                  className="textarea-field" 
                  style={{ minHeight: '40px' }}
                  placeholder="Wpisz ratowników oddzielonych przecinkami..."
                  value={crewRatownicy}
                  onChange={(e) => setCrewRatownicy(e.target.value)}
                />
              </div>

              <div style={{ fontSize: '9.5px', fontWeight: 'bold', color: '#005fb8', marginTop: '12px', marginBottom: '8px', borderBottom: '1px solid #d1d1d1', paddingBottom: '3px', textTransform: 'uppercase' }}>
                Przejechana trasa i zużycie (Logistyka)
              </div>
              <div className="form-grid-2" style={{ marginBottom: '10px' }}>
                <div className="input-group">
                  <label className="input-label">Przejechane kilometry (km):</label>
                  <input 
                    type="number" 
                    className="input-field" 
                    min="0"
                    step="0.1"
                    value={crewKm}
                    onChange={(e) => setCrewKm(e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Zużyte paliwo (litry - L):</label>
                  <input 
                    type="number" 
                    className="input-field" 
                    min="0"
                    step="0.5"
                    value={crewFuel}
                    onChange={(e) => setCrewFuel(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', borderTop: '1px solid var(--win-shadow)', paddingTop: '8px' }}>
                <button className="btn-win" onClick={() => setIsCrewModalOpen(false)}>Anuluj</button>
                <button className="btn-win" style={{ fontWeight: 'bold', backgroundColor: '#0a6ece', color: '#ffffff' }} onClick={handleSaveCrew}>Zapisz Obsadę</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          DIALOG MODAL: LINK SECONDARY CALL
          ------------------------------------------------------------- */}
      {isLinkedCallModalOpen && activeIncident && (
        <div className="win-dialog-overlay">
          <div className="win-dialog border-double-outset" style={{ width: '400px' }}>
            <div className="win-dialog-header">
              <span>Podepnij Zgłoszenie Wtórne do zdarzenia {activeIncident.customId}</span>
              <button className="btn-win" style={{ padding: '1px 5px', fontSize: '9px', fontWeight: 'bold' }} onClick={() => setIsLinkedCallModalOpen(false)}>X</button>
            </div>
            
            <div className="win-dialog-body">
              <div className="form-grid-2">
                <div className="input-group">
                  <label className="input-label">Imię i nazwisko zgłaszającego:</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="np. Jan Kowalski" 
                    value={linkedCallerName}
                    onChange={(e) => setLinkedCallerName(e.target.value)}
                    required
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Telefon kontaktowy:</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="np. 112 / 501-234-567" 
                    value={linkedCallerPhone}
                    onChange={(e) => setLinkedCallerPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Godzina zgłoszenia:</label>
                <input 
                  type="time" 
                  className="input-field" 
                  value={linkedCallTime}
                  onChange={(e) => setLinkedCallTime(e.target.value)}
                />
              </div>

              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Treść / Opis zgłoszenia wtórnego:</label>
                <textarea 
                  className="textarea-field" 
                  placeholder="np. Świadek zgłasza..." 
                  value={linkedCallText}
                  onChange={(e) => setLinkedCallText(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', borderTop: '1px solid var(--win-shadow)', paddingTop: '8px' }}>
                <button className="btn-win" onClick={() => setIsLinkedCallModalOpen(false)}>Anuluj</button>
                <button className="btn-win" style={{ fontWeight: 'bold', backgroundColor: '#0a6ece', color: 'white' }} onClick={handleLinkCall}>Podepnij Zgłoszenie</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          FULLSCREEN PRINT PREVIEW LAYOUT
          ------------------------------------------------------------- */}
      {printPreviewMode && (
        <div className="win-dialog-overlay print-container" style={{ background: '#343a40', overflowY: 'auto', padding: '40px 10px', display: 'block', position: 'fixed', left: 0, top: 0, right: 0, bottom: 0 }}>
          <div style={{ 
            width: '210mm', 
            minHeight: '297mm', 
            backgroundColor: '#ffffff', 
            color: '#000000', 
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            margin: '0 auto',
            padding: '20mm 15mm',
            fontFamily: 'monospace',
            fontSize: '11px',
            lineHeight: '1.4',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', justifyContent: 'flex-end' }} className="no-print">
              <button className="btn-win" style={{ backgroundColor: '#2b8a3e', color: 'white', fontWeight: 'bold' }} onClick={() => window.print()}>🖨️ Drukuj (Systemowo)</button>
              <button className="btn-win" style={{ backgroundColor: '#d13438', color: 'white' }} onClick={() => setPrintPreviewMode(null)}>Zamknij podgląd</button>
            </div>

            {printPreviewMode === 'dziennik_sluzby' ? (
              <div>
                <div style={{ borderBottom: '2px solid #000000', paddingBottom: '10px', marginBottom: '20px' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '12px' }}>KOMENDA MIEJSKA PAŃSTWOWEJ STRAŻY POŻARNEJ W KATOWICACH</div>
                  <div style={{ fontSize: '10px' }}>Dziennik Przebiegu Służby Stanowiska Kierowania (SKKM)</div>
                  <div style={{ textAlign: 'right', marginTop: '-25px', fontWeight: 'bold' }}>
                    DATA RAPORTU: {new Date().toLocaleDateString('pl-PL')}<br />
                    STATUS: ZAKOŃCZONY
                  </div>
                </div>

                <div style={{ textAlign: 'center', margin: '20px 0' }}>
                  <h2 style={{ fontSize: '15px', fontWeight: 'bold' }}>DOBOWY RAPORT PRZEBIEGU SŁUŻBY SKKM/PSK</h2>
                </div>

                <table style={{ width: '100%', border: '1px solid black', borderCollapse: 'collapse', marginBottom: '15px', fontSize: '10px' }}>
                  <tbody>
                    <tr>
                      <td style={{ border: '1px solid black', padding: '5px', fontWeight: 'bold', width: '30%' }}>Służba Zmianowa:</td>
                      <td style={{ border: '1px solid black', padding: '5px' }}>Zmiana {shiftNumber}</td>
                    </tr>
                    <tr>
                      <td style={{ border: '1px solid black', padding: '5px', fontWeight: 'bold' }}>Dyżurny Operacyjny (DO):</td>
                      <td style={{ border: '1px solid black', padding: '5px' }}>{shiftDo}</td>
                    </tr>
                  </tbody>
                </table>

                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Dziennik zdarzeń operacyjnych (Chronologia):</div>
                <div style={{ border: '1px solid black', padding: '10px', minHeight: '350px' }}>
                  {getChronologicalDutyLogs().map((log, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '15px', borderBottom: '1px solid #ddd', padding: '4px 0', fontSize: '10px' }}>
                      <span style={{ fontWeight: 'bold', minWidth: '50px' }}>[{log.time}]</span>
                      <span>{log.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : activeIncident ? (
              <div>
                <div style={{ borderBottom: '2px solid #000000', paddingBottom: '10px', marginBottom: '20px' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '12px' }}>KOMENDA MIEJSKA PAŃSTWOWEJ STRAŻY POŻARNEJ W KATOWICACH</div>
                  <div style={{ textAlign: 'right', marginTop: '-25px', fontWeight: 'bold' }}>
                    ${tenantName.toUpperCase()}, dn. {new Date().toLocaleDateString('pl-PL')}<br />
                    KOD WĘZŁA: 300-PSP
                  </div>
                </div>

                {activeIncident.times?.hasInjuries && (
                  <div style={{ border: '2px solid #e03131', padding: '8px', background: '#fff5f5', color: '#d13438', fontWeight: 'bold', marginBottom: '15px', borderRadius: '3px', fontSize: '10px' }}>
                    🚨 WYPADEK STRAŻAKA PODCZAS PROWADZENIA DZIAŁAŃ:
                    <div style={{ fontStyle: 'italic', fontWeight: 'normal', marginTop: '3px', fontSize: '9.5px', color: '#333' }}>
                      {activeIncident.times.injuriesDescription}
                    </div>
                  </div>
                )}

                <div style={{ textAlign: 'center', margin: '25px 0', textTransform: 'uppercase' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: 'bold', letterSpacing: '1px' }}>
                    {printPreviewMode === 'karta_zdarzenia' ? 'KARTA ZDARZENIA RATOWNICZEGO' : 
                     printPreviewMode === 'dwa' ? 'DOWÓD WYJAZDU DO AKCJI (DWA)' : 
                     'KARTA MANIPULACYJNA BIEGU ZDARZEŃ'}
                  </h2>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', marginTop: '5px', fontFamily: 'monospace' }}>
                    REJESTR EWID-ST NR: {activeIncident.reportNumber || '---'} (ID: {activeIncident.customId})
                  </div>
                </div>

                <table style={{ width: '100%', border: '1px solid black', borderCollapse: 'collapse', marginBottom: '15px' }}>
                  <tbody>
                    <tr>
                      <td style={{ border: '1px solid black', padding: '5px', fontWeight: 'bold', width: '30%' }}>1. Miejscowość i Adres:</td>
                      <td style={{ border: '1px solid black', padding: '5px' }} colSpan="3">{activeIncident.location}</td>
                    </tr>
                    <tr>
                      <td style={{ border: '1px solid black', padding: '5px', fontWeight: 'bold' }}>2. Klasyfikacja SWD:</td>
                      <td style={{ border: '1px solid black', padding: '5px', width: '25%' }}>
                        {activeIncident.type === 'pozar' ? 'POŻAR' : activeIncident.type === 'mz' ? 'MIEJSCOWE ZAGROŻENIE' : 'ALARM FAŁSZYWY'}
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>8. Czasy operacyjne zdarzenia:</div>
                <table style={{ width: '100%', border: '1px solid black', borderCollapse: 'collapse', marginBottom: '15px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#eeeeee' }}>
                      <th style={{ border: '1px solid black', padding: '4px', textAlign: 'center' }}>Alarmowanie</th>
                      <th style={{ border: '1px solid black', padding: '4px', textAlign: 'center' }}>Wyjazd zastępów</th>
                      <th style={{ border: '1px solid black', padding: '4px', textAlign: 'center' }}>Przyjazd na miejsce</th>
                      <th style={{ border: '1px solid black', padding: '4px', textAlign: 'center' }}>Zlokalizowanie</th>
                      <th style={{ border: '1px solid black', padding: '4px', textAlign: 'center' }}>Zakończenie</th>
                      <th style={{ border: '1px solid black', padding: '4px', textAlign: 'center' }}>Powrót w bazie</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ border: '1px solid black', padding: '5px', textAlign: 'center', fontWeight: 'bold' }}>{activeIncident.times?.alarm || '--:--'}</td>
                      <td style={{ border: '1px solid black', padding: '5px', textAlign: 'center', fontWeight: 'bold' }}>{activeIncident.times?.departure || '--:--'}</td>
                      <td style={{ border: '1px solid black', padding: '5px', textAlign: 'center', fontWeight: 'bold' }}>{activeIncident.times?.arrival || '--:--'}</td>
                      <td style={{ border: '1px solid black', padding: '5px', textAlign: 'center', fontWeight: 'bold' }}>{activeIncident.times?.localization || '--:--'}</td>
                      <td style={{ border: '1px solid black', padding: '5px', textAlign: 'center', fontWeight: 'bold' }}>{activeIncident.times?.completion || '--:--'}</td>
                      <td style={{ border: '1px solid black', padding: '5px', textAlign: 'center', fontWeight: 'bold' }}>{activeIncident.times?.return || '--:--'}</td>
                    </tr>
                  </tbody>
                </table>

                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>9. Siły i Środki biorące udział (Zastępy z obsadami imiennymi):</div>
                <table style={{ width: '100%', border: '1px solid black', borderCollapse: 'collapse', marginBottom: '15px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#eeeeee' }}>
                      <th style={{ border: '1px solid black', padding: '4px', width: '25%' }}>Oznaczenie zastępu</th>
                      <th style={{ border: '1px solid black', padding: '4px', width: '30%' }}>Jednostka macierzysta</th>
                      <th style={{ border: '1px solid black', padding: '4px' }}>Obsada imienna (D / K / Ratownicy)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeIncident.vehicles && activeIncident.vehicles.map((vStr, idx) => {
                      const crew = activeIncident.crew?.[vStr] || {};
                      return (
                        <tr key={idx}>
                          <td style={{ border: '1px solid black', padding: '5px', fontWeight: 'bold' }}>{vStr.split(' | ')[1]}</td>
                          <td style={{ border: '1px solid black', padding: '5px' }}>{vStr.split(' | ')[0]}</td>
                          <td style={{ border: '1px solid black', padding: '5px' }}>
                            <div><strong>DOWÓDCA (D):</strong> {crew.dowodca || '---'}</div>
                            <div><strong>KIEROWCA-RATOWNIK (K):</strong> {crew.kierowca || '---'}</div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Section 8.5.2 Specialist Equipment list printed layout (Page 57) */}
                {activeIncident.specialistEquipment && activeIncident.specialistEquipment.length > 0 && (
                  <>
                    <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>9a. Wykaz sprzętu specjalistycznego i kontenerów (Str. 57 instrukcji):</div>
                    <table style={{ width: '100%', border: '1px solid black', borderCollapse: 'collapse', marginBottom: '15px', fontSize: '9.5px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#eeeeee' }}>
                          <th style={{ border: '1px solid black', padding: '4px', width: '40%' }}>Nazwa sprzętu</th>
                          <th style={{ border: '1px solid black', padding: '4px' }}>Jednostka dysponująca</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeIncident.specialistEquipment.map((eqStr, idx) => (
                          <tr key={idx}>
                            <td style={{ border: '1px solid black', padding: '4px', fontWeight: 'bold' }}>🔧 {eqStr.split(' | ')[1] || eqStr}</td>
                            <td style={{ border: '1px solid black', padding: '4px' }}>{eqStr.split(' | ')[0]}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}

                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>10. Zestawienie logistyczne zastępów (Przebieg & Zużycie):</div>
                <table style={{ width: '100%', border: '1px solid black', borderCollapse: 'collapse', marginBottom: '15px', fontSize: '9px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#eeeeee' }}>
                      <th style={{ border: '1px solid black', padding: '4px', width: '30%' }}>Oznaczenie zastępu</th>
                      <th style={{ border: '1px solid black', padding: '4px', textAlign: 'center' }}>Przejechana trasa (km)</th>
                      <th style={{ border: '1px solid black', padding: '4px', textAlign: 'center' }}>Zużyte paliwo (L)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeIncident.vehicles && activeIncident.vehicles.map((vStr, idx) => {
                      const metrics = activeIncident.vehicleMetrics?.[vStr] || { km: 0, fuel: 0 };
                      return (
                        <tr key={idx}>
                          <td style={{ border: '1px solid black', padding: '4px', fontWeight: 'bold' }}>{vStr.split(' | ')[1] || vStr}</td>
                          <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center' }}>{metrics.km} km</td>
                          <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center' }}>{metrics.fuel} L</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>11. Szczegółowy opis podjętych działań ratowniczych:</div>
                <div style={{ border: '1px solid black', padding: '8px', marginBottom: '15px', minHeight: '60px', whiteSpace: 'pre-wrap', textAlign: 'justify' }}>
                  {activeIncident.description}
                </div>

                {printPreviewMode === 'karta_manipulacyjna' && activeIncident.radioLogs && activeIncident.radioLogs.length > 0 && (
                  <>
                    <div style={{ fontWeight: 'bold', marginBottom: '5px', marginTop: '15px' }}>12. Log Dziennika Korespondencji Radiowej:</div>
                    <table style={{ width: '100%', border: '1px solid black', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '9px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#eeeeee' }}>
                          <th style={{ border: '1px solid black', padding: '3px', width: '50px', textAlign: 'center' }}>Godzina</th>
                          <th style={{ border: '1px solid black', padding: '3px', width: '90px' }}>Nadawca</th>
                          <th style={{ border: '1px solid black', padding: '3px', width: '90px' }}>Odbiorca</th>
                          <th style={{ border: '1px solid black', padding: '3px' }}>Treść korespondencji</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeIncident.radioLogs.map((log, idx) => (
                          <tr key={idx}>
                            <td style={{ border: '1px solid black', padding: '3px', textAlign: 'center' }}>{log.time}</td>
                            <td style={{ border: '1px solid black', padding: '3px', fontWeight: 'bold' }}>{log.from}</td>
                            <td style={{ border: '1px solid black', padding: '3px' }}>{log.to}</td>
                            <td style={{ border: '1px solid black', padding: '3px' }}>{log.text}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* WINDOWS XP/2000 CONTEXT MENU */}
      {contextMenu && (
        <div 
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            background: '#f3f3f3',
            border: '2px solid #ffffff',
            borderRightColor: '#404040',
            borderBottomColor: '#404040',
            boxShadow: '2px 2px 5px rgba(0,0,0,0.3)',
            zIndex: 999999,
            padding: '2px',
            minWidth: '180px',
            fontSize: '11px',
            color: '#000'
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div 
            className="menu-item" 
            style={{ padding: '4px 20px 4px 5px', cursor: 'pointer' }}
            onClick={() => { setIsNewIncidentModalOpen(true); setContextMenu(null); }}
          >
            📝 Karta Zdarzenia (Modyfikuj)
          </div>
          <div 
            className="menu-item" 
            style={{ padding: '4px 20px 4px 5px', cursor: 'pointer', color: contextMenu.incidentStatus === 'processed' ? '#d1d1d1' : '#000' }}
            onClick={() => { 
              if(contextMenu.incidentStatus !== 'processed') {
                setIsCrewModalOpen(true); 
              }
              setContextMenu(null); 
            }}
          >
            🚒 Dysponuj SiS
          </div>


          <div className="menu-separator" style={{ margin: '3px 0', borderBottom: '1px solid #d1d1d1', borderTop: '1px solid #fff' }} />
          
          <div 
            className="menu-item" 
            style={{ padding: '4px 20px 4px 5px', cursor: 'pointer', color: contextMenu.incidentStatus === 'processed' ? '#d1d1d1' : '#000' }}
            onClick={() => { 
              if(contextMenu.incidentStatus !== 'processed') {
                setIsMergeModalOpen(true);
              }
              setContextMenu(null); 
            }}
          >
            🔗 Scalanie i grupowanie zdarzeń
          </div>
          <div 
            className="menu-item" 
            style={{ padding: '4px 20px 4px 5px', cursor: 'pointer', color: contextMenu.incidentStatus === 'processed' ? '#d1d1d1' : '#000' }}
            onClick={() => { 
              if(contextMenu.incidentStatus !== 'processed') {
                setIsTransferModalOpen(true);
              }
              setContextMenu(null); 
            }}
          >
            📤 Przekaż Zdarzenie do innej jednostki
          </div>
          <div 
            className="menu-item" 
            style={{ padding: '4px 20px 4px 5px', cursor: 'pointer' }}
            onClick={() => { 
              handleFinishIncident(contextMenu.incidentId);
              setContextMenu(null); 
            }}
          >
            ✅ Zakończ Zdarzenie Ratownicze
          </div>
        </div>
      )}



    </div>
  );
}


export default App;
