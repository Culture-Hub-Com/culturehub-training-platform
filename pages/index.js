import { useState } from "react";

export default function Home() {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const startSession = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus("");

    try {
      const res = await fetch("/api/create-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          company,
          email,
          accessCode,
          persona: "influence",   // default for now
          agentId: "agent_b9c3042ecd4b4d5a7b64e7caee", // replace with real
          attempt: 1
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || data.message || "Failed to create call");
      }

      setStatus("✅ Call created. Access token: " + data.access_token);

      // Here you’d initialise Retell SDK once we confirm it’s working
    } catch (err) {
      console.error("Error:", err);
      setStatus("❌ " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: "sans-serif", padding: "40px", textAlign: "center" }}>
      <h1>Feedback Training</h1>
      <p>Test creating a Retell call via Vercel API</p>

      <form onSubmit={startSession} style={{ maxWidth: "400px", margin: "0 auto" }}>
        <input
          type="text"
          placeholder="Your Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          style={{ display: "block", margin: "10px auto", padding: "10px", width: "100%" }}
        />
        <input
          type="text"
          placeholder="Company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          required
          style={{ display: "block", margin: "10px auto", padding: "10px", width: "100%" }}
        />
        <input
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ display: "block", margin: "10px auto", padding: "10px", width: "100%" }}
        />
        <input
          type="text"
          placeholder="Access Code"
          value={accessCode}
          onChange={(e) => setAccessCode(e.target.value)}
          required
          style={{ display: "block", margin: "10px auto", padding: "10px", width: "100%" }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            background: "purple",
            color: "white",
            padding: "10px 20px",
            borderRadius: "5px",
            marginTop: "15px",
            cursor: "pointer",
          }}
        >
          {loading ? "Starting..." : "Start Voice Training Session"}
        </button>
      </form>

      {status && (
        <div style={{ marginTop: "20px", fontWeight: "bold" }}>{status}</div>
      )}
    </div>
  );
}
