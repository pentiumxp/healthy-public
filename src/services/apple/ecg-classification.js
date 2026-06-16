const ECG_CLASSIFICATION_ALIASES = Object.freeze({
  "窦性心律": "sinus_rhythm",
  "房颤": "atrial_fibrillation",
  "不确定": "inconclusive",
  "高心率": "high_heart_rate",
  "记录结果不佳": "poor_recording",
  "sinus rhythm": "sinus_rhythm",
  "atrial fibrillation": "atrial_fibrillation",
  "afib": "atrial_fibrillation",
  "high heart rate": "high_heart_rate",
  "poor recording": "poor_recording",
  "poor reading": "poor_recording"
});

function normalizeEcgClassification(value, normalizeKey) {
  const text = String(value || "").trim();
  if (!text) return "";
  const lower = text.toLowerCase();
  return ECG_CLASSIFICATION_ALIASES[text] || ECG_CLASSIFICATION_ALIASES[lower] || normalizeKey(text);
}

module.exports = { normalizeEcgClassification };
