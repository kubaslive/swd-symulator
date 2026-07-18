const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// I will just use replace to fix the braces issue at the end of the manual trigger function.
// Let's replace the last part of my injected code where the braces are.
const badSyntax = `        } catch(e) { console.error(e); }
      };
      }
    }

  }, [activeRole`;

const goodSyntax = `        } catch(e) { console.error(e); }
      };
    }

  }, [activeRole`;

code = code.replace(badSyntax, goodSyntax);
fs.writeFileSync('src/App.jsx', code);
