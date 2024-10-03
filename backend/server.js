const express = require("express");
const axios = require("axios");
const qs = require("qs");
const cors = require("cors");

require("dotenv").config();

const app = express();
const port = process.env.PORT || 5001;

console.log(port);

app.use(cors());
app.use(express.json());

const client_id = process.env.IHEALTH_CLIENT_ID;
const client_secret = process.env.IHEALTH_CLIENT_SECRET;
const redirect_uri = process.env.IHEALTH_REDIRECT_URI;
const sc = process.env.IHEALTH_SYSTEM_SC;
const sv = process.env.IHEALTH_SYSTEM_SV;
const api_scope = "OpenApiBG";

let accessTokenStore = {}; // In-memory storage for tokens, use a DB in production

// Route to start the iHealth OAuth2 flow
app.get("/auth/ihealth", (req, res) => {
  const authUrl = `https://api.ihealthlabs.com:8443/OpenApiV2/OAuthv2/userauthorization/`;
  const params = qs.stringify({
    client_id,
    response_type: "code",
    redirect_uri,
    APIName: api_scope,
    state: "random_state_string",
  });

  res.redirect(`${authUrl}?${params}`);
});

// OAuth2 callback route - where iHealth will redirect after authorization
app.get("/auth/callback", async (req, res) => {
  const { code } = req.query;

  try {
    // Exchange authorization code for an access token
    const response = await axios.post(
      "https://api.ihealthlabs.com:8443/OpenApiV2/OAuthv2/userauthorization/",
      qs.stringify({
        client_id,
        client_secret,
        grant_type: "authorization_code",
        redirect_uri,
        code,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const { AccessToken, RefreshToken } = response.data;

    // Store tokens (in-memory or database)
    accessTokenStore["user"] = { AccessToken, RefreshToken };
    // Redirect the user back to the React frontend, indicating success
    res.redirect("http://localhost:3000/dashboard"); // Adjust frontend URL as needed
  } catch (error) {
    console.error("Error exchanging authorization code:", error);
    res.status(500).send("Authorization failed");
  }
});

// API route to fetch blood glucose data using the stored access token
app.get("/api/blood-glucose", async (req, res) => {
  const token = accessTokenStore["user"]?.AccessToken;
  console.log(token);
  if (!token) {
    return res.status(401).send("User not authenticated");
  }

  try {
    const response = await axios.get(
      "https://api.ihealthlabs.com:8443/openapiv2/application/glucose.json",
      {
        params: {
          client_id,
          client_secret,
          access_token: token,
          sc,
          sv,
        },
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching blood glucose data:", error);
    res.status(500).send("Error fetching data");
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
