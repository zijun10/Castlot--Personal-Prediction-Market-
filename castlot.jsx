import { useState, useEffect, useRef, useCallback } from "react";

// ─── LMSR Market Engine ───────────────────────────────────────────────────────
const LMSR_B = 80;
function lmsrCost(qYes, qNo) {
  return LMSR_B * Math.log(Math.exp(qYes / LMSR_B) + Math.exp(qNo / LMSR_B));
}
function lmsrPrice(qYes, qNo, side) {
  const expY = Math.exp(qYes / LMSR_B);
  const expN = Math.exp(qNo / LMSR_B);
  return side === "yes" ? expY / (expY + expN) : expN / (expY + expN);
}
function calcBrierScore(predictions) {
  if (!predictions.length) return null;
  const sum = predictions.reduce((acc, p) => {
    const outcome = p.resolved ? 1 : 0;
    return acc + Math.pow(p.probability - outcome, 2);
  }, 0);
  return (sum / predictions.length).toFixed(3);
}

// ─── Color Palette 
const C = {
  bg: "#FFF0F5",           // Lavender Blush — main backdrop
  plum: "#3D0030",         // Deep Plum — primary dark
  plumMid: "#6B0050",      // Mid Plum — hover states, borders
  plumLight: "#9B1070",    // Light Plum — accents
  babyBlue: "#C2DCFF",     // Baby Blue — secondary accent
  babyBlueDark: "#7AAFEE", // Deeper blue — active states
  text: "#1A000F",         // Near-black with plum tint
  textMid: "#6B2050",      // Mid text
  textSoft: "#C490B0",     // Soft muted text
  white: "#FFFFFF",
  card: "#FFFFFF",
  cardBorder: "rgba(61,0,48,0.10)",
  cardHover: "rgba(61,0,48,0.04)",
  yes: "#1A7A4A",          // Deep green for YES
  no: "#C0392B",           // Red for NO
  gold: "#3D0030",         // Use plum as primary action (replaces amber)
  goldText: "#FFFFFF",
};

// ─── Mock Data ────────────────────────────────────────────────────────────────
const INITIAL_MARKETS = [
  {
    id: 1, title: "Will I get a return offer from Jane Street after my summer internship?",
    category: "career", creator: "anon_7821", creatorId: "u1",
    audioSummary: "So I just finished my third week at Jane Street and honestly it's been a whirlwind. The culture is intense — everyone is absurdly smart and I feel like I'm drinking from a firehose every single day. My manager seems happy with my project progress but I haven't gotten any explicit feedback yet. The return offer rate is historically around 60% but this year they mentioned headcount is tighter. I have 5 weeks left and I'm trying to figure out whether to start recruiting elsewhere just in case...",
    transcript: [
      { time: "0:00", text: "So I just finished my third week at Jane Street..." },
      { time: "0:08", text: "...and honestly it's been a whirlwind." },
      { time: "0:12", text: "The culture is intense — everyone is absurdly smart." },
      { time: "0:20", text: "My manager seems happy with my project progress..." },
      { time: "0:28", text: "...but I haven't gotten any explicit feedback yet." },
      { time: "0:35", text: "The return offer rate is historically around 60%..." },
      { time: "0:42", text: "...but this year headcount is tighter." },
      { time: "0:50", text: "I have 5 weeks left and I'm deciding whether to recruit elsewhere." },
    ],
    qYes: 120, qNo: 60, resolution: "2025-08-15", traders: 47, verified: false,
    comments: [
      { user: "forecaster_99", text: "Jane Street return offers tanked last year. I'd say 45%.", score: 12 },
      { user: "quant_watcher", text: "If manager is happy week 3 that's a strong signal. 72% YES.", score: 8 },
      { user: "oracle_mia", text: "Recruit in parallel regardless. Never put all eggs in one basket.", score: 15 },
    ],
    userVote: null, resolved: null, tags: ["internship", "finance", "quant"]
  },
  {
    id: 2, title: "Will I stick to going to the gym 4x/week for the entire month of July?",
    category: "habits", creator: "anon_3341", creatorId: "u2",
    audioSummary: "Okay so I've been saying I'm going to get consistent with the gym for literally two years now. I finally got a membership at the CUC and my goal is four days a week for the whole month of July. I've downloaded a tracker app, I have a workout plan, and my roommate is supposed to hold me accountable. The problem is I've started strong before and then week two or three just completely falls apart when assignments pile up. But this time I'm putting it on Castlot so there's actual stakes...",
    transcript: [
      { time: "0:00", text: "Okay so I've been saying I'm going to get consistent with the gym..." },
      { time: "0:07", text: "...for literally two years now." },
      { time: "0:10", text: "I finally got a membership at the CUC." },
      { time: "0:15", text: "My goal is four days a week for the whole month of July." },
      { time: "0:22", text: "I have a tracker app, a workout plan, and an accountability roommate." },
      { time: "0:30", text: "The problem is week two or three always falls apart..." },
      { time: "0:38", text: "...when assignments pile up." },
      { time: "0:44", text: "This time I'm putting it on Castlot so there's actual stakes." },
    ],
    qYes: 40, qNo: 90, resolution: "2025-07-31", traders: 31, verified: false,
    comments: [
      { user: "stats_kid", text: "Base rate for gym consistency at 4x/week for a month is like 20%. 28% YES.", score: 19 },
      { user: "habit_hawk", text: "Accountability roommate is a huge boost. I'd go 40%.", score: 7 },
    ],
    userVote: null, resolved: null, tags: ["gym", "habits", "wellness"]
  },
  {
    id: 3, title: "Will I choose the startup offer over Google if I get both?",
    category: "career", creator: "anon_5509", creatorId: "u3",
    audioSummary: "I have a really weird problem — I'm currently holding a Google L4 offer for $280k total comp and I'm in final rounds at a 40-person Series B startup doing AI infrastructure. The startup would be around $160k salary plus equity that could be worth a lot or nothing. I went to CMU specifically to do impactful technical work and I genuinely believe in the startup's mission. But my parents are immigrants and the stability of Google feels deeply important to them and honestly to part of me too. If I get the startup offer, I don't know what I'll do...",
    transcript: [
      { time: "0:00", text: "I have a really weird problem." },
      { time: "0:04", text: "I'm holding a Google L4 offer for $280k total comp..." },
      { time: "0:10", text: "...and I'm in final rounds at a 40-person Series B startup." },
      { time: "0:18", text: "The startup does AI infrastructure — I believe in the mission." },
      { time: "0:25", text: "But my parents are immigrants. Stability matters to them." },
      { time: "0:32", text: "Google is $280k. Startup is $160k plus equity that could be zero." },
      { time: "0:40", text: "If I get the startup offer... I genuinely don't know what I'll do." },
    ],
    qYes: 55, qNo: 70, resolution: "2025-06-30", traders: 62, verified: false,
    comments: [
      { user: "vc_lurker", text: "Series B AI infra in this market? Take the startup. 58% they choose it.", score: 22 },
      { user: "pragmatist_p", text: "Parents factor is underweighted here. 35% YES.", score: 11 },
      { user: "oracle_mia", text: "The fact they recorded this podcast means they want the startup. 65%.", score: 31 },
    ],
    userVote: null, resolved: null, tags: ["career", "startup", "google", "decision"]
  },
  {
    id: 4,
    title: "Will I switch my major from CS to Business before junior year?",
    category: "academics",
    creator: "anon_2291",
    creatorId: "u4",
    audioSummary: "I came into CMU as a CS major but honestly I've been enjoying my Tepper electives way more than my coding classes. My GPA in CS is fine but I just don't feel it anymore. Everyone says switching is career suicide but I keep seeing business majors landing amazing jobs too...",
    transcript: [
      { time: "0:00", text: "I came into CMU as a CS major..." },
      { time: "0:07", text: "...but my Tepper electives feel way more alive." },
      { time: "0:14", text: "My GPA in CS is fine, I just don't feel it." },
      { time: "0:21", text: "Everyone says switching is career suicide." },
      { time: "0:28", text: "But business majors are landing amazing jobs too." },
      { time: "0:35", text: "I have until junior year to decide." },
    ],
    qYes: 35, qNo: 80,
    resolution: "2026-01-15",
    traders: 29,
    verified: false,
    comments: [
      { user: "oracle_mia", text: "CS/Business hybrid is the move. Switching fully is risky. 25% YES.", score: 14 },
      { user: "stats_kid", text: "Most people who feel this way junior year do switch. 45%.", score: 9 },
    ],
    userVote: null,
    resolved: null,
    tags: ["academics", "major", "decision"]
  },
  {
    id: 4,
    title: "I'm on the waitlist for a single. Will I get it before the semester ends?",
    category: "academics",
    creator: "anon_4421",
    creatorId: "u4",
    audioSummary: "I've been on the waitlist for a single room since week two of the semester. My RA said 'movement happens' but hasn't told me anything concrete. I'm currently in a triple and I genuinely cannot focus. There are supposedly 3 people ahead of me but two of them might be transferring out...",
    transcript: [
      { time: "0:00", text: "I've been on the waitlist for a single since week two." },
      { time: "0:07", text: "My RA says 'movement happens' but nothing concrete." },
      { time: "0:13", text: "I'm currently in a triple. I cannot focus." },
      { time: "0:20", text: "Three people are ahead of me on the list." },
      { time: "0:26", text: "Two of them might be transferring out though." },
      { time: "0:33", text: "Semester ends in 9 weeks. Fingers crossed." },
    ],
    qYes: 45, qNo: 75,
    resolution: "2025-05-10",
    traders: 24,
    verified: false,
    comments: [
      { user: "dorm_oracle", text: "Waitlist singles almost never clear unless someone drops out. 30% YES.", score: 11 },
      { user: "habit_hawk", text: "If 2 are transferring that changes the math. I'd say 50%.", score: 7 },
    ],
    userVote: null, resolved: null,
    tags: ["housing", "dorm", "waitlist"]
  },
  {
    id: 5,
    title: "My roommate owes me $200 from last month. Will I get it back?",
    category: "relationships",
    creator: "anon_8832",
    creatorId: "u5",
    audioSummary: "My roommate borrowed $200 for a concert ticket last month and has been 'forgetting' to Venmo me back ever since. Every time I bring it up he says he'll send it tonight and then doesn't. We have 3 more months living together and I don't want it to get weird but $200 is $200...",
    transcript: [
      { time: "0:00", text: "My roommate borrowed $200 for a concert ticket." },
      { time: "0:07", text: "That was a month ago. He hasn't Venmo'd me back." },
      { time: "0:13", text: "Every time I bring it up — 'I'll send it tonight.'" },
      { time: "0:20", text: "He never sends it tonight." },
      { time: "0:26", text: "We have 3 more months living together." },
      { time: "0:32", text: "$200 is $200. Do I push harder or let it go?" },
    ],
    qYes: 38, qNo: 90,
    resolution: "2025-04-01",
    traders: 41,
    verified: false,
    comments: [
      { user: "forecaster_99", text: "If it hasn't happened in a month it probably won't. 25% YES.", score: 18 },
      { user: "oracle_mia", text: "Send a Venmo request instead of asking verbally. Changes the dynamic.", score: 22 },
      { user: "quant_watcher", text: "Roommate debt has like a 30% recovery rate past 3 weeks. Data is clear.", score: 14 },
    ],
    userVote: null, resolved: null,
    tags: ["roommate", "money", "relationships"]
  },

  // ── CAREER ───────────────────────────────────────────────────────────────────
  {
    id: 6,
    title: "I bombed the first round but they said they'd reconsider. Am I getting the callback?",
    category: "career",
    creator: "anon_6614",
    creatorId: "u6",
    audioSummary: "I completely blanked on a dynamic programming question in my first round at a top quant firm. The interviewer was actually nice about it and said the team 'sometimes reconsiders strong candidates from other signals.' I sent a follow-up thank you note. It's been 5 days. I don't know if that was a real thing they said or just a polite exit...",
    transcript: [
      { time: "0:00", text: "I blanked on a DP question in my first round." },
      { time: "0:07", text: "Top quant firm. It did not go well." },
      { time: "0:13", text: "The interviewer said they 'sometimes reconsider.'" },
      { time: "0:20", text: "I don't know if that was real or just a polite exit." },
      { time: "0:27", text: "I sent a follow-up note. It's been 5 days." },
      { time: "0:33", text: "Every email notification gives me anxiety." },
    ],
    qYes: 22, qNo: 95,
    resolution: "2025-03-15",
    traders: 55,
    verified: false,
    comments: [
      { user: "vc_lurker", text: "'We'll reconsider' is a soft no 90% of the time. 15% YES.", score: 25 },
      { user: "stats_kid", text: "5 days of silence after that comment = no callback. 12%.", score: 17 },
      { user: "oracle_mia", text: "Unlikely but prep anyway. The act of preparing changes outcomes.", score: 19 },
    ],
    userVote: null, resolved: null,
    tags: ["recruiting", "internship", "callback"]
  },
  {
    id: 7,
    title: "I applied to 12 internships this recruiting season. Will I have an offer by March 1?",
    category: "career",
    creator: "anon_1193",
    creatorId: "u7",
    audioSummary: "I've sent out 12 applications this recruiting cycle — mix of big tech, fintech, and a couple startups. Got two first rounds so far, one went well and one was a disaster. March 1st is my personal deadline because after that most programs fill up. My GPA is a 3.6 and I have one previous internship so I think I'm a competitive candidate but recruiting feels completely random...",
    transcript: [
      { time: "0:00", text: "12 applications out this cycle. Big tech, fintech, startups." },
      { time: "0:08", text: "Two first rounds so far. One good, one disaster." },
      { time: "0:15", text: "March 1st is my personal deadline." },
      { time: "0:21", text: "After that most programs are filled." },
      { time: "0:27", text: "3.6 GPA, one prior internship — I think I'm competitive." },
      { time: "0:34", text: "But recruiting feels completely random." },
    ],
    qYes: 70, qNo: 50,
    resolution: "2025-03-01",
    traders: 38,
    verified: false,
    comments: [
      { user: "quant_watcher", text: "12 apps with 2 first rounds and a 3.6 is solid. 68% YES.", score: 13 },
      { user: "habit_hawk", text: "One good first round converts ~40% of the time. Math checks out.", score: 9 },
    ],
    userVote: null, resolved: null,
    tags: ["internship", "recruiting", "offer"]
  },
  {
    id: 8,
    title: "My manager hinted at a return offer. Will it be in writing by Friday?",
    category: "career",
    creator: "anon_7750",
    creatorId: "u8",
    audioSummary: "My manager pulled me aside yesterday and said the team 'really wants to bring me back' and that I should 'expect to hear something soon.' It's Wednesday. I'm flying home Sunday and I really wanted to have this in writing before I leave. HR hasn't reached out yet and my manager has gone a bit quiet since that conversation...",
    transcript: [
      { time: "0:00", text: "My manager said the team 'really wants to bring me back.'" },
      { time: "0:08", text: "That was yesterday. It's Wednesday now." },
      { time: "0:13", text: "I fly home Sunday. I want this in writing first." },
      { time: "0:20", text: "HR hasn't reached out yet." },
      { time: "0:25", text: "My manager has gone quiet since that conversation." },
      { time: "0:32", text: "Do I follow up or wait it out?" },
    ],
    qYes: 55, qNo: 60,
    resolution: "2025-03-07",
    traders: 33,
    verified: false,
    comments: [
      { user: "vc_lurker", text: "Manager verbal + HR silence = 48 hr delay typical. 55% by Friday.", score: 16 },
      { user: "forecaster_99", text: "Send a polite follow-up to HR today. Don't just wait.", score: 21 },
    ],
    userVote: null, resolved: null,
    tags: ["return-offer", "internship", "career"]
  },

  // ── ACADEMICS ────────────────────────────────────────────────────────────────
  {
    id: 9,
    title: "I haven't started the final project. Will I submit before the deadline?",
    category: "academics",
    creator: "anon_2267",
    creatorId: "u9",
    audioSummary: "The final project is worth 40% of my grade and it's due in 72 hours. I have not started. I've opened the spec document four times and closed it. I have all the pieces in my head I just cannot get myself to sit down and start. I've done this before and somehow pulled it off. My roommate says I'm cooked. I think I'm fine...",
    transcript: [
      { time: "0:00", text: "Final project. Worth 40% of my grade." },
      { time: "0:05", text: "Due in 72 hours. I have not started." },
      { time: "0:10", text: "I've opened the spec document four times and closed it." },
      { time: "0:17", text: "I have all the pieces in my head though." },
      { time: "0:23", text: "I've pulled this off before." },
      { time: "0:28", text: "My roommate says I'm cooked. I think I'm fine." },
    ],
    qYes: 75, qNo: 40,
    resolution: "2025-04-20",
    traders: 67,
    verified: false,
    comments: [
      { user: "oracle_mia", text: "72 hours is actually enough. The 'I've done this before' signal is strong. 78%.", score: 28 },
      { user: "stats_kid", text: "Submitting ≠ submitting well. But yes they'll submit. 85% YES.", score: 19 },
      { user: "habit_hawk", text: "The real question is what grade they get lol", score: 31 },
    ],
    userVote: null, resolved: null,
    tags: ["academics", "procrastination", "deadline"]
  },
  {
    id: 10,
    title: "I'm going to ask my professor to round my 89.2 to an A. Will they say yes?",
    category: "academics",
    creator: "anon_5538",
    creatorId: "u9",
    audioSummary: "I have an 89.2 in orgo and I need an A for my med school GPA. I've gone to every office hours, submitted all extra credit, and I genuinely tried my best. The professor seems like a reasonable person and I have a draft email written asking if there's any flexibility. My pre-med advisor said it's worth asking. My gut says the answer is no but I have to try...",
    transcript: [
      { time: "0:00", text: "89.2 in orgo. I need an A for med school." },
      { time: "0:07", text: "I went to every office hours. Did all extra credit." },
      { time: "0:14", text: "The professor seems like a reasonable person." },
      { time: "0:20", text: "I have a draft email asking for flexibility." },
      { time: "0:26", text: "My pre-med advisor said it's worth asking." },
      { time: "0:32", text: "My gut says no. But I have to try." },
    ],
    qYes: 28, qNo: 88,
    resolution: "2025-05-01",
    traders: 49,
    verified: false,
    comments: [
      { user: "quant_watcher", text: "Professors who set hard grade boundaries don't move them. 20% YES.", score: 22 },
      { user: "forecaster_99", text: "Consistent office hours attendance is your best argument. Frame around that.", score: 17 },
      { user: "oracle_mia", text: "Worth asking regardless. Worst case is the no you already expected.", score: 24 },
    ],
    userVote: null, resolved: null,
    tags: ["grades", "academics", "premed"]
  },
  {
    id: 11,
    title: "I've been skipping lecture for 3 weeks. Will I pass the midterm anyway?",
    category: "academics",
    creator: "anon_9901",
    creatorId: "u10",
    audioSummary: "Okay so I haven't been to lecture in 3 weeks. The slides are posted online and I've been telling myself I'll catch up but I haven't. The midterm is in 4 days. I have the notes from a friend, access to all the recordings, and I'm going to do a full cram session this weekend. I've passed harder exams on less. The question is whether I can retain 3 weeks of material in 4 days...",
    transcript: [
      { time: "0:00", text: "I haven't been to lecture in 3 weeks." },
      { time: "0:06", text: "Slides are online. I kept saying I'd catch up." },
      { time: "0:12", text: "Midterm is in 4 days." },
      { time: "0:17", text: "I have notes from a friend and all the recordings." },
      { time: "0:23", text: "Full cram session this weekend." },
      { time: "0:28", text: "Can I retain 3 weeks of material in 4 days?" },
    ],
    qYes: 60, qNo: 65,
    resolution: "2025-03-20",
    traders: 72,
    verified: false,
    comments: [
      { user: "stats_kid", text: "Passing ≠ doing well. Passing threshold is low. 65% YES to pass.", score: 20 },
      { user: "habit_hawk", text: "3 weeks of content in 4 days is brutal but doable if the class isn't cumulative.", score: 15 },
      { user: "vc_lurker", text: "The confidence in the voice note actually increases my probability estimate lol", score: 27 },
    ],
    userVote: null, resolved: null,
    tags: ["academics", "midterm", "cramming"]
  },

  // ── RELATIONSHIPS ─────────────────────────────────────────────────────────────
  {
    id: 12,
    title: "I texted them first last 4 times in a row. Will they text me first this week?",
    category: "relationships",
    creator: "anon_3384",
    creatorId: "u11",
    audioSummary: "I've initiated every single conversation for the past two weeks. Four texts, all me first, all responded to warmly but never started by them. I told myself I'm not texting first this week just to see what happens. Part of me thinks they'll reach out by Wednesday. Part of me thinks I'll hear nothing and have my answer. Either way I'll know something I didn't before...",
    transcript: [
      { time: "0:00", text: "I've texted first four times in a row." },
      { time: "0:06", text: "They always respond warmly. Never initiate." },
      { time: "0:12", text: "This week I'm not texting first." },
      { time: "0:17", text: "Part of me thinks they'll reach out by Wednesday." },
      { time: "0:23", text: "Part of me thinks I'll hear nothing." },
      { time: "0:29", text: "Either way I'll know something I didn't before." },
    ],
    qYes: 35, qNo: 80,
    resolution: "2025-03-09",
    traders: 88,
    verified: false,
    comments: [
      { user: "oracle_mia", text: "4-0 initiation split is a pattern, not a coincidence. 28% they text first.", score: 34 },
      { user: "forecaster_99", text: "The 'responded warmly' detail is important. Not dead, just passive. 40%.", score: 19 },
      { user: "habit_hawk", text: "This experiment will tell you everything. Results incoming.", score: 41 },
    ],
    userVote: null, resolved: null,
    tags: ["relationships", "texting", "situationship"]
  },
  {
    id: 13,
    title: "We've been talking for 2 months. Will we make it official before spring break?",
    category: "relationships",
    creator: "anon_6621",
    creatorId: "u12",
    audioSummary: "We've been in this undefined talking stage for exactly two months now. We hang out multiple times a week, I've met some of their friends, and there's clearly something real here. Spring break is in 3 weeks and I feel like that trip apart is going to either make things click or let them fizzle. I want to have a conversation before we leave but I'm scared of ruining what we have...",
    transcript: [
      { time: "0:00", text: "Two months in the talking stage. Undefined." },
      { time: "0:07", text: "We hang out multiple times a week." },
      { time: "0:12", text: "I've met some of their friends. This is real." },
      { time: "0:18", text: "Spring break is in 3 weeks." },
      { time: "0:23", text: "Time apart will either make it click or fizzle." },
      { time: "0:29", text: "I want to have the talk. I'm scared to ruin it." },
    ],
    qYes: 52, qNo: 65,
    resolution: "2025-03-22",
    traders: 94,
    verified: false,
    comments: [
      { user: "oracle_mia", text: "Two months + meeting friends = above average probability. 55% YES.", score: 29 },
      { user: "stats_kid", text: "Spring break is actually a natural forcing function for DTR talks. 60%.", score: 18 },
      { user: "quant_watcher", text: "The fear of ruining it is exactly what keeps talking stages at 6 months. Have the talk.", score: 37 },
    ],
    userVote: null, resolved: null,
    tags: ["relationships", "official", "talking-stage"]
  },
  {
    id: 14,
    title: "My long-distance best friend and I are planning a visit. Will it actually happen?",
    category: "relationships",
    creator: "anon_4410",
    creatorId: "u13",
    audioSummary: "My best friend from home and I have been trying to plan a visit since September. We've picked three different weekends and something has come up every single time — their work schedule, my midterms, a family thing. We have a new date set for late March and we're both really committed this time. But we've said that before...",
    transcript: [
      { time: "0:00", text: "My best friend and I have been planning a visit since September." },
      { time: "0:08", text: "Three different weekends. Something came up every time." },
      { time: "0:15", text: "Work schedules, midterms, family stuff." },
      { time: "0:21", text: "New date set for late March." },
      { time: "0:26", text: "We're both really committed this time." },
      { time: "0:31", text: "But we've said that before." },
    ],
    qYes: 48, qNo: 70,
    resolution: "2025-03-30",
    traders: 31,
    verified: false,
    comments: [
      { user: "habit_hawk", text: "Three failed attempts is a bad prior. 35% YES.", score: 16 },
      { user: "forecaster_99", text: "Late March is lower stakes than midterm season. Better odds this time. 50%.", score: 11 },
    ],
    userVote: null, resolved: null,
    tags: ["friendship", "long-distance", "plans"]
  },

  // ── MONEY & PURCHASES ─────────────────────────────────────────────────────────
  {
    id: 15,
    title: "I said I'd stop ordering DoorDash for a month. Will I make it?",
    category: "purchases",
    creator: "anon_7723",
    creatorId: "u14",
    audioSummary: "I spent $340 on DoorDash last month. I saw the number and was genuinely shocked. I told my roommates I'm going cold turkey for 30 days starting Monday. They think I'll last a week. I've meal prepped before and it always collapses around day 10 when I have a bad day and just need pad thai delivered at 11pm. But this time I'm serious. Probably...",
    transcript: [
      { time: "0:00", text: "I spent $340 on DoorDash last month." },
      { time: "0:06", text: "I saw the number and was genuinely shocked." },
      { time: "0:11", text: "Cold turkey for 30 days starting Monday." },
      { time: "0:17", text: "My roommates think I'll last a week." },
      { time: "0:22", text: "It always collapses around day 10. Bad day, late night pad thai." },
      { time: "0:30", text: "This time I'm serious. Probably." },
    ],
    qYes: 25, qNo: 95,
    resolution: "2025-04-10",
    traders: 61,
    verified: false,
    comments: [
      { user: "stats_kid", text: "Cold turkey food delivery bans have a ~20% success rate. Roommates are right. 22%.", score: 30 },
      { user: "oracle_mia", text: "The 'probably' at the end tells you everything.", score: 45 },
      { user: "quant_watcher", text: "Delete the app. That single action doubles the odds.", score: 28 },
    ],
    userVote: null, resolved: null,
    tags: ["money", "doordash", "habits"]
  },
  {
    id: 16,
    title: "I'm trying to sell my textbooks before the semester ends. Will I find a buyer?",
    category: "purchases",
    creator: "anon_8812",
    creatorId: "u15",
    audioSummary: "I have four textbooks I need to sell before I move out. Listed them on the CMU Facebook group two weeks ago and got zero responses. They're not rare books — intro econ, calc 2, a stats textbook, and one programming book. I lowered the price once already. The semester ends in 6 weeks and after that I'll have to either ship them or trash them...",
    transcript: [
      { time: "0:00", text: "Four textbooks I need to sell before move-out." },
      { time: "0:07", text: "Listed on the CMU Facebook group. Zero responses." },
      { time: "0:13", text: "Intro econ, calc 2, stats, a programming book." },
      { time: "0:19", text: "I lowered the price once already." },
      { time: "0:25", text: "Six weeks left. After that I have to ship or trash them." },
      { time: "0:31", text: "Is anyone even buying textbooks anymore?" },
    ],
    qYes: 55, qNo: 60,
    resolution: "2025-05-10",
    traders: 22,
    verified: false,
    comments: [
      { user: "habit_hawk", text: "Try posting the week before finals. That's when people panic buy. 65% YES.", score: 13 },
      { user: "forecaster_99", text: "Facebook group is dead. Try Venmo request in class GroupMe instead.", score: 18 },
    ],
    userVote: null, resolved: null,
    tags: ["textbooks", "money", "selling"]
  },
  {
    id: 17,
    title: "I committed to not buying anything on Amazon for 30 days. Do I make it?",
    category: "purchases",
    creator: "anon_3301",
    creatorId: "u16",
    audioSummary: "I've ordered something on Amazon literally every week for the past 4 months. I looked at my purchase history and I'm spending around $200 a month on random stuff I don't need. I'm doing a 30-day no-Amazon challenge starting today. I've already thought of three things I 'need' that I won't be able to buy. This is going to be harder than I thought...",
    transcript: [
      { time: "0:00", text: "I've ordered on Amazon every week for 4 months." },
      { time: "0:07", text: "$200 a month on stuff I don't need." },
      { time: "0:12", text: "30-day no-Amazon challenge starting today." },
      { time: "0:18", text: "I've already thought of three things I 'need.'" },
      { time: "0:24", text: "The urge is already there and it's day one." },
      { time: "0:29", text: "This is going to be harder than I thought." },
    ],
    qYes: 30, qNo: 88,
    resolution: "2025-04-15",
    traders: 44,
    verified: false,
    comments: [
      { user: "oracle_mia", text: "Log out of Amazon and delete the app. Without that it's 15% YES. With it, 50%.", score: 26 },
      { user: "stats_kid", text: "Weekly buyers doing cold turkey: 25% make it 30 days.", score: 19 },
    ],
    userVote: null, resolved: null,
    tags: ["amazon", "spending", "challenge"]
  },

  // ── HEALTH & HABITS ───────────────────────────────────────────────────────────
  {
    id: 18,
    title: "I signed up for a 5K in 6 weeks. Will I actually run it?",
    category: "habits",
    creator: "anon_5529",
    creatorId: "u17",
    audioSummary: "I signed up for a 5K that's happening in 6 weeks. I have not run since high school. I was motivated when I registered but I haven't actually started training yet and it's been 10 days. The registration was $35 which I'm hoping is enough to keep me accountable. My friend who talked me into it runs a 22-minute 5K. I would be happy to finish...",
    transcript: [
      { time: "0:00", text: "Signed up for a 5K. It's in 6 weeks." },
      { time: "0:06", text: "I have not run since high school." },
      { time: "0:11", text: "10 days since I registered. Still haven't started training." },
      { time: "0:18", text: "Registration was $35. That's my accountability." },
      { time: "0:24", text: "My friend runs a 22-minute 5K." },
      { time: "0:29", text: "I would be happy to finish. Just finish." },
    ],
    qYes: 62, qNo: 55,
    resolution: "2025-04-27",
    traders: 37,
    verified: false,
    comments: [
      { user: "habit_hawk", text: "Paid registration is a strong commitment signal. 65% YES to at least show up.", score: 21 },
      { user: "quant_watcher", text: "Finishing a 5K untrained in 6 weeks is very doable. Not fast, but doable.", score: 14 },
      { user: "oracle_mia", text: "The goal being 'just finish' is the right framing. That mental shift matters.", score: 18 },
    ],
    userVote: null, resolved: null,
    tags: ["fitness", "5k", "habits"]
  },
  {
    id: 19,
    title: "I've been meaning to make a therapy appointment for 2 months. Will I book it this week?",
    category: "habits",
    creator: "anon_1128",
    creatorId: "u18",
    audioSummary: "I've been telling myself I need to make a therapy appointment since the start of the semester. I have insurance that covers it, I've done therapy before and it helped, and I know the number to call. I just keep not doing it. Every Sunday I say I'll do it Monday. It's been 8 Sundays. Something about actually making the call feels harder than it should...",
    transcript: [
      { time: "0:00", text: "I've been meaning to book therapy since the semester started." },
      { time: "0:08", text: "I have insurance. I've done it before and it helped." },
      { time: "0:15", text: "I know the number to call. I just keep not doing it." },
      { time: "0:22", text: "Every Sunday I say I'll do it Monday." },
      { time: "0:28", text: "It's been 8 Sundays." },
      { time: "0:33", text: "Making the call feels harder than it should." },
    ],
    qYes: 45, qNo: 68,
    resolution: "2025-03-09",
    traders: 53,
    verified: false,
    comments: [
      { user: "oracle_mia", text: "The fact they're posting this is a signal they're ready. 50% YES this week.", score: 32 },
      { user: "forecaster_99", text: "Book it right now. Don't wait for the 'right moment.' Close this app and call.", score: 47 },
      { user: "stats_kid", text: "8-week delay patterns usually break via external trigger, not internal motivation.", score: 21 },
    ],
    userVote: null, resolved: null,
    tags: ["mentalhealth", "therapy", "habits"]
  },
  {
    id: 20,
    title: "I told my friends I'm cutting out alcohol for January. Do I make it the full month?",
    category: "habits",
    creator: "anon_9934",
    creatorId: "u19",
    audioSummary: "I announced to my friend group that I'm doing dry January. I'm 11 days in and it's been fine so far — mostly because nothing major has happened yet. This weekend is a birthday party and next weekend is a formal. Those are the real tests. I've never done a full dry month before. My friends are betting against me. I want to prove them wrong...",
    transcript: [
      { time: "0:00", text: "Dry January. Day 11. Fine so far." },
      { time: "0:06", text: "Nothing major has happened yet. That's the key." },
      { time: "0:12", text: "This weekend: birthday party." },
      { time: "0:16", text: "Next weekend: formal." },
      { time: "0:20", text: "Those are the real tests." },
      { time: "0:25", text: "My friends are betting against me. I want to prove them wrong." },
    ],
    qYes: 42, qNo: 75,
    resolution: "2025-02-01",
    traders: 66,
    verified: false,
    comments: [
      { user: "stats_kid", text: "Formal + birthday party in same month = 35% completion rate for dry January. Hard.", score: 28 },
      { user: "habit_hawk", text: "Day 11 is actually the hardest stretch. If they make it to day 15 odds improve.", score: 17 },
      { user: "oracle_mia", text: "The 'proving friends wrong' motivation is underrated. Adds 10 points to my estimate.", score: 22 },
    ],
    userVote: null, resolved: null,
    tags: ["dryjanuary", "habits", "alcohol"]
  },

  // ── SOCIAL & CAMPUS LIFE ──────────────────────────────────────────────────────
  {
    id: 21,
    title: "I said I'd join a club this semester. Will I actually go to a meeting?",
    category: "academics",
    creator: "anon_4477",
    creatorId: "u20",
    audioSummary: "I've been saying I'll join a club since freshman year. I'm a junior now. Every Activities Fair I sign up for 6 mailing lists and attend zero meetings. This semester I picked one club — just one — that I actually care about. Their next meeting is Thursday. I have it in my calendar. I have no excuse. But I also had it in my calendar last semester...",
    transcript: [
      { time: "0:00", text: "I've said I'd join a club since freshman year." },
      { time: "0:06", text: "I'm a junior. Zero meetings attended." },
      { time: "0:11", text: "This semester I picked one club I actually care about." },
      { time: "0:18", text: "Next meeting is Thursday. It's in my calendar." },
      { time: "0:24", text: "I have no excuse this time." },
      { time: "0:29", text: "But I also had it in my calendar last semester." },
    ],
    qYes: 55, qNo: 60,
    resolution: "2025-03-13",
    traders: 29,
    verified: false,
    comments: [
      { user: "quant_watcher", text: "'One club I actually care about' changes the prior. 58% YES.", score: 14 },
      { user: "oracle_mia", text: "The junior year urgency is real. That matters more than the calendar.", score: 19 },
    ],
    userVote: null, resolved: null,
    tags: ["clubs", "campus", "sociallife"]
  },
  {
    id: 22,
    title: "My friend group has been trying to plan a trip for months. Does it actually happen?",
    category: "relationships",
    creator: "anon_6650",
    creatorId: "u21",
    audioSummary: "Six of us have been in a group chat called 'TRIP 2025' since October. We've narrowed it down to two destinations, had three Google Meet calls, and made zero bookings. Every time we get close someone has a conflict or a budget concern. I love these people but group trip planning is a nightmare. Spring break is the target. I give us 40/60 odds...",
    transcript: [
      { time: "0:00", text: "Group chat called 'TRIP 2025' since October." },
      { time: "0:07", text: "Six people. Three planning calls. Zero bookings." },
      { time: "0:13", text: "Two destinations narrowed down. Still no decision." },
      { time: "0:20", text: "Every time we get close someone has a conflict." },
      { time: "0:27", text: "Spring break is the target." },
      { time: "0:31", text: "I give us 40/60 odds. Maybe." },
    ],
    qYes: 40, qNo: 80,
    resolution: "2025-03-22",
    traders: 58,
    verified: false,
    comments: [
      { user: "stats_kid", text: "Six-person trips with no booking after 5 months: 25% completion rate.", score: 33 },
      { user: "vc_lurker", text: "Someone needs to just book and make everyone Venmo them. That's the only path.", score: 41 },
      { user: "habit_hawk", text: "The fact that they named the chat is either a good sign or pure cope.", score: 38 },
    ],
    userVote: null, resolved: null,
    tags: ["grouptrip", "friends", "planning"]
  },
  {
    id: 23,
    title: "I have a presentation in front of 80 people next week. Will I wing it or actually practice?",
    category: "academics",
    creator: "anon_2255",
    creatorId: "u22",
    audioSummary: "I have a 10-minute presentation for my capstone class next Friday. There are 80 people in the room including professors and recruiters. I have the slides done but I haven't practiced out loud once. Every night this week I've told myself I'll run through it tomorrow. It's Wednesday. I'm a good improviser but this one actually matters and I know I should practice. Will I?",
    transcript: [
      { time: "0:00", text: "10-minute capstone presentation next Friday." },
      { time: "0:07", text: "80 people. Professors and recruiters in the room." },
      { time: "0:13", text: "Slides are done. Zero practice out loud." },
      { time: "0:19", text: "Every night this week: 'I'll practice tomorrow.'" },
      { time: "0:25", text: "It's Wednesday. This one actually matters." },
      { time: "0:31", text: "I'm a good improviser. But will I practice?" },
    ],
    qYes: 48, qNo: 70,
    resolution: "2025-03-14",
    traders: 45,
    verified: false,
    comments: [
      { user: "oracle_mia", text: "Recruiters in the room changes behavior. 55% they actually practice at least once.", score: 24 },
      { user: "forecaster_99", text: "Wednesday realization with recruiters present = at least one run-through guaranteed.", score: 17 },
      { user: "stats_kid", text: "Define 'practice.' Mumbling through it once while distracted counts to most people.", score: 31 },
    ],
    userVote: null, resolved: null,
    tags: ["presentation", "academics", "publicspeaking"]
  },

];

const CATEGORIES = ["all", "career", "relationships", "habits", "academics", "purchases"];

const CATEGORY_COLORS = {
  career: "#3D0030",
  relationships: "#7AAFEE",
  habits: "#6B0050",
  academics: "#9B1070",
  purchases: "#C2DCFF",
  all: "#C490B0",
};

// ─── Brier Score helper ───────────────────────────────────────────────────────
function brierLabel(score) {
  if (score === null) return { label: "No data", color: "#C490B0" };
  const s = parseFloat(score);
  if (s < 0.1) return { label: "Oracle", color: "#3D0030" };
  if (s < 0.15) return { label: "Expert", color: "#6B0050" };
  if (s < 0.2) return { label: "Analyst", color: "#9B1070" };
  return { label: "Novice", color: "#C490B0" };
}

// ─── Waveform Component ───────────────────────────────────────────────────────
function AudioWaveform({ isPlaying, progress }) {
  const bars = 40;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, height: 40 }}>
      {Array.from({ length: bars }).map((_, i) => {
        const heightPct = 20 + Math.sin(i * 0.8) * 15 + Math.sin(i * 1.7) * 10 + Math.random() * 5;
        const filled = (i / bars) * 100 < progress;
        return (
          <div key={i} style={{
            width: 3, borderRadius: 2,
            height: `${heightPct}px`,
            background: filled ? C.plum : "rgba(61,0,48,0.15)",
            transition: "background 0.3s",
            animation: isPlaying && filled ? `wavePulse ${0.5 + Math.random() * 0.5}s ease-in-out infinite alternate` : "none",
          }} />
        );
      })}
    </div>
  );
}

// ─── Probability Gauge ────────────────────────────────────────────────────────
function ProbabilityGauge({ yesPct, animated = true }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const dash = (yesPct / 100) * circ;
  return (
    <div style={{ position: "relative", width: 128, height: 128 }}>
      <svg width="128" height="128" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="64" cy="64" r={r} fill="none" stroke="rgba(61,0,48,0.10)" strokeWidth="10" />
        <circle cx="64" cy="64" r={r} fill="none" stroke={C.plum} strokeWidth="10"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: animated ? "stroke-dasharray 0.8s cubic-bezier(0.34,1.56,0.64,1)" : "none" }} />
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center"
      }}>
        <div style={{ fontSize: 26, fontWeight: 800, color: C.plum, fontFamily: "'DM Serif Display', serif" }}>
          {yesPct}%
        </div>
        <div style={{ fontSize: 10, color: C.textSoft, letterSpacing: 2, textTransform: "uppercase" }}>YES</div>
      </div>
    </div>
  );
}

// ─── Market Card (Story format) ───────────────────────────────────────────────
function MarketCard({ market, onTrade, onComment, userFP, currentUser }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [transcriptIdx, setTranscriptIdx] = useState(0);
  const [comment, setComment] = useState("");
  const [showComments, setShowComments] = useState(false);
  const intervalRef = useRef(null);

  const yesPct = Math.round(lmsrPrice(market.qYes, market.qNo, "yes") * 100);
  const noPct = 100 - yesPct;
  const daysLeft = Math.ceil((new Date(market.resolution) - new Date()) / 86400000);
  const catColor = CATEGORY_COLORS[market.category] || "#94A3B8";

  const togglePlay = () => {
    if (playing) {
      clearInterval(intervalRef.current);
      setPlaying(false);
    } else {
      setPlaying(true);
      intervalRef.current = setInterval(() => {
        setProgress(p => {
          if (p >= 100) { clearInterval(intervalRef.current); setPlaying(false); return 100; }
          const next = p + 0.5;
          const idx = Math.floor((next / 100) * market.transcript.length);
          setTranscriptIdx(Math.min(idx, market.transcript.length - 1));
          return next;
        });
      }, 80);
    }
  };

  useEffect(() => () => clearInterval(intervalRef.current), []);

  const handleSubmitComment = () => {
    if (!comment.trim()) return;
    onComment(market.id, comment);
    setComment("");
  };

  return (
    <div style={{
      background: C.white,
      borderRadius: 24, overflow: "hidden", border: `1px solid ${C.cardBorder}`,
      boxShadow: "0 4px 24px rgba(61,0,48,0.08)", marginBottom: 24,
      fontFamily: "'DM Sans', sans-serif"
    }}>
      {/* TOP: Audio Player (Instagram story top half) */}
      <div style={{
        padding: "28px 28px 20px", background: `linear-gradient(180deg, rgba(194,220,255,0.25) 0%, rgba(255,240,245,0.6) 100%)`,
        borderBottom: `1px solid ${C.cardBorder}`
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <span style={{
              background: (catColor === C.babyBlue || catColor === C.babyBlueDark) ? "rgba(122,175,238,0.15)" : "rgba(61,0,48,0.08)",
              color: catColor === C.babyBlue ? C.babyBlueDark : catColor,
              border: `1px solid ${catColor === C.babyBlue ? "rgba(122,175,238,0.4)" : "rgba(61,0,48,0.15)"}`,
              borderRadius: 20, padding: "3px 12px", fontSize: 11, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: 1.5
            }}>
              {market.category}
            </span>
            <div style={{ marginTop: 8, fontSize: 16, fontWeight: 700, color: C.text, lineHeight: 1.4, maxWidth: 420 }}>
              {market.title}
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 16 }}>
            <ProbabilityGauge yesPct={yesPct} />
          </div>
        </div>

        {/* Waveform + controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
          <button onClick={togglePlay} style={{
            width: 44, height: 44, borderRadius: "50%", border: "none",
            background: C.plum, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, boxShadow: "0 4px 16px rgba(61,0,48,0.3)",
            transition: "transform 0.15s"
          }}>
            {playing
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
            }
          </button>
          <div style={{ flex: 1 }}>
            <AudioWaveform isPlaying={playing} progress={progress} />
          </div>
        </div>

        {/* Spotify-style scrolling transcript */}
        <div style={{
          background: "rgba(61,0,48,0.04)", borderRadius: 12, padding: "12px 16px",
          minHeight: 64, overflow: "hidden", border: `1px solid rgba(61,0,48,0.07)`
        }}>
          {market.transcript.map((line, i) => (
            <div key={i} style={{
              fontSize: i === transcriptIdx ? 15 : 13,
              fontWeight: i === transcriptIdx ? 700 : 400,
              color: i === transcriptIdx ? C.plum : i < transcriptIdx ? "rgba(61,0,48,0.25)" : "rgba(61,0,48,0.35)",
              lineHeight: 1.6, transition: "all 0.4s ease",
              transform: i === transcriptIdx ? "scale(1.02)" : "scale(1)",
              transformOrigin: "left"
            }}>
              {line.text}
            </div>
          ))}
        </div>

        {/* Meta */}
        <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 12, color: C.textSoft }}>
          <span>👤 {market.creator}</span>
          <span>📅 {daysLeft}d left</span>
          <span>🔁 {market.traders} traders</span>
          {market.tags.map(t => <span key={t} style={{ color: "rgba(61,0,48,0.3)" }}>#{t}</span>)}
        </div>
      </div>

      {/* BOTTOM: Voting + Comments */}
      <div style={{ padding: "20px 28px 24px", background: C.white }}>
        {/* YES/NO Trade Buttons */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: C.textSoft, marginBottom: 10, letterSpacing: 1, textTransform: "uppercase" }}>
            Your forecast — costs 50 FP
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => onTrade(market.id, "yes")}
              disabled={market.userVote !== null || userFP < 50}
              style={{
                flex: 1, padding: "14px 0", borderRadius: 14, border: "2px solid",
                borderColor: market.userVote === "yes" ? C.yes : "rgba(26,122,74,0.3)",
                background: market.userVote === "yes" ? "rgba(26,122,74,0.1)" : "rgba(26,122,74,0.04)",
                color: C.yes, fontWeight: 800, fontSize: 15, cursor: market.userVote ? "default" : "pointer",
                transition: "all 0.2s", fontFamily: "'DM Sans', sans-serif"
              }}>
              ✓ YES &nbsp;<span style={{ fontWeight: 400, opacity: 0.6 }}>{yesPct}%</span>
            </button>
            <button onClick={() => onTrade(market.id, "no")}
              disabled={market.userVote !== null || userFP < 50}
              style={{
                flex: 1, padding: "14px 0", borderRadius: 14, border: "2px solid",
                borderColor: market.userVote === "no" ? C.no : "rgba(192,57,43,0.3)",
                background: market.userVote === "no" ? "rgba(192,57,43,0.1)" : "rgba(192,57,43,0.04)",
                color: C.no, fontWeight: 800, fontSize: 15, cursor: market.userVote ? "default" : "pointer",
                transition: "all 0.2s", fontFamily: "'DM Sans', sans-serif"
              }}>
              ✗ NO &nbsp;<span style={{ fontWeight: 400, opacity: 0.6 }}>{noPct}%</span>
            </button>
          </div>
          {market.userVote && (
            <div style={{ marginTop: 8, fontSize: 12, color: C.textSoft, textAlign: "center" }}>
              You bet {market.userVote.toUpperCase()} · Position locked until resolution
            </div>
          )}
        </div>

        {/* Comments */}
        <div>
          <button onClick={() => setShowComments(!showComments)} style={{
            background: "none", border: "none", color: C.textSoft,
            cursor: "pointer", fontSize: 13, padding: 0, marginBottom: 12,
            fontFamily: "'DM Sans', sans-serif"
          }}>
            💬 {market.comments.length} comments {showComments ? "▲" : "▼"}
          </button>
          {showComments && (
            <div>
              {market.comments.map((c, i) => (
                <div key={i} style={{
                  background: "rgba(194,220,255,0.2)", borderRadius: 10, padding: "10px 14px",
                  marginBottom: 8, borderLeft: `3px solid ${C.babyBlueDark}`
                }}>
                  <div style={{ fontSize: 12, color: C.plumMid, marginBottom: 4, fontWeight: 600 }}>{c.user}</div>
                  <div style={{ fontSize: 13, color: C.textMid, lineHeight: 1.5 }}>{c.text}</div>
                  <div style={{ fontSize: 11, color: C.textSoft, marginTop: 4 }}>↑ {c.score}</div>
                </div>
              ))}
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <input value={comment} onChange={e => setComment(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSubmitComment()}
                  placeholder="Add your forecast..."
                  style={{
                    flex: 1, background: "rgba(61,0,48,0.04)", border: `1px solid rgba(61,0,48,0.12)`,
                    borderRadius: 10, padding: "10px 14px", color: C.text, fontSize: 13,
                    outline: "none", fontFamily: "'DM Sans', sans-serif"
                  }} />
                <button onClick={handleSubmitComment} style={{
                  background: C.plum, border: "none", borderRadius: 10, padding: "0 16px",
                  color: C.white, fontWeight: 700, cursor: "pointer", fontSize: 13,
                  fontFamily: "'DM Sans', sans-serif"
                }}>Post</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Create Market Modal ──────────────────────────────────────────────────────
function CreateMarketModal({ onClose, onCreate, userFP }) {
  const [step, setStep] = useState(1);
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [processing, setProcessing] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [category, setCategory] = useState("career");
  const [resolutionDate, setResolutionDate] = useState("");
  const [error, setError] = useState("");
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingRef = useRef(false);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Already stopped
      }
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    recordingRef.current = false;
    setRecording(false);
  }, []);

  // Sync recordingRef with recording state
  useEffect(() => {
    recordingRef.current = recording;
  }, [recording]);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            } else {
              interimTranscript += transcript;
            }
          }

          // Only add final transcripts to the main transcript, show interim separately
          if (finalTranscript) {
            setTranscript(prev => prev + finalTranscript);
          }
          // Interim results are shown in real-time but not saved until final
        };

        recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          if (event.error === 'no-speech') {
            // Don't show error for no-speech, just continue
            return;
          } else if (event.error === 'not-allowed') {
            setError('Microphone permission denied. Please enable microphone access.');
            stopRecording();
          } else if (event.error !== 'aborted') {
            setError('Speech recognition error. Please try typing instead.');
            stopRecording();
          }
        };

        recognition.onend = () => {
          if (recordingRef.current) {
            // Restart recognition if still recording
            try {
              recognition.start();
            } catch (e) {
              // Already started or error
            }
          }
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Already stopped
        }
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, [stopRecording]);

  const startRecording = async () => {
    setError('');
    
    // Check for Speech Recognition API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition && recognitionRef.current) {
      try {
        // Clear transcript if starting fresh (optional - comment out if you want to append)
        // setTranscript('');
        recognitionRef.current.start();
        recordingRef.current = true;
        setRecording(true);
      } catch (e) {
        setError('Could not start recording. Please check microphone permissions.');
      }
    } else {
      // Fallback: Use MediaRecorder and show message
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          stream.getTracks().forEach(track => track.stop());
          // Note: Without speech recognition, we can't convert to text automatically
          setError('Speech recognition not available in this browser. Please type your text instead.');
        };

        mediaRecorder.start();
        mediaRecorderRef.current = mediaRecorder;
        recordingRef.current = true;
        setRecording(true);
        setError('Recording audio (speech-to-text not available - please type your text)');
      } catch (err) {
        setError('Microphone access denied. Please enable microphone permissions and try again.');
      }
    }
  };

  const toggleRecording = () => {
    if (recording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const processWithAI = async () => {
    if (!transcript.trim()) { setError("Please describe your situation first."); return; }
    setProcessing(true); setError("");
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `You are an AI for Castlot, a social prediction market app for college students. 
            
A user has narrated their personal life dilemma. Transform it into:
1. A clean binary YES/NO prediction market question (about the user's own life, time-bound, verifiable)
2. A short anonymous podcast summary (2-3 sentences, third person, no identifying details)
3. 5-6 transcript segments with timestamps for Spotify-style display
4. 3 relevant tags

User's narration: "${transcript}"

Respond ONLY with valid JSON (no markdown, no backticks):
{
  "marketQuestion": "Will I [...]?",
  "podcastSummary": "...",
  "transcript": [{"time": "0:00", "text": "..."}, ...],
  "tags": ["tag1", "tag2", "tag3"],
  "suggestedCategory": "career|relationships|habits|academics|purchases"
}`
          }]
        })
      });
      const data = await response.json();
      const text = data.content[0].text.trim();
      const parsed = JSON.parse(text);
      setAiResult(parsed);
      setCategory(parsed.suggestedCategory || "career");
      setStep(3);
    } catch (e) {
      setError("AI processing failed. Please try again or fill in manually.");
      setAiResult({
        marketQuestion: "Will I achieve my goal?",
        podcastSummary: transcript.slice(0, 200) + "...",
        transcript: [{ time: "0:00", text: transcript.slice(0, 80) }],
        tags: [category],
        suggestedCategory: category
      });
      setStep(3);
    } finally {
      setProcessing(false);
    }
  };

  const handleCreate = () => {
    if (!resolutionDate) { setError("Please set a resolution date."); return; }
    if (new Date(resolutionDate) <= new Date()) { setError("Resolution date must be in the future."); return; }
    onCreate({
      title: aiResult.marketQuestion,
      audioSummary: aiResult.podcastSummary,
      transcript: aiResult.transcript,
      tags: aiResult.tags,
      category,
      resolution: resolutionDate,
    });
    onClose();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(61,0,48,0.45)", backdropFilter: "blur(8px)",
      zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20
    }}>
      <div style={{
        background: C.white, borderRadius: 24, padding: 32, width: "100%", maxWidth: 560,
        border: `1px solid rgba(61,0,48,0.15)`, maxHeight: "90vh", overflowY: "auto",
        fontFamily: "'DM Sans', sans-serif", boxShadow: "0 20px 60px rgba(61,0,48,0.2)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.plum, fontFamily: "'DM Serif Display', serif" }}>
            {step === 1 && "Narrate Your Dilemma"}
            {step === 2 && "Processing..."}
            {step === 3 && "Review Your Market"}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.textSoft, cursor: "pointer", fontSize: 20 }}>✕</button>
        </div>

        {/* Step indicators */}
        <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{
              flex: 1, height: 3, borderRadius: 2,
              background: s <= step ? C.plum : "rgba(61,0,48,0.1)",
              transition: "background 0.3s"
            }} />
          ))}
        </div>

        {step === 1 && (
          <div>
            <p style={{ color: C.textSoft, fontSize: 14, marginBottom: 20, lineHeight: 1.7 }}>
              Describe your situation in your own words. Talk about a real decision you're facing — our AI will turn it into an anonymous prediction market.
            </p>
            <textarea
              value={transcript}
              onChange={e => setTranscript(e.target.value)}
              placeholder="So I'm trying to decide whether to... The situation is... I'm thinking about..."
              style={{
                width: "100%", minHeight: 160, background: "rgba(61,0,48,0.03)",
                border: `1px solid rgba(61,0,48,0.12)`, borderRadius: 14, padding: 16,
                color: C.text, fontSize: 14, lineHeight: 1.7, outline: "none", resize: "vertical",
                fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box"
              }}
            />

            <div style={{ textAlign: "center", margin: "16px 0" }}>
              <div style={{ color: C.textSoft, fontSize: 12, marginBottom: 8 }}>— or —</div>
              <button onClick={toggleRecording} style={{
                width: 64, height: 64, borderRadius: "50%", border: "none",
                background: recording ? C.no : C.babyBlue,
                cursor: "pointer", fontSize: 24,
                boxShadow: recording ? "0 0 24px rgba(192,57,43,0.35)" : "0 4px 16px rgba(194,220,255,0.7)",
                transition: "all 0.3s", animation: recording ? "pulse 1.5s infinite" : "none"
              }}>🎙️</button>
              <div style={{ fontSize: 12, color: C.textSoft, marginTop: 8 }}>
                {recording ? "Recording... (tap to stop)" : "Tap to voice record"}
              </div>
              {recording && transcript && (
                <div style={{ fontSize: 11, color: C.plum, marginTop: 4, fontStyle: "italic" }}>
                  Live transcription active...
                </div>
              )}
            </div>

            {error && <div style={{ color: C.no, fontSize: 13, marginBottom: 12 }}>{error}</div>}
            <button onClick={processWithAI} style={{
              width: "100%", padding: "14px 0", background: C.plum, border: "none",
              borderRadius: 14, color: C.white, fontWeight: 800, fontSize: 15,
              cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
              boxShadow: "0 4px 20px rgba(61,0,48,0.3)"
            }}>Generate Market with AI →</button>
          </div>
        )}

        {processing && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 16, animation: "spin 2s linear infinite", display: "inline-block" }}>⚙️</div>
            <div style={{ color: C.textMid, fontSize: 15 }}>AI is structuring your market...</div>
            <div style={{ color: C.textSoft, fontSize: 13, marginTop: 8 }}>Extracting binary question, generating transcript, assigning category</div>
          </div>
        )}

        {step === 3 && aiResult && (
          <div>
            <div style={{ background: "rgba(61,0,48,0.05)", borderRadius: 14, padding: 20, marginBottom: 20, border: `1px solid rgba(61,0,48,0.12)` }}>
              <div style={{ fontSize: 12, color: C.plum, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Market Question</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.plum, lineHeight: 1.4, fontFamily: "'DM Serif Display', serif" }}>
                {aiResult.marketQuestion}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: C.textSoft, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Category</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {CATEGORIES.filter(c => c !== "all").map(c => (
                  <button key={c} onClick={() => setCategory(c)} style={{
                    padding: "6px 14px", borderRadius: 20, border: "1px solid",
                    borderColor: category === c ? C.plum : "rgba(61,0,48,0.12)",
                    background: category === c ? C.plum : "transparent",
                    color: category === c ? C.white : C.textSoft,
                    cursor: "pointer", fontSize: 12, fontWeight: 600,
                    fontFamily: "'DM Sans', sans-serif", textTransform: "capitalize"
                  }}>{c}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: C.textSoft, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Resolution Date</label>
              <input type="date" value={resolutionDate} onChange={e => setResolutionDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                style={{
                  width: "100%", background: "rgba(61,0,48,0.03)", border: `1px solid rgba(61,0,48,0.12)`,
                  borderRadius: 10, padding: "12px 16px", color: C.text, fontSize: 14, outline: "none",
                  fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box"
                }} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: C.textSoft, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Tags</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {aiResult.tags.map(t => (
                  <span key={t} style={{ background: C.babyBlue, borderRadius: 20, padding: "4px 12px", fontSize: 12, color: C.plum, fontWeight: 600 }}>#{t}</span>
                ))}
              </div>
            </div>

            {error && <div style={{ color: C.no, fontSize: 13, marginBottom: 12 }}>{error}</div>}

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(1)} style={{
                flex: 1, padding: "14px 0", background: "rgba(61,0,48,0.05)", border: `1px solid rgba(61,0,48,0.12)`,
                borderRadius: 14, color: C.textMid, cursor: "pointer", fontSize: 14, fontFamily: "'DM Sans', sans-serif"
              }}>← Edit</button>
              <button onClick={handleCreate} style={{
                flex: 2, padding: "14px 0", background: C.plum, border: "none",
                borderRadius: 14, color: C.white, fontWeight: 800, fontSize: 15,
                cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                boxShadow: "0 4px 20px rgba(61,0,48,0.3)"
              }}>Publish Market 🚀</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Leaderboard Panel ────────────────────────────────────────────────────────
function LeaderboardPanel({ users }) {
  return (
    <div style={{
      background: C.white, borderRadius: 20, padding: 24,
      border: `1px solid ${C.cardBorder}`, boxShadow: "0 4px 20px rgba(61,0,48,0.06)",
      fontFamily: "'DM Sans', sans-serif"
    }}>
      <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 800, color: C.plum, fontFamily: "'DM Serif Display', serif", letterSpacing: -0.5 }}>
        🏆 Campus Oracles
      </h3>
      {users.map((u, i) => {
        const tier = brierLabel(u.brier);
        return (
          <div key={u.id} style={{
            display: "flex", alignItems: "center", gap: 14, padding: "12px 0",
            borderBottom: i < users.length - 1 ? `1px solid rgba(61,0,48,0.07)` : "none"
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              background: i === 0 ? C.babyBlue : "rgba(61,0,48,0.06)",
              color: i === 0 ? C.plum : C.textSoft, fontSize: 13, fontWeight: 800
            }}>{i + 1}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{u.name}</div>
              <div style={{ fontSize: 11, color: C.textSoft }}>{u.markets} markets</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, color: tier.color, fontWeight: 700 }}>{tier.label}</div>
              <div style={{ fontSize: 11, color: C.textSoft }}>Brier: {u.brier}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── AI Insight Panel ─────────────────────────────────────────────────────────
function AIInsightPanel({ market }) {
  const [insight, setInsight] = useState("");
  const [loading, setLoading] = useState(false);
  const [shown, setShown] = useState(false);

  const fetchInsight = async () => {
    if (shown) return;
    setLoading(true); setShown(true);
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `You are a prediction market analyst for Castlot, a college student forecasting app.

Market: "${market.title}"
Current crowd probability: ${Math.round(lmsrPrice(market.qYes, market.qNo, "yes") * 100)}% YES
Category: ${market.category}
Days until resolution: ${Math.ceil((new Date(market.resolution) - new Date()) / 86400000)}

In 2-3 sentences, give a sharp, specific analysis of what's likely driving this probability and what information would most change it. Be direct and analytical, not generic. Speak like a sharp trader, not a therapist.`
          }]
        })
      });
      const data = await response.json();
      setInsight(data.content[0].text);
    } catch {
      setInsight("Market analysis unavailable. Use base rates and available evidence to calibrate your position.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: "rgba(194,220,255,0.2)", borderRadius: 12, border: `1px solid rgba(122,175,238,0.35)`,
      padding: "14px 16px", marginBottom: 12
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 12, color: C.babyBlueDark, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>🤖 AI Analyst</div>
        {!shown && (
          <button onClick={fetchInsight} style={{
            background: C.babyBlue, border: `1px solid rgba(122,175,238,0.5)`,
            borderRadius: 8, padding: "4px 10px", color: C.plum, fontSize: 12,
            cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600
          }}>Get insight</button>
        )}
      </div>
      {loading && <div style={{ color: C.textSoft, fontSize: 13, marginTop: 8 }}>Analyzing...</div>}
      {insight && <div style={{ color: C.textMid, fontSize: 13, marginTop: 8, lineHeight: 1.6 }}>{insight}</div>}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function Castlot() {
  const [markets, setMarkets] = useState(INITIAL_MARKETS);
  const [activeCategory, setActiveCategory] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [activeTab, setActiveTab] = useState("feed"); // feed | leaderboard | profile
  const [userFP, setUserFP] = useState(1000);
  const [notification, setNotification] = useState(null);
  const [aiInsightMarket, setAiInsightMarket] = useState(null);

  const currentUser = { id: "me", name: "you_anon", brier: "0.142", markets: 3 };

  const mockUsers = [
    { id: "u1", name: "oracle_mia", brier: "0.089", markets: 47 },
    { id: "u2", name: "quant_watcher", brier: "0.103", markets: 31 },
    { id: "u3", name: "stats_kid", brier: "0.118", markets: 28 },
    { id: "u4", name: "forecaster_99", brier: "0.133", markets: 22 },
    { id: "me", name: "you_anon", brier: "0.142", markets: 3 },
    { id: "u5", name: "habit_hawk", brier: "0.161", markets: 19 },
  ];

  const notify = (msg, color = C.plum) => {
    setNotification({ msg, color });
    setTimeout(() => setNotification(null), 2800);
  };

  const handleTrade = (marketId, side) => {
    if (userFP < 50) { notify("Not enough Foresight Points!", "#EF4444"); return; }
    setMarkets(prev => prev.map(m => {
      if (m.id !== marketId) return m;
      const newQYes = side === "yes" ? m.qYes + 10 : m.qYes;
      const newQNo = side === "no" ? m.qNo + 10 : m.qNo;
      return { ...m, qYes: newQYes, qNo: newQNo, userVote: side, traders: m.traders + 1 };
    }));
    setUserFP(p => p - 50);
    notify(`Position taken: ${side.toUpperCase()} · 50 FP staked`, side === "yes" ? C.yes : C.no);
  };

  const handleComment = (marketId, text) => {
    setMarkets(prev => prev.map(m => {
      if (m.id !== marketId) return m;
      return { ...m, comments: [...m.comments, { user: "you_anon", text, score: 0 }] };
    }));
  };

  const handleCreateMarket = (marketData) => {
    const newMarket = {
      id: Date.now(), ...marketData,
      creator: "anon_you", creatorId: "me",
      qYes: 50, qNo: 50, traders: 1,
      comments: [], userVote: null, resolved: null,
      tags: marketData.tags || [marketData.category]
    };
    setMarkets(prev => [newMarket, ...prev]);
    notify("Market published! 🚀 Crowd is watching.", C.yes);
  };

  const filteredMarkets = activeCategory === "all"
    ? markets
    : markets.filter(m => m.category === activeCategory);

  return (
    <div style={{
      minHeight: "100vh", background: C.bg,
      fontFamily: "'DM Sans', sans-serif", color: C.text
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(61,0,48,0.2); border-radius: 3px; }
        @keyframes pulse { 0%,100% { box-shadow: 0 0 16px rgba(192,57,43,0.4); } 50% { box-shadow: 0 0 32px rgba(192,57,43,0.8); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes wavePulse { from { transform: scaleY(0.6); } to { transform: scaleY(1.2); } }
        @keyframes slideDown { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.3) sepia(1) hue-rotate(300deg); }
      `}</style>

      {/* Notification Toast */}
      {notification && (
        <div style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
          background: C.white, border: `1px solid ${notification.color}55`,
          borderRadius: 50, padding: "10px 24px", zIndex: 2000,
          color: notification.color, fontSize: 14, fontWeight: 700,
          boxShadow: "0 8px 30px rgba(61,0,48,0.15)", animation: "slideDown 0.3s ease"
        }}>
          {notification.msg}
        </div>
      )}

      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(255,240,245,0.9)", backdropFilter: "blur(20px)",
        borderBottom: `1px solid rgba(61,0,48,0.08)`
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, background: C.plum,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, boxShadow: "0 4px 14px rgba(61,0,48,0.25)"
              }}>⚡</div>
              <span style={{ fontSize: 22, fontWeight: 800, fontFamily: "'DM Serif Display', serif", letterSpacing: -1, color: C.plum }}>
                Castlot
              </span>
              <span style={{
                background: C.babyBlue, color: C.plum, fontSize: 10,
                padding: "2px 8px", borderRadius: 20, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase"
              }}>Beta · CMU</span>
            </div>

            <div style={{ display: "flex", gap: 4 }}>
              {["feed", "leaderboard", "profile"].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{
                  padding: "8px 16px", borderRadius: 10, border: "none",
                  background: activeTab === tab ? C.plum : "transparent",
                  color: activeTab === tab ? C.white : C.textSoft,
                  cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
                  textTransform: "capitalize", transition: "all 0.2s"
                }}>{tab}</button>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                background: C.babyBlue, border: `1px solid rgba(122,175,238,0.5)`,
                borderRadius: 20, padding: "6px 14px", fontSize: 13, fontWeight: 700, color: C.plum
              }}>⚡ {userFP} FP</div>
              <button onClick={() => setShowCreate(true)} style={{
                background: C.plum, border: "none", borderRadius: 12, padding: "10px 18px",
                color: C.white, fontWeight: 800, fontSize: 13, cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif", boxShadow: "0 4px 16px rgba(61,0,48,0.3)"
              }}>+ Create Market</button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 20px" }}>
        {activeTab === "feed" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 28, alignItems: "start" }}>
            {/* Left: Feed */}
            <div>
              {/* Category filters */}
              <div style={{ display: "flex", gap: 8, marginBottom: 28, overflowX: "auto", paddingBottom: 4 }}>
                {CATEGORIES.map(c => (
                  <button key={c} onClick={() => setActiveCategory(c)} style={{
                    padding: "8px 18px", borderRadius: 20, border: "1px solid",
                    borderColor: activeCategory === c ? C.plum : "rgba(61,0,48,0.12)",
                    background: activeCategory === c ? C.plum : C.white,
                    color: activeCategory === c ? C.white : C.textSoft,
                    cursor: "pointer", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap",
                    textTransform: "capitalize", fontFamily: "'DM Sans', sans-serif",
                    flexShrink: 0, boxShadow: activeCategory === c ? "0 2px 10px rgba(61,0,48,0.2)" : "none"
                  }}>{c === "all" ? "All Markets" : c}</button>
                ))}
              </div>

              {filteredMarkets.length === 0 && (
                <div style={{ textAlign: "center", padding: "60px 0", color: C.textSoft }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                  <div>No markets in this category yet. Create the first one!</div>
                </div>
              )}

              {filteredMarkets.map(m => (
                <div key={m.id} style={{ animation: "fadeIn 0.4s ease" }}>
                  <AIInsightPanel market={m} />
                  <MarketCard
                    market={m}
                    onTrade={handleTrade}
                    onComment={handleComment}
                    userFP={userFP}
                    currentUser={currentUser}
                  />
                </div>
              ))}
            </div>

            {/* Right: Sidebar */}
            <div style={{ position: "sticky", top: 84 }}>
              <LeaderboardPanel users={mockUsers} />

              {/* Campus Pulse */}
              <div style={{
                marginTop: 20, background: C.white,
                borderRadius: 20, padding: 24, border: `1px solid ${C.cardBorder}`,
                boxShadow: "0 4px 20px rgba(61,0,48,0.06)"
              }}>
                <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 800, color: C.plum, letterSpacing: -0.3, fontFamily: "'DM Serif Display', serif" }}>
                  📡 Campus Pulse
                </h3>
                <div style={{ fontSize: 13, color: C.textSoft, lineHeight: 1.7 }}>
                  <div style={{ marginBottom: 10 }}>
                    <span style={{ color: C.yes, fontWeight: 700 }}>RESOLVED:</span> "Will I get the Goldman interview?" → <span style={{ color: C.plum, fontWeight: 700 }}>YES ✓</span> — Crowd said 71%, calibration held.
                  </div>
                  <div>
                    <span style={{ color: C.babyBlueDark, fontWeight: 700 }}>TRENDING:</span> "Will I switch from CS to ECE?" — 38 traders in 3hr
                  </div>
                </div>
              </div>

              {/* FP Info */}
              <div style={{
                marginTop: 16, background: C.white, borderRadius: 16, padding: 20,
                border: `1px solid ${C.cardBorder}`, boxShadow: "0 4px 20px rgba(61,0,48,0.06)"
              }}>
                <div style={{ fontSize: 12, color: C.textSoft, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Your FP Balance</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: C.plum, fontFamily: "'DM Serif Display', serif" }}>{userFP}</div>
                <div style={{ fontSize: 12, color: C.textSoft, marginTop: 4 }}>Foresight Points · Resets weekly</div>
                <div style={{ marginTop: 12, height: 4, background: "rgba(61,0,48,0.08)", borderRadius: 2 }}>
                  <div style={{ width: `${(userFP / 1000) * 100}%`, height: "100%", background: C.plum, borderRadius: 2, transition: "width 0.5s" }} />
                </div>
                <div style={{ fontSize: 11, color: C.textSoft, marginTop: 6 }}>Each trade costs 50 FP</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "leaderboard" && (
          <div style={{ maxWidth: 700, margin: "0 auto", animation: "fadeIn 0.4s ease" }}>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, fontWeight: 700, marginBottom: 8, color: C.plum }}>
              Forecaster Rankings
            </h2>
            <p style={{ color: C.textSoft, marginBottom: 32, fontSize: 15 }}>
              Ranked by Brier score — the lower, the more calibrated your forecasts.
            </p>

            {mockUsers.map((u, i) => {
              const tier = brierLabel(u.brier);
              const isMe = u.id === "me";
              return (
                <div key={u.id} style={{
                  background: isMe ? C.babyBlue : C.white,
                  border: `1px solid ${isMe ? "rgba(122,175,238,0.6)" : C.cardBorder}`,
                  borderRadius: 16, padding: "20px 24px", marginBottom: 12,
                  display: "flex", alignItems: "center", gap: 20,
                  animation: `fadeIn ${0.2 + i * 0.08}s ease`,
                  boxShadow: isMe ? "0 4px 20px rgba(122,175,238,0.3)" : "0 2px 12px rgba(61,0,48,0.05)"
                }}>
                  <div style={{
                    fontSize: i < 3 ? 28 : 20, width: 40, textAlign: "center"
                  }}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 17, fontWeight: 700, color: isMe ? C.plum : C.text }}>
                      {u.name} {isMe && <span style={{ fontSize: 12, fontWeight: 400, color: C.textMid }}>(you)</span>}
                    </div>
                    <div style={{ fontSize: 13, color: C.textSoft, marginTop: 2 }}>
                      {u.markets} markets forecasted
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: tier.color }}>
                      {tier.label}
                    </div>
                    <div style={{ fontSize: 13, color: C.textSoft, marginTop: 2 }}>
                      Brier: {u.brier}
                    </div>
                  </div>
                  <div style={{ width: 80 }}>
                    <div style={{ height: 6, background: "rgba(61,0,48,0.08)", borderRadius: 3 }}>
                      <div style={{
                        width: `${Math.max(10, 100 - parseFloat(u.brier) * 400)}%`,
                        height: "100%", background: tier.color, borderRadius: 3,
                        transition: "width 1s ease"
                      }} />
                    </div>
                    <div style={{ fontSize: 10, color: C.textSoft, marginTop: 4 }}>accuracy</div>
                  </div>
                </div>
              );
            })}

            <div style={{
              marginTop: 32, background: C.babyBlue,
              borderRadius: 16, padding: 24, border: `1px solid rgba(122,175,238,0.4)`
            }}>
              <h3 style={{ margin: "0 0 12px", color: C.plum, fontFamily: "'DM Serif Display', serif" }}>How Brier Score Works</h3>
              <p style={{ color: C.textMid, fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                When you bet 70% YES on a market that resolves YES, your score improves. Bet 70% YES on something that resolves NO and you're penalized. 
                The math: score = (probability − outcome)². Lower is better. A score below 0.1 means you're genuinely calibrated — 
                what you call 70% happens roughly 70% of the time.
              </p>
            </div>
          </div>
        )}

        {activeTab === "profile" && (
          <div style={{ maxWidth: 700, margin: "0 auto", animation: "fadeIn 0.4s ease" }}>
            {/* Profile header */}
            <div style={{
              background: `linear-gradient(135deg, ${C.babyBlue} 0%, rgba(255,240,245,0.8) 100%)`,
              borderRadius: 24, padding: 32, border: `1px solid rgba(122,175,238,0.3)`, marginBottom: 24,
              boxShadow: "0 4px 24px rgba(61,0,48,0.08)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <div style={{
                  width: 72, height: 72, borderRadius: "50%", background: C.white,
                  border: `3px solid ${C.plum}`, display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 28, boxShadow: "0 4px 16px rgba(61,0,48,0.15)"
                }}>👤</div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "'DM Serif Display', serif", color: C.plum }}>you_anon</div>
                  <div style={{ color: C.textMid, fontSize: 14 }}>CMU · Class of 2026</div>
                  <div style={{ marginTop: 8 }}>
                    <span style={{
                      background: C.plum, borderRadius: 20,
                      padding: "4px 12px", fontSize: 12, color: C.white, fontWeight: 700
                    }}>Analyst Tier</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
              {[
                { label: "Brier Score", value: "0.142", note: "Lower = better", color: C.plum },
                { label: "Markets Traded", value: "3", note: "Min 20 to rank", color: C.babyBlueDark },
                { label: "FP Balance", value: userFP, note: "Resets weekly", color: C.yes },
              ].map(s => (
                <div key={s.label} style={{
                  background: C.white, borderRadius: 16, padding: 20,
                  border: `1px solid ${C.cardBorder}`, textAlign: "center",
                  boxShadow: "0 2px 12px rgba(61,0,48,0.05)"
                }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: s.color, fontFamily: "'DM Serif Display', serif" }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: C.textMid, marginTop: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: C.textSoft, marginTop: 2 }}>{s.note}</div>
                </div>
              ))}
            </div>

            {/* Category breakdown */}
            <div style={{
              background: C.white, borderRadius: 20, padding: 24,
              border: `1px solid ${C.cardBorder}`, marginBottom: 24,
              boxShadow: "0 2px 12px rgba(61,0,48,0.05)"
            }}>
              <h3 style={{ margin: "0 0 20px", fontFamily: "'DM Serif Display', serif", fontSize: 18, color: C.plum }}>Category Accuracy</h3>
              {[
                { cat: "career", score: 0.11, trades: 8 },
                { cat: "habits", score: 0.19, trades: 12 },
                { cat: "academics", score: 0.13, trades: 5 },
              ].map(c => (
                <div key={c.cat} style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ color: C.plum, fontSize: 13, fontWeight: 700, textTransform: "capitalize" }}>{c.cat}</span>
                    <span style={{ color: C.textSoft, fontSize: 12 }}>Brier {c.score} · {c.trades} trades</span>
                  </div>
                  <div style={{ height: 6, background: "rgba(61,0,48,0.08)", borderRadius: 3 }}>
                    <div style={{
                      width: `${100 - c.score * 400}%`, height: "100%",
                      background: C.plum, borderRadius: 3
                    }} />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ textAlign: "center", padding: "20px 0", color: C.textSoft, fontSize: 14 }}>
              Trade 17 more markets to display your public Brier score.
            </div>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateMarketModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreateMarket}
          userFP={userFP}
        />
      )}
    </div>
  );
}
