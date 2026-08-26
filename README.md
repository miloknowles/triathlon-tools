# Triathlon Tools

Free, browser-based tools for data-driven triathlon training and race planning.

**Live app:** [triathlon-tools.vercel.app](https://triathlon-tools.vercel.app/)

## Tools

### Bike Split Predictor

Estimate a bike split by applying a target power to a course elevation profile. The simulator models aerodynamic drag, rolling resistance, drivetrain loss, gravity, air density, and time spent out of the aero position.

- Choose from built-in 70.3, Ironman, and climbing routes.
- Import a GPX track or route to simulate a custom course.
- Adjust rider, bike, equipment, and weather assumptions.
- Review predicted time, speed, elevation, and power-loss charts.
- Switch between metric and imperial units.

### CdA Estimator

Estimate effective race-position CdA from a cycling FIT file. The analyzer finds straight, mostly flat windows and uses opposite-direction efforts to fit the wind that best reconciles the data.

- Inspect power and speed alongside the recorded route.
- Select a clean analysis range from the ride timeline.
- Configure mass, rolling resistance, air density, drivetrain efficiency, window length, and maximum grade.
- Review the CdA estimate, fitted wind, retained windows, outliers, and Crr sensitivity.

### Race Calculator

Plan a Sprint, Olympic, Half, Full, or custom-distance finish time from your own targets.

- Enter a split time or pace/speed for each discipline and see the paired value update live.
- Mix metric and imperial distance and pace units without losing the current target.
- Include both transitions and review a five-split race breakdown.

These results are planning and field-estimation aids, not substitutes for controlled aerodynamic testing. Their accuracy depends on the course and activity data as well as the assumptions you provide.

## Run Locally

The web app requires [Node.js 24](https://nodejs.org/) and Yarn 1.22. From the repository root:

```bash
cd app
yarn install
yarn dev
```

Open [http://localhost:3000](http://localhost:3000). The application does not require environment variables or a backend service.

GPX and FIT files are parsed locally in the browser; they are not uploaded by the application. Displaying a FIT route does request map tiles for its geographic area from OpenFreeMap.

## Development Commands

Run these commands from `app/`:

| Command | Purpose |
| --- | --- |
| `yarn dev` | Start the development server |
| `yarn test` | Run the Vitest test suite once |
| `yarn lint` | Run ESLint |
| `yarn build` | Create a production build |
| `yarn start` | Serve the production build |

The development and build scripts automatically copy the MapLibre worker into `public/maplibre/`.

## Project Structure

```text
.
├── app/                 # Next.js web application
│   ├── public/courses/  # Processed course elevation profiles
│   └── src/
│       ├── app/         # App Router pages
│       ├── components/  # Tool and UI components
│       └── lib/         # Simulation, import, and analysis logic
└── python/              # Ironman data ETL scripts and notebooks
```

The frontend uses Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn/ui, Base UI, Recharts, and MapLibre. All simulation and activity analysis runs client-side.

## Python Data Tools

The `python/` directory contains scripts for scraping and transforming Ironman race data plus exploratory notebooks. It uses Python 3.11 and Pipenv and is independent of the web app.

See [`python/README.md`](python/README.md) for the ETL workflow and API-key requirements.

## Contributing

Issues and pull requests are welcome. Before opening a pull request, run:

```bash
cd app
yarn test
yarn lint
yarn build
```
