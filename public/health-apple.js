(function () {
  function render(data) {
    const latest = data.latestDaily || {};
    const workout = (data.workouts || [])[0] || {};
    const sleep = data.latestSleep || {};
    set("appleHealthDate", latest.summary_date ? `HealthKit ${latest.summary_date}` : "\u6682\u65e0\u539f\u751f\u5065\u5eb7\u6570\u636e");
    set("appleSteps", latest.step_count == null ? "--" : number(latest.step_count));
    set("appleEnergy", latest.active_energy_kcal == null ? "--" : `${round(latest.active_energy_kcal)} kcal`);
    set("appleExercise", latest.exercise_minutes == null ? "--" : `${round(latest.exercise_minutes)} min`);
    set("appleDistance", latest.walking_running_distance_m == null ? "--" : `${round(latishKm(latest.walking_running_distance_m))} km`);
    set("appleSleep", sleep.total_sleep_minutes == null ? "--" : `${round(sleep.total_sleep_minutes / 60)} h`);
    const workoutType = workout.apple_activity_type || workout.normalized_activity_type;
    set("appleWorkout", workoutType ? `${label(workoutType)} ${minutes(workout.duration_seconds)}`.trim() : "--");
  }

  function label(value) {
    const text = String(value || "").replace(/_/g, " ");
    return text.replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function minutes(seconds) {
    return seconds ? `${Math.round(seconds / 60)} min` : "";
  }

  function number(value) {
    return Math.round(value).toLocaleString("en-US");
  }

  function round(value) {
    return Math.round(value * 10) / 10;
  }

  function latishKm(value) {
    return Number(value || 0) / 1000;
  }

  function set(id, text) {
    document.getElementById(id).textContent = text;
  }

  window.HealthApple = { render };
})();
