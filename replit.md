# Multi-IA Screen Analyzer

## Overview
A web application that captures your screen and gets simultaneous analysis from multiple AI services (Claude, Gemini, Grok). Users can configure their own API keys and add custom AI endpoints.

## Project Structure
- `server.js` - Express server that serves static files and provides API proxy for Claude/Anthropic
- `index.html` - Main frontend with all HTML, CSS, and JavaScript inline
- `package.json` - Node.js dependencies (express, node-fetch)

## Running the App
- The app runs on port 5000 using Express
- Command: `npm start` (runs `node server.js`)
- The server binds to `0.0.0.0:5000` for Replit compatibility

## Configuration
The app uses environment variables for API keys:
- `ANTHROPIC_API_KEY` - Required for Claude proxy functionality

## Features
- Screen capture and analysis
- Multiple AI providers (Claude, Gemini, Grok)
- Custom AI endpoint support
- Light/Dark theme toggle
- Results export
- API keys stored in browser localStorage

## Deployment
Configured for autoscale deployment with `node server.js` as the run command.
