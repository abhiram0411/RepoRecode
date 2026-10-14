import { useEffect, useState } from "react";
import { cloud } from "../core/cloud";
export default function MfaSettings() {
  const [id, setId] = useState(""),
    [qr, setQr] = useState(""),
    [verified, setVerified] = useState(false),
    [code, setCode] = useState(""),
    [message, setMessage] = useState("");
  useEffect(() => {
    if (cloud)
      cloud.auth.mfa.listFactors().then(({ data }) => {
        const f = data?.totp[0];
        if (f) {
          setId(f.id);
          setVerified(f.status === "verified");
        }
      });
  }, []);
  async function enroll() {
    if (!cloud) return;
    const { data, error } = await cloud.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "RepoRecode authenticator",
    });
    if (error) setMessage(error.message);
    else {
      setId(data.id);
      setQr(data.totp.qr_code);
      setMessage(
        "Scan this QR code with your authenticator, then enter its current code.",
      );
    }
  }
  async function verify() {
    if (!cloud) return;
    const { error } = await cloud.auth.mfa.challengeAndVerify({
      factorId: id,
      code,
    });
    if (error) setMessage(error.message);
    else {
      setVerified(true);
      setQr("");
      setCode("");
      setMessage("Authenticator verified.");
    }
  }
  return (
    <div className="mfa-settings">
      <h3>Two-factor authentication</h3>
      {!id ? (
        <button className="secondary" onClick={() => void enroll()}>
          Set up an authenticator
        </button>
      ) : verified ? (
        <p>
          Authenticator enrolled. Administrators must verify a current code
          before accessing service metrics.
        </p>
      ) : (
        <>
          {qr && (
            <img
              src={qr}
              alt="Authenticator enrollment QR code"
              width={170}
              height={170}
            />
          )}
          <label>
            Authenticator code
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={6}
              inputMode="numeric"
              autoComplete="one-time-code"
            />
          </label>
          <button className="secondary" onClick={() => void verify()}>
            Verify authenticator
          </button>
        </>
      )}
      <p role="status">{message}</p>
    </div>
  );
}
