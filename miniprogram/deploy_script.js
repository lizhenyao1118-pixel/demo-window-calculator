const { spawn } = require('child_process');

const deploy = spawn('tcb', ['fn', 'deploy', 'generateReport', '--dir', 'cloudfunctions/generateReport', '--force'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

deploy.stdout.on('data', (data) => {
  console.log(`stdout: ${data}`);
});

deploy.stderr.on('data', (data) => {
  console.error(`stderr: ${data}`);
});

deploy.on('close', (code) => {
  console.log(`child process exited with code ${code}`);
});

// Send 'y' responses to all prompts
setTimeout(() => {
  deploy.stdin.write('y\n');
}, 2000);

setTimeout(() => {
  deploy.stdin.end();
}, 5000);