const fs = require('fs');
let content = fs.readFileSync('src/SisEditor.jsx', 'utf8');

content = content.replace(/      const tenantRef = doc\(db, 'tenants', userProfile\.tenantId\);/, `
      if (!userProfile.tenantId) {
        setError("Twoje konto nie posiada przypisanego profilu Komendy (tenantId). WSKR nie może posiadać własnej bazy SiS. Utwórz lokalne konto dyspozytora.");
        setLoading(false);
        return;
      }
      const tenantRef = doc(db, 'tenants', userProfile.tenantId);
`);

fs.writeFileSync('src/SisEditor.jsx', content);
console.log('SisEditor patched for undefined tenantId');
