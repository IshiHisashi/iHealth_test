const express = require("express");
const axios = require("axios");
const qs = require("qs");
const cors = require("cors");
const cron = require("node-cron");

require("dotenv").config();

const app = express();
const port = process.env.PORT || 5001;

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

    console.log(response.data);

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
      // "https://api.ihealthlabs.com:8443/openapiv2/application/glucose.json",
      "https://api.ihealthlabs.com:8443/openapiv2/user/d7a4dc867a5e49fba3273496a939b6de/glucose.json",
      {
        params: {
          client_id,
          client_secret,
          access_token:
            "2zWzds6MoVqu6PxuO8i89h9ypWZsbGt-mh54gddiijmyR900cQGVfY634bndN9Tp7Uq1Tefr7GAVLHzDhYrw2KK31qvDw8saMy8RSZRMHqD7kqcer7HsbcI9T-ZFOkLqD8nItc12E8zXGM0kFJ9s21RHcGyD56qbnrVmLyQTuiaSMgzeWc3Hejwt4V0wnTW9h6H0twEFqv*3SF7*Adj3Jg",
          sc,
          sv,
        },
      }
    );
    // console.log(response.data);
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching blood glucose data:", error);
    res.status(500).send("Error fetching data");
  }
});
// Function to refresh access token
const refreshAccessToken = async (refresh_token) => {
  try {
    const response = await axios.post(
      "https://api.ihealthlabs.com:8443/OpenApiV2/OAuthv2/userauthorization/",
      qs.stringify({
        client_id,
        client_secret,
        grant_type: "refresh_token",
        refresh_token,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const { AccessToken, RefreshToken } = response.data;
    // Update tokens
    accessTokenStore["user"] = { AccessToken, RefreshToken };
    return AccessToken;
  } catch (error) {
    console.error("Error refreshing access token", error);
    throw new Error("Failed to refresh access token");
  }
};

// Scheduled task
cron.schedule("1 * * * *", async () => {
  console.log("Running scheduled task to fetch data from iHealth...");

  // Get stored tokens
  let token = accessTokenStore["user"]?.AccessToken;
  const refresh_token = accessTokenStore["user"]?.RefreshToken;

  // Refresh the token if necessary
  if (!token && refresh_token) {
    token = await refreshAccessToken(refresh_token);
  }

  if (token) {
    try {
      // Fetch blood glucose data automatically
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
      console.log("Fetched glucose data:", response.data);
    } catch (error) {
      console.error(
        "Error fetching blood glucose data in scheduled task:",
        error
      );
    }
  } else {
    console.log("No valid token available");
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
