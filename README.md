# ConDex

A private rolodex for one person. You search the way you remember someone — a name, a city, “plastics supplier” — and the matching cards stay on the desk, with each matched word softly marked. “plast” finds “plastics”.

A card holds a name, a line about who they are, a photo, tags, contact points, notes, and meetings. The first meeting is how you met. Introduced-by points at another card. An optional follow-up date can be filtered without taking over the screen.

Organization is text on the person. This version does not have projects, organization cards, or a general “these people know each other” link.

## Run it locally

You need Node.js 22. There is no login. The book is a SQLite file and a photos folder in `data/` (gitignored).

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123).

To keep the book somewhere else:

```bash
DATA_DIR=/path/to/condex-data npm run dev
```

Search is ready when the page loads. Arrow keys move through the cards, Enter opens one, and Alt+N adds a card (N does the same once you have left the search box with Escape).

## Install it on Yunohost

The package is format 2 and lives in this repo: `manifest.toml`, `scripts/`, and `conf/`. It expects Yunohost 12.1 or newer. The install builds a Next.js standalone server with Node.js 22 and runs it behind nginx.

The repo is private, so install from a checkout on the server:

```bash
sudo yunohost app install /path/to/ConDex
```

Choose a domain and a path. `/` serves ConDex at the domain root. A path such as `/condex` is picked up when the app is built, so assets and the API stay on that path.

Yunohost’s login is the only door. The whole app, including photos and the API, sits behind it. The default permission is `all_users` (people with an account on that server), not visitors, and the permission cannot be opened to visitors. If anyone else has an account, limit the ConDex permission to your user after install.

The SQLite file and photos live in the app’s data directory (usually `/home/yunohost.app/condex`), outside the install directory. An upgrade replaces the app code and leaves the book in place.

Upgrade from a newer checkout:

```bash
sudo yunohost app upgrade condex -f /path/to/ConDex
```

Backup and restore include that data directory. Removing the app without `--purge` also leaves the data directory on disk.

The install build needs about 2 GB of RAM.
