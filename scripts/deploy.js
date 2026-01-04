const { execSync } = require("node:child_process");

const required = ["SSH_HOST", "SSH_USER", "DEPLOY_PATH", "REPO_URL", "BRANCH"];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Missing env vars: ${missing.join(", ")}`);
  process.exit(1);
}

const {
  SSH_HOST,
  SSH_USER,
  SSH_KEY_PATH,
  DEPLOY_PATH,
  REPO_URL,
  BRANCH
} = process.env;

const remoteCommands = [
  "set -e",
  `if [ ! -d "${DEPLOY_PATH}/.git" ]; then git clone --branch ${BRANCH} ${REPO_URL} ${DEPLOY_PATH}; fi`,
  `cd ${DEPLOY_PATH}`,
  `git fetch origin`,
  `git checkout ${BRANCH}`,
  `git pull --ff-only origin ${BRANCH}`,
  "docker compose up -d --build"
];

const sshArgs = [];
if (SSH_KEY_PATH) {
  sshArgs.push("-i", SSH_KEY_PATH);
}
sshArgs.push(`${SSH_USER}@${SSH_HOST}`, remoteCommands.join(" && "));

const command = `ssh ${sshArgs.map((arg) => `"${arg}"`).join(" ")}`;
execSync(command, { stdio: "inherit" });
