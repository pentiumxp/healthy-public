const STRENGTH_EXERCISES = [
  entry("barbell_back_squat", "杠铃深蹲", "Barbell Back Squat", ["squat", "barbell squat", "back squat", "深蹲", "杠铃深蹲"], "legs", "barbell"),
  entry("barbell_overhead_press", "杠铃推肩", "Barbell Overhead Press", ["overhead press", "barbell overhead press", "press", "推肩", "杠铃推肩", "杠铃推举", "杠铃肩推"], "shoulders", "barbell"),
  entry("barbell_bench_press", "杠铃卧推", "Barbell Bench Press", ["bench", "bench press", "barbell bench press", "卧推", "平板卧推", "杠铃卧推"], "chest", "barbell"),
  entry("barbell_deadlift", "杠铃硬拉", "Barbell Deadlift", ["deadlift", "barbell deadlift", "硬拉", "杠铃硬拉"], "posterior_chain", "barbell"),
  entry("barbell_row", "杠铃划船", "Barbell Row", ["row", "barbell row", "bent over row", "划船", "杠铃划船"], "back", "barbell"),
  entry("pull_up", "引体向上", "Pull-up", ["pullup", "pull-up", "pull up", "引体", "引体向上"], "back", "bodyweight")
];

const CARDIO_ACTIVITIES = [
  entry("indoor_walk", "室内步行", "Indoor Walk", ["indoor walk", "treadmill walk", "technogym walk", "室内步行", "室内走路", "跑步机步行"]),
  entry("outdoor_walk", "户外步行", "Outdoor Walk", ["outdoor walk", "户外步行", "户外走路"]),
  entry("elliptical", "椭圆机", "Elliptical", ["elliptical", "cross trainer", "椭圆机", "椭圆仪"]),
  entry("run", "跑步", "Run", ["run", "running", "跑步"]),
  entry("cycling", "骑行", "Cycling", ["cycling", "bike", "biking", "骑行", "单车"]),
  entry("rowing", "划船机", "Rowing", ["rowing", "rowing machine", "划船机"]),
  entry("other", "其他有氧", "Other Cardio", ["other", "其他有氧"])
];

function strengthExerciseCatalog() {
  return STRENGTH_EXERCISES.map(publicEntry);
}

function cardioActivityCatalog() {
  return CARDIO_ACTIVITIES.map(publicEntry);
}

function normalizeStrengthExercise(exercise = {}) {
  const found = findEntry(STRENGTH_EXERCISES, exercise.key || exercise.exerciseKey || exercise.canonicalKey || exercise.name);
  if (!found) return null;
  return {
    name: found.key,
    category: exercise.category || "strength",
    primaryMuscleGroup: exercise.primaryMuscleGroup || found.primaryMuscleGroup || null,
    equipment: exercise.equipment || found.equipment || null
  };
}

function normalizeCardioActivity(value) {
  return findEntry(CARDIO_ACTIVITIES, value)?.key || "";
}

function publicEntry(item) {
  return { key: item.key, label: item.label, english: item.english, aliases: item.aliases };
}

function findEntry(catalog, value) {
  const normalized = normalize(value);
  if (!normalized) return null;
  return catalog.find((item) => item.key === normalized || item.aliasesNormalized.includes(normalized)) || null;
}

function entry(key, label, english, aliases, primaryMuscleGroup, equipment) {
  return { key, label, english, aliases, aliasesNormalized: [key, english, label, ...aliases].map(normalize), primaryMuscleGroup, equipment };
}

function normalize(value) {
  return String(value || "").toLowerCase().replace(/[_-]+/g, " ").replace(/[^a-z0-9\u3400-\u9fff+ ]+/g, " ").replace(/\s+/g, " ").trim();
}

module.exports = { cardioActivityCatalog, normalizeCardioActivity, normalizeStrengthExercise, strengthExerciseCatalog };
