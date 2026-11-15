# 🌍 THE OPEN WORLD

**A text-based life simulation game on Reddit**

Build your story from the ground up in a living, breathing world. Work jobs, build relationships, navigate the legal system, buy property, invest, travel, and shape your own destiny in this immersive global simulation.

## Features

### 🏙️ **Global Exploration**
- Explore cities across the US (NYC, LA, Chicago, Memphis, Nashville, Atlanta, etc.) and worldwide.
- Visit multiple districts per city, each with its own atmosphere and population.
- Dynamic travel system: Move between cities to find new opportunities.

### 💼 **Career & Wealth**
- Apply for jobs with real pay rates and career tiers.
- Work shifts to earn money, with productivity affected by weather.
- Buy real estate with mortgages and earn passive rental income.
- Invest in stocks, bonds, crypto, and businesses to build long-term wealth.

### 👥 **Living Social Ecosystem**
- Interact with a vast cast of NPCs with unique personalities, schedules, and roles.
- Deep relationship system: build trust, friendships, or rivalries.
- **Quest System**: Help NPCs with tasks and favors to earn rewards and reputation.
- **Living World Communication**: Receive random SMS, emails, and social media updates from NPCs based on your actions.

### ⚖️ **Crime & Consequences**
- High-stakes criminal system with realistic risks.
- **Prison System**: Face arrests, serve jail time, and navigate the path to parole.
- Legal records that impact your professional and social reputation.

### 🎭 **Dynamic Storylines**
- Random life events and community festivals.
- Milestone-based relationship events and job interviews.
- World state that evolves as you play.

### 🌡️ **Immersive Environment**
- Realistic weather system affecting gameplay.
- Full day/night and calendar progression.
- Persistent world state across sessions.

## Commands

| Category | Commands |
|----------|----------|
| **Core** | `status`, `help`, `sleep`, `study`, `gym` |
| **Work** | `apply`, `apply [job]`, `work` |
| **Travel** | `explore`, `travel [city]`, `goto [district]` |
| **Social** | `people`, `talk [name]`, `greet [name]`, `text [name] [msg]` |
| **Property** | `real-estate`, `buy property`, `properties`, `repair property` |
| **Invest** | `invest`, `invest [name] [amount]`, `investments` |
| **Legal** | `prison`, `prison work` |
| **Phone** | `phone`, `emails`, `messages`, `social` |
| **Events** | `event`, `event choice [id]` |

## Getting Started

1. **Create Character** - Choose your name and background to determine your starting stats.
2. **Find Work** - Type `apply` to see job listings, then `apply [job name]` to get hired.
3. **Build Your Life** - Study to increase intelligence, hit the gym for fitness.
4. **Explore the World** - Travel to different cities, meet NPCs, and take on quests.
5. **Ascend** - Save money, buy property, invest, and become a global powerhouse.

## Development

```bash
# Type check
npm run type-check

# Build
npm run build

# Local development
devvit playtest

# Deploy
devvit publish --public --bump minor
```

## Tech Stack

- **Platform**: [Devvit](https://developers.reddit.com/) (Reddit)
- **Language**: TypeScript
- **Runtime**: Bun + Node.js
- **UI**: React + Tailwind CSS

## License

BSD-3-Clause

---

*Built with ❤️ for the Reddit community*
