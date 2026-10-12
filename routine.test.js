const test = require("node:test");
const assert = require("node:assert/strict");
const { EX, buildSteps, repState, weekDays, dayKey } = require("./routine.js");

const nameOf = (s) => EX[s.ex].name;

test("session opens with a 10 s 'up next' for knees to chest, then a 30 s hold", () => {
  const steps = buildSteps();
  assert.deepEqual(
    steps.slice(0, 2).map((s) => [s.t, nameOf(s), s.dur]),
    [["next", "Knees to chest", 10], ["work", "Knees to chest", 30]]
  );
});

const stepsOf = (name) => buildSteps().filter((s) => nameOf(s) === name && s.t !== "next");

test("one-sided stretch: right side, 5 s to switch, left side", () => {
  assert.deepEqual(
    stepsOf("Hip flexor stretch").map((s) => [s.t, s.side, s.dur]),
    [["work", "Right side", 45], ["switch", undefined, 5], ["work", "Left side", 45]]
  );
});

test("two sets get a 20 s rest between them but not after the last", () => {
  assert.deepEqual(
    stepsOf("Glute bridge").map((s) => [s.t, s.set, s.dur]),
    [["work", "Set 1 of 2", 72], ["rest", "Set 2 of 2 next", 20], ["work", "Set 2 of 2", 72]]
  );
});

test("side plank does both sides in each of two sets", () => {
  assert.deepEqual(
    stepsOf("Side plank").map((s) => [s.t, s.side || "", s.dur]),
    [["work", "Right side", 20], ["switch", "", 5], ["work", "Left side", 20], ["rest", "", 20],
     ["work", "Right side", 20], ["switch", "", 5], ["work", "Left side", 20]]
  );
});

test("whole session lasts 1001 s (about 17 minutes)", () => {
  assert.equal(buildSteps().reduce((a, s) => a + s.dur, 0), 1001);
});

const ex = (name) => EX.find((e) => e.name === name);

test("pelvic tilts: rep 1 starts breathing in with the circle at its smallest", () => {
  const s = repState(ex("Pelvic tilts"), 0);
  assert.equal(s.rep, 1);
  assert.equal(s.label, "Breathe in · relax");
  assert.equal(s.scale, 0.62);
});

test("pelvic tilts: at 3 s the circle is full and it switches to breathing out; at 7 s rep 2 begins", () => {
  const out = repState(ex("Pelvic tilts"), 3);
  assert.deepEqual([out.rep, out.label, out.scale], [1, "Breathe out · flatten your back", 1]);
  const halfway = repState(ex("Pelvic tilts"), 5);
  assert.ok(halfway.scale > 0.62 && halfway.scale < 1, "circle is shrinking mid-exhale");
  const next = repState(ex("Pelvic tilts"), 7);
  assert.deepEqual([next.rep, next.label, next.scale], [2, "Breathe in · relax", 0.62]);
});

test("plain reps count as 'Rep n of total'", () => {
  assert.equal(repState(ex("Pelvic tilts"), 64).count, "Rep 10 of 10");
});

test("alternating exercises count rounds and say which side is working", () => {
  const birdDog = ex("Bird dog"); // 6 s per rep, 16 reps = 8 rounds
  assert.equal(repState(birdDog, 0).count, "Round 1 of 8 · Right arm · left leg");
  assert.equal(repState(birdDog, 6).count, "Round 1 of 8 · Left arm · right leg");
  assert.equal(repState(birdDog, 12).count, "Round 2 of 8 · Right arm · left leg");
  assert.equal(repState(birdDog, 95).count, "Round 8 of 8 · Left arm · right leg");
});

test("glute bridge holds at the top with the circle staying small", () => {
  const s = repState(ex("Glute bridge"), 3);
  assert.deepEqual([s.label, s.scale], ["Hold at the top", 0.62]);
});


test("week shows the last 7 days ending today, with done days marked", () => {
  const today = new Date(2026, 9, 12, 7, 0); // Monday 12 Oct 2026, 07:00
  const week = weekDays(["2026-10-12", "2026-10-10", "2026-10-01"], today);
  assert.deepEqual(week.map((d) => d.letter).join(""), "TWTFSSM");
  assert.deepEqual(week.map((d) => d.done), [false, false, false, false, true, false, true]);
  assert.deepEqual(week.map((d) => d.today), [false, false, false, false, false, false, true]);
});

test("week crosses a month boundary", () => {
  const week = weekDays(["2026-10-31"], new Date(2026, 10, 2, 7, 0)); // Monday 2 Nov
  assert.deepEqual(week.map((d) => d.key), [
    "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"
  ]);
  assert.equal(week[4].done, true);
});

test("just after midnight still counts as the new local day", () => {
  assert.equal(dayKey(new Date(2026, 10, 2, 0, 30)), "2026-11-02");
});
