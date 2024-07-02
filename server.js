import express from 'express';
import fetch from 'node-fetch';
import session from 'express-session';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(express.static(__dirname));

const redirect_uri = `http://localhost:3000/callback`;
const client_id = "dfa9b1026a55431a82843e90bd11c2b9";
const client_secret = "4dcedf731869434c86ea3efdf58b7aa7";

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/authorize", (req, res) => {
  var auth_query_parameters = new URLSearchParams({
    response_type: "code",
    client_id: client_id,
    scope: "user-library-read",
    redirect_uri: redirect_uri,
  });

  res.redirect("https://accounts.spotify.com/authorize?" + auth_query_parameters.toString());
});

app.get("/callback", async (req, res) => {
  const code = req.query.code;

  var body = new URLSearchParams({
    code: code,
    redirect_uri: redirect_uri,
    grant_type: "authorization_code",
  });

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "post",
    body: body,
    headers: {
      "Content-type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + Buffer.from(client_id + ":" + client_secret).toString("base64"),
    },
  });

  const data = await response.json();
  req.session.access_token = data.access_token;

  res.redirect("/dashboard");
});

async function getData(endpoint, access_token) {
  const response = await fetch("https://api.spotify.com/v1" + endpoint, {
    method: "get",
    headers: {
      Authorization: "Bearer " + access_token,
    },
  });

  const data = await response.json();
  return data;
}

app.get("/dashboard", async (req, res) => {
  const access_token = req.session.access_token;
  if (!access_token) {
    return res.redirect('/');
  }

  const userInfo = await getData("/me", access_token);
  const tracks = await getData("/me/tracks?limit=50", access_token);

  res.render("dashboard", { user: userInfo, tracks: tracks.items });
});

app.get('/getGenre', (req, res) => {
  const { previewUrl } = req.query;

  if (!previewUrl) {
    return res.status(400).send('Missing previewUrl parameter');
  }

  console.log(`Received previewUrl: ${previewUrl}`);

  const pythonPath = '/Library/Frameworks/Python.framework/Versions/3.10/bin/python3';  // Update to your correct Python path
  const scriptPath = path.join(__dirname, 'getGenre.py');
  const pythonProcess = spawn(pythonPath, [scriptPath, previewUrl]);

  let pythonOutput = '';

  pythonProcess.stdout.on('data', (data) => {
    pythonOutput += data.toString();
  });

  pythonProcess.stdout.on('end', () => {
    console.log(`Python script output: ${pythonOutput}`);
    res.send(pythonOutput);
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`Error from Python script: ${data}`);
    res.status(500).send(`Error from Python script: ${data}`);
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.redirect('/');
    }
    res.clearCookie('connect.sid', { path: '/' });
    res.redirect('/');
  });
});

let listener = app.listen(3000, 'localhost', function () {
  console.log("Your app is listening on http://localhost:" + listener.address().port);
});
