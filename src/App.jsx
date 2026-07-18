import { DEFAULT_SCENARIOS } from './scenarios';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMap } from 'react-leaflet';

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  var R = 6371; // Radius of the earth in km
  var dLat = (lat2-lat1) * (Math.PI/180);
  var dLon = (lon2-lon1) * (Math.PI/180); 
  var a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * (Math.PI/180)) * Math.cos(lat2 * (Math.PI/180)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c; 
}

import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { wipeAndInitializeDb } from './db_wipe';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail
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
  arrayUnion,
  limit,
  increment
} from 'firebase/firestore';
import { pozScenarios, mzScenarios, afScenarios } from './scenarioData';
import { polandData } from './polandData';
import { GoogleGenAI } from '@google/genai';
import MobileTerminal from './components/MobileTerminal';
import SisEditor from './SisEditor';
import { getRankByXp, PSP_RANKS } from './ranks';

const APP_VERSION = "0.3.3 beta";

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
const getCityBaseCoords = (cityName) => {
  const norm = (cityName || "").toLowerCase();
  if (norm.includes("warszawa")) return { lat: 52.2297, lng: 21.0122 };
  if (norm.includes("kraków") || norm.includes("krakow")) return { lat: 50.0647, lng: 19.9450 };
  if (norm.includes("łódź") || norm.includes("lodz")) return { lat: 51.7592, lng: 19.4560 };
  if (norm.includes("wrocław") || norm.includes("wroclaw")) return { lat: 51.1079, lng: 17.0385 };
  if (norm.includes("poznań") || norm.includes("poznan")) return { lat: 52.4064, lng: 16.9252 };
  if (norm.includes("gdańsk") || norm.includes("gdansk")) return { lat: 54.3520, lng: 18.6466 };
  if (norm.includes("szczecin")) return { lat: 53.4285, lng: 14.5528 };
  if (norm.includes("bydgoszcz")) return { lat: 53.1235, lng: 18.0084 };
  if (norm.includes("lublin")) return { lat: 51.2465, lng: 22.5684 };
  if (norm.includes("białystok") || norm.includes("bialystok")) return { lat: 53.1325, lng: 23.1688 };
  if (norm.includes("będzin") || norm.includes("bedzin")) return { lat: 50.3276, lng: 19.1249 };
  if (norm.includes("zabrze")) return { lat: 50.3249, lng: 18.7857 };
  if (norm.includes("gliwice")) return { lat: 50.2976, lng: 18.6774 };
  if (norm.includes("sosnowiec")) return { lat: 50.2863, lng: 19.1039 };
  if (norm.includes("bytom")) return { lat: 50.3480, lng: 18.9157 };
  if (norm.includes("ruda")) return { lat: 50.2584, lng: 18.8555 };
  if (norm.includes("tychy")) return { lat: 50.1345, lng: 18.9880 };
  if (norm.includes("chorzów") || norm.includes("chorzow")) return { lat: 50.2976, lng: 18.9545 };
  if (norm.includes("dg") || norm.includes("dąbrowa") || norm.includes("dabrowa")) return { lat: 50.3204, lng: 19.1897 };
  return { lat: 50.2599, lng: 19.0216 };
};

const getCoordinatesForLocation = (locStr, cityName = "Katowice") => {
  const norm = (locStr || "").toLowerCase();
  if (cityName.toLowerCase().includes("katowice")) {
    if (norm.includes("szopienic")) return { lat: 50.2644, lng: 19.0833 };
    if (norm.includes("dąbrówk") || norm.includes("dabrowk")) return { lat: 50.2764, lng: 19.0681 };
    if (norm.includes("kostuchn")) return { lat: 50.1878, lng: 18.9950 };
    if (norm.includes("podles")) return { lat: 50.1820, lng: 18.9660 };
    if (norm.includes("zarzecz")) return { lat: 50.1866, lng: 18.9482 };
    if (norm.includes("piotrowic")) return { lat: 50.2078, lng: 18.9806 };
    if (norm.includes("ligot")) return { lat: 50.2238, lng: 18.9680 };
    if (norm.includes("centrum") || norm.includes("korfant")) return { lat: 50.2599, lng: 19.0216 };
  }
  
  const baseCoords = getCityBaseCoords(cityName);
  let hash = 0;
  for (let i = 0; i < norm.length; i++) {
    hash = norm.charCodeAt(i) + ((hash << 5) - hash);
  }
  const latOffset = ((hash % 100) - 50) / 1000;
  const lngOffset = (((hash >> 8) % 100) - 50) / 1000;
  return { lat: baseCoords.lat + latOffset, lng: baseCoords.lng + lngOffset };
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
  const [ksisTab, setKsisTab] = useState('PSP');
  const [ksisOspGmina, setKsisOspGmina] = useState('');
  const [tenantVehicles, setTenantVehicles] = useState({});
  const [tenantUnitCoordinates, setTenantUnitCoordinates] = useState({});
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
    const coords = getCoordinatesForLocation(locStr, tenantName);
    return SIMULATED_HYDRANTS.map(h => {
      const dist = Math.round(Math.sqrt(Math.pow(h.x - (coords.lng*100), 2) + Math.pow(h.y - (coords.lat*100), 2)) * 12);
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
  const [selectedWojewodztwo, setSelectedWojewodztwo] = useState('');
  const [selectedPowiat, setSelectedPowiat] = useState('');
  const [customKomendaName, setCustomKomendaName] = useState('');
  const [allTenants, setAllTenants] = useState([]);
  const [regRole, setRegRole] = useState('kdr_osp'); // 'kdr_osp' | 'pa_jrg' | 'admin'
  const [selectedOsp, setSelectedOsp] = useState(OSP_UNITS[0]);
  const [selectedJrg, setSelectedJrg] = useState(JRG_UNITS[0]);
  const [error, setError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Context menu state for vehicles
  const [vehicleContextMenu, setVehicleContextMenu] = useState(null);
  const [incidentContextMenu, setIncidentContextMenu] = useState(null);

  // App data states
  const [dbScenarios, setDbScenarios] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [friendlyIncidents, setFriendlyIncidents] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  
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
  const [isTerminalMode, setIsTerminalMode] = useState(false);

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
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsData, setSettingsData] = useState({
    kmkpName: '',
    generatorCities: '',
    incidentFormat: '{prefix}-{nr}',
    reportFormat: 'EWID/{nr}/{rok}',
    geminiApiKey: '',
    discordWebhookUrl: ''
  });
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


  const [isSisEditorOpen, setIsSisEditorOpen] = useState(false);
  const [gmTenantId, setGmTenantId] = useState('');
  const [gmType, setGmType] = useState('pozar');
  const [gmLocation, setGmLocation] = useState('');
  const [gmSgr, setGmSgr] = useState('');
  const [gmDescription, setGmDescription] = useState('');
  const [gmKdrMsg, setGmKdrMsg] = useState('');
  const [newScenType, setNewScenType] = useState('pozar');
  const [newScenLoc, setNewScenLoc] = useState('building');
  const [newScenT, setNewScenT] = useState('');
  const [newScenK, setNewScenK] = useState('');
  const [newScenReqUnits, setNewScenReqUnits] = useState('');
  const [editingScenarioId, setEditingScenarioId] = useState(null);

  // KSiS Requests State
  const [ksisRequests, setKsisRequests] = useState([]);
  const [activeKsisPopups, setActiveKsisPopups] = useState([]);
  const [isKsisSendModalOpen, setIsKsisSendModalOpen] = useState(false);
  const [ksisSendFormData, setKsisSendFormData] = useState({ targetTenant: '', equipment: '', comment: '', incidentId: null });

  // Radio Log State
  const [radioMessages, setRadioMessages] = useState([]);
  const [isRadioLogOpen, setIsRadioLogOpen] = useState(false);
  const [radioInputText, setRadioInputText] = useState('');

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
  const [isWcprCallModalOpen, setIsWcprCallModalOpen] = useState(false);
  const [selectedWcprCallForModal, setSelectedWcprCallForModal] = useState(null);
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

  const logAction = (msg) => {
    const timeStr = new Date().toLocaleTimeString('pl-PL');
    setOperationalLogs(prev => [`[${timeStr}] ${msg}`, ...prev.slice(0, 15)]);
  };

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

  const renameUnit = async (oldName, newName, type) => {
    if (!newName || newName === oldName) return;
    if (!userProfile || !userProfile.tenantId) {
      alert('Brak uprawnień!'); return;
    }
    
    if (type === 'JRG' && tenantJrgUnits.includes(newName)) { alert("Ta nazwa JRG już istnieje!"); return; }
    if (type === 'OSP' && tenantOspUnits.includes(newName)) { alert("Ta nazwa OSP już istnieje!"); return; }

    try {
      const newJrg = type === 'JRG' ? tenantJrgUnits.map(u => u === oldName ? newName : u) : tenantJrgUnits;
      const newOsp = type === 'OSP' ? tenantOspUnits.map(u => u === oldName ? newName : u) : tenantOspUnits;

      const newVehicles = { ...tenantVehicles };
      if (newVehicles[oldName]) {
        newVehicles[newName] = [...newVehicles[oldName]];
        delete newVehicles[oldName];
      }

      const tenantRef = doc(db, 'tenants', userProfile.tenantId);
      await setDoc(tenantRef, { jrgUnits: newJrg, ospUnits: newOsp, vehicles: newVehicles }, { merge: true });
      logAction(`Zmieniono nazwę jednostki z ${oldName} na ${newName}`);
    } catch (err) {
      console.error(err);
      alert('Błąd zmiany nazwy: ' + err.message);
    }
  };

  // Address Generator - Background Overpass API fetcher
  useEffect(() => {
    const settingsCities = userProfile?.settings?.generatorCities || gameModeCities || '';
    const parsedCities = settingsCities.split(',').map(s => s.trim()).filter(s => s.length > 0);
    
    parsedCities.forEach(city => {
      const cacheKey = `swd_streets_${city.toLowerCase()}`;
      const cacheTimeKey = `swd_streets_time_${city.toLowerCase()}`;
      const cachedTime = localStorage.getItem(cacheTimeKey);
      
      // Fetch if no cache or cache is older than 30 days
      const shouldFetch = !localStorage.getItem(cacheKey) || !cachedTime || (Date.now() - parseInt(cachedTime) > 30 * 24 * 60 * 60 * 1000);
      
      if (shouldFetch) {
        // Fetch via Overpass API (all streets in the city area)
        const query = `
          [out:json][timeout:25];
          area[name="${city}"]->.searchArea;
          way(area.searchArea)[highway][name];
          out center;
        `;
        fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          body: query
        })
        .then(res => res.json())
        .then(data => {
          if (data && data.elements) {
            const streetsMap = new Map();
            data.elements.forEach(e => {
              if (e.tags && e.tags.name && e.center) {
                // Keep the first segment of the street to avoid duplicates, but store lat/lon
                if (!streetsMap.has(e.tags.name)) {
                  streetsMap.set(e.tags.name, {
                    name: e.tags.name,
                    lat: e.center.lat,
                    lon: e.center.lon
                  });
                }
              }
            });
            const streetsArr = Array.from(streetsMap.values());
            if (streetsArr.length > 0) {
              localStorage.setItem(cacheKey, JSON.stringify(streetsArr));
              localStorage.setItem(cacheTimeKey, Date.now().toString());
              console.log(`[Overpass] Cached ${streetsArr.length} streets with coords for ${city}`);
            }
          }
        })
        .catch(err => console.error(`[Overpass] Failed to fetch streets for ${city}`, err));
      }
    });
  }, [userProfile?.settings?.generatorCities, gameModeCities]);

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
        
        if (uProf.isBanned) {
          alert('Twoje konto zostało zablokowane przez administratora.');
          signOut(auth);
          return;
        }

        if (uProf.role === 'admin' && !uProf.tenantId) { uProf.tenantId = user.uid; }
        
        // Dynamically compute rank based on XP (default 0) and optional manual override
        uProf.rankObj = getRankByXp(uProf.xp || 0, uProf.customRankId);
        
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
        setTenantName(userProfile?.settings?.kmkpName || data.name || getTenantDefaultName(userProfile.tenantId));
        setTenantJrgUnits(data.jrgUnits || []);
        setTenantOspUnits(data.ospUnits || []);
        setTenantVehicles(data.vehicles || {});
        setTenantUnitCoordinates(data.unitCoordinates || {});
        setTenantMapBases(data.mapBases || {});
        setTenantHydrants(data.hydrants || []);
        setTenantOdwody(data.odwody || []);
        setTenantSpecialists(data.specialists || []);
        setTenantEquipment(data.equipment || {});
      } else {
        // Clear state if tenant config doesn't exist yet
        setTenantStreets([]);
        setTenantName(userProfile?.settings?.kmkpName || getTenantDefaultName(userProfile.tenantId));
        setTenantJrgUnits([]);
        setTenantOspUnits([]);
        setTenantVehicles({});
        setTenantUnitCoordinates({});
        setTenantMapBases({});
        setTenantHydrants([]);
        setTenantOdwody([]);
        setTenantSpecialists([]);
        setTenantEquipment({});
      }
    });

    return unsubscribe;
  }, [userProfile]);

  // Fetch real streets from Overpass API based on generatorCities
  useEffect(() => {
    const fetchStreets = async (city) => {
      const cacheKey = `swd_streets_${city.toLowerCase()}`;
      if (localStorage.getItem(cacheKey)) return;

      try {
        const query = `[out:json]; area["name"="${city}"]->.searchArea; way(area.searchArea)["highway"~"^(residential|primary|secondary|tertiary|unclassified|living_street|pedestrian)$"]["name"]; out tags;`;
        const res = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'data=' + encodeURIComponent(query)
        });
        const data = await res.json();
        const streets = [];
        if (data && data.elements) {
          data.elements.forEach(e => {
            if (e.tags && e.tags.name && !streets.includes(e.tags.name)) {
              streets.push(e.tags.name);
            }
          });
        }
        if (streets.length > 0) {
          localStorage.setItem(cacheKey, JSON.stringify(streets));
          console.log(`Pobrano i zapisano ${streets.length} ulic dla miasta ${city}`);
        }
      } catch (e) {
        console.error(`Failed to fetch streets for ${city}:`, e);
      }
    };

    const settingsCities = userProfile?.settings?.generatorCities || gameModeCities || '';
    const parsedCities = settingsCities.split(',').map(s => s.trim()).filter(s => s.length > 0);
    parsedCities.forEach(city => fetchStreets(city));
  }, [userProfile?.settings?.generatorCities, gameModeCities]);

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
          const soundPref = userProfile?.settings?.customSound || 'buzzer';
          if (soundPref === 'buzzer') playSynthSound('dispatch_alarm');
          else if (soundPref === 'bell') playSynthSound('ring');
          else if (soundPref === 'siren') playSynthSound('siren');
          else if (soundPref === 'ping') playSynthSound('message_beep');
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



  // Listen to Users (Everyone)
  useEffect(() => {
    if (!userProfile) return;
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

  // Listen to Tenants
  useEffect(() => {
    if (!userProfile) return;
    const tenantsRef = collection(db, 'tenants');
    const unsubscribe = onSnapshot(tenantsRef, (snapshot) => {
      const items = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() });
      });
      setAllTenants(items);
    }, (err) => {
      console.error("Error fetching tenants:", err);
    });
    return unsubscribe;
  }, [userProfile]);

  // Listen to KSiS requests
  useEffect(() => {
    if (!userProfile) return;
    const ksisRef = collection(db, 'ksis_requests');
    let initialLoad = true;
    
    const unsubscribe = onSnapshot(ksisRef, (snapshot) => {
      const items = [];
      snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
      
      const relevant = items.filter(req => 
        userProfile.role === 'admin' || req.toTenantId === userProfile.tenantId || req.fromTenantId === userProfile.tenantId
      );
      
      setKsisRequests(relevant);
      
      if (!initialLoad) {
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added') {
            const req = { id: change.doc.id, ...change.doc.data() };
            if (req.status === 'pending' && (req.toTenantId === userProfile.tenantId || (userProfile.role === 'admin' && req.toTenantId === '120000'))) {
              if (isSystemAudioEnabled) playSynthSound('message_beep');
              setActiveKsisPopups(prev => {
                if (prev.some(p => p.id === req.id)) return prev;
                return [...prev, req];
              });
            }
          }
        });
      }
      initialLoad = false;
    });
    return unsubscribe;
  }, [userProfile, isSystemAudioEnabled]);

  // Listen to Radio Messages
  useEffect(() => {
    if (!userProfile) return;
    const radioRef = collection(db, 'radio_messages');
    // We only load the last 50 messages to save bandwidth
    const q = query(radioRef, orderBy('createdAt', 'desc'), limit(50));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = [];
      snapshot.forEach(doc => {
        items.push({ id: doc.id, ...doc.data() });
      });
      // Reverse so oldest is top, newest is bottom
      setRadioMessages(items.reverse());
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
      
      
      // --- Custom Updates Escalation Logic ---
      if (incident.updates && Array.isArray(incident.updates)) {
        const processed = incident.processedUpdates || 0;
        if (processed < incident.updates.length) {
          const nextUpdate = incident.updates[processed];
          let startTime = incident.createdAt?.seconds ? incident.createdAt.seconds * 1000 : (incident.createdAt ? new Date(incident.createdAt).getTime() : Date.now());
          if (incident.times?.alarm) startTime = new Date(incident.times.alarm).getTime();
          
          const elapsedSecs = Math.floor((Date.now() - startTime) / 1000);
          if (elapsedSecs >= nextUpdate.delay) {
            const newRadioLog = {
              time: new Date().toLocaleTimeString('pl-PL'),
              from: 'KDR',
              to: 'SKKP',
              text: "[ESKALACJA] " + nextUpdate.msg,
              read: false
            };
            const radioLogs = incident.radioLogs || [];
            const updatePayload = {
              processedUpdates: processed + 1,
              radioLogs: [...radioLogs, newRadioLog],
              updatedAt: serverTimestamp()
            };
            if (nextUpdate.requiredUnits) {
               updatePayload.requiredUnits = nextUpdate.requiredUnits;
               updatePayload.kdrRequestPending = true; // Block closing until satisfied
               updatePayload.description = (incident.description || '') + "\n\n[ZMIANA WYMOGÓW TAKTYCZNYCH]: KDR poprosił o zadysponowanie: " + JSON.stringify(nextUpdate.requiredUnits);
            }
            try {
              updateDoc(doc(db, 'incidents', incident.id), updatePayload);
            } catch(e) {}
          }
        }
      }
      
      // --- Dynamic Incident Mutation Logic ---

      if (vehicles.length === 0 && incident.createdAt) {
        const createdTime = incident.createdAt.seconds ? incident.createdAt.seconds * 1000 : new Date(incident.createdAt).getTime();
        const elapsedSinceCreated = Math.floor((new Date().getTime() - createdTime) / 1000);
        
        // Mutate after ~3 minutes (180 seconds)
        if (elapsedSinceCreated > 180 && !incident.hasMutated) {
          const kdrMsg = incident.expectedKdrMsg || "Zgłaszam nietypowy rozwój sytuacji.";
          const newDescription = (incident.description || '') + "\n\n[ALARM] OSOBA ZGŁASZAJĄCA DZWONI PONOWNIE! Sytuacja uległa pogorszeniu. Oczekiwany scenariusz: " + kdrMsg;
          
          try {
            updateDoc(doc(db, 'incidents', incident.id), {
              description: newDescription,
              hasMutated: true,
              updatedAt: serverTimestamp()
            });
            
            import('firebase/firestore').then(({ addDoc, collection }) => {
                 addDoc(collection(db, 'radio_messages'), {
                   text: `[ALARM] Zgłoszenie ${incident.customId} - brak zadysponowanych sił, sytuacja pogarsza się!`,
                   senderName: "System",
                   senderTenant: incident.tenantId,
                   timestamp: serverTimestamp()
                 });
            });
          } catch(e) { console.error(e); }
        }
      }

      // --- KDR Request Logic (Meldunek z miejsca zdarzenia) ---
      if (!incident.kdrRequestSent && vehicles.length > 0) {
        const vehiclesOnScene = vehicles.filter(v => currentStatuses[v] === 2);
        if (vehiclesOnScene.length > 0) {
          const firstArrival = Object.entries(statusTimes)
            .filter(([v, time]) => currentStatuses[v] === 2)
            .map(([v, time]) => new Date(time).getTime())
            .sort()[0];
            
          const elapsedArrival = Math.floor((new Date().getTime() - firstArrival) / 1000);
          
          // Wait random time between 25 and 45 seconds after arrival
          if (elapsedArrival >= 30) {
            
            const kdrMsg = incident.expectedKdrMsg || "Zgłaszam nietypowy rozwój sytuacji. Proszę o zadysponowanie dodatkowego zastępu ratowniczego na miejsce.";
            
            const vStr = vehiclesOnScene[0];
            
            try {
              const radioLogs = incident.radioLogs || [];
              const timeSecStr = new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
              const newRadioLog = {
                time: timeSecStr,
                from: vStr.split(' | ')[1] || vStr,
                to: "Dyspozytornia",
                text: kdrMsg
              };

              await updateDoc(doc(db, 'incidents', incident.id), {
                radioLogs: [...radioLogs, newRadioLog],
                kdrRequestSent: true,
                kdrRequestPending: true,
                updatedAt: serverTimestamp()
              });
              
              // Also add to global Radio Log
              import('firebase/firestore').then(({ addDoc, collection }) => {
                 addDoc(collection(db, 'radio_messages'), {
                   text: `[KDR] ${vStr.split(' | ')[1] || vStr}: ${kdrMsg}`,
                   senderName: "KDR na miejscu",
                   senderTenant: incident.tenantId,
                   createdAt: new Date().toISOString()
                 }).catch(console.error);
              });
              
              // Play alert sound if audio enabled
              if (isSystemAudioEnabled) playSynthSound('message_beep');
            } catch (e) {
              console.error("KDR message error:", e);
            }
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
        
        const difficulty = userProfile?.settings?.difficulty || 'normal';
        let minDelay = 120000, randAdd = 120000;
        if (difficulty === 'easy') { minDelay = 240000; randAdd = 60000; }
        else if (difficulty === 'hard') { minDelay = 30000; randAdd = 30000; }
        
        window._nextGameIncidentInterval = Math.floor(minDelay + Math.random() * randAdd);

        // Polish names generator
        const firstNames = ["Jan", "Andrzej", "Piotr", "Krzysztof", "Stanisław", "Tomasz", "Paweł", "Józef", "Marcin", "Marek", "Anna", "Maria", "Katarzyna", "Małgorzata", "Agnieszka", "Krystyna", "Barbara", "Ewa", "Elżbieta", "Zofia", "Karol", "Michał", "Artur", "Dawid", "Mateusz", "Zuzanna", "Julia", "Maja", "Oliwia", "Jakub", "Szymon"];
        const lastNames = ["Nowak", "Kowalski", "Wiśniewski", "Wójcik", "Kowalczyk", "Kamiński", "Lewandowski", "Zieliński", "Szymański", "Woźniak", "Dąbrowski", "Kozłowski", "Jankowski", "Mazur", "Wojciechowski", "Kwiatkowski", "Krawczyk", "Kaczmarek", "Piotrowski", "Grabowski", "Smuga", "Zając", "Bąk", "Krupa", "Sikora"];
        const streets = tenantStreets.length > 0 ? tenantStreets : ["Główna", "Polna", "Leśna"];
        
        const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
        
        const settingsCities = userProfile?.settings?.generatorCities || gameModeCities || '';
        const parsedCities = settingsCities.split(',').map(s => s.trim()).filter(s => s.length > 0);
        let cityPool = [tenantName];
        if (tenantName === 'Będzin') cityPool = ['Będzin', 'Czeladź', 'Siewierz', 'Wojkowice', 'Sławków', 'Psary', 'Mierzęcice', 'Bobrowniki'];
        else if (tenantName === 'Katowice') cityPool = ['Katowice'];
        else if (tenantName === 'Zabrze') cityPool = ['Zabrze'];
        else if (tenantName === 'Bytom') cityPool = ['Bytom'];
        
        const city = parsedCities.length > 0 ? randomElement(parsedCities) : randomElement(cityPool);

        let activeStreets = streets;
        const cachedStreetsStr = localStorage.getItem(`swd_streets_${city.toLowerCase()}`);
        if (cachedStreetsStr) {
          try {
            const cachedArr = JSON.parse(cachedStreetsStr);
            if (Array.isArray(cachedArr) && cachedArr.length > 0) {
              activeStreets = cachedArr;
            }
          } catch (e) { console.error(e); }
        }

        const callerName = `${randomElement(firstNames)} ${randomElement(lastNames)}`;
        const phone = `${Math.floor(500 + Math.random() * 200)}-${Math.floor(100 + Math.random() * 800)}-${Math.floor(100 + Math.random() * 800)}`;
        
        let location = "";
        
        const generateAndAddIncident = async () => {
          
          const type = randomElement(["pozar", "mz", "pozar", "mz", "mz"]);
          let text = "";
          let expectedKdrMsg = "";
          let needsZRM = false;
          let needsPolice = false;
          let scenarioObj = {};
          
          const dynamicScenarios = dbScenarios.filter(s => s.type === type);
          const offlineScenarios = DEFAULT_SCENARIOS.filter(s => s.type === type);
          
          if (dynamicScenarios.length > 0 && Math.random() > 0.4) {
            scenarioObj = randomElement(dynamicScenarios);
          } else {
            scenarioObj = randomElement(offlineScenarios);
          }

          const streetObj = randomElement(activeStreets);
          const street = typeof streetObj === 'object' && streetObj !== null ? streetObj.name : streetObj;
          const incidentCoords = typeof streetObj === 'object' && streetObj !== null ? { lat: streetObj.lat, lng: streetObj.lon } : null;
          const houseNum = Math.floor(Math.random() * 150) + 1;
          
          const locType = scenarioObj.locType || "building";
          if (locType === "apartment") {
            const m = Math.floor(Math.random() * 60) + 1;
            location = `${city}, ul. ${street} ${houseNum} m. ${m}`;
          } else if (locType === "intersection") {
            let street2Obj = randomElement(activeStreets); let street2 = typeof street2Obj === 'object' ? street2Obj.name : street2Obj;
            while (street2 === street && activeStreets.length > 1) {
              street2Obj = randomElement(activeStreets); street2 = typeof street2Obj === 'object' ? street2Obj.name : street2Obj;
            }
            location = `${city}, Skrzyżowanie ul. ${street} z ul. ${street2}`;
          } else if (locType === "forest") {
            location = `${city}, Kompleks leśny, dojazd od ul. ${street}`;
          } else if (locType === "road") {
            location = `${city}, odcinek drogi ul. ${street}`;
          } else if (locType === "industrial") {
            const prefixes = ["Hala Magazynowa", "Zakład Produkcyjny", "Skup Złomu", "Tartak"];
            location = `${city}, ${randomElement(prefixes)}, ul. ${street} ${houseNum}`;
          } else if (locType === "commercial" || locType === "public") {
            const prefixes = locType === "commercial" ? ["Market Biedronka", "Sklep Żabka", "Stacja Paliw Orlen", "Lidl", "Pasaż Handlowy"] : ["Szkoła Podstawowa", "Przychodnia Rejonowa", "Urząd Skarbowy", "Dworzec", "Komisariat Policji"];
            location = `${city}, ${randomElement(prefixes)}, ul. ${street} ${houseNum}`;
          } else {
            location = `${city}, ul. ${street} ${houseNum}`;
          }
          
          text = scenarioObj.t;
          expectedKdrMsg = scenarioObj.k;
          needsZRM = !!scenarioObj.zrm;
          needsPolice = !!scenarioObj.pol;

          try {
            const finalType = scenarioObj.reportedType || type;
            await addDoc(collection(db, 'calls'), {
              tenantId: userProfile?.tenantId || 'brak',
              type: finalType,
              category: finalType,
              status: 'pending',
              location: location,
              address: location,
              coords: incidentCoords || null,
              gminaStr: `Gmina m. ${city}`,
              miejscowoscStr: city,
              description: text,
              callerName: callerName,
              phone: `+48 ${phone}`,
              expectedKdrMsg: expectedKdrMsg,
              requiredUnits: scenarioObj.requiredUnits || null,
              updates: scenarioObj.updates || [],
              processedUpdates: 0,
              needsZRM: needsZRM,
              needsPolice: needsPolice,
              createdAt: serverTimestamp()
            });
            logAction(`🚨 Gra: Nowe połączenie 112 trafiło do bufora!`);
          } catch(e) {
            console.error("Error creating AI/Offline incident:", e);
          }
        };

        generateAndAddIncident();
      }
      
      // EXPORT FOR MANUAL BUTTON
      window._triggerManualWCPR = async () => {
        const callerName = `${randomElement(firstNames)} ${randomElement(lastNames)}`;
        const phone = `${Math.floor(500 + Math.random() * 200)}-${Math.floor(100 + Math.random() * 800)}-${Math.floor(100 + Math.random() * 800)}`;
        const type = randomElement(["pozar", "mz", "pozar", "mz", "mz"]);
        const dynamicScenarios = dbScenarios.filter(s => s.type === type);
        const offlineScenarios = DEFAULT_SCENARIOS.filter(s => s.type === type);
        const scenarioObj = (dynamicScenarios.length > 0 && Math.random() > 0.4) ? randomElement(dynamicScenarios) : randomElement(offlineScenarios);
        
        const streetObj = activeStreets && activeStreets.length > 0 ? randomElement(activeStreets) : "Główna";
        const street = typeof streetObj === 'object' && streetObj !== null ? streetObj.name : streetObj;
        const incidentCoords = typeof streetObj === 'object' && streetObj !== null ? { lat: streetObj.lat, lng: streetObj.lon } : null;
        const houseNum = Math.floor(Math.random() * 150) + 1;
        let location = `${city}, ul. ${street} ${houseNum}`;
        
        try {
            await addDoc(collection(db, 'calls'), {
              tenantId: userProfile?.tenantId || 'brak',
              type: scenarioObj.reportedType || type,
              category: scenarioObj.reportedType || type,
              status: 'pending',
              location: location,
              address: location,
              coords: incidentCoords || null,
              gminaStr: `Gmina m. ${city}`,
              miejscowoscStr: city,
              description: scenarioObj.text || "Zgłoszenie z formatki WCPR",
              callerName: callerName,
              phone: `+48 ${phone}`,
              expectedKdrMsg: scenarioObj.expectedKdrMsg || "",
              requiredUnits: scenarioObj.requiredUnits || null,
              updates: scenarioObj.updates || [],
              processedUpdates: 0,
              needsZRM: !!scenarioObj.zrm,
              needsPolice: !!scenarioObj.pol,
              requiredSgr: scenarioObj.requiredSgr || null,
              createdAt: serverTimestamp()
            });
            logAction(`🚨 Gra: Wymuszono nowe połączenie 112!`);
        } catch(e) { console.error(e); }
      };
    }

  }, [activeRole, incidents, isGameModeActive, incomingCalls, lastGameIncidentTime, gameModeCities, dbScenarios, animationTick]);

  // --- LISTEN TO GLOBAL SCENARIOS ---
  useEffect(() => {
    if (!userProfile) return;
    const unsub = onSnapshot(collection(db, 'scenarios'), snap => {
      const arr = [];
      snap.forEach(doc => arr.push({ id: doc.id, ...doc.data() }));
      setDbScenarios(arr);
    });
    return () => unsub();
  }, [userProfile]);

  // --- AUTOMATYCZNY DOJAZD DEMON ---
  useEffect(() => {
    if (!userProfile?.uid) return;
    const interval = setInterval(async () => {
      const now = Date.now();
      const myIncidents = incidents.filter(i => i.ownerId === userProfile.uid && !i.isArchived && i.status !== 'processed');
      
      for (const inc of myIncidents) {
        let changed = false;
        const currentStatuses = { ...(inc.vehicleStatuses || {}) };
        const currentTimes = inc.times || {};
        const radioLogs = [...(inc.radioLogs || [])];
        const statusTimes = { ...(inc.vehicleStatusTimes || {}) };
        const eventHistory = [...(inc.eventHistory || [])];
        
        let hasSgrOnSite = false;
        
        for (const [vStr, status] of Object.entries(currentStatuses)) {
          // Check SGR fulfillment if vehicle is on site (status >= 2 && status <= 4)
          if ((status === 2 || status === 3 || status === 4) && inc.requiredSgr) {
            const parts = vStr.split(' | ');
            if (parts.length === 2 && tenantVehicles && tenantVehicles[parts[0]]) {
              const veh = tenantVehicles[parts[0]].find(v => v.name === parts[1]);
              if (veh && veh.sgr === inc.requiredSgr) {
                hasSgrOnSite = true;
              }
            }
          }
          
          if (status === 1) { // Wyjazd
            const stTime = statusTimes[vStr];
            if (stTime) {
              const diffMs = now - new Date(stTime).getTime();
              // 2 minutes = 120000 ms (Let's use 120s)
              if (diffMs > 120000) {
                // Auto arrive!
                currentStatuses[vStr] = 2; // Na miejscu
                statusTimes[vStr] = new Date().toISOString();
                
                const nowStr = new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
                if (!currentTimes.arrival) currentTimes.arrival = nowStr;
                
                radioLogs.push({
                  time: nowStr + ':' + new Date().getSeconds().toString().padStart(2, '0'),
                  from: vStr.split(' | ')[1] || vStr,
                  to: "Dyspozytornia",
                  text: `Zgłaszam status radiowy: NA MIEJSCU (ST 2)`,
                  channel: "K01 - Kanał Powiatowy",
                  createdAt: new Date().toISOString()
                });
                
                eventHistory.push({
                  time: nowStr,
                  user: "SYSTEM AUTO",
                  action: `Zastęp ${vStr.split(' | ')[1] || vStr} dojechał na miejsce.`,
                  createdAt: new Date().toISOString()
                });
                
                changed = true;
              }
            }
          }
        }
        
        // SGR reminder logic
        if (inc.requiredSgr && !hasSgrOnSite && Object.values(currentStatuses).some(s => s >= 2)) {
          // At least one vehicle is on site, but no SGR.
          // Let's remind every 2 minutes. We can use the last event history time to throttle, 
          // or add a property 'lastSgrReminder'.
          const lastReminder = inc.lastSgrReminder || 0;
          if (now - lastReminder > 120000) {
            inc.lastSgrReminder = now;
            const nowStr = new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
            
            const kdrVeh = Object.entries(currentStatuses).find(([v, s]) => s >= 2)?.[0] || 'KDR';
            
            radioLogs.push({
              time: nowStr + ':' + new Date().getSeconds().toString().padStart(2, '0'),
              from: kdrVeh.split(' | ')[1] || kdrVeh,
              to: "Dyspozytornia",
              text: `Sytuacja skomplikowana. Pilnie potrzebujemy na miejscu Grupy Specjalistycznej ${inc.requiredSgr}!`,
              channel: "K01 - Kanał Powiatowy",
              createdAt: new Date().toISOString()
            });
            
            eventHistory.push({
              time: nowStr,
              user: "KDR",
              action: `Zgłoszono zapotrzebowanie na ${inc.requiredSgr}.`,
              createdAt: new Date().toISOString()
            });
            changed = true;
          }
        }
        
        // Auto-fulfill SGR if it just arrived
        if (inc.requiredSgr && hasSgrOnSite && !inc.sgrFulfilled) {
           inc.sgrFulfilled = true;
           const nowStr = new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
           eventHistory.push({
              time: nowStr,
              user: "SYSTEM",
              action: `Wymóg ${inc.requiredSgr} został spełniony.`,
              createdAt: new Date().toISOString()
           });
           changed = true;
        }

        if (changed) {
          const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
          try {
            await updateDoc(doc(db, 'incidents', inc.id), {
              vehicleStatuses: currentStatuses,
              vehicleStatusTimes: statusTimes,
              times: currentTimes,
              radioLogs,
              eventHistory,
              updatedAt: serverTimestamp()
            });
            console.log("AutoDojazd executed for", inc.customId);
          } catch(e) {
            console.error("AutoDojazd Error", e);
          }
        }
      }
    }, 15000); // Check every 15 seconds
    
    return () => clearInterval(interval);
  }, [incidents, userProfile]);

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

  const activeIncident = incidents.find(i => i.id === selectedIncidentId) 
    || friendlyIncidents.find(i => i.id === selectedIncidentId);

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

  
  const toggleVehicleStandby = async (unitName, vehicleName) => {
    try {
      if (userProfile?.role !== 'admin' && userProfile?.role !== 'pa_jrg' && userProfile?.role !== 'dyspozytor') return;
      const updatedVehicles = { ...tenantVehicles };
      if (!updatedVehicles[unitName]) return;
      const vIndex = updatedVehicles[unitName].findIndex(v => v.name === vehicleName);
      if (vIndex !== -1) {
        updatedVehicles[unitName][vIndex].isStandby = !updatedVehicles[unitName][vIndex].isStandby;
        
        // This requires import of doc, updateDoc, db, which are already present.
        await updateDoc(doc(db, 'tenantSettings', 'default'), { vehicles: updatedVehicles });
        logAction(`[${unitName}] Pojazd ${vehicleName} ${updatedVehicles[unitName][vIndex].isStandby ? 'postawiony w Stan Gotowości (PZR)' : 'wycofany ze Stanu Gotowości'}.`);
      }
    } catch (err) {
      console.error("Błąd zapisywania gotowości pojazdu:", err);
    }
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
    
    // Brute force check
    const lockKey = `lock_${email}`;
    const attemptsKey = `attempts_${email}`;
    const lockedUntil = localStorage.getItem(lockKey);
    if (lockedUntil && new Date().getTime() < parseInt(lockedUntil)) {
      const minLeft = Math.ceil((parseInt(lockedUntil) - new Date().getTime()) / 60000);
      return setError(`Konto zablokowane. Spróbuj ponownie za ${minLeft} min.`);
    }

    setError('');
    setFormLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Email Verification Check for NEW accounts (after 2026-07-11)
      const creationDate = new Date(user.metadata.creationTime);
      const cutoffDate = new Date('2026-07-11T00:00:00Z');
      if (!user.emailVerified && creationDate > cutoffDate) {
        await signOut(auth);
        setError('Musisz zweryfikować adres e-mail przed zalogowaniem. Sprawdź skrzynkę.');
        setFormLoading(false);
        return;
      }

      // Reset attempts on success
      localStorage.removeItem(attemptsKey);
      localStorage.removeItem(lockKey);

      // Audit Log
      try {
        await addDoc(collection(db, 'audit_logs'), {
          uid: user.uid,
          email: user.email,
          action: 'login_success',
          timestamp: serverTimestamp(),
          userAgent: navigator.userAgent
        });
      } catch (logErr) {
        console.error("Audit log error:", logErr);
      }

      logAction(`Zalogowano użytkownika: ${email}`);
    } catch (err) {
      console.error(err);
      
      // Increment failed attempts
      let attempts = parseInt(localStorage.getItem(attemptsKey) || '0') + 1;
      if (attempts >= 5) {
        localStorage.setItem(lockKey, (new Date().getTime() + 5 * 60000).toString()); // 5 min lock
        localStorage.setItem(attemptsKey, '0');
        setError('Zbyt wiele nieudanych prób. Konto zablokowane na 5 minut.');
      } else {
        localStorage.setItem(attemptsKey, attempts.toString());
        setError(getFriendlyErrorMessage(err.code));
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!selectedWojewodztwo || !selectedPowiat || !customKomendaName) {
      setError('Wybierz województwo, powiat i podaj nazwę komendy.');
      return;
    }
    const slugify = str => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const generatedTenantId = `${slugify(selectedWojewodztwo)}_${slugify(selectedPowiat)}_${slugify(customKomendaName)}`;
    const pwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!pwdRegex.test(password)) {
      setError('Hasło musi mieć min. 8 znaków, wielką i małą literę, cyfrę oraz znak specjalny.');
      return;
    }
    setError('');
    setFormLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;
      
      try {
        await sendEmailVerification(userCredential.user);
      } catch (e) {
        console.error("Verification email failed:", e);
      }

      await updateProfile(userCredential.user, {
        displayName: displayName || email.split('@')[0]
      });

      const batch = writeBatch(db);
      
      batch.set(doc(db, 'tenants', generatedTenantId), {
        id: generatedTenantId,
        name: customKomendaName,
        wojewodztwo: selectedWojewodztwo,
        powiat: selectedPowiat,
        createdAt: serverTimestamp()
      }, { merge: true });

      batch.set(doc(db, 'users', uid), {
        uid,
        email,
        displayName: displayName || email.split('@')[0],
        role: 'dyspozytor',
        tenantId: generatedTenantId,
        createdAt: serverTimestamp(),
        xp: 0,
        completedIncidents: 0
      });

      await batch.commit();
      
      logAction(`Zarejestrowano nowe konto: ${email} i utworzono komendę: ${customKomendaName}`);
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
    const incidentFormat = userProfile?.settings?.incidentFormat || '{prefix}-{nr}';
    const customId = incidentFormat.replace('{prefix}', prefix).replace('{nr}', sequenceNumber).replace('{rok}', currentYear.toString());

    const servicesList = notifiedServices.join(', ');

    // SWD-ST 2.5: 'bl' (Błąd) and 'af' (Alarm fałszywy) auto-fill completion time
    const isErrorOrFalseAlarm = incidentType === 'bl' || incidentType === 'af';
    const nowTimeStr = new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });

    const incidentData = {
      ospUnit: userProfile?.role === 'kdr_osp' ? userProfile.ospUnit : OSP_UNITS[0],
      kdrName: userProfile?.displayName || userProfile?.email || 'Dowódca',
      requiredUnits: activeIncident?.requiredUnits || null,
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
          vehicleStatuses: {},
          vehicleStatusTimes: {},
          radioLogs: [],
          eventHistory: [],
          kdrRequestSent: false,
          kdrRequestPending: false,
          expectedKdrMsg: '',
          externalServices: {
            zrm: 'Brak',
            policja: 'Brak',
            pogotowie: 'Brak'
          },
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

  const loadIncidentForEditing = (incidentToLoad = activeIncident) => {
    if (!incidentToLoad) return;
    if (incidentToLoad.status === 'processed' && !isAdminUnlockBypass) return;
    setEditingIncidentId(incidentToLoad.id);
    setLocation(incidentToLoad.location || '');
    setGminaStr(incidentToLoad.gminaStr || `m. ${tenantName}`);
    setMiejscowoscStr(incidentToLoad.miejscowoscStr || tenantName);
    setObiektStr(incidentToLoad.obiektStr || '');
    setCallerNameStr(incidentToLoad.callerNameStr || '');
    setCallerPhoneStr(incidentToLoad.callerPhoneStr || '');
    setCallerAddressStr(incidentToLoad.callerAddressStr || '');
    setNotifiedServices(incidentToLoad.notifiedServices || ['PRM', 'Policja']);
    setCoordX(incidentToLoad.coordX || '19.023');
    setCoordY(incidentToLoad.coordY || '50.264');

    setIncidentType(incidentToLoad.type);
    setTargetUnitDocelowa(incidentToLoad.targetUnitDocelowa || JRG_UNITS[1]);
    setActionType(incidentToLoad.actionType || 'ratownicze');
    setIncidentDateStr(incidentToLoad.eventDate || new Date().toISOString().split('T')[0]);
    setDescription(incidentToLoad.description);
    setTargetJrg(incidentToLoad.targetJrg || JRG_UNITS[0]);
    setFirefightersCount(incidentToLoad.firefightersCount || 6);
    setEquipmentUsed(incidentToLoad.equipmentUsed || '');
    setSelectedVehicles(incidentToLoad.vehicles || []);
    setIsLongDuration(incidentToLoad.isLongDuration || false);
    setSopSteps(incidentToLoad.sopSteps || []);
    
    const times = incidentToLoad.times || {};
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

  const dispatchExternalService = async (serviceName) => {
    if (!editingIncidentId) return;
    const inc = incidents.find(i => i.id === editingIncidentId);
    if (!inc) return;

    try {
      await updateDoc(doc(db, 'incidents', editingIncidentId), {
        [`externalServices.${serviceName}`]: 'Zadysponowane'
      });
      logIncidentHistory(editingIncidentId, `Powiadomiono służbę: ${serviceName.toUpperCase()}`);
      
      // Simulate bot arrival
      setTimeout(async () => {
        try {
          await updateDoc(doc(db, 'incidents', editingIncidentId), {
            [`externalServices.${serviceName}`]: 'Na miejscu'
          });
          logIncidentHistory(editingIncidentId, `Służba ${serviceName.toUpperCase()} na miejscu.`);
        } catch (e) { console.error(e); }
      }, Math.floor(Math.random() * 40000) + 20000); // 20 - 60 seconds

    } catch (err) {
      console.error(err);
      alert('Błąd dysponowania służb zewnętrznych');
    }
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

    if (vString.includes('OSP')) {
      const ospName = vString.split(' | ')[0] || vString;
      const doAlarm = window.confirm(`Czy alarmować:\n- Alarmowanie automatyczne ${ospName}?`);
      if (!doAlarm) {
        // Continue anyway or cancel? The manual says "Czy alarmować".
        // It implies if they click NO, it still dispatches but without the alarm.
        // We'll log the dispatch but skip the alarm message.
      } else {
        logIncidentHistory(activeIncident.id, `[System DSP] Wyzwolono alarmowanie selektywne jednostki ${ospName}.`);
        logAction(`[System DSP] Wyzwolono alarmowanie selektywne jednostki ${ospName}.`);
      }
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
      
      // Sprawdzanie wymagań sprzętowych
      if (activeIncident.requiredUnits && Object.keys(activeIncident.requiredUnits).length > 0) {
        let missing = false;
        const currentCounts = {};
        const dispatched = activeIncident.vehicles || [];
        dispatched.forEach(v => {
          // GCBA 5/32 - JRG 1 -> wyciągamy pierwsze słowo
          const type = v.split(' ')[0];
          if(type) currentCounts[type] = (currentCounts[type] || 0) + 1;
        });
        
        let warningText = "UWAGA! Niespełnione wymogi sprzętowe misji:\n";
        for (const [reqType, reqCount] of Object.entries(activeIncident.requiredUnits)) {
          const count = currentCounts[reqType] || 0;
          if (count < reqCount) {
            missing = true;
            warningText += `- Wymagano ${reqCount}x ${reqType}, wysłano ${count}x\n`;
          }
        }
        
        if (missing) {
          warningText += "\nZamykasz incydent niezgodnie ze sztuką (Błąd Taktyczny). Czy na pewno chcesz zamknąć meldunek?";
          if (!window.confirm(warningText)) {
             return;
          }
        }
      }
    } else {
      if (!departureTime || !customReportNumber.trim()) {
        alert("Wymagany jest czas wyjazdu oraz numer rejestru meldunków.");
        return;
      }
    }

    const reportFormat = userProfile?.settings?.reportFormat || 'EWID/{nr}/{rok}';
    const currentYear = new Date().getFullYear().toString();
    const fullReportNumber = reportFormat.replace('{nr}', customReportNumber).replace('{rok}', currentYear);
    
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

    // Clean undefined values from updatedTimes to prevent Firestore crash
    Object.keys(updatedTimes).forEach(key => updatedTimes[key] === undefined && delete updatedTimes[key]);

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
      
      // AWARD POINTS IF COMPLETED!
      if (!isPartialReport) {
        if (user) {
          await setDoc(doc(db, 'users', user.uid), {
            xp: increment(10),
            completedIncidents: increment(1)
          }, { merge: true });
        }
        
        if (isGameModeActive) {
          setGameScore(prev => {
            const updated = prev + 100;
            localStorage.setItem('swd_game_score', updated.toString());
            return updated;
          });
          alert(`🏆 Gratulacje!\nZdarzenie poprawnie zlikwidowane i zarchiwizowane.\n\nZDOBYWASZ +100 PUNKTÓW!`);
        }
      }

      setIsEwidReportModalOpen(false);
      setSelectedIncidentId(null);
    } catch (err) {
      console.error(err);
      alert("Błąd zapisu w Firestore: " + err.message);
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

  const openSettingsModal = () => {
    setSettingsData({
      kmkpName: userProfile?.settings?.kmkpName || '',
      generatorCities: userProfile?.settings?.generatorCities || '',
      incidentFormat: userProfile?.settings?.incidentFormat || '{prefix}-{nr}',
      reportFormat: userProfile?.settings?.reportFormat || 'EWID/{nr}/{rok}',
      difficulty: userProfile?.settings?.difficulty || 'normal',
      customSound: userProfile?.settings?.customSound || 'buzzer'
    });
    setIsSettingsModalOpen(true);
  };

  const handleSaveSettings = async () => {
    try {
      if (settingsData.geminiApiKey) {
        localStorage.setItem('geminiApiKey', settingsData.geminiApiKey);
      } else {
        localStorage.removeItem('geminiApiKey');
      }

      if (!userProfile) return;
      const safeSettings = { ...settingsData };
      delete safeSettings.geminiApiKey; // Nie wysyłamy klucza do bazy danych

      await updateDoc(doc(db, 'users', userProfile.uid), {
        settings: safeSettings
      });
      logAction(`[Ustawienia] Zapisano nową konfigurację użytkownika.`);
      setIsSettingsModalOpen(false);
      
      // Update local tenantName immediately if it was changed
      if (settingsData.kmkpName) {
        setTenantName(settingsData.kmkpName);
      }
    } catch (err) {
      console.error("Błąd zapisywania ustawień:", err);
      alert("Błąd zapisu ustawień: " + err.message);
    }
  };

  // Discord Webhook Helper
  const sendDiscordNotification = async (vehicleName, statusNum, incidentObj) => {
    const webhookUrl = userProfile?.settings?.discordWebhookUrl || settingsData.discordWebhookUrl;
    if (!webhookUrl) return;

    let statusText = "";
    let color = 0x555555;
    
    if (statusNum === 1) {
      statusText = "Wyjazd do akcji";
      color = 0xff0000; // Red
    } else if (statusNum === 4) {
      statusText = "Powrót do koszar";
      color = 0x2b8a3e; // Green
    } else {
      return; // Tylko status 1 i 4
    }

    const payload = {
      content: `🚨 **Aktualizacja statusu SiS:** Zastęp **${vehicleName}** zgłasza: *${statusText}*`,
      embeds: [{
        title: `Zdarzenie: ${incidentObj.type === 'pozar' ? 'Pożar' : incidentObj.type === 'mz' ? 'Miejscowe Zagrożenie' : 'Alarm'}`,
        description: `**Miejsce:** ${incidentObj.location}\n**Opis:** ${incidentObj.description}`,
        color: color,
        footer: {
          text: `SWD-ST 2.5 Symulator | Jednostka: ${userProfile?.tenantId || 'Brak'}`
        },
        timestamp: new Date().toISOString()
      }]
    };

    try {
      fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.error("Błąd wysyłania Discord Webhook", e);
    }
  };

  // Digital vehicle status radios (ST 1-5) auto-fill times logic
  // Calculate ETA logic
function calculateETA(vStr, incident, tenantUnitCoordinates) {
   let ms = 2 * 60000; // Default 2 min
   const vUnit = vStr.split(' | ')[0];
   const coords = tenantUnitCoordinates?.[vUnit];
   if (coords && coords.lat && coords.lng && incident.lat && incident.lng) {
       const dist = getDistanceFromLatLonInKm(parseFloat(incident.lat), parseFloat(incident.lng), parseFloat(coords.lat), parseFloat(coords.lng));
       // city speed 45 km/h -> 45km / 60min = 0.75 km/min -> dist / 0.75 = mins
       let mins = dist / 0.75;
       if (mins < 1) mins = 1;
       if (mins > 30) mins = 30;
       ms = Math.floor(mins * 60000);
   }
   return Date.now() + ms;
}

  const handleSetVehicleStatus = async (vStr, statusNum) => {
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
            text: `Zgłaszam lokalizację zagrożenia (sytuacja opanowana).`,
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

    
    // Bug Fixed: Allow any authenticated player in the game room to set status
    if (!user) {
      alert("Musisz być zalogowany, aby nadać status.");
      return;
    }

        if (statusNum === 2) {
      const expectedArrival = activeIncident.vehiclesExpectedArrival?.[vStr];
      if (expectedArrival && Date.now() < expectedArrival) {
        const remainingMs = expectedArrival - Date.now();
        const mins = Math.ceil(remainingMs / 60000);
        alert(`Zastęp ${vStr} jest jeszcze w drodze! Szacowany czas dojazdu to około ${mins} minut(y).`);
        return;
      }
    }

    const currentStatuses = activeIncident.vehicleStatuses || {};
    const currentStatus = currentStatuses[vStr] || 0;

    // Ograniczenie KSiS: Tylko komenda dowodząca może sterować statusami 2, 3, 4. Odbiorca może tylko nadać status 1 (Wyjazd) lub 0.
    // LOCKING: Prevent other users from trolling your incident
    if (activeIncident.ownerId && activeIncident.ownerId !== userProfile?.uid && userProfile?.role !== 'admin') {
      alert('🔒 To zdarzenie jest zablokowane, ponieważ zostało podjęte przez innego dyspozytora. Nie możesz zmieniać statusów pojazdów!');
      return;
    }
    
    if (statusNum > 1 && activeIncident.tenantId !== userProfile?.tenantId && userProfile?.role !== 'admin') {
      alert('Tylko komenda dowodząca (wysyłająca żądanie) może sterować tym statusem!');
      return;
    }

    // Ograniczenie KSiS: Odbiorca KSiS (wysyłający zastępy na żądanie) nie może sterować statusem jednostek już zadysponowanych (Status >= 1)
    if (currentStatus >= 1 && activeIncident.tenantId !== userProfile?.tenantId && userProfile?.role !== 'admin') {
      alert('Ta jednostka została już zadysponowana i przeszła pod dowództwo nadawcy KSiS!');
      return;
    }

    // Close the context menu immediately
    setActiveContextMenuVehicle(null);
    const nowTimeStr = new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });

    // OSP Delay Logic
    const isOSP = vStr.toLowerCase().includes('osp');
    if (statusNum === 1 && !isOSP && currentStatus !== 1) {
      sendDiscordNotification(vStr.split(' | ')[1] || vStr, 1, activeIncident);
    }
    
    if (statusNum === 4 && currentStatus !== 4) {
      sendDiscordNotification(vStr.split(' | ')[1] || vStr, 4, activeIncident);
    }

    if (statusNum === 1 && isOSP && currentStatus === 0) {
      const updatedStatuses = { ...currentStatuses, [vStr]: 0.5 };
      const updatedStatusTimes = { ...activeIncident.vehicleStatusTimes, [vStr]: new Date().toISOString() };
      
      await updateDoc(doc(db, 'incidents', activeIncident.id), {
        vehicleStatuses: updatedStatuses,
        vehicleStatusTimes: updatedStatusTimes,
        kdrRequestPending: false, // Reset KDR request state
        updatedAt: serverTimestamp()
      });
      
      logAction(`Zastęp OSP ${vStr}: rozpoczęto ALARMOWANIE (oczekiwanie na wyjazd)`);
      import('firebase/firestore').then(({ addDoc, collection }) => {
        addDoc(collection(db, 'radio_messages'), {
          text: `[SYSTEM] Rozpoczęto alarmowanie zastępu ${vStr.split(' | ')[1] || vStr}. Czas do wyjazdu ok. 30-90s.`,
          senderName: 'Dyspozytornia',
          senderTenant: activeIncident.tenantId,
          createdAt: new Date().toISOString()
        }).catch(console.error);
      });
      
      const delayMs = Math.floor(Math.random() * (90000 - 30000 + 1) + 30000);
      
      setTimeout(async () => {
         const { getDoc, doc, updateDoc, serverTimestamp, addDoc, collection } = await import('firebase/firestore');
         const incSnap = await getDoc(doc(db, 'incidents', activeIncident.id));
         if (incSnap.exists()) {
           const freshInc = incSnap.data();
           const freshStatuses = freshInc.vehicleStatuses || {};
           if (freshStatuses[vStr] === 0.5) {
             const nowStr = new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
             const finalStatuses = { ...freshStatuses, [vStr]: 1 };
             const currentTimes = freshInc.times || {};
             const freshExpected = freshInc.vehiclesExpectedArrival || {};
             const finalExpected = { ...freshExpected, [vStr]: calculateETA(vStr, freshInc, tenantUnitCoordinates) };
             const finalTimes = { ...currentTimes };
             if (!finalTimes.departure) finalTimes.departure = nowStr;
             const freshStatusTimes = { ...freshInc.vehicleStatusTimes, [vStr]: new Date().toISOString() };
             
             const newLog = {
               time: nowStr + ':' + new Date().getSeconds().toString().padStart(2, '0'),
               from: vStr.split(' | ')[1] || vStr,
               to: "Dyspozytornia",
               text: `Zgłaszam status radiowy: WYJAZD (ST 1)`,
               channel: "K01 - Kanał Powiatowy",
               createdAt: new Date().toISOString()
             };
             
             await updateDoc(doc(db, 'incidents', activeIncident.id), {
               vehicleStatuses: finalStatuses,
               vehicleStatusTimes: freshStatusTimes,
               times: finalTimes,
               radioLogs: [...(freshInc.radioLogs || []), newLog],
               updatedAt: serverTimestamp()
             });
             
             sendDiscordNotification(vStr.split(' | ')[1] || vStr, 1, freshInc);
             
             addDoc(collection(db, 'radio_messages'), {
                text: `[AUTOMAT] Zastęp ${vStr.split(' | ')[1] || vStr} zgłasza WYJAZD (ST 1) do zdarzenia.`,
                senderName: vStr.split(' | ')[1] || vStr,
                senderTenant: activeIncident.tenantId,
                createdAt: new Date().toISOString()
             }).catch(console.error);
           }
         }
      }, delayMs);
      return;
    }

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
    const updatedTimes = { ...currentTimes };

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
      const dbStatusLabels = {
        1: "WYJAZD (ST 1)",
        2: "NA MIEJSCU (ST 2)",
        3: "ZAKOŃCZENIE DZIAŁAŃ/POWRÓT (ST 3)",
        4: "W KOSZARACH (ST 4)"
      };
      
      const newRadioLog = {
        time: nowTimeStr + ':' + new Date().getSeconds().toString().padStart(2, '0'),
        from: vStr.split(' | ')[1] || vStr,
        to: "Dyspozytornia",
        text: `Zgłaszam status radiowy: ${dbStatusLabels[statusNum] || statusNum}`,
        channel: "K01 - Kanał Powiatowy",
        createdAt: new Date().toISOString()
      };
      const updatedLogs = [...(activeIncident.radioLogs || []), newRadioLog];

      const payload = {
        vehicleStatuses: updatedStatuses,
        vehicleStatusTimes: updatedStatusTimes,
        times: updatedTimes,
        radioLogs: updatedLogs,
        updatedAt: serverTimestamp()
      };

      // Reset KDR pending when dispatcher interacts (except when just assigning ST4)
      if (statusNum === 1 || statusNum === 2 || statusNum === 3) {
         payload.kdrRequestPending = false;
      }

      await updateDoc(doc(db, 'incidents', activeIncident.id), payload);
      
      logIncidentHistory(activeIncident.id, `Zastęp ${vStr.split(' | ')[1] || vStr} zmienił stan radiowy na: ${dbStatusLabels[statusNum] || statusNum}`);
      logAction(`Zastęp ${vStr.split(' | ')[1] || vStr}: status radiowy -> STATUS ${statusNum} (${dbStatusLabels[statusNum] || statusNum})`);
      
      // Dodaj wiadomość do globalnego Radia (Dziennika)
      if (statusNum >= 1 && statusNum <= 4) {
        import('firebase/firestore').then(({ addDoc, collection }) => {
          addDoc(collection(db, 'radio_messages'), {
            text: `[AUTOMAT] Zastęp ${vStr.split(' | ')[1] || vStr} zgłasza ${dbStatusLabels[statusNum]} do zdarzenia.`,
            senderName: vStr.split(' | ')[1] || vStr,
            senderTenant: activeIncident.tenantId,
            createdAt: new Date().toISOString()
          }).catch(console.error);
        });
      }
      
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
    const inc = incidents.find(i => i.id === incidentId);
    if (!inc) return;
    
    // Walidacja: Czy wozy wróciły do bazy?
    const vehicles = inc.vehicles || [];
    const statuses = inc.vehicleStatuses || {};
    let allAtBase = true;
    for (let v of vehicles) {
      if (statuses[v] !== 4) {
        allAtBase = false;
        break;
      }
    }
    
    if (vehicles.length > 0 && !allAtBase) {
      alert("Nie można zakończyć zdarzenia! Wszystkie zadysponowane zastępy muszą powrócić do koszar (Status 4).");
      return;
    }
    
    if (inc.kdrRequestPending) {
      alert("Nie można zakończyć zdarzenia! KDR poprosił o więcej sił i środków. Najpierw zadysponuj dodatkowe jednostki, aby opanować sytuację.");
      return;
    }

    if (window.confirm("Zakończyć to zdarzenie? Zniknie z listy aktywnych interwencji.")) {
      try {
        await updateDoc(doc(db, 'incidents', incidentId), {
          status: 'processed',
          isArchived: true,
          updatedAt: serverTimestamp()
        });

        // Grant XP to the user using setDoc with merge to prevent "not found" errors
        if (user) {
          await setDoc(doc(db, 'users', user.uid), {
            xp: increment(10),
            completedIncidents: increment(1)
          }, { merge: true });
        }
        
        // AWARD POINTS IF IN GAME MODE
        if (isGameModeActive) {
          setGameScore(prev => {
            const updated = prev + 100;
            localStorage.setItem('swd_game_score', updated.toString());
            return updated;
          });
          alert(`🏆 Zdarzenie ratownicze zakończone!\n\nZDOBYWASZ +100 PUNKTÓW!`);
        }

        logAction(`Zakończono zdarzenie ${inc.formattedId || incidentId}. Sytuacja opanowana. Przyznano 10 XP.`);
        setActiveIncident(null);
      } catch(e) {
        console.error("Błąd zamykania zdarzenia:", e);
        alert("Błąd zamykania zdarzenia: " + e.message);
      }
    }
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
    let sourceIncidents = viewMode === 'zaprzyjaznione' ? friendlyIncidents : incidents;

    // Add shared incidents to the main list if not in friendly mode
    if (viewMode !== 'zaprzyjaznione' && userProfile?.tenantId) {
      const sharedIncidents = friendlyIncidents.filter(inc => inc.sharedWith && inc.sharedWith.includes(userProfile.tenantId));
      sourceIncidents = [...sourceIncidents, ...sharedIncidents];
    }

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
    setSelectedWcprCallForModal(call);
    setIsWcprCallModalOpen(true);
  };

  const proceedWithCallAccept = async (call) => {
    try {
      if (call.isKsis && call.incidentId) {
        // Handle KSiS request acceptance
        const incidentRef = doc(db, 'incidents', call.incidentId);
        await updateDoc(incidentRef, {
          sharedWith: arrayUnion(userProfile.tenantId)
        });
        
        const timestamp = new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
        logAction(`Odebrano i zaakceptowano KSiS dla zdarzenia ${call.incidentId}`);
        await deleteDoc(doc(db, 'ksis_requests', call.id));
        
        setIsWcprCallModalOpen(false);
        setSelectedWcprCallForModal(null);
        setActiveCallToAnswer(null);
        return;
      }

      const currentYear = new Date().getFullYear();
      const sequenceNumber = String(incidents.length + 4801).padStart(4, '0');
      
      let targetJrg = "JRG 1";
      const norm = (call.location || '').toLowerCase();
      if (norm.includes("szopienic") || norm.includes("dąbrówk") || norm.includes("dabrowk") || norm.includes("janów") || norm.includes("janow") || norm.includes("giszowiec") || norm.includes("nikiszowiec") || norm.includes("szopienick")) {
        targetJrg = "JRG 1";
      } else if (norm.includes("piotrowic") || norm.includes("kostuchn") || norm.includes("podles") || norm.includes("zarzecz") || norm.includes("ligot") || norm.includes("panewnik") || norm.includes("piotrowick")) {
        targetJrg = "JRG 2";
      } else if (norm.includes("centrum") || norm.includes("bogucic") || norm.includes("zawodzi") || norm.includes("koszutk") || norm.includes("wełnowiec") || norm.includes("welnowiec") || norm.includes("korfant") || norm.includes("mariack") || norm.includes("dworco")) {
        targetJrg = "JRG 3";
      }
      
      const prefix = getJrgPrefix(targetJrg, userProfile?.tenantId || 'Katowice');
      const incidentFormat = userProfile?.settings?.incidentFormat || '{prefix}-{nr}';
      const customId = incidentFormat.replace('{prefix}', prefix).replace('{nr}', sequenceNumber).replace('{rok}', currentYear.toString());

      const isErrorOrFalseAlarm = call.type === 'bl' || call.type === 'af';
      const nowTimeStr = new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });

      const incidentData = {
        tenantId: userProfile?.tenantId || '',
        ospUnit: userProfile?.role === 'kdr_osp' ? userProfile.ospUnit : OSP_UNITS[0],
        kdrName: userProfile?.displayName || userProfile?.email || 'Dowódca',
        requiredUnits: call.requiredUnits || null,
        location: call.location || '',
        gminaStr: call.gminaStr || '',
        miejscowoscStr: call.miejscowoscStr || '',
        obiektStr: '',
        callerNameStr: call.callerName || '',
        callerPhoneStr: call.phone || '',
        callerAddressStr: '',
        notifiedServices: [],
        servicesList: '',
        coordX: '',
        coordY: '',
        type: call.type || 'mz',
        targetUnitDocelowa: '',
        actionType: '',
        eventDate: new Date().toISOString().split('T')[0],
        description: call.description || '',
        vehicles: [],
        vehicleStatuses: {},
        firefightersCount: 0,
        equipmentUsed: '',
        targetJrg, 
        prefix,
        isLongDuration: false,
        sopSteps: {},
        subtype: '',
        flags: [],
        times: {
          alarm: nowTimeStr,
          departure: '',
          arrival: '',
          localization: '',
          completion: isErrorOrFalseAlarm ? nowTimeStr : '',
          return: '',
          geocodingStatus: 'pending',
          reportWorkflowState: isErrorOrFalseAlarm ? '3' : '1',
          isPartialReport: !isErrorOrFalseAlarm,
          hasInjuries: false,
          injuriesDescription: ''
        },
        reportNumber: '',
        status: isErrorOrFalseAlarm ? 'processed' : 'submitted',
        isArchived: false,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        customId
      };

      const docRef = await addDoc(collection(db, 'incidents'), incidentData);
      logIncidentHistory(docRef.id, "Zdarzenie WCPR zostało automatycznie przyjęte do rejestru.");
      logAction(`Dodano zgłoszenie ${customId} z WCPR bezpośrednio do bieżącego bufora.`);
      
      await deleteDoc(doc(db, 'calls', call.id));
      
      setIsWcprCallModalOpen(false);
      setSelectedWcprCallForModal(null);
      setActiveCallToAnswer(null);
    } catch (err) {
      console.error(err);
      alert('Błąd automatycznego przyjęcia formatki: ' + err.message);
    }
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
  const renderTable4StatusIcon = (unitName, vehicleName, customState = null) => {
    const state = customState || getVehicleState(unitName, vehicleName);
    const vehObj = tenantVehicles?.[unitName]?.find(v => v.name === vehicleName) || {};
    const isKsrg = vehObj.ksrg;
    
    // Basic sphere style
    const sphere = (color, gradient, size) => (
      <span style={{
        display: 'inline-flex',
        width: size,
        height: size,
        borderRadius: '50%',
        background: `radial-gradient(circle at 30% 30%, ${color}, ${gradient})`,
        boxShadow: '1px 1px 2px rgba(0,0,0,0.4)',
        marginRight: '6px',
        flexShrink: 0
      }} />
    );

    const size = isKsrg ? '12px' : '8px';
    const greenSphere = () => sphere('#aaffaa', '#008800', size);
    const redSphere = () => sphere('#ffaaaa', '#cc0000', size);
    const yellowSphere = () => sphere('#ffffaa', '#bbbb00', size);

    if (state === "Wycofany") {
      // Small red X for permanently withdrawn or green sphere with red X.
      // We'll use the green sphere with red X as per Tab.4
      return (
        <span style={{ display: 'inline-flex', position: 'relative', marginRight: '6px', width: size, height: size }} title="Wycofany">
          {sphere('#aaffaa', '#008800', size)}
          <span style={{ position: 'absolute', top: '-3px', left: '-1px', color: '#cc0000', fontSize: '13px', fontWeight: 'bold', lineHeight: 1 }}>✖</span>
        </span>
      );
    }

    if (state === "Zadysponowany") {
      return <span title="Zadysponowany (ST 0)">{yellowSphere()}</span>;
    }

    if (state === "Wyjazd" || state === "Na miejscu" || state === "Powrót") {
      return <span title={`W akcji: ${state}`}>{redSphere()}</span>;
    }

    if (state === "Na zabezpieczeniu") {
      return (
        <span style={{
          display: 'inline-flex',
          width: '10px',
          height: '10px',
          background: 'linear-gradient(135deg, #aaffaa, #008800)',
          border: '1px solid #005500',
          boxShadow: '1px 1px 2px rgba(0,0,0,0.4)',
          marginRight: '6px',
          flexShrink: 0
        }} title="Przekazane tymczasowo / Zabezpieczenie" />
      );
    }

    return <span title="W koszarach (ST 4)">{greenSphere()}</span>;
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
            const coords = getCoordinatesForLocation(inc.location, tenantName);
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
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {combatTab === 'PSP' && (
            // PSP Mode: Show JRG columns (Rys.38 layout)
            <div className="combat-columns-container">
              {["KM/KP PSP", ...JRG_UNITS].map(uName => {
                let vehicles = UNIT_VEHICLES[uName] || [];

                // STAN GOTOWOSCI (PZR): If this is KM/KP PSP, inject all OSP standby vehicles!
                if (uName.includes('KM/KP')) {
                  Object.keys(UNIT_VEHICLES).forEach(ospUnit => {
                    if (!ospUnit.includes('JRG') && !ospUnit.includes('KM/KP')) {
                      const standbyVehs = (UNIT_VEHICLES[ospUnit] || []).filter(v => v.isStandby).map(v => ({...v, originalUnit: ospUnit}));
                      vehicles = [...vehicles, ...standbyVehs];
                    }
                  });
                } else if (!uName.includes('JRG') && !uName.includes('KM/KP')) {
                  // For normal OSP columns, filter out the ones that are on standby
                  vehicles = vehicles.filter(v => !v.isStandby);
                }
                
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
                    <div className="combat-column-title" style={{ background: 'var(--win-face)', borderBottom: '1px solid #d1d1d1', padding: '2px 4px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#000' }}>
                      <button style={{ width: '12px', height: '12px', padding: 0, margin: 0, fontSize: '9px', lineHeight: '9px', background: '#fff', border: '1px solid #888', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
                      <img src="https://img.icons8.com/color/48/000000/fire-station.png" style={{ width: 14, height: 14 }} alt="JRG" />
                      <span title={uName} style={{ flex: 1 }}>
                        {uName}
                      </span>
                      <span style={{ color: '#000', padding: '0 4px', fontFamily: 'var(--font-mono)' }}>
                        {activeCount}
                      </span>
                    </div>


                    {/* Unit address (usunięto adresy JRG zgodnie z dyspozycją) */}
                    <div style={{ fontSize: '7.5px', color: '#d1d1d1', padding: '1px 5px', borderBottom: '1px solid #f3f3f3' }}>
                      {uName.includes('KM PSP') ? 'ul. Bankowa 8' : ''}
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                      {vehicles.map(v => {
                        const actualUName = v.originalUnit || uName;
                        const isCrossedOut = getVehicleState(actualUName, v.name) === "Wycofany" || v.outOfService;
                        const currentState = getVehicleState(actualUName, v.name);

                        return (
                          <div 
                            key={v.name} 
                            className={`vehicle-row ${selectedCombatVehicle === `${actualUName} | ${v.name}` ? 'selected-combat' : ''}`}
                            style={{
                              ...(selectedCombatVehicle === `${actualUName} | ${v.name}` ? { background: '#0a246a', color: '#fff' } : {}),
                              ...(actualUName.includes('OSP') ? { borderRight: `4px solid ${currentState === 'W koszarach' ? '#2b8a3e' : '#c92a2a'}` } : {})
                            }}
                            title={`${v.name} (${actualUName})\nKryptonim: ${v.kryptonim || 'Brak'}\nStan: ${currentState}\nObsada min.: ${v.obsada} os.\nKliknij: ${selectedIncidentId && activeIncident ? 'Dopisz do zdarzenia' : 'Zmień status OOS'}`}
                            onClick={() => {
                              setSelectedCombatVehicle(`${actualUName} | ${v.name}`);
                              if (isNewIncidentModalOpen) {
                                const vStr = `${actualUName} | ${v.name}`;
                                handleVehicleCheckbox(vStr);
                              }
                            }}
                            onDoubleClick={() => {
                              setSelectedCombatVehicle(`${actualUName} | ${v.name}`);
                              if (selectedIncidentId && activeIncident && activeIncident.status !== 'processed') {
                                const vStr = `${actualUName} | ${v.name}`;
                                addVehicleToActiveIncident(vStr);
                              }
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setSelectedCombatVehicle(`${actualUName} | ${v.name}`);
                              const activeInc = incidents.find(inc => inc.status !== 'processed' && !inc.isArchived && inc.vehicles?.includes(`${actualUName} | ${v.name}`));
                              setVehicleContextMenu({

                                x: e.clientX,
                                y: e.clientY,
                                uName: actualUName,
                                vName: v.name,
                                isOos: v.outOfService,

                                isStandby: v.isStandby,

                                activeIncId: activeInc?.id
                              });
                            }}
                          >
                            <div className="vehicle-info">
                              {renderTable4StatusIcon(actualUName, v.name)}
                              <span className={`vehicle-name ${isCrossedOut ? 'crossed-out' : ''}`} style={{ fontSize: '10px', color: getVehicleState(actualUName, v.name) === 'Na zabezpieczeniu' ? '#888' : 'inherit' }}>
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
                            style={{ fontWeight: 'bold', color: '#000', background: '#e9ecef', border: '1px dashed #adb5bd' }}
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

          {combatTab === 'OSP' && (() => {
            const parseOsp = (u) => {
              if (u.includes('|')) {
                const parts = u.split('|');
                return { gmina: parts[0].trim(), name: parts[1].trim(), raw: u };
              }
              return { gmina: 'Inne', name: u, raw: u };
            };

            const ospGroups = {};
            OSP_UNITS.forEach(u => {
              const parsed = parseOsp(u);
              if (!ospGroups[parsed.gmina]) ospGroups[parsed.gmina] = [];
              ospGroups[parsed.gmina].push(parsed);
            });
            const gminas = Object.keys(ospGroups).sort();

            const displayedUnits = selectedOspSidebar === 'ALL' || !ospGroups[selectedOspSidebar] 
              ? OSP_UNITS 
              : ospGroups[selectedOspSidebar].map(o => o.raw);

            return (
            // OSP Mode - Gminas on left, ALL vehicles on right
            <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', height: '100%', background: 'var(--win-face)' }}>
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
                    backgroundColor: selectedOspSidebar === 'ALL' ? '#0a6ece' : 'transparent',
                    color: selectedOspSidebar === 'ALL' ? '#ffffff' : '#000000',
                    fontWeight: selectedOspSidebar === 'ALL' ? 'bold' : 'normal',
                    marginBottom: '2px'
                  }}
                >
                  [Wszystkie]
                </div>
                {gminas.map(gmina => (
                  <div 
                    key={gmina}
                    onClick={() => setSelectedOspSidebar(gmina)}
                    style={{ 
                      padding: '3px 6px', 
                      fontSize: '10.5px', 
                      cursor: 'pointer', 
                      backgroundColor: selectedOspSidebar === gmina ? '#0a6ece' : 'transparent',
                      color: selectedOspSidebar === gmina ? '#ffffff' : '#000000',
                      fontWeight: selectedOspSidebar === gmina ? 'bold' : 'normal',
                      marginBottom: '2px'
                    }}
                  >
                    Gmina {gmina}
                  </div>
                ))}
              </div>

              <div className="border-inset" style={{ background: '#ffffff', overflowY: 'auto', padding: '6px', margin: '4px 4px 4px 0' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {displayedUnits.map(osp => {
                    const vehicles = UNIT_VEHICLES[osp] || [];
                    const parsedOsp = parseOsp(osp);
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
                            background: isSelected ? '#005fb8' : ((state !== 'W koszarach' && state !== 'Wycofany') ? '#ffe3e3' : 'transparent'),
                            color: isSelected ? '#ffffff' : '#000000',
                            borderBottom: '1px solid #f3f3f3'
                          }}
                          onClick={() => {
                            setSelectedCombatVehicle(`${osp} | ${v.name}`);
                          }}
                          onDoubleClick={() => {
                            setSelectedCombatVehicle(`${osp} | ${v.name}`);
                            if (selectedIncidentId && activeIncident && activeIncident.status !== 'processed') {
                              addVehicleToActiveIncident(`${osp} | ${v.name}`);
                            }
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setSelectedCombatVehicle(`${osp} | ${v.name}`);
                            const activeInc = incidents.find(inc => inc.status !== 'processed' && !inc.isArchived && inc.vehicles?.includes(`${osp} | ${v.name}`));
                            setVehicleContextMenu({

                              x: e.clientX,
                              y: e.clientY,
                              uName: osp,
                              vName: v.name,
                              isOos: v.outOfService,

                              isStandby: v.isStandby,

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
                            {parsedOsp.name} - {v.kryptonim ? `${v.kryptonim} (${v.name})` : v.name}
                          </span>
                        </div>
                      );
                    });
                  })}
                </div>
              </div>
            </div>
            );
          })()}


          {combatTab === 'SPECIALIST' && (
            <div style={{ padding: '4px', overflowY: 'auto', height: '100%', background: '#ffffff' }}>
              {["KM/KP PSP", ...(tenantJrgUnits || [])].map(uName => {
                const sgrVehicles = (tenantVehicles?.[uName] || []).filter(v => !!v.sgr);
                if (sgrVehicles.length === 0) return null;
                return (
                  <div key={uName} style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 'bold', background: '#005fb8', color: '#fff', padding: '2px 4px', marginBottom: '2px' }}>
                      {uName} - Specjalistyczne Grupy Ratownicze
                    </div>
                    {sgrVehicles.map((v, i) => {
                      const actualUName = uName;
                      const isCrossedOut = getVehicleState(actualUName, v.name) === "Wycofany" || v.outOfService;
                      return (
                        <div 
                          key={i}
                          className="vehicle-row"
                          onClick={() => {
                            if (selectedIncidentId && activeIncident && activeIncident.status !== 'processed') {
                              if (!isCrossedOut && !v.isStandby) {
                                addVehicleToActiveIncident(`${actualUName} | ${v.name}`);
                              }
                            }
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setSelectedCombatVehicle(`${actualUName} | ${v.name}`);
                            const activeInc = incidents.find(inc => inc.status !== 'processed' && !inc.isArchived && inc.vehicles?.includes(`${actualUName} | ${v.name}`));
                            setVehicleContextMenu({
                              x: e.clientX,
                              y: e.clientY,
                              uName: actualUName,
                              vName: v.name,
                              isOos: v.outOfService,
                              isStandby: v.isStandby,
                              activeIncId: activeInc?.id
                            });
                          }}
                        >
                          <div className="vehicle-info">
                            {renderTable4StatusIcon(actualUName, v.name)}
                            <span className={`vehicle-name ${isCrossedOut ? 'crossed-out' : ''}`} style={{ fontSize: '10px', color: getVehicleState(actualUName, v.name) === 'Na zabezpieczeniu' ? '#888' : 'inherit' }}>
                              {v.name} [{v.sgr}]
                            </span>
                          </div>
                          <span className="vehicle-obsada">
                            {isCrossedOut ? '0' : v.obsada}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
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
                      <span style={{ fontSize: '8px', background: grp.type?.includes('Specjalistyczna') ? '#101113' : '#1864ab', color: 'white', padding: '1px 3px', borderRadius: '2px' }}>{grp.type || 'Grupa Operacyjna'}</span>
                    </div>
                    
                    <div style={{ paddingLeft: '8px', fontSize: '9.5px', color: '#333' }}>
                      {grp.vehicles.map(vStr => {
                        const base = vStr.split(' | ')[0]?.split(' ').pop() || '';
                        const name = vStr.split(' | ')[1] || vStr;
                        return (
                          <div key={vStr} style={{ display: 'flex', alignItems: 'center', gap: '4px', margin: '2px 0' }}>
                            {renderTable4StatusIcon(vStr.split(' | ')[0], vStr.split(' | ')[1])}
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
            <div style={{ padding: '4px', overflowY: 'auto', overflowX: 'auto', height: '100%', width: '100%', flex: 1, background: '#ffffff', color: '#000000', display: 'flex', gap: '4px' }}>
              <div style={{ flex: 1, border: '1px solid #d1d1d1', background: '#fff' }}>
                <table className="swd-table bufor-table" style={{ width: '100%', fontSize: '10px', tableLayout: 'auto' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '30px' }}>Ikona</th>
                      <th style={{ width: '150px' }}>Nr Zdarzenia</th>
                      <th style={{ width: '120px' }}>Data i godzina</th>
                      <th style={{ width: '120px' }}>Zgłaszający</th>
                      <th style={{ width: '120px' }}>Miejscowość</th>
                      <th style={{ width: '120px' }}>Ulica</th>
                      <th style={{ width: '120px' }}>Obiekt</th>
                      <th style={{ width: '80px' }}>KP/KM</th>
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
                          onDoubleClick={() => {
                            setSelectedWcprCall(call);
                            handleAnswerCall(call);
                          }}
                          style={{ 
                            background: selectedWcprCall?.id === call.id ? '#005fb8' : '#ffffff', 
                            color: selectedWcprCall?.id === call.id ? '#ffffff' : '#000000',
                            cursor: 'pointer' 
                          }}
                        >
                          <td style={{ textAlign: 'center' }}><img src="https://img.icons8.com/color/48/000000/c-key.png" style={{width: 14, height: 14}} alt="C" title="Zdarzenie z WCPR"/></td>
                          <td>SI WCPR ZD/{call.id.substring(0, 4).toUpperCase()}/{call.tenantId?.substring(0,3).toUpperCase() || 'KAT'}/{new Date().getFullYear()}</td>
                          <td>{new Date().toLocaleTimeString('pl-PL')}</td>
                          <td>WCPR {call.tenantId || 'WCPR'}</td>
                          <td>{call.miejscowoscStr || call.address?.split(',')[0]}</td>
                          <td>{call.location?.split('ul. ')[1] || call.location || 'Brak'}</td>
                          <td>{call.obiektStr || 'Brak'}</td>
                          <td>SI WCPR</td>
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
                  style={{ height: '60px', border: '2px solid red', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--win-face)' }}
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
                <div style={{ marginTop: 'auto', paddingTop: '10px' }}>
                  <button 
                    className="btn-win" 
                    onClick={() => window._triggerManualWCPR && window._triggerManualWCPR()}
                    style={{ height: '40px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#ffe3e3', border: '1px solid #fa5252', color: '#d13438' }}
                    title="Generuje natychmiastowo nowe zgłoszenie z WCPR"
                  >
                    <span style={{ fontSize: '16px' }}>📞</span>
                    <span style={{ fontSize: '8px', fontWeight: 'bold' }}>Wymuś WCPR</span>
                  </button>
                </div>
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

        <div className="classic-tabs">
          <button className={`classic-tab ${combatTab === 'PSP' ? 'active' : ''}`} onClick={() => setCombatTab('PSP')}><img src="https://img.icons8.com/color/48/000000/fire-station.png" style={{width: 12, height: 12}} alt="" /> PSP</button>
          <button className={`classic-tab ${combatTab === 'OSP' ? 'active' : ''}`} onClick={() => setCombatTab('OSP')}><img src="https://img.icons8.com/color/48/000000/fire-truck.png" style={{width: 12, height: 12}} alt="" /> OSP</button>
          <button className={`classic-tab ${combatTab === 'SPECIALIST' ? 'active' : ''}`} onClick={() => setCombatTab('SPECIALIST')}><img src="https://img.icons8.com/color/48/000000/worker-male.png" style={{width: 12, height: 12}} alt="" /> Specjaliści</button>
          <button className={`classic-tab ${combatTab === 'ODWODY' ? 'active' : ''}`} onClick={() => setCombatTab('ODWODY')}><img src="https://img.icons8.com/color/48/000000/map-pin.png" style={{width: 12, height: 12}} alt="" /> Odwody Operacyjne</button>
          <button className={`classic-tab ${combatTab === 'AGENTS' ? 'active' : ''}`} onClick={() => setCombatTab('AGENTS')}><img src="https://img.icons8.com/color/48/000000/police-badge.png" style={{width: 12, height: 12}} alt="" /> Inne</button>
          <button className={`classic-tab ${combatTab === 'WCPR' ? 'active' : ''}`} style={{ borderLeft: '1px solid #f3f3f3', marginLeft: '4px', color: incomingCalls.length > 0 ? '#d13438' : '#000000', fontWeight: incomingCalls.length > 0 ? 'bold' : 'normal' }} onClick={() => setCombatTab('WCPR')}>Bufor zdarzeń {incomingCalls.length > 0 ? `(${incomingCalls.length})` : ''}</button>
        </div>
        {/* Global overlay for INCIDENT context menu */}
        {incidentContextMenu && (
          <div 
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999 }}
            onClick={() => setIncidentContextMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setIncidentContextMenu(null); }}
          >
            <div 
              className="win-context-menu"
              style={{ top: incidentContextMenu.y, left: incidentContextMenu.x }}
              onClick={e => e.stopPropagation()}
            >
              <button onClick={() => {
                setSelectedIncidentId(incidentContextMenu.id);
                setIsNewIncidentModalOpen(true);
                setIncidentContextMenu(null);
              }}>📄 Otwórz Kartę Zdarzenia</button>
              <div className="separator"></div>
              {userProfile?.role === 'admin' && (
                <button onClick={() => {
                  deleteDoc(doc(db, 'incidents', incidentContextMenu.id));
                  setIncidentContextMenu(null);
                }}>❌ Usuń trwale (Admin)</button>
              )}
            </div>
          </div>
        )}
        {/* Global overlay for VEHICLE context menu */}
        {vehicleContextMenu && (
          <div 
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999 }}
            onClick={() => setVehicleContextMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setVehicleContextMenu(null); }}
          >
            <div 
              className="win-context-menu"
              style={{
                top: vehicleContextMenu.y,
                left: vehicleContextMenu.x
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
                  {(!vehicleContextMenu.uName.includes('JRG') && !vehicleContextMenu.uName.includes('KM/KP')) && (
                    <button className="menu-item" style={{ textAlign: 'left', fontSize: '11px', border: 'none', background: 'transparent', cursor: 'pointer' }} onClick={() => {
                      toggleVehicleStandby(vehicleContextMenu.uName, vehicleContextMenu.vName);
                      setVehicleContextMenu(null);
                    }}>
                      {vehicleContextMenu.isStandby ? '🟩 Anuluj gotowość bojową' : '🟨 Postaw w stan gotowości'}
                    </button>
                  )}
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

  const handleRestoreDefaultTenants = async () => {
    if (!window.confirm("Przywrócić 5 starych komend (Katowice, Będzin, Zabrze, Mysłowice)?")) return;
    try {
      const batch = writeBatch(db);
      const defaults = [
        { id: '120000', name: 'KW PSP Katowice', wojewodztwo: 'Śląskie', powiat: 'm. Katowice' },
        { id: '120100', name: 'KM PSP Katowice', wojewodztwo: 'Śląskie', powiat: 'm. Katowice' },
        { id: '120200', name: 'KP PSP Będzin', wojewodztwo: 'Śląskie', powiat: 'będziński' },
        { id: '120300', name: 'KM PSP Zabrze', wojewodztwo: 'Śląskie', powiat: 'm. Zabrze' },
        { id: '120400', name: 'KM PSP Mysłowice', wojewodztwo: 'Śląskie', powiat: 'm. Mysłowice' }
      ];
      defaults.forEach(t => {
        batch.set(doc(db, 'tenants', t.id), { ...t, createdAt: serverTimestamp() }, { merge: true });
      });
      await batch.commit();
      alert("Przywrócono!");
    } catch(e) {
      console.error(e);
      alert("Błąd: " + e.message);
    }
  };

  // Master Control Panel
  const renderAdminDashboard = () => {
    return (
      <div style={{ padding: '16px', overflowY: 'auto', height: '100%', backgroundColor: '#f0f0f0' }} className="border-inset fade-in">
        <h2 style={{ color: '#005fb8', borderBottom: '2px solid #ccc', paddingBottom: '8px', marginBottom: '16px' }}>Master Control Panel (Admin)</h2>
        
        <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
          <div style={{ flex: 1, backgroundColor: '#f0f5fa', border: '1px solid #b3d4ff', borderRadius: '4px', padding: '15px' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#005fb8' }}>Zdarzenia w Buforze</h3>
            <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{incidents.filter(i => i.status === 'pending').length}</div>
          </div>
          <div style={{ flex: 1, backgroundColor: '#f0f5fa', border: '1px solid #b3d4ff', borderRadius: '4px', padding: '15px' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#005fb8' }}>Zdarzenia Aktywne</h3>
            <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{incidents.filter(i => i.status === 'dispatched' || i.status === 'on_scene').length}</div>
          </div>
          <div style={{ flex: 1, backgroundColor: '#f0f5fa', border: '1px solid #b3d4ff', borderRadius: '4px', padding: '15px' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#005fb8' }}>Zdarzenia Zakończone</h3>
            <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{incidents.filter(i => i.status === 'processed').length}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
          <button className="btn-win" onClick={() => setIsSisEditorOpen(true)}>🔧 Otwórz Edytor SiS (Jednostki)</button>
          <button className="btn-win" onClick={() => setActiveMenuTab('game_master')}>⚡ Mistrz Gry (Kreator Zdarzeń)</button>
              <button className="btn-win" onClick={() => window._triggerManualWCPR && window._triggerManualWCPR()}>📞 Wymuś Zgłoszenie WCPR</button>
          <button className="btn-win" onClick={() => setActiveMenuTab('scenariusze')}>📚 Edytor Scenariuszy</button>
        </div>

        {activeMenuTab === 'game_master' && (
          <div style={{ border: '1px solid #999', padding: '15px', backgroundColor: '#e1e1e1', marginBottom: '20px' }}>
            <h3 style={{ marginTop: 0 }}>Mistrz Gry - Wymuś Zdarzenie</h3>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <select value={gmTenantId} onChange={e => setGmTenantId(e.target.value)} className="win-input">
                <option value="">-- Wybierz komendę (Tenant) --</option>
                {allTenants.map(t => <option key={t.id} value={t.id}>{t.name} [{t.id}]</option>)}
              </select>
              <select value={gmType} onChange={e => setGmType(e.target.value)} className="win-input">
                <option value="pozar">Pożar</option>
                <option value="mz">Miejscowe Zagrożenie</option>
                <option value="af">Alarm Fałszywy</option>
              </select>
              <select value={gmSgr} onChange={e => setGmSgr(e.target.value)} className="win-input">
                <option value="">-- Brak Wymogu SGR --</option>
                <option value="SGRW">SGRW (Wysokościowa)</option>
                <option value="SGRN">SGRN (Nurkowa)</option>
                <option value="SGRChem-Eko">SGRChem-Eko</option>
                <option value="SGPR">SGPR (Poszukiwawczo-Ratownicza)</option>
                <option value="SGRT">SGRT (Techniczna)</option>
              </select>
            </div>
            <input type="text" placeholder="Lokalizacja (np. Katowice, ul. Złota 2)" className="win-input" style={{ width: '100%', marginBottom: '10px' }} value={gmLocation} onChange={e => setGmLocation(e.target.value)} />
            <textarea placeholder="Opis zgłoszenia z formatki WCPR..." className="win-input" style={{ width: '100%', height: '60px', marginBottom: '10px' }} value={gmDescription} onChange={e => setGmDescription(e.target.value)} />
            <textarea placeholder="Meldunek KDR na miejscu..." className="win-input" style={{ width: '100%', height: '60px', marginBottom: '10px' }} value={gmKdrMsg} onChange={e => setGmKdrMsg(e.target.value)} />
            <button className="btn-win" style={{ fontWeight: 'bold', color: 'red' }} onClick={async () => {
              if (!gmTenantId || !gmLocation || !gmDescription) return alert('Wypełnij wymagane pola!');
              try {
                await addDoc(collection(db, 'calls'), {
                  tenantId: gmTenantId,
                  type: gmType,
                  category: gmType,
                  status: 'pending',
                  location: gmLocation,
                  address: gmLocation,
                  gminaStr: `Wymuszone przez Admina`,
                  miejscowoscStr: gmLocation.split(',')[0] || 'Miasto',
                  description: gmDescription,
                  callerName: 'GMD',
                  phone: '+48 000 000 000',
                  expectedKdrMsg: gmKdrMsg || 'Rozpoznanie: Zgodnie z formatką.',
                  requiredUnits: null,
                  needsZRM: false,
                  needsPolice: false,
                  requiredSgr: gmSgr || null,
                  createdAt: serverTimestamp(),
                  isRead: false
                });
                alert('Zdarzenie wymuszone pomyślnie!');
                setGmLocation(''); setGmDescription(''); setGmKdrMsg('');
              } catch (e) { alert('Błąd: ' + e.message); }
            }}>🚀 WYŚLIJ ZDARZENIE DO BUFORA</button>
          </div>
        )}

        {activeMenuTab === 'scenariusze' && (
          <div style={{ border: '1px solid #999', padding: '15px', backgroundColor: '#e1e1e1', marginBottom: '20px' }}>
            <h3 style={{ marginTop: 0 }}>{editingScenarioId ? 'Edytuj Scenariusz' : 'Kreator Scenariuszy (Baza Globalna)'}</h3>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <select value={newScenType} onChange={e => setNewScenType(e.target.value)} className="win-input">
                <option value="pozar">Pożar</option>
                <option value="mz">Miejscowe Zagrożenie</option>
                <option value="af">Alarm Fałszywy</option>
              </select>
              <select value={newScenLoc} onChange={e => setNewScenLoc(e.target.value)} className="win-input">
                <option value="building">Budynek (ul. X 12)</option>
                <option value="apartment">Mieszkanie (ul. X 12 m. 5)</option>
                <option value="intersection">Skrzyżowanie (ul. X z ul. Y)</option>
                <option value="road">Droga (odcinek ul. X)</option>
                <option value="forest">Las (Dojazd od ul. X)</option>
                <option value="industrial">Teren przemysłowy</option>
              </select>
            </div>
            <textarea placeholder="Treść formatki 112 (Co mówi świadek?)..." className="win-input" style={{ width: '100%', height: '60px', marginBottom: '10px' }} value={newScenT} onChange={e => setNewScenT(e.target.value)} />
            <textarea placeholder="Meldunek KDR po dojeździe..." className="win-input" style={{ width: '100%', height: '60px', marginBottom: '10px' }} value={newScenK} onChange={e => setNewScenK(e.target.value)} />
            <input type="text" placeholder='Wymagane zastępy (np. {"GCBA": 2, "SD": 1} lub zostaw puste)' className="win-input" style={{ width: '100%', marginBottom: '10px' }} value={newScenReqUnits} onChange={e => setNewScenReqUnits(e.target.value)} />
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-win" style={{ fontWeight: 'bold' }} onClick={async () => {
                if (!newScenT || !newScenK) return alert('Wypełnij treści!');
                let reqUnitsParsed = null;
                if (newScenReqUnits) {
                  try {
                    reqUnitsParsed = JSON.parse(newScenReqUnits);
                  } catch(e) {
                    return alert('Błąd formatu JSON wymaganych zastępów! Wpisz poprawny format: {"GCBA": 1}');
                  }
                }
                const { doc, updateDoc, addDoc, collection } = await import('firebase/firestore');
                try {
                  const data = {
                    type: newScenType,
                    locType: newScenLoc,
                    t: newScenT,
                    k: newScenK,
                    reportedType: newScenType === 'af' ? 'pozar' : newScenType,
                    requiredUnits: reqUnitsParsed
                  };
                  if (editingScenarioId) {
                    await updateDoc(doc(db, 'scenarios', editingScenarioId), data);
                    alert('Scenariusz zaktualizowany!');
                  } else {
                    await addDoc(collection(db, 'scenarios'), data);
                    alert('Scenariusz dodany pomyślnie!');
                  }
                  setNewScenT(''); setNewScenK(''); setNewScenReqUnits(''); setEditingScenarioId(null);
                } catch(e) { alert('Błąd: ' + e.message); }
              }}>💾 {editingScenarioId ? 'ZAPISZ ZMIANY' : 'ZAPISZ SCENARIUSZ DO BAZY'}</button>
              
              {editingScenarioId && (
                <button className="btn-win" onClick={() => {
                  setNewScenT(''); setNewScenK(''); setNewScenReqUnits(''); setEditingScenarioId(null);
                }}>❌ ANULUJ EDYCJĘ</button>
              )}
            </div>

            <div style={{ marginTop: '20px', maxHeight: '400px', overflowY: 'auto', border: '1px inset #fff', backgroundColor: '#fff', padding: '10px' }}>
              <strong>Zapisane w bazie ({dbScenarios.length}):</strong><br/>
              {dbScenarios.map(s => (
                <div key={s.id} style={{ borderBottom: '1px dashed #ccc', padding: '5px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1, paddingRight: '10px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '11px' }}>[{s.type.toUpperCase()}] {s.locType}</div>
                    <div style={{ fontSize: '10px' }}>T: {s.t.substring(0, 80)}...</div>
                    <div style={{ fontSize: '10px', color: '#555' }}>KDR: {s.k.substring(0, 50)}...</div>
                    {s.requiredUnits && <div style={{ fontSize: '10px', color: '#8b0000', fontWeight: 'bold' }}>Wymogi: {JSON.stringify(s.requiredUnits)}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button className="btn-win" style={{ padding: '2px 5px', fontSize: '10px' }} onClick={() => {
                      setEditingScenarioId(s.id);
                      setNewScenType(s.type);
                      setNewScenLoc(s.locType || 'building');
                      setNewScenT(s.t);
                      setNewScenK(s.k);
                      setNewScenReqUnits(s.requiredUnits ? JSON.stringify(s.requiredUnits) : '');
                    }}>✏️ Edytuj</button>
                    <button className="btn-win" style={{ padding: '2px 5px', fontSize: '10px', color: 'red' }} onClick={async () => {
                      if (window.confirm("Na pewno usunąć?")) {
                        const { doc, deleteDoc } = await import('firebase/firestore');
                        await deleteDoc(doc(db, 'scenarios', s.id));
                      }
                    }}>🗑️ Usuń</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          
          {/* BEZPIECZEŃSTWO I PIELĘGNACJA BAZY */}
          <div style={{ background: '#fff', border: '1px solid #ccc', padding: '12px', boxShadow: '2px 2px 5px rgba(0,0,0,0.1)' }}>
             <h3 style={{ fontSize: '14px', borderBottom: '1px solid #eee', paddingBottom: '4px' }}>🛡️ Pielęgnacja Bazy Danych</h3>
             <p style={{ fontSize: '11px', marginTop: '5px' }}>Narzędzia administratorskie do usuwania martwych dusz i starych zgłoszeń, zapobiegające zapychaniu bazy.</p>
             <button className="btn-win" style={{ padding: '6px 12px', color: 'red', fontWeight: 'bold', marginTop: '10px' }} onClick={async () => {
              if (window.confirm("Czy na pewno chcesz trwale usunąć wszystkie zdarzenia starsze niż 48 godzin? To zwolni miejsce w buforze Firebase!")) {
                 try {
                   const { collection, getDocs, deleteDoc, doc } = await import('firebase/firestore');
                   const snap = await getDocs(collection(db, 'incidents'));
                   let count = 0;
                   const now = Date.now();
                   snap.forEach(docSnap => {
                     const data = docSnap.data();
                     const cAt = data.createdAt ? (data.createdAt.toMillis ? data.createdAt.toMillis() : new Date(data.createdAt).getTime()) : 0;
                     if (cAt && (now - cAt > 48 * 60 * 60 * 1000)) {
                       deleteDoc(doc(db, 'incidents', docSnap.id));
                       count++;
                     }
                   });
                   alert(`Wyczyszczono ${count} przestarzałych zdarzeń z bazy.`);
                 } catch(e) {
                   alert("Błąd: " + e.message);
                 }
              }
            }}>🧹 Usuń zdarzenia starsze niż 48h (Purge)</button>
          </div>

          
          {/* GRACZE */}
          <div style={{ background: '#fff', border: '1px solid #ccc', padding: '12px', boxShadow: '2px 2px 5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '14px', borderBottom: '1px solid #eee', paddingBottom: '4px' }}>👥 Zarządzanie Użytkownikami</h3>
            <table className="swd-table" style={{ marginTop: '10px' }}>
              <thead>
                <tr>
                  <th>Gracz</th>
                  <th>Rola</th>
                  <th>Komenda</th>
                  <th>Stopień</th>
                  <th>Status</th>
                  <th>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {usersList.map(usr => {
                  const currentRank = getRankByXp(usr.xp || 0, usr.customRankId);
                  return (
                    <tr key={usr.id} className="swd-row" style={{ background: usr.isBanned ? '#ffdddd' : 'transparent', cursor: 'default' }}>
                      <td style={{ fontWeight: 'bold' }}>{usr.displayName}</td>
                      <td>
                        <select
                          value={usr.role}
                          onChange={(e) => handleAdminUpdateUser(usr.uid, { role: e.target.value })}
                          disabled={usr.uid === user?.uid}
                          style={{ fontSize: '10px' }}
                        >
                          <option value="admin">Admin</option>
                          <option value="kdr_osp">KDR OSP</option>
                          <option value="dyspozytor">Dyspozytor</option>
                        </select>
                      </td>
                      <td>
                        <select
                          value={usr.tenantId || ''}
                          onChange={(e) => handleAdminUpdateUser(usr.uid, { tenantId: e.target.value })}
                          style={{ fontSize: '10px', maxWidth: '120px' }}
                        >
                          <option value="">(Brak)</option>
                          <option value="999999">System</option>
                          {allTenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </td>
                      <td>
                        <select
                          value={usr.customRankId || ''}
                          onChange={(e) => handleAdminUpdateUser(usr.uid, { customRankId: e.target.value })}
                          style={{ fontSize: '10px' }}
                        >
                          <option value="">(Auto: {getRankByXp(usr.xp || 0).short})</option>
                          {PSP_RANKS.map(rank => <option key={rank.id} value={rank.id}>{rank.short}</option>)}
                        </select>
                      </td>
                      <td style={{ color: usr.isBanned ? 'red' : 'green', fontWeight: 'bold' }}>
                        {usr.isBanned ? 'ZBANOWANY' : 'AKTYWNY'}
                      </td>
                      <td style={{ display: 'flex', gap: '4px' }}>
                        <button className="btn-win" style={{ fontSize: '9px', padding: '2px 4px' }} onClick={() => {
                          handleAdminUpdateUser(usr.uid, { isBanned: !usr.isBanned });
                        }}>
                          {usr.isBanned ? 'Odbanuj' : 'Zbanuj'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* KOMENDY I SERWER */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div style={{ background: '#fff', border: '1px solid #ccc', padding: '12px', boxShadow: '2px 2px 5px rgba(0,0,0,0.1)' }}>
              <h3 style={{ fontSize: '14px', borderBottom: '1px solid #eee', paddingBottom: '4px' }}>🏢 Zarządzanie Komendami (Tenants)</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <input type="text" id="newTenantName" placeholder="Nazwa Komendy" style={{ flex: 1, fontSize: '11px', padding: '4px' }} />
                  <input type="text" id="newTenantWoj" placeholder="Województwo" style={{ width: '100px', fontSize: '11px', padding: '4px' }} />
                  <button className="btn-win" onClick={async () => {
                    const name = document.getElementById('newTenantName').value;
                    const woj = document.getElementById('newTenantWoj').value;
                    if(!name) return;
                    const id = Date.now().toString();
                    await setDoc(doc(db, 'tenants', id), { name, wojewodztwo: woj, jrgUnits: [], ospUnits: [], vehicles: {}, createdAt: serverTimestamp() });
                    document.getElementById('newTenantName').value = '';
                    document.getElementById('newTenantWoj').value = '';
                  }}>➕ Utwórz</button>
                </div>

                <table className="swd-table black-table">
                  <thead><tr><th>ID</th><th>Nazwa</th><th>Woj.</th><th>Akcje</th></tr></thead>
                  <tbody>
                    {allTenants.map(t => (
                      <tr key={t.id}>
                        <td>{t.id}</td>
                        <td>{t.name}</td>
                        <td>{t.wojewodztwo}</td>
                        <td>
                          <button className="btn-win" style={{ padding: '2px', fontSize: '10px', marginRight: '4px' }} onClick={async () => {
                            const newName = prompt('Nowa nazwa komendy:', t.name);
                            if(newName) { await setDoc(doc(db, 'tenants', t.id), { name: newName }, { merge: true }); }
                          }}>✏️</button>
                          <button className="btn-win" style={{ padding: '2px', fontSize: '10px' }} onClick={async () => {
                            if(window.confirm(`Trwale usunąć komendę ${t.name}?`)) {
                              const { deleteDoc } = await import('firebase/firestore');
                              await deleteDoc(doc(db, 'tenants', t.id));
                            }
                          }}>✖</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ background: '#fff', border: '1px solid #ccc', padding: '12px', boxShadow: '2px 2px 5px rgba(0,0,0,0.1)' }}>
              <h3 style={{ fontSize: '14px', borderBottom: '1px solid #eee', paddingBottom: '4px' }}>🚨 Narzędzia Systemowe</h3>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button className="btn-win" style={{ color: '#d13438', fontWeight: 'bold' }} onClick={async () => {
                  if(window.confirm('UWAGA! To usunie wszystkie archiwalne zdarzenia (Status: processed / isArchived) ze wszystkich komend! Kontynuować?')) {
                    if(window.confirm('Na pewno? Operacja jest nieodwracalna.')) {
                      try {
                        const { writeBatch } = await import('firebase/firestore');
                        const batch = writeBatch(db);
                        incidents.filter(i => i.isArchived || i.status === 'processed').forEach(i => {
                          batch.delete(doc(db, 'incidents', i.id));
                        });
                        await batch.commit();
                        alert('Baza danych oczyszczona ze starych zdarzeń.');
                        logAction('Administrator wykonał PURGE starych zdarzeń.');
                      } catch(e) { alert('Błąd: ' + e.message); }
                    }
                  }
                }}>🗑️ Purge Archive</button>

                <button className="btn-win" style={{ color: '#005fb8', fontWeight: 'bold' }} onClick={async () => {
                  const msg = window.prompt("Wpisz globalny komunikat systemowy (Broadcast):");
                  if (msg) {
                    await addDoc(collection(db, 'messages'), {
                      tenantId: '999999', // system
                      sender: 'SYSTEM (Admin)',
                      senderRole: 'admin',
                      senderUnit: 'Wszystkie',
                      text: msg,
                      priority: 5,
                      createdAt: serverTimestamp()
                    });
                    alert('Wysłano!');
                  }
                }}>📢 System Broadcast</button>
              </div>
            </div>

          </div>
        </div>
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
          <div className="border-outset" style={{ padding: '10px', background: 'var(--win-face)', height: 'fit-content' }}>
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
        <div className="win-dialog border-outset" style={{ pointerEvents: 'all' }} style={{ width: '450px', margin: '20px auto' }}>
          <div className="win-dialog-header">
            <span>☎️ Aparat Zgłoszeniowy CPR (Symulator Pozoranta)</span>
          </div>
          <form onSubmit={handleSendSimulatedCall} className="win-dialog-body" style={{ background: 'var(--win-face)' }}>
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
    
    // OSP Grouping logic
    const parseOsp = (u) => {
      if (u.includes('|')) {
        const parts = u.split('|');
        return { gmina: parts[0].trim(), name: parts[1].trim(), raw: u };
      }
      return { gmina: 'Inne', name: u, raw: u };
    };

    const ospGroups = {};
    (tenantOspUnits || []).forEach(u => {
      const parsed = parseOsp(u);
      if (!ospGroups[parsed.gmina]) ospGroups[parsed.gmina] = [];
      ospGroups[parsed.gmina].push(parsed);
    });

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
      background: 'var(--win-face)',
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #005fb8', paddingBottom: '10px', marginBottom: '10px' }}>
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#005fb8', margin: 0 }}>
              📦 KATALOG SIŁ I ŚRODKÓW (SiS) — SWD-ST 2.5
            </h3>
            <p style={{ fontSize: '10px', color: '#555', marginTop: '3px', margin: '3px 0 0 0' }}>
              Ewidencja pojazdów, sprzętu specjalistycznego i środków gaśniczych wg. rozdz. 8.5 Podręcznika SWD-ST 2.5
            </p>
            <button className="btn-win" style={{ marginTop: '5px', fontWeight: 'bold', color: '#005fb8' }} onClick={() => setIsSisEditorOpen(true)}>🔧 Edytor SiS (Jednostki, Pojazdy i Współrzędne dojazdowe)</button>
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

        {/* Zakładki SWD */}
        <div style={{ display: 'flex', gap: '2px', marginBottom: '8px', borderBottom: '1px solid #ccc' }}>
          {['PSP', 'OSP', 'Specjaliści', 'Odwody Operacyjne', 'Inne', 'Bufor zdarzeń'].map(tab => (
            <button 
              key={tab}
              className={`btn-win ${ksisTab === tab ? 'active' : ''}`}
              style={{ padding: '4px 12px', fontSize: '11px', background: ksisTab === tab ? '#fff' : '#e0e0e0', border: '1px solid #999', borderBottom: ksisTab === tab ? '1px solid #fff' : '1px solid #999', marginBottom: '-1px', fontWeight: ksisTab === tab ? 'bold' : 'normal', color: ksisTab === tab ? '#000' : '#444' }}
              onClick={() => setKsisTab(tab)}
            >
              {tab === 'PSP' ? '🚒 ' : tab === 'OSP' ? '🏠 ' : ''}{tab}
            </button>
          ))}
        </div>


        {/* SWD ST 2.5 - Widok Drzewa i Szczegółów */}
        <div style={{ display: 'flex', gap: '4px', height: 'calc(100% - 70px)' }}>
          {/* Drzewo jednostek (LEWA KOLUMNA) */}
          <div style={{ width: '280px', display: 'flex', flexDirection: 'column', border: '1px solid var(--win-shadow)', borderRadius: '4px', background: '#fff' }}>
            <div style={{ padding: '2px 4px', background: '#005fb8', color: '#fff', fontSize: '11px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
              <span>Drzewo jednostek</span>
              <span>{ksisTab}</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '4px', fontSize: '11px' }}>
              <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>[-]</span> 🏢 {tenantName}
              </div>
              <div style={{ paddingLeft: '16px' }}>
                {ksisTab === 'PSP' && (
                  ["KM/KP PSP", ...(tenantJrgUnits || [])].map(u => (
                    <div 
                      key={u} 
                      style={{ cursor: 'pointer', padding: '2px 0', background: currentUnit === u ? '#0a6ece' : 'transparent', color: currentUnit === u ? '#fff' : '#000' }}
                      onClick={() => { setSisSelectedUnit(u); setSisEditingVehicle(null); setSisIsAddingVehicle(false); }}
                    >
                      └ 🚒 {u}
                      {currentUnit === u && (
                        <span style={{ float: 'right' }}>
                          <span style={{ color: '#0a6ece', cursor: 'pointer', paddingRight: '6px', fontWeight: 'bold' }} onClick={(e) => {
                            e.stopPropagation();
                            const newName = window.prompt("Nowa nazwa dla JRG:", u);
                            if (newName && newName !== u) {
                              renameUnit(u, newName, 'JRG');
                            }
                          }} title="Zmień nazwę jednostki">✏️</span>
                          <span style={{ color: '#ffaaaa', cursor: 'pointer', paddingRight: '4px' }} onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('Usunąć tę jednostkę JRG?')) updateTenantUnits(tenantJrgUnits.filter(x => x !== u), tenantOspUnits);
                          }} title="Skasuj jednostkę">✖</span>
                        </span>
                      )}
                    </div>
                  ))
                )}
                
                {ksisTab === 'OSP' && (
                  Object.keys(ospGroups).sort().map(gmina => (
                    <div key={gmina} style={{ marginBottom: '4px' }}>
                      <div 
                        style={{ cursor: 'pointer', fontWeight: 'bold', background: ksisOspGmina === gmina ? '#e0e0e0' : 'transparent', padding: '2px 0' }}
                        onClick={() => setKsisOspGmina(ksisOspGmina === gmina ? '' : gmina)}
                      >
                        {ksisOspGmina === gmina ? '[-]' : '[+]'} Gmina {gmina}
                      </div>
                      {ksisOspGmina === gmina && (
                        <div style={{ paddingLeft: '12px' }}>
                          {ospGroups[gmina].map(osp => (
                            <div 
                              key={osp.raw} 
                              style={{ cursor: 'pointer', padding: '2px 0', background: currentUnit === osp.raw ? '#0a6ece' : 'transparent', color: currentUnit === osp.raw ? '#fff' : '#000' }}
                              onClick={() => { setSisSelectedUnit(osp.raw); setSisEditingVehicle(null); setSisIsAddingVehicle(false); }}
                            >
                              └ 🏠 {osp.name}
                              {currentUnit === osp.raw && (
                                <span style={{ float: 'right' }}>
                                  <span style={{ color: '#0a6ece', cursor: 'pointer', paddingRight: '6px', fontWeight: 'bold' }} onClick={(e) => {
                                    e.stopPropagation();
                                    const newName = window.prompt("Nowa nazwa OSP (Format: Gmina|Nazwa):", osp.raw);
                                    if (newName && newName !== osp.raw) {
                                      renameUnit(osp.raw, newName, 'OSP');
                                    }
                                  }} title="Zmień nazwę jednostki">✏️</span>
                                  <span style={{ color: '#ffaaaa', cursor: 'pointer', paddingRight: '4px' }} onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm('Usunąć tę jednostkę OSP?')) updateTenantUnits(tenantJrgUnits, tenantOspUnits.filter(x => x !== osp.raw));
                                  }} title="Skasuj jednostkę">✖</span>
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
            {/* Dodawanie nowych jednostek */}
            <div style={{ padding: '4px', borderTop: '1px solid #ccc', background: 'var(--win-face)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {ksisTab === 'PSP' && (
                <div style={{ display: 'flex', gap: '2px' }}>
                  <input type="text" id="newJrgName" placeholder="Nazwa JRG (np. JRG 1)" style={{ flex: 1, fontSize: '10px', padding: '2px' }} />
                  <button style={{ fontSize: '10px', padding: '2px 4px' }} onClick={() => {
                    const val = document.getElementById('newJrgName').value;
                    if (val && !tenantJrgUnits.includes(val)) updateTenantUnits([...tenantJrgUnits, val], tenantOspUnits);
                    document.getElementById('newJrgName').value = '';
                  }}>Dopis</button>
                </div>
              )}
              {ksisTab === 'OSP' && (
                <div style={{ display: 'flex', gap: '2px' }}>
                  <input type="text" id="newOspName" placeholder="Format: Gmina|Nazwa OSP" style={{ flex: 1, fontSize: '10px', padding: '2px' }} title="Podaj nazwę gminy, znak pionowej kreski i nazwę OSP np. Siewierz|OSP Żelisławice" />
                  <button style={{ fontSize: '10px', padding: '2px 4px' }} onClick={() => {
                    const val = document.getElementById('newOspName').value;
                    if (val && !tenantOspUnits.includes(val)) updateTenantUnits(tenantJrgUnits, [...tenantOspUnits, val]);
                    document.getElementById('newOspName').value = '';
                  }}>Dopis</button>
                </div>
              )}
            </div>
          </div>

          {/* Siły i środki wybranej jednostki (PRAWA KOLUMNA) */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid var(--win-shadow)', borderRadius: '4px', background: 'var(--win-face)' }}>
            <div style={{ padding: '2px 4px', background: '#005fb8', color: '#fff', fontSize: '11px', fontWeight: 'bold' }}>
              Dane o jednostce — {parseOsp(currentUnit).name}
            </div>
            
            {/* Wewnętrzne zakładki */}
            <div style={{ display: 'flex', borderBottom: '1px solid #d1d1d1', background: 'var(--win-face)', padding: '4px 4px 0 4px', gap: '2px' }}>
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
                <div style={{ padding: '4px', background: 'var(--win-face)', borderBottom: '1px solid #d1d1d1', display: 'flex', gap: '4px' }}>
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
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {renderTable4StatusIcon(currentUnit, v.name)}
                                <span style={{ background: st.bg, color: st.color, padding: '2px 6px', borderRadius: '2px', fontWeight: 'bold', fontSize: '9px', border: `1px solid ${st.color}` }}>
                                  {st.label}
                                </span>
                              </div>
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
              <div style={{ padding: '10px', fontSize: '11px', background: 'var(--win-face)', flex: 1 }}>
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
              <div style={{ padding: '10px', fontSize: '11px', background: 'var(--win-face)', flex: 1 }}>
                <div style={{ fontWeight: 'bold', marginBottom: '10px', fontSize: '12px' }}>Obsada osobowa (System zmianowy 24/48)</div>
                <div style={{ padding: '10px', background: '#fff', border: '1px inset #d1d1d1', color: '#888' }}>
                  Tutaj dyspozytor SWD zarządza zmianami służbowymi (Zmiana 1, Zmiana 2, Zmiana 3) i przypisuje obsadę do poszczególnych wozów. Moduł w przygotowaniu.
                </div>
              </div>
            )}

            {sisActiveTab === 'kierownictwo' && (
              <div style={{ padding: '10px', fontSize: '11px', background: 'var(--win-face)', flex: 1 }}>
                <div style={{ fontWeight: 'bold', marginBottom: '10px', fontSize: '12px' }}>Kierownictwo jednostki</div>
                <div style={{ padding: '10px', background: '#fff', border: '1px inset #d1d1d1', color: '#888' }}>
                  Wykaz kadry dowódczej (Dowódca JRG, Zastępca Dowódcy, Naczelnik OSP, Prezes OSP). Moduł w przygotowaniu.
                </div>
              </div>
            )}

            {sisActiveTab === 'magazyn' && (
              <div style={{ padding: '10px', fontSize: '11px', background: 'var(--win-face)', flex: 1 }}>
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
          <thead style={{ background: 'var(--win-face)', color: '#000' }}>
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
            <div style={{ background: 'var(--win-face)', padding: '5px', fontWeight: 'bold', borderBottom: '1px solid #d1d1d1' }}>Stan Połączeń Węzła (KM/KP)</div>
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
            <div style={{ background: 'var(--win-face)', padding: '5px', fontWeight: 'bold', borderBottom: '1px solid #d1d1d1' }}>Statystyki Replikacji Danych (EWID/Rejestr)</div>
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
            <div style={{ background: 'var(--win-face)', padding: '5px', fontWeight: 'bold', borderBottom: '1px solid #d1d1d1' }}>Logi Agenta Transmisji (AT)</div>
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
            <div style={{ background: 'var(--win-face)', padding: '5px', fontWeight: 'bold', borderBottom: '1px solid #d1d1d1' }}>Bramka SMS / Terminale MDT (Statusy)</div>
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
          <thead style={{ background: 'var(--win-face)', color: '#000' }}>
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
            <div style={{ background: 'var(--win-face)', padding: '5px', fontWeight: 'bold', borderBottom: '1px solid #d1d1d1' }}>Grupy Zdarzeń</div>
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
        <div className="section-header" style={{ marginBottom: '0', background: '#005fb8', color: 'white', padding: '5px', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000 }}>
          <span style={{ fontWeight: 'bold' }}>SYSTEM WSPOMAGANIA DECYZJI - MODUŁ GEOGRAFICZNY (GIS)</span>
        </div>
        
        <div style={{ width: '100%', height: '100%', position: 'relative', paddingTop: '24px' }}>
          const mapCenter = getCityBaseCoords(tenantName || "Katowice");
<MapContainer key={tenantName} center={[mapCenter.lat, mapCenter.lng]} zoom={12} style={{ width: '100%', height: '100%' }}>
            <MapCenterUpdater selectedIncidentId={selectedIncidentId} incidents={incidents} getCoordinatesForLocation={getCoordinatesForLocation} />
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />
            {incidents.filter(inc => !inc.isArchived && inc.status !== 'processed').map(inc => {
              const coords = inc.coords || getCoordinatesForLocation(inc.location, inc.tenantId);
              const isSelected = selectedIncidentId === inc.id;
              const color = inc.type === 'pozar' ? '#ff4b4b' : inc.type === 'mz' ? '#ffcc00' : '#4dabf7';
              
              return (
                <CircleMarker 
                  key={inc.id}
                  center={[coords.lat, coords.lng]} 
                  pathOptions={{ color: color, fillColor: color, fillOpacity: 0.7 }}
                  radius={isSelected ? 12 : 8}
                  eventHandlers={{
                    click: () => setSelectedIncidentId(inc.id)
                  }}
                >
                  <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent={isSelected}>
                    <span>{inc.customId || inc.id.substring(0,4)}</span>
                  </Tooltip>
                  {isSelected && (
                    <Popup>
                      <strong>{inc.location}</strong><br/>
                      {inc.description}
                    </Popup>
                  )}
                </CircleMarker>
              );
            })}
          </MapContainer>
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
        
        <div className="border-outset" style={{ padding: '10px', background: 'var(--win-face)', marginBottom: '10px' }}>
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
          <thead style={{ background: 'var(--win-face)', color: '#000' }}>
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
            <div style={{ background: 'var(--win-face)', padding: '5px', fontWeight: 'bold', borderBottom: '1px solid #d1d1d1' }}>
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
            <div style={{ background: 'var(--win-face)', padding: '5px 10px', fontWeight: 'bold', borderBottom: '1px solid #d1d1d1' }}>
              Wiadomości do: {smsRecipient}
            </div>
            <div style={{ flex: 1, padding: '10px', overflowY: 'auto', background: 'var(--win-face)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
            <div style={{ padding: '10px', background: 'var(--win-face)', borderTop: '1px solid #d1d1d1', display: 'flex', gap: '5px' }}>
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
        <div className="border-inset" style={{ padding: '10px', background: 'var(--win-face)', marginBottom: '15px' }}>
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
        <div className="border-inset" style={{ padding: '10px', background: 'var(--win-face)', marginBottom: '15px' }}>
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
        <div className="border-inset" style={{ padding: '10px', background: 'var(--win-face)', marginBottom: '15px' }}>
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
            <div style={{ background: 'var(--win-face)', padding: '5px 10px', fontWeight: 'bold', borderBottom: '1px solid #d1d1d1' }}>
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

            <form onSubmit={handleSendMessage} style={{ display: 'flex', flexDirection: 'column', padding: '15px', gap: '10px', background: 'var(--win-face)', borderTop: '2px solid #d1d1d1' }}>
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

  if (isTerminalMode) {
    return (
      <MobileTerminal 
        userProfile={userProfile} 
        incidents={incidents} 
        onClose={() => setIsTerminalMode(false)}
        sendDiscordNotification={sendDiscordNotification}
      />
    );
  }

  if (!user) {
    return (
      <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'transparent' }}>
        <div className="win-dialog border-outset" style={{ width: '400px' }}>
          <div className="win-dialog-header">
            <span>Logowanie do SWD-ST 2.5 (Tryb sieciowy)</span>
          </div>
          <div className="win-dialog-body" style={{ background: 'var(--win-face)', padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#005fb8' }}>Województwo:</label>
                  <select value={selectedWojewodztwo} onChange={e => { setSelectedWojewodztwo(e.target.value); setSelectedPowiat(''); }} required className="input-field" style={{ width: '100%', padding: '3px' }}>
                    <option value="">-- Wybierz województwo --</option>
                    {Object.keys(polandData).map(woj => <option key={woj} value={woj}>{woj}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#005fb8' }}>Powiat:</label>
                  <select value={selectedPowiat} onChange={e => setSelectedPowiat(e.target.value)} required disabled={!selectedWojewodztwo} className="input-field" style={{ width: '100%', padding: '3px' }}>
                    <option value="">-- Wybierz powiat --</option>
                    {selectedWojewodztwo && polandData[selectedWojewodztwo].map(pow => <option key={pow} value={pow}>{pow}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#005fb8' }}>Nazwa Komendy (np. KM PSP Wrocław):</label>
                  <input type="text" value={customKomendaName} onChange={e => setCustomKomendaName(e.target.value)} required className="input-field" style={{ width: '100%', padding: '3px' }} placeholder="Wpisz nazwę własnej komendy" />
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
            <span>SWD ST — {tenantName} ({userProfile?.rankObj ? `[${userProfile.rankObj.short}] ` : ''}{userProfile?.displayName || userProfile?.email || '---'}) — [Rejestr wyjazdów]</span>
            <span style={{ marginLeft: '10px', fontSize: '9px', opacity: 0.6, fontWeight: 'normal' }}>v{APP_VERSION}</span>
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
            <div style={{ position: 'absolute', top: '100%', left: 0, background: 'var(--win-face)', padding: '2px', zIndex: 10000, display: 'flex', flexDirection: 'column', minWidth: '220px', boxShadow: '2px 2px 5px rgba(0,0,0,0.4)', border: '1.5px solid #d1d1d1' }}>
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
        <div className={`menu-item ${activeMenuTab === 'konta' || activeMenuTab === 'monitor' ? 'active' : ''}`} onClick={() => { if(userProfile?.role === 'admin') setActiveMenuTab('konta'); else setActiveMenuTab('monitor'); }}>Admin / Konta</div>
        <div className="menu-item">Okna</div>
        <div className="menu-item" onClick={openSettingsModal}>Ustawienia</div>
        <div 
          className="menu-item"
          onClick={() => setIsTerminalMode(true)}
          style={{ background: '#fbc02d', color: '#000', fontWeight: 'bold', marginLeft: 'auto' }}
        >
          📱 Terminal RP
        </div>
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
        <div className="menu-item" onClick={() => setShowHelpModal(true)}>Pomoc</div>

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
                Zdarzenia jednostek zaprzyjaźnionych
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
        {['konta', 'game_master', 'scenariusze'].includes(activeMenuTab) && userProfile && userProfile?.role === 'admin' ? (
          renderAdminDashboard()
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

              <div className="incident-table-container" style={{ flex: 1 }} onClick={() => setSelectedIncidentId(null)}>
                <table className="swd-table-dark">
                  <thead>
                    <tr>
                      <th style={{ width: '40px', textAlign: 'center' }}>STAN</th>
                      <th style={{ width: '120px' }}>ID zdarzenia</th>
                      <th style={{ width: '110px' }}>Data i godzina</th>
                      <th style={{ width: '120px' }}>Komenda</th>
                      <th style={{ width: '120px' }}>JRG Odbiorca</th>
                      <th>Miejsce zdarzenia</th>
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
                      const isLocalized = !!incident.times?.localized;
                      const isIncCompleted = !!incident.times?.completion || incident.status === 'processed' || incident.isArchived;
                      
                      switch (incident.type) {
                        case 'pozar':
                          if (isIncCompleted) stateLabel = "KP";
                          else if (isLocalized) stateLabel = "OP";
                          else stateLabel = "PP";
                          break;
                        case 'mz':
                          if (isIncCompleted) stateLabel = "KM";
                          else if (isLocalized) stateLabel = "OM";
                          else stateLabel = "PM";
                          break;
                        case 'af':
                          stateLabel = isIncCompleted ? "AF (Koniec)" : "AF (W toku)";
                          break;
                        case 'gosp':
                          stateLabel = isIncCompleted ? "KWG" : "WG";
                          break;
                        case 'pzr':
                          stateLabel = isIncCompleted ? "KZR" : "PZR";
                          break;
                        case 'zpr':
                          stateLabel = "ZPR";
                          break;
                        case 'bl':
                          stateLabel = "BL";
                          break;
                        default:
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
                      
                      let rowBg = '#000000';
                      let rowColor = '#00ff00';

                      if (isSelected) {
                        rowBg = '#ff0000';
                        rowColor = '#ffffff';
                      } else if (isCompleted) {
                        rowBg = '#222222';
                        rowColor = '#a0a0a0';
                      }

                      return (
                        <tr 
                          key={incident.id} 
                          className={`swd-row ${isSelected ? 'selected' : ''} ${incident.isArchived ? 'archived' : ''} ${incident.type === 'bl' ? 'error-bl' : ''}`}
                          style={{ 
                            backgroundColor: rowBg,
                            color: rowColor,
                            borderLeft: hasActiveVehicles && !isSelected ? '3px solid #d13438' : hasDispatchedVehicles && !isSelected ? '3px solid #f59f00' : ''
                          }}
                          onClick={(e) => { e.stopPropagation(); setSelectedIncidentId(incident.id); }}
                          onDoubleClick={() => {
                            setSelectedIncidentId(incident.id);
                            loadIncidentForEditing(incident);
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
                          <td>
                            {timeString}
                          </td>
                          <td>{incident.tenantId === "Bedzin" ? "KP PSP Będzin" : (incident.tenantId ? `KM PSP ${incident.tenantId}` : "KM PSP")}</td>
                          <td>{incident.targetJrg ? incident.targetJrg : (incident.location?.includes('Szopienice') || incident.location?.includes('Zawodzie') ? 'JRG 3' : (incident.location?.includes('Piotrowice') || incident.location?.includes('Ligota') ? 'JRG 2' : 'JRG 1'))}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                              <span>{incident.location}</span>
                              {incident.subtype && incident.subtype !== '' && (
                                <span style={{ fontSize: '7.5px', color: '#000', background: 'var(--win-face)', border: '1px solid #ced4da', padding: '0 3px', borderRadius: '2px', whiteSpace: 'nowrap' }}>
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
              <div style={{ display: 'flex', background: 'var(--win-face)', borderBottom: '1.5px solid #d1d1d1', userSelect: 'none' }}>
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
                    {activeIncident?.ownerId && activeIncident.ownerId !== userProfile?.uid && (
                      <div style={{ padding: '4px', background: '#ffe3e3', borderBottom: '1px solid #ff8787', fontSize: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>🔒 <b>Zdarzenie Zablokowane</b> (prowadzi: inny dyspozytor)</span>
                        <button className="btn-win" style={{ padding: '2px 5px', color: 'red', fontWeight: 'bold' }} onClick={async () => {
                           if(window.confirm('Czy na pewno chcesz siłowo przejąć to zdarzenie? Zrób to tylko, jeśli poprzedni dyspozytor jest AFK.')) {
                             const { updateDoc, doc } = await import('firebase/firestore');
                             await updateDoc(doc(db, 'incidents', activeIncident.id), { ownerId: userProfile.uid });
                             alert('Przejąłeś dowodzenie nad zdarzeniem.');
                           }
                        }}>Przejmij Zdarzenie</button>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '2px', padding: '2px 4px', background: 'var(--win-face)', borderBottom: '1px solid #d1d1d1' }}>
                      <button className="btn-win" style={{ padding: '2px 6px', fontSize: '10px' }} title="Wyjazd do akcji (ST 1)" onClick={() => { if(selectedSisVehicle) handleSetVehicleStatus(selectedSisVehicle, 1); else alert('Zaznacz zastęp na liście poniżej!'); }}>▶️</button>
                      <button className="btn-win" style={{ padding: '2px 6px', fontSize: '10px', opacity: (activeIncident?.tenantId !== userProfile?.tenantId && userProfile?.role !== 'admin') ? 0.5 : 1 }} title="Na miejscu (ST 2)" onClick={() => { if (activeIncident?.tenantId !== userProfile?.tenantId && userProfile?.role !== 'admin') { alert('Tylko komenda dowodząca (wysyłająca żądanie) może sterować tym statusem!'); return; } if(selectedSisVehicle) handleSetVehicleStatus(selectedSisVehicle, 2); else alert('Zaznacz zastęp na liście poniżej!'); }}>📍</button>
                      <button className="btn-win" style={{ padding: '2px 6px', fontSize: '10px', opacity: (activeIncident?.tenantId !== userProfile?.tenantId && userProfile?.role !== 'admin') ? 0.5 : 1 }} title="Powrót / Zakończenie (ST 3)" onClick={() => { if (activeIncident?.tenantId !== userProfile?.tenantId && userProfile?.role !== 'admin') { alert('Tylko komenda dowodząca (wysyłająca żądanie) może sterować tym statusem!'); return; } if(selectedSisVehicle) handleSetVehicleStatus(selectedSisVehicle, 3); else alert('Zaznacz zastęp na liście poniżej!'); }}>◀️</button>
                      <button className="btn-win" style={{ padding: '2px 6px', fontSize: '10px', opacity: (activeIncident?.tenantId !== userProfile?.tenantId && userProfile?.role !== 'admin') ? 0.5 : 1 }} title="W koszarach (ST 4)" onClick={() => { if (activeIncident?.tenantId !== userProfile?.tenantId && userProfile?.role !== 'admin') { alert('Tylko komenda dowodząca (wysyłająca żądanie) może sterować tym statusem!'); return; } if(selectedSisVehicle) handleSetVehicleStatus(selectedSisVehicle, 4); else alert('Zaznacz zastęp na liście poniżej!'); }}>🏠</button>
                      <button className="btn-win" style={{ padding: '2px 6px', fontSize: '10px' }} title="Drukuj" onClick={() => setPrintPreviewMode('karta_manipulacyjna')}>🖨️</button>
                      <button className="btn-win" style={{ padding: '2px 6px', fontSize: '10px', marginLeft: '5px', background: '#dbeafe', border: '1px solid #005fb8' }} title="Żądanie dysponowania KSiS" onClick={() => { setIsKsisSendModalOpen(true); setKsisSendFormData({ targetTenant: '', equipment: '', comment: '', incidentId: activeIncident?.id }); }}>Żądanie KSiS</button>
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
                            
                            let statusBg = i % 2 === 0 ? '#ffffff' : '#fafafa';
                            let statusColor = "#000000";
                            
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
                            
                            let customState = "Zadysponowany";
                            if (vStatus === 0.5) customState = "Alarmowanie";
                            else if (vStatus === 1) customState = "Wyjazd";
                            else if (vStatus === 2) customState = "Na miejscu";
                            else if (vStatus === 3) customState = "Powrót";
                            else if (vStatus === 4) customState = "W koszarach";
                            
                            const displayUnit = unit.includes('|') ? unit.split('|')[1].trim() : unit;

                            return (
                              <tr 
                                key={i} 
                                className={`swd-row ${isSelected ? 'selected' : ''}`}
                                style={{ background: statusBg, cursor: 'default' }}
                                onClick={(e) => { e.stopPropagation(); setSelectedSisVehicle(vStr); }}
                                onContextMenu={(e) => { setSelectedSisVehicle(vStr); openVehicleContextMenu(e, vStr); }}
                              >
                                <td style={{ textAlign: 'center', padding: '1px 2px', fontSize: '10px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                                    {renderTable4StatusIcon(unit, vName, customState)}
                                  </div>
                                </td>
                                <td style={{ padding: '1px 4px', fontSize: '9.5px', color: statusColor, fontWeight: 'bold' }}>{vName}</td>
                                <td style={{ padding: '1px 4px', fontSize: '9.5px', color: statusColor }}>{kryptonim}</td>
                                <td style={{ padding: '1px 4px', fontSize: '9.5px', color: statusColor }}>{displayUnit}</td>
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
                    background: 'var(--win-face)', 
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
                <div className="border-inset" style={{ padding: '6px', background: 'var(--win-face)', borderRadius: '4px', margin: '4px' }}>
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

                <form onSubmit={handleSendMessage} style={{ display: 'flex', flexDirection: 'column', padding: '4px', gap: '3px', background: 'var(--win-face)', borderTop: '1px solid var(--win-shadow)' }}>
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

        

<footer className="bottom-console border-outset" style={{ display: 'flex', gap: '8px', padding: '4px', height: '120px', background: 'var(--win-face)' }}>
  {/* Left: Transmisja */}
  <div className="transmission-panel border-inset" style={{ flex: '0 0 250px', display: 'flex', flexDirection: 'column', background: '#e1e1e1' }}>
    <div style={{ padding: '2px 6px', background: '#b0b0b0', fontWeight: 'bold', fontSize: '10px' }}>Transmisja</div>
    <div style={{ flex: 1, padding: '4px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <div style={{ width: '8px', height: '8px', background: true ? '#00cc00' : '#cc0000', border: '1px solid #000' }}></div>
        <span>Stan SIWCPR: {true ? 'OK' : 'BŁĄD'}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <div style={{ width: '8px', height: '8px', background: '#cc0000', border: '1px solid #000' }}></div>
        <span>Błędy (0)</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <div style={{ width: '8px', height: '8px', background: '#ffcc00', border: '1px solid #000' }}></div>
        <span>Aktualizacje zdarzeń</span>
      </div>
      <input type="text" value="Rejestr wyjazdów" readOnly style={{ marginTop: 'auto', background: '#fff', border: '1px inset #a0a0a0', padding: '2px', fontSize: '10px' }} />
    </div>
  </div>

  {/* Middle-Left: Clock */}
  <div className="border-inset" style={{ flex: '0 0 150px', display: 'flex', flexDirection: 'column', background: 'var(--win-face)', border: '1px solid #a0a0a0' }}>
    <div style={{ padding: '2px 6px', background: '#b0b0b0', fontWeight: 'bold', fontSize: '10px', textAlign: 'center' }}>
      {systemTime.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}
    </div>
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontFamily: 'var(--font-mono)', letterSpacing: '1px', background: '#e8e8e8', border: '1px inset #a0a0a0', margin: '2px' }}>
      {systemTime.toLocaleTimeString('pl-PL')}
    </div>
  </div>

  {/* Middle-Right: Terminale statusów (Dziennik Radiowy) */}
  <div className="border-inset" style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#ffffff', minWidth: '300px' }}>
    <div style={{ padding: '2px 6px', background: '#b0b0b0', fontWeight: 'bold', fontSize: '10px' }}>Terminale statusów</div>
    <div style={{ flex: 1, overflowY: 'auto', padding: '2px 4px', fontSize: '10px', display: 'flex', flexDirection: 'column-reverse', background: '#e8e8e8' }}>
      {(activeIncident?.radioLogs || []).slice().reverse().map((msg, idx) => (
        <div key={idx} style={{ color: '#555', borderBottom: '1px solid #ddd', paddingBottom: '2px' }}>
          {msg.time || (msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString('pl-PL') : '')} <strong>{msg.from || msg.senderName}</strong>: {msg.text}
        </div>
      ))}
    </div>
  </div>
</footer>

{/* --- OLD DZIENNIK RADIOWY REMOVED --- */}
{/* --- DZIENNIK RADIOWY WIDGET --- */}
        <div style={{ position: 'fixed', bottom: '26px', right: '5px', width: '320px', zIndex: 9999, display: 'flex', flexDirection: 'column', pointerEvents: 'none' }}>
          <div style={{ pointerEvents: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#e0e0e0', border: '1px solid #a0a0a0', padding: '2px 5px', cursor: 'pointer', borderTopLeftRadius: '3px', borderTopRightRadius: '3px' }} onClick={() => setIsRadioLogOpen(!isRadioLogOpen)}>
            <strong style={{ fontSize: '10px' }}>📻 Dziennik Radiowy (KRG/KSW)</strong>
            <button style={{ border: 'none', background: 'none', fontSize: '10px', fontWeight: 'bold' }}>{isRadioLogOpen ? '▼' : '▲'}</button>
          </div>
          
          {isRadioLogOpen && (
            <div style={{ pointerEvents: 'auto', height: '200px', background: '#fff', border: '1px solid #a0a0a0', borderTop: 'none', display: 'flex', flexDirection: 'column' }}>
              {activeIncident ? (
                <>
                  <div style={{ flex: 1, overflowY: 'auto', padding: '4px', fontSize: '10px', display: 'flex', flexDirection: 'column-reverse', gap: '4px' }}>
                    {(activeIncident.radioLogs || []).slice().reverse().map((msg, idx) => (
                      <div key={msg.id || idx} style={{ background: msg.senderTenant === userProfile?.tenantId ? '#e3f2fd' : (msg.from !== 'Dyspozytor' && msg.from !== (userProfile?.displayName || userProfile?.email) ? '#f5f5f5' : '#e3f2fd'), padding: '4px', borderRadius: '3px', border: '1px solid #ddd' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', color: '#555', fontSize: '9px' }}>
                          <strong>{msg.from || msg.senderName}</strong>
                          <span>{msg.time || (msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString('pl-PL') : '')}</span>
                        </div>
                        <div style={{ color: '#000' }}>{msg.text}</div>
                      </div>
                    ))}
                    {(!activeIncident.radioLogs || activeIncident.radioLogs.length === 0) && (
                      <div style={{ color: '#888', textAlign: 'center', marginTop: '10px' }}>Brak korespondencji dla tego zdarzenia.</div>
                    )}
                  </div>
                  <div style={{ borderTop: '1px solid #ccc', padding: '2px', display: 'flex' }}>
                    <input 
                      type="text" 
                      value={radioInputText}
                      onChange={e => setRadioInputText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && radioInputText.trim() && selectedIncidentId) {
                          import('firebase/firestore').then(({ updateDoc, doc }) => {
                            const newLog = {
                              id: Date.now().toString(),
                              time: new Date().toLocaleTimeString('pl-PL'),
                              from: userProfile?.displayName || userProfile?.email || 'Dyspozytor',
                              to: 'Wszyscy',
                              text: radioInputText.trim(),
                              channel: 'K01',
                              createdAt: new Date().toISOString(),
                              senderTenant: userProfile?.tenantId
                            };
                            updateDoc(doc(db, 'calls', selectedIncidentId), {
                              radioLogs: [...(activeIncident.radioLogs || []), newLog]
                            });
                            setRadioInputText('');
                          });
                        }
                      }}
                      className="win-input" 
                      style={{ flex: 1, fontSize: '10px', padding: '3px' }} 
                      placeholder="Napisz do dziennika radiowego..." 
                    />
                  </div>
                </>
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', color: '#888', textAlign: 'center', fontSize: '10px' }}>
                  Wybierz zdarzenie z listy, aby otworzyć jego dziennik radiowy.
                </div>
              )}
            </div>
          )}
        </div>

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

      {showHelpModal && (
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
                <li><strong style={{color:'#005fb8'}}>Generator AI (Gemini):</strong> Zdarzenia mogą być wymyślane przez Sztuczną Inteligencję! W tym celu wejdź w Ustawienia &gt; Wklej klucz API. Jak go zdobyć? Wejdź na <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{color: 'blue', textDecoration: 'underline'}}>Google AI Studio</a>, zaloguj się kontem Google, kliknij "Create API key" i wklej go do gry. Klucz jest zapisywany w 100% bezpiecznie TYLKO na Twoim dysku (localStorage).</li>
              </ul>

              <h4 style={{ marginTop: '20px', color: '#005fb8' }}>Changelog (Ostatnie Zmiany):</h4>
              <div style={{ background: '#f5f5f5', padding: '10px', border: '1px solid #d1d1d1' }}>
                <p><strong>v0.2.0 beta (Nowy wygląd Tablicy SiS i zabezpieczenie klucza AI)</strong></p><ul><li>Upodobnienie Tablicy SiS (kolumn jednostek) bezpośrednio do rzutu z oryginalnego SWD-ST (kwadratowe ikony, układ tekstu, zmniejszone marginesy).</li><li>Przeniesienie zapisu klucza Gemini API do bezpiecznego localStorage, omijając bazę danych w chmurze.</li></ul><p style={{ marginTop: "10px" }}><strong>v0.1.1 beta (Aktualizacja zabezpieczeń i dynamicznych komend)</strong></p>
                <ul style={{ paddingLeft: '20px' }}>
                  <li>Zabezpieczenia kont: Auto-wylogowanie po 30 min bezczynności, weryfikacja emaili, zwalczanie brute-force.</li>
                  <li>Dynamiczny wybór komendy (Województwo {`->`} Powiat {`->`} Nazwa) podczas zakładania konta.</li>
                  <li>Nowy panel pomocy (ten, który właśnie czytasz) oraz historia wersji.</li>
                  <li>Ulepszony panel zarządzania użytkownikami dla Dowództwa.</li>
                </ul>
                
                <p><strong>v0.3.0 beta (WCPR UI Rework)</strong></p><ul><li>Dodano zakładki Karty PSP i WCPR do widoku edycji.</li><li>Zreorganizowano widok przyjęcia WCPR do stylistyki SWD-ST.</li></ul><p style={{ marginTop: '10px' }}><strong>v0.1 beta (Wersja pierwotna)</strong></p>
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
      )}
      {/* -------------------------------------------------------------
          BATTLE ALARM SCREEN OVERLAY (🚨 ALARM BOJOWY DLA JRG/OSP! 🚨)
          ------------------------------------------------------------- */}
      {battleAlarmModalOpen && battleAlarmIncident && (
        <div className="win-dialog-overlay" style={{ background: 'rgba(201, 42, 42, 0.9)', zIndex: 99999 }}>
          <div className="win-dialog border-outset" style={{ width: '480px', animation: 'led-pulse-red 0.8s infinite alternate' }}>
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
          <div className="win-dialog border-outset" style={{ width: '600px' }}>
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
          <div className="win-dialog border-outset" style={{ width: '420px' }}>
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
          DIALOG MODAL: USTAWIENIA UŻYTKOWNIKA
          ------------------------------------------------------------- */}
      {isSettingsModalOpen && (
        <div className="win-dialog-overlay" style={{ zIndex: 99990 }}>
          <div className="win-dialog border-outset" style={{ width: '450px', position: 'absolute', top: '10%', left: '30%', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', borderRadius: '8px' }}>
            <div className="win-dialog-header">
              <span>Ustawienia Użytkownika</span>
              <button className="btn-win" style={{ padding: '1px 5px', fontSize: '9px', fontWeight: 'bold' }} onClick={() => setIsSettingsModalOpen(false)}>X</button>
            </div>
            <div className="win-dialog-content border-inset" style={{ padding: '12px', background: '#fff', fontSize: '11px' }}>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Nazwa jednostki nadrzędnej (np. KM PSP Będzin)</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={settingsData.kmkpName} 
                  onChange={e => setSettingsData({...settingsData, kmkpName: e.target.value})}
                  placeholder="Domyślna nazwa zostanie użyta, jeśli puste"
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Miasta/gminy w rejonie (oddzielone przecinkiem)</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={settingsData.generatorCities} 
                  onChange={e => setSettingsData({...settingsData, generatorCities: e.target.value})}
                  placeholder="Będzin, Czeladź, Wojkowice..."
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Wzór numeru zdarzenia (zmienne: {`{prefix}, {nr}, {rok}`})</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={settingsData.incidentFormat} 
                  onChange={e => setSettingsData({...settingsData, incidentFormat: e.target.value})}
                  placeholder="{prefix}-{nr}"
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Wzór numeru meldunku (zmienne: {`{nr}, {rok}`})</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={settingsData.reportFormat} 
                  onChange={e => setSettingsData({...settingsData, reportFormat: e.target.value})}
                  placeholder="EWID/{nr}/{rok}"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: '15px', padding: '10px', background: '#e8f4fd', border: '1px solid #b8d4f2', borderRadius: '4px' }}>
                <strong style={{ display: 'block', marginBottom: '8px', color: '#005fb8' }}>🤖 AI Generator (Google Gemini)</strong>
                <p style={{ margin: '0 0 8px 0', color: '#555' }}>Wygeneruj i wprowadź klucz API Google Gemini (AI Studio), aby zdarzenia z Trybu Gry były wymyślane przez Sztuczną Inteligencję na żywo!</p>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Klucz API Gemini (zostaje tylko na Twoim PC)</label>
                <input 
                  type="password" 
                  className="input-field" 
                  value={settingsData.geminiApiKey || ''} 
                  onChange={e => setSettingsData({...settingsData, geminiApiKey: e.target.value})}
                  placeholder="AIzaSy..."
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: '15px', padding: '10px', background: '#f5f5f5', border: '1px solid #d1d1d1', borderRadius: '4px' }}>
                <strong style={{ display: 'block', marginBottom: '8px', color: '#5865F2' }}>🎮 Integracja Discord (Webhook)</strong>
                <p style={{ margin: '0 0 8px 0', color: '#555' }}>Wklej URL Webhooka z Twojego serwera Discord, aby powiadamiać znajomych o wysłanych zastępach i powrotach.</p>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Adres URL Webhooka</label>
                <input 
                  type="password" 
                  className="input-field" 
                  value={settingsData.discordWebhookUrl || ''} 
                  onChange={e => setSettingsData({...settingsData, discordWebhookUrl: e.target.value})}
                  placeholder="https://discord.com/api/webhooks/..."
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: '15px', padding: '10px', background: '#f5f5f5', border: '1px solid #d1d1d1' }}>
                <strong style={{ display: 'block', marginBottom: '8px', color: '#005fb8' }}>Rozgrywka / Symulator</strong>
                
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Częstotliwość wpływania zgłoszeń WCPR (Poziom Trudności)</label>
                  <select 
                    className="input-field" 
                    value={settingsData.difficulty || 'normal'} 
                    onChange={e => setSettingsData({...settingsData, difficulty: e.target.value})}
                    style={{ width: '100%' }}
                  >
                    <option value="easy">Spokojny dyżur (zdarzenie co 4-5 min)</option>
                    <option value="normal">Normalny dzień (zdarzenie co 2-3 min)</option>
                    <option value="hard">Armagedon / Front Burzowy (zdarzenie co 30-60 sek)</option>
                  </select>
                </div>

                <div style={{ marginBottom: '5px' }}>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Dźwięk nowej formatki WCPR</label>
                  <select 
                    className="input-field" 
                    value={settingsData.customSound || 'buzzer'} 
                    onChange={e => setSettingsData({...settingsData, customSound: e.target.value})}
                    style={{ width: '100%' }}
                  >
                    <option value="buzzer">Domyślny WCPR (Buzzer)</option>
                    <option value="bell">Klasyczny Dzwonek (Telefoniczny)</option>
                    <option value="siren">Dyskretna Syrena</option>
                    <option value="ping">Krótki PING</option>
                  </select>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', borderTop: '1px solid var(--win-shadow)', paddingTop: '8px' }}>
                <button className="btn-win" onClick={() => setIsSettingsModalOpen(false)}>❌ Anuluj</button>
                <button className="btn-win" style={{ backgroundColor: '#2b8a3e', color: 'white', fontWeight: 'bold' }} onClick={handleSaveSettings}>
                  💾 Zapisz
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
          <div className="win-dialog border-outset" style={{ width: '800px', height: '600px' }}>
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
          <div className="win-dialog border-outset" style={{ width: '440px' }}>
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
          <div className="win-dialog border-outset" style={{ width: '440px' }}>
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
          <div className="win-dialog border-outset" style={{ width: '600px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
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
                <thead style={{ background: 'var(--win-face)' }}>
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
                className="border-outset"
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

      {/* KSiS Popups */}
      {activeKsisPopups.length > 0 && (
        <div style={{ position: 'fixed', bottom: '400px', right: '15px', zIndex: 99999, display: 'flex', flexDirection: 'column', gap: '8px', width: '300px' }}>
          {activeKsisPopups.map((popup) => (
            <div key={popup.id} className="border-outset" style={{ background: '#ffffe0', border: '2px solid #f3f3f3', padding: '8px', boxShadow: '3px 3px 10px rgba(0,0,0,0.5)', cursor: 'pointer' }} onClick={() => {
                setActiveKsisPopups(prev => prev.filter(p => p.id !== popup.id));
                const fakeCall = {
                  id: popup.id,
                  isKsis: true,
                  incidentId: popup.incidentId,
                  miejscowoscStr: `KSiS od: ${popup.fromName}`,
                  address: `Żądany sprzęt: ${popup.equipment}`,
                  callerName: popup.fromName,
                  phone: '---',
                  category: 'ksis',
                  type: 'ksis',
                  description: `Zgłoszenie KSiS (Współdziałanie)\n\nOd: ${popup.fromName}\nSprzęt do zadysponowania: ${popup.equipment}\nKomentarz: ${popup.comment || 'Brak'}`
                };
                setSelectedWcprCallForModal(fakeCall);
                setIsWcprCallModalOpen(true);
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #d1d1d1', paddingBottom: '3px', marginBottom: '6px' }}>
                <strong style={{ fontSize: '9px', color: '#005fb8' }}>
                  ✉️ Żądanie zadysponowania (KSiS)
                </strong>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveKsisPopups(prev => prev.filter(p => p.id !== popup.id));
                  }}
                  style={{ fontSize: '9px', background: 'none', border: 'none', color: '#ff3333', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  X
                </button>
              </div>
              <div style={{ fontSize: '10px', color: 'black' }}>
                <strong>Od:</strong> {popup.fromName}<br />
                <strong>Sprzęt:</strong> <span style={{ color: '#d13438', fontWeight: 'bold' }}>{popup.requestedEquipment}</span><br />
                <br />
                <em>Kliknij tutaj, aby odpowiedzieć!</em>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* KSiS Send Modal */}
      {isKsisSendModalOpen && (
        <div className="win-dialog-overlay" style={{ zIndex: 100000 }}>
          <div className="win-dialog border-outset" style={{ width: '400px' }}>
            <div className="win-dialog-header">
              <span>Żądanie dyspozycji KSiS</span>
              <button className="btn-win" style={{ padding: '1px 5px', fontSize: '9px', fontWeight: 'bold' }} onClick={() => setIsKsisSendModalOpen(false)}>X</button>
            </div>
            <div className="win-dialog-body" style={{ background: 'var(--win-face)', padding: '15px' }}>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}>Do kogo wysłać? (Wybierz adresata):</label>
                <select 
                  className="win-input"
                  style={{ width: '100%', fontSize: '11px', padding: '3px' }} 
                  value={ksisSendFormData.targetTenant} 
                  onChange={(e) => setKsisSendFormData(prev => ({ ...prev, targetTenant: e.target.value }))}
                >
                  <option value="">-- Wybierz komendę / dyspozytora --</option>
                  {usersList.map(u => {
                    if (u.tenantId === userProfile.tenantId && userProfile.role !== 'admin') return null; // don't send to self
                    const name = u.displayName || u.email;
                    const tenantObj = allTenants.find(t => t.id === u.tenantId);
                    const tenantPrefix = tenantObj ? tenantObj.name : (u.tenantId === '120000' ? 'KW PSP KATOWICE' : `System (${u.tenantId || 'Brak'})`);
                    return <option key={u.id} value={u.tenantId}>{tenantPrefix} ({name})</option>;
                  })}
                  {userProfile.role !== 'admin' && !usersList.some(u => u.tenantId === '120000') && <option value="120000">KW PSP KATOWICE (KW PSP KATOWICE)</option>}
                </select>
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}>Proszę wyznaczyć sprzęt do zadysponowania:</label>
                <input 
                  type="text" 
                  className="win-input"
                  style={{ width: '100%', fontSize: '11px', padding: '3px' }} 
                  placeholder="np. Drabina mechaniczna, Lekki, Płetwonurkowie..." 
                  value={ksisSendFormData.equipment} 
                  onChange={(e) => setKsisSendFormData(prev => ({ ...prev, equipment: e.target.value }))} 
                />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}>Uzasadnienie / Komentarz (opcjonalnie):</label>
                <textarea 
                  className="win-input"
                  style={{ width: '100%', height: '50px', fontSize: '11px', padding: '3px', resize: 'none' }} 
                  value={ksisSendFormData.comment} 
                  onChange={(e) => setKsisSendFormData(prev => ({ ...prev, comment: e.target.value }))} 
                />
              </div>
              <div style={{ textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button className="btn-win" style={{ padding: '4px 12px', fontSize: '11px' }} onClick={() => setIsKsisSendModalOpen(false)}>Anuluj</button>
                <button className="btn-win" style={{ padding: '4px 12px', fontSize: '11px', fontWeight: 'bold', color: '#005fb8' }} onClick={async () => {
                  if (!ksisSendFormData.targetTenant) return alert("Wybierz jednostkę docelową!");
                  if (!ksisSendFormData.equipment) return alert("Wpisz sprzęt do zadysponowania!");
                  if (!ksisSendFormData.incidentId) return alert("Brak aktywnego zdarzenia do którego chcesz zadysponować siły!");
                  const targetUser = usersList.find(u => u.tenantId === ksisSendFormData.targetTenant) || { displayName: ksisSendFormData.targetTenant };
                  try {
                    await addDoc(collection(db, 'ksis_requests'), {
                      incidentId: ksisSendFormData.incidentId,
                      fromTenantId: userProfile.tenantId,
                      fromName: userProfile.displayName || userProfile.email || 'Nieznany Dyspozytor',
                      toTenantId: ksisSendFormData.targetTenant,
                      toName: targetUser.tenantId === '120000' ? 'KW PSP KATOWICE' : (targetUser.displayName || targetUser.email || ksisSendFormData.targetTenant),
                      requestedEquipment: ksisSendFormData.equipment,
                      comment: ksisSendFormData.comment,
                      status: 'pending',
                      assignedVehicles: [],
                      createdAt: serverTimestamp()
                    });
                    setIsKsisSendModalOpen(false);
                    alert("Żądanie KSiS wysłane pomyślnie.");
                  } catch(e) {
                    console.error("KSiS Error:", e);
                    alert("Błąd podczas wysyłania: " + e.message);
                  }
                }}>Prześlij dalej</button>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* -------------------------------------------------------------
          DIALOG MODAL: WCPR FORMATKA (SWD-ST classic)
          ------------------------------------------------------------- */}
      {isWcprCallModalOpen && selectedWcprCallForModal && (
        <div className="win-dialog-overlay" style={{ zIndex: 99999 }}>
          <div className="win-dialog" style={{ width: '850px' }}>
            <div className="win-dialog-header">
              <span>Nowe zdarzenie - SI WCPR {selectedWcprCallForModal.id?.substring(0, 4) || 'ZG/0000'}</span>
              <button className="btn-win" style={{ padding: '1px 5px', fontSize: '9px', fontWeight: 'bold' }} onClick={() => setIsWcprCallModalOpen(false)}>X</button>
            </div>
            <div className="win-dialog-body" style={{ display: 'flex', flexDirection: 'column', height: '550px', padding: '10px', background: 'var(--win-face)', gap: '10px' }}>
              
              {/* Tabs */}
              <div style={{ display: 'flex', gap: '2px', borderBottom: '1px solid #ccc', paddingLeft: '4px' }}>
                <div style={{ background: '#fff', padding: '6px 15px', border: '1px solid #ccc', borderBottom: 'none', borderTopLeftRadius: '4px', borderTopRightRadius: '4px', fontWeight: 'bold', fontSize: '12px' }}>Nowe zgłoszenie</div>
                <div style={{ background: '#e0e0e0', padding: '6px 15px', border: '1px solid #ccc', borderBottom: 'none', borderTopLeftRadius: '4px', borderTopRightRadius: '4px', fontSize: '12px', color: '#666', marginTop: '2px' }}>SI WCPR {selectedWcprCallForModal.id?.substring(0, 4)}</div>
              </div>

              {/* Main Content Area */}
              <div style={{ display: 'flex', flex: 1, border: '1px solid #ccc', borderTop: 'none', background: '#fff', padding: '10px', borderRadius: '0 0 4px 4px', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)' }}>
                
                {/* Left Column - Zgłoszenia */}
                <div style={{ width: '150px', borderRight: '1px solid #ccc', paddingRight: '10px', display: 'flex', flexDirection: 'column', marginRight: '10px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '4px', color: '#333' }}>Lista zgłoszeń SI WCPR</div>
                  <div style={{ flex: 1, background: '#f9f9f9', border: '1px solid #ccc', borderRadius: '4px', overflowY: 'auto', padding: '2px' }}>
                    <div style={{ padding: '6px', fontSize: '11px', background: '#005fb8', color: '#fff', borderRadius: '2px' }}>ZG/{selectedWcprCallForModal.id?.substring(0, 4)}</div>
                  </div>
                </div>

                {/* Right Column - Data */}
                <div style={{ flex: 1, paddingLeft: '4px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  
                  {/* Top Section */}
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {/* Lokalizacja zgłaszającego */}
                    <fieldset style={{ flex: 1, border: '1px solid #ccc', padding: '8px', margin: 0, borderRadius: '4px', background: '#fafafa' }}>
                      <legend style={{ fontSize: '11px', fontWeight: 'bold', color: '#005fb8' }}>Lokalizacja zgłaszającego</legend>
                      <div style={{ fontSize: '10px', color: '#666', marginBottom: '8px' }}>WOJ. ŚLĄSKIE / POWIAT / gm.</div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                        <input type="radio" checked readOnly style={{ margin: '0 6px 0 0' }} />
                        <span style={{ fontSize: '11px', width: '70px', fontWeight: '500' }}>Miejscowość</span>
                        <input type="text" readOnly className="win-input" value={selectedWcprCallForModal.miejscowoscStr || ''} style={{ flex: 1, background: '#fff' }} />
                      </div>
                      
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                        <div style={{ flex: 2 }}>
                          <div style={{ fontSize: '10px', color: '#555', marginBottom: '2px' }}>Ulica</div>
                          <input type="text" readOnly className="win-input" style={{ width: '100%', background: '#fff' }} value={selectedWcprCallForModal.address?.split('ul.')[1]?.trim() || ''} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '10px', color: '#555', marginBottom: '2px' }}>Nr budynku</div>
                          <input type="text" readOnly className="win-input" style={{ width: '100%', background: '#fff' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '10px', color: '#555', marginBottom: '2px' }}>Nr lokalu</div>
                          <input type="text" readOnly className="win-input" style={{ width: '100%', background: '#fff' }} />
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', width: '70px', fontWeight: '500' }}>Opis lokalizacji</span>
                        <input type="text" readOnly className="win-input" style={{ flex: 1, background: '#fff' }} />
                      </div>
                    </fieldset>

                    {/* Zgłaszający */}
                    <fieldset style={{ width: '220px', border: '1px solid #ccc', padding: '8px', margin: 0, borderRadius: '4px', background: '#fafafa' }}>
                      <legend style={{ fontSize: '11px', fontWeight: 'bold', color: '#005fb8' }}>Zgłaszający</legend>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', width: '60px', fontWeight: '500' }}>Imię</span>
                          <input type="text" readOnly className="win-input" style={{ flex: 1, background: '#fff' }} value={selectedWcprCallForModal.callerName?.split(' ')[0] || ''} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', width: '60px', fontWeight: '500' }}>Nazwisko</span>
                          <input type="text" readOnly className="win-input" style={{ flex: 1, background: '#fff' }} value={selectedWcprCallForModal.callerName?.split(' ')[1] || ''} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', width: '60px', fontWeight: '500' }}>Nr telefonu</span>
                          <input type="text" readOnly className="win-input" style={{ flex: 1, background: '#fff' }} value={selectedWcprCallForModal.phone || ''} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', width: '60px', fontWeight: '500' }}>Służba</span>
                          <input type="text" readOnly className="win-input" style={{ flex: 1, background: '#fff' }} value="POL" />
                        </div>
                      </div>
                    </fieldset>
                  </div>

                  {/* Middle/Bottom Split */}
                  <div style={{ display: 'flex', gap: '8px', flex: 1, marginTop: '8px' }}>
                    {/* Left: Zdarzenie */}
                    <fieldset style={{ flex: 1, border: '1px solid #ccc', padding: '8px', margin: 0, display: 'flex', flexDirection: 'column', borderRadius: '4px', background: '#fafafa' }}>
                      <legend style={{ fontSize: '11px', fontWeight: 'bold', color: '#005fb8' }}>Zdarzenie: ZD/{selectedWcprCallForModal.id?.substring(0, 4)}</legend>
                      
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '11px', width: '40px', fontWeight: '500' }}>Data</span>
                        <input type="text" readOnly className="win-input" style={{ width: '80px', background: '#fff' }} value={new Date().toLocaleDateString('pl-PL')} />
                        <span style={{ fontSize: '11px', width: '30px', textAlign: 'right', paddingRight: '4px', fontWeight: '500' }}>Czas</span>
                        <input type="text" readOnly className="win-input" style={{ width: '60px', background: '#fff' }} value={new Date().toLocaleTimeString('pl-PL').substring(0, 5)} />
                      </div>

                      <div style={{ fontSize: '10px', color: '#666', marginBottom: '8px' }}>WOJ. ŚLĄSKIE / POWIAT / OBSZAR MIEJSKI</div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                        <input type="radio" checked readOnly style={{ margin: '0 6px 0 0' }} />
                        <span style={{ fontSize: '11px', width: '70px', fontWeight: '500' }}>Miejscowość</span>
                        <input type="text" readOnly className="win-input" value={selectedWcprCallForModal.miejscowoscStr || ''} style={{ flex: 1, background: '#fff' }} />
                      </div>

                      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                        <div style={{ flex: 2 }}>
                          <div style={{ fontSize: '10px', color: '#555', marginBottom: '2px' }}>Ulica</div>
                          <input type="text" readOnly className="win-input" style={{ width: '100%', background: '#fff' }} value={selectedWcprCallForModal.address?.split('ul.')[1]?.trim() || ''} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '10px', color: '#555', marginBottom: '2px' }}>Nr budynku</div>
                          <input type="text" readOnly className="win-input" style={{ width: '100%', background: '#fff' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '10px', color: '#555', marginBottom: '2px' }}>Nr lokalu</div>
                          <input type="text" readOnly className="win-input" style={{ width: '100%', background: '#fff' }} />
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '6px', marginBottom: '6px', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', width: '70px', fontWeight: '500' }}>Kategoria</span>
                        <select className="win-input" style={{ flex: 1, background: '#fff' }} readOnly value={selectedWcprCallForModal.category || ''}>
                          <option>{selectedWcprCallForModal.category === 'pozar' ? 'Pożar' : selectedWcprCallForModal.category === 'mz' ? 'Miejscowe Zagrożenie' : 'Inne'}</option>
                        </select>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '6px', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', width: '70px', fontWeight: '500' }}>Podkategoria</span>
                        <select className="win-input" style={{ flex: 1, background: '#fff' }} readOnly value="Inna">
                          <option>Inna</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', width: '70px', fontWeight: '500' }}>Priorytet</span>
                        <select className="win-input" style={{ flex: 1, background: '#fff' }} readOnly value="Pilny">
                          <option>Pilny</option>
                        </select>
                      </div>

                    </fieldset>

                    {/* Right: Opisy & Table */}
                    <div style={{ width: '270px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <fieldset style={{ flex: 1, border: '1px solid #ccc', padding: '8px', margin: 0, display: 'flex', flexDirection: 'column', borderRadius: '4px', background: '#fafafa' }}>
                        <legend style={{ fontSize: '11px', fontWeight: 'bold', color: '#005fb8' }}>Opis zdarzenia</legend>
                        <textarea 
                          className="win-input" 
                          style={{ flex: 1, resize: 'none', fontSize: '11px', fontFamily: 'var(--font-mono)', background: '#fff' }} 
                          readOnly 
                          value={selectedWcprCallForModal.description || ''}
                        />
                      </fieldset>
                      
                      <div style={{ border: '1px solid #ccc', background: '#fff', height: '90px', overflowY: 'auto', borderRadius: '4px' }}>
                        <table style={{ width: '100%', fontSize: '10px', borderCollapse: 'collapse' }}>
                          <thead style={{ background: 'var(--win-face)', borderBottom: '1px solid #ccc' }}>
                            <tr>
                              <th style={{ fontWeight: '600', textAlign: 'left', padding: '4px' }}>Służba</th>
                              <th style={{ fontWeight: '600', textAlign: 'left', padding: '4px' }}>Status</th>
                              <th style={{ fontWeight: '600', textAlign: 'left', padding: '4px' }}>Dyspozytor</th>
                              <th style={{ fontWeight: '600', textAlign: 'left', padding: '4px' }}>Telefon</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr style={{ borderBottom: '1px solid #eee' }}>
                              <td style={{ padding: '4px' }}>POL</td>
                              <td style={{ padding: '4px' }}>W trakcie</td>
                              <td style={{ padding: '4px' }}>DYŻURNY_01</td>
                              <td style={{ padding: '4px' }}>112</td>
                            </tr>
                            <tr>
                              <td style={{ padding: '4px' }}>PSP</td>
                              <td style={{ padding: '4px' }}>Dostarczone</td>
                              <td style={{ padding: '4px' }}>---</td>
                              <td style={{ padding: '4px' }}>---</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '10px' }}>
                <button 
                  className="btn-win" 
                  style={{ width: '100px', fontWeight: 'bold', background: '#2b8a3e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                  onClick={() => proceedWithCallAccept(selectedWcprCallForModal)}
                >
                  <span style={{ fontSize: '14px' }}>✔️</span> Przyjmij
                </button>
                <button 
                  className="btn-win" 
                  style={{ width: '100px', color: '#d13438', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', border: '1px solid #d13438', background: '#fff' }}
                  onClick={() => setIsWcprCallModalOpen(false)}
                >
                  <span style={{ fontSize: '14px' }}>❌</span> Anuluj
                </button>
                <button 
                  className="btn-win" 
                  style={{ width: '100px', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', border: '1px solid #888', background: '#fff' }}
                  onClick={() => {
                    if (selectedWcprCallForModal.isKsis) {
                      updateDoc(doc(db, 'ksis_requests', selectedWcprCallForModal.id), { status: 'rejected' }).catch(console.error);
                    } else {
                      deleteDoc(doc(db, 'calls', selectedWcprCallForModal.id)).catch(console.error);
                    }
                    setIsWcprCallModalOpen(false);
                    setSelectedWcprCallForModal(null);
                  }}
                >
                  <span style={{ fontSize: '14px', color: 'red' }}>🚫</span> Odrzuć
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          DIALOG MODAL: CREATE / EDIT INCIDENT (KDR OSP Form)
          ------------------------------------------------------------- */}
      {isNewIncidentModalOpen && (
        <div className="win-dialog-overlay" style={{ pointerEvents: 'none' }}>
          {activeIncident && activeIncident.status === 'new' ? (
            <div className="win-dialog border-outset" style={{ width: '450px' }}>
              <div className="win-dialog-header" style={{ background: '#0a246a', color: '#fff' }}>
                <span>Formatka WCPR: {activeIncident.customId || 'Nowe Zgłoszenie'}</span>
                <button className="btn-win" style={{ padding: '1px 5px', fontSize: '9px', fontWeight: 'bold' }} onClick={() => setIsNewIncidentModalOpen(false)}>X</button>
              </div>
              <div className="win-dialog-body" style={{ background: 'var(--win-face)', padding: '12px' }}>
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
          <div className="win-dialog border-outset" style={{ width: '800px', maxHeight: '95vh', overflowY: 'auto' }}>
            <div className="win-dialog-header">
              <span>{editingIncidentId ? `Modyfikacja Zgłoszenia Zdarzenia - ${activeIncident?.customId}` : 'Nowe zdarzenie - ZGŁOSZENIE'}</span>
              <button className="btn-win" style={{ padding: '1px 5px', fontSize: '9px', fontWeight: 'bold' }} onClick={() => setIsNewIncidentModalOpen(false)}>X</button>
            </div>
            
            <div className="win-dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '6px', background: 'var(--win-face)', height: '600px' }}>
              
              {/* ZAKŁADKI KARTY ZDARZENIA */}
              <div style={{ display: 'flex', borderBottom: '1px solid #ccc', marginBottom: '5px', background: '#e1e1e1', paddingTop: '2px', paddingLeft: '4px' }}>
                <div style={{ padding: '2px 8px', border: '1px solid #999', borderBottom: 'none', background: '#fff', fontSize: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'default' }}>
                   <img src="https://img.icons8.com/color/48/000000/google-logo.png" style={{width: 12, height: 12}} alt="G"/> ZG{activeIncident?.customId?.replace('-', '/') || ''}
                </div>
                <div style={{ padding: '2px 8px', border: '1px solid #999', borderBottom: 'none', background: 'var(--win-face)', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'default', color: '#555' }}>
                   <img src="https://img.icons8.com/color/48/000000/c-key.png" style={{width: 12, height: 12}} alt="C"/> SI WCPR ZD/{activeIncident?.id?.substring(0,4).toUpperCase() || 'NOWE'}/{activeIncident?.tenantId?.substring(0,3).toUpperCase() || 'KAT'}/{new Date().getFullYear()}
                </div>
              </div>
              <div style={{ display: 'flex', borderBottom: '1px solid #999', marginBottom: '5px' }}>
                <button 
                  onClick={() => setIncidentModalTab('formatka')}
                  style={{ padding: '5px 15px', fontWeight: incidentModalTab === 'formatka' ? 'bold' : 'normal', background: incidentModalTab === 'formatka' ? '#fff' : '#f0f0f0', border: '1px solid #999', borderBottom: incidentModalTab === 'formatka' ? '1px solid #fff' : '1px solid #999', marginBottom: '-1px', zIndex: incidentModalTab === 'formatka' ? 1 : 0, borderRadius: '3px 3px 0 0', borderLeft: '1px solid #f3f3f3', marginLeft: '4px' }}
                >Karta Zdarzenia PSP</button>
                <button 
                  onClick={() => setIncidentModalTab('dziennik')}
                  style={{ padding: '5px 15px', fontWeight: incidentModalTab === 'dziennik' ? 'bold' : 'normal', background: incidentModalTab === 'dziennik' ? '#fff' : '#f0f0f0', border: '1px solid #999', borderBottom: incidentModalTab === 'dziennik' ? '1px solid #fff' : '1px solid #999', marginBottom: '-1px', zIndex: incidentModalTab === 'dziennik' ? 1 : 0, marginLeft: '2px', borderRadius: '3px 3px 0 0' }}
                >Dziennik Działań (Log)</button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', display: incidentModalTab === 'formatka' ? 'block' : 'none' }}>

              
              {/* TOP SECTION: ZGŁOSZENIE */}
              <fieldset style={{ border: '1px solid var(--win-shadow)', borderRadius: '4px', padding: '6px', margin: 0, position: 'relative' }}>
                <legend style={{ fontSize: '11px', fontWeight: 'bold', marginLeft: '10px' }}>Karta Zdarzenia</legend>
                
                <div style={{ display: 'flex', gap: '10px' }}>
                  {/* Czas */}
                  <fieldset style={{ padding: '4px', margin: 0, flex: 0.3 }}>
                    <legend style={{ fontSize: '9px' }}>Czas</legend>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <span style={{ fontSize: '9px' }}>Data</span>
                      <input type="date" className="win-input" style={{ width: '90px' }} value={incidentDateStr} onChange={(e) => setIncidentDateStr(e.target.value)} />
                      <span style={{ fontSize: '9px' }}>Godzina</span>
                      <input type="text" className="win-input" style={{ width: '60px' }} value={incidentTimeStr} onChange={(e) => setIncidentTimeStr(e.target.value)} />
                    </div>
                  </fieldset>

                  {/* Zgłaszający */}
                  <fieldset style={{ padding: '4px', margin: 0, flex: 0.7 }}>
                    <legend style={{ fontSize: '9px' }}>Przyjęcie zgł.</legend>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <select className="win-input" style={{ width: '100px' }}>
                        <option>Telefon</option>
                        <option>Radio</option>
                      </select>
                      <select className="win-input" style={{ flex: 1 }}>
                        <option>Straż Pożarna</option>
                        <option>WCPR</option>
                      </select>
                      <select className="win-input" style={{ flex: 1.5 }} value={targetJrg} onChange={(e) => setTargetJrg(e.target.value)}>
                        {JRG_UNITS.map(j => <option key={j} value={j}>{j}</option>)}
                      </select>
                    </div>
                  </fieldset>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  {/* Lokalizacja + Opis */}
                  <fieldset style={{ padding: '4px', margin: 0, flex: 0.6 }}>
                    <legend style={{ fontSize: '9px' }}>Lokalizacja</legend>
                    <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 30px 40px', gap: '4px', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '9px', textAlign: 'right' }}>Gmina</span>
                      <input type="text" className="win-input" value={gminaStr} onChange={(e) => setGminaStr(e.target.value)} style={{ gridColumn: '2 / span 3' }} />
                      
                      <span style={{ fontSize: '9px', textAlign: 'right' }}>Miejscowość</span>
                      <input type="text" className="win-input" style={{ color: tenantName !== miejscowoscStr && !gameModeCities.includes(miejscowoscStr) ? 'red' : 'black' }} value={miejscowoscStr} onChange={(e) => setMiejscowoscStr(e.target.value)} />
                      <span style={{ fontSize: '9px', textAlign: 'right' }}>T</span>
                      <input type="text" className="win-input" />

                      <span style={{ fontSize: '9px', textAlign: 'right' }}>Adres</span>
                      <input type="text" className="win-input" value={location} onChange={(e) => handleLocationChange(e.target.value)} style={{ gridColumn: '2 / span 3', color: tenantStreets.length > 0 && !tenantStreets.some(s => location.includes(s)) ? 'red' : 'black' }} />

                      <span style={{ fontSize: '9px', textAlign: 'right' }}>Obiekt</span>
                      <input type="text" className="win-input" value={obiektStr} onChange={(e) => setObiektStr(e.target.value)} style={{ gridColumn: '2 / span 3' }} />

                      <span style={{ fontSize: '9px', textAlign: 'right' }}>Nr drogi</span>
                      <input type="text" className="win-input" />
                      <span style={{ fontSize: '9px', textAlign: 'right' }}>Pikietaż</span>
                      <input type="text" className="win-input" />
                    </div>
                    <div style={{ fontSize: '9px', marginTop: '4px' }}>Informacje dodatkowe - opis zdarzenia</div>
                    <textarea className="win-input" style={{ width: '100%', height: '60px', resize: 'none', fontFamily: 'var(--font-mono)' }} value={description} onChange={(e) => setDescription(e.target.value)} />
                  </fieldset>

                  {/* Dane osoby + Powiadomione służby */}
                  <div style={{ flex: 0.4, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <fieldset style={{ padding: '4px', margin: 0 }}>
                      <legend style={{ fontSize: '9px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          Dane osoby zgłaszającej
                          <button className="btn-win" style={{ fontSize: '8px', padding: '1px 3px', background: '#ffe3e3', color: '#c92a2a', fontWeight: 'bold' }} onClick={(e) => {
                            e.preventDefault();
                            if(window.confirm('Pobieranie lokalizacji telefonu z bazy UKE. Może być bardzo niedokładne. Kontynuować?')) {
                               setCallerAddressStr(cityPool?.[0] || 'Warszawa');
                               document.getElementById('caller_street').value = 'BTS MAszt ' + Math.floor(Math.random()*900);
                            }
                          }}>PLI CBD</button>
                        </legend>
                      <label style={{ fontSize: '9px', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                        <input type="checkbox" /> Nie zgłaszającego
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr', gap: '2px', alignItems: 'center' }}>
                        <span style={{ fontSize: '9px', textAlign: 'right' }}>Imię</span>
                        <input type="text" className="win-input" value={callerNameStr.split(' ')[0] || ''} onChange={(e) => setCallerNameStr(e.target.value + ' ' + (callerNameStr.split(' ')[1]||''))} />
                        <span style={{ fontSize: '9px', textAlign: 'right' }}>Nazwisko</span>
                        <input type="text" className="win-input" value={callerNameStr.split(' ')[1] || ''} onChange={(e) => setCallerNameStr((callerNameStr.split(' ')[0]||'') + ' ' + e.target.value)} />
                        <span style={{ fontSize: '9px', textAlign: 'right' }}>Nr telefonu</span>
                        <input type="text" className="win-input" value={callerPhoneStr} onChange={(e) => setCallerPhoneStr(e.target.value)} />
                        <span style={{ fontSize: '9px', textAlign: 'right' }}>Miejscowość</span>
                        <div style={{ display: 'flex', gap: '2px' }}>
                          <input type="text" className="win-input" style={{ flex: 1 }} value={callerAddressStr} onChange={(e) => setCallerAddressStr(e.target.value)} />
                          <button className="btn-win" style={{ fontSize: '10px', padding: '0 4px', color: 'green', fontWeight: 'bold' }} title="Skopiuj do Lokalizacji" onClick={(e) => { e.preventDefault(); setMiejscowoscStr(callerAddressStr); }}>➡️</button>
                        </div>
                        <span style={{ fontSize: '9px', textAlign: 'right' }}>Ulica</span>
                        <div style={{ display: 'flex', gap: '2px' }}>
                          <input type="text" className="win-input" style={{ flex: 1 }} id="caller_street" />
                          <button className="btn-win" style={{ fontSize: '10px', padding: '0 4px', color: 'green', fontWeight: 'bold' }} title="Skopiuj do Lokalizacji" onClick={(e) => { e.preventDefault(); handleLocationChange(document.getElementById('caller_street').value); }}>➡️</button>
                        </div>
                      </div>
                    </fieldset>
                    
                    <fieldset style={{ padding: '4px', margin: 0, flex: 1 }}>
                      <legend style={{ fontSize: '9px' }}>Zawiadomione Służby</legend>
                      {editingIncidentId && activeIncident ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', height: '100%' }}>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button 
                              className="btn-win" 
                              style={{ 
                                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', padding: '4px',
                                boxShadow: ['Zadysponowane', 'Na miejscu'].includes(activeIncident?.externalServices?.zrm) ? 'inset 1px 1px 3px #000' : '',
                                border: ['Zadysponowane', 'Na miejscu'].includes(activeIncident?.externalServices?.zrm) ? '2px solid #e03131' : '2px outset #fff',
                                background: ['Zadysponowane', 'Na miejscu'].includes(activeIncident?.externalServices?.zrm) ? '#e9ecef' : '#f3f3f3',
                                outline: 'none'
                              }} 
                              disabled={['Zadysponowane', 'Na miejscu'].includes(activeIncident?.externalServices?.zrm)}
                              onClick={(e) => { e.preventDefault(); dispatchExternalService('zrm'); }}
                            >
                              <div style={{ fontSize: '20px', lineHeight: 1 }}>🚑</div>
                              <div style={{ fontSize: '9px', fontWeight: 'bold' }}>PRM</div>
                              <div style={{ fontSize: '8px', color: '#666' }}>{activeIncident?.externalServices?.zrm || 'Brak'}</div>
                            </button>
                            
                            <button 
                              className="btn-win" 
                              style={{ 
                                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', padding: '4px',
                                boxShadow: ['Zadysponowane', 'Na miejscu'].includes(activeIncident?.externalServices?.policja) ? 'inset 1px 1px 3px #000' : '',
                                border: ['Zadysponowane', 'Na miejscu'].includes(activeIncident?.externalServices?.policja) ? '2px solid #e03131' : '2px outset #fff',
                                background: ['Zadysponowane', 'Na miejscu'].includes(activeIncident?.externalServices?.policja) ? '#e9ecef' : '#f3f3f3',
                                outline: 'none'
                              }} 
                              disabled={['Zadysponowane', 'Na miejscu'].includes(activeIncident?.externalServices?.policja)}
                              onClick={(e) => { e.preventDefault(); dispatchExternalService('policja'); }}
                            >
                              <div style={{ fontSize: '20px', lineHeight: 1 }}>🚓</div>
                              <div style={{ fontSize: '9px', fontWeight: 'bold' }}>Policja</div>
                              <div style={{ fontSize: '8px', color: '#666' }}>{activeIncident?.externalServices?.policja || 'Brak'}</div>
                            </button>
                          </div>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '9px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #ccc', paddingBottom: '2px' }}>
                               <span>Pogotowie Energ.:</span> 
                               <span>{activeIncident?.externalServices?.pogotowie || 'Brak'}</span>
                               <button className="btn-win" style={{ padding: '0 4px', fontSize: '8px' }} disabled={['Zadysponowane', 'Na miejscu'].includes(activeIncident?.externalServices?.pogotowie)} onClick={(e) => { e.preventDefault(); dispatchExternalService('pogotowie'); }}>Powiadom</button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', height: '100%' }}>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button 
                              className="btn-win" 
                              style={{ 
                                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '4px',
                                boxShadow: notifiedServices.includes('PRM') ? 'inset 1px 1px 3px #000' : '',
                                border: notifiedServices.includes('PRM') ? '2px solid #e03131' : '2px outset #fff',
                                background: notifiedServices.includes('PRM') ? '#e9ecef' : '#f3f3f3',
                                outline: 'none'
                              }} 
                              onClick={(e) => { e.preventDefault(); handleServiceToggle('PRM'); }}
                            >
                              <div style={{ fontSize: '24px', lineHeight: 1 }}>🚑</div>
                              <div style={{ fontSize: '9px', fontWeight: 'bold' }}>PRM</div>
                            </button>
                            
                            <button 
                              className="btn-win" 
                              style={{ 
                                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '4px',
                                boxShadow: notifiedServices.includes('Policja') ? 'inset 1px 1px 3px #000' : '',
                                border: notifiedServices.includes('Policja') ? '2px solid #e03131' : '2px outset #fff',
                                background: notifiedServices.includes('Policja') ? '#e9ecef' : '#f3f3f3',
                                outline: 'none'
                              }} 
                              onClick={(e) => { e.preventDefault(); handleServiceToggle('Policja'); }}
                            >
                              <div style={{ fontSize: '24px', lineHeight: 1 }}>🚓</div>
                              <div style={{ fontSize: '9px', fontWeight: 'bold' }}>Policja</div>
                            </button>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '9px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '2px' }}><input type="checkbox" checked={notifiedServices.includes('Pogotowie Gazowe')} onChange={() => handleServiceToggle('Pogotowie Gazowe')} /> Pogotowie Gazowe</label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '2px' }}><input type="checkbox" checked={notifiedServices.includes('Pogotowie Energetyczne')} onChange={() => handleServiceToggle('Pogotowie Energetyczne')} /> Pogotowie Energ.</label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '2px' }}><input type="checkbox" checked={notifiedServices.includes('Pogotowie Wodociągowe')} onChange={() => handleServiceToggle('Pogotowie Wodociągowe')} /> Pogotowie Wodoc.</label>
                          </div>
                        </div>
                      )}
                    </fieldset>
                  </div>
                </div>
              </fieldset>

              {/* BOTTOM SECTION: ZDARZENIA */}
              <div style={{ border: '1px solid var(--win-shadow)', borderRadius: '4px', position: 'relative', marginTop: '10px' }}>
                <div style={{ position: 'absolute', top: '-18px', left: '0', display: 'flex' }}>
                  <div style={{ background: '#fff', border: '2px outset #f3f3f3', borderBottom: 'none', padding: '2px 10px', fontSize: '10px', fontWeight: 'bold', zIndex: 1 }}>Nowe zdarzenie</div>
                  <div style={{ background: 'var(--win-face)', border: '1px solid #d1d1d1', borderBottom: 'none', padding: '2px 10px', fontSize: '10px', marginTop: '2px' }}>Zdarzenia</div>
                </div>
                
                <div style={{ padding: '8px', background: '#d0d8e0', minHeight: '200px' }}>
                  
                  {/* Rodzaj zdarzenia */}
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '10px' }}>Rodzaj</span>
                    <div style={{ display: 'flex', gap: '2px' }}>
                      <button className={`btn-win ${incidentType === 'pozar' ? 'active' : ''}`} style={{ fontWeight: 'bold', width: '30px' }} onClick={() => setIncidentType('pozar')}>P</button>
                      <button className={`btn-win ${incidentType === 'mz' ? 'active' : ''}`} style={{ fontWeight: 'bold', width: '30px' }} onClick={() => setIncidentType('mz')}>MZ</button>
                      <button className={`btn-win ${incidentType === 'cw' ? 'active' : ''}`} style={{ fontWeight: 'bold', width: '30px' }} onClick={() => setIncidentType('cw')}>CW</button>
                      <button className={`btn-win ${incidentType === 'wg' ? 'active' : ''}`} style={{ fontWeight: 'bold', width: '30px' }} onClick={() => setIncidentType('wg')}>WG</button>
                      <button className={`btn-win ${incidentType === 'bl' ? 'active' : ''}`} style={{ fontWeight: 'bold', width: '30px' }} onClick={() => setIncidentType('bl')}>BL</button>
                      <button className={`btn-win ${incidentType === 'zpr' ? 'active' : ''}`} style={{ fontWeight: 'bold', width: '35px' }} onClick={() => setIncidentType('zpr')}>ZPR</button>
                      <button className={`btn-win ${incidentType === 'pzr' ? 'active' : ''}`} style={{ fontWeight: 'bold', width: '35px' }} onClick={() => setIncidentType('pzr')}>PZR</button>
                    </div>
                    
                    <span style={{ fontSize: '10px', marginLeft: '10px' }}>Podrodzaj</span>
                    <select className="win-input" style={{ width: '150px' }} value={incidentSubtype} onChange={e => setIncidentSubtype(e.target.value)}>
                      <option value="">Brak</option>
                      {incidentType === 'pozar' && (<><option value="poz_mieszk">Pożar mieszkania / lokalu</option><option value="poz_lasu">Pożar lasu / upraw</option><option value="poz_sam">Pożar samochodu</option><option value="poz_przem">Pożar przemysłowy</option><option value="poz_toru">Pożar toru/nasypów</option><option value="poz_komin">Pożar sadzy w kominie</option><option value="poz_inne">Pożar inny</option></>)}
                      {incidentType === 'mz' && (<><option value="mz_rd">MZ Ratownictwo drogowe</option><option value="mz_med">MZ Ratownictwo medyczne</option><option value="mz_wod">MZ Ratownictwo wodne</option><option value="mz_wys">MZ Ratownictwo wysokościowe</option><option value="mz_chem">MZ Zagrożenie chemiczne</option><option value="mz_gaz">MZ Zagrożenie gazowe</option><option value="mz_bud">MZ Katastrofa budowlana</option><option value="mz_pow">MZ Powódź / zalanie</option><option value="mz_inne">MZ inne zagrożenie</option></>)}
                      {incidentType === 'af' && (<><option value="af_auto">AF Automatyczny (SAP/DSO)</option><option value="af_zlos">AF Złośliwy alarm</option><option value="af_omyl">AF Pomyłkowe zgłoszenie</option></>)}
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    {/* Left half: Czasy & Jednostki */}
                    <div style={{ flex: 0.6, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 20px', gap: '4px', alignItems: 'center' }}>
                        <span style={{ fontSize: '10px', textAlign: 'right' }}>Jednostka prowadząca</span>
                        <select className="win-input" value={targetJrg} onChange={(e) => setTargetJrg(e.target.value)}>
                          {JRG_UNITS.map(j => <option key={j} value={j}>{j}</option>)}
                        </select>
                        <button className="btn-win" style={{ padding: '0', fontSize: '10px' }}>🎯</button>

                        <span style={{ fontSize: '10px', textAlign: 'right' }}>Teren działania</span>
                        <select className="win-input">
                          <option>{targetJrg}</option>
                        </select>
                        <button className="btn-win" style={{ padding: '0', fontSize: '10px' }}>🎯</button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '20px 100px 80px 60px', gap: '4px', alignItems: 'center', marginTop: '6px' }}>
                        <input type="checkbox" checked readOnly />
                        <span style={{ fontSize: '10px' }}>Czas rozpoczęcia</span>
                        <input type="date" className="win-input" value={incidentDateStr} onChange={(e) => setIncidentDateStr(e.target.value)} />
                        <input type="text" className="win-input" value={incidentTimeStr} onChange={(e) => setIncidentTimeStr(e.target.value)} />

                        <input type="checkbox" />
                        <span style={{ fontSize: '10px' }}>Zdarzenie planowane</span>
                        <input type="date" className="win-input" />
                        <input type="text" className="win-input" />

                        <input type="checkbox" />
                        <span style={{ fontSize: '10px' }}>Czas lokalizacji</span>
                        <input type="date" className="win-input" />
                        <input type="text" className="win-input" />

                        <input type="checkbox" />
                        <span style={{ fontSize: '10px' }}>Czas likwidacji</span>
                        <input type="date" className="win-input" />
                        <input type="text" className="win-input" />
                      </div>

                      <fieldset style={{ padding: '4px', margin: '4px 0 0 0', background: '#d0d8e0' }}>
                        <legend style={{ fontSize: '9px' }}>Procedura postępowania</legend>
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <select className="win-input" style={{ flex: 1 }}>
                            <option>-- Brak procedury --</option>
                            <option>Procedura KSRG nr 1</option>
                            <option>Procedura KSRG nr 2</option>
                          </select>
                        </div>
                        <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                          <label style={{ fontSize: '9px', display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
                            <input type="checkbox" /> Zastosuj procedurę
                          </label>
                          <button className="btn-win" style={{ fontSize: '9px', padding: '2px 6px' }}>Pokaż wszystkie</button>
                        </div>
                      </fieldset>
                    </div>

                    {/* Right half: Współrzędne & Flagi */}
                    <div style={{ flex: 0.4, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 20px', gap: '4px', alignItems: 'center' }}>
                        <span style={{ fontSize: '10px', textAlign: 'right' }}>Współrzędne geograficzne</span>
                        <span /> <span />
                        <span style={{ fontSize: '10px', textAlign: 'right', color: '#888' }}>Dł. geo.</span>
                        <input type="text" className="win-input" style={{ background: '#ffe3e3' }} value={coordX} onChange={(e) => setCoordX(e.target.value)} placeholder="Brak" />
                        <button className="btn-win" style={{ padding: '0', fontSize: '10px' }}>🌐</button>
                        <span style={{ fontSize: '10px', textAlign: 'right', color: '#888' }}>Szer. geo.</span>
                        <input type="text" className="win-input" style={{ background: '#ffe3e3' }} value={coordY} onChange={(e) => setCoordY(e.target.value)} placeholder="Brak" />
                        <button className="btn-win" style={{ padding: '0', fontSize: '10px' }}>🌐</button>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                        <span style={{ fontSize: '10px', width: '120px', textAlign: 'right' }}>Numer meldunku</span>
                        <input type="text" className="win-input" style={{ flex: 1 }} readOnly />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '10px', width: '120px', textAlign: 'right' }}>Pliki zew.</span>
                        <input type="text" className="win-input" style={{ flex: 1 }} readOnly />
                        <button className="btn-win" style={{ padding: '0 4px', fontSize: '10px' }}>📁</button>
                      </div>

                      <div style={{ position: 'relative', flex: 1, border: '1px inset #d1d1d1', background: '#fff', marginTop: '4px', padding: '2px', overflowY: 'auto', maxHeight: '100px' }}>
                        <div style={{ position: 'absolute', top: '-6px', left: '10px', background: '#d0d8e0', fontSize: '9px', fontWeight: 'bold', padding: '0 4px' }}>Flagi zdarzeń</div>
                        <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <label style={{ fontSize: '9px', display: 'flex', alignItems: 'center', gap: '4px' }}><input type="checkbox" checked={incidentFlags.length===0} readOnly /> Brak flag</label>
                          {[
                            ['dlugotrl', 'Długotrwałe zdarzenie'],
                            ['masowe', 'Ciężkie uszkodzenia ciała > 3 osób'],
                            ['hbzn', 'HBZN (Materiały niebezpieczne)'],
                            ['wielopow', 'Wielopowiatowe'],
                            ['interwenc', 'Działania poza granicami kraju'],
                            ['katastrofa', 'Katastrofa budowlana']
                          ].map(([flag, label]) => (
                            <label key={flag} style={{ fontSize: '9px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <input type="checkbox" checked={incidentFlags.includes(flag)} onChange={() => setIncidentFlags(prev => prev.includes(flag) ? prev.filter(f => f !== flag) : [...prev, flag])} /> {label}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              </div>
              
              {/* ZAKŁADKA: DZIENNIK */}
              <div style={{ flex: 1, overflowY: 'auto', display: incidentModalTab === 'dziennik' ? 'block' : 'none', background: '#fff', border: '1px solid #999', padding: '5px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '12px' }}>Dziennik Działań Zdarzenia</h4>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px' }}>
                  {(activeIncident?.eventHistory || []).map((ev, i) => (
                    <div key={i} style={{ padding: '3px', borderBottom: '1px dashed #ccc' }}>
                      <strong>[{ev.time}]</strong> {ev.user}: {ev.action}
                    </div>
                  ))}
                  {(!activeIncident?.eventHistory || activeIncident.eventHistory.length === 0) && (
                    <div style={{ color: '#888' }}>Brak wpisów w dzienniku.</div>
                  )}
                </div>
              </div>

              {/* Action buttons at the bottom */}
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '6px', paddingRight: '4px', alignItems: 'center' }}>
                <span style={{ fontSize: '9px', color: '#555', marginRight: 'auto', marginLeft: '10px' }}>Skrót karty: CTRL + F1</span>
                {editingIncidentId && (
                  <button className="btn-win" style={{ fontWeight: 'bold', color: '#d13438', padding: '4px 12px' }} onClick={() => {
                    if (confirm("Czy na pewno chcesz odrzucić to zgłoszenie i oznaczyć jako Błąd (BL)?")) {
                      setIncidentType('bl');
                      setTimeout(() => handleSaveIncident('processed'), 100);
                    }
                  }}>❌ Oznacz jako BŁĄD (BL)</button>
                )}
                <button className="btn-win" style={{ fontWeight: 'bold', color: '#2b8a3e', padding: '4px 20px', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => handleSaveIncident('submitted')}>
                  ✔️ Zapisz
                </button>
                <button className="btn-win" style={{ fontWeight: 'bold', color: '#d13438', padding: '4px 20px', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => setIsNewIncidentModalOpen(false)}>
                  ❌ Anuluj
                </button>
              </div>

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
          <div className="win-dialog border-outset" style={{ width: '580px' }}>
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

              {activeIncident.requiredUnits && Object.keys(activeIncident.requiredUnits).length > 0 && (
                <div style={{ background: '#fff4e6', borderLeft: '4px solid #f59f00', padding: '8px', marginBottom: '8px' }}>
                  <h5 style={{ margin: '0 0 4px 0', fontSize: '11px', color: '#d9480f' }}>Wymagane Zastępy (Zaliczenie Misji)</h5>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {Object.entries(activeIncident.requiredUnits).map(([reqType, reqCount]) => {
                      const dispatched = activeIncident.vehicles || [];
                      const count = dispatched.filter(v => v.split(' ')[0] === reqType).length;
                      const isMet = count >= reqCount;
                      return (
                        <div key={reqType} style={{ 
                          fontSize: '10px', 
                          fontWeight: 'bold',
                          padding: '2px 6px',
                          borderRadius: '2px',
                          backgroundColor: isMet ? '#d3f9d8' : '#ffe3e3',
                          color: isMet ? '#2b8a3e' : '#c92a2a',
                          border: `1px solid ${isMet ? '#8ce99a' : '#ffc9c9'}`
                        }}>
                          {reqType}: {count}/{reqCount}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
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
                <label className="input-label">Numer Rejestru Meldunków EWID-ST (zmienna {`{nr}`} do wzoru: {userProfile?.settings?.reportFormat || 'EWID/{nr}/{rok}'}):</label>
                <div style={{ display: 'flex', alignItems: 'center' }}>
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
          <div className="win-dialog border-outset" style={{ width: '400px' }}>
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
          <div className="win-dialog border-outset" style={{ width: '400px' }}>
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
                          <td style={{ border: '1px solid black', padding: '5px' }}>{vStr.split(' | ')[0].includes('|') ? vStr.split(' | ')[0].split('|')[1].trim() : vStr.split(' | ')[0]}</td>
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
            background: 'var(--win-face)',
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
            onClick={() => { 
              const inc = incidents.find(i => i.id === contextMenu.incidentId);
              if (inc) loadIncidentForEditing(inc); 
              setContextMenu(null); 
            }}
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




      
      {/* Global overlay for context menu */}
      {contextMenu && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99998 }}
          onClick={() => setContextMenu(null)}
          onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
        />
      )}
      
      {contextMenu && (
        <div 
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            background: 'var(--win-face)',
            border: '1px solid #a0a0a0',
            boxShadow: '2px 2px 5px rgba(0,0,0,0.3)',
            zIndex: 99999,
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
            onClick={() => { 
              setContextMenu(null); 
              setSelectedIncidentId(contextMenu.incidentId);
            }}
          >
            Edytuj Zdarzenie
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

      {isSisEditorOpen && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ width: '90%', height: '90vh', overflow: 'auto', background: '#e0e0e0', padding: 0 }}>
            <SisEditor
              db={db}
              userProfile={userProfile}
              onClose={() => setIsSisEditorOpen(false)}
              tenantJrgUnits={tenantJrgUnits}
              tenantOspUnits={tenantOspUnits}
              tenantVehicles={tenantVehicles}
              tenantUnitCoordinates={tenantUnitCoordinates}
              tenantOdwody={tenantOdwody}
            />
          </div>
        </div>
      )}
    </div>
  );
}



export default App;
