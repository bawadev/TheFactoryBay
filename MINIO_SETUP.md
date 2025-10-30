# MinIO File Storage Setup Guide

This guide explains how Factory Bay uses MinIO for local file storage, enabling admins to upload product images directly from their devices instead of using external URLs.

## Table of Contents
- [Overview](#overview)
- [Architecture](#architecture)
- [Setup Instructions](#setup-instructions)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Troubleshooting](#troubleshooting)

---

## Overview

**MinIO** is a high-performance, S3-compatible object storage system. Factory Bay uses MinIO to:
- Store product images uploaded by admins
- Serve images with public URLs
- Provide a self-hosted alternative to cloud storage services like AWS S3 or Cloudinary
- Enable easy migration to cloud storage in the future (S3-compatible API)

### Key Features
✅ **Local Storage** - Images stored on your server, no external dependencies
✅ **S3 Compatible** - Easy migration to AWS S3, DigitalOcean Spaces, etc.
✅ **Web Console** - User-friendly interface for managing files
✅ **Public URLs** - Direct image access via HTTP
✅ **Multi-file Upload** - Batch upload support
✅ **Type Validation** - JPEG, PNG, WebP support
✅ **Size Limits** - 5MB per file, 10 files per batch

---

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                      Factory Bay Application                 │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Admin Panel → ImageUpload Component → Upload Action         │
│                          ↓                     ↓              │
│                    File Selection       MinIO Client          │
│                          ↓                     ↓              │
│                    Preview Files        Upload to MinIO       │
│                          ↓                     ↓              │
│                    Click Upload         Return Public URL     │
│                          ↓                     ↓              │
│                    Store in Neo4j ← ← ← ← ← ← ┘              │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                              ↓
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      MinIO Server                            │
│                   (Docker Container)                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  API Port: 9000       Console Port: 9001                     │
│  Bucket: product-images                                      │
│  Policy: Public Read                                         │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### File Flow

1. **Admin** selects images from device
2. **ImageUpload Component** shows preview
3. **Admin** clicks "Upload"
4. **Upload Action** (Server Action) validates files:
   - Admin authentication check
   - File type validation (JPEG, PNG, WebP)
   - File size validation (max 5MB)
5. **MinIO Client** uploads to MinIO server
6. **MinIO** generates unique filename with timestamp
7. **Public URL** returned (e.g., `http://localhost:9000/product-images/1730234567890-shirt.jpg`)
8. **URL saved** to Neo4j ProductVariant node
9. **Images displayed** on product pages

---

## Setup Instructions

### 1. Start MinIO with Docker

MinIO runs in a Docker container alongside Neo4j. The configuration is in `docker-compose.yml`:

```bash
# Start all services (Neo4j + MinIO)
docker compose up -d

# Or start only MinIO
docker start factory-bay-minio
```

**Container Details:**
- **Name:** factory-bay-minio
- **Image:** minio/minio:latest
- **API Port:** 9000 (for uploads/downloads)
- **Console Port:** 9001 (web interface)
- **Volume:** minio_data (persists files)

### 2. Environment Configuration

MinIO credentials are configured in `.env.local`:

```env
# MinIO Object Storage Configuration
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=factorybay
MINIO_SECRET_KEY=factorybay123
MINIO_BUCKET_NAME=product-images
NEXT_PUBLIC_MINIO_URL=http://localhost:9000
```

**Important:** `NEXT_PUBLIC_MINIO_URL` must be accessible from the browser for image display.

### 3. Initialize MinIO Bucket

Run the initialization script to create the bucket and set permissions:

```bash
npm run minio:init
```

This script:
- Tests MinIO connection
- Creates the `product-images` bucket
- Sets bucket policy to **public read** (allows public image access)
- Displays MinIO Console URL and credentials

**Output:**
```
🚀 Factory Bay - MinIO Initialization

Testing MinIO connection...
✅ Connected to MinIO successfully!
   Found 0 existing bucket(s)

Initializing product images bucket...
✅ MinIO bucket 'product-images' created
✅ MinIO bucket 'product-images' policy set to public read

✅ MinIO initialization complete!

📊 MinIO Console: http://localhost:9001
   Username: factorybay
   Password: factorybay123
```

### 4. Verify Setup

1. **Access MinIO Console:**
   ```
   http://localhost:9001
   Username: factorybay
   Password: factorybay123
   ```

2. **Check Bucket:**
   - Navigate to "Buckets" in the sidebar
   - You should see `product-images` bucket
   - Click on it to view uploaded files

3. **Test Upload:**
   - Go to admin panel: `http://localhost:3000/en/admin/products/new`
   - Scroll to variant images section
   - Upload a test image
   - Check MinIO Console to verify the file

---

## Usage

### For Admins: Uploading Product Images

#### 1. Navigate to Product Form
- **New Product:** `/en/admin/products/new`
- **Edit Product:** `/en/admin/products/[id]/edit`

#### 2. Add Product Variants
Each variant (size/color combination) can have up to 5 images.

#### 3. Upload Images

**Step 1:** Click the upload area
![Upload Area]

**Step 2:** Select images from your device
- Supported formats: JPEG, PNG, WebP
- Max size: 5MB per file
- Max files: 5 per variant

**Step 3:** Preview selected images
![Preview]

**Step 4:** Click "Upload X Image(s)"
![Upload Button]

**Step 5:** Wait for upload to complete
- Progress indicator shown
- Images appear in uploaded section
- Public URLs stored automatically

#### 4. Managing Images

- **Remove Image:** Click the X button on any uploaded image
- **Add More:** Click upload area again (if under 5 images)
- **Change Images:** Remove old ones, upload new ones

#### 5. Save Product
Click "Create Product" or "Update Product" to save the form with image URLs.

---

## API Reference

### Server Actions

#### `uploadImage(formData: FormData)`
Upload a single image file.

**Input:**
```typescript
const formData = new FormData()
formData.append('file', fileObject)
```

**Response:**
```typescript
{
  success: boolean
  message?: string
  url?: string  // e.g., "http://localhost:9000/product-images/1730234567890-shirt.jpg"
}
```

**Validation:**
- Admin authentication required
- File type: JPEG, PNG, or WebP
- Max size: 5MB

---

#### `uploadMultipleImages(formData: FormData)`
Upload multiple image files (batch).

**Input:**
```typescript
const formData = new FormData()
files.forEach(file => formData.append('files', file))
```

**Response:**
```typescript
{
  success: boolean
  message?: string
  urls?: string[]  // Array of uploaded image URLs
}
```

**Validation:**
- Admin authentication required
- Max files: 10
- File type: JPEG, PNG, or WebP
- Max size: 5MB per file

---

#### `deleteImage(fileUrl: string)`
Delete an image from MinIO.

**Input:**
```typescript
await deleteImage('http://localhost:9000/product-images/1730234567890-shirt.jpg')
```

**Response:**
```typescript
{
  success: boolean
  message?: string
}
```

---

### MinIO Client Utilities

Located in `src/lib/minio.ts`:

#### `uploadFile(buffer: Buffer, fileName: string, contentType: string)`
Core upload function. Generates unique filename with timestamp.

#### `uploadMultipleFiles(files: Array<{buffer, fileName, contentType}>)`
Batch upload utility.

#### `deleteFile(fileUrl: string)`
Delete a file by URL.

#### `listFiles(prefix?: string)`
List all files in the bucket (optional prefix filter).

#### `getFileStats(fileName: string)`
Get metadata for a file.

---

## React Components

### ImageUpload Component

Located in `src/components/ui/ImageUpload.tsx`

**Props:**
```typescript
interface ImageUploadProps {
  multiple?: boolean           // Allow multiple files (default: false)
  maxFiles?: number           // Max files limit (default: 5)
  onUploadComplete: (urls: string[]) => void  // Callback with uploaded URLs
  initialImages?: string[]    // Pre-populated images
  label?: string              // Custom label
}
```

**Usage:**
```tsx
<ImageUpload
  multiple={true}
  maxFiles={5}
  initialImages={variant.images}
  onUploadComplete={(urls) => handleVariantImagesUpdate(index, urls)}
  label="Product Images"
/>
```

**Features:**
- Drag-and-drop support (via file input)
- Image preview before upload
- Progress indication
- Error handling
- Remove uploaded images
- Responsive design

---

## File Storage Details

### File Naming Convention
```
timestamp-originalfilename.ext
```

**Example:**
```
Original: shirt-blue.jpg
Stored as: 1730234567890-shirt-blue.jpg
```

This prevents filename conflicts and maintains chronological order.

### Public URLs
```
http://localhost:9000/{bucket-name}/{filename}
```

**Example:**
```
http://localhost:9000/product-images/1730234567890-shirt-blue.jpg
```

### Bucket Policy
The bucket is set to **public read** access:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {"AWS": ["*"]},
      "Action": ["s3:GetObject"],
      "Resource": ["arn:aws:s3:::product-images/*"]
    }
  ]
}
```

This allows:
✅ Anyone can **read/download** images (public access)
❌ Only authenticated admins can **upload** images
❌ Only authenticated admins can **delete** images

---

## Troubleshooting

### MinIO Container Not Starting

**Symptoms:** Docker container exits immediately or fails healthcheck

**Solutions:**
```bash
# Check container logs
docker logs factory-bay-minio

# Check if port is available
lsof -i :9000
lsof -i :9001

# Restart container
docker restart factory-bay-minio

# Recreate container
docker compose down
docker compose up -d
```

---

### Cannot Connect to MinIO

**Symptoms:** "Connection refused" or timeout errors

**Check:**
1. MinIO container is running:
   ```bash
   docker ps | grep minio
   ```

2. Environment variables are correct:
   ```bash
   cat .env.local | grep MINIO
   ```

3. Port 9000 is accessible:
   ```bash
   curl http://localhost:9000/minio/health/live
   ```

4. Firewall settings (if using remote MinIO)

---

### Bucket Not Found

**Symptoms:** "Bucket does not exist" error

**Solution:**
```bash
# Run initialization script
npm run minio:init
```

This creates the bucket and sets permissions.

---

### Upload Fails with 403 Forbidden

**Causes:**
1. **Authentication issue** - Not logged in as admin
2. **Bucket policy issue** - Run `npm run minio:init`
3. **MinIO credentials mismatch** - Check `.env.local`

**Solution:**
```bash
# Verify admin access
# Login as admin@factorybay.com

# Reinitialize bucket
npm run minio:init

# Check credentials match docker-compose.yml
```

---

### Images Not Displaying

**Symptoms:** Broken image links on product pages

**Causes:**
1. **Wrong MinIO URL** - Check `NEXT_PUBLIC_MINIO_URL`
2. **Bucket not public** - Run `npm run minio:init`
3. **File deleted** - Check MinIO Console

**Solution:**
1. Verify URL in browser:
   ```
   http://localhost:9000/product-images/{filename}
   ```

2. Check browser console for errors

3. Verify bucket policy is public read

---

### Upload Slow or Timing Out

**Causes:**
- Large files (>5MB)
- Network issues
- MinIO container resource limits

**Solutions:**
```bash
# Check file size before upload
# Optimize images (compress, resize)

# Check MinIO container resources
docker stats factory-bay-minio

# Increase timeout in upload action (if needed)
```

---

## Production Considerations

### Security

For production deployments:

1. **Use HTTPS:**
   ```env
   MINIO_USE_SSL=true
   NEXT_PUBLIC_MINIO_URL=https://minio.yourdomain.com
   ```

2. **Strong Credentials:**
   ```env
   MINIO_ACCESS_KEY=your-secure-access-key
   MINIO_SECRET_KEY=your-very-secure-secret-key-at-least-32-chars
   ```

3. **Private Network:**
   - Don't expose MinIO API (port 9000) publicly
   - Use nginx reverse proxy or CDN

4. **CORS Configuration:**
   ```typescript
   // Configure CORS if accessing from different domain
   ```

### Scalability

1. **Volume Backups:**
   ```bash
   # Backup MinIO data
   docker run --rm -v thefactorybay_minio_data:/data -v $(pwd):/backup \
     alpine tar czf /backup/minio-backup.tar.gz /data
   ```

2. **Cloud Migration:**
   MinIO is S3-compatible, making migration easy:
   - AWS S3
   - DigitalOcean Spaces
   - Cloudflare R2
   - Backblaze B2

3. **CDN Integration:**
   - Point CDN to MinIO bucket
   - Cache images globally
   - Reduce server load

### Monitoring

1. **MinIO Console:**
   ```
   http://localhost:9001
   ```
   - Monitor storage usage
   - View access logs
   - Check performance metrics

2. **Docker Logs:**
   ```bash
   docker logs -f factory-bay-minio
   ```

3. **Health Check:**
   ```bash
   curl http://localhost:9000/minio/health/live
   ```

---

## Migration from URL-based Images

If you have existing products with external image URLs:

### Option 1: Keep Existing URLs
MinIO coexists with external URLs. No migration needed.

### Option 2: Migrate to MinIO

**Script to download and re-upload images:**
```typescript
// scripts/migrate-images.ts
import { uploadFile } from '../src/lib/minio'
import fetch from 'node-fetch'

async function migrateImage(url: string): Promise<string> {
  // Download image
  const response = await fetch(url)
  const buffer = Buffer.from(await response.arrayBuffer())

  // Upload to MinIO
  const fileName = url.split('/').pop() || 'image.jpg'
  const contentType = response.headers.get('content-type') || 'image/jpeg'

  return await uploadFile(buffer, fileName, contentType)
}

// Use in product update logic
```

---

## Additional Resources

- [MinIO Official Documentation](https://min.io/docs/minio/linux/index.html)
- [MinIO JavaScript Client](https://min.io/docs/minio/linux/developers/javascript/minio-javascript.html)
- [Docker Compose Documentation](https://docs.docker.com/compose/)

---

## Quick Reference

### Common Commands
```bash
# Start MinIO
docker start factory-bay-minio

# Stop MinIO
docker stop factory-bay-minio

# View logs
docker logs factory-bay-minio

# Initialize bucket
npm run minio:init

# Access console
open http://localhost:9001

# Check status
docker ps | grep minio
```

### Important URLs
- **MinIO Console:** http://localhost:9001
- **MinIO API:** http://localhost:9000
- **Admin Panel:** http://localhost:3000/en/admin
- **Product Form:** http://localhost:3000/en/admin/products/new

### Default Credentials
- **Username:** factorybay
- **Password:** factorybay123

---

## Summary

MinIO provides Factory Bay with a robust, self-hosted file storage solution that:
- ✅ Eliminates dependency on external image hosting services
- ✅ Gives admins an easy upload interface
- ✅ Provides S3-compatible API for future cloud migration
- ✅ Stores files locally with public HTTP access
- ✅ Supports batch uploads and file management
- ✅ Integrates seamlessly with the admin panel

For any issues or questions, refer to the Troubleshooting section or check the MinIO Console logs.
