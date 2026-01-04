const express = require("express");
const { execSync } = require("node:child_process");
require("dotenv").config();

const app = express();
app.use(express.json());

const { DEPLOY_TOKEN } = process.env;
if (!DEPLOY_TOKEN) {
  console.error("DEPLOY_TOKEN is required");
  process.exit(1);
}

app.post("/deploy", (req, res) => {
  const token = req.header("x-deploy-token");
  if (!token || token !== DEPLOY_TOKEN) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    execSync("node ../scripts/deploy.js", { stdio: "inherit" });
    return res.status(202).json({ status: "Deploy started" });
  } catch (error) {
    return res.status(500).json({ error: "Deploy failed" });
  }
});

app.get("/health", (_req, res) => res.json({ status: "ok" }));

const port = Number(process.env.PORT || 5050);
app.listen(port, () => {
  console.log(`Deploy service listening on ${port}`);
});
