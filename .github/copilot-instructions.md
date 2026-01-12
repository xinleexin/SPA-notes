# SPA Notes Application

## Overview
This is a single-page application (SPA) for managing markdown notes with import/export functionality. The application runs entirely in the browser using HTML, CSS, and JavaScript with no backend services.
* focus on coding instead of chatting or explain too much how to do it, or what to do
* the dev environement is on windows, so use powershell equialent command for file operations instead of `sed` command from linux
* generate high quality code with comments for other AI/Human to read
* add logging to help debug and using **always** use TDD apporach to make sure unit/function working fine. For issue, retry **3** times for different options. if still not working, stop and give recommendations for human
* for testing, simulate brower, and use dedicated test.html file to including test cases for the javascript functions 

## Key Features
- Create, edit, and manage markdown notes
- Import notes from JSON files
- Export notes to JSON files
- File System Access API support for modern browsers
- Local storage persistence
- Version history tracking

## Architecture
The application follows a client-side SPA architecture with:
- Single HTML file with embedded CSS and JavaScript
- Uses localStorage for data persistence
- No external dependencies beyond marked.js for markdown rendering
- Responsive layout using flexbox

## File Structure
- `notes.html`: Main application file containing HTML, CSS, and JavaScript
- `test.html`: Unit tests for core functionality
- `import-export-test.html`: Additional tests for import/export functionality

## Data Flow
1. Notes are stored in `localStorage` as JSON objects
2. The `notes` global variable holds all current notes in memory
3. Import operations parse JSON files and replace the current notes
4. Export operations serialize notes to JSON and trigger download or File System Access API

## Key Patterns
- **Event-driven architecture**: All UI interactions are handled through event listeners
- **State management**: Uses global variables to track application state
- **File handling**: Supports both traditional download approach and modern File System Access API
- **Error handling**: Graceful fallbacks when APIs are not available

## Developer Workflow
- Open `notes.html` directly in a browser to run the application
- Tests are in `test.html` and `import-export-test.html`
- No build process required - pure client-side JavaScript

## Browser Compatibility
- Uses modern JavaScript features with fallbacks
- File System Access API detection with graceful degradation
- Works in all modern browsers with localStorage support

## Import/Export Implementation
- Import: Uses FileReader API to read JSON files
- Export: Uses either File System Access API (when available) or traditional download approach
- When notes are imported from a file, the original filename is tracked for direct export back to that file