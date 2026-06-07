-- Populate subtitle and topic for all existing resources (2026-06-07)
-- Subtitle: short tagline (5-12 words). Topic: keyword or short phrase.
-- Rows identified by id prefix (id::text LIKE '<8-char-prefix>%') because the prompt
-- supplies 8-hex-char prefixes and Supabase stores full UUIDs.
-- Duplicate-title rows receive the same subtitle and topic.
-- Two podcast rows without known UUIDs are matched by URL instead.

-- ── ARTICLES ─────────────────────────────────────────────────────────────────

UPDATE resources SET subtitle = 'Build energising networks, not just transactional ones', topic = 'Networking'
WHERE id::text LIKE '38edbac1%';

UPDATE resources SET subtitle = 'How Booking.com scales experimentation into management practice', topic = 'Innovation'
WHERE id::text LIKE '93621166%';

UPDATE resources SET subtitle = 'Forecast team capacity and balance workload against demand', topic = 'Planning'
WHERE id::text LIKE 'b958d93b%';

UPDATE resources SET subtitle = 'When goal setting backfires and produces unintended harm', topic = 'Goal Setting'
WHERE id::text LIKE '5ad49d2b%';

UPDATE resources SET subtitle = 'Six concrete actions to build psychological safety', topic = 'Psychological Safety'
WHERE id::text LIKE '6f1431ad%';

UPDATE resources SET subtitle = 'Evidence-based habits for reframing and bouncing back', topic = 'Resilience'
WHERE id::text LIKE 'c8cffb91%';

UPDATE resources SET subtitle = 'From command-and-control to coaching with the GROW model', topic = 'Coaching'
WHERE id::text LIKE '110a90c2%';

UPDATE resources SET subtitle = 'Drive behaviour change without triggering defensiveness', topic = 'Feedback'
WHERE id::text LIKE '0ee735d1%';

UPDATE resources SET subtitle = 'Scripts and tactics for tense workplace discussions', topic = 'Communication'
WHERE id::text LIKE 'ea232586%';

UPDATE resources SET subtitle = 'Deep tactics on sourcing, interviews, and closing candidates', topic = 'Hiring'
WHERE id::text LIKE '3a021bb0%';

UPDATE resources SET subtitle = 'Forward-looking accountability conversations, not punishment', topic = 'Accountability'
WHERE id::text LIKE '70967f60%';

UPDATE resources SET subtitle = 'Frequency, agenda-setting, what to discuss and what to avoid', topic = '1:1s'
WHERE id::text LIKE '517c5958%';

UPDATE resources SET subtitle = 'Tactics for when stakeholders pull in different directions', topic = 'Stakeholders'
WHERE id::text LIKE '8d0c52f3%';

UPDATE resources SET subtitle = 'Deliberate practice and ongoing mastery for managers', topic = 'Learning'
WHERE id::text LIKE '2d6e21ec%';

UPDATE resources SET subtitle = 'Align project portfolios with strategic goals', topic = 'Prioritization'
WHERE id::text LIKE 'aa37ec82%';

UPDATE resources SET subtitle = 'Research-backed strategies for specificity and follow-through', topic = 'Goal Setting'
WHERE id::text LIKE 'e88b9eac%';

UPDATE resources SET subtitle = 'First weeks: expectations, introductions, clarity', topic = 'Onboarding'
WHERE id::text LIKE '7d6015b9%';

UPDATE resources SET subtitle = 'Six leadership styles and when to switch between them', topic = 'Leadership'
WHERE id::text LIKE '77e511bd%';

UPDATE resources SET subtitle = 'Eight reasons change initiatives stall', topic = 'Change'
WHERE id::text LIKE 'b3cecf2f%';

UPDATE resources SET subtitle = 'Maturity in technical work: humility, mentorship, raising others', topic = 'Engineering'
WHERE id::text LIKE 'a216db93%';

UPDATE resources SET subtitle = 'Integration, stakeholders, and cultural alignment for new hires', topic = 'Onboarding'
WHERE id::text LIKE 'db373e62%';

UPDATE resources SET subtitle = 'Framework for cross-functional collaboration and customer focus', topic = 'Collaboration'
WHERE id::text LIKE 'bc5b035e%';

UPDATE resources SET subtitle = 'Power/interest grid for mapping and engaging stakeholders', topic = 'Stakeholders'
WHERE id::text LIKE '5b8fefb0%';

UPDATE resources SET subtitle = 'Name what you and your team are experiencing under pressure', topic = 'Wellbeing'
WHERE id::text LIKE '96e40dbc%';

UPDATE resources SET subtitle = 'Most development comes from experience, not formal training', topic = 'Development'
WHERE id::text LIKE 'ed25cbfe%';

UPDATE resources SET subtitle = 'Separate urgent from important tasks with a simple grid', topic = 'Prioritization'
WHERE id::text LIKE '0c003326%';

UPDATE resources SET subtitle = 'Why focusing on strengths beats critical feedback', topic = 'Feedback'
WHERE id::text LIKE '17e629a9%';

UPDATE resources SET subtitle = 'Narrative is more persuasive than data alone', topic = 'Storytelling'
WHERE id::text LIKE '8d66ced6%';

UPDATE resources SET subtitle = 'A structure for one-to-ones that evolves as relationships mature', topic = '1:1s'
WHERE id::text LIKE '774361b9%';

UPDATE resources SET subtitle = 'Structure career talks to uncover aspirations and skill gaps', topic = 'Career Development'
WHERE id::text LIKE '0583d953%';

UPDATE resources SET subtitle = 'Build curiosity and pattern recognition across domains', topic = 'Learning'
WHERE id::text LIKE '83b57c56%';

UPDATE resources SET subtitle = 'A taxonomy of blockers and how to resolve each one', topic = 'Process'
WHERE id::text LIKE 'c378773e%';

UPDATE resources SET subtitle = 'Reframe requests to build collaborative dialogue', topic = 'Communication'
WHERE id::text LIKE 'd52c3719%';

UPDATE resources SET subtitle = 'Three modes every 1:1 falls into — recognise and respond', topic = '1:1s'
WHERE id::text LIKE '1cb8e3a1%';

UPDATE resources SET subtitle = 'Admitting uncertainty and mistakes builds trust and stronger teams', topic = 'Leadership'
WHERE id::text LIKE 'bb1fd9b1%';

UPDATE resources SET subtitle = 'Project Aristotle: psychological safety above all else', topic = 'Psychological Safety'
WHERE id::text LIKE '91f08cb6%';

UPDATE resources SET subtitle = 'The distinct roles of analysts, statisticians, and ML engineers', topic = 'Data'
WHERE id::text LIKE '578b6614%';

UPDATE resources SET subtitle = 'Good listening is active and two-way, not silent nodding', topic = 'Listening'
WHERE id::text LIKE '429c2998%';

UPDATE resources SET subtitle = 'Top managers spend their time clearing roadblocks', topic = 'Leadership'
WHERE id::text LIKE 'eeaf9218%';

UPDATE resources SET subtitle = 'Avoid the false growth mindset — apply the concept authentically', topic = 'Growth Mindset'
WHERE id::text LIKE '5d38b05c%';

UPDATE resources SET subtitle = 'How culture forms and how to be deliberate about it', topic = 'Culture'
WHERE id::text LIKE '3ae86af6%';

UPDATE resources SET subtitle = 'EQ as the foundation for reading situations and people', topic = 'Emotional Intelligence'
WHERE id::text LIKE 'f51f0a5b%';

UPDATE resources SET subtitle = 'Internal vs external awareness — replace why with what', topic = 'Self-Awareness'
WHERE id::text LIKE 'c982015a%';

UPDATE resources SET subtitle = 'Compassion builds more loyalty and performance than harshness', topic = 'Wellbeing'
WHERE id::text LIKE '5ce15e90%';

UPDATE resources SET subtitle = 'Which DEI interventions actually work vs backfire', topic = 'Diversity'
WHERE id::text LIKE '8ef9fd8e%';

UPDATE resources SET subtitle = 'Different environments need different strategic approaches', topic = 'Strategy'
WHERE id::text LIKE 'ed3ec08f%';

-- ── BOOKS ────────────────────────────────────────────────────────────────────

UPDATE resources SET subtitle = 'Learn from failure the way aviation learns from crashes', topic = 'Learning'
WHERE id::text LIKE '63131b50%';

UPDATE resources SET subtitle = 'Proven framework for transformative coaching conversations', topic = 'Coaching'
WHERE id::text LIKE '65f3eed5%';

UPDATE resources SET subtitle = 'The GROW model and the foundations of coaching at work', topic = 'Coaching'
WHERE id::text LIKE 'b1a24b29%';

UPDATE resources SET subtitle = 'Do hard things in a human way', topic = 'Leadership'
WHERE id::text LIKE '81265b5a%';

UPDATE resources SET subtitle = 'Use data and analytics as a competitive advantage', topic = 'Data'
WHERE id::text LIKE 'dbea7374%';

UPDATE resources SET subtitle = 'Build exceptional relationships through honesty and care', topic = 'Relationships'
WHERE id::text LIKE 'd3a80f16%';

UPDATE resources SET subtitle = 'Resolve violated expectations and broken commitments', topic = 'Accountability'
WHERE id::text LIKE '56d8e354%';

-- Crucial Conversations — three surviving rows with same title
UPDATE resources SET subtitle = 'Tools for talking when stakes are high', topic = 'Communication'
WHERE id::text LIKE '9118ceb4%';

UPDATE resources SET subtitle = 'Tools for talking when stakes are high', topic = 'Communication'
WHERE id::text LIKE '4cb2e7ab%';

UPDATE resources SET subtitle = 'Tools for talking when stakes are high', topic = 'Communication'
WHERE id::text LIKE '3cea628d%';

-- Dare to Lead — two surviving rows with same title
UPDATE resources SET subtitle = 'Brave work, tough conversations, and whole-hearted leadership', topic = 'Leadership'
WHERE id::text LIKE '05e076b9%';

UPDATE resources SET subtitle = 'Brave work, tough conversations, and whole-hearted leadership', topic = 'Leadership'
WHERE id::text LIKE '97d1a630%';

UPDATE resources SET subtitle = 'What managers need to know about data mining and ML', topic = 'Data'
WHERE id::text LIKE '16157b3f%';

UPDATE resources SET subtitle = 'Rules for focused success in a distracted world', topic = 'Productivity'
WHERE id::text LIKE '9556ab09%';

UPDATE resources SET subtitle = 'How to discuss what matters most without derailing', topic = 'Communication'
WHERE id::text LIKE '8e008400%';

UPDATE resources SET subtitle = 'Test and develop your EQ with a practical workbook', topic = 'Emotional Intelligence'
WHERE id::text LIKE '4122a3e6%';

-- Emotional Intelligence (Goleman) — two surviving rows with same title
UPDATE resources SET subtitle = 'Why EQ can matter more than IQ for leadership', topic = 'Emotional Intelligence'
WHERE id::text LIKE '9879de2f%';

UPDATE resources SET subtitle = 'Why EQ can matter more than IQ for leadership', topic = 'Emotional Intelligence'
WHERE id::text LIKE '4a23cedd%';

UPDATE resources SET subtitle = 'The disciplined pursuit of doing less, better', topic = 'Prioritization'
WHERE id::text LIKE 'a996ef9f%';

UPDATE resources SET subtitle = 'Navy SEAL leadership principles applied to teams', topic = 'Accountability'
WHERE id::text LIKE '2ca41dad%';

UPDATE resources SET subtitle = 'The art of stress-free productivity', topic = 'Productivity'
WHERE id::text LIKE 'd31325a1%';

UPDATE resources SET subtitle = 'Why givers rise to the top in the long run', topic = 'Collaboration'
WHERE id::text LIKE 'c5692230%';

UPDATE resources SET subtitle = 'What separates real strategy from the fluff', topic = 'Strategy'
WHERE id::text LIKE '5c14d5dd%';

UPDATE resources SET subtitle = 'Clear, direct business writing that gets results', topic = 'Communication'
WHERE id::text LIKE '9d19d607%';

UPDATE resources SET subtitle = 'Career conversations that retain and develop people', topic = 'Career Development'
WHERE id::text LIKE 'a1b8fa89%';

-- High Output Management — three surviving rows with same title
UPDATE resources SET subtitle = 'The operating manual for managing teams at scale', topic = 'Leadership'
WHERE id::text LIKE 'e3bff8fc%';

UPDATE resources SET subtitle = 'The operating manual for managing teams at scale', topic = 'Leadership'
WHERE id::text LIKE '6d473363%';

UPDATE resources SET subtitle = 'The operating manual for managing teams at scale', topic = 'Leadership'
WHERE id::text LIKE 'e19748cc%';

UPDATE resources SET subtitle = 'From awareness to active antiracism in policies and practice', topic = 'Diversity'
WHERE id::text LIKE 'd1c9b020%';

UPDATE resources SET subtitle = 'Timeless principles for building rapport and influence', topic = 'Communication'
WHERE id::text LIKE 'bee775e2%';

UPDATE resources SET subtitle = 'Build better relationships by asking instead of telling', topic = 'Coaching'
WHERE id::text LIKE '43ada1e2%';

UPDATE resources SET subtitle = 'Get things done when you lack direct control', topic = 'Influence'
WHERE id::text LIKE '76f572f7%';

UPDATE resources SET subtitle = 'The surprising truth about how others see us', topic = 'Self-Awareness'
WHERE id::text LIKE '787e6008%';

UPDATE resources SET subtitle = 'Adapt your leadership style to each person''s development level', topic = 'Leadership'
WHERE id::text LIKE '71c085c4%';

UPDATE resources SET subtitle = 'The eight-step process for leading transformation', topic = 'Change'
WHERE id::text LIKE '15a80989%';

UPDATE resources SET subtitle = 'How to nurture radical ideas before they get killed', topic = 'Innovation'
WHERE id::text LIKE '0f968104%';

UPDATE resources SET subtitle = 'Why some ideas survive and others die', topic = 'Communication'
WHERE id::text LIKE '67a15972%';

UPDATE resources SET subtitle = 'Focus on what matters by redesigning your daily default', topic = 'Productivity'
WHERE id::text LIKE 'ebfb34cb%';

UPDATE resources SET subtitle = 'Mastering project management for real-world teams', topic = 'Project Management'
WHERE id::text LIKE 'c7ac3819%';

UPDATE resources SET subtitle = 'Finding purpose in suffering — the foundation of resilience', topic = 'Resilience'
WHERE id::text LIKE 'b7d969cd%';

UPDATE resources SET subtitle = 'OKRs: the goal-setting system that drives results', topic = 'Goal Setting'
WHERE id::text LIKE '612b2802%';

UPDATE resources SET subtitle = 'Fixed vs growth mindset and how it shapes achievement', topic = 'Growth Mindset'
WHERE id::text LIKE '7fd1b472%';

UPDATE resources SET subtitle = 'Netflix''s radical approach to culture and reinvention', topic = 'Culture'
WHERE id::text LIKE '7c3e188c%';

UPDATE resources SET subtitle = 'A language of life for resolving conflict with empathy', topic = 'Communication'
WHERE id::text LIKE '4490cecd%';

UPDATE resources SET subtitle = 'Face adversity, build resilience, and find joy', topic = 'Resilience'
WHERE id::text LIKE '0645080e%';

UPDATE resources SET subtitle = 'The human side of software team productivity', topic = 'Culture'
WHERE id::text LIKE '1c21e4a8%';

UPDATE resources SET subtitle = 'Emotional intelligence from Yale''s RULER research', topic = 'Emotional Intelligence'
WHERE id::text LIKE '72e1be74%';

UPDATE resources SET subtitle = 'How strategy really works: where to play, how to win', topic = 'Strategy'
WHERE id::text LIKE 'b159c634%';

UPDATE resources SET subtitle = 'Be a great boss without losing your humanity', topic = 'Feedback'
WHERE id::text LIKE '655922cc%';

-- Range — two surviving rows with same title
UPDATE resources SET subtitle = 'Why generalists triumph in a specialized world', topic = 'Learning'
WHERE id::text LIKE 'a85c5fc2%';

UPDATE resources SET subtitle = 'Why generalists triumph in a specialized world', topic = 'Learning'
WHERE id::text LIKE '6ee53b4b%';

UPDATE resources SET subtitle = 'Process redesign for breakthrough performance', topic = 'Process'
WHERE id::text LIKE '24466adc%';

UPDATE resources SET subtitle = 'A practical guide for managing humans in tech', topic = 'Leadership'
WHERE id::text LIKE '097350c7%';

UPDATE resources SET subtitle = 'Present visual stories that transform audiences', topic = 'Storytelling'
WHERE id::text LIKE '1ad252ed%';

UPDATE resources SET subtitle = 'Leadership beyond the management track', topic = 'Engineering'
WHERE id::text LIKE '471d62cd%';

UPDATE resources SET subtitle = 'Recognise and address microaggressions at work', topic = 'Diversity'
WHERE id::text LIKE '19c420f3%';

UPDATE resources SET subtitle = 'How to change things when change is hard', topic = 'Change'
WHERE id::text LIKE 'cb83b66c%';

UPDATE resources SET subtitle = 'Nine public-speaking secrets of the world''s best minds', topic = 'Communication'
WHERE id::text LIKE '360a0481%';

UPDATE resources SET subtitle = 'New rules of engagement for a complex world', topic = 'Collaboration'
WHERE id::text LIKE '55526f4a%';

UPDATE resources SET subtitle = 'Reduce the risk of failure through rapid experimentation', topic = 'Innovation'
WHERE id::text LIKE 'e58037ff%';

UPDATE resources SET subtitle = 'The science and art of receiving feedback well', topic = 'Feedback'
WHERE id::text LIKE 'd5085768%';

UPDATE resources SET subtitle = 'A framework for building inclusion and safety progressively', topic = 'Psychological Safety'
WHERE id::text LIKE 'c8109025%';

UPDATE resources SET subtitle = 'Foundational principles of personal and professional effectiveness', topic = 'Leadership'
WHERE id::text LIKE 'f7eb75f9%';

UPDATE resources SET subtitle = 'Bridging strategy and execution through intent-based leadership', topic = 'Strategy'
WHERE id::text LIKE 'da29a9f9%';

UPDATE resources SET subtitle = 'Say less, ask more, and change the way you lead', topic = 'Coaching'
WHERE id::text LIKE '61cd957f%';

UPDATE resources SET subtitle = 'The secrets of highly successful groups', topic = 'Culture'
WHERE id::text LIKE '546bd550%';

UPDATE resources SET subtitle = 'Navigate cultural differences in global teams', topic = 'Culture'
WHERE id::text LIKE '7f7b4206%';

-- The Fearless Organization — two surviving rows with same title
UPDATE resources SET subtitle = 'Creating psychological safety for learning and innovation', topic = 'Psychological Safety'
WHERE id::text LIKE 'dd259cb2%';

UPDATE resources SET subtitle = 'Creating psychological safety for learning and innovation', topic = 'Psychological Safety'
WHERE id::text LIKE 'bfa8ad21%';

-- The First 90 Days — two surviving rows with same title
UPDATE resources SET subtitle = 'Proven strategies for getting up to speed faster', topic = 'Onboarding'
WHERE id::text LIKE '268b9114%';

UPDATE resources SET subtitle = 'Proven strategies for getting up to speed faster', topic = 'Onboarding'
WHERE id::text LIKE 'e161c9c2%';

UPDATE resources SET subtitle = 'The root causes of team breakdown and how to fix them', topic = 'Culture'
WHERE id::text LIKE '5bc41c34%';

UPDATE resources SET subtitle = 'Focus on wildly important goals, not the whirlwind', topic = 'Goal Setting'
WHERE id::text LIKE '983f7738%';

UPDATE resources SET subtitle = 'Hiring executives in fast-moving companies', topic = 'Hiring'
WHERE id::text LIKE 'e37c0dc4%';

UPDATE resources SET subtitle = 'The role of feeling, not just thinking, in leading change', topic = 'Change'
WHERE id::text LIKE 'e1eda0d2%';

UPDATE resources SET subtitle = 'Build, measure, learn — reduce risk through rapid iteration', topic = 'Innovation'
WHERE id::text LIKE '804ca0b4%';

UPDATE resources SET subtitle = 'How listening failures damage relationships', topic = 'Listening'
WHERE id::text LIKE 'a475cfa6%';

UPDATE resources SET subtitle = 'What to do when everyone looks to you', topic = 'Leadership'
WHERE id::text LIKE '378e47e6%';

UPDATE resources SET subtitle = 'A guide for tech leaders navigating growth and change', topic = 'Leadership'
WHERE id::text LIKE '59dae961%';

UPDATE resources SET subtitle = 'Getting results through individual and organisational accountability', topic = 'Accountability'
WHERE id::text LIKE '03659ba1%';

UPDATE resources SET subtitle = 'IT, DevOps, and business transformation as a novel', topic = 'Process'
WHERE id::text LIKE 'e9cbf7d7%';

UPDATE resources SET subtitle = 'Logic in writing and thinking for clear communication', topic = 'Communication'
WHERE id::text LIKE '044cbce0%';

UPDATE resources SET subtitle = 'Match your leadership style to each person''s readiness', topic = 'Leadership'
WHERE id::text LIKE 'b18071f4%';

UPDATE resources SET subtitle = 'Trust is the one thing that changes everything', topic = 'Relationships'
WHERE id::text LIKE '4baa6dd4%';

UPDATE resources SET subtitle = 'How the world''s most inspiring leaders communicate', topic = 'Storytelling'
WHERE id::text LIKE 'e1e6da6a%';

UPDATE resources SET subtitle = '14 management principles behind continuous improvement', topic = 'Process'
WHERE id::text LIKE '426b3851%';

UPDATE resources SET subtitle = 'The power of knowing what you don''t know', topic = 'Learning'
WHERE id::text LIKE 'fa05a7c8%';

-- Thinking, Fast and Slow — two surviving rows with same title
UPDATE resources SET subtitle = 'System 1 vs System 2 thinking and cognitive bias', topic = 'Decision Making'
WHERE id::text LIKE 'aca3591b%';

UPDATE resources SET subtitle = 'System 1 vs System 2 thinking and cognitive bias', topic = 'Decision Making'
WHERE id::text LIKE '7b768b1f%';

UPDATE resources SET subtitle = 'Create conditions where people do their best thinking', topic = 'Coaching'
WHERE id::text LIKE '36d650fe%';

UPDATE resources SET subtitle = 'The A Method for consistently hiring top performers', topic = 'Hiring'
WHERE id::text LIKE '356646cb%';

UPDATE resources SET subtitle = 'Insights from inside Google on hiring, culture, and performance', topic = 'Culture'
WHERE id::text LIKE 'a36a6718%';

-- ── COURSES ──────────────────────────────────────────────────────────────────

UPDATE resources SET subtitle = 'Build a coaching toolkit through practice and reflection', topic = 'Coaching'
WHERE id::text LIKE 'dfe52b22%';

UPDATE resources SET subtitle = 'Tailor messaging for different stakeholder audiences', topic = 'Stakeholders'
WHERE id::text LIKE 'fecb4567%';

UPDATE resources SET subtitle = 'Science-backed strategies for setting and sustaining goals', topic = 'Goal Setting'
WHERE id::text LIKE '86ae6c9e%';

UPDATE resources SET subtitle = 'Structure onboarding for faster time-to-productivity', topic = 'Onboarding'
WHERE id::text LIKE '5cfb5686%';

UPDATE resources SET subtitle = 'Build influence and trust across team boundaries', topic = 'Collaboration'
WHERE id::text LIKE '423dce5c%';

UPDATE resources SET subtitle = 'The data concepts every manager needs to lead evidence-driven teams', topic = 'Data'
WHERE id::text LIKE '48e6f7e9%';

UPDATE resources SET subtitle = 'Human-centred problem-solving from UVA Darden', topic = 'Innovation'
WHERE id::text LIKE '4611830e%';

UPDATE resources SET subtitle = 'Build confident, compelling speaking skills step by step', topic = 'Communication'
WHERE id::text LIKE '04d23b04%';

UPDATE resources SET subtitle = 'Read and interpret financial statements with confidence', topic = 'Finance'
WHERE id::text LIKE 'cd50089a%';

UPDATE resources SET subtitle = 'Deliver feedback that is specific, timely, and constructive', topic = 'Feedback'
WHERE id::text LIKE 'edf2e288%';

UPDATE resources SET subtitle = 'Lead teams where everyone can contribute fully', topic = 'Diversity'
WHERE id::text LIKE '42d51df7%';

UPDATE resources SET subtitle = 'Use EQ to inspire and sustain high performance', topic = 'Emotional Intelligence'
WHERE id::text LIKE '9ac2d6e0%';

UPDATE resources SET subtitle = 'Apply the ADKAR model to guide individuals through change', topic = 'Change'
WHERE id::text LIKE '114dfa78%';

UPDATE resources SET subtitle = 'Evidence-based resilience strategies from positive psychology', topic = 'Resilience'
WHERE id::text LIKE '9f063537%';

UPDATE resources SET subtitle = 'The fundamentals of process improvement and defect reduction', topic = 'Process'
WHERE id::text LIKE '052ea82d%';

UPDATE resources SET subtitle = 'Use narrative to persuade and move people to action', topic = 'Storytelling'
WHERE id::text LIKE '2b532c09%';

UPDATE resources SET subtitle = 'From strategy design to on-the-ground execution', topic = 'Strategy'
WHERE id::text LIKE '0b7e4cda%';

UPDATE resources SET subtitle = 'Translate strategic priorities into measurable results', topic = 'Strategy'
WHERE id::text LIKE 'bc80737c%';

-- ── PERSONS ──────────────────────────────────────────────────────────────────

UPDATE resources SET subtitle = 'Harvard professor and pioneer of psychological safety research', topic = 'Psychological Safety'
WHERE id::text LIKE '65f29f12%';

UPDATE resources SET subtitle = 'Stanford psychologist who developed growth mindset theory', topic = 'Growth Mindset'
WHERE id::text LIKE '6fed6a4e%';

UPDATE resources SET subtitle = 'Foundational thinker on culture, helping, and humble inquiry', topic = 'Culture'
WHERE id::text LIKE '457405d2%';

UPDATE resources SET subtitle = 'INSEAD professor on leadership identity and career transitions', topic = 'Leadership'
WHERE id::text LIKE '99cac272%';

UPDATE resources SET subtitle = 'Creator of the Performance-based Hiring framework', topic = 'Hiring'
WHERE id::text LIKE '302094fa%';

UPDATE resources SET subtitle = 'Business storytelling expert and Anecdote founder', topic = 'Storytelling'
WHERE id::text LIKE '9f749f40%';

UPDATE resources SET subtitle = 'Harvard negotiation faculty and co-author of Difficult Conversations', topic = 'Communication'
WHERE id::text LIKE '8f548147%';

UPDATE resources SET subtitle = 'Author and podcaster on lifestyle design and peak performance', topic = 'Productivity'
WHERE id::text LIKE 'b5376c1c%';

-- ── PODCASTS ─────────────────────────────────────────────────────────────────

UPDATE resources SET subtitle = 'How disagreement handled well leads to stronger teams', topic = 'Conflict'
WHERE id::text LIKE '7dd39c6a%';

UPDATE resources SET subtitle = 'How the best teams rethink their ways of working', topic = 'Culture'
WHERE id::text LIKE '9cdd9bd0%';

UPDATE resources SET subtitle = 'Vulnerability, shame, and courage in real conversations', topic = 'Wellbeing'
WHERE id::text LIKE 'd9e6c136%';

UPDATE resources SET subtitle = 'Communication tactics for spontaneous speaking and meetings', topic = 'Communication'
WHERE id::text LIKE '5a2debcd%';

UPDATE resources SET subtitle = 'Routines and productivity systems from top performers', topic = 'Productivity'
WHERE id::text LIKE 'd1d39e5c%';

UPDATE resources SET subtitle = 'True personal stories that demonstrate narrative craft', topic = 'Storytelling'
WHERE id::text LIKE '82e0b40a%';

UPDATE resources SET subtitle = 'Leadership development and the inner work of helping others grow', topic = 'Coaching'
WHERE id::text LIKE '72b0d418%';

-- Coaching for Leaders — UUID not provided; matched by canonical URL
UPDATE resources SET subtitle = 'Practical leadership conversations and coaching skills', topic = 'Coaching'
WHERE url = 'https://coachingforleaders.com/podcast/';

-- Manager Tools Podcast — UUID not provided; matched by canonical URL
UPDATE resources SET subtitle = 'Practical management tools for everyday leadership situations', topic = 'Leadership'
WHERE url = 'https://www.manager-tools.com/manager-tools-basics';

-- ── TOOLS ────────────────────────────────────────────────────────────────────

UPDATE resources SET subtitle = 'Performance management for check-ins and consistent feedback', topic = 'Feedback'
WHERE id::text LIKE 'b41daa46%';

UPDATE resources SET subtitle = 'Work management with OKR tracking to link work to strategy', topic = 'Goal Setting'
WHERE id::text LIKE 'b6b93cd6%';

UPDATE resources SET subtitle = 'Organisational network analysis tools and assessments', topic = 'Networking'
WHERE id::text LIKE '4c95e9d4%';

UPDATE resources SET subtitle = 'Resource management for capacity planning and scheduling', topic = 'Planning'
WHERE id::text LIKE '7d50f9da%';

UPDATE resources SET subtitle = 'AI writing assistant for clarity, tone, and grammar', topic = 'Communication'
WHERE id::text LIKE '132fd1e1%';

UPDATE resources SET subtitle = 'Goal-Reality-Options-Will framework for coaching conversations', topic = 'Coaching'
WHERE id::text LIKE '48059593%';

UPDATE resources SET subtitle = 'Structured IDP template for development conversations', topic = 'Development'
WHERE id::text LIKE '637a324f%';

UPDATE resources SET subtitle = 'Hub for lean thinking, continuous improvement tools, and case studies', topic = 'Process'
WHERE id::text LIKE 'b1e2dc45%';

UPDATE resources SET subtitle = 'Dedicated tool for preparing and running 1:1s', topic = '1:1s'
WHERE id::text LIKE 'd809d4f6%';

-- Miro — two surviving rows with same title
UPDATE resources SET subtitle = 'Visual collaboration for brainstorming and ideation workshops', topic = 'Collaboration'
WHERE id::text LIKE '13acb45a%';

UPDATE resources SET subtitle = 'Visual collaboration for brainstorming and ideation workshops', topic = 'Collaboration'
WHERE id::text LIKE '2f5c6583%';

UPDATE resources SET subtitle = 'Visual tool for mapping stakeholders by influence and interest', topic = 'Stakeholders'
WHERE id::text LIKE 'cee16146%';

UPDATE resources SET subtitle = 'App to plot, label, and regulate emotions throughout the day', topic = 'Emotional Intelligence'
WHERE id::text LIKE 'f10105a9%';

UPDATE resources SET subtitle = 'Pulse surveys to detect issues with team wellbeing and safety', topic = 'Wellbeing'
WHERE id::text LIKE 'fd385d6f%';

UPDATE resources SET subtitle = 'AI transcription so you can focus on listening in 1:1s', topic = 'Listening'
WHERE id::text LIKE 'f7c3561f%';

UPDATE resources SET subtitle = 'Implicit Association Tests to surface unconscious bias', topic = 'Diversity'
WHERE id::text LIKE 'dde71c4c%';

UPDATE resources SET subtitle = 'Diagnose where people are stuck in change adoption', topic = 'Change'
WHERE id::text LIKE '1cca6d86%';

UPDATE resources SET subtitle = 'Clarify roles and decision rights on any initiative', topic = 'Accountability'
WHERE id::text LIKE '2adfbf67%';

UPDATE resources SET subtitle = 'Gather stories of your best self to balance self-perception', topic = 'Self-Awareness'
WHERE id::text LIKE '4d3ae4e1%';

UPDATE resources SET subtitle = 'Situation-Behaviour-Impact — structure specific feedback', topic = 'Feedback'
WHERE id::text LIKE '1cbde710%';

UPDATE resources SET subtitle = 'Design structured interviews to improve hiring prediction', topic = 'Hiring'
WHERE id::text LIKE '923b2bb5%';

UPDATE resources SET subtitle = 'Explore and visualise data to build analytical intuition', topic = 'Data'
WHERE id::text LIKE '074781c8%';

UPDATE resources SET subtitle = 'Task management for juggling personal and team priorities', topic = 'Productivity'
WHERE id::text LIKE '5a1abbdc%';

UPDATE resources SET subtitle = 'Ready-to-use 30/60/90-day onboarding plan templates', topic = 'Onboarding'
WHERE id::text LIKE '6d91aef9%';

-- ── VIDEOS ───────────────────────────────────────────────────────────────────

UPDATE resources SET subtitle = 'Five exercises to retune your listening for connection', topic = 'Listening'
WHERE id::text LIKE 'e94473e2%';

UPDATE resources SET subtitle = 'Empathy vs sympathy — a short animated primer', topic = 'Emotional Intelligence'
WHERE id::text LIKE 'a7ec3cf4%';

UPDATE resources SET subtitle = 'Why safety is the precondition for team innovation', topic = 'Psychological Safety'
WHERE id::text LIKE '6c48963a%';

UPDATE resources SET subtitle = 'Principles of effective mentorship and supporting others'' growth', topic = 'Coaching'
WHERE id::text LIKE '3b5bcb46%';

UPDATE resources SET subtitle = 'Authenticity, logic, and empathy — the three drivers of trust', topic = 'Relationships'
WHERE id::text LIKE 'c0d51648%';

UPDATE resources SET subtitle = 'Radical transparency and idea meritocracy at Bridgewater', topic = 'Culture'
WHERE id::text LIKE 'e9b8760c%';

UPDATE resources SET subtitle = 'Time management is a question of priorities, not efficiency', topic = 'Productivity'
WHERE id::text LIKE '036dbc8b%';

UPDATE resources SET subtitle = 'Why ideas catch on — applied to internal change communication', topic = 'Communication'
WHERE id::text LIKE '28a0f645%';

UPDATE resources SET subtitle = 'Leaders create environments where teams generate new ideas', topic = 'Innovation'
WHERE id::text LIKE '54501507%';

UPDATE resources SET subtitle = 'Teaming across boundaries without stable team structures', topic = 'Collaboration'
WHERE id::text LIKE '2d82da17%';

UPDATE resources SET subtitle = 'Replace why with what for 10x better self-insight', topic = 'Self-Awareness'
WHERE id::text LIKE '2c68d7d3%';

UPDATE resources SET subtitle = 'Track data to make better personal and professional decisions', topic = 'Data'
WHERE id::text LIKE '398f171a%';

UPDATE resources SET subtitle = 'Resource allocation is the most consequential management decision', topic = 'Strategy'
WHERE id::text LIKE 'fdcf5e4e%';

UPDATE resources SET subtitle = 'The Golden Circle framework for communicating purpose', topic = 'Leadership'
WHERE id::text LIKE 'f8f5fddd%';

UPDATE resources SET subtitle = 'OKRs — the goal-setting system that drives results', topic = 'Goal Setting'
WHERE id::text LIKE 'f919cf31%';

UPDATE resources SET subtitle = 'When to hire, what to look for, how to assess candidates', topic = 'Hiring'
WHERE id::text LIKE '2f1aeb7d%';

UPDATE resources SET subtitle = 'What makes stories land — from a Pixar filmmaker', topic = 'Storytelling'
WHERE id::text LIKE '24820912%';

UPDATE resources SET subtitle = 'Reducing people to single narratives strips dignity and complexity', topic = 'Diversity'
WHERE id::text LIKE '2f63244c%';

UPDATE resources SET subtitle = 'A 10-minute primer on growth mindset and the power of yet', topic = 'Growth Mindset'
WHERE id::text LIKE '61557980%';

UPDATE resources SET subtitle = 'Why structured onboarding improves retention and time-to-productivity', topic = 'Onboarding'
WHERE id::text LIKE '00054d77%';

UPDATE resources SET subtitle = 'Reframe accountability conversations as acts of care', topic = 'Accountability'
WHERE id::text LIKE 'c0a51dd2%';

UPDATE resources SET subtitle = 'A four-part formula for feedback that lands well', topic = 'Feedback'
WHERE id::text LIKE '46fd781d%';

UPDATE resources SET subtitle = 'Three evidence-based strategies from a resilience researcher', topic = 'Resilience'
WHERE id::text LIKE '279fe7e7%';

UPDATE resources SET subtitle = 'Psychological safety enables ownership, not fear-based compliance', topic = 'Psychological Safety'
WHERE id::text LIKE '804c5fa3%';
