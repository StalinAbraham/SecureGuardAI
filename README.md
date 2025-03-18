# 🔒 SecureGuardAI

A **React + TypeScript + Vite** application that helps users analyze website safety using **Google's Gemini AI**. It detects potentially malicious URLs by checking domain structure, HTTPS status, and AI-powered risk assessments.

## 🚀 Features

- **AI-Powered Analysis**: Uses Google's Gemini AI to analyze URLs.
- **User API Key Integration**: Users enter their own Gemini API key, which is stored locally in their browser.
- **URL Risk Score**: Calculates a safety score (0-100) based on various security factors.
- **Website Briefing**: Provides a brief description of the website before visiting.
- **History Tracking**: Stores previously checked URLs for easy access.
- **API Key Management**: Users can remove or update their API key via a popup.
- **Real-time Warnings**: Flags phishing attempts, suspicious domains, and risky TLDs.
- **Beautiful UI**: Built with Tailwind CSS and React.

## 📁 Project Structure

Here's how the files are structured in the project:

```
SecureGuardAI/
│── src/                   
│   ├── App.tsx             # Main app component
│   ├── HistoryPage.tsx     # URL history page component
│   ├── index.css           # Tailwind CSS styles and animations
│   ├── main.tsx            # Entry point for React
│   ├── vite-env.d.ts       # TypeScript declaration for Vite
│── .gitignore              # Files to ignore in Git
│── eslint.config.js        # ESLint configuration
│── index.html              # HTML entry point
│── package.json            # Project dependencies and scripts
│── package-lock.json       # Lock file for dependencies
│── postcss.config.js       # PostCSS configuration
│── tailwind.config.js      # Tailwind CSS configuration
│── tsconfig.app.json       # TypeScript configuration for app
│── tsconfig.json           # Main TypeScript configuration
│── tsconfig.node.json      # TypeScript configuration for Node.js
│── vite.config.ts          # Vite configuration
│── README.md               # Project documentation
```

## 📥 Installation

1. **Clone the Repository**

   ```bash
   git clone https://github.com/StalinAbraham/SecureGuardAI.git
   cd SecureGuardAI
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Start the Development Server**

   ```bash
   npm run dev
   ```

   This will start a local development server at `http://localhost:5173`.

## 🔑 Setting Up Google Gemini API

To use AI-powered analysis, users must provide their own API key from **Google AI Studio**:

1. Go to [Google AI Studio](https://ai.google.dev/).
2. Sign in and generate an API key.
3. Enter your API key when prompted by the application.
4. The API key is stored **locally in the browser** for future use.

## 🛠️ Usage

1. **Enter a URL** in the input field and click **"Check URL"**.
2. The application uses **Gemini AI** to analyze the website and determines if it's safe.
3. A **brief description of the website** is provided before visiting.
4. The **history tab** stores previously checked URLs for quick access.
5. Users can manage their **API key** via a popup, allowing them to remove or update it anytime.

## 📌 Explanation of Key Files

- **`App.tsx`** - The main application component, handling URL safety checks and UI.
- **`HistoryPage.tsx`** - Displays previously checked URLs and their safety scores.
- **`main.tsx`** - Renders the root component and mounts the React app.
- **`index.css`** - Tailwind CSS styles and animations.
- **`vite.config.ts`** - Configuration for Vite, optimizing the project.
- **`package.json`** - Defines project dependencies and scripts.
- **`tailwind.config.js`** - Configures Tailwind CSS.
- **`tsconfig.json`** - TypeScript configuration.
- **`tsconfig.app.json`** - TypeScript configuration for the app.
- **`tsconfig.node.json`** - TypeScript configuration for Node.js.
- **`eslint.config.js`** - Configuration for ESLint.
- **`postcss.config.js`** - Configures PostCSS.
- **`.gitignore`** - Lists files to exclude from Git.

## 🤝 Contributing

Feel free to contribute by submitting **pull requests** or **reporting issues**.

## 📜 License

This project is open-source under the **MIT License**.

---
💡 **Need help?** Open an issue on GitHub! 🚀

