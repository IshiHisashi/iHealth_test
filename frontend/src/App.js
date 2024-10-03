import React, { useState } from "react";
import axios from "axios";

function App() {
  const [glucoseData, setGlucoseData] = useState(null);
  const [error, setError] = useState("");
  // Start the OAuth2 flow by redirecting to the backend
  const handleConnectIHealth = () => {
    window.location.href = "http://localhost:5000/auth/ihealth"; // Redirect to backend for iHealth login
  };
  // Fetch blood glucose data from the backend
  const fetchGlucoseData = async () => {
    try {
      const response = await axios.get(
        "http://localhost:5000/api/blood-glucose"
      );
      setGlucoseData(response.data);
    } catch (err) {
      setError("Error fetching blood glucose data");
    }
  };

  return (
    <div className="App" style={{ padding: 20 }}>
      <h1>iHealth Integration Example</h1>

      <button onClick={handleConnectIHealth}>Connect iHealth</button>

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
