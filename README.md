# RepoMapper

RepoMapper is an advanced, AI-powered tool for visualizing, analyzing, and understanding GitHub repositories. It transforms static codebases into interactive, explorable knowledge graphs.

## Features

### 🔍 Deep Analysis
-   **Structure Scanning**: Instantly map the file system hierarchy.
-   **Dependency Tracking**: Identify internal imports and external package dependencies across multiple languages (TS/JS, Python, Go, etc.).
-   **Language Breakdown**: Visualize the technological makeup of the repository.

### 🕸️ Interactive Visualization
-   **Dependency Graph**: A powerful `dagre`-based directed graph visualization of your codebase.
    -   **Hierarchical Layout**: clear "top-to-bottom" dependency flow.
    -   **Focus Mode**: Hover over any node to highlight relevant connections and fade out noise.
    -   **Full Screen Mode**: Expand the graph to explore large codebases comfortably.
    -   **Smart Linking**: Automatically resolves relative paths (`../utils`) and aliases (`@/components`).

### 🧠 AI Integration
-   **Contextual Chat**: Chat with an AI (Gemini or Custom LLM) that understands your *entire* repository context.
-   **Code Summarization**: Click on any file to get an instant AI-generated explanation of its purpose and functionality.
-   **Custom Logic**: Connect to your own LLM endpoints (Standard OpenAI-compatible) if you prefer local models (like Ollama) or other providers.

### 📂 File Exploration
-   **Integrated Viewer**: Browse file contents directly within the app.
-   **Syntax Highlighting**: Clean, readable code display.

## Getting Started

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/yourusername/repo-mapper.git
    cd repo-mapper
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Configure AI (Optional but Recommended)**:
    -   Create a `.env.local` file.
    -   Add your Gemini API Key: `GEMINI_API_KEY=your_key_here`.
    -   *Alternatively, configure a Custom LLM URL directly in the UI settings.*

4.  **Run the application**:
    ```bash
    npm run dev
    ```

5.  **Analyze**:
    -   Open [http://localhost:3000](http://localhost:3000).
    -   Enter a GitHub URL (e.g., `https://github.com/facebook/react`) or analyze the local directory.

## Tech Stack
-   **Framework**: Next.js 14+ (App Router)
-   **Visualization**: React Flow, Dagre
-   **Styling**: CSS Modules
-   **AI**: Google Generative AI SDK
