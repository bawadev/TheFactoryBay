# Factory Bay - Dokploy Deployment Guide

This guide provides step-by-step instructions for deploying Factory Bay to Dokploy.

## 🎯 Prerequisites

Before you begin, ensure you have:

- ✅ Dokploy server access
- ✅ GitHub repository access
- ✅ Neo4j and MinIO services configured in Dokploy (or ready to configure)

## 📋 Deployment Checklist

### Phase 1: Infrastructure Setup

#### 1.1 Deploy Neo4j Database

If not already deployed, create a Neo4j service in Dokploy:

1. **Create New Service** → Database → Neo4j
2. **Configuration:**
   - Name: `factory-bay-neo4j`
   - Version: `5.26` (or latest 5.x)
   - Username: `neo4j`
   - Password: `[SECURE_PASSWORD]` (save this!)
   - Exposed Ports:
     - `7687` (Bolt protocol - for app connection)
     - `7474` (Browser UI - optional, for debugging)

3. **Resource Limits:**
   - Memory: At least 512MB (1GB recommended)
   - CPU: 0.5 cores minimum

4. **Persistence:**
   - Ensure volumes are configured for `/data` directory
   - This preserves your database across restarts

#### 1.2 Deploy MinIO Object Storage

If not already deployed, create a MinIO service:

1. **Create New Service** → Application → MinIO
2. **Configuration:**
   - Name: `factory-bay-minio`
   - Access Key: `factorybay` (or your custom key)
   - Secret Key: `[SECURE_PASSWORD]` (save this!)
   - Exposed Ports:
     - `9000` (API - REQUIRED for images)
     - `9001` (Console - optional, for management)

3. **Resource Limits:**
   - Memory: At least 256MB
   - CPU: 0.5 cores minimum

4. **Persistence:**
   - Ensure volumes are configured for `/data` directory

### Phase 2: Application Deployment

#### 2.1 Create New Application in Dokploy

1. Go to Dokploy Dashboard → **Create New Project** (if needed)
2. Create **New Application**
3. **Source Configuration:**
   - Type: `GitHub`
   - Repository: `bawaDev/TheFactoryBay` (or your fork)
   - Branch: `master`
   - Build Type: `nixpacks` (auto-detected for Next.js)

#### 2.2 Configure Environment Variables

In the application settings, add these environment variables:

```env
# Neo4j Database (use internal service name)
NEO4J_URI=neo4j://factory-bay-neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=[YOUR_NEO4J_PASSWORD]

# JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET=[YOUR_SECURE_JWT_SECRET]

# MinIO Storage (internal service name)
MINIO_ENDPOINT=factory-bay-minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=factorybay
MINIO_SECRET_KEY=[YOUR_MINIO_SECRET_KEY]
MINIO_BUCKET_NAME=product-images
MINIO_USE_SSL=false

# Public URLs (use your domain or server IP)
NEXT_PUBLIC_MINIO_URL=http://YOUR_SERVER_IP:9000
NEXT_PUBLIC_APP_URL=http://YOUR_SERVER_IP:3000

# Application
NODE_ENV=production
```

**Important Notes:**
- Replace `[YOUR_NEO4J_PASSWORD]` with your Neo4j password
- Replace `[YOUR_SECURE_JWT_SECRET]` with a strong random string
- Replace `[YOUR_MINIO_SECRET_KEY]` with your MinIO secret
- Update IP addresses if using a custom domain

#### 2.3 Configure Build Settings

Dokploy should auto-detect Next.js, but verify:

- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`
- **Port:** `3000`

#### 2.4 Configure Port Mapping

Expose the application:

- **Container Port:** `3000`
- **Public Port:** `3000` (or your preferred port)

### Phase 3: Database Initialization

After the first successful deployment, initialize the database:

#### 3.1 SSH into Your Dokploy Server

```bash
ssh root@YOUR_SERVER_IP
```

#### 3.2 Find Your Application Container

```bash
# List all running containers
docker ps

# Find your Factory Bay container (look for the image name)
# It will be something like: dokploy-factory-bay-xxx
```

#### 3.3 Run Initialization Script

```bash
# Execute initialization script inside the container
docker exec -it [CONTAINER_NAME] /bin/bash

# Inside the container:
./deploy-init.sh

# Or run commands manually:
npm run db:init
npm run db:seed
npm run setup:categories
npm run minio:init
```

#### 3.4 Alternative: Run from Dokploy Console

If Dokploy provides a console/terminal for your app:

1. Open your application in Dokploy
2. Go to **Console** or **Terminal**
3. Run: `./deploy-init.sh`

### Phase 4: Verify Deployment

#### 4.1 Check Application Health

Visit your application: `http://YOUR_SERVER_IP:3000`

You should see the Factory Bay homepage.

#### 4.2 Test Login

Try logging in with the default admin account:

- Email: `testadmin@factorybay.com`
- Password: `Admin123!`

#### 4.3 Verify Services

**Neo4j Browser** (if port 7474 is exposed):
- URL: `http://YOUR_SERVER_IP:7474`
- Login: `neo4j` / `[YOUR_PASSWORD]`
- Run: `MATCH (n) RETURN count(n)` (should show nodes)

**MinIO Console** (if port 9001 is exposed):
- URL: `http://YOUR_SERVER_IP:9001`
- Login: Your MinIO access key / secret key
- Check: `product-images` bucket exists

#### 4.4 Test Image Upload

1. Login as admin
2. Go to Products → Add Product
3. Upload an image
4. Verify the image displays correctly

### Phase 5: Post-Deployment Security

#### 5.1 Change Default Passwords

**IMPORTANT:** Change all default passwords immediately!

1. Login as `testadmin@factorybay.com`
2. Go to Profile → Change Password
3. Update to a strong password

Or create a new admin account and delete the default one.

#### 5.2 Secure Environment Variables

- Ensure `JWT_SECRET` is a strong random value
- Verify Neo4j and MinIO passwords are secure
- Review all environment variables

#### 5.3 Configure Domain (Optional)

If using a custom domain:

1. Point your domain to your server IP
2. Update environment variables:
   - `NEXT_PUBLIC_APP_URL=https://yourdomain.com`
   - `NEXT_PUBLIC_MINIO_URL=https://storage.yourdomain.com`
3. Configure SSL/TLS in Dokploy
4. Redeploy the application

## 🔄 Updating the Application

When you push new code to GitHub:

1. Dokploy will automatically detect changes (if auto-deploy is enabled)
2. Or manually trigger a deployment in Dokploy dashboard
3. The application will rebuild and restart
4. Database and MinIO data are preserved

## 🐛 Troubleshooting

### Application Won't Start

**Check logs in Dokploy:**
- Application logs
- Build logs
- Container logs

**Common issues:**
- Missing environment variables
- Neo4j not accessible
- Port conflicts

### Database Connection Errors

**Verify Neo4j service:**
```bash
docker ps | grep neo4j
docker logs factory-bay-neo4j
```

**Test connection:**
```bash
docker exec -it [APP_CONTAINER] npm run db:init
```

### Image Upload Fails

**Verify MinIO:**
```bash
docker ps | grep minio
docker logs factory-bay-minio
```

**Check bucket:**
```bash
docker exec -it [APP_CONTAINER] npm run minio:init
```

### Application Shows 502/503 Error

**Check if app is running:**
```bash
docker ps | grep factory-bay
docker logs [CONTAINER_NAME]
```

**Verify port mapping in Dokploy:**
- Container port: 3000
- Public port: 3000

## 📚 Useful Commands

### View Application Logs
```bash
# In Dokploy: Click on your app → Logs

# Or via SSH:
docker logs -f [CONTAINER_NAME]
```

### Restart Application
```bash
# In Dokploy: Click on your app → Restart

# Or via SSH:
docker restart [CONTAINER_NAME]
```

### Backup Database
```bash
# SSH into server
ssh root@YOUR_SERVER_IP

# Backup Neo4j
docker run --rm \
  --volumes-from factory-bay-neo4j \
  -v $(pwd)/backups:/backup \
  ubuntu tar czf /backup/neo4j-backup-$(date +%Y%m%d).tar.gz /data

# Backup MinIO
docker run --rm \
  --volumes-from factory-bay-minio \
  -v $(pwd)/backups:/backup \
  ubuntu tar czf /backup/minio-backup-$(date +%Y%m%d).tar.gz /data
```

### Access Application Shell
```bash
docker exec -it [CONTAINER_NAME] /bin/bash
```

## 🔐 Credentials Reference

### Server Access
- **IP:** [Your server IP]
- **SSH User:** root
- **SSH Password:** [Stored securely - not in git]

### Dokploy Dashboard
- **URL:** [Your Dokploy URL]
- **Username:** [Your Dokploy email]
- **Password:** [Stored securely - not in git]

### GitHub
- **Username:** [Your GitHub username]
- **PAT:** [Stored securely - not in git]

### Default Application Accounts (After Seeding)
- **Admin:** testadmin@factorybay.com / Admin123!
- **Customer:** test@example.com / Customer123!

**⚠️ SECURITY WARNING:** Change these credentials in production!

## 📞 Support

For issues:
1. Check Dokploy application logs
2. Review this guide's troubleshooting section
3. Check Docker container logs
4. Verify environment variables
5. Ensure Neo4j and MinIO services are running

## ✅ Deployment Success Checklist

- [ ] Neo4j service running and accessible
- [ ] MinIO service running and accessible
- [ ] Application deployed and running
- [ ] Environment variables configured correctly
- [ ] Database initialized (`db:init`)
- [ ] Test users seeded (`db:seed`)
- [ ] Categories setup (`setup:categories`)
- [ ] MinIO bucket created (`minio:init`)
- [ ] Can access homepage
- [ ] Can login with admin account
- [ ] Can upload product images
- [ ] Default passwords changed
- [ ] Backups configured (optional)
- [ ] Domain configured (optional)

---

**Factory Bay** - Deployed with Dokploy 🚀
