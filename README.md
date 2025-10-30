# Factory Bay 🏭

**Branded Clothing at Stock Prices**

A modern e-commerce platform built with Next.js, TypeScript, Neo4j, and Tailwind CSS. Factory Bay offers premium branded clothing at wholesale prices with intelligent recommendations and personalized shopping experiences.

---

## 🎯 Project Vision

Factory Bay disrupts traditional retail by offering customers direct access to branded clothing at stock/wholesale prices. The platform leverages graph database technology (Neo4j) to provide smart recommendations based on user preferences, measurements, and shopping behavior.

---

## ✨ Key Features

### Current (v0.1)
- ✅ Modern, responsive UI with mobile-first design
- ✅ User authentication (signup/login)
- ✅ Beautiful design system with custom color palette
- ✅ Next.js 15 with App Router
- ✅ TypeScript for type safety
- ✅ Tailwind CSS for styling

### Planned
- 🔄 Product catalog with advanced filtering
- 📦 Shopping cart with real-time updates
- 🛒 Simple order placement system
- 👔 User measurements for size recommendations
- 🎯 Intelligent recommendation engine
- 🔐 Admin panel for inventory management
- 📊 Customer tracking and analytics
- ⚡ Micro-interactions and smooth animations

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Neo4j database (Docker recommended)
- npm or yarn

### Installation

1. **Clone and install dependencies:**
   ```bash
   cd /home/bawa/work/TheFactoryBay
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Neo4j credentials
   ```

3. **Start Neo4j (via Docker):**
   ```bash
   docker run --name factory-bay-neo4j \
     -p 7474:7474 -p 7687:7687 \
     -e NEO4J_AUTH=neo4j/factorybay123 \
     neo4j:latest
   ```

4. **Initialize database:**
   ```bash
   npm run db:init
   ```

5. **Start development server:**
   ```bash
   npm run dev
   ```

6. **Open http://localhost:3000** 🎉

---

## 📚 Documentation

- **[SPECIFICATION.md](./SPECIFICATION.md)** - Complete technical specification
- **[STYLE_GUIDE.md](./STYLE_GUIDE.md)** - Design system and component specs
- **[SETUP.md](./SETUP.md)** - Detailed setup instructions
- **[PROGRESS.md](./PROGRESS.md)** - Development progress tracker
- **[IMAGE_RESOURCES.md](./IMAGE_RESOURCES.md)** - Image sourcing and management

---

## 🛠 Tech Stack

### Frontend
- **Framework:** Next.js 15.1.4 (App Router)
- **Language:** TypeScript 5.7
- **Styling:** Tailwind CSS 3.4
- **Animations:** Framer Motion 11.15
- **Icons:** Lucide React

### Backend
- **Database:** Neo4j 5.26 (Graph Database)
- **API:** Next.js Server Actions
- **Auth:** JWT + bcrypt
- **File Storage:** Local (with migration path to cloud)

### Development
- **Package Manager:** npm
- **Linting:** ESLint
- **Testing:** Playwright MCP
- **TypeScript Execution:** tsx

---

## 📁 Project Structure

```
factory-bay/
├── src/
│   ├── app/                  # Next.js pages
│   │   ├── page.tsx         # Homepage
│   │   ├── login/           # Login page
│   │   ├── signup/          # Signup page
│   │   ├── shop/            # Product catalog
│   │   ├── admin/           # Admin panel
│   │   └── actions/         # Server actions
│   ├── components/          # React components
│   │   └── ui/              # Reusable UI components
│   └── lib/                 # Utilities & core logic
│       ├── db.ts            # Neo4j driver
│       ├── auth.ts          # Authentication
│       ├── types.ts         # TypeScript types
│       └── repositories/    # Database operations
├── scripts/                 # Database scripts
├── public/                  # Static assets
├── .env.local              # Environment variables
└── package.json            # Dependencies
```

---

## 🎨 Design System

### Color Palette
- **Primary:** Navy Blue (#2d6394)
- **Accent:** Gold (#e5c158) - for "stock price" highlights
- **CTA:** Coral (#ff6b6b) - for call-to-action buttons
- **Neutral:** Gray scale

### Typography
- **Font:** Inter
- **Scale:** Responsive with mobile-first approach

### Components
- Buttons (Primary, Secondary, Ghost)
- Inputs with validation
- Cards with hover effects
- Modals and dialogs
- Loading states
- Micro-interactions

See [STYLE_GUIDE.md](./STYLE_GUIDE.md) for complete specifications.

---

## 🗄 Database Schema

Factory Bay uses **Neo4j**, a graph database, to model complex relationships:

- **Nodes:** User, Product, ProductVariant, Order, Cart, Preferences, Measurements
- **Relationships:** Purchases, Views, Recommendations, Inventory

This enables powerful features like:
- "Users who bought this also bought..."
- Size recommendations based on measurements
- Personalized product suggestions
- Shopping pattern analysis

---

## 🔐 Authentication

- Email/password authentication
- JWT tokens stored in httpOnly cookies
- Role-based access (Customer, Admin)
- Password strength validation
- Secure session management

---

## 📱 Mobile-First Design

Factory Bay is built mobile-first with these breakpoints:
- Mobile: < 640px (1 column)
- Tablet: 640px - 1024px (2 columns)
- Desktop: > 1024px (4 columns)

---

## 🧪 Testing

We use Playwright MCP for end-to-end testing:
- Visual regression testing
- User flow testing
- Cross-browser compatibility
- Accessibility testing

---

## 🚧 Development Roadmap

### Phase 1: Foundation ✅
- [x] Project setup
- [x] Design system
- [x] Authentication
- [x] Database schema

### Phase 2: Core Features 🔄
- [ ] Product catalog
- [ ] Shopping cart
- [ ] Order placement
- [ ] Admin panel

### Phase 3: Personalization
- [ ] User measurements
- [ ] Preferences
- [ ] Recommendation engine

### Phase 4: Polish
- [ ] Animations
- [ ] Micro-interactions
- [ ] Performance optimization
- [ ] Accessibility improvements

See [PROGRESS.md](./PROGRESS.md) for detailed status.

---

## 📦 NPM Scripts

```bash
npm run dev          # Start development server
npm run build        # Create production build
npm run start        # Start production server
npm run lint         # Run ESLint
npm run db:init      # Initialize database schema
npm run db:seed      # Seed with sample data
npm run db:clear     # Clear all database data
```

---

## 🌐 Environment Variables

```env
# Neo4j Database
NEO4J_URI=neo4j://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-password

# Authentication
JWT_SECRET=your-secret-key

# Application
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 🤝 Contributing

This is currently a solo development project, but contributions are welcome! Please ensure:
- Code follows TypeScript best practices
- Components match the design system
- All tests pass
- Documentation is updated

---

## 📄 License

Private project - All rights reserved.

---

## 🎯 Key Differentiators

1. **Stock Prices:** Direct access to wholesale pricing
2. **Graph Database:** Sophisticated relationship modeling for better recommendations
3. **Measurements:** Size recommendations based on actual measurements
4. **Modern Stack:** Latest Next.js, React, and TypeScript
5. **Mobile-First:** Optimized for mobile shopping experience
6. **Spec-Driven:** Comprehensive documentation and planning

---

## 📞 Support

For setup issues, see [SETUP.md](./SETUP.md) or check:
- Neo4j connection troubleshooting
- Environment variable configuration
- Port conflicts resolution

---

## 🏗 Built With

- ❤️ Love for clean code
- ☕ Lots of coffee
- 🎨 Attention to design details
- 📐 Spec-driven development
- 🧪 Test-driven iteration

---

**Factory Bay** - Where premium meets affordable.
