(function () {
  const labLabels = {
    "ldl-c": ["低密度脂蛋白胆固醇", "LDL-C"],
    apob: ["载脂蛋白B", "ApoB"],
    triglycerides: ["甘油三酯", "Triglycerides"],
    "tg": ["甘油三酯", "TG"],
    "hdl-c": ["高密度脂蛋白胆固醇", "HDL-C"],
    "total cholesterol": ["总胆固醇", "Total Cholesterol"],
    "fasting glucose": ["空腹血糖", "Fasting Glucose"],
    hba1c: ["糖化血红蛋白", "HbA1c"],
    alt: ["丙氨酸氨基转移酶", "ALT"],
    ast: ["天门冬氨酸氨基转移酶", "AST"],
    ggt: ["谷氨酰转肽酶", "GGT"],
    alp: ["碱性磷酸酶", "ALP"],
    bilirubin: ["胆红素", "Bilirubin"],
    creatinine: ["肌酐", "Creatinine"],
    "cystatin c": ["胱抑素C", "Cystatin C"],
    cystatin: ["胱抑素C", "Cystatin C"],
    "egfr episcr cys": ["肌酐-胱抑素C联合估算肾小球滤过率", "eGFR EPI scr-cys"],
    egfr: ["估算肾小球滤过率", "eGFR"],
    uacr: ["尿白蛋白肌酐比", "UACR"],
    "uric acid": ["尿酸", "Uric Acid"],
    testosterone: ["总睾酮", "Testosterone"],
    lh: ["黄体生成素", "LH"],
    prolactin: ["泌乳素", "Prolactin"],
    estradiol: ["雌二醇", "Estradiol"],
    tsh: ["促甲状腺激素", "TSH"]
  };
  const medicationLabels = {
    atorvastatin: ["阿托伐他汀", "Atorvastatin"],
    ezetimibe: ["依折麦布", "Ezetimibe"],
    dotinurad: ["多替诺雷", "Dotinurad"],
    tirzepatide: ["替尔泊肽", "Tirzepatide"],
    mounjaro: ["替尔泊肽", "Mounjaro"],
    daridorexant: ["达利雷生", "Daridorexant"],
    quviviq: ["达利雷生", "Quviviq"],
    escitalopram: ["艾司西酞普兰", "Escitalopram"],
    "fish oil": ["鱼油", "Fish Oil"],
    "omega-3": ["鱼油", "Omega-3"],
    coq10: ["辅酶Q10", "CoQ10"],
    "coenzyme q10": ["辅酶Q10", "Coenzyme Q10"],
    "nad+": ["NAD+", "NAD+"],
    magnesium: ["镁", "Magnesium"],
    multivitamin: ["复合维生素", "Multivitamin"],
    glucosamine: ["氨糖", "Glucosamine"],
    collagen: ["骨胶原", "Collagen"]
  };
  const exerciseLabels = {
    "barbell back squat": ["杠铃深蹲", "Barbell Back Squat"],
    squat: ["深蹲", "Squat"],
    "barbell squat": ["杠铃深蹲", "Barbell Squat"],
    "barbell overhead press": ["杠铃推肩", "Barbell Overhead Press"],
    "overhead press": ["推肩", "Overhead Press"],
    "barbell bench press": ["杠铃卧推", "Barbell Bench Press"],
    bench: ["卧推", "Bench Press"],
    "bench press": ["卧推", "Bench Press"],
    "barbell deadlift": ["杠铃硬拉", "Barbell Deadlift"],
    deadlift: ["硬拉", "Deadlift"],
    "barbell row": ["杠铃划船", "Barbell Row"],
    row: ["划船", "Row"],
    pullup: ["引体向上", "Pull-up"],
    "pull-up": ["引体向上", "Pull-up"]
  };
  const riskLabels = {
    atherosclerosis: ["冠脉/颈动脉粥样硬化", "Atherosclerosis"],
    liver_alt: ["ALT持续轻度升高", "ALT"],
    kidney: ["肾功能边缘稳定", "Kidney"],
    renal: ["肾功能边缘稳定", "Renal"],
    testosterone: ["低睾酮/低性欲", "Testosterone"],
    sleep: ["睡眠/恢复储备不足", "Sleep"],
    metabolic: ["代谢平台维持", "Metabolic"]
  };
  const statusLabels = { active: "使用中", paused: "暂停", stopped: "已停止" };
  const activityLabels = {
    "indoor walk": ["室内步行", "Indoor Walk"],
    "outdoor walk": ["户外步行", "Outdoor Walk"],
    run: ["跑步", "Run"],
    cycling: ["骑行", "Cycling"],
    elliptical: ["椭圆机", "Elliptical"],
    rowing: ["划船机", "Rowing"],
    other: ["有氧运动", "Cardio"]
  };

  window.HealthLabels = {
    activity: (value) => label(value, activityLabels, "有氧运动", true),
    lab: (value) => label(value, labLabels, "未映射指标", true),
    medication: (value) => label(value, medicationLabels, "未映射药物", true),
    exercise: (value) => label(value, exerciseLabels, "训练动作", true),
    risk: (risk) => labelByKey(risk?.risk_key, risk?.label, riskLabels, "需关注问题"),
    status: (value) => statusLabels[String(value || "").toLowerCase()] || value || "--",
    frequency: (value) => frequency(value)
  };

  function labelByKey(key, fallback, labels, prefix) {
    const found = match(key, labels) || match(fallback, labels);
    if (found) return display(found);
    if (hasCjk(fallback)) return fallback;
    return fallback ? `${prefix} (${fallback})` : prefix;
  }

  function label(value, labels, prefix, fuzzy) {
    const found = match(value, labels, fuzzy);
    if (found) return display(found);
    if (hasCjk(value)) return value;
    return value ? `${prefix} (${value})` : "--";
  }

  function match(value, labels, fuzzy) {
    const normalized = normalize(value);
    if (!normalized) return null;
    if (labels[normalized]) return labels[normalized];
    if (!fuzzy) return null;
    return Object.entries(labels).find(([key]) => normalized.includes(key) || key.includes(normalized))?.[1] || null;
  }

  function display(pair) {
    return pair[0] === pair[1] ? pair[0] : `${pair[0]} (${pair[1]})`;
  }

  function frequency(value) {
    const text = String(value || "").trim();
    if (!text) return "";
    if (hasCjk(text)) return text;
    const lower = text.toLowerCase();
    if (lower.includes("weekly")) return `每周 (${text})`;
    if (lower.includes("daily") || lower.includes("day")) return `每日 (${text})`;
    if (lower.includes("night")) return `夜间 (${text})`;
    return `频率 (${text})`;
  }

  function normalize(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9+.-]+/g, " ").trim();
  }

  function hasCjk(value) {
    return /[\u3400-\u9fff]/.test(String(value || ""));
  }
})();
