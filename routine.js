// The morning routine and its timing. Pure logic, shared by the page (window.Routine) and the tests (require).
(function (root) {
  "use strict";

  // reps phases: [label, seconds, breath] — breath "in" grows the circle, "out" shrinks it, "hi"/"lo" holds it.
  var ALT = ["Right arm · left leg", "Left arm · right leg"];
  var EX = [
    { id: "knees", name: "Knees to chest", where: "In bed",
      setup: "Stay in bed, lying on your back.",
      cue: "Hug both knees gently and rock slowly from side to side.",
      hold: 30 },
    { id: "tilt", name: "Pelvic tilts", where: "In bed",
      setup: "Knees bent, feet flat on the mattress.",
      cue: "Press your lower back into the mattress, then let it go. The movement comes from the pelvis.",
      reps: 10, phases: [["Breathe in · relax", 3, "in"], ["Breathe out · flatten your back", 4, "out"]] },
    { id: "drops", name: "Knee drops", where: "In bed",
      setup: "Knees bent and together, shoulders relaxed.",
      cue: "Let both knees fall slowly to one side, then the other. Only as far as feels easy.",
      reps: 10, alt: ["To the right", "To the left"],
      phases: [["Breathe out · let the knees fall", 3, "out"], ["Breathe in · bring them back", 3, "in"]] },
    { id: "hipflexor", name: "Hip flexor stretch", where: "On the mat",
      setup: "Move to the mat. Kneel in a lunge, back knee on a cushion.",
      cue: "Tuck your pelvis under, squeeze the back glute and shift forward a little. Stay tall.",
      hold: 45, sides: true },
    { id: "bridge", name: "Glute bridge", where: "On the mat",
      setup: "On your back, knees bent, feet hip-width apart.",
      cue: "Push through your heels until shoulders, hips and knees form a line. Don't over-arch.",
      reps: 12, sets: 2,
      phases: [["Breathe out · lift your hips", 2, "out"], ["Hold at the top", 2, "lo"], ["Breathe in · lower slowly", 2, "in"]] },
    { id: "birddog", name: "Bird dog", where: "On the mat",
      setup: "On hands and knees, hands under shoulders, knees under hips.",
      cue: "Reach long and keep your back still, as if a glass of water rests on it.",
      reps: 16, sets: 2, alt: ALT,
      phases: [["Breathe out · reach long", 2, "out"], ["Hold", 2, "lo"], ["Breathe in · come back", 2, "in"]] },
    { id: "deadbug", name: "Dead bug", where: "On the mat",
      setup: "On your back, arms to the ceiling, knees bent at 90° over your hips.",
      cue: "Keep your lower back gently pressed into the floor. If it lifts, don't lower as far.",
      reps: 16, sets: 2, alt: ALT,
      phases: [["Breathe out · lower slowly", 3, "out"], ["Breathe in · come back", 2, "in"]] },
    { id: "sideplank", name: "Side plank", where: "On the mat",
      setup: "On your side, elbow under shoulder. Bend your knees if it's too hard.",
      cue: "Lift your hips so your body is one straight line. Hips forward, no sagging.",
      hold: 20, sides: true, sets: 2 }
  ];

  var NEXT_SECS = 10, REST_SECS = 20, SWITCH_SECS = 5;

  function buildSteps() {
    var steps = [];
    EX.forEach(function (ex, i) {
      steps.push({ t: "next", ex: i, dur: NEXT_SECS });
      var sets = ex.sets || 1;
      for (var s = 1; s <= sets; s++) {
        var setLabel = sets > 1 ? "Set " + s + " of " + sets : "";
        if (ex.hold) {
          if (ex.sides) {
            steps.push({ t: "work", ex: i, dur: ex.hold, set: setLabel, side: "Right side" });
            steps.push({ t: "switch", ex: i, dur: SWITCH_SECS, set: setLabel });
            steps.push({ t: "work", ex: i, dur: ex.hold, set: setLabel, side: "Left side" });
          } else {
            steps.push({ t: "work", ex: i, dur: ex.hold, set: setLabel });
          }
        } else {
          var repDur = ex.phases.reduce(function (a, p) { return a + p[1]; }, 0);
          steps.push({ t: "work", ex: i, dur: ex.reps * repDur, repDur: repDur, set: setLabel });
        }
        if (s < sets) steps.push({ t: "rest", ex: i, dur: REST_SECS, set: "Set " + (s + 1) + " of " + sets + " next" });
      }
    });
    return steps;
  }

  var CIRCLE_LO = 0.62, CIRCLE_HI = 1;

  // Where we are inside a rep-based exercise after `el` seconds: rep number, phase label, breathing-circle scale.
  function repState(ex, el) {
    var repDur = ex.phases.reduce(function (a, p) { return a + p[1]; }, 0);
    var r = Math.floor(el / repDur), within = el - r * repDur, acc = 0, ph = ex.phases[0], pp = 0;
    for (var i = 0; i < ex.phases.length; i++) {
      if (within < acc + ex.phases[i][1]) { ph = ex.phases[i]; pp = (within - acc) / ph[1]; break; }
      acc += ex.phases[i][1];
    }
    var e = 0.5 - Math.cos(Math.PI * pp) / 2, scale;
    if (ph[2] === "in") scale = CIRCLE_LO + (CIRCLE_HI - CIRCLE_LO) * e;
    else if (ph[2] === "out") scale = CIRCLE_HI - (CIRCLE_HI - CIRCLE_LO) * e;
    else scale = ph[2] === "hi" ? CIRCLE_HI : CIRCLE_LO;
    var count = ex.alt
      ? "Round " + (Math.floor(r / 2) + 1) + " of " + ex.reps / 2 + " · " + ex.alt[r % 2]
      : "Rep " + (r + 1) + " of " + ex.reps;
    return { rep: r + 1, label: ph[0], scale: scale, count: count };
  }

  function pad(n) { return (n < 10 ? "0" : "") + n; }

  // Local calendar date, so a session just after midnight counts for the new day.
  function dayKey(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }

  // The 7 days ending today, oldest first.
  function weekDays(doneKeys, today) {
    var out = [];
    for (var i = 6; i >= 0; i--) {
      var d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      var k = dayKey(d);
      out.push({ key: k, letter: "SMTWTFS"[d.getDay()], done: doneKeys.indexOf(k) >= 0, today: i === 0 });
    }
    return out;
  }

  var api = { EX: EX, buildSteps: buildSteps, repState: repState, dayKey: dayKey, weekDays: weekDays };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Routine = api;
})(this);
