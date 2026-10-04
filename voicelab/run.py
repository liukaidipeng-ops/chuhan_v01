"""配音试验：读 voicelab/request.json，调 MiniMax 语音合成，把结果写到 voicelab/out/。只在 GitHub Actions 里跑（密钥在仓库的 Secrets 里，不进代码、不进日志）。"""
import json, os, sys, time, urllib.request, urllib.error
D = os.path.dirname(os.path.abspath(__file__))
KEY = (os.environ.get('MINIMAX_API_KEY') or '').strip()
REQ = json.load(open(os.path.join(D, 'request.json'), encoding='utf8'))
OUT = os.path.join(D, 'out', REQ.get('batch', 'b0')); os.makedirs(OUT, exist_ok=True)
LOG = {'batch': REQ.get('batch'), 'key_present': bool(KEY), 'key_len': len(KEY), 'host': None, 'probe': [], 'jobs': []}
HOSTS = REQ.get('hosts') or ['https://api.minimax.cn', 'https://api.minimaxi.com', 'https://api.minimax.io']

def post(host, path, body, timeout=90):
    req = urllib.request.Request(host + path, data=json.dumps(body).encode('utf8'), headers={'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r: return r.status, json.loads(r.read().decode('utf8'))
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read().decode('utf8'))
        except Exception: return e.code, {'error': 'http ' + str(e.code)}
    except Exception as e:
        return 0, {'error': type(e).__name__ + ': ' + str(e)[:200]}

def synth(host, j):
    vs = {'voice_id': j['voice_id'], 'speed': j.get('speed', 1), 'vol': j.get('vol', 1), 'pitch': j.get('pitch', 0)}
    if j.get('emotion'): vs['emotion'] = j['emotion']
    body = {'model': j.get('model', 'speech-2.8-hd'), 'text': j['text'], 'stream': False, 'language_boost': 'Chinese',
            'voice_setting': vs, 'audio_setting': {'sample_rate': 32000, 'bitrate': 128000, 'format': 'mp3', 'channel': 1}}
    if j.get('modify'): body['voice_modify'] = j['modify']   # 音色效果调节：pitch 低沉↔明亮、intensity 刚劲↔轻柔、timbre 浑厚↔清脆（都是 -100..100），sound_effects 回声等
    return post(host, '/v1/t2a_v2', body)

def finish():
    json.dump(LOG, open(os.path.join(OUT, 'log.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    print(json.dumps({k: v for k, v in LOG.items() if k != 'jobs'}, ensure_ascii=False))
    for j in LOG['jobs']: print(j)

if not KEY:
    LOG['error'] = '仓库 Secrets 里没有 MINIMAX_API_KEY（名字要一字不差）'; finish(); sys.exit(0)

# 1) 找到这把密钥对应的站点：拿一句最短的话试合成
for h in HOSTS:
    st, r = synth(h, {'voice_id': 'male-qn-qingse', 'text': '好。', 'model': 'speech-2.8-turbo'})
    br = (r or {}).get('base_resp') or {}
    ok = st == 200 and br.get('status_code') == 0 and (r.get('data') or {}).get('audio')
    LOG['probe'].append({'host': h, 'http': st, 'code': br.get('status_code'), 'msg': br.get('status_msg') or r.get('error')})
    if ok: LOG['host'] = h; break
if not LOG['host']: finish(); sys.exit(0)
H = LOG['host']

# 2) 音色清单
voices = []
if REQ.get('list_voices'):
    st, r = post(H, '/v1/get_voice', {'voice_type': 'all'})
    LOG['get_voice'] = {'http': st, 'base': (r or {}).get('base_resp'), 'keys': {k: (len(v) if isinstance(v, list) else None) for k, v in (r or {}).items()}}
    json.dump(r, open(os.path.join(D, 'voices.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
vp = os.path.join(D, 'voices.json')
if os.path.exists(vp):
    try:
        r = json.load(open(vp, encoding='utf8'))
        for k, v in r.items():
            if isinstance(v, list):
                for x in v:
                    if isinstance(x, dict) and x.get('voice_id'): voices.append(x)
    except Exception as e: LOG['voices_err'] = str(e)

def resolve(v):
    """'~说书' → 名字 / 编号 / 描述里含这几个字的第一个音色"""
    if not v.startswith('~'): return v, None
    key = v[1:]
    for x in voices:
        blob = json.dumps(x, ensure_ascii=False)
        if key in blob: return x['voice_id'], x.get('voice_name')
    return None, None

# 3) 逐条合成
for j in REQ.get('jobs', []):
    rec = {'id': j['id'], 'voice': j['voice']}
    vid, vname = resolve(j['voice'])
    if not vid: rec['error'] = '找不到这个音色'; LOG['jobs'].append(rec); continue
    rec['voice_id'] = vid; rec['voice_name'] = vname
    jj = dict(j, voice_id=vid)
    for attempt in range(3):
        st, r = synth(H, jj)
        br = (r or {}).get('base_resp') or {}
        audio = (r.get('data') or {}).get('audio') if isinstance(r, dict) else None
        if st == 200 and br.get('status_code') == 0 and audio:
            open(os.path.join(OUT, j['id'] + '.mp3'), 'wb').write(bytes.fromhex(audio))
            ei = r.get('extra_info') or {}
            rec.update(ok=True, ms=ei.get('audio_length'), chars=ei.get('usage_characters')); break
        rec.update(ok=False, http=st, code=br.get('status_code'), msg=br.get('status_msg') or (r or {}).get('error'))
        if br.get('status_code') in (1002, 1039) or st in (0, 429, 500, 502, 503): time.sleep(4 + attempt * 6); continue
        break
    LOG['jobs'].append(rec)
    time.sleep(0.4)
# 4) 音乐（纯器乐）：request.json 里的 music: [{ id, prompt, model? }]
for m in REQ.get('music', []):
    rec = {'id': m['id'], 'music': True}
    for model in ([m['model']] if m.get('model') else ['music-3.0', 'music-2.6', 'music-2.0', 'music-1.5']):
        body = {'model': model, 'prompt': m['prompt'], 'is_instrumental': True, 'output_format': 'hex', 'stream': False,
                'audio_setting': {'sample_rate': 44100, 'bitrate': 128000, 'format': 'mp3'}}
        if m.get('lyrics'): body['lyrics'] = m['lyrics']; body['is_instrumental'] = False
        st, r = post(H, '/v1/music_generation', body, timeout=900)
        br = (r or {}).get('base_resp') or {}
        audio = (r.get('data') or {}).get('audio') if isinstance(r, dict) else None
        rec.setdefault('tried', []).append({'model': model, 'http': st, 'code': br.get('status_code'), 'msg': br.get('status_msg') or (r or {}).get('error')})
        if st == 200 and br.get('status_code') == 0 and audio:
            open(os.path.join(OUT, m['id'] + '.mp3'), 'wb').write(bytes.fromhex(audio))
            rec.update(ok=True, model=model, info=r.get('extra_info')); break
        if br.get('status_code') == 1008: break   # 余额不足：别再试别的型号
    LOG['jobs'].append(rec)
finish()
