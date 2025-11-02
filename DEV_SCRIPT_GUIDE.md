# Development Environment Script Guide

This guide explains how to use the `dev.sh` script to manage your Factory Bay development environment.

## Overview

The `dev.sh` script is a comprehensive tool that manages all services required for Factory Bay development:

- **Neo4j** - Graph database (Docker container)
- **MinIO** - Object storage (Docker container)
- **Next.js** - Development server

## Prerequisites

- Docker installed and running
- Node.js and npm installed
- All dependencies installed (`npm install`)

## Commands

### Start All Services

```bash
./dev.sh start
```

This command will:
1. Start Neo4j and MinIO Docker containers
2. Wait for Neo4j to be ready
3. Start the Next.js development server in the background
4. Display URLs for all services

### Stop All Services

```bash
./dev.sh stop
```

This command will:
1. Stop the Next.js development server gracefully
2. Stop Neo4j and MinIO containers
3. Clean up log and PID files

### Restart All Services

```bash
./dev.sh restart
```

Stops and then starts all services. Useful after configuration changes.

### Check Status

```bash
./dev.sh status
```

Shows the current status of:
- Docker daemon
- Neo4j and MinIO containers
- Next.js development server
- All service ports (7474, 7687, 9000, 9001, 3000)

### View Logs

```bash
# View Next.js logs
./dev.sh logs nextjs

# View Neo4j logs
./dev.sh logs neo4j

# View MinIO logs
./dev.sh logs minio
```

Follows the log output for the specified service (use Ctrl+C to exit).

### Show Help

```bash
./dev.sh help
```

Displays usage information and examples.

## Service URLs

After starting services, you can access:

| Service | URL | Credentials |
|---------|-----|-------------|
| Next.js App | http://localhost:3000 | - |
| Neo4j Browser | http://localhost:7474 | neo4j / factorybay123 |
| Neo4j Bolt | bolt://localhost:7687 | neo4j / factorybay123 |
| MinIO API | http://localhost:9000 | factorybay / factorybay123 |
| MinIO Console | http://localhost:9001 | factorybay / factorybay123 |

## Files Created

The script creates the following files (already added to `.gitignore`):

- `.dev-server.pid` - Process ID of the Next.js server
- `.dev-server.log` - Output from the Next.js development server

## Troubleshooting

### Docker Not Running

If you see "Docker is not running", start Docker Desktop or the Docker daemon:

```bash
# On Linux with systemd
sudo systemctl start docker

# On macOS/Windows - start Docker Desktop
```

### Port Already in Use

If a port is already in use:

```bash
# Check what's using the port
lsof -i :3000  # or 7687, 7474, 9000, 9001

# Stop the conflicting process or use the stop command
./dev.sh stop
```

### Next.js Server Won't Start

Check the logs for errors:

```bash
cat .dev-server.log
```

Or check for stale processes:

```bash
pkill -f "next dev"
./dev.sh start
```

### Neo4j Container Issues

If Neo4j fails to start:

```bash
# Check container logs
docker logs factory-bay-neo4j

# Restart the container
docker restart factory-bay-neo4j

# Or remove and recreate
docker rm factory-bay-neo4j
./dev.sh start
```

## Manual Operations

If you need to run services manually:

### Start Docker Containers Only

```bash
docker compose up -d
```

### Start Next.js Only

```bash
npm run dev
```

### Stop Docker Containers Only

```bash
docker compose stop
```

## Tips

1. **Daily Workflow**: Use `./dev.sh start` at the beginning of your work session and `./dev.sh stop` when you're done.

2. **Quick Check**: Use `./dev.sh status` to verify all services are running before starting development.

3. **Debug Issues**: Use `./dev.sh logs <service>` to troubleshoot problems with specific services.

4. **After Config Changes**: Use `./dev.sh restart` after modifying `.env.local` or Docker configuration.

## Integration with IDE

You can add the script to your IDE's tasks or run configurations:

### VS Code (tasks.json)

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Start Dev Environment",
      "type": "shell",
      "command": "./dev.sh start"
    },
    {
      "label": "Stop Dev Environment",
      "type": "shell",
      "command": "./dev.sh stop"
    },
    {
      "label": "Dev Status",
      "type": "shell",
      "command": "./dev.sh status"
    }
  ]
}
```

## Script Behavior

- The script uses colored output for better readability
- It performs health checks and waits for services to be ready
- Graceful shutdown is attempted before force-killing processes
- Exit codes are used for error handling (non-zero on failure)
