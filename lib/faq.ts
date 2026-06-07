export interface FaqItem {
  q: string
  a: string
}

export interface FaqSection {
  id: string
  label: string
  items: FaqItem[]
}

export const FAQ_SECTIONS: FaqSection[] = [
  {
    id: 'getting-started',
    label: 'Getting started',
    items: [
      {
        q: 'How do I start?',
        a: 'Have a quick read of <a href="/the-guide">the guide</a>, in particular the <a href="/the-guide/self">start here</a> section. Then open the Scorecard and score yourself honestly across the five pillars. It takes about ten minutes and there are no right answers — the point is to see where you actually are, not where you hope to be.',
      },
      {
        q: 'How long does it take?',
        a: "About an hour and a half in total. Roughly 30 minutes of pre-reading to understand the categories, then 30 minutes each from you and your manager for scoring, then a 30-minute conversation to compare and align.",
      },
      {
        q: 'What is the outcome?',
        a: "At the end you should have a clearer picture of yourself — your strengths and growth opportunities — with that view correlated against your manager's perspective. This gives you one or two concrete areas to focus your development on.",
      },
      {
        q: 'I need to improve a specific skill — where do I start?',
        a: 'The <a href="/resources">Resources</a> section has curated books, articles, courses, and tools organised by management topic. A conversation with your manager and some targeted reading is the best starting point.',
      },
      {
        q: "I have a question that isn't answered here",
        a: 'Get in touch via <a href="https://www.linkedin.com/in/terrybrownuk" target="_blank" rel="noopener noreferrer">LinkedIn</a> — I\'d love to engage in conversation and grow this over time.',
      },
    ],
  },
  {
    id: 'using-the-guide',
    label: 'Using the guide',
    items: [
      {
        q: 'What is management?',
        a: 'At its simplest: the co-ordination of people and resources to achieve outcomes. There are many definitions, but what matters is that management is primarily about enabling the people around you — not about doing the work yourself.',
      },
      {
        q: 'What does a real career ladder look like?',
        a: 'Management is often at complete odds with the job you did as an individual contributor. It is an entirely different career pathway, and the skills that made you a great IC don\'t always prepare you for what it means to be focused on the success and support of others. The guide explores this in the <a href="/the-guide/self">Self pillar</a>.',
      },
      {
        q: 'How can I use the guide?',
        a: 'The guide is open-source — feel free to use it, adapt it, and share it. If you are using it, attribution is appreciated and I\'d love to hear about it. Reach out on <a href="https://www.linkedin.com/in/terrybrownuk" target="_blank" rel="noopener noreferrer">LinkedIn</a>.',
      },
    ],
  },
  {
    id: 'about-contributing',
    label: 'About & contributing',
    items: [
      {
        q: 'Who created the guide?',
        a: 'I\'m <a href="https://terrybrown.me" target="_blank" rel="noopener noreferrer">Terry Brown</a>, a software engineering lead focused on creating environments where teams can thrive. I performed management very badly in my early years and built this guide and tooling to help others avoid the same mistakes. My pronouns are he/him.',
      },
      {
        q: 'How can I get in touch?',
        a: 'Reach out on <a href="https://www.linkedin.com/in/terrybrownuk" target="_blank" rel="noopener noreferrer">LinkedIn</a>. I\'d love to chat if you are considering using this guide, and I\'m always open to conversations around the topics covered here.',
      },
      {
        q: 'Can I contribute?',
        a: 'Please! I have many gaps myself and the more people who input, the better. Reach out on <a href="https://www.linkedin.com/in/terrybrownuk" target="_blank" rel="noopener noreferrer">LinkedIn</a> and let\'s chat.',
      },
    ],
  },
]
