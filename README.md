# JC LED Wall Planner v1.1.0

Static browser-based LED wall layout, power, data and cable planning tool.

## Included
- Quick rectangular wall builder and manual panel placement
- 500×500 and 1000×500 generic P2/P3/P5 profiles
- Front / back view
- Wall size, area, resolution, pixel count and weight
- Suggested and manual data routes
- Suggested and manual power routes
- Required data ports and circuit counts
- CAT and power home-run/linker counts + spares
- Processor canvas helper
- AV Planner equipment catalogue snapshot embedded locally
- Custom LED panel and processor profiles
- Undo / redo
- Local save/load + JSON import/export
- CSV BOM, PNG drawing export, browser Print/PDF
- Presentation mode

## Important
The included panel power/weight/link limits are generic planning defaults. For a real production, replace them with the exact Absen/manufacturer cabinet datasheet values you actually use.

## GitHub Pages
Upload all files in this folder to the root of a GitHub Pages repository. No build step is required.


## v1.1 changes
- Long LED cabinets are portrait-only: 500 × 1000 mm (1 m vertical). No landscape/rotate mode.
- Separate **Suggest Data** and **Suggest Power** actions.
- Data and Power overlays can be shown/hidden independently, including both at once.
- Suggested routing follows a left/right serpentine (snake) pattern across the wall.
- Direction arrows are drawn on routes; power is dashed so simultaneous overlays remain readable.
- Toolbar/UI simplified for faster show-site use.
