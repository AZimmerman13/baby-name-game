# 🥚 Stork Pool

**The fun way to create baby name, gender, and birthday guessing pools!**

Stork Pool is a free web app for creating baby prediction pools, perfect for baby showers, office betting pools, and family name contests. Participants can submit up to 6 guesses, and our smart scoring algorithm (using Levenshtein distance, Jaro-Winkler similarity, and Metaphone phonetic matching) determines who guessed closest to the actual baby name.

## Features

- 🎯 **Smart Scoring** - Multiple algorithms find the closest match
- 🔒 **Hidden Guesses** - All predictions stay secret until reveal
- 🏆 **Leaderboards** - See who won the baby pool
- 📱 **No Sign-up Required** - Just create and share a link
- 🎨 **Multiple Guesses** - Up to 6 name predictions per person
- 🚀 **Free Forever** - Unlimited pools and participants

## Tech Stack

- **Backend:** Python FastAPI with SQLite
- **Frontend:** React with TypeScript
- **Deployment:** Docker with nginx reverse proxy
- **SSL:** Let's Encrypt automatic certificates

## Quick Start

See `local/QUICKSTART.md` for local development setup.

## Deployment

Visit [storkpool.com](https://storkpool.com) or deploy your own instance using the guides in the `local/` directory.

## Keywords

Baby name pool, baby shower game, baby betting pool, baby guessing game, gender reveal pool, baby birthday pool, baby name contest, baby predictions, pregnancy pool, office baby pool
