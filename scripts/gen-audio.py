#!/usr/bin/env python3
"""
Generate audio files for all catalog messages in all languages and modes.
Uses edge-tts for Hindi (hi-IN-SwaraNeural) and Marathi (mr-IN-AarohiNeural).
Falls back to Web Speech API labels if edge-tts not available.
"""

import asyncio
import json
import os
import sys
from pathlib import Path

try:
    import edge_tts
    EDGE_TTS_AVAILABLE = True
except ImportError:
    EDGE_TTS_AVAILABLE = False
    print("edge-tts not installed. Audio generation will be skipped.")

VOICES = {
    'en': 'en-IN-NeerjaNeural',
    'hi': 'hi-IN-SwaraNeural',
    'mr': 'mr-IN-AarohiNeural',
}

MODES = ['normal', 'simple']

# Load catalogs
with open('src/lib/i18n/messages/en.json', 'r', encoding='utf-8') as f:
    EN_CATALOG = json.load(f)

with open('src/lib/i18n/messages/hi.json', 'r', encoding='utf-8') as f:
    HI_CATALOG = json.load(f)

with open('src/lib/i18n/messages/mr.json', 'r', encoding='utf-8') as f:
    MR_CATALOG = json.load(f)

CATALOGS = {
    'en': EN_CATALOG,
    'hi': HI_CATALOG,
    'mr': MR_CATALOG,
}

def get_message(catalog: dict, key: str) -> str:
    """Get message from catalog by dot-notation key."""
    # Catalog is flat with dot-notation keys
    return catalog.get(key)

def get_normal_key(state: str) -> str:
    """Get normal message key for a state."""
    state_map = {
        'paymentReserved': 'status.paymentReserved',
        'checkingReport': 'status.checkingReport',
        'couldNotConfirm': 'status.couldNotConfirm',
        'firstPaymentPaid': 'status.firstPaymentPaid',
        'finalPaymentPaid': 'status.finalPaymentPaid',
        'problemReported': 'status.problemReported',
        'moneyReturned': 'status.moneyReturned',
        'reservationCancelled': 'status.reservationCancelled',
        'shipped': 'status.shipped',
        'delivered': 'status.delivered',
        'reservationExpiring': 'status.reservationExpiring',
        'buyerCheckingReport': 'status.buyerCheckingReport',
        'labReportPassed': 'status.labReportPassed',
        'awaitingApproval': 'status.awaitingApproval',
        'renewReservation': 'status.renewReservation',
        'confirmingWithPayPal': 'status.confirmingWithPayPal',
        'suspiciousTextFound': 'status.suspiciousTextFound',
    }
    return state_map.get(state, f'status.{state.lower()}')

def get_simple_keys(state: str) -> dict:
    """Get simple message keys for a state."""
    prefix = f'simple.{state}'
    return {
        'whatHappened': f'{prefix}.whatHappened',
        'whatItMeans': f'{prefix}.whatItMeans',
        'whatToDo': f'{prefix}.whatToDo',
    }

STATES = [
    'paymentReserved',
    'checkingReport',
    'couldNotConfirm',
    'firstPaymentPaid',
    'finalPaymentPaid',
    'problemReported',
    'moneyReturned',
    'reservationCancelled',
    'shipped',
    'delivered',
    'reservationExpiring',
    'buyerCheckingReport',
    'labReportPassed',
    'awaitingApproval',
    'renewReservation',
    'confirmingWithPayPal',
    'suspiciousTextFound',
]

async def generate_audio_file(text: str, voice: str, output_path: Path):
    """Generate audio file using edge-tts."""
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(str(output_path))

async def main():
    base_dir = Path('public/audio')

    if not EDGE_TTS_AVAILABLE:
        print("edge-tts not available. Creating placeholder files...")
        for lang in ['en', 'hi', 'mr']:
            for mode in MODES:
                lang_dir = base_dir / lang / mode
                lang_dir.mkdir(parents=True, exist_ok=True)
                for state in STATES:
                    (lang_dir / f'{state}.mp3').touch()
                    for part in ['whatHappened', 'whatItMeans', 'whatToDo']:
                        (lang_dir / f'{state}_{part}.mp3').touch()
        print("Placeholder audio files created.")
        return

    print("Generating audio with edge-tts...")

    for lang in ['en', 'hi', 'mr']:
        voice = VOICES[lang]
        catalog = CATALOGS[lang]

        for mode in MODES:
            lang_dir = base_dir / lang / mode
            lang_dir.mkdir(parents=True, exist_ok=True)

            for state in STATES:
                try:
                    if mode == 'normal':
                        key = get_normal_key(state)
                        text = get_message(catalog, key)
                        if text:
                            output_path = lang_dir / f'{state}.mp3'
                            await generate_audio_file(text, voice, output_path)
                            print(f"  [OK] {lang}/{mode}/{state}.mp3")
                        else:
                            print(f"  [MISSING] {lang}/{mode}/{state}: key '{key}' not found")
                    else:
                        simple_keys = get_simple_keys(state)
                        for part, key in simple_keys.items():
                            text = get_message(catalog, key)
                            if text:
                                output_path = lang_dir / f'{state}_{part}.mp3'
                                await generate_audio_file(text, voice, output_path)
                                print(f"  [OK] {lang}/{mode}/{state}_{part}.mp3")
                            else:
                                print(f"  [MISSING] {lang}/{mode}/{state}_{part}: key '{key}' not found")
                except Exception as e:
                    print(f"  Error generating {lang}/{mode}/{state}: {e}")

    print("Audio generation complete!")

if __name__ == '__main__':
    asyncio.run(main())