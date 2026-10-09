# 角色配方（MakeHuman 形变的权重）和表情形变
import mhbuild as M, json, sys
OUT = '../cine/assets/'
EXPR = {
  'browDown': {'eyebrows/eyebrows-trans-down': 1},
  'browAngleDown': {'eyebrows/eyebrows-angle-down': 1},
  'browAngleUp': {'eyebrows/eyebrows-angle-up': 1},
  'frown': {'mouth/mouth-angles-down': 1},
  'smile': {'mouth/mouth-angles-up': 1},
  'squint': {'eyes/l-eye-height2-decr': 1, 'eyes/r-eye-height2-decr': 1, 'eyes/l-eye-height1-decr': 0.6, 'eyes/r-eye-height1-decr': 0.6},
  'wide': {'eyes/l-eye-height2-incr': 1, 'eyes/r-eye-height2-incr': 1},
  'lipsThin': {'mouth/mouth-lowerlip-height-decr': 1, 'mouth/mouth-upperlip-height-decr': 1},
  'flare': {'nose/nose-flaring-incr': 1, 'nose/nose-nostrils-width-incr': 0.5},
}
R = {
 'liu': {'macrodetails/asian-male-young': 0.52, 'macrodetails/asian-male-old': 0.48,
          'macrodetails/universal-male-young-averagemuscle-averageweight': 0.52, 'macrodetails/universal-male-old-averagemuscle-averageweight': 0.48,
          'macrodetails/height/male-young-averagemuscle-averageweight-maxheight': 0.2,
          'nose/nose-hump-incr': 0.45, 'nose/nose-scale-vert-incr': 0.3, 'nose/nose-scale-depth-incr': 0.45, 'nose/nose-greek-incr': 0.2, 'nose/nose-width1-decr': 0.15,
          'forehead/forehead-trans-forward': 0.15, 'forehead/forehead-scale-vert-incr': 0.35,
          'head/head-oval': 0.9, 'head/head-fat-decr': 0.45, 'head/head-age-incr': 0.6, 'head/head-scale-vert-incr': 0.25, 'head/head-scale-horiz-decr': 0.15, 'chin/chin-prominent-incr': 0.3, 'chin/chin-height-incr': 0.15,
          'eyes/l-eye-height2-decr': 0.2, 'eyes/r-eye-height2-decr': 0.2, 'eyes/l-eye-epicanthus-in': 0.2, 'eyes/r-eye-epicanthus-in': 0.2,
          'eyes/l-eye-bag-incr': 0.4, 'eyes/r-eye-bag-incr': 0.4,
          'cheek/l-cheek-bones-incr': 0.3, 'cheek/r-cheek-bones-incr': 0.3, 'cheek/l-cheek-volume-decr': 0.2, 'cheek/r-cheek-volume-decr': 0.2,
          'mouth/mouth-scale-horiz-incr': 0.1, 'mouth/mouth-lowerlip-volume-decr': 0.2, 'eyebrows/eyebrows-trans-down': 0.15, 'eyebrows/eyebrows-angle-up': 0.2,
          'neck/neck-scale-horiz-decr': 0.35, 'neck/neck-scale-depth-decr': 0.2, 'cheek/l-cheek-inner-decr': 0.35, 'cheek/r-cheek-inner-decr': 0.35, 'mouth/mouth-angles-down': 0.15, 'chin/chin-width-decr': 0.2, 'eyebrows/eyebrows-trans-forward': 0.25},
 'xiang': {'macrodetails/asian-male-young': 1, 'macrodetails/universal-male-young-maxmuscle-averageweight': 1, 'macrodetails/height/male-young-maxmuscle-averageweight-maxheight': 0.3,
           'chin/chin-prominent-incr': 0.5, 'chin/chin-width-incr': 0.8, 'chin/chin-bones-incr': 0.9, 'head/head-square': 0.9, 'eyebrows/eyebrows-trans-down': 0.25,
           'cheek/l-cheek-bones-incr': 0.6, 'cheek/r-cheek-bones-incr': 0.6, 'neck/neck-scale-horiz-incr': 0.6, 'neck/neck-scale-depth-incr': 0.4, 'torso/torso-vshape-incr': 0.6,
           'nose/nose-scale-horiz-incr': 0.2, 'nose/nose-hump-incr': 0.3, 'mouth/mouth-scale-horiz-incr': 0.15, 'forehead/forehead-trans-forward': 0.2,
           'eyes/l-eye-height2-decr': 0.25, 'eyes/r-eye-height2-decr': 0.25, 'eyes/l-eye-epicanthus-in': 0.3, 'eyes/r-eye-epicanthus-in': 0.3,
           'head/head-fat-decr': 0.25, 'cheek/l-cheek-volume-decr': 0.3, 'cheek/r-cheek-volume-decr': 0.3, 'cheek/l-cheek-inner-decr': 0.4, 'cheek/r-cheek-inner-decr': 0.4, 'chin/chin-height-decr': 0.1, 'nose/nose-scale-vert-incr': 0.2, 'nose/nose-width1-decr': 0.2, 'mouth/mouth-lowerlip-volume-decr': 0.3, 'mouth/mouth-upperlip-volume-decr': 0.2, 'eyebrows/eyebrows-trans-forward': 0.4, 'forehead/forehead-temple-decr': 0.3, 'head/head-scale-horiz-incr': 0.25, 'eyes/l-eye-push1-in': 0.3, 'eyes/r-eye-push1-in': 0.3, 'nose/nose-greek-incr': 0.3},
}
if __name__ == '__main__':
    for k in (sys.argv[1:] or R):
        o, v = M.build(k, R[k], morphs=EXPR); json.dump(o, open(OUT + k + '_body.json', 'w')); print(k, o['n'])
