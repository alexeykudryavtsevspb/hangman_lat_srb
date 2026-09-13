import json
import os
import re
import sys
from gtts import gTTS
import unicodedata

def slugify_base(text):
    """
    Base ASCII slug generator used as a starting point for new entries.
    """
    text = text.replace('đ', 'dj').replace('Đ', 'Dj')
    text = unicodedata.normalize('NFKD', text)
    text = "".join(c for c in text if not unicodedata.combining(c))
    text = text.upper()
    safe = re.sub(r'[^A-Z0-9]+', '_', text)
    safe = re.sub(r'_+', '_', safe).strip('_')
    return safe if safe else "UNKNOWN"

def extract_phrases_from_js(js_path):
    if not os.path.exists(js_path):
        print(f"[!] JS file not found: {js_path}")
        return []

    with open(js_path, 'r', encoding='utf-8') as f:
        content = f.read()

    phrases = []
    pattern = re.compile(r'\[\s*(["\'])(.*?)\1', re.DOTALL)
    matches = pattern.findall(content)
    
    for quote, text in matches:
        cleaned = text.replace(r'\"', '"').replace(r"\'", "'").strip()
        if cleaned:
            phrases.append(cleaned)

    return list(dict.fromkeys(phrases))

def load_mapping_js(mapping_path):
    if not os.path.exists(mapping_path):
        return {}
    with open(mapping_path, 'r', encoding='utf-8') as f:
        content = f.read()
    match = re.search(r'=\s*(\{.*\})\s*;?\s*$', content, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except Exception as e:
            print(f"[!] Warning: Could not parse JSON inside {mapping_path}: {e}")
    return {}

def save_mapping_js(mapping_path, mapping, lang):
    var_name = f"window.AUDIO_MAPPING_{lang.upper()}"
    json_data = json.dumps(mapping, ensure_ascii=False, indent=2)
    with open(mapping_path, 'w', encoding='utf-8') as f:
        f.write(f"{var_name} = {json_data};\n")

def sync_audio_mapping(js_path, lang='sr'):
    audio_dir = os.path.join('audio', lang)
    os.makedirs(audio_dir, exist_ok=True)
    mapping_js_path = os.path.join(audio_dir, '_mapping.js')

    # 1. Load existing mapping directly from _mapping.js
    mapping = load_mapping_js(mapping_js_path)
    used_filenames = {filename: phrase for phrase, filename in mapping.items()}

    # 2. Extract phrases from source JS file
    phrases = extract_phrases_from_js(js_path)
    print(f"[*] Found {len(phrases)} unique phrases in {js_path}")

    new_added = 0
    for phrase in phrases:
        if phrase in mapping:
            continue

        base_name = slugify_base(phrase)
        candidate = base_name
        counter = 2

        while candidate in used_filenames and used_filenames[candidate] != phrase:
            candidate = f"{base_name}_{counter}"
            counter += 1

        if candidate != base_name:
            print(f"[?] Collision resolved: '{phrase}' -> assigned '{candidate}.mp3' (was used by '{used_filenames[base_name]}')")

        mapping[phrase] = candidate
        used_filenames[candidate] = phrase
        new_added += 1

    print(f"[*] Added {new_added} new phrase(s) to mapping table.")

    # 3. Save updated _mapping.js
    save_mapping_js(mapping_js_path, mapping, lang)

    # 4. Check and generate missing .mp3 files
    generated_count = 0
    for phrase, filename in mapping.items():
        mp3_path = os.path.join(audio_dir, f"{filename}.mp3")
        if not os.path.exists(mp3_path):
            try:
                print(f"[+] Generating missing audio [{lang}]: '{phrase}' -> {filename}.mp3")
                tts = gTTS(text=phrase, lang=lang)
                tts.save(mp3_path)
                generated_count += 1
            except Exception as e:
                print(f"[!] Error generating audio for '{phrase}': {e}")

    print(f"[*] Generated {generated_count} missing audio file(s).")

    # 5. Remove orphaned files on disk (mp3 files not in mapping)
    mapped_filenames = {f"{fn}.mp3" for fn in mapping.values()}
    disk_files = {f for f in os.listdir(audio_dir) if f.endswith('.mp3')}
    orphaned = disk_files - mapped_filenames
    
    deleted_count = 0
    for orphan in sorted(orphaned):
        orphan_path = os.path.join(audio_dir, orphan)
        try:
            os.remove(orphan_path)
            print(f"[-] Removed orphaned file: {orphan_path}")
            deleted_count += 1
        except Exception as e:
            print(f"[!] Error removing {orphan_path}: {e}")

    if deleted_count > 0:
        print(f"[*] Cleaned up {deleted_count} orphaned audio file(s).")

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage:")
        print("  python generate_audio.py <path_to_js_file> <language: sr|la|ru|en>")
        print("Example:")
        print("  python generate_audio.py js/words.js sr")
        sys.exit(1)

    js_file = sys.argv[1]
    language = sys.argv[2]
    sync_audio_mapping(js_file, language)