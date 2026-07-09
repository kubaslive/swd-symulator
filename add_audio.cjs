const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

const audioInitOld = `  const [isSystemAudioEnabled, setIsSystemAudioEnabled] = useState(true);`;
const audioInitNew = `  const [isSystemAudioEnabled, setIsSystemAudioEnabled] = useState(true);
  
  // Formatka Audio Looping Logic
  useEffect(() => {
    if (!window._formatkaAudio) {
      window._formatkaAudio = new Audio('./formatka.wav');
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
  }, [incidents, isSystemAudioEnabled, userProfile]);`;
code = code.replace(audioInitOld, audioInitNew);

fs.writeFileSync('src/App.jsx', code);
