import { useState } from "react";
import axios from "axios";

export default function PredictUpload() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setResult(null);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("image", file);

    try {
      const token = localStorage.getItem("token"); // adjust to however you store the JWT
      const res = await axios.post("/api/predict", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "Prediction failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: "0 auto" }}>
      <h2>OCT Scan Prediction</h2>

      <input type="file" accept="image/*" onChange={handleFileChange} />

      {preview && (
        <div style={{ marginTop: 12 }}>
          <img
            src={preview}
            alt="OCT scan preview"
            style={{ maxWidth: "100%", borderRadius: 8, border: "1px solid #ddd" }}
          />
        </div>
      )}

      <button onClick={handleSubmit} disabled={!file || loading} style={{ marginTop: 12 }}>
        {loading ? "Analyzing..." : "Predict"}
      </button>

      {error && <p style={{ color: "crimson", marginTop: 12 }}>{error}</p>}

      {result && (
        <div style={{ marginTop: 20, padding: 16, border: "1px solid #ccc", borderRadius: 8 }}>
          <h3>
            Prediction: <span style={{ color: "#2563eb" }}>{result.prediction}</span>
          </h3>
          <p>Confidence: {(result.confidence * 100).toFixed(2)}%</p>

          <h4>Class Probabilities</h4>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {Object.entries(result.probabilities).map(([label, prob]) => (
              <li key={label} style={{ marginBottom: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{label}</span>
                  <span>{(prob * 100).toFixed(1)}%</span>
                </div>
                <div style={{ background: "#eee", borderRadius: 4, height: 6 }}>
                  <div
                    style={{
                      width: `${prob * 100}%`,
                      background: "#2563eb",
                      height: "100%",
                      borderRadius: 4,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}