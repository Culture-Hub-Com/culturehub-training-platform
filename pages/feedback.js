import Head from "next/head";
import { useEffect, useRef, useState, useMemo } from "react";

export default function Feedback() {
  // ——— Retell SDK client (loaded only in the browser) ———
  const retellRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const mod = await import("retell-client-js-sdk");
        if (!mounted) return;
        const client = new mod.RetellWebClient();
        client.on("call-started", () => {
          console.log("Retell: call-started");
          setIsInCall(true);
          setIsStarting(false);
        });
        client.on("call-ended", () => {
          console.log("Retell: call-ended");
          setIsInCall(false);
        });
        client.on("error", (e) => console.error("Retell SDK error:", e));
        retellRef.current = client;
        console.log("Retell SDK initialised");
      } catch (e) {
        console.error("Failed to initialise Retell SDK:", e);
      }
    })();
    return () => {
      mounted = false;
      retellRef.current = null;
    };
  }, []);

  // ——— UI State (matches your original behaviour) ———
  const [selectedPersona, setSelectedPersona] = useState(null);
  const [selectedAgentId, setSelectedAgentId] = useState(null);
  const [attempt, setAttempt] = useState(1);

  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [accessCode, setAccessCode] = useState("");

  const [status, setStatus] = useState({ type: "", text: "" }); // 'success' | 'error' | ''
  const [isStarting, setIsStarting] = useState(false);
  const [isInCall, setIsInCall] = useState(false);

  const emailOK = useMemo(
    () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()),
    [email]
  );

  const canSubmit =
    !!selectedPersona &&
    !!selectedAgentId &&
    !!name.trim() &&
    !!company.trim() &&
    !!email.trim() &&
    emailOK &&
    !!accessCode.trim() &&
    !isStarting &&
    !isInCall;

  const personaCards = [
    {
      key: "dominance",
      title: "High Dominance",
      letter: "D",
      iconClass: "persona-d",
      desc:
        "Direct, results-focused, and competitive. May be defensive or pushback against feedback. Values efficiency and bottom-line impact.",
      agentId: "agent_placeholder_d",
    },
    {
      key: "influence",
      title: "High Influence",
      letter: "I",
      iconClass: "persona-i",
      desc:
        "Enthusiastic, people-oriented, and optimistic. May take feedback personally or become emotional. Values relationships and recognition.",
      agentId: "agent_b9c3042ecd4b4d5a7b64e7caee", // live agent
    },
    {
      key: "steadiness",
      title: "High Steadiness",
      letter: "S",
      iconClass: "persona-s",
      desc:
        "Calm, supportive, and collaborative. May avoid confrontation or need reassurance. Values stability and team harmony.",
      agentId: "agent_placeholder_s",
    },
    {
      key: "conscientiousness",
      title: "High Conscientiousness",
      letter: "C",
      iconClass: "persona-c",
      desc:
        "Analytical, detail-oriented, and systematic. May question feedback validity or need specific examples. Values accuracy and quality.",
      agentId: "agent_placeholder_c",
    },
  ];

  function showStatus(text, type) {
    setStatus({ text, type });
  }
  function hideStatus() {
    setStatus({ text: "", type: "" });
  }

  // ——— Start Voice Session ———
  async function onSubmit(e) {
    e.preventDefault();
    hideStatus();

    if (isStarting || isInCall) return; // guard double-fire

    if (!selectedPersona || !selectedAgentId) {
      showStatus("Please select a personality type first.", "error");
      return;
    }
    if (String(selectedAgentId).includes("placeholder")) {
      const card = personaCards.find((c) => c.key === selectedPersona);
      showStatus(
        `${card?.title || "This"} personality is coming soon! Please try High Influence for now.`,
        "error"
      );
      return;
    }
    if (!retellRef.current) {
      showStatus("Retell SDK not initialised yet. Give it a moment, then try again.", "error");
      return;
    }

    setIsStarting(true);

    const payload = {
      name: name.trim(),
      company: company.trim(),
      email: email.trim(),
      accessCode: accessCode.trim(),
      persona: selectedPersona,
      agentId: selectedAgentId,
      scenario: "feedback",
      attempt,
    };

    try {
      // 1) Get short-lived access token from our API
      const res = await fetch("/api/create-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.message || "Failed to create call");
      if (!data.access_token) throw new Error("No access token returned from server.");

      // 2) Start the Retell call
      await retellRef.current.startCall({ accessToken: data.access_token });
      setIsInCall(true);
      setIsStarting(false);
      showStatus("Connected! You can start speaking.", "success");
    } catch (err) {
      console.error(err);
      setIsStarting(false);
      showStatus(err.message || "Failed to start training session. Please try again.", "error");
    }
  }

  // ——— End Voice Session ———
  async function endSession() {
    try {
      if (retellRef.current) {
        await retellRef.current.stopCall();
      }
    } catch (e) {
      console.error("Error stopping call:", e);
    } finally {
      setIsInCall(false);
      setIsStarting(false);
      showStatus("Training session completed!", "success");
    }
  }

  return (
    <>
      <Head>
        <title>Feedback Training</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Font to match original */}
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>

      {/* Floating color swirls */}
      <div className="color-swirl swirl-1" />
      <div className="color-swirl swirl-2" />
      <div className="color-swirl swirl-3" />

      <div className="container">
        <header className="header">
          <div className="logo-container">
            <img src="/logo.png" alt="Logo" className="logo-image" />
          </div>
          <h1 className="main-title">Feedback Scenario Training</h1>
          <p className="subtitle">
            Practice giving constructive feedback using the SBI framework. Choose your conversation
            partner&apos;s personality type below.
          </p>
        </header>

        <main>
          {/* Persona Grid */}
          <section className="personas-grid" id="personasGrid">
            {personaCards.map((card) => {
              const selected = selectedPersona === card.key;
              return (
                <div
                  key={card.key}
                  className={`persona-card${selected ? " selected" : ""}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setSelectedPersona(card.key);
                    setSelectedAgentId(card.agentId);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      setSelectedPersona(card.key);
                      setSelectedAgentId(card.agentId);
                    }
                  }}
                >
                  <div className={`persona-icon ${card.iconClass}`}>{card.letter}</div>
                  <h3 className="persona-title">{card.title}</h3>
                  <p className="persona-description">{card.desc}</p>
                  {selected && <div className="selection-indicator">✓</div>}
                </div>
              );
            })}
          </section>

          {/* Form */}
          <section className={`form-section ${selectedPersona ? "visible" : ""}`} id="participantForm">
            <h3 className="form-title">
              {selectedPersona
                ? `Training with ${
                    personaCards.find((c) => c.key === selectedPersona)?.title
                  } Employee`
                : "Ready to Start Your Training"}
            </h3>

            {/* IMPORTANT: form hidden during call to avoid accidental submit */}
            <form id="trainingForm" onSubmit={onSubmit} style={{ display: isInCall ? "none" : "block" }}>
              <div className="attempt-selector">
                <label className="form-label">Training Attempt</label>
                <div className="attempt-buttons">
                  <div
                    className={`attempt-button ${attempt === 1 ? "selected" : ""}`}
                    onClick={() => setAttempt(1)}
                    role="button"
                    tabIndex={0}
                  >
                    Attempt 1 (Before Training)
                  </div>
                  <div
                    className={`attempt-button ${attempt === 2 ? "selected" : ""}`}
                    onClick={() => setAttempt(2)}
                    role="button"
                    tabIndex={0}
                  >
                    Attempt 2 (After Training)
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="participantName">Your Name</label>
                <input
                  id="participantName"
                  className="form-input"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  type="text"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="participantCompany">Company</label>
                <input
                  id="participantCompany"
                  className="form-input"
                  placeholder="Your company name"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  required
                  type="text"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="participantEmail">Email Address</label>
                <input
                  id="participantEmail"
                  className="form-input"
                  placeholder="your.email@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  type="email"
                  style={
                    email && !emailOK
                      ? { borderColor: "#dc2626", boxShadow: "0 0 0 3px rgba(220, 38, 38, 0.2)" }
                      : undefined
                  }
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="accessCode">Access Code</label>
                <input
                  id="accessCode"
                  className="form-input"
                  placeholder="Enter your training access code"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  required
                  type="text"
                />
              </div>

              <button
                type="submit"
                className="start-button"
                id="startButton"
                disabled={!canSubmit}
              >
                {isStarting ? "Connecting…" : "Start Voice Training Session"}
              </button>
            </form>

            {/* Loading indicator */}
            <div className={`loading ${isStarting ? "visible" : ""}`} id="loadingIndicator">
              <div className="spinner"></div>
              <p>Connecting to your training session...</p>
            </div>

            {/* End call button (separate from form; type=button) */}
            {isInCall && (
              <button
                id="end-session-btn"
                type="button"
                className="start-button"
                style={{ background: "linear-gradient(135deg, #dc2626, #b91c1c)", marginTop: 20 }}
                onClick={endSession}
              >
                End Training Session
              </button>
            )}

            {/* Status */}
            {!!status.text && (
              <div
                id="statusMessage"
                className={`status-message ${status.type === "error" ? "status-error" : "status-success"}`}
                style={{ display: "block" }}
              >
                {status.text}
              </div>
            )}
          </section>
        </main>
      </div>

      {/* —— EXACT CSS from your original page (global) —— */}
      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Poppins', sans-serif;
          background: #000000;
          min-height: 100vh;
          color: white;
          overflow-x: hidden;
          position: relative;
        }
        .color-swirl {
          position: fixed;
          border-radius: 50%;
          filter: blur(60px);
          opacity: 0.4;
          animation: float 20s infinite ease-in-out;
          pointer-events: none;
          z-index: 0;
        }
        .swirl-1 { width: 300px; height: 300px; background: radial-gradient(circle, rgba(248, 91, 246, 0.3), transparent); top: 10%; left: 10%; animation-delay: 0s; }
        .swirl-2 { width: 200px; height: 200px; background: radial-gradient(circle, rgba(78, 110, 243, 0.25), transparent); top: 50%; right: 15%; animation-delay: -7s; }
        .swirl-3 { width: 250px; height: 250px; background: radial-gradient(circle, rgba(0, 247, 235, 0.2), transparent); bottom: 20%; left: 20%; animation-delay: -14s; }
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px) scale(1); }
          25% { transform: translateY(-20px) translateX(10px) scale(1.1); }
          50% { transform: translateY(-10px) translateX(-10px) scale(0.9); }
          75% { transform: translateY(-30px) translateX(5px) scale(1.05); }
        }
        .container { position: relative; z-index: 10; max-width: 1200px; margin: 0 auto; padding: 40px 20px; min-height: 100vh; }
        .header { text-align: center; margin-bottom: 60px; }
        .logo-container { display: flex; align-items: center; justify-content: center; margin-bottom: 30px; }
        .logo-image { max-width: 350px; height: auto; margin-bottom: 40px; }
        .main-title { font-size: 2.5rem; font-weight: 600; margin-bottom: 15px; }
        .subtitle { font-size: 1.2rem; color: rgba(255, 255, 255, 0.8); max-width: 600px; margin: 0 auto 50px; line-height: 1.6; }
        .personas-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 30px; margin-bottom: 50px; }
        .persona-card {
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px; padding: 30px; text-align: center;
          transition: all 0.3s ease; cursor: pointer; position: relative; overflow: hidden;
        }
        .persona-card::before {
          content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
          transition: left 0.5s ease;
        }
        .persona-card:hover::before { left: 100%; }
        .persona-card:hover { transform: translateY(-5px); background: rgba(255, 255, 255, 0.12); border-color: rgba(255, 255, 255, 0.2); }
        .persona-card.selected { background: rgba(248, 91, 246, 0.2); border-color: #f85bf6; transform: scale(1.02); }
        .persona-icon { width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; font-weight: 700; color: white; position: relative; }
        .persona-d { background: linear-gradient(135deg, #dc2626, #b91c1c); }
        .persona-i { background: linear-gradient(135deg, #fbbf24, #f59e0b); }
        .persona-s { background: linear-gradient(135deg, #10b981, #059669); }
        .persona-c { background: linear-gradient(135deg, #3b82f6, #2563eb); }
        .persona-title { font-size: 1.4rem; font-weight: 600; margin-bottom: 10px; }
        .persona-description { font-size: 0.95rem; color: rgba(255, 255, 255, 0.8); line-height: 1.6; }
        .selection-indicator { position: absolute; top: 15px; right: 15px; width: 24px; height: 24px; background: #f85bf6; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; }
        .form-section {
          background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(15px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px; padding: 40px; max-width: 500px; margin: 0 auto;
          opacity: 0; transform: translateY(20px); transition: all 0.3s ease;
        }
        .form-section.visible { opacity: 1; transform: translateY(0); }
        .form-title { font-size: 1.8rem; font-weight: 600; text-align: center; margin-bottom: 30px; }
        .form-group { margin-bottom: 25px; }
        .form-label { display: block; font-size: 0.95rem; font-weight: 500; margin-bottom: 8px; color: rgba(255, 255, 255, 0.9); }
        .form-input {
          width: 100%; padding: 15px 20px; border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px; background: rgba(255, 255, 255, 0.08); color: white;
          font-size: 1rem; font-family: 'Poppins', sans-serif; transition: all 0.3s ease;
        }
        .form-input:focus {
          outline: none; border-color: #f85bf6; background: rgba(255, 255, 255, 0.12);
          box-shadow: 0 0 0 3px rgba(248, 91, 246, 0.2);
        }
        .form-input::placeholder { color: rgba(255, 255, 255, 0.5); }
        .start-button {
          width: 100%; padding: 18px; background: linear-gradient(135deg, #f85bf6, #c622f0);
          border: none; border-radius: 12px; color: white; font-size: 1.1rem; font-weight: 600;
          font-family: 'Poppins', sans-serif; cursor: pointer; transition: all 0.3s ease;
          margin-top: 10px; display: flex; align-items: center; justify-content: center; gap: 10px;
        }
        .start-button:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 25px rgba(248, 91, 246, 0.3); }
        .start-button:disabled { background: rgba(255, 255, 255, 0.2); cursor: not-allowed; transform: none; box-shadow: none; }
        .status-message { text-align: center; padding: 15px; border-radius: 10px; margin-top: 20px; font-weight: 500; }
        .status-error { background: rgba(255, 99, 71, 0.2); border: 1px solid rgba(255, 99, 71, 0.5); color: #ffcccb; }
        .status-success { background: rgba(0, 247, 235, 0.2); border: 1px solid rgba(0, 247, 235, 0.5); color: #00f7eb; }
        .loading { display: none; text-align: center; padding: 20px; }
        .loading.visible { display: block; }
        .spinner {
          border: 3px solid rgba(255, 255, 255, 0.3); border-radius: 50%;
          border-top: 3px solid #f85bf6; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 15px;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .attempt-selector { margin-bottom: 25px; }
        .attempt-buttons { display: flex; gap: 10px; justify-content: center; }
        .attempt-button {
          padding: 10px 20px; border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px; background: rgba(255, 255, 255, 0.08); color: white; cursor: pointer;
          transition: all 0.3s ease; font-family: 'Poppins', sans-serif; font-size: 0.9rem;
        }
        .attempt-button.selected { background: linear-gradient(135deg, #f85bf6, #c622f0); border-color: #f85bf6; }
        @media (max-width: 768px) {
          .container { padding: 20px 15px; }
          .main-title { font-size: 2rem; }
          .personas-grid { grid-template-columns: 1fr; gap: 20px; }
          .form-section { padding: 30px 20px; }
        }
      `}</style>
    </>
  );
}
