/* UBGrade — original line icon set */
(function (UB) {
  const P = {
    cam: '<rect x="3" y="7" width="18" height="12" rx="3"/><circle cx="12" cy="13" r="3.5"/><path d="M8 7l1.5-2.5h5L16 7"/>',
    temp: '<path d="M10 14V5a2 2 0 1 1 4 0v9a4 4 0 1 1-4 0z"/><path d="M12 9v7"/>',
    match: '<rect x="3" y="3" width="12" height="12" rx="2.5"/><rect x="9" y="9" width="12" height="12" rx="2.5"/>',
    mist: '<circle cx="12" cy="12" r="8" opacity=".35"/><circle cx="12" cy="12" r="4.5"/><path d="M4 18c3-1 5 1 8 0s5-1 8 0" />',
    halo: '<circle cx="12" cy="12" r="3.5"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/>',
    vig: '<rect x="3" y="5" width="18" height="14" rx="3"/><ellipse cx="12" cy="12" rx="5.5" ry="4"/>',
    ca: '<circle cx="10" cy="12" r="5"/><circle cx="14" cy="12" r="5" opacity=".5"/>',
    lens: '<circle cx="12" cy="12" r="9"/><path d="M7 4.5c2 4 2 11 0 15M17 4.5c-2 4-2 11 0 15"/>',
    grad: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M5 7h14M5 9.5h14" /><path d="M5 12h14" opacity=".55"/><path d="M5 14.5h14" opacity=".25"/>',
    tone: '<path d="M4 7h10M18 7h2M4 12h4M12 12h8M4 17h12M20 17h0"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="17" r="2"/>',
    wheel: '<circle cx="12" cy="12" r="8.5"/><circle cx="14.5" cy="9.5" r="2" fill="currentColor"/><path d="M12 12h.01"/>',
    curve: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M5 19C10 19 9 5 19 5"/>',
    huecurve: '<path d="M3 14c3-6 6 4 9-2s6 4 9-2"/><path d="M3 19h18" opacity=".5"/>',
    hsl: '<circle cx="12" cy="12" r="8.5" stroke-dasharray="3.3 2"/><path d="M12 12V3.5"/><circle cx="12" cy="12" r="2.2" fill="currentColor"/>',
    split: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17" fill="currentColor" opacity=".35"/><path d="M5 17 19 7"/>',
    bw: '<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><path d="M3.5 7.5a2.5 2.5 0 0 1 2.5-2.5h6v14H6a2.5 2.5 0 0 1-2.5-2.5z" fill="currentColor"/><circle cx="12" cy="12" r="3.2"/>',
    film: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 3v18M16 3v18M4 8h4M4 12h4M4 16h4M16 8h4M16 12h4M16 16h4"/>',
    lut: '<path d="M12 3 20 7.5v9L12 21l-8-4.5v-9z"/><path d="M12 12 20 7.5M12 12v9M12 12 4 7.5"/>',
    fade: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 15l6-6 4 4 3-3 5 5" opacity=".7"/>',
    bleach: '<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/><path d="M9 14a3 3 0 0 0 3 3"/>',
    grain: '<circle cx="6" cy="6" r="1.2" fill="currentColor"/><circle cx="12" cy="8" r="1.2" fill="currentColor"/><circle cx="18" cy="5" r="1.2" fill="currentColor"/><circle cx="8" cy="13" r="1.2" fill="currentColor"/><circle cx="15" cy="14" r="1.2" fill="currentColor"/><circle cx="5" cy="19" r="1.2" fill="currentColor"/><circle cx="12" cy="19" r="1.2" fill="currentColor"/><circle cx="19" cy="18" r="1.2" fill="currentColor"/>',
    sharp: '<path d="M12 3 21 20H3z"/><path d="M12 9v6"/>',
    clarity: '<path d="M12 3 21 12 12 21 3 12z"/><path d="M12 8v8M8 12h8" opacity=".6"/>',
    box: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 5h18v3.5H3zM3 15.5h18V19H3z" fill="currentColor"/>',
    input: '<path d="M4 20C9 20 8 6 20 4"/><rect x="3" y="3" width="18" height="18" rx="2" opacity=".4"/>',
    output: '<path d="M4 20C6 10 12 6 20 5"/><rect x="3" y="3" width="18" height="18" rx="2" opacity=".4"/>',
    power: '<path d="M12 3v8"/><path d="M6.3 7.5a8 8 0 1 0 11.4 0"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
  };
  UB.icon = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${P[k] || P.tone}</svg>`;
})(window.UB = window.UB || {});
