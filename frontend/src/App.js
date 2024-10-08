import React, { useState } from "react";
import axios from "axios";

function App() {
  const [glucoseData, setGlucoseData] = useState(null);
  const [error, setError] = useState("");
  const [timeSpan, setTimeSpan] = useState("");
  const userId = "670202f50b3e86123bd741e4";

  // Start the OAuth2 flow by redirecting to the backend
  const handleConnectIHealth = () => {
    window.location.href =
      "http://localhost:5000/auth/ihealth?id=670202f50b3e86123bd741e4"; // Redirect to backend for iHealth login
  };

  // Fetch blood glucose data using GraphQL via Axios
  const fetchGlucoseData = async () => {
    const graphqlQuery = {
      query: `
        query detectAndStoreUnconfirmedResults($user_id: ID!, $timeSpan: String) {
          detectAndStoreUnconfirmedResults(user_id: $user_id, timeSpan: $timeSpan) {
            dataID
            bsl
            log_timestamp
            confirmed
          }
        }
      `,
      variables: {
        user_id: userId,
        timeSpan: timeSpan || null,
      },
    };

    try {
      const response = await axios.post(
        "http://localhost:5000/graphql", // GraphQL endpoint
        graphqlQuery,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      setGlucoseData(response.data.data.detectAndStoreUnconfirmedResults);
    } catch (err) {
      setError("Error fetching blood glucose data");
    }
  };

  return (
    <div className="App" style={{ padding: 20 }}>
      <h1>iHealth Integration Example</h1>

      <button onClick={handleConnectIHealth}>Connect iHealth</button>

      <div style={{ marginTop: 20 }}>
        <label htmlFor="timeSpan">Select Time Span: </label>
        <select
          id="timeSpan"
          value={timeSpan}
          onChange={(e) => setTimeSpan(e.target.value)}
        >
          <option value="">All Time</option>
          <option value="24h">Last 24 Hours</option>
          <option value="1w">Last Week</option>
          <option value="2w">Last 2 Weeks</option>
          <option value="1m">Last Month</option>
        </select>
      </div>

      <button onClick={fetchGlucoseData} style={{ marginLeft: 10 }}>
        Fetch Blood Glucose Data
      </button>

      {glucoseData && (
        <div>
          <h2>Blood Glucose Data:</h2>
          <pre>{JSON.stringify(glucoseData, null, 2)}</pre>
        </div>
      )}

      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}

export default App;
