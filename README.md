# StudioBid, Semester Project 2

A concept auction platform for Noroff Front-End Development

![StudioBid preview](./images/semester-project2-preview.jpg)

StudioBid is a fictional auction site where students can sell creative gear and bid on items posted by others. The goal of this project was to plan, design and build a fully functional, responsive auction platform using a modern CSS framework, the Noroff Auction API, and clean, maintainable JavaScript.

## Project Brief Requirements

This project fulfils the core learning outcomes of Semester Project 2:

### Build an interactive auction application

- User registration & login
- Authentication handling (token storage, logout, protected routes)
- Create, update & delete listings
- Upload multiple images + alt text
- Place bids (with validation and real-time updates)

### Fetch and render real API data

- Noroff Auction API v2
- Active listings feed
- Single listing view
- Bid history
- User profile: credits, avatar, listings, bids, wins

### Use a CSS framework

StudioBid is fully built with **Bootstrap 5 and custom Sass** (design tokens, layout, utility overrides).

### Follow best practices

- Clean module-based JavaScript
- Error handling and loaders
- Form validation
- Accessible components
- Mobile-first responsive layout
- GitHub project workflow

## Features Overview

### Browse Listings

- Search and sort
- Responsive card grid
- Live “Ends in…” countdown
- NEW / ENDED / WON badges
- Highest bid displayed on-card

### Create & Edit Listings

- Dynamic form with image groups
- Live card preview
- Edit mode vs create mode
- Delete listing with confirmation
- Tag support

### Bidding System

- Validates bid amount
- Updates UI instantly
- Displays bid history
- Prevents users from bidding on their own listings
- Requires login

### User Profile

- Avatar and banner (with alt text)
- Bio field
- Credits display (mobile and desktop headers)
- My Listings
- My Bids
- My Wins
- Edit profile with inline validation

### Authentication

- Register (Noroff email validation)
- Login
- Logout
- Protected pages
- Success/error alerts
- Input-level validation (green/red states)

## Structure (simplified)

```text
studio-bid/
├─ public/
│  └─ images/
├─ src/
│  ├─ scss/
│  └─ js/
│     ├─ api/ (authApi.js, listingsApi.js, profilesApi.js)
│     ├─ ui/ (header.js, loader.js, alerts.js)
│     ├─ utils/ (dom.js, storage.js, validation.js)
│     └─ pages/
│        index.js  listing.js  listingEdit.js
│        login.js  register.js  profile.js
├─ index.html  listing.html  listing-edit.html
├─ login.html  register.html  profile.html  how.html
├─ vite.config.js
└─ package.json
```

## Getting Started (Local)

```bash
git clone https://github.com/KatjaTurnsek/semester-project-2.git
cd semester-project-2
npm install
npm run dev
```

## Build & Deploy

```bash
npm run build
```

Then commit & push your changes to main. GitHub Pages will serve the built site from your configured build output.

## ⚙️ Configuration

Defaults to https://v2.api.noroff.dev. Optional .env:

```dotenv
VITE_API_BASE="https://v2.api.noroff.dev"
```

## API Reference

StudioBid uses the **Noroff Auction API v2**:

- [https://docs.noroff.dev/docs/v2/auction-house/listings](https://docs.noroff.dev/docs/v2/auction-house/listings)
- [https://docs.noroff.dev/docs/v2/auction-house/profiles](https://docs.noroff.dev/docs/v2/auction-house/profiles)

**Endpoints used:**

- /auction/listings
- /auction/listings/:id
- /auction/profiles/:name
- /auction/profiles/:name/listings
- /auction/auth/register
- /auction/auth/login
- /auction/bids

## Validation & UX

- All forms include inline validation (red/green states)
- Accessible labels and alt texts
- Semantic HTML
- Loader components for slow API responses
- Error messages displayed consistently across pages

## Accessibility & SEO

- Alt text required for all images
- Sufficient color contrast
- Focus-visible styles
- ARIA labels where appropriate
- Semantic header structure
- Meta descriptions on all pages
- Lazy-loaded images where useful

## Live Demo

[StudioBid](https://KatjaTurnsek.github.io/semester-project-2/)

## Author

** Katja Turnšek **
Frontend Development Student
[Portfolio Website](https://katjaturnsek.github.io/portfolio/)
