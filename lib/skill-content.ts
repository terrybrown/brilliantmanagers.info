export interface SkillContent {
  whyItMatters: string
  warningSigns: string[]
  pathways: string[]
}

export const SKILL_CONTENT: Record<string, SkillContent> = {
  // --- SELF ---
  'self-time-task-management': {
    whyItMatters:
      'Your effectiveness as a manager is bounded by your own capacity. If you are constantly reactive, your team feels it — decisions slow down, blockers stay unresolved, and you become the constraint.',
    warningSigns: [
      'Calendar is back-to-back with no protected thinking time',
      'Regularly missing your own deadlines or commitments',
      'Saying yes to everything and delivering on little',
      'Team waits on you for decisions that should be quick',
    ],
    pathways: [
      'Time-block deep work before 10am — protect it like an external meeting',
      'Do a weekly calendar audit: which recurring meetings are yours to remove?',
      'Use a trusted system (GTD, Notion, paper) — the tool matters less than the habit',
      'Delegate decisions where you are not the best person to make them',
    ],
  },
  'self-empathy-compassion': {
    whyItMatters:
      'People perform best when they feel understood. Empathy is not softness — it is information. Knowing what a person is carrying helps you calibrate how hard to push, what support to offer, and when to back off.',
    warningSigns: [
      'Team members rarely share personal context with you',
      'You find yourself frustrated by what you perceive as excuses',
      'You default to solutions before the person has finished explaining the problem',
      'Feedback conversations feel transactional rather than human',
    ],
    pathways: [
      'Start 1:1s with a genuine "how are you, really?" and wait for the answer',
      'Practise reflecting back what you hear before responding',
      'Notice when you are listening to fix vs listening to understand',
      'Share your own challenges — vulnerability invites vulnerability',
    ],
  },
  'self-growth-mindset': {
    whyItMatters:
      'Managers who stop learning stop improving — and their teams feel it. A growth mindset models the behaviour you want from your team: curiosity over defensiveness, experiments over certainty.',
    warningSigns: [
      'Feedback triggers defensiveness rather than curiosity',
      'You rarely seek out learning outside your existing domain',
      'Mistakes in the team are treated as failures rather than data',
      'You avoid situations where you might look uncertain',
    ],
    pathways: [
      'Ask for feedback explicitly and specifically — "What is one thing I could do differently?"',
      'Dedicate 30 minutes per week to something outside your comfort zone',
      'Run team retrospectives that model learning from failure',
      'Share your own learning gaps openly with your team',
    ],
  },
  'self-emotional-intelligence': {
    whyItMatters:
      'Your emotional state is contagious. A manager who cannot read the room — or regulate their own reactions — creates unpredictability that teams learn to navigate around rather than engage with directly.',
    warningSigns: [
      'People visibly change behaviour when you are stressed',
      'You react quickly in heated moments and regret it later',
      'Team members walk on eggshells around difficult topics',
      'You miss signals that someone is struggling',
    ],
    pathways: [
      'Build a pause between trigger and response — even 10 seconds changes the outcome',
      'Name your emotional state to yourself before difficult conversations',
      'Ask "what is this person feeling right now?" before responding',
      'Debrief after moments where you did not like your own reaction',
    ],
  },
  'self-leadership-styles': {
    whyItMatters:
      'No single leadership style works for every person or situation. Over-directing experienced people disengages them. Under-directing new people leaves them adrift. The skill is in reading which mode is needed.',
    warningSigns: [
      'You manage everyone the same way regardless of their experience',
      'High performers feel micromanaged; new starters feel unsupported',
      'Your default is either fully hands-on or fully hands-off',
      'You find it hard to shift gears mid-conversation',
    ],
    pathways: [
      'Map each direct report on a 2×2 of competence vs commitment for their current role',
      'Explicitly agree with each person how much direction they want',
      'Practise coaching questions even when you know the answer',
      'Notice when you reach for your default style — and consciously try a different one',
    ],
  },
  'self-self-awareness': {
    whyItMatters:
      'Self-awareness is the foundation everything else is built on. Without it, you cannot improve — because you do not accurately see where the gaps are. The most dangerous blind spot is not knowing you have one.',
    warningSigns: [
      "Your self-perception and others' perception of you diverge significantly",
      'You rarely receive critical feedback — possibly because people have stopped trying',
      'You attribute outcomes to external factors more than to your own choices',
      'You are surprised when people leave or disengage',
    ],
    pathways: [
      'Seek 360 feedback annually and take every point seriously',
      'Ask your most trusted direct report: "What is one thing I do that I probably don\'t notice?"',
      'Journal after hard weeks — look for your own patterns',
      'Find a peer or coach who will tell you the truth',
    ],
  },
  'self-cross-functional-skillset': {
    whyItMatters:
      'The further you go in management, the more you lead across domains you do not fully own. Breadth of understanding builds credibility, improves decisions, and helps you translate between functions.',
    warningSigns: [
      'You struggle to engage meaningfully with peer managers outside your domain',
      'Cross-functional projects get stuck because you cannot bridge the gap',
      'You default to your domain expertise when facilitating broader conversations',
      'Your network is entirely within your own function',
    ],
    pathways: [
      'Spend time with peers in other functions — ask them what their biggest challenges are',
      'Read widely outside your domain — annual reports, other industry press',
      'Volunteer for cross-functional projects where you will be out of your depth',
      'Ask "what does this look like from finance / product / ops?" in your own decisions',
    ],
  },
  'self-resilience': {
    whyItMatters:
      'Management is sustained difficulty. Resilience is not toughness — it is the ability to absorb pressure, recover from setbacks, and maintain enough stability that your team can lean on you when things are hard.',
    warningSigns: [
      "You absorb your team's stress and visibly carry it",
      'Hard periods leave you depleted for weeks',
      'You catastrophise when things go wrong',
      'You have no clear routines that restore your energy',
    ],
    pathways: [
      'Identify your personal recovery signals — what does depleted look like for you?',
      'Build non-negotiable recovery habits (exercise, sleep, social connection)',
      'Practise reframing: "What can I control here?" rather than spiralling on what you cannot',
      'Talk to someone — a peer, coach, or mentor — before problems compound',
    ],
  },
  'self-vulnerability-courage': {
    whyItMatters:
      "Psychological safety starts with the manager. If you never admit uncertainty, never share your own struggles, and never take stands that cost you something — you implicitly teach your team to do the same.",
    warningSigns: [
      "You never say \"I don't know\" in front of the team",
      'You avoid conflict until it becomes unavoidable',
      'Hard feedback is softened until the message is lost',
      'You change your position when challenged, even when you were right',
    ],
    pathways: [
      "The next time you don't know something, say so — out loud, to the team",
      'Share a recent mistake of your own in a team setting',
      'Name the hard thing in the room rather than waiting for someone else to',
      'Distinguish between "I changed my mind because of new information" and "I caved under pressure"',
    ],
  },

  // --- TEAM ---
  'team-dei': {
    whyItMatters:
      'Diverse teams make better decisions. Inclusive managers retain people who would otherwise leave. Equity is not a programme — it is a daily set of choices about who gets airtime, opportunities, and credit.',
    warningSigns: [
      'The same voices dominate in meetings',
      'Your team lacks diversity — and you have not interrogated why',
      'Informal opportunities (stretch projects, visibility) tend to go to the same people',
      'Feedback is applied inconsistently across the team',
    ],
    pathways: [
      'Audit who speaks in your meetings — actively draw in quieter voices',
      'Track stretch opportunities and make sure they are distributed intentionally',
      'Review your hiring process for where bias enters',
      'Ask directly: "Does everyone on this team feel like they belong here?"',
    ],
  },
  'team-coaching-mentoring': {
    whyItMatters:
      "The fastest way to scale your own impact is to make your team better. Coaching — asking rather than telling — builds capability and ownership. Mentoring builds people's careers. Both take time you will never regret spending.",
    warningSigns: [
      'Your 1:1s are status updates, not development conversations',
      'Team members ask for your opinion before forming their own',
      'You solve problems for people rather than with them',
      'Nobody on the team is visibly growing',
    ],
    pathways: [
      'Replace "here\'s what I\'d do" with "what have you tried?" and "what are your options?"',
      'Ask each direct report: "What are you working on that scares you a little?"',
      'Set a personal goal to grow someone into the role above theirs',
      'Read about the GROW model and use it deliberately in one 1:1 this week',
    ],
  },
  'team-one-to-ones': {
    whyItMatters:
      '1:1s are the highest-leverage conversation in management. Done well, they surface problems early, build trust, and give you the signal you need to manage effectively. Done badly — or skipped — they leave people feeling unseen.',
    warningSigns: [
      '1:1s are the first thing cancelled when things get busy',
      'The agenda is always set by you, never the other person',
      'You spend more time talking than listening',
      'You leave without knowing how that person is really doing',
    ],
    pathways: [
      'Make them non-negotiable — put them first in the calendar',
      'Ask each person to own the agenda for their 1:1',
      'Start with "what is on your mind?" and resist filling the silence',
      'End with "what support do you need from me this week?"',
    ],
  },
  'team-growth-progression': {
    whyItMatters:
      "People leave managers, not companies — and the most common reason is feeling stuck. When people see a path forward and feel you are invested in it, discretionary effort follows.",
    warningSigns: [
      "You cannot name each person's development goal",
      'Promotion conversations only happen when someone raises them',
      'Stretch opportunities are given to whoever asks, not whoever needs them',
      'High performers leave and you are surprised',
    ],
    pathways: [
      'Have a dedicated growth conversation with each person at least quarterly',
      'Know the criteria for the next level and make them explicit',
      'Create development plans — not just aspirations but actions with timelines',
      "Actively advocate for your people's progression in calibration conversations",
    ],
  },
  'team-performance-discipline': {
    whyItMatters:
      "Not addressing underperformance is a team-wide problem, not a private one. High performers notice. Trust in your leadership erodes. And the person struggling deserves to know — early enough to change.",
    warningSigns: [
      'You have been aware of an issue for months and not addressed it',
      'You give positive feedback in public and soften or avoid difficult feedback',
      'Performance conversations happen after problems have compounded',
      "The rest of the team is quietly compensating for someone's output",
    ],
    pathways: [
      'Address performance issues in the same week you notice them — not the same quarter',
      'Be specific: "Here is the behaviour I observed / here is the impact" not "you\'re not performing well"',
      "Document conversations — for everyone's protection",
      'Separate the message from the relationship — you can be kind and clear',
    ],
  },
  'team-accountability': {
    whyItMatters:
      'Accountability is not blame — it is the expectation that commitments are kept and that gaps are named honestly. Without it, deadlines slip, standards drift, and a culture of "good enough" sets in.',
    warningSigns: [
      'Commitments are regularly missed without being discussed',
      'People explain why something failed but no one asks what will change',
      'You absorb accountability that should sit with your team',
      'Retrospectives produce actions that are never reviewed',
    ],
    pathways: [
      "Close the loop: \"You said X by Y — what happened, and what's next?\"",
      'Make commitments explicit in writing — not just in conversation',
      'Ask "what will you do differently?" rather than accepting explanations as closure',
      'Model accountability yourself — when you miss something, own it publicly',
    ],
  },
  'team-unblocking': {
    whyItMatters:
      "Your team's throughput is partly determined by how fast you remove obstacles. Every day a blocker sits is a day of productivity — and morale — lost. Unblocking is often the highest-leverage thing a manager does in a given week.",
    warningSigns: [
      'Your team works around obstacles rather than escalating them',
      'You learn about blockers in retrospectives, not in the moment',
      'Dependencies on other teams take weeks to resolve',
      'People feel they have to manage upward to get things done',
    ],
    pathways: [
      'Ask in every 1:1: "What is slowing you down right now?"',
      'Create a low-friction channel for blockers — one message, fast response',
      "Take one cross-team dependency off your team's plate this week",
      'Report unresolved blockers up — do not absorb them silently',
    ],
  },
  'team-recruitment': {
    whyItMatters:
      'Hiring is the highest-leverage and hardest-to-reverse decision a manager makes. One bad hire affects the whole team; one great hire elevates everyone. Most managers spend too little time on this.',
    warningSigns: [
      'You hire based on gut feeling and culture fit alone',
      'Interviews are inconsistent across candidates',
      'Onboarding begins at "first day" rather than at "offer accepted"',
      'You settle for available rather than holding out for excellent',
    ],
    pathways: [
      'Define the role with a scorecard before opening the search',
      'Use structured interviews with consistent questions across all candidates',
      'Involve the team in hiring — they will work with this person',
      'Treat every candidate interaction as a signal — they are evaluating you too',
    ],
  },
  'team-onboarding': {
    whyItMatters:
      'The first 90 days determine whether a new joiner becomes a contributor or a drag on the team. Strong onboarding accelerates ramp time, builds early belonging, and signals what kind of team this is.',
    warningSigns: [
      'New starters figure things out by observing rather than being guided',
      'First week is mostly admin and waiting for access',
      'No structured check-ins in the first month',
      'New joiners are expected to contribute before they are ready',
    ],
    pathways: [
      'Build a 30/60/90 day plan with the new joiner in week one',
      'Assign a peer buddy — someone to ask questions without judgment',
      'Over-communicate in the first month: context, norms, expectations',
      'Schedule a frank "how is it really going?" conversation at 30 and 60 days',
    ],
  },
  'team-psychological-safety': {
    whyItMatters:
      "Amy Edmondson's research is unambiguous: psychological safety is the number one predictor of team performance. It does not mean comfort — it means people can take risks, speak up, and fail without fear of punishment.",
    warningSigns: [
      'People agree with you in meetings and disagree in the corridor',
      'Mistakes are hidden rather than surfaced',
      'Ideas are not challenged — everyone nods',
      'People do not push back on decisions they privately think are wrong',
    ],
    pathways: [
      'React to bad news with curiosity, not frustration',
      'Reward the raising of problems — explicitly thank people for surfacing issues',
      'Model intellectual humility: change your mind in public when warranted',
      'Ask for dissenting views explicitly: "Who thinks differently?"',
    ],
  },
  'team-cross-team-collaboration': {
    whyItMatters:
      'Most meaningful work happens across team boundaries. Managers who invest in peer relationships get things done faster, resolve conflicts earlier, and build reputational currency that their team benefits from.',
    warningSigns: [
      'Your team is seen as hard to work with by other teams',
      'Cross-functional projects are stressful and slow',
      'You rarely proactively communicate with peer managers',
      'Dependencies are managed reactively, not proactively',
    ],
    pathways: [
      'Invest in relationships before you need them — regular informal contact with peers',
      'Proactively share what your team is working on and how it intersects with others',
      'Resolve cross-team friction at the relationship level before escalating',
      'Celebrate cross-team wins publicly — make collaboration visible',
    ],
  },

  // --- STRATEGY ---
  'strategy-vision-creation': {
    whyItMatters:
      'People need to understand where they are going and why it matters. A clear vision makes prioritisation obvious, motivates discretionary effort, and allows the team to make good decisions independently.',
    warningSigns: [
      'Team members cannot articulate what the team is trying to achieve',
      'Every priority feels equally important',
      'The team is busy but not directional',
      'Vision only exists in a document no one reads',
    ],
    pathways: [
      'Write the vision in one sentence — if you cannot, it is not clear enough',
      "Test it: ask three team members to describe the team's goal in their own words",
      'Connect day-to-day work to the vision explicitly and regularly',
      'Revisit and update the vision when strategy shifts — stale vision is worse than none',
    ],
  },
  'strategy-culture-driving': {
    whyItMatters:
      'Culture is not a set of values on a wall — it is the behaviour that gets rewarded, tolerated, and punished. As the manager, you are the primary culture signal. What you do, not what you say, sets the norm.',
    warningSigns: [
      'Stated values and actual behaviours diverge',
      'You talk about culture in general terms but rarely in specifics',
      'Cultural issues are addressed with communications rather than decisions',
      'High-performing but culturally destructive behaviour goes unchallenged',
    ],
    pathways: [
      'Name specific behaviours you want to see — not abstract values',
      'Reward cultural behaviour explicitly, not just output',
      'Address cultural violations quickly — every miss sets a new norm',
      'Ask: "What story would a new joiner tell about how we work here?"',
    ],
  },
  'strategy-goal-setting': {
    whyItMatters:
      'Goals translate vision into something the team can act on. Vague goals produce vague output. Clear, measurable goals give people something to aim at and allow progress to be assessed honestly.',
    warningSigns: [
      'Goals are written once and rarely revisited',
      'It is unclear at quarter-end whether goals were met',
      'The team has too many goals to focus on any one thing',
      'Goals are inputs (activities) rather than outcomes',
    ],
    pathways: [
      'Write goals as outcomes: "Achieve X by Y" not "work on X"',
      'Three to five goals maximum — prioritisation is a skill',
      'Review goals monthly — not to judge but to adjust',
      'Distinguish between committed goals (must deliver) and aspirational goals (stretch)',
    ],
  },
  'strategy-change-management': {
    whyItMatters:
      "Organisations change constantly. Managers who handle change well keep their team's productivity and morale intact through the transition. Those who handle it poorly add a second wave of disruption on top of the first.",
    warningSigns: [
      'The team hears about changes at the same time as everyone else',
      'You relay organisational decisions without adding your own context',
      'People feel uncertain and anxious during change',
      'Resistance is treated as a problem rather than information',
    ],
    pathways: [
      'Get ahead of the message — your team should hear from you before the all-hands',
      'Acknowledge the impact honestly before moving to "here\'s the opportunity"',
      'Create space for questions — and answer them, including "I don\'t know yet"',
      'Listen to resistance — it often contains legitimate concerns',
    ],
  },
  'strategy-data-driven-decisions': {
    whyItMatters:
      'Decisions based on data are reproducible, learnable-from, and harder to challenge arbitrarily. Decisions based on intuition alone are invisible — nobody can see the reasoning, so nobody can improve on it.',
    warningSigns: [
      'Decisions are made based on whoever argues most forcefully',
      'You have no regular metrics review',
      'Data exists but is not consulted before decisions',
      'Gut feel and data are treated as interchangeable',
    ],
    pathways: [
      'Identify three to five metrics that matter for your team and review them weekly',
      'Build a habit: "What does the data say?" before "What do we think?"',
      'Distinguish correlation from causation — especially when things go wrong',
      'Share the data behind decisions with your team — transparency builds trust',
    ],
  },
  'strategy-stakeholder-management': {
    whyItMatters:
      "Your team's success depends on people outside your team. Stakeholders who trust you will give you the benefit of the doubt. Those who do not will block, delay, and second-guess everything.",
    warningSigns: [
      "Stakeholders are surprised by your team's direction or output",
      'Escalations come to you rather than being resolved at the working level',
      'Key relationships are transactional — only contact when there is a problem',
      'You are caught flat-footed by stakeholder reactions',
    ],
    pathways: [
      "Map your stakeholders: who has most influence on your team's success?",
      'Communicate proactively — do not wait for someone to ask for an update',
      'Invest in relationships before you need them',
      'Learn what each stakeholder cares most about — and speak to that',
    ],
  },
  'strategy-resource-planning': {
    whyItMatters:
      'Misallocated resources produce frustration, burnout, and missed priorities. Good resource planning makes the implicit explicit — forcing hard choices about what matters most.',
    warningSigns: [
      'Your team is simultaneously stretched and unclear on priorities',
      'New requests are added without removing existing commitments',
      "You do not know how your team's time is actually distributed",
      'Budget conversations happen too late to change decisions',
    ],
    pathways: [
      "Create a simple capacity model — where is your team's time going?",
      'Make prioritisation decisions explicit: "We are doing X instead of Y"',
      "Protect investment in people's development even when delivery is pressured",
      'Review resource allocation quarterly against strategic priorities',
    ],
  },
  'strategy-innovation-experimentation': {
    whyItMatters:
      'Teams that only optimise existing processes eventually fall behind. Creating deliberate space for experimentation — even in small ways — builds adaptability and signals that learning matters more than looking certain.',
    warningSigns: [
      'The answer to "what could we do differently?" is always "we\'ve always done it this way"',
      'Experiments are only run when mandated from above',
      'Failure is treated as a reason not to try again',
      'The team is busy but not generating new ideas',
    ],
    pathways: [
      'Protect a small amount of time (10%) for experiments — formally',
      'Run a "try it for two weeks" culture rather than deciding upfront if ideas will work',
      'Celebrate failed experiments that generated learning',
      'Ask regularly: "What is one thing we could test this quarter?"',
    ],
  },

  // --- COMMUNICATIONS ---
  'comms-relationships-partnerships': {
    whyItMatters:
      'Relationships are the infrastructure that work runs on. In a world of interdependence, trust built before a crisis is the asset that gets things done when everything is moving fast.',
    warningSigns: [
      'Your network is thin outside your immediate team',
      'You contact people primarily when you need something',
      'Relationship-building feels like a waste of time compared to "real work"',
      'You are surprised by decisions that affect your team',
    ],
    pathways: [
      'Schedule one relationship-building coffee per week — outside your team',
      'Offer value before you need something — introductions, knowledge, support',
      'Follow up after conversations — memory and follow-through build trust',
      "Map who most influences your team's outcomes and invest there first",
    ],
  },
  'comms-communication-excellence': {
    whyItMatters:
      'Clear communication is a force multiplier. When people understand what you mean, decisions are faster, alignment is deeper, and rework from misunderstanding is reduced. Most managers overestimate how clearly they communicate.',
    warningSigns: [
      'Decisions need to be re-explained repeatedly',
      'Written communication is long and hard to act on',
      'The same questions come back because the first answer was unclear',
      'People nod in meetings and then do different things',
    ],
    pathways: [
      'Start with the conclusion, then the reasoning — not the other way around',
      "Read your written communications from the recipient's perspective before sending",
      'Ask: "What question is this answering?" — if you cannot say, rewrite',
      "Use fewer words — brevity signals respect for the reader's time",
    ],
  },
  'comms-listening': {
    whyItMatters:
      'Most people listen to respond, not to understand. Real listening — the kind that makes people feel heard — is rare and powerful. It builds trust, surfaces better information, and changes what you do with what you hear.',
    warningSigns: [
      "You finish other people's sentences",
      'You are formulating your response while the other person is still talking',
      'People do not share bad news with you early',
      'You often miss the subtext of what people are saying',
    ],
    pathways: [
      'Practise full stops — let silences exist before you respond',
      'Reflect back what you heard: "So you\'re saying..." before adding your view',
      'Put away your phone and laptop — attention signals respect',
      'Ask follow-up questions before offering any opinion',
    ],
  },
  'comms-storytelling': {
    whyItMatters:
      'Data informs; stories move people. The manager who can connect facts to meaning — through narrative — creates understanding that lasts and motivates action. Presentations, pitches, and change conversations all benefit from this.',
    warningSigns: [
      'Your presentations are data-heavy and hard to remember',
      'People understand what you are proposing but not why it matters',
      'Context is delivered as a preamble rather than woven through the message',
      'Emotion is absent from your professional communication',
    ],
    pathways: [
      'Structure communication as: situation → complication → resolution',
      'Find the human angle: who is affected, how, and why does it matter?',
      'Use specific examples rather than general principles',
      'Practise: after a presentation, can someone repeat the key message back to you?',
    ],
  },
  'comms-feedback': {
    whyItMatters:
      'Feedback is the mechanism through which people improve. Without it, good behaviour is not reinforced and poor behaviour is not corrected. Most managers give too little feedback — and what they give is too vague to act on.',
    warningSigns: [
      'Feedback is reserved for formal reviews',
      'Positive feedback is generic: "great job" rather than specific',
      'Developmental feedback is softened to the point of being invisible',
      'You give feedback to the same people and avoid others',
    ],
    pathways: [
      'Give feedback within 48 hours of the behaviour — proximity matters',
      'Use the SBI model: Situation, Behaviour, Impact',
      'Make positive feedback specific enough to be repeatable',
      'Ask: "Can I share an observation?" — the question itself signals respect',
    ],
  },
  'comms-difficult-conversations': {
    whyItMatters:
      'Avoiding difficult conversations does not make them go away — it makes them worse. The manager who can navigate conflict and discomfort honestly and humanely builds a team where problems get solved rather than accumulate.',
    warningSigns: [
      'You have conversations you have been putting off for weeks',
      'Difficult messages get so many caveats they lose their meaning',
      'You raise a concern and then immediately walk it back under pushback',
      'Team conflict surfaces to you rather than being resolved between people',
    ],
    pathways: [
      'Name the uncomfortable thing early: "I want to talk about something difficult"',
      'Prepare the message — know what you want to say before you are in the room',
      'Separate the person from the problem — attack the issue, respect the individual',
      'Do not rescue: allow silence and discomfort to do their work',
    ],
  },

  // --- DOMAIN EXPERTISE ---
  'domain-process-innovation': {
    whyItMatters:
      'Process debt accumulates silently. Teams that never examine how they work spend increasing effort on decreasing output. Intentional process improvement is a force multiplier — one change that compounds.',
    warningSigns: [
      "Processes exist because \"that's how we've always done it\"",
      'Retrospectives produce actions that are not followed through',
      'Manual work that could be automated is tolerated',
      'Your team spends time on low-value coordination overhead',
    ],
    pathways: [
      'Run a quarterly process audit: what takes the most time relative to its value?',
      'Give the team permission and space to improve their own ways of working',
      'Automate one repetitive manual process per quarter',
      'Measure the before-and-after of process changes — show the impact',
    ],
  },
  'domain-technical-mastery': {
    whyItMatters:
      "You do not need to be the best individual contributor on your team — but you need enough mastery to evaluate quality, ask good questions, and maintain your team's respect. Falling too far behind the domain creates a credibility gap.",
    warningSigns: [
      "You cannot evaluate whether your team's work is good",
      'Technical decisions are made without your meaningful input',
      'Your team stops bringing you into domain conversations',
      "You rely entirely on your team's confidence as a quality signal",
    ],
    pathways: [
      'Stay close to the work — occasionally do the thing, not just manage it',
      'Dedicate time to learning the evolving landscape of your domain',
      'Ask your strongest team member to teach you something once a month',
      'Be explicit about where you are not the expert — and where you expect to rely on them',
    ],
  },
}
