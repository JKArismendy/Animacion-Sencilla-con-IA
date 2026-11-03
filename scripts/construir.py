"""Hace todo de una vez a partir de guion.json: voces -> unir audios -> tiempos.

    python scripts/construir.py            # solo regenera lo que cambió
    python scripts/construir.py --force    # regenera todas las voces
"""
import os
import subprocess
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))

for paso in ("generar_voces.py", "unir_audios.py", "medir_tiempos.py"):
    args = [sys.executable, os.path.join(AQUI, paso)]
    if paso == "generar_voces.py" and "--force" in sys.argv:
        args.append("--force")
    print(f"\n=== {paso} ===")
    if subprocess.run(args).returncode != 0:
        sys.exit(f"Se detuvo en {paso}")
print("\nTodo listo. Abre la página y graba.")
