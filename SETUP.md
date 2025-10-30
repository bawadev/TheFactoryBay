# Factory Bay - Setup Guide

## Prerequisites

### 1. Node.js
- Version: 18.x or higher
- Download: https://nodejs.org/

### 2. Neo4j Database
Factory Bay uses Neo4j as its graph database for managing relationships between users, products, orders, and recommendations.

#### Option A: Docker (Recommended for Development)
```bash
docker run \
  --name factory-bay-neo4j \
  -p 7474:7474 -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/factorybay123 \
  -v $HOME/neo4j/data:/data \
  neo4j:latest
```

Access Neo4j Browser at: http://localhost:7474
- Username: `neo4j`
- Password: `factorybay123`

#### Option B: Local Installation
1. Download Neo4j Desktop from: https://neo4j.com/download/
2. Create a new database with:
   - Username: `neo4j`
   - Password: `factorybay123` (or update `.env.local`)
3. Start the database

#### Option C: Neo4j AuraDB (Cloud)
1. Sign up at: https://neo4j.com/cloud/aura/
2. Create a free instance
3. Update `.env.local` with your AuraDB credentials

## Installation

### 1. Clone and Install Dependencies
```bash
cd /home/bawa/work/TheFactoryBay
npm install
```

### 2. Environment Configuration
Copy the example environment file and update with your settings:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your Neo4j credentials:
```env
NEO4J_URI=neo4j://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=factorybay123
JWT_SECRET=your-secret-key-here
```

### 3. Initialize Database
Run the database initialization script to create constraints and indexes:
```bash
npm run db:init
```

This will:
- Test the Neo4j connection
- Create unique constraints for emails, IDs, SKUs, etc.
- Create indexes for better query performance
- Display database statistics

### 4. Seed Database (Optional)
Populate the database with sample data for development:
```bash
npm run db:seed
```

This will create:
- Sample admin and customer accounts
- Demo products with variants
- Sample orders
- User preferences and measurements

## Running the Application

### Development Mode
```bash
npm run dev
```

The application will be available at: http://localhost:3000

### Production Build
```bash
npm run build
npm start
```

## Database Management

### View Database
Access Neo4j Browser at http://localhost:7474 and run queries:

```cypher
// View all users
MATCH (u:User) RETURN u

// View all products
MATCH (p:Product) RETURN p

// View product catalog with variants
MATCH (p:Product)-[:VARIANT_OF]-(v:ProductVariant)
RETURN p, v

// View orders
MATCH (u:User)-[:PLACED_ORDER]->(o:Order)
RETURN u, o
```

### Clear Database
To remove all data (useful for testing):
```bash
npm run db:clear
```

**WARNING**: This will delete all data in your Neo4j database!

### Database Statistics
```bash
npm run db:init
```

Shows node counts for each label (User, Product, Order, etc.)

## Default Accounts (After Seeding)

### Admin Account
- Email: `admin@factorybay.com`
- Password: `Admin123!`

### Customer Account
- Email: `customer@factorybay.com`
- Password: `Customer123!`

## Project Structure

```
factory-bay/
├── src/
│   ├── app/              # Next.js app router pages
│   ├── components/       # React components
│   ├── lib/             # Utilities and database
│   └── styles/          # Global styles
├── public/
│   └── images/          # Static images
├── scripts/             # Database scripts
├── .env.local          # Environment variables (not in git)
├── package.json        # Dependencies
└── SPECIFICATION.md    # Full technical spec
```

## Troubleshooting

### Neo4j Connection Failed
1. Ensure Neo4j is running: `docker ps` or check Neo4j Desktop
2. Verify credentials in `.env.local`
3. Check if ports 7474 and 7687 are available
4. Test connection: `npm run db:init`

### Port 3000 Already in Use
```bash
# Find process using port 3000
lsof -ti:3000

# Kill the process
kill -9 $(lsof -ti:3000)

# Or use a different port
PORT=3001 npm run dev
```

### Module Not Found Errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Next.js Build Errors
```bash
# Clear Next.js cache
rm -rf .next
npm run build
```

## Development Workflow

1. Start Neo4j database
2. Initialize/seed database (first time only)
3. Start development server: `npm run dev`
4. Make changes to code
5. Test in browser at http://localhost:3000
6. Run tests with Playwright MCP

## Next Steps

- [ ] Set up authentication system
- [ ] Build product catalog
- [ ] Implement shopping cart
- [ ] Create admin panel
- [ ] Add recommendation engine

See `SPECIFICATION.md` for detailed feature requirements.

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Neo4j Documentation](https://neo4j.com/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Framer Motion](https://www.framer.com/motion/)
