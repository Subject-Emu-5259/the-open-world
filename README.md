# 🌍 THE OPEN WORLD

**A text-based life simulation game on Reddit**

Start as a newcomer in West Memphis, Arkansas and build your life from the ground up. Work jobs, build relationships, buy property, invest, travel, and shape your own story in this immersive simulation.

## Features

### 🏙️ **28 Cities Worldwide**
- Start in the Mid-South (Memphis, Little Rock, West Memphis, Southaven)
- Travel across the US (Nashville, Atlanta, Chicago, NYC, LA, Miami, etc.)
- Go international (London, Tokyo, Paris, Dubai, Sydney)

### 💼 **Career System**
- Apply for jobs with real pay rates
- Work shifts to earn money
- Build professional reputation
- Weather affects productivity

### 🏠 **Property & Investment**
- Buy real estate with mortgages
- Earn rental income
- Invest in stocks, bonds, crypto, businesses
- Build wealth over time

### 👥 **42 NPCs**
- Talk to residents with unique personalities
- Build relationships over time
- NPCs have schedules and locations

### 🎭 **Dynamic Events**
- Random life events
- Community festivals
- Job interviews
- Relationship milestones

### 🌡️ **Living World**
- Realistic weather system
- Time progression
- Day/night cycle affects activities

## Commands

| Category | Commands |
|----------|----------|
| **Core** | `status`, `help`, `sleep`, `study`, `gym` |
| **Work** | `apply`, `apply [job]`, `work` |
| **Travel** | `explore`, `travel [city]`, `goto [district]` |
| **Social** | `people`, `talk [name]`, `greet [name]` |
| **Property** | `real-estate`, `buy property`, `properties` |
| **Invest** | `invest`, `invest [name] [amount]`, `investments` |
| **Vehicles** | `vehicles`, `buy vehicle`, `sell vehicle` |
| **Events** | `event`, `event choice [id]` |

## Getting Started

1. **Create Character** - Choose your name and background
2. **Find Work** - Type `apply` to see job listings, then `apply [job name]`
3. **Build Skills** - Study at the library, hit the gym
4. **Explore** - Walk around your district, talk to people
5. **Grow** - Save money, buy property, travel, invest

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
