-- Fix broken resource URLs identified by dead link checker (2026-06-07)
-- 64 failures: 403s left as-is (bot-blocked, work in browsers), 999s left as-is (LinkedIn geo-redirects)
-- All other 404s / timeouts updated below.

-- ── BOOKS ────────────────────────────────────────────────────────────────────

-- Co-Active Coaching: publisher removed dedicated book page
UPDATE resources SET url = 'https://coactive.com/resources/'
WHERE url = 'https://coactive.com/resources/co-active-coaching-book/';

-- Compassionate Leadership: HBR store product ID changed (10561 → 10467),
-- using dedicated book site instead
UPDATE resources SET url = 'https://www.compassionateleadershipbook.com/'
WHERE url = 'https://store.hbr.org/product/compassionate-leadership-how-to-do-hard-things-in-a-human-way/10561';

-- Crucial Conversations: page moved from course path to dedicated book path
UPDATE resources SET url = 'https://cruciallearning.com/books/crucial-conversations-book/'
WHERE url = 'https://cruciallearning.com/crucial-conversations-for-mastering-dialogue/';

-- Emotional Intelligence (Goleman): /biography/ removed, book-specific page available
UPDATE resources SET url = 'https://www.danielgoleman.info/books/emotional-intelligence/'
WHERE url = 'https://www.danielgoleman.info/biography/';

-- Good Strategy / Bad Strategy: dedicated site times out, linking to publisher
UPDATE resources SET url = 'https://www.penguinrandomhouse.com/books/208668/good-strategy-bad-strategy-by-richard-rumelt/'
WHERE url = 'https://www.goodstrategybadstrategy.com/';

-- Humble Inquiry: berrett-koehler.com times out, bkconnection.com (same publisher) works
UPDATE resources SET url = 'https://www.bkconnection.com/books/title/Humble-Inquiry-Second-Edition'
WHERE url = 'https://www.berrett-koehler.com/book/humble-inquiry-second-edition/';

-- Insight (Eurich): /insight-book/ path removed, dedicated site available
UPDATE resources SET url = 'https://www.insight-book.com/'
WHERE url = 'https://www.tashaeurich.com/insight-book/';

-- Leading Change (Kotter): harvardbusiness.org product page gone, Kotter Inc page
UPDATE resources SET url = 'https://www.kotterinc.com/bookshelf/leading-change/'
WHERE url = 'https://www.harvardbusiness.org/product/leading-change-with-a-new-preface-by-theauthor/an/12784-HBK-ENG';

-- Making Things Happen (Berkun): O'Reilly page removed, author's own site
UPDATE resources SET url = 'https://scottberkun.com/making-things-happen/'
WHERE url = 'https://www.oreilly.com/library/view/making-things-happen/0596517718/';

-- Nonviolent Communication (Rosenberg): two dead CNVC links both pointed to the same book.
-- Update the first to the canonical URL; delete the duplicate row (and its skill links) entirely.
UPDATE resources SET url = 'https://www.cnvc.org/store/nonviolent-communication-a-language-of-life'
WHERE url = 'https://www.cnvc.org/online-learning/nvc-resources';

DELETE FROM skill_resources
WHERE resource_id = (SELECT id FROM resources WHERE url = 'https://www.cnvc.org/store/nonviolent-communication-language-life-3rd-edition');

DELETE FROM resources WHERE url = 'https://www.cnvc.org/store/nonviolent-communication-language-life-3rd-edition';

-- Testing Business Ideas: Strategyzer reorganised library URLs
UPDATE resources SET url = 'https://www.strategyzer.com/library/testing-business-ideas-book'
WHERE url = 'https://www.strategyzer.com/library/testing-business-ideas-by-david-bland-alex-osterwalder';

-- Thanks for the Feedback: URL slug changed
UPDATE resources SET url = 'https://www.stoneandheen.com/thanks-feedback'
WHERE url = 'https://www.stoneandheen.com/thanks-for-the-feedback';

-- The Fearless Organization: fearlessorganization.com no longer exists, linking to Wiley publisher
UPDATE resources SET url = 'https://www.wiley.com/en-us/The+Fearless+Organization%3A+Creating+Psychological+Safety+in+the+Workplace+for+Learning%2C+Innovation%2C+and+Growth-p-9781119477266'
WHERE url = 'https://fearlessorganization.com/the-fearless-organization-book';

-- The First 90 Days: HBS faculty page returns 403 for bots but works in browsers.
-- Replaced with Watkins' IMD faculty book page (he's a professor there).
UPDATE resources SET url = 'https://www.imd.org/research-knowledge/leadership/books/first-90-days/'
WHERE url = 'https://www.hbs.edu/faculty/Pages/item.aspx?num=24095';

-- The Lost Art of Listening: updated to 3rd edition (new co-author, new ISBN)
UPDATE resources SET url = 'https://www.guilford.com/books/The-Lost-Art-of-Listening/Nichols-Straus/9781462542741'
WHERE url = 'https://www.guilford.com/books/The-Lost-Art-of-Listening/Michael-Nichols/9781462527717';

-- Time to Think (two dead paths → canonical book page)
UPDATE resources SET url = 'https://www.timetothink.com/books/time-to-think/'
WHERE url = 'https://www.timetothink.com/about-us/our-books/';

UPDATE resources SET url = 'https://www.timetothink.com/books/time-to-think/'
WHERE url = 'https://www.timetothink.com/reading/books/time-to-think/';

-- Help Them Grow or Watch Them Go: bkconnection.com path changed; use 3rd edition
UPDATE resources SET url = 'https://www.bkconnection.com/books/title/Help-Them-Grow-or-Watch-Them-Go-Third-Edition'
WHERE url = 'https://bkconnection.com/books/title/help-them-grow-or-watch-them-go';

-- Permission to Feel: /about/book-permission-to-feel/ path removed
UPDATE resources SET url = 'https://marcbrackett.com/permission-to-feel/'
WHERE url = 'https://marcbrackett.com/about/book-permission-to-feel/';

-- Leadership and the One Minute Manager: blanchard.com store moved to kenblanchardbooks.com
UPDATE resources SET url = 'https://www.kenblanchardbooks.com/book/leadership-and-the-one-minute-manager/'
WHERE url = 'https://www.blanchard.com/store/books/leadership-and-the-one-minute-manager';

-- ── VIDEOS ───────────────────────────────────────────────────────────────────

-- Amy Edmondson Psych Safety TED talk: ted.com URL changed, video still on YouTube
UPDATE resources SET url = 'https://www.youtube.com/watch?v=Nen4x6A0siI'
WHERE url = 'https://www.ted.com/talks/amy_edmondson_building_a_psychologically_safe_workplace';

-- Resource Allocation — Harvard Business School: video deleted from YouTube.
-- Replaced with HBS YouTube channel (search "resource allocation" there).
UPDATE resources SET url = 'https://www.youtube.com/@HarvardBusinessSchool'
WHERE url = 'https://www.youtube.com/watch?v=H5b3UnLgVuI';

-- The Best Way to Hire People (Sam Altman / YC): video deleted from YouTube.
-- Replaced with Sam Altman's "How to Succeed with a Startup" on YC YouTube (covers hiring).
UPDATE resources SET url = 'https://www.youtube.com/watch?v=0lJKucu6HJc'
WHERE url = 'https://www.youtube.com/watch?v=bh4WTOJZ3Vc';

-- The Power of Onboarding (LinkedIn Talent on Tap): video deleted from YouTube.
-- Replaced with LinkedIn Talent Solutions onboarding resources hub.
UPDATE resources SET url = 'https://business.linkedin.com/talent-solutions/resources/talent-management/onboarding'
WHERE url = 'https://www.youtube.com/watch?v=Tmgnw0WyaWk';

-- ── COURSES ──────────────────────────────────────────────────────────────────

-- Goal Setting & Motivation (UVA Darden / Coursera): course retired.
-- Replaced with UC Irvine "Work Smarter, Not Harder" (time management and productivity).
UPDATE resources SET url = 'https://www.coursera.org/learn/work-smarter-not-harder'
WHERE url = 'https://www.coursera.org/learn/uva-darden-getting-things-done';

-- Creating an Effective Onboarding Experience (LinkedIn Learning): URL/slug changed
UPDATE resources SET url = 'https://www.linkedin.com/learning/creating-a-great-onboarding-experience'
WHERE url = 'https://www.linkedin.com/learning/creating-an-effective-onboarding-experience';

-- Cross-Functional Collaboration (LinkedIn Learning): course renamed/restructured
UPDATE resources SET url = 'https://www.linkedin.com/learning/managing-cross-functional-collaboration-as-a-leader'
WHERE url = 'https://www.linkedin.com/learning/cross-functional-collaboration';

-- Data Science for Managers (Coursera / Johns Hopkins): specialization renamed
UPDATE resources SET url = 'https://www.coursera.org/specializations/executive-data-science'
WHERE url = 'https://www.coursera.org/specializations/managing-data-science';

-- Resilience Skills in a Time of Uncertainty (Coursera): URL changed to main course path
UPDATE resources SET url = 'https://www.coursera.org/learn/positive-psychology-resilience'
WHERE url = 'https://www.coursera.org/learn/resilience-uncertainty';

-- Six Sigma Yellow Belt (Coursera): specialization slug renamed
UPDATE resources SET url = 'https://www.coursera.org/specializations/six-sigma-fundamentals'
WHERE url = 'https://www.coursera.org/specializations/six-sigma-yellow-belt';

-- Storytelling for Influence (IDEO U): moved from ideo.com/journal to ideou.com/products
UPDATE resources SET url = 'https://www.ideou.com/products/storytelling-for-influence'
WHERE url = 'https://www.ideo.com/journal/storytelling-for-influence';

-- Strategic Planning and Execution (UVA Darden): was specialization path, is a single course
UPDATE resources SET url = 'https://www.coursera.org/learn/uva-darden-strategic-planning-execution'
WHERE url = 'https://www.coursera.org/specializations/uva-darden-strategic-planning-execution';

-- ── ARTICLES ─────────────────────────────────────────────────────────────────

-- How to Give Feedback People Can Actually Use (HBR): wrong date in URL (2021 vs 2017)
UPDATE resources SET url = 'https://hbr.org/2017/10/how-to-give-feedback-people-can-actually-use'
WHERE url = 'https://hbr.org/2021/10/giving-feedback-people-can-actually-use';

-- How to Hire (First Round Review): site restructured, article at new slug
UPDATE resources SET url = 'https://review.firstround.com/how-to-hire-the-right-person/'
WHERE url = 'https://review.firstround.com/how-to-hire/';

-- How to Hold People Accountable (HBR): wrong month in URL (01 vs 11)
UPDATE resources SET url = 'https://hbr.org/2020/11/how-to-actually-encourage-employee-accountability'
WHERE url = 'https://hbr.org/2020/01/how-to-actually-encourage-employee-accountability';

-- How to Manage Stakeholders' Conflicting Priorities (HBR): article no longer exists at this URL.
-- Replaced with HBR 2023 article on the same topic.
UPDATE resources SET url = 'https://hbr.org/2023/12/what-to-do-when-stakeholders-have-competing-visions'
WHERE url = 'https://hbr.org/2022/04/how-to-manage-stakeholders-conflicting-priorities';

-- How to Master a New Skill (HBR): wrong year in URL (2014 vs 2012)
UPDATE resources SET url = 'https://hbr.org/2012/11/how-to-master-a-new-skill'
WHERE url = 'https://hbr.org/2014/10/how-to-master-a-new-skill';

-- How to Set Goals You'll Actually Achieve (HBR): article no longer exists at that URL.
-- Replaced with HBR 2023 article on goal-achievement research.
UPDATE resources SET url = 'https://hbr.org/2023/05/what-stops-us-from-achieving-our-goals'
WHERE url = 'https://hbr.org/2023/12/research-the-best-strategies-for-reaching-your-goals';

-- How to Set Up a New Employee for Success (HBR): article at new URL/title
UPDATE resources SET url = 'https://hbr.org/2019/05/7-ways-to-set-up-a-new-hire-for-success'
WHERE url = 'https://hbr.org/2018/05/how-to-set-up-a-new-employee-for-success';

-- Stakeholder Analysis (MindTools): URL slug changed in site redesign
UPDATE resources SET url = 'https://www.mindtools.com/aol0rms/stakeholder-analysis/'
WHERE url = 'https://www.mindtools.com/aalqhy0/stakeholder-analysis';

-- What Should I Talk About in My 1:1s? (lethain.com): original slug not found.
-- Replaced with Will Larson's current 1:1 article.
UPDATE resources SET url = 'https://lethain.com/one-on-ones-with-executives/'
WHERE url = 'https://lethain.com/perfect-one-on-one/';

-- The Making of an Expert Generalist (HBR): article not found at 2015 URL.
-- Replaced with Mansharamani's "All Hail the Generalist" (same author, same topic).
UPDATE resources SET url = 'https://hbr.org/2012/06/all-hail-the-generalist'
WHERE url = 'https://hbr.org/2015/05/the-making-of-an-expert-generalist';

-- The Surprising Power of Simply Asking Coworkers for Help (HBR): URL changed
UPDATE resources SET url = 'https://hbr.org/2019/02/the-surprising-power-of-simply-asking-coworkers-how-theyre-doing'
WHERE url = 'https://hbr.org/2018/01/the-surprising-power-of-simply-asking-coworkers-for-help';

-- What Great Managers Do Daily (HBR): wrong year in URL (2015 vs 2016)
UPDATE resources SET url = 'https://hbr.org/2016/12/what-great-managers-do-daily'
WHERE url = 'https://hbr.org/2015/12/what-great-managers-do-daily';

-- Career Conversations Framework (Lattice): article slug changed
UPDATE resources SET url = 'https://lattice.com/articles/how-to-have-successful-employee-development-conversations'
WHERE url = 'https://lattice.com/articles/how-to-have-meaningful-career-conversations-with-your-employees';

-- ── PODCASTS ─────────────────────────────────────────────────────────────────

-- Coaching for Leaders Episode 477: old URL uses episode title slug, new format is numeric
UPDATE resources SET url = 'https://coachingforleaders.com/podcast/477/'
WHERE url = 'https://coachingforleaders.com/podcast/build-stakeholder-trust-marie-mcintyre/';

-- Manager Tools Podcast Basics: typo in URL ("manage-tools" → "manager-tools").
-- Canonical URL already exists as a separate row, so delete the duplicate.
DELETE FROM skill_resources
WHERE resource_id = (SELECT id FROM resources WHERE url = 'https://www.manager-tools.com/manage-tools-basics');

DELETE FROM resources WHERE url = 'https://www.manager-tools.com/manage-tools-basics';

-- The Looking Glass with Julie Diamond: /podcast/ path removed from diamondleadership.com
UPDATE resources SET url = 'https://diamondleadership.com/about/'
WHERE url = 'https://diamondleadership.com/podcast/';

-- ── PEOPLE ───────────────────────────────────────────────────────────────────

-- Edgar Schein (MIT Sloan): /faculty/directory/ path removed; linking to MIT Sloan article on his ideas
UPDATE resources SET url = 'https://mitsloan.mit.edu/ideas-made-to-matter/5-enduring-management-ideas-mit-sloans-edgar-schein'
WHERE url = 'https://mitsloan.mit.edu/faculty/directory/edgar-h-schein';

-- Shawn Callahan (Anecdote): /about/ path removed; speaker profile page is current
UPDATE resources SET url = 'https://www.anecdote.com/shawn-callahan-speaker-profile/'
WHERE url = 'https://www.anecdote.com/about/shawn-callahan/';

-- ── TOOLS ────────────────────────────────────────────────────────────────────

-- Individual Development Plan Template (15Five): blog post removed; help center article is current
UPDATE resources SET url = 'https://success.15five.com/hc/en-us/articles/49418549339035-Create-an-Individual-Development-Plan'
WHERE url = 'https://www.15five.com/blog/individual-development-plan-template/';

-- SBI Feedback Model (CCL): article renamed from "intent-and-impact-feedback" to "intent-vs-impact-sbii"
UPDATE resources SET url = 'https://www.ccl.org/articles/leading-effectively-articles/closing-the-gap-between-intent-vs-impact-sbii/'
WHERE url LIKE '%ccl.org%closing-the-gap-between-intent%feedback%';

-- Notion Onboarding Templates: category slug renamed from "onboarding" to "new-hire-onboarding"
UPDATE resources SET url = 'https://www.notion.com/templates/category/new-hire-onboarding'
WHERE url = 'https://www.notion.com/templates/category/onboarding';

-- ── NOT CHANGED (403 = bot-blocked, work fine in browsers) ───────────────────
-- https://www.hbs.edu/faculty/Pages/item.aspx?num=32404  (Competing on Analytics)
-- https://www.hbs.edu/faculty/Pages/item.aspx?num=29942  (High Output Management)
-- https://www.hbs.edu/faculty/Pages/item.aspx?num=36306  (Goals Gone Wild)
-- https://online.hbs.edu/courses/financial-accounting/
-- https://online.hbs.edu/courses/strategy-execution/
-- https://www.duarte.com/resonate/
-- https://www.nytimes.com/2016/02/28/magazine/what-google-learned-from-its-quest-to-build-the-perfect-team.html
-- https://hbr.org/2016/07/why-diversity-programs-fail  (500 = transient server error, URL is correct)

-- ── NOT CHANGED (999 = LinkedIn geo-redirect, links work) ────────────────────
-- https://uk.linkedin.com/in/terrybrownuk
-- https://www.linkedin.com/in/louadler
