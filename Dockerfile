FROM oven/bun:alpine AS builder
WORKDIR /app

# Copy package files
COPY ./package.json ./bun.lock ./
RUN bun install --frozen-lockfile

# Copy source code and static files
COPY ./src ./src
COPY ./static ./static
COPY ./tsconfig.json ./tsup.config.ts ./

# Build the application
RUN bun run build

FROM oven/bun:alpine AS runner
WORKDIR /app

# Install production dependencies
COPY ./package.json ./bun.lock ./
RUN bun install --frozen-lockfile --production --ignore-scripts --no-cache

# Copy built application
COPY --from=builder /app/dist ./dist

# Copy static files for web interface
COPY --from=builder /app/static ./static

# Create data directory for accounts storage
RUN mkdir -p /app/data

# Expose default port
EXPOSE 4141

# Set environment variables
ENV NODE_ENV=production
ENV DATA_DIR=/app/data

# Use multi-account mode (no legacy auth parameters)
CMD ["bun", "run", "dist/main.js", "start", "--port", "4141", "--vision"]
