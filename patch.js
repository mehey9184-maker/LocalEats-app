const fs = require('fs');
const code = fs.readFileSync('src/App.tsx', 'utf8');
const lines = code.split('\n');

const toReplaceStart = 4148;
const toReplaceEnd = 4158;

const newLines = `                  stalenessThresholdMs={stalenessThresholdMs}
                  onUpdateStalenessThreshold={setStalenessThresholdMs}
                  heartbeatMetrics={heartbeatMetrics}
                  isPingingHeartbeat={isPingingHeartbeat}
                  onRunHeartbeatPing={runHeartbeatPing}
                />
              )}
              {currentScreen === "profile" && (`.split('\n');

lines.splice(toReplaceStart, toReplaceEnd - toReplaceStart + 1, ...newLines);
fs.writeFileSync('src/App.tsx', lines.join('\n'));
