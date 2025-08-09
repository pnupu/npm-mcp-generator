# Example Packages for Testing

## Category 1: New/Recently Updated Packages (High Value)

### 1. `@tanstack/react-query` v5 (Released 2023)
**Why it's perfect:**
- Major breaking changes from v4
- AI suggests old `react-query` patterns that don't work
- New hooks, error handling, and configuration patterns
- Very popular but recent changes

**Key Pain Points:**
```javascript
// AI suggests (WRONG - old v4 pattern):
import { useQuery } from 'react-query';

// Correct v5 pattern:
import { useQuery } from '@tanstack/react-query';
```

### 2. `drizzle-orm` (2023 release)
**Why it's perfect:**
- New TypeScript-first ORM
- Unique API patterns different from Prisma/TypeORM
- Growing popularity but not in AI training data
- Complex schema definitions and query patterns

### 3. `@ai-sdk/core` (Vercel AI SDK v3, 2024)
**Why it's perfect:**
- Brand new AI development toolkit
- Rapidly evolving API
- Specific patterns for streaming, tool calling
- Zero AI knowledge of current patterns

### 4. `hono` (Modern web framework, gaining popularity)
**Why it's perfect:**
- New lightweight web framework
- Different patterns from Express/Fastify
- TypeScript-first with unique middleware patterns
- Growing but not mainstream yet

## Category 2: Niche/Specialized Packages (High Value)

### 5. `@tensorflow/tfjs`
**Why it's perfect:**
- Complex ML library with specific patterns
- Domain-specific knowledge required
- AI gives generic suggestions that don't work
- Needs understanding of tensors, models, training

### 6. `three` (Three.js)
**Why it's perfect:**
- 3D graphics library with complex API
- Specific patterns for scenes, cameras, materials
- Many ways to do things wrong
- Requires understanding of 3D concepts

### 7. `@solana/web3.js`
**Why it's perfect:**
- Blockchain-specific patterns
- Complex transaction building
- Domain knowledge required
- Rapidly evolving ecosystem

### 8. `@google-cloud/firestore` or similar cloud SDKs
**Why it's perfect:**
- Cloud-specific patterns and authentication
- Complex configuration and error handling
- Service-specific best practices

## Category 3: Packages with Complex Configuration

### 9. `vite` (Build tool)
**Why it's perfect:**
- Complex configuration options
- Plugin ecosystem
- Different patterns for different frameworks
- Rapidly evolving

### 10. `tailwindcss` (Utility-first CSS)
**Why it's perfect:**
- Unique approach to styling
- Configuration-heavy
- Specific patterns and best practices
- Plugin system

## Recommended Test Packages for Hackathon

### Primary (Must Have):
1. **`@tanstack/react-query` v5** - Clear before/after demo of breaking changes
2. **`drizzle-orm`** - New package with unique patterns
3. **`@ai-sdk/core`** - Brand new, rapidly evolving

### Secondary (Nice to Have):
4. **`hono`** - Different web framework patterns
5. **`@tensorflow/tfjs`** - Complex domain-specific usage

## Why These Work Well

### Technical Advantages:
- All have TypeScript definitions (good for parsing)
- Well-structured README files
- Active GitHub repositories
- Clear API documentation

### Demo Advantages:
- Easy to show before/after AI suggestions
- Clear success criteria (does the code work?)
- Relatable to developers
- Obvious value proposition

### Implementation Advantages:
- Good documentation structure to parse
- Available via NPM registry and GitHub APIs
- TypeScript definitions provide exact API structure
- Examples available in repositories