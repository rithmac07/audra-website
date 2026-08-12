# Audra

Music you can feel. This is the website for **Audra**, an iOS app that turns music into a real-time visual and haptic experience for deaf and hard-of-hearing listeners.

This is a static site built with plain HTML, CSS, and JavaScript, no framework or build step required.

## Getting Started

Since this is a static site, you don't need to install any dependencies. Just open `index.html` directly in your browser, or serve it locally:

```
npx serve .
# or
python3 -m http.server 3000
```

Open http://localhost:3000 (or the port shown in your terminal) to see the result.

You can start editing the page by modifying `index.html`. Styles live in `style.css` (and `legal.css` for the Terms, Privacy, and Acknowledgements pages), and the interactive demo logic lives in `script.js`. Refresh your browser to see changes.

## Project Structure

```
index.html              main showcase page + live interactive demo
termsofservice.html      Terms of Service
privacypolicy.html       Privacy Policy
acknowledgements.html    Acknowledgements
style.css                shared design system and layout
legal.css                typography for the legal pages
script.js                hero canvas, dividers, and the live Web Audio demo
screenshots/              real app screenshots go here (coming soon)
```

## The Interactive Demo

The demo section on the homepage isn't a canned animation. Pressing play generates a short musical phrase using the Web Audio API and runs it through a real `AnalyserNode`, the same kind of FFT analysis Audra's `AudioEngine.swift` uses to process live audio on iOS. The frequency visualizer, rhythm grid, and emotion fingerprint radar are all driven by that live analysis, calculated fresh every frame.

## Adding Real Screenshots

The screenshots section currently uses placeholder frames. To swap in real app captures, add your images to the `screenshots/` folder and update the `phone-frame` blocks in `index.html` to use `<img>` tags instead of the placeholder divs.

## Learn More About Audra

Audra was built for the Kode With Klossy Mobile App Challenge using SwiftUI, AVFoundation, the Accelerate framework, and Core Haptics. Song search and previews are powered by Apple's iTunes Search API.

- [Terms of Service](termsofservice.html)
- [Privacy Policy](privacypolicy.html)
- [Acknowledgements](acknowledgements.html)

## Deploy on GitHub Pages

The easiest way to deploy this site is GitHub Pages, since it's already a static site with no build step.

1. Create a repository named `<your-username>.github.io` (this exact naming auto-publishes the repo)
2. Push all files in this folder, including the `screenshots/` folder, to the root of that repository
3. Your site will be live at `https://<your-username>.github.io` within a few minutes

If you'd rather use a regular repository name, push the files there instead and enable GitHub Pages in the repo's Settings tab. Your site will then be live at `https://<your-username>.github.io/<repo-name>`.
