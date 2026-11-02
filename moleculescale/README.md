# MoleculeScale — 3D molecule editor & visualizer

A single-page web app to build, edit, optimise and visualise molecules, proteins and crystals in 3D.
No install, no server, no network, no libraries: open `index.html` (or serve the folder) and start drawing.
Part of the LabScale family; it shares the look of LabScale and DNAScale (same design tokens, light and dark theme).

## Try it
- Open `index.html` → **Start drawing**, **From SMILES**, **Try the demo**, or drop a structure file on the window.
- URL shortcuts: `?demo` (crambin protein), `?sample` (caffeine), `?smiles=CCO`, `?mol=Aspirin`, `?orbital=3dz²`, `?tool=draw`.
- `⌘K` opens the command palette, `?` lists the shortcuts.
- Serve locally with `python3 -m http.server 8765` and open `http://localhost:8765/moleculescale/`.

## Tools (left rail, keys 1–7)
| Key | Tool | What it does |
|---|---|---|
| 1 | Navigate | rotate, pan, zoom; double-click an atom to centre it |
| 2 | Select | click, box select, double-click for a whole fragment; atom / residue / chain / fragment modes |
| 3 | Draw | click empty space to add an atom, drag between atoms to bond, click an atom to change its element or extend it, click a bond to cycle its order; hydrogens are adjusted automatically. Press C N O H F P S L (Cl) R (Br) I to pick the element |
| 4 | Manipulate | drag atoms or the selection, drag empty space to rotate the selection, ⇧ moves in depth; **Auto-optimise** relaxes the rest of the molecule live while you drag |
| 5 | Measure | 2 atoms → distance, 3 → angle, 4 → dihedral, drawn in the view |
| 6 | Rotate bond | drag across a bond to twist the smaller side around it (ring bonds are refused) |
| 7 | Erase | delete atoms or bonds |

In every tool: Alt-drag / Space-drag / middle-drag rotates, right-drag or ⇧-drag pans, scroll zooms.

## Display
- **Layers** (left panel): any number of layers, each with its own style, atom scope and colour scheme.
  Styles: ball & stick, sticks, wireframe, space-filling, cartoon (helix ribbons, strand arrows, coils), surface (smooth Gaussian, van der Waals, solvent-accessible), labels, orbital / density isosurfaces.
  Colour by element, chain, residue type, secondary structure, rainbow, B-factor, partial charge, uniform colour; surfaces can also be coloured by an approximate electrostatic potential.
  Scopes: all, protein, ligands, water, backbone, side chains, the live selection or a captured selection.
- Own WebGL 2 renderer with MSAA, screen-space ambient occlusion, depth outlines, depth cueing, light / dark / custom backgrounds, perspective or orthographic camera, spin, unit-cell box, orientation axes.
- Save a one-page PDF report (image plus formula, mass, SMILES), PNG at up to 4×, with transparent background if wanted, or copy the image; export a 3D model as `.obj`.
- **Structure** tab: sequence view per chain with secondary structure, hetero groups, fragments and elements, all click-to-select.

## Editing and calculation
- **Optimise geometry** (`⌘E`) with a quick force field (bonds, angles, torsions, planarity, Lennard-Jones) and a FIRE minimiser, animated. Frozen atoms stay put. Energies are in kcal/mol and approximate.
- **Auto-optimise** while manipulating; **conformer search** randomises rotatable bonds, relaxes each trial and keeps the distinct results as frames sorted by energy.
- Add / remove hydrogens, perceive bonds and bond orders from coordinates, change element or formal charge, supercells for crystals.
- **Geometry** tab: type a bond length, angle or dihedral for the selected 2–4 atoms and the far-side fragment moves.
- **Atoms** tab: spreadsheet of coordinates, element and charge, editable in place.
- **Properties**: formula, mass, rings, aromatic rings, rotatable bonds, donors / acceptors, SMILES, composition, selection statistics, Gasteiger partial charges and dipole arrow.
- Trajectory / frame player for multi-frame XYZ, PDB models, SDF series and conformer searches.

## Building molecules
- **SMILES** (aromatic, branches, rings, charges, `@`/`@@` stereo centres) → 3D by distance geometry plus force-field clean-up.
- **Peptide builder** (one-letter sequence, α-helix / β-strand / PPII / extended / coil), fullerene C60, carbon nanotubes (n, m), graphene sheets.
- Library of about 150 molecules, nine crystal structures (NaCl, diamond, graphite, rutile, …) and hydrogen-like orbitals (s, p, d, f) shown as ± isosurfaces.
- Embedded public-domain PDB entries (work offline): crambin 1CRN, ubiquitin 1UBQ, Trp-cage 1L2Y and a B-DNA dodecamer 1BNA.

## Formats
| Read | Write |
|---|---|
| XYZ (multi-frame), MOL / SDF (V2000), PDB (models, CONECT, helix / sheet records, CRYST1), CML, CIF (cell + symmetry operators), Gaussian cube, SMILES | XYZ (frames), MOL, SDF, PDB, CML, CIF, SMILES, OBJ, PNG |

Scenes (layers, camera, edits) save as `.moleculescale` JSON, and the last session is kept in local storage so you can resume it.

## Files
`index.html`, `css/style.css`, and in `js/`: `elements.js` (periodic table), `mol.js` (model and chemistry), `ff.js` (force field + minimiser), `smiles.js` (SMILES, embedding, builders), `io.js` (formats), `geom3d.js` (ribbons, fields, isosurfaces), `render.js` (WebGL), `library.js`, `legal.js`, `app.js` (state, tools), `app2.js` (menus, panels, dialogs).

## Limits
Quick force field and charge model — fine for tidy-up and illustration, not a substitute for quantum chemistry. No double-bond (E/Z) stereo from SMILES, no MOL V3000, no vibrational spectra. Very large structures (> ~20k atoms) are not auto-saved.
