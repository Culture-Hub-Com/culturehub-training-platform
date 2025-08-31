// pages/feedback.js
import { useEffect, useMemo, useState } from "react";

// Small hook to load Retell SDK in the browser (avoids SSR issues)
function useRetellClient() {
  const [retell, setRetell] = useState(null);
  useEffect(() => {
    let mounted = true;
    // Dynamic import so Next.js doesn't try to load it on the server
    import("retell-client-js-sdk")
      .then((m) => {
        if (!mounted) return;
        const client = new m.RetellWebClient();
        // Helpful logs
        client.on("call-started", () => console.log("Retell: call-started"));
        client.on("call-ended", () => console.log("Retell: call-ended"));
        client.on("error", (e) => console.error("Retell error:", e));
        setRetell(client);
      })
      .catch((e) => console.error("Failed to load Retell SDK:", e));
    return () => { mounted = false; };
  }, []);
  return retell;
}

const personaCards = [
  {
    key: "dominance",
    title: "High Dominance",
    emoji: "D",
    desc:
      "Direct, results-focused, and competitive. May push back against feedback. Values efficiency and bottom-line impact.",
    agentId: "agent_placeholder_d",
  },
  {
    key: "influence",
    title: "High Influence",
    emoji: "I",
    desc:
      "Enthusiastic, people-oriented, and optimistic. May take feedback personally. Values relationships and recognition.",
    agentId: "agent_b9c3042ecd4b4d5a7b64e7caee", // <- known working agent
  },
  {
    key: "steadiness",
    title: "High Steadiness",
    emoji: "S",
    desc:
      "Calm, supportive, and collaborative. May avoid confrontation. Values stability and team harmony.",
    agentId: "agent_placeholder_s",
  },
  {
    key: "conscientiousness",
    title: "High Conscientiousness",
    emoji: "C",
    desc:
      "Analytical, detail-oriented, and systematic. May question validity; wants specifics. Values accuracy and quality.",
    agentId: "agent_placeholder_c",
  },
];

export default function FeedbackPage() {
  const retell = useRetellClient();

  // UI state
  const [selectedPersona, setSelectedPersona] = useState(null);
  const [selectedAgentId, setSelectedAgentId] = useState(null);
  const [attempt, setAttempt] = useState(1);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [inCall, setInCall] = useState(false);

  const canSubmit =
    !!selectedPersona &&
    !!selectedAgentId &&
    !!name.trim() &&
    !!company.trim() &&
    !!email.trim() &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    !!accessCode.trim();

  async function startSession(e) {
    e.preventDefault();
    setStatus("");
    if (!retell) {
      setStatus("Retell SDK not initialised (still loading). Give it a second and try again.");
      return;
    }
    if (!canSubmit) {
      setStatus("Please complete the form and select a personality.");
      return;
    }
    if (String(selectedAgentId).includes("placeholder")) {
      setStatus("That personality is coming soon. Please choose High Influence for now.");
      return;
    }

    try {
      setBusy(true);

      // 1) Ask our API for a short-lived access token
      const res = await fetch("/api/create-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          company,
          email,
          accessCode,
          persona: selectedPersona,
          agentId: selectedAgentId,
          scenario: "feedback",
          attempt,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.message || "Failed to create call");
      if (!data.access_token) throw new Error("No access_token returned from server.");

      // 2) Start the Retell voice call
      await retell.startCall({ accessToken: data.access_token });
      setInCall(true);
      setStatus("Connected — start talking when you hear the agent.");

    } catch (err) {
      console.error(err);
      setStatus(`Failed to connect: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function endSession() {
    try {
      if (retell) await retell.stopCall();
      setInCall(false);
      setStatus("Session ended. Nice work.");
    } catch (e) {
      console.error(e);
      setStatus("Tried to end the session but something went odd.");
    }
  }

  // Styles kept inline for simplicity (we can move to CSS later)
  const Card = ({ p }) => (
    <button
      onClick={() => {
        setSelectedPersona(p.key);
        setSelectedAgentId(p.agentId);
      }}
      aria-pressed={selectedPersona === p.key}
      style={{
        textAlign: "left",
        padding: 20,
        borderRadius: 16,
        border: `1px solid ${selectedPersona === p.key ? "#f85bf6" : "rgba(255,255,255,0.15)"}`,
        background:
          selectedPersona === p.key ? "rgba(248, 91, 246, 0.2)" : "rgba(255,255,255,0.08)",
        cursor: "pointer",
        transition: "transform .15s ease, background .15s ease, border .15s ease",
      }}
    >
      <div style={{
        width: 56, height: 56, borderRadius: "50%",
        display: "grid", placeItems: "center", fontWeight: 700, marginBottom: 12,
        background: {
          dominance: "linear-gradient(135deg,#dc2626,#b91c1c)",
          influence: "linear-gradient(135deg,#fbbf24,#f59e0b)",
          steadiness: "linear-gradient(135deg,#10b981,#059669)",
          conscientiousness: "linear-gradient(135deg,#3b82f6,#2563eb)",
        }[p.key], color: "#fff"
      }}>
        {p.emoji}
      </div>
      <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 6 }}>{p.title}</div>
      <div style={{ opacity: 0.8, lineHeight: 1.5, fontSize: 14 }}>{p.desc}</div>
    </button>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#000", color: "#fff", fontFamily: "Poppins, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif" }}>
      {/* Header */}
      <header style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 20px", textAlign: "center" }}>
        <img alt="CultureHub" src="/logo.png" style={{ width: 220, height: "auto", margin: "0 auto 24px" }} />
        <h1 style={{ fontSize: 36, fontWeight: 700, marginBottom: 8 }}>
          Feedback Scenario Training
        </h1>
        <p style={{ opacity: 0.8, maxWidth: 700, margin: "0 auto" }}>
          Practice giving constructive feedback using the SBI framework. Choose your conversation
          partner’s personality type below.
        </p>
      </header>

      {/* Grid + Form */}
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px 64px" }}>
        {/* Persona Grid */}
        <section style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 20,
          marginBottom: 32,
        }}>
          {personaCards.map((p) => <Card key={p.key} p={p} />)}
        </section>

        {/* Form */}
        <section style={{
          maxWidth: 520, margin: "0 auto",
          padding: 24,
          borderRadius: 16,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.14)"
        }}>
          <h2 style={{ textAlign: "center", marginBottom: 16 }}>
            {selectedPersona ? `Training with ${personaCards.find(x=>x.key===selectedPersona)?.title}` : "Your Details"}
          </h2>

          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 16 }}>
            <button
              onClick={() => setAttempt(1)}
              className={attempt === 1 ? "active" : ""}
              style={attemptBtn(attempt === 1)}
              type="button"
            >
              Attempt 1 (Before Training)
            </button>
            <button
              onClick={() => setAttempt(2)}
              className={attempt === 2 ? "active" : ""}
              style={attemptBtn(attempt === 2)}
              type="button"
            >
              Attempt 2 (After Training)
            </button>
          </div>

          <form onSubmit={startSession}>
            <Input label="Your Name" value={name} onChange={setName} placeholder="Jane Smith" />
            <Input label="Company" value={company} onChange={setCompany} placeholder="CultureHub" />
            <Input label="Email Address" value={email} onChange={setEmail} type="email" placeholder="you@company.com" />
            <Input label="Access Code" value={accessCode} onChange={setAccessCode} placeholder="Enter your access code" />

            {!inCall ? (
              <button disabled={!canSubmit || busy} style={cta}>
                {busy ? "Connecting…" : "Start Voice Training Session"}
              </button>
            ) : (
              <button type="button" onClick={endSession} style={{ ...cta, background: "linear-gradient(135deg,#dc2626,#b91c1c)" }}>
                End Training Session
              </button>
            )}
          </form>

          {status && (
            <div style={{
              marginTop: 14, padding: 12, borderRadius: 10,
              background: status.startsWith("Failed") ? "rgba(255,99,71,.18)" : "rgba(0,247,235,.14)",
              border: `1px solid ${status.startsWith("Failed") ? "rgba(255,99,71,.5)" : "rgba(0,247,235,.45)"}`
            }}>
              {status}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

// —————————————————— small UI bits ——————————————————
function Input({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <label style={{ display: "block", width: "100%", marginBottom: 14 }}>
      <div style={{ fontSize: 14, marginBottom: 6, opacity: 0.9 }}>{label}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: "14px 16px",
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,.2)",
          background: "rgba(255,255,255,.08)",
          color: "#fff",
          outline: "none",
        }}
      />
    </label>
  );
}

const cta = {
  width: "100%",
  padding: 16,
  marginTop: 6,
  border: "none",
  borderRadius: 12,
  background: "linear-gradient(135deg,#f85bf6,#c622f0)",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};

const attemptBtn = (active) => ({
  padding: "10px 14px",
  borderRadius: 8,
  border: active ? "1px solid #f85bf6" : "1px solid rgba(255,255,255,.2)",
  background: active ? "linear-gradient(135deg,#f85bf6,#c622f0)" : "rgba(255,255,255,.08)",
  color: "#fff",
  cursor: "pointer",
});
