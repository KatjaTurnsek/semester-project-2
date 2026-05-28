# StudioBid — Semester Project 2

An auction platform built for Noroff Semester Project 2.

![StudioBid preview](./public/images/semester-project2-preview.jpg)

StudioBid is a fictional auction site where students can sell creative gear and bid on items posted by others. The goal was to plan, design, and build a fully functional, responsive auction platform using a modern CSS framework, the Noroff Auction API, and clean, maintainable JavaScript.

## Links

- Live demo: [StudioBid](https://KatjaTurnsek.github.io/semester-project-2/)
- GitHub repo: https://github.com/KatjaTurnsek/semester-project-2

## Project Brief Requirements

This project fulfils the core learning outcomes of Semester Project 2.

### Build an interactive auction application

- User registration and login
- Authentication handling, including token storage, logout, and protected routes
- Create, update, and delete listings
- Upload multiple images with alt text
- Place bids with validation and updated UI feedback

### Fetch and render real API data

- Noroff Auction API v2
- Active listings feed
- Single listing view
- Bid history
- User profile: credits, avatar, listings, bids, and wins

### Use a CSS framework

StudioBid is built with **Bootstrap 5** and custom **Sass** for design tokens, layout, and utility overrides.

### Follow best practices

- Module-based JavaScript
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
- Highest bid displayed on listing cards

### Create & Edit Listings

- Dynamic form with image groups
- Live card preview
- Edit mode and create mode
- Delete listing with confirmation
- Tag support

### Bidding System

- Validates bid amount
- Updates UI after bids
- Displays bid history
- Prevents users from bidding on their own listings
- Requires login before bidding

### User Profile

- Avatar and banner with alt text
- Bio field
- Credits display in mobile and desktop headers
- My Listings
- My Bids
- My Wins
- Edit profile with inline validation

### Authentication

- Register with Noroff email validation
- Login
- Logout
- Protected pages
- Success, error, and info alerts
- Input-level validation with visual states

## Portfolio 2 Improvements

For Portfolio 2, I reviewed StudioBid as a professional portfolio project and improved the user feedback system.

Before the update, some normal guidance messages were shown as red error alerts. For example, when a visitor needed to log in before placing a bid, this was shown like a system error. I changed these messages to informational alerts instead, while keeping real failures, such as invalid bids or failed API requests, as error messages.

I also adjusted the alert styling so the new info messages look consistent with the existing alert design.

**Improvement commit:** https://github.com/KatjaTurnsek/semester-project-2/commit/9e7d5a5

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

## Getting Started

Clone the repository and install dependencies:

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

The project is deployed with GitHub Pages using the configured deployment workflow.

## Configuration

Defaults to `https://v2.api.noroff.dev`. Optional `.env`:

```dotenv
VITE_API_BASE="https://v2.api.noroff.dev"
```

## API Reference

StudioBid uses the **Noroff Auction API v2**:

- [Auction listings](https://docs.noroff.dev/docs/v2/auction-house/listings)
- [Auction profiles](https://docs.noroff.dev/docs/v2/auction-house/profiles)

Endpoints used:

- `/auction/listings`
- `/auction/listings/:id`
- `/auction/profiles/:name`
- `/auction/profiles/:name/listings`
- `/auction/auth/register`
- `/auction/auth/login`
- `/auction/bids`

## Validation & UX

- Forms include inline validation
- Accessible labels and alt text
- Semantic HTML
- Loader components for slow API responses
- Success, error, and info messages displayed consistently across pages

## Accessibility & SEO

- Alt text for images
- Sufficient color contrast
- Focus-visible styles
- ARIA labels where appropriate
- Semantic header structure
- Meta descriptions on all pages
- Lazy-loaded images where useful

## Author

**Katja Turnšek**  
Front-End Development Student  
[Portfolio Website](https://katjaturnsek.github.io/portfolio/)
