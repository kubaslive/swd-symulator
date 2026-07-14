const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf-8');

content = content.replace("const isCompleted = !!times.completion || incident.status === 'processed' || incident.isArchived;", 
                          "const isIncCompleted = !!times.completion || incident.status === 'processed' || incident.isArchived;");

content = content.replace(/if \(isCompleted\) stateLabel/g, "if (isIncCompleted) stateLabel");
content = content.replace(/stateLabel = isCompleted \?/g, "stateLabel = isIncCompleted ?");

fs.writeFileSync('src/App.jsx', content);
