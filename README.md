# SERENA - XLR Website

**SERENA** is the official website for the personal oracle app, providing clarity, answers, and guidance through intuitive prompts and personalized insights. This project is built with [Astro 5](https://astro.build/) and [Tailwind CSS](https://tailwindcss.com/), focusing on high performance, smooth animations, and a unique visual experience.

## 🚀 Key Features

- **Immersive UI**: Custom cursor implementation and fluid scroll animations.
- **3D Integration**: Utilizes `@splinetool/runtime` for interactive 3D elements.
- **Section-Based Architecture**: Modular design with dedicated components for each section of the landing page.
  - **Header/Nav**: Navigation and branding.
  - **Hero Section**: Engaging entry point (`LandingPage`).
  - **Main Showcase**: Sticky scroll effects and core visuals (`MainPage`, `Starfield`).
  - **Features**: "How it works" breakdown with sticky cards (`FeaturePage`).
  - **Visual Experience**: "Moon" thematic section (`MoonPage`).
  - **Pricing/CTA**: Registration and pricing tier presentation (`PricePage`).
- **Performance**: Optimized builds using Astro's static generation and Tailwind's utility-first CSS.
- **Code Quality**: Enforced via ESLint, Prettier, and strict TypeScript checks.

## 🛠 Tech Stack

- **Framework**: [Astro 5.x](https://astro.build/)
- **Styling**: [Tailwind CSS v3](https://tailwindcss.com/) + `tailwindcss-animate`
- **Language**: TypeScript / JavaScript (ESM)
- **3D/Graphics**: `@splinetool/runtime`
- **Linting & Formatting**: ESLint, Prettier

## 📂 Project Structure

```text
/
├── public/                 # Static assets (fonts, icons, robots.txt)
├── src/
│   ├── assets/             # Bundled assets (images, icons)
│   ├── components/
│   │   ├── common/         # Shared utilities (Scroll animations, scripts)
│   │   ├── widgets/        # Specialized sub-components for each page section
│   │   │   ├── featurepage/# Cards and sticky layout components
│   │   │   ├── landingpage/# Hero section components
│   │   │   ├── mainpage/   # Starfield and mover components
│   │   │   ├── moonpage/   # Moon visualization components
│   │   │   └── pricepage/  # Pricing cards
│   │   ├── *.astro         # Main section components (LandingPage, MainPage, etc.)
│   ├── layouts/            # Base layouts (HTML shell, metadata)
│   ├── pages/              # Astro routes (index.astro is the main entry)
│   ├── styles/             # Global and component-specific CSS
│   └── utils/              # Helper functions
├── astro.config.mjs        # Astro configuration
├── tailwind.config.js      # Tailwind configuration
└── package.json            # Dependencies and scripts
```

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command           | Action                                                     |
| :---------------- | :--------------------------------------------------------- |
| `npm install`     | Installs dependencies                                      |
| `npm run dev`     | Starts local dev server at `localhost:4321`                |
| `npm run build`   | Build your production site to `./dist/`                    |
| `npm run preview` | Preview your build locally, before deploying               |
| `npm run check`   | Run comprehensive checks (Astro check + ESLint + Prettier) |
| `npm run fix`     | Auto-fix ESLint errors and format code with Prettier       |

## ✅ TODOs

- [ ] **Image Optimization**: Finalize generic image handling for various device sizes (see `src/utils/images-optimization.ts`).
- [ ] **Color Mode**: Stabilize color mode toggle logic (currently temporary in `ApplyColorMode.astro`).
- [ ] **Testing**: Add unit or E2E tests for critical interactions (sticky scrolling, registration flow).
- [ ] **SEO**: Verify meta tags and OpenGraph data for social sharing.
- [ ] **Accessibility**: Ensure custom cursor and 3D elements do not hinder accessibility references.

## 📄 License

This project is private and proprietary.
