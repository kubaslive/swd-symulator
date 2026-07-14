const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf-8');

const oldPointsLogic = `// AWARD POINTS IF COMPLETED!
      if (!isPartialReport && isGameModeActive) {
        setGameScore(prev => {
          const updated = prev + 100;
          localStorage.setItem('swd_game_score', updated.toString());
          return updated;
        });
        alert(\`🏆 Gratulacje!\\nZdarzenie poprawnie zlikwidowane i zarchiwizowane.\\n\\nZDOBYWASZ +100 PUNKTÓW!\`);
      }`;

const newPointsLogic = `// AWARD POINTS IF COMPLETED!
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
          alert(\`🏆 Gratulacje!\\nZdarzenie poprawnie zlikwidowane i zarchiwizowane.\\n\\nZDOBYWASZ +100 PUNKTÓW!\`);
        }
      }`;

content = content.replace(oldPointsLogic, newPointsLogic);
fs.writeFileSync('src/App.jsx', content);
