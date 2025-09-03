// pages/privacy.js
import Link from "next/link";

export default function Privacy() {
  return (
    <div
      style={{
        padding: "40px",
        maxWidth: "880px",
        margin: "0 auto",
        color: "white",
        fontFamily: "Poppins, sans-serif",
        lineHeight: 1.7,
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "30px" }}>
        <img
          src="/logo.png"
          alt="CultureHub"
          style={{
            maxWidth: "260px",
            height: "auto",
            filter: "drop-shadow(0 0 20px rgba(248, 91, 246, 0.25))",
          }}
        />
      </div>

      <h1 style={{ marginBottom: "16px" }}>Privacy Notice</h1>
      <p style={{ marginBottom: "20px" }}>
        We take your privacy seriously. This page explains how we collect and
        use your data during training simulations.
      </p>

      <h2 style={{ marginTop: "28px", marginBottom: "10px" }}>What we collect</h2>
      <p style={{ marginBottom: "18px" }}>
        Your name, company, email address, access code, selected DISC persona,
        attempt number, and the training conversation transcript.
      </p>

      <h2 style={{ marginTop: "28px", marginBottom: "10px" }}>Why we collect it</h2>
      <p style={{ marginBottom: "18px" }}>
        To personalise your simulation, generate a tailored feedback report, and
        measure learning impact across attempts.
      </p>

      <h2 style={{ marginTop: "28px", marginBottom: "10px" }}>How we use it</h2>
      <ul style={{ margin: "0 0 18px 20px" }}>
        <li>Run the live AI voice simulation</li>
        <li>Create your personalised feedback (scores + narrative)</li>
        <li>Email you a PDF report</li>
        <li>Analyse anonymised results to improve our programmes</li>
      </ul>

      <h2 style={{ marginTop: "28px", marginBottom: "10px" }}>Who sees it</h2>
      <p style={{ marginBottom: "18px" }}>
        Only CultureHub and our trusted processors needed to deliver your
        report: Airtable, Make.com, OpenAI (for analysis), and Google Docs/Drive
        (for report generation & delivery). We do not sell your data.
      </p>

      <h2 style={{ marginTop: "28px", marginBottom: "10px" }}>How long we keep it</h2>
      <p style={{ marginBottom: "18px" }}>
        Up to 12 months, unless you request deletion sooner.
      </p>

      <h2 style={{ marginTop: "28px", marginBottom: "10px" }}>Your rights</h2>
      <p style={{ marginBottom: "18px" }}>
        You can request a copy of your data or ask us to delete it at any time.
        Email{" "}
        <a href="mailto:privacy@culturehub.com" style={{ color: "#02f5ec" }}>
          privacy@culturehub.com
        </a>.
      </p>

      {/* Back button */}
      <div style={{ marginTop: "42px", textAlign: "center" }}>
        <Link href="/feedback">
          <button
            style={{
              padding: "16px 28px",
              border: "none",
              borderRadius: "12px",
              background:
                "linear-gradient(135deg, #02f5ec, #349fef, #f95bf6)",
              color: "white",
              fontSize: "1rem",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 8px 26px rgba(2,245,236,0.35)",
              transition: "transform .2s ease, box-shadow .2s ease",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow =
                "0 12px 36px rgba(2,245,236,0.5)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow =
                "0 8px 26px rgba(2,245,236,0.35)";
            }}
            aria-label="Back to Training"
          >
            ← Back to Training
          </button>
        </Link>
      </div>
    </div>
  );
}
