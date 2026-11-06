"""Hace todo de una vez a partir de un guion de guiones/: voces -> unir audios -> tiempos.

    python scripts/construir.py ratio-del-cafe            # solo regenera lo que cambió
    python scripts/construir.py ratio-del-cafe --force    # regenera todas las voces
(si solo hay un guion, el nombre es opcional)
"""
import os
import subprocess
import sys

from guion import elegir_guion

AQUI = os.path.dirname(os.path.abspath(__file__))
NOMBRE = elegir_guion(sys.argv)

for paso in ("generar_voces.py", "recortar_silencios.py", "unir_audios.py", "medir_tiempos.py"):
    args = [sys.executable, os.path.join(AQUI, paso), NOMBRE]
    if paso == "generar_voces.py" and "--force" in sys.argv:
        args.append("--force")
    print(f"\n=== {paso} ===")
    if subprocess.run(args).returncode != 0:
        sys.exit(f"Se detuvo en {paso}")
print("\nTodo listo. Abre la página y graba.")
