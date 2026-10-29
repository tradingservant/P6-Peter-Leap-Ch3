const fs = require("fs");
const vm = require("vm");
const path = require("path");

const code = fs.readFileSync(path.join(__dirname, "../js/content.js"), "utf8");
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(code, sandbox);
const content = sandbox.P6_CONTENT;

const failures = [];
function assert(cond, message) {
  if (!cond) failures.push(message);
}

assert(content.title === "Peter · Reading & Writing Ch3", "title");
assert(content.subtitle === "Problems around us", "subtitle");
assert(content.motto === "Care about world problems", "motto");

const ids = content.modules.map((mod) => mod.id);
assert(ids.join() === "vocab,grammar,play,book,write", "module order");
assert(!ids.includes("letter"), "write is not letter");

const hues = {
  vocab: "#c45c26",
  grammar: "#0e8f7a",
  play: "#6c4ed4",
  book: "#1f7aed",
  write: "#e07a2f",
};
content.modules.forEach((mod) => {
  assert(mod.hue === hues[mod.id], `${mod.id} hue`);
  assert(/[\u4e00-\u9fff]/.test(mod.help), `${mod.id} help is Chinese`);
  if (mod.id !== "grammar" && mod.id !== "book") {
    assert(/[\u4e00-\u9fff]/.test(mod.blurb), `${mod.id} blurb is Chinese`);
  }
  assert(mod.zh && mod.en, `${mod.id} labels`);
});

const neverAnswer = [
  "either",
  "neither",
  "because",
  "shall we",
  "week",
  "Yours faithfully,",
  "Dear Principal,",
  "charity work",
  "Sell flags only",
  "visited",
  "too many",
  "what a tsunami is",
];

function walk(step, visit) {
  if (step.kind === "mcq") visit(step.answer, step.options, step.q);
  if (step.items && step.kind !== "teach" && step.kind !== "order") {
    step.items.forEach((item) => {
      if (item.answer) {
        visit(item.answer, item.options || (step.kind === "bank" ? step.bank : null), item.q || item.before || item.say || item.sentence || item.id);
      }
    });
  }
  if (step.kind === "builder") {
    step.items.forEach((item) => visit(item.full, null, item.id));
  }
  if (step.kind === "order") visit(step.items.join(" → "), null, step.title);
}

const answers = [];
content.modules.forEach((mod) => {
  mod.steps.forEach((step) => {
    if (step.kind === "mcq") {
      assert(/[\u4e00-\u9fff]/.test(step.q), `question Chinese: ${step.q}`);
      assert(/[\u4e00-\u9fff]/.test(step.why), `why Chinese: ${step.q}`);
      assert(!/[\u4e00-\u9fff]/.test(step.answer), `answer English: ${step.q}`);
    }
    walk(step, (answer, options, label) => {
      answers.push(answer);
      if (options) assert(options.includes(answer), `${mod.id} missing option for ${label}: ${answer}`);
      neverAnswer.forEach((bad) => {
        assert(answer !== bad, `${mod.id} marked a wrong answer correct: ${bad} (${label})`);
      });
      assert(!/vivienne|hailey|kind heart|children don't give up/i.test(String(answer)), `ch4 bleed ${label}`);
    });
  });
});

const vocab = content.modules.find((mod) => mod.id === "vocab");
const iconHunt = vocab.steps.find((step) => step.kind === "iconHunt");
assert(iconHunt.items.length === 10, "icon hunt 10");
iconHunt.items.forEach((item) => {
  assert(item.say === content.gloss[item.answer], `Chinese prompt for ${item.answer}`);
  assert(/[\u4e00-\u9fff]/.test(item.say), `prompt Chinese ${item.answer}`);
  assert(!/[\u4e00-\u9fff]/.test(item.answer), `English answer ${item.answer}`);
});

const match = vocab.steps.find((step) => step.kind === "pictureMatch");
const matchMap = Object.fromEntries(match.items.map((item) => [item.answer, item.sentence]));
assert(match.items.map((item) => item.answer).join("") === "ABCDEFGHIJ", "picture letters A-J");
assert(new Set(match.items.map((item) => item.answer)).size === 10, "letters once");
assert(match.pictures.map((pic) => pic.icon).join("|") === [
  "drought", "tornado", "typhoon", "flood", "landslide", "avalanche", "earthquake", "hill fire", "tsunami", "volcanic eruption",
].join("|"), "picture files");
match.items.forEach((item) => {
  assert(!/[\u4e00-\u9fff]/.test(item.sentence), "match sentence stays English");
  assert(/[\u4e00-\u9fff]/.test(item.why), "match why Chinese");
});
assert(matchMap.A.includes("hasn't rained"), "drought sentence");
assert(matchMap.J.includes("Hot lava"), "volcano sentence");

const phraseBank = vocab.steps.find((step) => step.kind === "bank");
const phrases = Object.fromEntries(phraseBank.items.map((item) => [item.id, item.answer]));
assert(phrases.eq1 === "destroy houses and buildings", "eq1");
assert(phrases.eq2 === "damage roads", "eq2");
assert(phrases.ts1 === "wash away people and buildings", "ts1");
assert(phrases.ts2 === "destroy boats and ships", "ts2");
assert(phrases.ty1 === "knock down trees", "ty1");
assert(phrases.ty2 === "bring rainstorms / cause landslides / cause floods", "ty2");
assert(phrases.dr1 === "kill plants and animals", "dr1");
phraseBank.items.forEach((item) => assert(phraseBank.bank.includes(item.answer), `vocab bank has ${item.answer}`));
assert(answers.includes("natural disasters"), "natural disasters");
assert(answers.includes("washed away ; destroyed"), "worksheet cloze");

const grammar = content.modules.find((mod) => mod.id === "grammar");
const structure = grammar.steps.find((step) => step.kind === "bank" && step.bank.includes("since"));
const link = Object.fromEntries(structure.items.map((item) => [item.id, item.answer]));
assert(link.s1 === "since" && link.tl === "too little" && link.too === "too", "structure start");
assert(link.en === "enough" && link.full === "do not have enough", "structure end");
assert(structure.bank.includes("because") && structure.bank.includes("either") && structure.bank.includes("neither"), "structure traps");

const builder = grammar.steps.find((step) => step.kind === "builder");
assert(builder.items.map((item) => item.full).join(" | ") === [
  "Many animals have died since there is too little water to drink.",
  "Farmers can't grow crops since the ground is too dry.",
  "A lot of people have nowhere to live since the tsunami washed away many houses.",
  "People are now staying in tents since the earthquake destroyed many buildings.",
  "Some homes have no electricity since the typhoon damaged many power lines.",
].join(" | "), "builder sentences");

const blogs = grammar.steps.find((step) => step.kind === "bank" && step.bank.includes("too expensive"));
const blogMap = Object.fromEntries(blogs.items.map((item) => [item.id, item.answer]));
assert(blogMap.ind1 === "too expensive", "india food");
assert(blogMap.ind2 === "don't have enough warm clothes", "warm clothes");
assert(blogMap.ind3 === "too weak", "weak");
assert(blogMap.ind4 === "too little medicine", "medicine");
assert(blogMap.pk1 === "too crowded", "crowded");
assert(blogMap.pk2 === "too little milk powder", "milk");
assert(blogMap.pk3 === "don't have enough blankets", "blankets");
assert(blogs.bank.includes("neither") && blogs.bank.includes("shall we"), "blog traps");
assert(answers.includes("Farmers can't grow crops since there's too little water."), "kenya presentation");
assert(answers.includes("Some people can't sleep well since they don't have enough warm clothes."), "dialogue");
assert(answers.includes("weak"), "spelling weak");
assert(!answers.includes("week"), "not week");

function passageText(mod) {
  return JSON.stringify(mod.steps.filter((step) => step.kind === "read").map((step) => step.paragraphs));
}

const play = content.modules.find((mod) => mod.id === "play");
const playText = passageText(play);
[
  "Dear supporters",
  "donations",
  "Hari",
  "Nepal",
  "terrified",
  "burst into tears",
  "aftershocks",
  "tents, food and drinking water",
  "David, Kenya",
  "drought",
  "stomach growls like a mountain lion",
  "James Evans",
  "Volunteer Team",
  "monthly donations",
].forEach((bit) => assert(playText.includes(bit), `play missing ${bit}`));
assert(!/[\u4e00-\u9fff]/.test(playText), "play passage stays English");
assert(!/vivienne|hailey|kind heart/i.test(playText), "no ch4 play");

const playMcq = play.steps.filter((step) => step.kind === "mcq");
assert(playMcq.map((step) => step.answer).join("|") === [
  "Nepal",
  "an earthquake",
  "scared",
  "cried",
  "small earthquakes",
  "since the earthquake destroyed many roads",
  "tents, food and drinking water",
  "drought",
  "is very hungry",
  "Increase monthly donations and join the Volunteer Team",
].join("|"), "play key");

const summary = play.steps.find((step) => step.kind === "bank");
const words = Object.fromEntries(summary.items.map((item) => [item.id, item.answer]));
assert(words.nepal === "Nepal" && words.quake === "earthquake" && words.tents === "tents", "summary hari");
assert(words.kenya === "Kenya" && words.drought === "drought" && words.donate === "donate", "summary david");
assert(summary.bank.includes("visit") && summary.bank.includes("fair") && summary.bank.includes("hospital"), "summary traps");

const book = content.modules.find((mod) => mod.id === "book");
const bookText = passageText(book);
[
  "Kids-Opedia",
  "plates",
  "tsunami",
  "Hide under a strong table",
  "Don't exit the building",
  "Move to an open space",
  "Move to higher ground",
  "an app",
].forEach((bit) => assert(bookText.includes(bit), `book missing ${bit}`));
assert(!/[\u4e00-\u9fff]/.test(bookText), "book passage stays English");
assert(!/children don't give up/i.test(bookText), "not ch4 back cover");
const bookMcq = book.steps.filter((step) => step.kind === "mcq");
assert(bookMcq.map((step) => step.answer).join("|") === [
  "plates",
  "an earthquake",
  "a tsunami",
  "Hide under a strong table",
  "Exit the building before it is safe",
  "Move to an open space",
  "Move to higher ground",
  "what natural disasters are",
  "an app",
].join("|"), "book key");
const safety = book.steps.find((step) => step.kind === "bank");
const safeMap = Object.fromEntries(safety.items.map((item) => [item.id, item.answer]));
assert(safeMap.table === "table" && safeMap.glass === "glass" && safeMap.open === "open", "safety start");
assert(safeMap.higher === "higher" && safeMap.tsunami === "tsunami" && safeMap.plates === "plates", "safety end");

const write = content.modules.find((mod) => mod.id === "write");
const order = write.steps.find((step) => step.kind === "order");
assert(order.items[0].startsWith("Name the person"), "order starts with the person");
assert(order.items[4].startsWith("Say how you can help"), "order ends with help");
assert(!order.items.some((line) => /yours faithfully|dear principal/i.test(line)), "order is not a letter");
const letterBank = write.steps.find((step) => step.kind === "bank");
const bits = Object.fromEntries(letterBank.items.map((item) => [item.id, item.answer]));
assert(bits.since === "since" && bits.too === "too" && bits.little === "too little", "write grammar");
assert(bits.enough === "not enough" && bits.donate === "donate", "write help words");
assert(letterBank.bank.includes("Dear Principal,") && letterBank.bank.includes("Yours faithfully,"), "letter traps");
assert(letterBank.bank.includes("either") && letterBank.bank.includes("neither"), "connector traps");
const writeMcq = write.steps.filter((step) => step.kind === "mcq");
assert(writeMcq[0].answer === "No, only a short paragraph.", "not a letter");
assert(writeMcq[1].answer === "since + too / not enough (or too little)", "grammar set");

const free = write.steps.find((step) => step.kind === "write");
assert(free.samples.length === 3, "three teacher samples");
assert(free.samples[0].text.includes("too hungry to sleep"), "sample A");
assert(free.samples[1].text.includes("not enough water"), "sample B");
assert(free.samples[2].text.includes("too little water"), "sample C");
assert(free.question.includes("What do people like Hari and David need most?"), "prompt");
const visibleWrite = JSON.stringify(write.steps.filter((step) => step.kind !== "write"));
assert(!visibleWrite.includes("People like David need food and water most."), "sample A stays on the write step");
assert(!write.steps.some((step) => step.kind === "read"), "no model letter");
assert(!visibleWrite.includes("28th October"), "no letter date");

const game = fs.readFileSync(path.join(__dirname, "../js/game.js"), "utf8");
assert(game.includes("p6-peter-leap-ch3-v1"), "stars key");
assert(game.includes("主頁") && game.includes("提示") && game.includes("音效"), "Chinese buttons");
assert(game.includes("範例／教師用"), "teacher label");
assert(game.includes("const showSamples = submitted || state.teacher"), "samples gated");
assert(game.includes("assets/vocab/drought.png"), "photo path");
assert(game.includes("assets/vocab/hill_fire.png"), "hill fire path");
assert(game.includes("assets/vocab/volcanic_eruption.png"), "volcano path");
assert(!/sell flags|visit the elderly|Kind Heart|Yours faithfully,/.test(game), "game has no ch4 targets");
const sw = fs.readFileSync(path.join(__dirname, "../sw.js"), "utf8");
assert(sw.includes("p6-peter-leap-ch3-v1"), "cache name");
assert(sw.includes("./assets/vocab/tsunami.png"), "sw caches photos");
const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
assert(html.includes("js/content.js") && html.includes("js/game.js") && html.includes("manifest.webmanifest"), "page links");
assert(html.includes("Peter · Reading &amp; Writing Ch3"), "html title");

[
  "drought.png",
  "tornado.png",
  "typhoon.png",
  "flood.png",
  "landslide.png",
  "avalanche.png",
  "earthquake.png",
  "hill_fire.png",
  "tsunami.png",
  "volcanic_eruption.png",
  "manifest.json",
].forEach((file) => {
  const full = path.join(__dirname, "../assets/vocab", file);
  assert(fs.existsSync(full) && fs.statSync(full).size > 50, `missing crop ${file}`);
});

const simplified = "这们为国学问后发体东车来过还对时样经书长门开关云产广贝页风飞马鱼鸟龙";
const chineseBits = [];
function collectChinese(value) {
  if (typeof value === "string") chineseBits.push(value);
  else if (Array.isArray(value)) value.forEach(collectChinese);
  else if (value && typeof value === "object") Object.values(value).forEach(collectChinese);
}
collectChinese(content);
const joined = chineseBits.join("\n");
[...simplified].forEach((ch) => {
  if (joined.includes(ch)) failures.push(`simplified character ${ch}`);
});

const kinds = new Set();
content.modules.forEach((mod) => mod.steps.forEach((step) => kinds.add(step.kind)));
["teach", "mcq", "iconHunt", "pictureMatch", "bank", "builder", "read", "order", "write"].forEach((kind) => {
  assert(kinds.has(kind), `missing step kind ${kind}`);
});

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`ok ${answers.length} keyed answers`);
