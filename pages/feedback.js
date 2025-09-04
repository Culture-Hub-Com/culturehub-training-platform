import { useState } from "react";

export default function Feedback() {
  const [selectedPersona, setSelectedPersona] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [consent, setConsent] = useState(false);

  const personas = [
    { id: "D", label: "High D", desc: "Direct, fast-paced, decisive" },
    { id: "I", label: "High I", desc: "Enthusiastic, talkative, people-focused" },
    { id: "S", label: "High S", desc: "Patient, calm, team-oriented" },
    { id: "C", label: "High C", desc: "Detail-focused, analytical, cautious" },
  ];

  const handlePersonaClick = (id) => {
    setSelectedPersona(id);
    const formElement = document.getElementById("feedback-form");
    if (formElement) {
      formElement.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!consent) return alert("You must give consent to continue.");

    try {
      const response = await fetch("/api/create-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario: "feedback",
          persona: selectedPersona,
          name,
          email,
          company,
        }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Error starting simulation:", err);
    }
  };

  return (
    <div className="page">
      <div className="container">
        <h1 className="title">Feedback Simulation</h1>
        <p className="intro">
          Choose a persona to practise giving feedback to. Each persona behaves
          differently, based on DISC styles.
        </p>

        <div className="persona-grid">
          {personas.map((p) => (
            <div
              key={p.id}
              className={`persona-card ${
                selectedPersona === p.id ? "selected" : ""
              }`}
              onClick={() => handlePersonaClick(p.id)}
            >
              <h2>{p.label}</h2>
              <p>{p.desc}</p>
            </div>
          ))}
        </div>

        {selectedPersona && (
          <form id="feedback-form" className="form" onSubmit={handleSubmit}>
            <h2 className="form-title">Your Details</h2>

            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Company</label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>

            {/* ✅ Updated consent section with recording note */}
            <div className="form-group consent-row">
              <label className="consent-label">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                <span>
                  I consent to the processing of my data for the purpose of
                  running this simulation and sending me my report.{" "}
                  <strong>
                    For training purposes, this session’s audio and transcript
                    are recorded
                  </strong>{" "}
                  and will only be used to generate your feedback and improve
                  the experience. I have read the{" "}
                  <a
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Privacy Notice
                  </a>
                  .
                </span>
              </label>
            </div>

            <button
              type="submit"
              className="submit-btn"
              disabled={!consent || !name || !email}
            >
              Start Simulation
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
