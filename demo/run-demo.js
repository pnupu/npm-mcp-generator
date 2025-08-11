#!/usr/bin/env node

/**
 * Demo runner script
 */

import { HackathonDemo } from '../dist/demo/hackathon-demo.js';

async function main() {
  const demo = new HackathonDemo();
  await demo.runFullDemo();
}

main().catch(console.error);