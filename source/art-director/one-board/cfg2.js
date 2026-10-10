var INK = '#141311', CRM = '#f0e7d2', RED = '#a8281c';
var CFG_PC = {
  W: 1440, H: 900, B: [452, 127, 536, 618], RANKS: [127, 194, 261, 327, 394, 478, 545, 612, 679, 745],
  K: [720, 745], J: [720, 127], D: 60, PFS: 28, PBW: 3, LW: 2, SPEED: 0.33, RFS: 28, RIVER: [['楚', 535], ['河', 620], ['漢', 820], ['界', 905]],
  TRMAP: { ai: 'ai', local: 'local', wait: 'wait' },
  TR: {
    ai: { mode: 'strip', src: [79, 80, 1282, 237], p: [{ r: [646, 677, 147, 147], round: 1, bg: INK, fg: CRM, bd: CRM, tx: '开战', fs: 40, ls: 4, to: 'K' }, { r: [637, 115, 166, 166], round: 1, bg: INK, fg: CRM, bd: CRM, tx: '校尉', fs: 44, ls: 2, pb: 14, to: 'J' }] },
    local: { mode: 'strip', src: [80, 636, 1280, 236], p: [{ r: [621, 654, 196, 196], round: 1, bg: INK, fg: CRM, bd: CRM, tx: '开始', fs: 48, ls: 4, to: 'K' }, { r: [690, -90, 60, 60], round: 1, bg: CRM, fg: INK, bd: INK, tx: '將', fs: 28, to: 'J' }] },
    wait: { mode: 'strip', src: [79, 80, 1282, 237], p: [{ r: [464, 103, 190, 190], round: 1, bg: CRM, fg: INK, bd: CRM, tx: '你', fs: 44, to: 'K' }, { r: [784, 103, 190, 190], round: 1, bg: INK, fg: CRM, bd: CRM, tx: '樵夫', fs: 40, to: 'J' }] }
  },
  PIECE: { K: { bg: CRM, fg: RED, bd: RED, tx: '帥' }, J: { bg: CRM, fg: INK, bd: INK, tx: '將' } },
  HOTS: {
    main: [{ r: [307, 574, 196, 196], round: 1, to: 'ai', hint: 1, label: '人机' }, { r: [621, 574, 196, 196], round: 1, to: 'hall', hint: 1, label: '联机' }, { r: [935, 574, 196, 196], round: 1, to: 'local', hint: 1, label: '本地' }],
    ai: [{ r: [646, 677, 147, 147], round: 1, go: 1, hint: 1, label: '开战' }, { r: [1310, 14, 60, 52], to: 'main', label: '返回' }],
    local: [{ r: [621, 654, 196, 196], round: 1, go: 1, hint: 1, label: '开始' }, { r: [1310, 14, 60, 52], to: 'main', label: '返回' }],
    hall: [{ r: [1112, 137, 196, 196], round: 1, to: 'wait', hint: 1, label: '创建房间' }, { r: [1310, 14, 60, 52], to: 'main', label: '返回' }],
    wait: [{ r: [662, 482, 117, 58], go: 1, hint: 1, label: '开始' }, { r: [1276, 14, 92, 52], to: 'hall', label: '离开房间' }]
  }
};
var CFG_M = {
  W: 390, H: 844, B: [52.5, 250, 285, 328.5], RANKS: [250, 285.6, 321, 356.5, 392, 436, 471.5, 507, 543, 578.5],
  K: [195, 578.5], J: [195, 250], D: 32, PFS: 16, PBW: 2, LW: 1.5, SPEED: 0.18, RFS: 15, RIVER: [['楚', 97], ['河', 140], ['漢', 250], ['界', 295]],
  TRMAP: { ai: 'ai', local: 'local', wait: 'wait' },
  TR: {
    ai: { mode: 'frame', src: [24, 60, 342, 632], p: [{ r: [24, 768, 342, 60], bg: INK, fg: CRM, bd: CRM, tx: '开战', fs: 28, ls: 8, to: 'K' }, { r: [175, 62, 95, 110], bg: INK, fg: CRM, bd: INK, tx: '校尉', fs: 24, ls: 2, pb: 22, to: 'J' }] },
    local: { mode: 'frame', src: [24, 60, 342, 632], p: [{ r: [24, 768, 342, 60], bg: INK, fg: CRM, bd: CRM, tx: '开始', fs: 28, ls: 8, to: 'K' }, { r: [179, -50, 32, 32], round: 1, bg: CRM, fg: INK, bd: INK, tx: '將', fs: 16, to: 'J' }] },
    wait: { mode: 'frame', src: [24, 60, 342, 760], p: [{ r: [94, 88, 256, 100], bg: RED, fg: CRM, bd: INK, tx: '你', fs: 22, to: 'K' }, { r: [94, 200, 256, 100], bg: RED, fg: CRM, bd: CRM, tx: '樵夫', fs: 22, ls: 4, to: 'J' }] }
  },
  PIECE: { K: { bg: CRM, fg: RED, bd: RED, tx: '帥' }, J: { bg: CRM, fg: INK, bd: INK, tx: '將' } },
  HOTS: {
    main: [{ r: [121, 60, 245, 255], to: 'hall', hint: 1, label: '联机' }, { r: [121, 313, 245, 255], to: 'ai', hint: 1, label: '人机' }, { r: [121, 567, 245, 253], to: 'local', hint: 1, label: '本地' }],
    ai: [{ r: [24, 768, 342, 60], go: 1, hint: 1, label: '开战' }, { r: [322, 4, 54, 52], to: 'main', label: '返回' }],
    local: [{ r: [24, 768, 342, 60], go: 1, hint: 1, label: '开始' }, { r: [322, 4, 54, 52], to: 'main', label: '返回' }],
    hall: [{ r: [24, 732, 165, 96], to: 'wait', hint: 1, label: '创建房间' }, { r: [322, 4, 54, 52], to: 'main', label: '返回' }],
    wait: [{ r: [176, 452, 91, 48], go: 1, hint: 1, label: '开始' }, { r: [292, 4, 82, 52], to: 'hall', label: '离开房间' }]
  }
};
