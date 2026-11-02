/* Periodic table data: symbol, name, mass, covalent radius, van der Waals radius, colour, electronegativity. */
(function () {
  'use strict';
  const MS = (window.MS = window.MS || {});
  const SYM = 'H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og'.split(' ');
  const NAME = 'Hydrogen,Helium,Lithium,Beryllium,Boron,Carbon,Nitrogen,Oxygen,Fluorine,Neon,Sodium,Magnesium,Aluminium,Silicon,Phosphorus,Sulfur,Chlorine,Argon,Potassium,Calcium,Scandium,Titanium,Vanadium,Chromium,Manganese,Iron,Cobalt,Nickel,Copper,Zinc,Gallium,Germanium,Arsenic,Selenium,Bromine,Krypton,Rubidium,Strontium,Yttrium,Zirconium,Niobium,Molybdenum,Technetium,Ruthenium,Rhodium,Palladium,Silver,Cadmium,Indium,Tin,Antimony,Tellurium,Iodine,Xenon,Caesium,Barium,Lanthanum,Cerium,Praseodymium,Neodymium,Promethium,Samarium,Europium,Gadolinium,Terbium,Dysprosium,Holmium,Erbium,Thulium,Ytterbium,Lutetium,Hafnium,Tantalum,Tungsten,Rhenium,Osmium,Iridium,Platinum,Gold,Mercury,Thallium,Lead,Bismuth,Polonium,Astatine,Radon,Francium,Radium,Actinium,Thorium,Protactinium,Uranium,Neptunium,Plutonium,Americium,Curium,Berkelium,Californium,Einsteinium,Fermium,Mendelevium,Nobelium,Lawrencium,Rutherfordium,Dubnium,Seaborgium,Bohrium,Hassium,Meitnerium,Darmstadtium,Roentgenium,Copernicium,Nihonium,Flerovium,Moscovium,Livermorium,Tennessine,Oganesson'.split(',');
  const MASS = [1.008, 4.0026, 6.94, 9.0122, 10.81, 12.011, 14.007, 15.999, 18.998, 20.18, 22.99, 24.305, 26.982, 28.085, 30.974, 32.06, 35.45, 39.948, 39.098, 40.078, 44.956, 47.867, 50.942, 51.996, 54.938, 55.845, 58.933, 58.693, 63.546, 65.38, 69.723, 72.63, 74.922, 78.971, 79.904, 83.798, 85.468, 87.62, 88.906, 91.224, 92.906, 95.95, 98, 101.07, 102.91, 106.42, 107.87, 112.41, 114.82, 118.71, 121.76, 127.6, 126.9, 131.29, 132.91, 137.33, 138.91, 140.12, 140.91, 144.24, 145, 150.36, 151.96, 157.25, 158.93, 162.5, 164.93, 167.26, 168.93, 173.05, 174.97, 178.49, 180.95, 183.84, 186.21, 190.23, 192.22, 195.08, 196.97, 200.59, 204.38, 207.2, 208.98, 209, 210, 222, 223, 226, 227, 232.04, 231.04, 238.03, 237, 244, 243, 247, 247, 251, 252, 257, 258, 259, 266, 267, 268, 269, 270, 277, 278, 281, 282, 285, 286, 289, 290, 293, 294, 294];
  const COV = [0.31, 0.28, 1.28, 0.96, 0.84, 0.76, 0.71, 0.66, 0.57, 0.58, 1.66, 1.41, 1.21, 1.11, 1.07, 1.05, 1.02, 1.06, 2.03, 1.76, 1.7, 1.6, 1.53, 1.39, 1.39, 1.32, 1.26, 1.24, 1.32, 1.22, 1.22, 1.2, 1.19, 1.2, 1.2, 1.16, 2.2, 1.95, 1.9, 1.75, 1.64, 1.54, 1.47, 1.46, 1.42, 1.39, 1.45, 1.44, 1.42, 1.39, 1.39, 1.38, 1.39, 1.4, 2.44, 2.15, 2.07, 2.04, 2.03, 2.01, 1.99, 1.98, 1.98, 1.96, 1.94, 1.92, 1.92, 1.89, 1.9, 1.87, 1.87, 1.75, 1.7, 1.62, 1.51, 1.44, 1.41, 1.36, 1.36, 1.32, 1.45, 1.46, 1.48, 1.4, 1.5, 1.5, 2.6, 2.21, 2.15, 2.06, 2, 1.96, 1.9, 1.87, 1.8, 1.69];
  const VDW = { 1: 1.2, 2: 1.4, 3: 1.82, 4: 1.53, 5: 1.92, 6: 1.7, 7: 1.55, 8: 1.52, 9: 1.47, 10: 1.54, 11: 2.27, 12: 1.73, 13: 1.84, 14: 2.1, 15: 1.8, 16: 1.8, 17: 1.75, 18: 1.88, 19: 2.75, 20: 2.31, 30: 1.39, 31: 1.87, 32: 2.11, 33: 1.85, 34: 1.9, 35: 1.85, 36: 2.02, 37: 3.03, 38: 2.49, 47: 1.72, 48: 1.58, 49: 1.93, 50: 2.17, 51: 2.06, 52: 2.06, 53: 1.98, 54: 2.16, 55: 3.43, 56: 2.68, 78: 1.75, 79: 1.66, 80: 1.55, 81: 1.96, 82: 2.02, 83: 2.07 };
  const COL = { 1: 'ffffff', 2: 'd9ffff', 3: 'cc80ff', 4: 'c2ff00', 5: 'ffb5b5', 6: '909090', 7: '3050f8', 8: 'ff0d0d', 9: '90e050', 10: 'b3e3f5', 11: 'ab5cf2', 12: '8aff00', 13: 'bfa6a6', 14: 'f0c8a0', 15: 'ff8000', 16: 'ffff30', 17: '1ff01f', 18: '80d1e3', 19: '8f40d4', 20: '3dff00', 21: 'e6e6e6', 22: 'bfc2c7', 23: 'a6a6ab', 24: '8a99c7', 25: '9c7ac7', 26: 'e06633', 27: 'f090a0', 28: '50d050', 29: 'c88033', 30: '7d80b0', 31: 'c28f8f', 32: '668f8f', 33: 'bd80e3', 34: 'ffa100', 35: 'a62929', 36: '5cb8d1', 37: '702eb0', 38: '00ff00', 39: '94ffff', 40: '94e0e0', 41: '73c2c9', 42: '54b5b5', 43: '3b9e9e', 44: '248f8f', 45: '0a7d8c', 46: '006985', 47: 'c0c0c0', 48: 'ffd98f', 49: 'a67573', 50: '668080', 51: '9e63b5', 52: 'd47a00', 53: '940094', 54: '429eb0', 55: '57178f', 56: '00c900', 57: '70d4ff', 72: '4dc2ff', 73: '4da6ff', 74: '2194d6', 75: '267dab', 76: '266696', 77: '175487', 78: 'd0d0e0', 79: 'ffd123', 80: 'b8b8d0', 81: 'a6544d', 82: '575961', 83: '9e4fb5', 84: 'ab5c00', 85: '754f45', 86: '428296', 87: '420066', 88: '007d00', 89: '70abfa', 90: '00baff', 91: '00a1ff', 92: '008fff' };
  // Pauling electronegativity (0 = unknown)
  const EN = { 1: 2.2, 3: 0.98, 4: 1.57, 5: 2.04, 6: 2.55, 7: 3.04, 8: 3.44, 9: 3.98, 11: 0.93, 12: 1.31, 13: 1.61, 14: 1.9, 15: 2.19, 16: 2.58, 17: 3.16, 19: 0.82, 20: 1.0, 26: 1.83, 29: 1.9, 30: 1.65, 33: 2.18, 34: 2.55, 35: 2.96, 53: 2.66, 47: 1.93, 78: 2.28, 79: 2.54, 80: 2.0, 82: 2.33 };
  const hex = (h) => [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255];
  const EL = [null];
  const sym2z = {};
  for (let i = 0; i < SYM.length; i++) {
    const z = i + 1;
    let col = COL[z];
    if (!col) col = z >= 58 && z <= 71 ? 'ffffc7' : z >= 93 ? 'ff1493' : 'ff1493';
    const e = { z, sym: SYM[i], name: NAME[i], mass: MASS[i], cov: COV[i] || 1.6, vdw: VDW[z] || (z >= 89 ? 2.4 : z >= 57 && z <= 71 ? 2.3 : 2.05), col: hex(col), hex: '#' + col, en: EN[z] || 0 };
    EL.push(e);
    sym2z[SYM[i]] = z;
    sym2z[SYM[i].toUpperCase()] = sym2z[SYM[i].toUpperCase()] || z;
  }
  // soft, modern carbon grey for the default colour scheme (classic CPK keeps #909090)
  const MODERN = { 6: '5d6678', 1: 'f4f6fa', 7: '3b6cf4', 8: 'f0384a', 16: 'f3c623', 15: 'ff8a1f', 9: '74d95a', 17: '34c759', 35: 'b4402f', 53: '8a2be2' };
  EL.forEach((e) => { if (e) e.modern = hex(MODERN[e.z] || e.hex.slice(1)); });
  // periodic table layout [row, col] (1-based) for the picker
  const POS = {};
  const rows = [[1, 1, 1], [1, 18, 2], [2, 1, 3], [2, 2, 4], [2, 13, 5], [3, 1, 11], [3, 2, 12], [3, 13, 13], [4, 1, 19], [4, 2, 20], [5, 1, 37], [5, 2, 38], [6, 1, 55], [6, 2, 56], [7, 1, 87], [7, 2, 88]];
  rows.forEach(([r, c, z]) => { POS[z] = [r, c]; });
  for (let z = 5; z <= 10; z++) POS[z] = [2, 8 + z];
  for (let z = 13; z <= 18; z++) POS[z] = [3, z];
  for (let z = 21; z <= 36; z++) POS[z] = [4, z - 18];
  for (let z = 39; z <= 54; z++) POS[z] = [5, z - 36];
  POS[57] = [6, 3]; for (let z = 72; z <= 86; z++) POS[z] = [6, z - 68];
  POS[89] = [7, 3]; for (let z = 104; z <= 118; z++) POS[z] = [7, z - 100];
  for (let z = 58; z <= 71; z++) POS[z] = [9, z - 55];
  for (let z = 90; z <= 103; z++) POS[z] = [10, z - 87];
  MS.EL = EL; MS.sym2z = sym2z; MS.PT_POS = POS;
  MS.zOf = (s) => { if (!s) return 0; s = String(s).trim(); const k = s[0].toUpperCase() + s.slice(1).toLowerCase(); return sym2z[k] || 0; };
})();
