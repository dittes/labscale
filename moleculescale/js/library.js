/* Built-in library: small molecules (SMILES), crystals, hydrogen-like orbitals, builders. */
(function () {
  'use strict';
  const MS = (window.MS = window.MS || {});
  const M = (cat, name, smi, note) => ({ cat, name, smi, note: note || '' });
  const molecules = [
    M('Basics', 'Water', 'O', 'H₂O'), M('Basics', 'Methane', 'C'), M('Basics', 'Ammonia', 'N'), M('Basics', 'Carbon dioxide', 'O=C=O'), M('Basics', 'Ethene', 'C=C'), M('Basics', 'Ethyne', 'C#C'), M('Basics', 'Hydrogen cyanide', 'C#N'), M('Basics', 'Formaldehyde', 'C=O'),
    M('Alcohols & acids', 'Ethanol', 'CCO'), M('Alcohols & acids', 'Isopropanol', 'CC(C)O'), M('Alcohols & acids', 'Glycerol', 'OCC(O)CO'), M('Alcohols & acids', 'Acetic acid', 'CC(=O)O'), M('Alcohols & acids', 'Citric acid', 'OC(=O)CC(O)(CC(=O)O)C(=O)O'), M('Alcohols & acids', 'Lactic acid', 'C[C@H](O)C(=O)O', 'L-lactic acid'),
    M('Rings', 'Benzene', 'c1ccccc1'), M('Rings', 'Cyclohexane', 'C1CCCCC1'), M('Rings', 'Toluene', 'Cc1ccccc1'), M('Rings', 'Phenol', 'Oc1ccccc1'), M('Rings', 'Pyridine', 'c1ccncc1'), M('Rings', 'Naphthalene', 'c1ccc2ccccc2c1'), M('Rings', 'Anthracene', 'c1ccc2cc3ccccc3cc2c1'), M('Rings', 'Adamantane', 'C1C2CC3CC1CC(C2)C3'), M('Rings', 'Cubane', 'C12C3C4C1C5C2C3C45'), M('Rings', 'Furan', 'c1ccoc1'), M('Rings', 'Thiophene', 'c1ccsc1'), M('Rings', 'Indole', 'c1ccc2[nH]ccc2c1'),
    M('Drugs & natural', 'Aspirin', 'CC(=O)Oc1ccccc1C(=O)O', 'acetylsalicylic acid'), M('Drugs & natural', 'Caffeine', 'Cn1cnc2c1c(=O)n(C)c(=O)n2C'), M('Drugs & natural', 'Paracetamol', 'CC(=O)Nc1ccc(O)cc1'), M('Drugs & natural', 'Ibuprofen', 'CC(C)Cc1ccc(cc1)C(C)C(=O)O'), M('Drugs & natural', 'Nicotine', 'CN1CCC[C@H]1c1cccnc1'), M('Drugs & natural', 'Dopamine', 'NCCc1ccc(O)c(O)c1'), M('Drugs & natural', 'Serotonin', 'NCCc1c[nH]c2ccc(O)cc12'), M('Drugs & natural', 'Vitamin C', 'OC[C@H](O)[C@H]1OC(=O)C(O)=C1O', 'ascorbic acid'), M('Drugs & natural', 'Menthol', 'CC(C)[C@@H]1CC[C@@H](C)C[C@H]1O'), M('Drugs & natural', 'Cholesterol', 'C[C@H](CCCC(C)C)[C@H]1CC[C@@H]2[C@@]1(CC[C@H]3[C@H]2CC=C4[C@@]3(CC[C@@H](C4)O)C)C'),
    M('Sugars & bases', 'β-D-Glucose', 'OC[C@H]1O[C@@H](O)[C@H](O)[C@@H](O)[C@@H]1O'), M('Sugars & bases', 'Adenine', 'Nc1ncnc2[nH]cnc12'), M('Sugars & bases', 'Guanine', 'Nc1nc2[nH]cnc2c(=O)[nH]1'), M('Sugars & bases', 'Cytosine', 'Nc1cc[nH]c(=O)n1'), M('Sugars & bases', 'Thymine', 'Cc1c[nH]c(=O)[nH]c1=O'), M('Sugars & bases', 'Urea', 'NC(N)=O'),
    M('Amino acids', 'Glycine', 'NCC(=O)O'), M('Amino acids', 'L-Alanine', 'N[C@@H](C)C(=O)O'), M('Amino acids', 'L-Tryptophan', 'N[C@@H](Cc1c[nH]c2ccccc12)C(=O)O'), M('Amino acids', 'L-Phenylalanine', 'N[C@@H](Cc1ccccc1)C(=O)O'), M('Amino acids', 'L-Cysteine', 'N[C@@H](CS)C(=O)O'),
    M('Solvents', 'Acetone', 'CC(C)=O'), M('Solvents', 'DMSO', 'CS(C)=O'), M('Solvents', 'THF', 'C1CCOC1'), M('Solvents', 'Chloroform', 'ClC(Cl)Cl'), M('Solvents', 'Acetonitrile', 'CC#N'), M('Solvents', 'DMF', 'CN(C)C=O'),
  ];
  const cats = [...new Set(molecules.map((m) => m.cat))];

  const FCC = [[0, 0, 0], [0.5, 0.5, 0], [0.5, 0, 0.5], [0, 0.5, 0.5]];
  const sh = (l, d) => l.map((p) => [(p[0] + d[0]) % 1, (p[1] + d[1]) % 1, (p[2] + d[2]) % 1]);
  const crystals = [
    { name: 'Sodium chloride', note: 'rock salt, a = 5.64 Å', cell: { a: 5.64, b: 5.64, c: 5.64, al: 90, be: 90, ga: 90 }, sites: [[11, FCC], [17, sh(FCC, [0.5, 0.5, 0.5])]] },
    { name: 'Diamond', note: 'a = 3.567 Å', cell: { a: 3.567, b: 3.567, c: 3.567, al: 90, be: 90, ga: 90 }, sites: [[6, FCC.concat(sh(FCC, [0.25, 0.25, 0.25]))]] },
    { name: 'Graphite', note: 'a = 2.464, c = 6.711 Å', cell: { a: 2.464, b: 2.464, c: 6.711, al: 90, be: 90, ga: 120 }, sites: [[6, [[0, 0, 0.25], [1 / 3, 2 / 3, 0.25], [0, 0, 0.75], [2 / 3, 1 / 3, 0.75]]]] },
    { name: 'Copper (fcc)', note: 'a = 3.615 Å', cell: { a: 3.615, b: 3.615, c: 3.615, al: 90, be: 90, ga: 90 }, sites: [[29, FCC]] },
    { name: 'Iron (bcc)', note: 'a = 2.866 Å', cell: { a: 2.866, b: 2.866, c: 2.866, al: 90, be: 90, ga: 90 }, sites: [[26, [[0, 0, 0], [0.5, 0.5, 0.5]]]] },
    { name: 'Caesium chloride', note: 'a = 4.12 Å', cell: { a: 4.12, b: 4.12, c: 4.12, al: 90, be: 90, ga: 90 }, sites: [[55, [[0, 0, 0]]], [17, [[0.5, 0.5, 0.5]]]] },
    { name: 'Zinc blende (ZnS)', note: 'a = 5.41 Å', cell: { a: 5.41, b: 5.41, c: 5.41, al: 90, be: 90, ga: 90 }, sites: [[30, FCC], [16, sh(FCC, [0.25, 0.25, 0.25])]] },
    { name: 'Fluorite (CaF₂)', note: 'a = 5.46 Å', cell: { a: 5.46, b: 5.46, c: 5.46, al: 90, be: 90, ga: 90 }, sites: [[20, FCC], [9, [[0.25, 0.25, 0.25], [0.75, 0.75, 0.25], [0.75, 0.25, 0.75], [0.25, 0.75, 0.75], [0.75, 0.25, 0.25], [0.25, 0.75, 0.25], [0.25, 0.25, 0.75], [0.75, 0.75, 0.75]]]] },
    { name: 'Rutile (TiO₂)', note: 'a = 4.594, c = 2.959 Å', cell: { a: 4.594, b: 4.594, c: 2.959, al: 90, be: 90, ga: 90 }, sites: [[22, [[0, 0, 0], [0.5, 0.5, 0.5]]], [8, [[0.305, 0.305, 0], [0.695, 0.695, 0], [0.805, 0.195, 0.5], [0.195, 0.805, 0.5]]]] },
  ];
  function buildCrystal(c, n) {
    n = n || [1, 1, 1];
    const cell = Object.assign({}, c.cell), Mx = MS.cellMatrix(cell), m = new MS.Mol();
    const seen = [];
    for (let i = 0; i < n[0]; i++) for (let j = 0; j < n[1]; j++) for (let k = 0; k < n[2]; k++) {
      c.sites.forEach(([z, list]) => list.forEach((f) => {
        const p = [f[0] + i, f[1] + j, f[2] + k];
        m.addAtom(z, p[0] * Mx[0][0] + p[1] * Mx[1][0] + p[2] * Mx[2][0], p[0] * Mx[0][1] + p[1] * Mx[1][1] + p[2] * Mx[2][1], p[0] * Mx[0][2] + p[1] * Mx[1][2] + p[2] * Mx[2][2]);
      }));
    }
    cell.a *= n[0]; cell.b *= n[1]; cell.c *= n[2]; m.cell = cell; m.title = c.name + (n[0] * n[1] * n[2] > 1 ? ' ' + n.join('×') : '');
    MS.chem.perceiveBonds(m, { tol: c.name === 'Graphite' ? 0.2 : 0.25 }); MS.chem.perceiveOrders(m); m.meta.crystal = true;
    return m;
  }
  const orbitals = [
    { name: '1s', n: 1, l: 0, m: 0 }, { name: '2s', n: 2, l: 0, m: 0 }, { name: '2pz', n: 2, l: 1, m: 0 }, { name: '2px', n: 2, l: 1, m: 1 }, { name: '3s', n: 3, l: 0, m: 0 }, { name: '3pz', n: 3, l: 1, m: 0 },
    { name: '3dz²', n: 3, l: 2, m: 0 }, { name: '3dxz', n: 3, l: 2, m: 1 }, { name: '3dx²−y²', n: 3, l: 2, m: 3 }, { name: '3dxy', n: 3, l: 2, m: 4 }, { name: '4fz³', n: 4, l: 3, m: 0 }, { name: '4fxyz', n: 4, l: 3, m: 4 },
  ];
  function buildOrbital(o) {
    const m = new MS.Mol(); m.addAtom(1, 0, 0, 0); m.title = 'Hydrogen-like orbital ' + o.name;
    m.vol = MS.g3.orbitalVolume(o.n, o.l, o.m, 1); m.meta.orbital = true; return m;
  }
  MS.LIB = { molecules, cats, crystals, buildCrystal, orbitals, buildOrbital };
})();
