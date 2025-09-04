// pages/privacy.js
import { useRouter } from "next/router";

export default function PrivacyPage() {
  const router = useRouter();
  const { from } = router.query;

  // Map short names to real routes
  const routeMap = {
    feedback: "/feedback",
    meddpicc: "/meddpicc",
    coaching: "/coaching",
    negotiation: "/negotiation",
  };

  function handleBack(e) {
    e.preventDefault();

    // 1) If we’ve been told where they came from, go there
    if (from && routeMap[from]) {
      router.push(routeMap[from]);
      return;
    }

    // 2) If they navigated from within your site, go back in history
    if (typeof document !== "undefined" && document.referrer) {
      try {
        const ref = new URL(document.referrer);
        if (ref.origin === window.location.origin) {
          router.back();
          return;
        }
      } catch {}
    }

    // 3) Fallback
    router.push("/feedback");
  }

  return (
    <div style={styles.page}>
      {/* Floating background swirls */}
      <div style={{ ...styles.swirl, ...styles.swirl1 }} />
      <div style={{ ...styles.swirl, ...styles.swirl2 }} />
      <div style={{ ...styles.swirl, ...styles.swirl3 }} />

      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={styles.title}>Privacy Notice</h1>
          <p style={styles.subtitle}>
            Your privacy matters to us. Here’s how we use and protect your data
            when you take part in our training simulations.
          </p>
        </header>

        <main style={styles.content}>
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>What data we collect</h2>
            <p style={styles.paragraph}>
              We collect your name, company, email address, attempt number, and
              training responses. This allows us to provide you with a
              personalised training experience and generate a tailored feedback
              report.
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>How we use your data</h2>
            <p style={styles.paragraph}>
              Your data is used solely for training purposes: to set up your
              voice simulation, generate feedback reports, and share results
              with you via email. We do not sell or share your data with third
              parties outside of this process.
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>How long we keep your data</h2>
            <p style={styles.paragraph}>
              Training records and reports are stored securely for 12 months,
              after which they are permanently deleted. You can request deletion
              earlier by contacting us.
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Your rights</h2>
            <p style={styles.paragraph}>
              You have the right to access, correct, or delete your data at any
              time. Please contact us if you wish to exercise these rights at{" "}
              <a href="mailto:simulations@culture-hub.com" style={{ color: "#9bdff7", textDecoration: "none" }}>
                simulations@culture-hub.com
              </a>.
            </p>
          </section>
        </main>

        <div style={{ textAlign: "center", marginTop: "50px" }}>
          <button style={styles.backButton} onClick={handleBack}>
            ← Back to Training
          </button>
        </div>
      </div>
    </div>
  );
}

// --------------------
// Styles
// --------------------
const styles = {
  page: {
    fontFamily: "'Poppins', sans-serif",
    background: "#000",
    color: "white",
    minHeight: "100vh",
    overflowX: "hidden",
    position: "relative",
    padding: "40px 20px",
  },
  container: {
    position: "relative",
    zIndex: 10,
    maxWidth: "900px",
    margin: "0 auto",
  },
  header: {
    textAlign: "center",
    marginBottom: "50px",
  },
  title: {
    fontSize: "2.5rem",
    fontWeight: 600,
    marginBottom: "15px",
    textShadow: "0 2px 20px rgba(248, 91, 246, 0.3)",
  },
  subtitle: {
    fontSize: "1.2rem",
    color: "rgba(255,255,255,0.8)",
    lineHeight: 1.6,
    maxWidth: "700px",
    margin: "0 auto",
  },
  content: {
    background: "rgba(255,255,255,0.05)",
    backdropFilter: "blur(20px)",
    borderRadius: "20px",
    padding: "30px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
  },
  section: {
    marginBottom: "30px",
  },
  sectionTitle: {
    fontSize: "1.5rem",
    fontWeight: 600,
    marginBottom: "12px",
    background: "linear-gradient(135deg, #02f5ec, #349fef, #f95bf6)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  paragraph: {
    fontSize: "1rem",
    color: "rgba(255,255,255,0.8)",
    lineHeight: 1.7,
  },
  backButton: {
    padding: "15px 25px",
    background: "linear-gradient(135deg, #02f5ec, #349fef, #f95bf6)",
    border: "none",
    borderRadius: "12px",
    color: "white",
    fontSize: "1.1rem",
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 8px 32px rgba(2, 245, 236, 0.4)",
    transition: "all 0.3s ease",
  },
  swirl: {
    position: "fixed",
    borderRadius: "50%",
    filter: "blur(80px)",
    opacity: 0.3,
    animation: "float 25s infinite ease-in-out",
    pointerEvents: "none",
    zIndex: 0,
    mixBlendMode: "screen",
  },
  swirl1: {
    width: "400px",
    height: "400px",
    background: "linear-gradient(135deg, #02f5ec, #349fef)",
    top: "-10%",
    left: "-10%",
  },
  swirl2: {
    width: "300px",
    height: "300px",
    background: "linear-gradient(135deg, #349fef, #f95bf6)",
    top: "60%",
    right: "-5%",
  },
  swirl3: {
    width: "350px",
    height: "350px",
    background: "linear-gradient(135deg, #02f5ec, #f95bf6)",
    bottom: "-10%",
    left: "30%",
  },
};
